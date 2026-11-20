import { pool } from '../db/pool.js';
import { findExactNutritionFood } from './food.controller.js';

function readItem(body) {
  body = body && typeof body === 'object' ? body : {};
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const unit = typeof body.unit === 'string' ? body.unit.trim() : '';
  const quantity = body.quantity === '' || body.quantity == null ? Number.NaN : Number(body.quantity);
  const expiryDate = body.expiry_date || null;
  const foodId = body.food_id || null;
  if (!name || name.length > 120) return { error: 'Tên thực phẩm là bắt buộc (tối đa 120 ký tự).' };
  if (!Number.isFinite(quantity) || quantity < 0 || quantity > 99999999) return { error: 'Số lượng phải là số không âm.' };
  if (!unit || unit.length > 30) return { error: 'Đơn vị là bắt buộc (tối đa 30 ký tự).' };
  if (expiryDate) {
    const match = typeof expiryDate === 'string' && /^(\d{4})-(\d{2})-(\d{2})$/.exec(expiryDate);
    if (!match) return { error: 'Hạn sử dụng phải có dạng YYYY-MM-DD.' };
    const [, year, month, day] = match.map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
      return { error: 'Ngày hết hạn không hợp lệ.' };
    }
  }
  if (foodId && (typeof foodId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(foodId))) {
    return { error: 'Mã dữ liệu dinh dưỡng không hợp lệ.' };
  }
  return { values: [name, quantity, unit, expiryDate, foodId] };
}

export async function list(request, response, next) {
  try {
    const result = await pool.query(
      `SELECT i.id, i.name, i.quantity, i.unit, i.expiry_date, i.food_id, f.description AS food_description,
              i.created_at, i.updated_at
       FROM inventory_items i LEFT JOIN foods f ON f.id = i.food_id
       WHERE i.user_id = $1 ORDER BY i.expiry_date ASC NULLS LAST, i.name ASC`, [request.user.id],
    );
    response.json(result.rows);
  } catch (error) { next(error); }
}

export async function create(request, response, next) {
  const parsed = readItem(request.body);
  if (parsed.error) return response.status(400).json({ message: parsed.error });
  try {
    const values = [...parsed.values];
    if (!values[4]) {
      // A lookup failure must not prevent a valid inventory record from being saved.
      values[4] = await findExactNutritionFood(values[0]).then((food) => food?.id || null).catch(() => null);
    }
    const result = await pool.query(
      `INSERT INTO inventory_items (name, quantity, unit, expiry_date, food_id, user_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, quantity, unit, expiry_date, food_id, created_at, updated_at`, [...values, request.user.id],
    );
    response.status(201).json(result.rows[0]);
  } catch (error) { next(error); }
}

export async function update(request, response, next) {
  const parsed = readItem(request.body);
  if (parsed.error) return response.status(400).json({ message: parsed.error });
  try {
    const result = await pool.query(
      `UPDATE inventory_items SET name = $1, quantity = $2, unit = $3, expiry_date = $4, food_id = $5, updated_at = NOW()
       WHERE id = $6 AND user_id = $7 RETURNING id, name, quantity, unit, expiry_date, food_id, created_at, updated_at`,
      [...parsed.values, request.params.id, request.user.id],
    );
    if (!result.rowCount) return response.status(404).json({ message: 'Không tìm thấy thực phẩm.' });
    response.json(result.rows[0]);
  } catch (error) {
    if (error.code === '22P02') return response.status(400).json({ message: 'Mã thực phẩm không hợp lệ.' });
    next(error);
  }
}

export async function remove(request, response, next) {
  try {
    const result = await pool.query('DELETE FROM inventory_items WHERE id = $1 AND user_id = $2', [request.params.id, request.user.id]);
    if (!result.rowCount) return response.status(404).json({ message: 'Không tìm thấy thực phẩm.' });
    response.status(204).end();
  } catch (error) {
    if (error.code === '22P02') return response.status(400).json({ message: 'Mã thực phẩm không hợp lệ.' });
    next(error);
  }
}
