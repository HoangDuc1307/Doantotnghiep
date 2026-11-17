const baseUrl = (process.env.MOTAPIS_BASE_URL || 'https://motapis.com/v1').replace(/\/+$/, '');
const model = process.env.MOTAPIS_MODEL || 'gpt-6-sol';

export class AiConfigurationError extends Error {}
export class AiProviderError extends Error {}

export function buildMealPrompt({ items, calorieTarget }) {
  return {
    system: `Bạn là trợ lý nấu ăn thực tế. Trả lời duy nhất JSON theo dạng {"meals":[{"name":"...","ingredients":[{"inventoryId":"id có sẵn","quantity":number,"unit":"đơn vị kho"}],"steps":["..."]}]}. Tạo 1 đến 3 món đơn giản, tối đa 4 nguyên liệu và 3 bước mỗi món. Chỉ dùng thực phẩm trong kho. Gộp món nếu kho ít; nếu không đủ nguyên liệu thì vẫn gợi ý món đơn giản nhất từ những gì có, không bịa món hàng ngoài kho. Lượng từng dòng phải dương, đúng đơn vị kho và tổng lượng một thực phẩm qua tất cả món không vượt availableQuantity. Không đổi đơn vị. Không tính hay ghi kcal. Tiếng Việt ngắn gọn. Mục tiêu năng lượng chỉ là tham khảo, không cần đạt chính xác.`,
    user: `Gợi ý vài món dễ nấu từ kho hiện có. Mục tiêu tham khảo: ${calorieTarget} kcal/ngày.\nKho:\n${JSON.stringify(items)}`,
  };
}

function parseJson(content) {
  const match = content.trim().match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  try { return JSON.parse(match ? match[1] : content); } catch { throw new AiProviderError('Dịch vụ AI không trả về thực đơn đúng cấu trúc. Vui lòng thử lại.'); }
}

export function verifyMealPlan(plan, items, calorieTarget) {
  if (!Array.isArray(plan?.meals) || plan.meals.length === 0 || plan.meals.length > 4) throw new AiProviderError('Dịch vụ AI không trả về thực đơn hợp lệ.');
  const available = new Map(items.map((item) => [item.id, item]));
  const requiredQuantities = new Map();
  let totalKcal = 0;
  let caloriesComplete = true;
  const unverifiedItems = new Map();
  const meals = plan.meals.map((meal) => {
    if (typeof meal?.name !== 'string' || !meal.name.trim() || !Array.isArray(meal.ingredients) || !Array.isArray(meal.steps)) {
      throw new AiProviderError('Dịch vụ AI trả về món ăn thiếu dữ liệu.');
    }
    const ingredients = meal.ingredients.map((ingredient) => {
      const item = available.get(ingredient?.inventoryId);
      const quantity = Number(ingredient?.quantity);
      const unit = typeof ingredient?.unit === 'string' ? ingredient.unit.trim() : '';
      if (!item || !Number.isFinite(quantity) || quantity <= 0 || quantity > 99999999 || !unit || normalizeUnit(unit) !== normalizeUnit(item.unit)) {
        throw new AiProviderError('Dịch vụ AI dùng nguyên liệu không hợp lệ.');
      }
      const requiredQuantity = (requiredQuantities.get(item.id) || 0) + quantity;
      if (requiredQuantity > item.availableQuantity) throw new AiProviderError(`Thực đơn dùng vượt số lượng ${item.name} đang có trong kho.`);
      requiredQuantities.set(item.id, requiredQuantity);

      let kcal = null;
      const grams = gramsFor(item, quantity);
      if (item.energyKcalPer100g !== null && grams !== null) {
        kcal = item.energyKcalPer100g * grams / 100;
        totalKcal += kcal;
      } else {
        caloriesComplete = false;
        unverifiedItems.set(item.id, { id: item.id, name: item.name });
      }
      return { inventoryId: item.id, name: item.name, quantity, unit: item.unit, kcal: kcal === null ? null : Math.round(kcal) };
    });
    const steps = meal.steps.filter((step) => typeof step === 'string' && step.trim()).slice(0, 6);
    if (!ingredients.length || !steps.length) throw new AiProviderError('Dịch vụ AI trả về cách nấu không hợp lệ.');
    return { name: meal.name.trim().slice(0, 120), ingredients, steps };
  });
  const roundedTotal = caloriesComplete ? Math.round(totalKcal) : null;
  const suggestion = meals.map((meal) => `${meal.name}\nNguyên liệu: ${meal.ingredients.map((item) => `${item.name} ${item.quantity} ${item.unit}`).join(', ')}\nCách nấu: ${meal.steps.map((step, index) => `${index + 1}. ${step}`).join(' ')}`).join('\n\n');
  return { suggestion, meals, totalKcal: roundedTotal, targetKcal: calorieTarget, differenceKcal: roundedTotal === null ? null : Math.abs(roundedTotal - calorieTarget), unverifiedItems: [...unverifiedItems.values()], confidence: caloriesComplete ? 'estimated' : 'partial' };
}

function normalizeUnit(unit) {
  return unit.trim().normalize('NFC').toLocaleLowerCase('vi');
}

function gramsFor(item, quantity) {
  const unit = normalizeUnit(item.unit);
  if (unit === 'g') return quantity;
  if (unit === 'kg') return quantity * 1000;
  return null;
}

export async function generateMealSuggestion(input) {
  const apiKey = process.env.MOTAPIS_API_KEY;
  if (!apiKey) throw new AiConfigurationError('Chưa cấu hình MOTAPIS_API_KEY trên máy chủ.');

  const prompt = buildMealPrompt(input);
  let response;
  for (let attempt = 0; attempt < 2; attempt += 1) {
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
          max_tokens: 350,
        }),
        signal: AbortSignal.timeout(25_000),
      });
    } catch {
      throw new AiProviderError('Dịch vụ AI không phản hồi trong thời hạn. Vui lòng thử lại.');
    }
    if (response.ok || (response.status < 500 && response.status !== 429) || attempt === 1) break;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  if (!response?.ok) throw new AiProviderError('Dịch vụ AI hiện chưa thể tạo gợi ý. Vui lòng thử lại sau.');
  let result;
  try { result = await response.json(); } catch { throw new AiProviderError('Dịch vụ AI trả về phản hồi không hợp lệ.'); }
  const content = typeof result.choices?.[0]?.message?.content === 'string' ? result.choices[0].message.content : '';
  if (!content) throw new AiProviderError('Dịch vụ AI trả về gợi ý không hợp lệ.');
  return { ...verifyMealPlan(parseJson(content), input.items, input.calorieTarget), model: result.model || model };
}
