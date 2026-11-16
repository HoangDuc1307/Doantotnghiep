const baseUrl = (process.env.MOTAPIS_BASE_URL || 'https://motapis.com/v1').replace(/\/+$/, '');
const model = process.env.MOTAPIS_MODEL || 'gpt-6-sol';

export class AiConfigurationError extends Error {}
export class AiProviderError extends Error {}

export function buildMealPrompt({ items, calorieTarget }) {
  return {
    system: `Bạn là trợ lý nấu ăn. Trả lời CHỈ bằng JSON hợp lệ, không markdown, theo dạng {"meals":[{"name":"...","ingredients":[{"inventoryId":"uuid","quantity":number,"unit":"...","grams":number}],"steps":["..."]}]}. Tạo tối đa 3 bữa, mỗi bữa tối đa 5 nguyên liệu và 4 bước. Chỉ dùng inventoryId trong danh sách kho. Dựa vào energyKcalPer100g để tự chọn tổng khẩu phần gram gần mục tiêu năng lượng, ưu tiên chênh lệch không quá ±15% khi đủ dữ liệu. Với trứng, rau, củ, quả và thực phẩm theo đơn vị cái/bó/hộp, trả quantity và unit dễ đọc như quả, củ, bó hoặc hộp; với thịt, cá và gà, trả quantity theo g. Trường grams luôn là khối lượng ước tính nội bộ để máy chủ tính kcal, không phải số lượng kho của người dùng. Viết tiếng Việt. Không đưa kcal hay phép tính vào JSON; máy chủ sẽ tự tính lại.`,
    user: `Tạo thực đơn trong ngày, ưu tiên thực phẩm trong kho và cố gắng gần mục tiêu ${calorieTarget} kcal. Mỗi món ghi bước nấu ngắn gọn.\n\nKho JSON:\n${JSON.stringify(items)}`,
  };
}

function parseJson(content) {
  const match = content.trim().match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  try { return JSON.parse(match ? match[1] : content); } catch { throw new AiProviderError('Dịch vụ AI không trả về thực đơn đúng cấu trúc. Vui lòng thử lại.'); }
}

export function verifyMealPlan(plan, items, calorieTarget) {
  if (!Array.isArray(plan?.meals) || plan.meals.length === 0 || plan.meals.length > 4) throw new AiProviderError('Dịch vụ AI không trả về thực đơn hợp lệ.');
  const available = new Map(items.map((item) => [item.id, item]));
  let totalKcal = 0;
  let caloriesComplete = true;
  const unverifiedItems = new Map();
  const meals = plan.meals.map((meal) => {
    if (typeof meal?.name !== 'string' || !meal.name.trim() || !Array.isArray(meal.ingredients) || !Array.isArray(meal.steps)) {
      throw new AiProviderError('Dịch vụ AI trả về món ăn thiếu dữ liệu.');
    }
    const ingredients = meal.ingredients.map((ingredient) => {
      const item = available.get(ingredient?.inventoryId);
      const grams = Number(ingredient?.grams);
      const quantity = Number(ingredient?.quantity);
      const unit = typeof ingredient?.unit === 'string' ? ingredient.unit.trim().slice(0, 20) : '';
      if (!item || !Number.isFinite(grams) || grams <= 0 || grams > 1500 || !Number.isFinite(quantity) || quantity <= 0 || !unit) {
        throw new AiProviderError('Dịch vụ AI dùng nguyên liệu không hợp lệ.');
      }
      let kcal = null;
      if (item.energyKcalPer100g !== null) {
        kcal = item.energyKcalPer100g * grams / 100;
        totalKcal += kcal;
      } else {
        caloriesComplete = false;
        unverifiedItems.set(item.id, { id: item.id, name: item.name });
      }
      return { name: item.name, quantity, unit, grams: Math.round(grams), kcal: kcal === null ? null : Math.round(kcal) };
    });
    const steps = meal.steps.filter((step) => typeof step === 'string' && step.trim()).slice(0, 6);
    if (!ingredients.length || !steps.length) throw new AiProviderError('Dịch vụ AI trả về cách nấu không hợp lệ.');
    return { name: meal.name.trim().slice(0, 120), ingredients, steps };
  });
  const roundedTotal = caloriesComplete ? Math.round(totalKcal) : null;
  const suggestion = meals.map((meal) => `${meal.name}\nNguyên liệu: ${meal.ingredients.map((item) => `${item.name} ${item.quantity} ${item.unit}`).join(', ')}\nCách nấu: ${meal.steps.map((step, index) => `${index + 1}. ${step}`).join(' ')}`).join('\n\n');
  return { suggestion, meals, totalKcal: roundedTotal, targetKcal: calorieTarget, differenceKcal: roundedTotal === null ? null : Math.abs(roundedTotal - calorieTarget), unverifiedItems: [...unverifiedItems.values()], confidence: caloriesComplete ? 'estimated' : 'partial' };
}

export async function generateMealSuggestion(input) {
  const apiKey = process.env.MOTAPIS_API_KEY;
  if (!apiKey) throw new AiConfigurationError('Chưa cấu hình MOTAPIS_API_KEY trên máy chủ.');

  const prompt = buildMealPrompt(input);
  let response;
  try {
    response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user },
        ],
        response_format: { type: 'json_object' },
        temperature: 0,
        max_tokens: 500,
      }),
      signal: AbortSignal.timeout(45_000),
    });
  } catch {
    throw new AiProviderError('Không kết nối được dịch vụ AI. Vui lòng thử lại.');
  }

  if (!response.ok) throw new AiProviderError('Dịch vụ AI hiện chưa thể tạo gợi ý. Vui lòng thử lại sau.');
  const result = await response.json();
  const content = typeof result.choices?.[0]?.message?.content === 'string' ? result.choices[0].message.content : '';
  if (!content) throw new AiProviderError('Dịch vụ AI trả về gợi ý không hợp lệ.');
  return { ...verifyMealPlan(parseJson(content), input.items, input.calorieTarget), model: result.model || model };
}
