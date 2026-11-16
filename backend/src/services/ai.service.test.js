import assert from 'node:assert/strict';
import test from 'node:test';
import { buildMealPrompt, verifyMealPlan } from './ai.service.js';

test('buildMealPrompt asks AI for estimated grams and leaves calorie math to the server', () => {
  const prompt = buildMealPrompt({
    calorieTarget: 2000,
    items: [{ id: 'egg', name: 'Trứng', energyKcalPer100g: 143 }],
  });

  assert.match(prompt.system, /inventoryId/);
  assert.match(prompt.system, /quantity/);
  assert.match(prompt.system, /grams/);
  assert.match(prompt.system, /ước tính/i);
  assert.match(prompt.system, /±15%/);
  assert.match(prompt.user, /2000 kcal/);
});

test('verifyMealPlan calculates estimated kcal from AI grams and preserves partial results', () => {
  const items = [{ id: 'egg', name: 'Trứng', energyKcalPer100g: 143 }];
  const result = verifyMealPlan({ meals: [{ name: 'Trứng luộc', ingredients: [{ inventoryId: 'egg', quantity: 1, unit: 'quả', grams: 50 }], steps: ['Luộc chín.'] }] }, items, 2000);
  assert.equal(result.totalKcal, 72);
  assert.equal(result.confidence, 'estimated');
  assert.throws(() => verifyMealPlan({ meals: [{ name: 'Sai', ingredients: [{ inventoryId: 'egg', quantity: 1, unit: 'quả', grams: 1501 }], steps: ['Nấu.'] }] }, items, 2000));
  const partial = verifyMealPlan({ meals: [{ name: 'Trứng', ingredients: [{ inventoryId: 'egg', quantity: 1, unit: 'quả', grams: 55 }], steps: ['Nấu.'] }] }, [{ id: 'egg', name: 'Trứng', energyKcalPer100g: null }], 2000);
  assert.equal(partial.totalKcal, null);
  assert.deepEqual(partial.unverifiedItems, [{ id: 'egg', name: 'Trứng' }]);
});
