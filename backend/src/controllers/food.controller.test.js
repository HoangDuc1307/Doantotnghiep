import 'dotenv/config';
import assert from 'node:assert/strict';
import test from 'node:test';
import { toNutritionFood } from './food.controller.js';

test('toNutritionFood only accepts a complete Vietnamese nutrition record', () => {
  assert.deepEqual(toNutritionFood({ id: 'vfd_12345678', name: 'Trứng gà', energy_kcal_per_100g: 166 }), {
    id: 'vfd_12345678', description: 'Trứng gà', energy_kcal_per_100g: 166,
  });
  assert.equal(toNutritionFood({ id: 'vfd_12345678', name: 'Trứng gà' }), null);
});
