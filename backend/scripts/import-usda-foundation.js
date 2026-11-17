import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pool } from '../src/db/pool.js';

const inputPath = resolve(process.argv[2] || 'data/FoodData_Central_foundation_food_json_2026-10-29.json');
const source = 'USDA FoodData Central Foundation Foods';
const sourceVersion = '2026-10-29';
const data = JSON.parse(await readFile(inputPath, 'utf8'));
const rows = data.FoundationFoods.flatMap((food) => {
  const valueFor = (id) => food.foodNutrients.find((nutrient) => nutrient.nutrient?.id === id)?.amount;
  const energy = valueFor(1008);
  return Number.isFinite(energy) ? [[food.fdcId, food.description, energy, valueFor(1003), valueFor(1004), valueFor(1005)]] : [];
});

if (!rows.length) throw new Error('Không tìm thấy bản ghi năng lượng kcal trong dữ liệu USDA.');
const client = await pool.connect();
try {
  await client.query('BEGIN');
  for (const [fdcId, description, energy, protein, lipid, carbohydrate] of rows) {
    await client.query(
      `INSERT INTO foods (fdc_id, description, energy_kcal_per_100g, protein_g_per_100g, lipid_g_per_100g, carbohydrate_g_per_100g,
                         source, source_id, source_code, source_version, retrieved_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, CONCAT('fdc:', $1), CONCAT('fdc:', $1), $8, NOW())
       ON CONFLICT (fdc_id) DO UPDATE SET description = EXCLUDED.description,
         energy_kcal_per_100g = EXCLUDED.energy_kcal_per_100g, protein_g_per_100g = EXCLUDED.protein_g_per_100g,
         lipid_g_per_100g = EXCLUDED.lipid_g_per_100g, carbohydrate_g_per_100g = EXCLUDED.carbohydrate_g_per_100g,
         source = EXCLUDED.source, source_id = EXCLUDED.source_id, source_code = EXCLUDED.source_code,
         source_version = EXCLUDED.source_version, retrieved_at = EXCLUDED.retrieved_at`,
      [fdcId, description, energy, protein, lipid, carbohydrate, source, sourceVersion],
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
