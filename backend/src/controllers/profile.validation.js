function optionalNumber(value, label, maximum) {
  if (value == null) return { value: null };
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0 || value > maximum) {
    return { error: `${label} phải lớn hơn 0 và không vượt quá ${maximum}.` };
  }
  return { value };
}

function optionalInteger(value, label, minimum, maximum) {
  if (value == null) return { value: null };
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    return { error: `${label} phải là số nguyên từ ${minimum} đến ${maximum}.` };
  }
  return { value };
}

export function readProfile(body) {
  if (!body || typeof body !== 'object') return { error: 'Dữ liệu hồ sơ không hợp lệ.' };

  const height = optionalNumber(body.height_cm, 'Chiều cao', 300);
  if (height.error) return height;
  const weight = optionalNumber(body.weight_kg, 'Cân nặng', 500);
  if (weight.error) return weight;
  const age = optionalInteger(body.age_years, 'Tuổi', 18, 120);
  if (age.error) return age;

  const sex = body.sex_for_equation == null ? null : body.sex_for_equation;
  if (sex !== null && sex !== 'male' && sex !== 'female') {
    return { error: 'Giới tính dùng cho công thức phải là male hoặc female.' };
  }
  const activity = optionalNumber(body.activity_factor, 'Hệ số vận động', 3);
  if (activity.error) return activity;

  const dailyCalorieTarget = body.daily_calorie_target;
  if (!Number.isInteger(dailyCalorieTarget) || dailyCalorieTarget <= 0 || dailyCalorieTarget > 10000) {
    return { error: 'Mục tiêu năng lượng phải là số nguyên từ 1 đến 10.000 kcal.' };
  }

  return { values: [height.value, weight.value, dailyCalorieTarget, age.value, sex, activity.value] };
}
