import assert from 'node:assert/strict';
import test from 'node:test';
import { readProfile } from './profile.validation.js';

test('readProfile accepts an energy target with optional measurements', () => {
  assert.deepEqual(readProfile({ height_cm: 168.5, weight_kg: null, daily_calorie_target: 2000 }), {
    values: [168.5, null, 2000, null, null, null],
  });
});

test('readProfile accepts optional equation fields without estimating a target', () => {
  assert.deepEqual(readProfile({
    height_cm: 170, weight_kg: 65, daily_calorie_target: 2000,
    age_years: 22, sex_for_equation: 'male', activity_factor: 1.55,
  }), { values: [170, 65, 2000, 22, 'male', 1.55] });
});

test('readProfile rejects an invalid energy target', () => {
  assert.equal(readProfile({ height_cm: null, weight_kg: null, daily_calorie_target: 0 }).error,
    'Mục tiêu năng lượng phải là số nguyên từ 1 đến 10.000 kcal.');
});
