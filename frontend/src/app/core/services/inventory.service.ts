import { Injectable } from '@angular/core';

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  expiry_date: string | null;
  food_id: string | null;
  food_description?: string | null;
  created_at: string;
}

export interface InventoryInput {
  name: string;
  quantity: number;
  unit: string;
  expiry_date: string | null;
  food_id: string | null;
}

export interface NutritionFood {
  id: string;
  description: string;
  energy_kcal_per_100g: number;
}

export interface Account {
  id: string;
  name: string;
  email: string;
  height_cm: number | null;
  weight_kg: number | null;
  daily_calorie_target: number | null;
  age_years: number | null;
  sex_for_equation: 'male' | 'female' | null;
  activity_factor: number | null;
  target_method: 'manual' | 'estimated';
}

export interface ProfileInput {
  height_cm: number | null;
  weight_kg: number | null;
  daily_calorie_target: number;
  age_years?: number | null;
  sex_for_equation?: 'male' | 'female' | null;
  activity_factor?: number | null;
  target_method?: 'manual' | 'estimated';
}

export interface MealSuggestion {
  suggestion: string;
  model: string;
  totalKcal: number | null;
  knownKcal: number | null;
  targetKcal: number;
  differenceKcal: number | null;
  confidence: 'estimated' | 'partial';
  unverifiedItems: UnverifiedItem[];
  meals: Meal[];
}

export interface UnverifiedItem { id: string; name: string; }

export interface MealIngredient {
  inventoryId: string;
  name: string;
  quantity: number;
  unit: string;
  kcal: number | null;
}

export interface Meal {
  name: string;
  mealSlot: string;
  ingredients: MealIngredient[];
  steps: string[];
}

export interface SavedMealPlan {
  id: string;
  plan_date: string;
  target_kcal: number;
  total_kcal: number;
  status: 'confirmed';
  meal_names: string[];
}

export interface SavedMealPlanDetail {
  id: string;
  plan_date: string;
  target_kcal: number;
  total_kcal: number;
  status: 'confirmed';
  meals: SavedMealPlanMeal[];
}

export interface SavedMealPlanMeal {
  line_no: number;
  meal_slot: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  servings: number;
  energy_snapshot: number;
  name: string;
  instructions: string | null;
  ingredients: SavedMealPlanIngredient[];
}

export interface SavedMealPlanIngredient {
  line_no: number;
  quantity: number;
  unit: string;
  food_name: string;
}

interface AuthResponse { user: Account; token: string; }
interface ApiError { message?: string; }

@Injectable({ providedIn: 'root' })
export class InventoryService {
  private readonly apiUrl = (window as Window & { __API_URL__?: string }).__API_URL__
    ?? `${window.location.protocol}//${window.location.hostname}:4000/api`;
  private readonly tokenKey = 'pantry_auth_token';

  getToken(): string | null { return localStorage.getItem(this.tokenKey); }
  async register(name: string, email: string, password: string): Promise<Account> {
    return this.authenticate('/auth/register', { name, email, password });
  }
  async login(email: string, password: string): Promise<Account> {
    return this.authenticate('/auth/login', { email, password });
  }
  me(): Promise<Account> { return this.request('/auth/me'); }
  updateProfile(profile: ProfileInput): Promise<Account> {
    return this.request('/auth/profile', { method: 'PATCH', body: JSON.stringify(profile) });
  }
  logout(): void { localStorage.removeItem(this.tokenKey); }
  list(): Promise<InventoryItem[]> { return this.request('/inventory'); }
  searchFoods(query: string): Promise<NutritionFood[]> { return this.request(`/foods?q=${encodeURIComponent(query)}`); }
  selectFood(sourceId: string): Promise<NutritionFood> { return this.request(`/foods/${encodeURIComponent(sourceId)}/select`, { method: 'POST' }); }
  create(item: InventoryInput): Promise<InventoryItem> {
    return this.request('/inventory', { method: 'POST', body: JSON.stringify(item) });
  }
  update(id: string, item: InventoryInput): Promise<InventoryItem> {
    return this.request(`/inventory/${id}`, { method: 'PATCH', body: JSON.stringify(item) });
  }
  remove(id: string): Promise<void> { return this.request(`/inventory/${id}`, { method: 'DELETE' }); }
  suggestMeals(): Promise<MealSuggestion> {
    return this.request('/meal-plans/suggestions', { method: 'POST' });
  }
  listMealPlans(): Promise<SavedMealPlan[]> { return this.request('/meal-plans'); }
  readMealPlan(id: string): Promise<SavedMealPlanDetail> { return this.request(`/meal-plans/${id}`); }
  saveMealPlan(planDate: string, meals: Meal[]): Promise<SavedMealPlan> {
    return this.request('/meal-plans', { method: 'POST', body: JSON.stringify({ plan_date: planDate, meals }) });
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${this.apiUrl}${path}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(this.getToken() ? { Authorization: `Bearer ${this.getToken()}` } : {}),
          ...options.headers,
        },
      });
    } catch {
      throw new Error('Không kết nối được máy chủ. Kiểm tra backend và kết nối mạng.');
    }
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as ApiError;
      throw new Error(payload.message || 'Yêu cầu chưa thực hiện được.');
    }
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }

  private async authenticate(path: string, body: Record<string, string>): Promise<Account> {
    const result = await this.request<AuthResponse>(path, { method: 'POST', body: JSON.stringify(body) });
    localStorage.setItem(this.tokenKey, result.token);
    return result.user;
  }
}
