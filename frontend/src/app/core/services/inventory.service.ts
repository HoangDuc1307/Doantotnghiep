import { Injectable } from '@angular/core';

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  expiry_date: string | null;
  created_at: string;
}

export interface InventoryInput {
  name: string;
  quantity: number;
  unit: string;
  expiry_date: string | null;
}

export interface Account {
  id: string;
  name: string;
  email: string;
  height_cm: number | null;
  weight_kg: number | null;
  daily_calorie_target: number | null;
}

export interface ProfileInput {
  height_cm: number | null;
  weight_kg: number | null;
  daily_calorie_target: number;
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
  create(item: InventoryInput): Promise<InventoryItem> {
    return this.request('/inventory', { method: 'POST', body: JSON.stringify(item) });
  }
  update(id: string, item: InventoryInput): Promise<InventoryItem> {
    return this.request(`/inventory/${id}`, { method: 'PATCH', body: JSON.stringify(item) });
  }
  remove(id: string): Promise<void> { return this.request(`/inventory/${id}`, { method: 'DELETE' }); }

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
