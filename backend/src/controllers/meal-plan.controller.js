import { pool } from '../db/pool.js';
import { AiConfigurationError, AiProviderError, generateMealSuggestion } from '../services/ai.service.js';

export async function suggest(request, response, next) {
  try {
    const [itemsResult, userResult] = await Promise.all([
      pool.query(
        `SELECT i.id, i.name, i.unit, f.energy_kcal_per_100g
         FROM inventory_items i LEFT JOIN foods f ON f.id = i.food_id
         WHERE i.user_id = $1
         ORDER BY i.expiry_date ASC NULLS LAST, i.name ASC LIMIT 15`,
        [request.user.id],
      ),
      pool.query('SELECT daily_calorie_target FROM users WHERE id = $1', [request.user.id]),
    ]);
    if (!itemsResult.rowCount) return response.status(400).json({ message: 'Hãy thêm thực phẩm vào kho trước khi tạo gợi ý.' });
    const items = itemsResult.rows.map((item) => {
      return {
        id: item.id, name: item.name, unit: item.unit,
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
