import 'dotenv/config';
import assert from 'node:assert/strict';
import test from 'node:test';
import { isReferenceSourceId, toNutritionFood } from './food.controller.js';
import { parseNutritionReference } from '../../scripts/import-pwa-nutrition-reference.js';
import { readFile } from 'node:fs/promises';

test('toNutritionFood only accepts a complete Vietnamese nutrition record', () => {
  assert.deepEqual(toNutritionFood({ id: 'vfd_12345678', name: 'Trứng gà', energy_kcal_per_100g: 166 }), {
    id: 'vfd_12345678', description: 'Trứng gà', energy_kcal_per_100g: 166,
  });
  assert.equal(toNutritionFood({ id: 'vfd_12345678', name: 'Trứng gà' }), null);
});

test('reference CSV has 28 valid 100 g nutrition records with source metadata', async () => {
  const records = parseNutritionReference(await readFile('../docs/PWA_Nutrition_Reference_V1_28.csv', 'utf8'));
  assert.equal(records.length, 28);
  assert.equal(records[0].baseUnit, 'g');
  assert.equal(records[0].baseQuantity, 100);
  assert.equal(records[0].source, 'SMILING Vietnam');
  assert.match(records[0].sourceSha256, /^[a-f0-9]{64}$/i);
  assert.equal(isReferenceSourceId(records[0].id), true);
  assert.equal(isReferenceSourceId('vfd_12345678'), false);
});
