import pg from 'pg';

const { Pool } = pg;
if (!process.env.DATABASE_URL) {
  throw new Error('Thiếu DATABASE_URL. Hãy tạo backend/.env từ .env.example.');
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.on('error', (error) => console.error('Lỗi kết nối PostgreSQL:', error.message));
