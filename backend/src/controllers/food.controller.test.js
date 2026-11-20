import 'dotenv/config';
import assert from 'node:assert/strict';
import test from 'node:test';
import { findSingleExactFood, isReferenceSourceId, readEnergyKcal, toNutritionFood } from './food.controller.js';
import { parseNutritionReference } from '../../scripts/import-pwa-nutrition-reference.js';
import { readFile } from 'node:fs/promises';

test('toNutritionFood only accepts a complete Vietnamese nutrition record', () => {
  assert.deepEqual(toNutritionFood({ id: 'vfd_12345678', name: 'Trứng gà', energy_kcal_per_100g: 166 }), {
    id: 'vfd_12345678', description: 'Trứng gà', energy_kcal_per_100g: 166,
  });
  assert.equal(toNutritionFood({ id: 'vfd_12345678', name: 'Trứng gà' }), null);
});

test('readEnergyKcal keeps an actual zero and rejects missing or invalid raw values', () => {
  assert.equal(readEnergyKcal(0), 0);
  assert.equal(readEnergyKcal(' 0 '), 0);
  for (const value of [null, undefined, '', '   ', true, false, -1, Number.NaN, Infinity, -Infinity]) {
    assert.equal(readEnergyKcal(value), null);
  }
  assert.equal(toNutritionFood({ id: 'zero-kcal', name: 'Nước', energy_kcal_per_100g: 0 })?.energy_kcal_per_100g, 0);
  assert.equal(toNutritionFood({ id: 'missing-kcal', name: 'Nước', energy_kcal_per_100g: null }), null);
});

test('exact nutrition matching does not substitute lean pork for pork belly', () => {
  const foods = [{ id: 'lean-pork', description: 'Thịt lợn nạc', energy_kcal_per_100g: 139 }];
  assert.equal(findSingleExactFood(foods, 'thịt ba chỉ'), null);
  assert.deepEqual(findSingleExactFood(foods, '  THỊT  LỢN NẠC '), foods[0]);
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
