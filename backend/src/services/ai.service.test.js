import assert from 'node:assert/strict';
import test from 'node:test';
import { buildMealPrompt, verifyMealPlan } from './ai.service.js';

test('buildMealPrompt requires the exact inventory unit and leaves calorie math to the server', () => {
  const prompt = buildMealPrompt({
    calorieTarget: 2000,
    items: [{ id: 'egg', name: 'Trứng', energyKcalPer100g: 143 }],
  });

  assert.match(prompt.system, /inventoryId/);
  assert.match(prompt.system, /quantity/);
  assert.match(prompt.system, /availableQuantity/);
  assert.match(prompt.system, /đúng đơn vị kho/i);
  assert.match(prompt.system, /không cần đạt chính xác/i);
  assert.doesNotMatch(prompt.system, /grams/);
  assert.match(prompt.user, /2000 kcal/);
});

test('verifyMealPlan calculates kcal only for g or kg inventory and retains inventory identifiers', () => {
  const items = [{ id: 'pork', name: 'Thịt lợn', unit: 'g', availableQuantity: 200, energyKcalPer100g: 109 }];
  const result = verifyMealPlan({ meals: [{ name: 'Thịt luộc', ingredients: [{ inventoryId: 'pork', quantity: 150, unit: 'g' }], steps: ['Luộc chín.'] }] }, items, 2000);
  assert.equal(result.totalKcal, 164);
  assert.equal(result.confidence, 'estimated');
  assert.equal(result.meals[0].ingredients[0].inventoryId, 'pork');
  const kilogramResult = verifyMealPlan(
    { meals: [{ name: 'Thịt kho', ingredients: [{ inventoryId: 'beef', quantity: 0.2, unit: 'kg' }], steps: ['Kho chín.'] }] },
    [{ id: 'beef', name: 'Thịt bò', unit: 'kg', availableQuantity: 1, energyKcalPer100g: 109 }],
    2000,
  );
  assert.equal(kilogramResult.totalKcal, 218);
});

test('verifyMealPlan rejects exceeding stock and keeps count-based inventory partial', () => {
  const grams = [{ id: 'pork', name: 'Thịt lợn', unit: 'g', availableQuantity: 200, energyKcalPer100g: 109 }];
  assert.throws(() => verifyMealPlan({ meals: [{ name: 'Sai', ingredients: [{ inventoryId: 'pork', quantity: 201, unit: 'g' }], steps: ['Nấu.'] }] }, grams, 2000));
  assert.throws(() => verifyMealPlan({ meals: [{ name: 'Sai đơn vị', ingredients: [{ inventoryId: 'pork', quantity: 1, unit: 'kg' }], steps: ['Nấu.'] }] }, grams, 2000));
  const partial = verifyMealPlan({ meals: [{ name: 'Trứng', ingredients: [{ inventoryId: 'egg', quantity: 1, unit: 'quả' }], steps: ['Nấu.'] }] }, [{ id: 'egg', name: 'Trứng', unit: 'quả', availableQuantity: 2, energyKcalPer100g: 143 }], 2000);
  assert.equal(partial.totalKcal, null);
  assert.deepEqual(partial.unverifiedItems, [{ id: 'egg', name: 'Trứng' }]);
});

test('verifyMealPlan uses the same per-meal rounding for snapshots and total kcal', () => {
  const result = verifyMealPlan({
    meals: [
      { name: 'Món một', ingredients: [{ inventoryId: 'rice', quantity: 1, unit: 'g' }], steps: ['Nấu.'] },
      { name: 'Món hai', ingredients: [{ inventoryId: 'rice', quantity: 1, unit: 'g' }], steps: ['Nấu.'] },
    ],
  }, [{ id: 'rice', name: 'Gạo', unit: 'g', availableQuantity: 2, energyKcalPer100g: 150 }], 2000);

  assert.deepEqual(result.meals.map((meal) => meal.energySnapshot), [2, 2]);
  assert.equal(result.totalKcal, 4);
});
