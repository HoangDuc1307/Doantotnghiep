import { pool } from '../db/pool.js';

export async function health(_request, response) {
  try {
    await pool.query('SELECT 1');
    response.json({ status: 'ok', database: 'connected' });
  } catch {
    response.status(503).json({ status: 'error', message: 'Không kết nối được cơ sở dữ liệu.' });
  }
}
