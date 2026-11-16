import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pool } from '../src/db/pool.js';

const inputPath = resolve(process.argv[2] || 'data/FoodData_Central_foundation_food_json_2026-10-29.json');
const source = 'USDA FoodData Central Foundation Foods';
const sourceVersion = '2026-10-29';
const data = JSON.parse(await readFile(inputPath, 'utf8'));
const rows = data.FoundationFoods.flatMap((food) => {
  const energy = food.foodNutrients.find((nutrient) => nutrient.nutrient?.id === 1008)?.amount;
  return Number.isFinite(energy) ? [[food.fdcId, food.description, energy]] : [];
});

if (!rows.length) throw new Error('Không tìm thấy bản ghi năng lượng kcal trong dữ liệu USDA.');
const client = await pool.connect();
try {
  await client.query('BEGIN');
  for (const [fdcId, description, energy] of rows) {
    await client.query(
      `INSERT INTO foods (fdc_id, description, energy_kcal_per_100g, source, source_version)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (fdc_id) DO UPDATE SET description = EXCLUDED.description,
         energy_kcal_per_100g = EXCLUDED.energy_kcal_per_100g, source = EXCLUDED.source,
         source_version = EXCLUDED.source_version`,
      [fdcId, description, energy, source, sourceVersion],
    );
  }
  await client.query('COMMIT');
  console.log(`Đã nhập ${rows.length} thực phẩm USDA Foundation Foods.`);
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
  await pool.end();
}
