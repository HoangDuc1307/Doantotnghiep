import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { pool } from '../src/db/pool.js';

const requiredColumns = [
  'food_id', 'name_vi', 'basis_quantity', 'basis_unit', 'energy_kcal_per_100g',
  'protein_g_per_100g', 'fat_g_per_100g', 'carbohydrate_g_per_100g',
  'source_dataset', 'source_version', 'source_food_code', 'source_url', 'source_sha256',
];

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') { value += '"'; index += 1; }
      else if (char === '"') quoted = false;
      else value += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') { row.push(value); value = ''; }
    else if (char === '\n') { row.push(value.replace(/\r$/, '')); rows.push(row); row = []; value = ''; }
    else value += char;
  }
  if (quoted) throw new Error('CSV tham chiếu có chuỗi trích dẫn chưa đóng.');
  if (value || row.length) { row.push(value.replace(/\r$/, '')); rows.push(row); }
  return rows;
}

function numberValue(value, column, { required = false } = {}) {
  if (value === '') {
    if (required) throw new Error(`Thiếu ${column}.`);
    return null;
  }
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) throw new Error(`${column} không hợp lệ.`);
  return number;
}

export function parseNutritionReference(text) {
  const [header, ...rows] = parseCsv(text);
  if (!header) throw new Error('CSV tham chiếu không có header.');
  header[0] = header[0].replace(/^\uFEFF/, '');
  const missing = requiredColumns.filter((column) => !header.includes(column));
  if (missing.length) throw new Error(`CSV tham chiếu thiếu cột: ${missing.join(', ')}.`);
  if (rows.length !== 28) throw new Error(`CSV tham chiếu phải có đúng 28 hồ sơ, nhận được ${rows.length}.`);
  const records = rows.map((row) => Object.fromEntries(header.map((column, index) => [column, row[index] ?? '']))).map((row) => {
    if (!row.food_id || !row.name_vi || !row.source_dataset || !row.source_version || !row.source_food_code || !row.source_url) {
      throw new Error('Một hồ sơ tham chiếu thiếu định danh hoặc nguồn.');
    }
    if (!/^[a-f0-9]{64}$/i.test(row.source_sha256)) throw new Error(`Mã băm nguồn không hợp lệ cho ${row.food_id}.`);
    if (numberValue(row.basis_quantity, 'basis_quantity', { required: true }) !== 100 || row.basis_unit !== 'g') {
      throw new Error(`${row.food_id} không dùng cơ sở 100 g.`);
    }
    return {
      id: row.food_id,
      description: row.name_vi,
      baseQuantity: 100,
      baseUnit: 'g',
      energy: numberValue(row.energy_kcal_per_100g, 'energy_kcal_per_100g', { required: true }),
      protein: numberValue(row.protein_g_per_100g, 'protein_g_per_100g'),
      lipid: numberValue(row.fat_g_per_100g, 'fat_g_per_100g'),
      carbohydrate: numberValue(row.carbohydrate_g_per_100g, 'carbohydrate_g_per_100g'),
      source: row.source_dataset,
      sourceVersion: row.source_version,
      sourceCode: row.source_food_code,
      sourceUrl: row.source_url,
      sourceLocator: row.source_locator,
      sourceSha256: row.source_sha256,
      qualityFlags: row.quality_flags,
    };
  });
  if (new Set(records.map((record) => record.id)).size !== records.length) throw new Error('CSV tham chiếu có food_id trùng lặp.');
  return records;
}

async function main() {
  const scriptDirectory = dirname(fileURLToPath(import.meta.url));
  const inputPath = process.argv[2]
    ? resolve(process.cwd(), process.argv[2])
    : resolve(scriptDirectory, '../../docs/PWA_Nutrition_Reference_V1_28.csv');
  const records = parseNutritionReference(await readFile(inputPath, 'utf8'));
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const record of records) {
      await client.query(
        `INSERT INTO foods (description, base_quantity, base_unit, energy_kcal_per_100g,
                            protein_g_per_100g, lipid_g_per_100g, carbohydrate_g_per_100g,
                            source, source_id, source_code, source_version, source_url, source_locator, source_sha256, quality_flags, retrieved_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())
         ON CONFLICT (source, source_code) WHERE source_code IS NOT NULL
         DO UPDATE SET description = EXCLUDED.description, base_quantity = EXCLUDED.base_quantity, base_unit = EXCLUDED.base_unit,
           energy_kcal_per_100g = EXCLUDED.energy_kcal_per_100g, protein_g_per_100g = EXCLUDED.protein_g_per_100g,
           lipid_g_per_100g = EXCLUDED.lipid_g_per_100g, carbohydrate_g_per_100g = EXCLUDED.carbohydrate_g_per_100g,
           source_id = EXCLUDED.source_id, source_version = EXCLUDED.source_version, source_url = EXCLUDED.source_url,
           source_locator = EXCLUDED.source_locator, source_sha256 = EXCLUDED.source_sha256,
           quality_flags = EXCLUDED.quality_flags, retrieved_at = EXCLUDED.retrieved_at`,
        [record.description, record.baseQuantity, record.baseUnit, record.energy, record.protein, record.lipid, record.carbohydrate,
          record.source, record.id, record.sourceCode, record.sourceVersion, record.sourceUrl, record.sourceLocator, record.sourceSha256, record.qualityFlags],
      );
    }
    await client.query('COMMIT');
    console.log(`Đã nhập ${records.length} hồ sơ dinh dưỡng tham chiếu.`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
