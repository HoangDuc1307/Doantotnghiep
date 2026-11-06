import { pool } from '../db/pool.js';

function readItem(body) {
  body = body && typeof body === 'object' ? body : {};
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const unit = typeof body.unit === 'string' ? body.unit.trim() : '';
  const quantity = body.quantity === '' || body.quantity == null ? Number.NaN : Number(body.quantity);
  const expiryDate = body.expiry_date || null;
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
  return { values: [name, quantity, unit, expiryDate] };
}

export async function list(request, response, next) {
  try {
    const result = await pool.query(
      `SELECT id, name, quantity, unit, expiry_date, created_at, updated_at
       FROM inventory_items WHERE user_id = $1 ORDER BY expiry_date ASC NULLS LAST, name ASC`, [request.user.id],
    );
    response.json(result.rows);
  } catch (error) { next(error); }
}

export async function create(request, response, next) {
  const parsed = readItem(request.body);
  if (parsed.error) return response.status(400).json({ message: parsed.error });
  try {
    const result = await pool.query(
      `INSERT INTO inventory_items (name, quantity, unit, expiry_date, user_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, quantity, unit, expiry_date, created_at, updated_at`, [...parsed.values, request.user.id],
    );
    response.status(201).json(result.rows[0]);
  } catch (error) { next(error); }
}

export async function update(request, response, next) {
  const parsed = readItem(request.body);
  if (parsed.error) return response.status(400).json({ message: parsed.error });
  try {
    const result = await pool.query(
      `UPDATE inventory_items SET name = $1, quantity = $2, unit = $3, expiry_date = $4, updated_at = NOW()
       WHERE id = $5 AND user_id = $6 RETURNING id, name, quantity, unit, expiry_date, created_at, updated_at`,
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
