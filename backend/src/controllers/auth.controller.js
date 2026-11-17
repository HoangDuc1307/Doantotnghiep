import { pool } from '../db/pool.js';
import { createToken, hashPassword, verifyPassword } from '../services/auth.service.js';
import { readProfile } from './profile.validation.js';

const publicUserColumns = `u.id, u.name, u.email,
  COALESCE(p.height_cm, u.height_cm)::float8 AS height_cm,
  COALESCE(p.weight_kg, u.weight_kg)::float8 AS weight_kg,
  COALESCE(p.target_kcal, u.daily_calorie_target)::float8 AS daily_calorie_target,
  p.age_years, p.sex_for_equation, p.activity_factor::float8 AS activity_factor,
  COALESCE(p.target_method, 'manual') AS target_method`;
const userFrom = 'FROM users u LEFT JOIN nutrition_profiles p ON p.user_id = u.id';

function validEmail(email) {
  return typeof email === 'string' && email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function register(request, response, next) {
  const name = typeof request.body?.name === 'string' ? request.body.name.trim() : '';
  const email = typeof request.body?.email === 'string' ? request.body.email.trim().toLowerCase() : '';
  const password = request.body?.password;
  if (!name || name.length > 80) return response.status(400).json({ message: 'Tên phải có từ 1 đến 80 ký tự.' });
  if (!validEmail(email)) return response.status(400).json({ message: 'Email không hợp lệ.' });
  if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
    return response.status(400).json({ message: 'Mật khẩu phải có từ 8 đến 128 ký tự.' });
  }
  try {
    const passwordHash = await hashPassword(password);
    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3)
       RETURNING id, name, email, height_cm::float8 AS height_cm, weight_kg::float8 AS weight_kg, daily_calorie_target::float8 AS daily_calorie_target`,
      [name, email, passwordHash],
    );
    const user = { ...result.rows[0], age_years: null, sex_for_equation: null, activity_factor: null, target_method: 'manual' };
    response.status(201).json({ user, token: createToken(user) });
  } catch (error) {
    if (error.code === '23505') return response.status(409).json({ message: 'Email này đã được đăng ký.' });
    next(error);
  }
}

export async function login(request, response, next) {
  const email = typeof request.body?.email === 'string' ? request.body.email.trim().toLowerCase() : '';
  const password = request.body?.password;
  if (!validEmail(email) || typeof password !== 'string') {
    return response.status(400).json({ message: 'Vui lòng nhập email và mật khẩu hợp lệ.' });
  }
  try {
    const result = await pool.query(`SELECT ${publicUserColumns}, u.password_hash ${userFrom} WHERE u.email = $1`, [email]);
    const user = result.rows[0];
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return response.status(401).json({ message: 'Email hoặc mật khẩu không chính xác.' });
    }
    const { password_hash: _passwordHash, ...publicUser } = user;
    response.json({ user: publicUser, token: createToken(publicUser) });
  } catch (error) { next(error); }
}

export async function me(request, response, next) {
  try {
    const result = await pool.query(`SELECT ${publicUserColumns} ${userFrom} WHERE u.id = $1`, [request.user.id]);
    if (!result.rowCount) return response.status(401).json({ message: 'Tài khoản không còn tồn tại.' });
    response.json(result.rows[0]);
  } catch (error) { next(error); }
}

export async function updateProfile(request, response, next) {
  const profile = readProfile(request.body);
  if (profile.error) return response.status(400).json({ message: profile.error });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const updated = await client.query(
      `UPDATE users SET height_cm = $1, weight_kg = $2, daily_calorie_target = $3 WHERE id = $4`,
      [...profile.values.slice(0, 3), request.user.id],
    );
    if (!updated.rowCount) {
      await client.query('ROLLBACK');
      return response.status(401).json({ message: 'Tài khoản không còn tồn tại.' });
    }
    await client.query(
      `INSERT INTO nutrition_profiles (user_id, height_cm, weight_kg, target_kcal, age_years, sex_for_equation, activity_factor)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (user_id) DO UPDATE SET height_cm = EXCLUDED.height_cm, weight_kg = EXCLUDED.weight_kg,
         target_kcal = EXCLUDED.target_kcal, age_years = EXCLUDED.age_years, sex_for_equation = EXCLUDED.sex_for_equation,
         activity_factor = EXCLUDED.activity_factor, target_method = 'manual', updated_at = NOW()`,
      [request.user.id, profile.values[0], profile.values[1], profile.values[2], profile.values[3], profile.values[4], profile.values[5]],
    );
    const result = await client.query(`SELECT ${publicUserColumns} ${userFrom} WHERE u.id = $1`, [request.user.id]);
    await client.query('COMMIT');
    response.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally { client.release(); }
}
