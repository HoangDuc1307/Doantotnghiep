import assert from 'node:assert/strict';
import test from 'node:test';
import { readProfile } from './profile.validation.js';

test('readProfile accepts an energy target with optional measurements', () => {
  assert.deepEqual(readProfile({ height_cm: 168.5, weight_kg: null, daily_calorie_target: 2000 }), {
    values: [168.5, null, 2000],
  });
});

test('readProfile rejects an invalid energy target', () => {
  assert.equal(readProfile({ height_cm: null, weight_kg: null, daily_calorie_target: 0 }).error,
    'Mục tiêu năng lượng phải là số nguyên từ 1 đến 10.000 kcal.');
});
