import { pool } from '../db/pool.js';

const baseUrl = 'https://api.dulieuphapluat.vn/v1';
const source = 'Bảng thành phần thực phẩm Việt Nam (Viện Dinh dưỡng Quốc gia qua DLPL API)';
class DlplError extends Error {}

export function toNutritionFood(food) {
  const id = typeof food?.id === 'string' ? food.id.trim() : '';
  const description = typeof food?.name === 'string' ? food.name.trim() : '';
  const energy = Number(food?.energy_kcal_per_100g);
  return id && description && Number.isFinite(energy) && energy >= 0
    ? { id, description, energy_kcal_per_100g: energy }
    : null;
}

async function getDlpl(path) {
  const apiKey = process.env.DLPL_API_KEY;
  if (!apiKey) throw new DlplError('Chưa cấu hình DLPL_API_KEY trên máy chủ.');
  let response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new DlplError('Không kết nối được dữ liệu dinh dưỡng Việt Nam. Vui lòng thử lại.');
  }
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.success) throw new DlplError(payload?.message || 'Dữ liệu dinh dưỡng Việt Nam hiện chưa sẵn sàng. Vui lòng thử lại.');
  return payload.data;
}

export async function search(request, response, next) {
  const query = typeof request.query.q === 'string' ? request.query.q.trim() : '';
  if (query.length < 2 || query.length > 120) return response.status(400).json({ message: 'Nhập ít nhất 2 ký tự để tìm thực phẩm Việt Nam.' });
  try {
    const foods = await getDlpl(`/nutrition-foods?q=${encodeURIComponent(query)}&per_page=10`);
    response.json(Array.isArray(foods) ? foods.map(toNutritionFood).filter(Boolean).slice(0, 8) : []);
  } catch (error) {
    if (error instanceof DlplError) return response.status(502).json({ message: error.message });
    next(error);
  }
}

export async function select(request, response, next) {
  const sourceId = typeof request.params.sourceId === 'string' ? request.params.sourceId : '';
  if (!/^[A-Za-z0-9_-]{8,120}$/.test(sourceId)) return response.status(400).json({ message: 'Mã thực phẩm không hợp lệ.' });
  try {
    const food = toNutritionFood(await getDlpl(`/nutrition-foods/${encodeURIComponent(sourceId)}`));
    if (!food) return response.status(502).json({ message: 'Dữ liệu dinh dưỡng Việt Nam trả về không hợp lệ.' });
    const result = await pool.query(
      `INSERT INTO foods (fdc_id, description, energy_kcal_per_100g, source, source_id, source_version)
       VALUES (NULL, $1, $2, $3, $4, 'DLPL API')
       ON CONFLICT (source, source_id) WHERE source_id IS NOT NULL
       DO UPDATE SET description = EXCLUDED.description, energy_kcal_per_100g = EXCLUDED.energy_kcal_per_100g
       RETURNING id, description, energy_kcal_per_100g`,
      [food.description, food.energy_kcal_per_100g, source, food.id],
    );
    response.json(result.rows[0]);
  } catch (error) {
    if (error instanceof DlplError) return response.status(502).json({ message: error.message });
    next(error);
  }
}
