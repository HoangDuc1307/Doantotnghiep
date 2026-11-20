import { pool } from '../db/pool.js';
import { AiConfigurationError, AiProviderError, generateMealSuggestion, verifyMealPlan } from '../services/ai.service.js';

export async function suggest(request, response, next) {
  try {
    const [itemsResult, userResult] = await Promise.all([
      pool.query(
        `SELECT i.id, i.name, i.quantity, i.unit, i.food_id, f.energy_kcal_per_100g
         FROM inventory_items i LEFT JOIN foods f ON f.id = i.food_id
         WHERE i.user_id = $1 AND i.quantity > 0
           AND (i.expiry_date IS NULL OR i.expiry_date >= CURRENT_DATE)
         ORDER BY i.expiry_date ASC NULLS LAST, i.name ASC LIMIT 15`,
        [request.user.id],
      ),
      pool.query('SELECT daily_calorie_target FROM users WHERE id = $1', [request.user.id]),
    ]);
    if (!itemsResult.rowCount) return response.status(400).json({ message: 'Hãy thêm thực phẩm vào kho trước khi tạo gợi ý.' });
    const items = itemsResult.rows.map((item) => {
      return {
        id: item.id, name: item.name, unit: item.unit, availableQuantity: Number(item.quantity), foodId: item.food_id,
        energyKcalPer100g: item.energy_kcal_per_100g === null ? null : Number(item.energy_kcal_per_100g),
      };
    });
    const calorieTarget = userResult.rows[0]?.daily_calorie_target;
    if (!calorieTarget) return response.status(400).json({ message: 'Hãy thiết lập mục tiêu năng lượng trước khi tạo gợi ý.' });

    response.json(await generateMealSuggestion({ items, calorieTarget }));
  } catch (error) {
    if (error instanceof AiConfigurationError) return response.status(503).json({ message: error.message });
    if (error instanceof AiProviderError) return response.status(502).json({ message: error.message });
    next(error);
  }
}

export async function list(request, response, next) {
  try {
    const result = await pool.query(
      `SELECT mp.id, mp.plan_date, mp.target_kcal, mp.total_kcal, mp.status, mp.created_at,
              ARRAY_AGG(r.name ORDER BY mpi.line_no) AS meal_names
       FROM meal_plans mp
       JOIN meal_plan_items mpi ON mpi.plan_id = mp.id
       JOIN recipes r ON r.id = mpi.recipe_id
       WHERE mp.user_id = $1
       GROUP BY mp.id
       ORDER BY mp.plan_date DESC, mp.created_at DESC`,
      [request.user.id],
    );
    response.json(result.rows);
  } catch (error) { next(error); }
}

export async function read(request, response, next) {
  try {
    const planResult = await pool.query(
      `SELECT id, plan_date, target_kcal, total_kcal, status, created_at
       FROM meal_plans WHERE id = $1 AND user_id = $2`,
      [request.params.id, request.user.id],
    );
    if (!planResult.rowCount) return response.status(404).json({ message: 'Không tìm thấy thực đơn.' });
    const itemsResult = await pool.query(
      `SELECT mpi.line_no, mpi.meal_slot, mpi.servings, mpi.energy_snapshot,
              r.id AS recipe_id, r.name, r.instructions
       FROM meal_plan_items mpi JOIN recipes r ON r.id = mpi.recipe_id
       WHERE mpi.plan_id = $1 ORDER BY mpi.line_no`,
      [planResult.rows[0].id],
    );
    const ingredientsResult = await pool.query(
      `SELECT ri.recipe_id, ri.line_no, ri.quantity, ri.unit, f.description AS food_name
       FROM recipe_ingredients ri JOIN foods f ON f.id = ri.food_id
       WHERE ri.recipe_id = ANY($1::uuid[]) ORDER BY ri.recipe_id, ri.line_no`,
      [itemsResult.rows.map((item) => item.recipe_id)],
    );
    const ingredientsByRecipe = new Map();
    for (const ingredient of ingredientsResult.rows) {
      const ingredients = ingredientsByRecipe.get(ingredient.recipe_id) || [];
      ingredients.push(ingredient);
      ingredientsByRecipe.set(ingredient.recipe_id, ingredients);
    }
    response.json({
      ...planResult.rows[0],
      meals: itemsResult.rows.map((item) => ({ ...item, ingredients: ingredientsByRecipe.get(item.recipe_id) || [] })),
    });
  } catch (error) {
    if (error.code === '22P02') return response.status(400).json({ message: 'Mã thực đơn không hợp lệ.' });
    next(error);
  }
}

export async function create(request, response, next) {
  const planDate = readPlanDate(request.body?.plan_date);
  if (!planDate) return response.status(400).json({ message: 'Ngày thực đơn phải có dạng YYYY-MM-DD hợp lệ.' });
  if (!Array.isArray(request.body?.meals)) return response.status(400).json({ message: 'Thực đơn cần có danh sách món ăn.' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const [itemsResult, userResult] = await Promise.all([
      client.query(
        `SELECT i.id, i.name, i.quantity, i.unit, i.food_id, f.energy_kcal_per_100g
         FROM inventory_items i LEFT JOIN foods f ON f.id = i.food_id
         WHERE i.user_id = $1 AND i.quantity > 0
           AND (i.expiry_date IS NULL OR i.expiry_date >= CURRENT_DATE)
         FOR SHARE OF i`,
        [request.user.id],
      ),
      client.query('SELECT daily_calorie_target FROM users WHERE id = $1', [request.user.id]),
    ]);
    const calorieTarget = userResult.rows[0]?.daily_calorie_target;
    if (!calorieTarget) {
      await client.query('ROLLBACK');
      return response.status(400).json({ message: 'Hãy thiết lập mục tiêu năng lượng trước khi lưu thực đơn.' });
    }
    if (!itemsResult.rowCount) {
      await client.query('ROLLBACK');
      return response.status(400).json({ message: 'Kho không còn thực phẩm có thể dùng để lưu thực đơn.' });
    }
    const inventory = itemsResult.rows.map((item) => ({
      id: item.id, name: item.name, unit: item.unit, availableQuantity: Number(item.quantity), foodId: item.food_id,
      energyKcalPer100g: item.energy_kcal_per_100g === null ? null : Number(item.energy_kcal_per_100g),
    }));
    const checked = verifyMealPlan({ meals: request.body.meals }, inventory, calorieTarget);
    if (checked.totalKcal === null) {
      await client.query('ROLLBACK');
      return response.status(400).json({ message: 'Thực đơn chỉ có thể lưu khi mọi nguyên liệu có lượng g hoặc kg và dữ liệu năng lượng.' });
    }

    const planResult = await client.query(
      `INSERT INTO meal_plans (user_id, plan_date, target_kcal, total_kcal, status)
       VALUES ($1, $2, $3, $4, 'confirmed')
       RETURNING id, plan_date, target_kcal, total_kcal, status, created_at`,
      [request.user.id, planDate, calorieTarget, checked.totalKcal],
    );
    for (const [index, meal] of checked.meals.entries()) {
      const recipeResult = await client.query(
        `INSERT INTO recipes (name, servings, instructions) VALUES ($1, 1, $2) RETURNING id`,
        [meal.name, meal.steps.join('\n')],
      );
      for (const [line, ingredient] of meal.ingredients.entries()) {
        const foodId = inventory.find((item) => item.id === ingredient.inventoryId)?.foodId;
        await client.query(
          `INSERT INTO recipe_ingredients (recipe_id, line_no, food_id, quantity, unit)
           VALUES ($1, $2, $3, $4, $5)`,
          [recipeResult.rows[0].id, line + 1, foodId, ingredient.quantity, ingredient.unit],
        );
      }
      await client.query(
        `INSERT INTO meal_plan_items (plan_id, line_no, recipe_id, meal_slot, servings, energy_snapshot)
         VALUES ($1, $2, $3, $4, 1, $5)`,
        [planResult.rows[0].id, index + 1, recipeResult.rows[0].id, mealSlot(index), meal.energySnapshot],
      );
    }
    await client.query('COMMIT');
    response.status(201).json({ ...planResult.rows[0], meal_names: checked.meals.map((meal) => meal.name), meals: checked.meals });
  } catch (error) {
    await client.query('ROLLBACK');
    if (error instanceof AiProviderError) return response.status(400).json({ message: error.message });
    next(error);
  } finally {
    client.release();
  }
}

function readPlanDate(value) {
  const match = typeof value === 'string' && /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, year, month, day] = match.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? value : null;
}

function mealSlot(index) {
  return ['breakfast', 'lunch', 'dinner', 'snack'][index] || 'snack';
}
