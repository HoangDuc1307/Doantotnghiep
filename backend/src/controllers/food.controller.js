import { pool } from '../db/pool.js';

const baseUrl = 'https://api.dulieuphapluat.vn/v1';
const source = 'Bảng thành phần thực phẩm Việt Nam (Viện Dinh dưỡng Quốc gia qua DLPL API)';
class DlplError extends Error {}

export function isReferenceSourceId(value) {
  return /^(?:SMILING2013|VN2007|USDA_SR2018):[A-Za-z0-9_-]+$/.test(value);
}

export function readEnergyKcal(value) {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (typeof value === 'string' && !value.trim()) return null;
  const energy = Number(value);
  return Number.isFinite(energy) && energy >= 0 ? energy : null;
}

export function toNutritionFood(food) {
  const id = typeof food?.id === 'string' ? food.id.trim() : '';
  const description = typeof food?.name === 'string' ? food.name.trim() : '';
  const energy = readEnergyKcal(food?.energy_kcal_per_100g);
  return id && description && energy !== null
    ? { id, description, energy_kcal_per_100g: energy }
    : null;
}

export function normalizeFoodName(value) {
  return typeof value === 'string'
    ? value.trim().normalize('NFC').toLocaleLowerCase('vi').replace(/\s+/g, ' ')
    : '';
}

export function findSingleExactFood(foods, name) {
  const normalizedName = normalizeFoodName(name);
  if (!normalizedName || !Array.isArray(foods)) return null;
  const matches = foods.filter((food) => normalizeFoodName(food.description) === normalizedName);
  return matches.length === 1 ? matches[0] : null;
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

async function saveDlplFood(food) {
  const result = await pool.query(
    `INSERT INTO foods (fdc_id, description, base_quantity, base_unit, energy_kcal_per_100g,
                        source, source_id, source_code, source_version, source_url, source_locator, quality_flags, retrieved_at)
     VALUES (NULL, $1, 100, 'g', $2, $3, $4, $4, 'DLPL API', $5, $6, 'auto_exact_name;energy_per_100g', NOW())
     ON CONFLICT (source, source_code) WHERE source_code IS NOT NULL
     DO UPDATE SET description = EXCLUDED.description, base_quantity = EXCLUDED.base_quantity, base_unit = EXCLUDED.base_unit,
       energy_kcal_per_100g = EXCLUDED.energy_kcal_per_100g, source_version = EXCLUDED.source_version,
       source_url = EXCLUDED.source_url, source_locator = EXCLUDED.source_locator, quality_flags = EXCLUDED.quality_flags,
       retrieved_at = EXCLUDED.retrieved_at
     RETURNING id, description, base_quantity, base_unit, energy_kcal_per_100g, source, source_id, source_version, source_url, source_locator, retrieved_at`,
    [food.description, food.energy_kcal_per_100g, source, food.id, baseUrl, `/nutrition-foods/${food.id}`],
  );
  return result.rows[0];
}

function toStoredNutritionFood(food) {
  return toNutritionFood({
    id: food?.id,
    name: food?.description,
    energy_kcal_per_100g: food?.energy_kcal_per_100g,
  });
}

export async function findExactNutritionFood(name) {
  const normalizedName = normalizeFoodName(name);
  if (!normalizedName) return null;
  const local = await pool.query(
    `SELECT id, description, energy_kcal_per_100g
     FROM foods`,
  );
  const localMatch = findSingleExactFood(local.rows.map(toStoredNutritionFood).filter(Boolean), normalizedName);
  if (localMatch) return localMatch;

  const searched = await getDlpl(`/nutrition-foods?q=${encodeURIComponent(name)}&per_page=10`);
  const searchedMatch = findSingleExactFood(Array.isArray(searched) ? searched.map(toNutritionFood).filter(Boolean) : [], normalizedName);
  if (!searchedMatch) return null;
  const detail = toNutritionFood(await getDlpl(`/nutrition-foods/${encodeURIComponent(searchedMatch.id)}`));
  return detail && normalizeFoodName(detail.description) === normalizedName ? saveDlplFood(detail) : null;
}

export async function search(request, response, next) {
  const query = typeof request.query.q === 'string' ? request.query.q.trim() : '';
  if (query.length < 2 || query.length > 120) return response.status(400).json({ message: 'Nhập ít nhất 2 ký tự để tìm thực phẩm Việt Nam.' });
  try {
    const local = await pool.query(
      `SELECT source_id AS id, description, energy_kcal_per_100g
       FROM foods
       WHERE source_id ~ '^(SMILING2013|VN2007|USDA_SR2018):' AND description ILIKE '%' || $1 || '%'
       ORDER BY description ASC LIMIT 8`,
      [query],
    );
    if (local.rowCount) return response.json(local.rows.map((food) => ({ ...food, energy_kcal_per_100g: Number(food.energy_kcal_per_100g) })));
    const foods = await getDlpl(`/nutrition-foods?q=${encodeURIComponent(query)}&per_page=10`);
    response.json(Array.isArray(foods) ? foods.map(toNutritionFood).filter(Boolean).slice(0, 8) : []);
  } catch (error) {
    if (error instanceof DlplError) return response.status(502).json({ message: error.message });
    next(error);
  }
}

export async function select(request, response, next) {
  const sourceId = typeof request.params.sourceId === 'string' ? request.params.sourceId : '';
  if (!/^[A-Za-z0-9:_-]{8,120}$/.test(sourceId)) return response.status(400).json({ message: 'Mã thực phẩm không hợp lệ.' });
  try {
    if (isReferenceSourceId(sourceId)) {
      const local = await pool.query(
        `SELECT id, description, energy_kcal_per_100g FROM foods WHERE source_id = $1
         AND source_id ~ '^(SMILING2013|VN2007|USDA_SR2018):'`,
        [sourceId],
      );
      if (!local.rowCount) return response.status(404).json({ message: 'Chưa nhập bộ dữ liệu dinh dưỡng tham chiếu.' });
      return response.json(local.rows[0]);
    }
    const food = toNutritionFood(await getDlpl(`/nutrition-foods/${encodeURIComponent(sourceId)}`));
    if (!food) return response.status(502).json({ message: 'Dữ liệu dinh dưỡng Việt Nam trả về không hợp lệ.' });
    response.json(await saveDlplFood(food));
  } catch (error) {
    if (error instanceof DlplError) return response.status(502).json({ message: error.message });
    next(error);
  }
}
