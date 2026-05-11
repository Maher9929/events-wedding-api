import { apiService, type AuthResponse, type User } from './api';

export type { User };

export const authService = {
  async register(data: { email: string; password: string; full_name: string; role: string }): Promise<AuthResponse> {
    const res = await apiService.post<AuthResponse>('/users/register', data);
    // Token is stored as HttpOnly cookie by the backend — never in localStorage
    if (res.user) {
      localStorage.setItem('user', JSON.stringify(res.user));
    }
    return res;
  },

  async login(data: { email: string; password: string }): Promise<AuthResponse> {
    const res = await apiService.post<AuthResponse>('/users/login', data);
    // Token is stored as HttpOnly cookie by the backend — never in localStorage
    if (res.user) {
      localStorage.setItem('user', JSON.stringify(res.user));
    }
    return res;
  },

  logout(): void {
    // Notify backend to blacklist token & clear HttpOnly cookie
    apiService.post('/users/logout', {}).catch(() => { /* non-critical */ });
    localStorage.removeItem('user');
    window.location.href = '/';
  },

  async getProfile(): Promise<User> {
    return apiService.get<User>('/users/profile');
  },

  async updateProfile(data: Partial<User>): Promise<User> {
    const updated = await apiService.patch<User>('/users/profile', data);
    const current = this.getCurrentUser();
    if (current) {
      const merged = { ...current, ...updated };
      localStorage.setItem('user', JSON.stringify(merged));
    }
    return updated;
  },

  isAuthenticated(): boolean {
    // Token lives in HttpOnly cookie (JS can't read it) — check user profile instead
    return !!localStorage.getItem('user');
  },

  getCurrentUser(): User | null {
    const s = localStorage.getItem('user');
    return s ? JSON.parse(s) : null;
  },

  getToken(): string | null {
    // Token is in HttpOnly cookie — not accessible from JS (secure by design)
    return null;
  },

  hasRole(role: string): boolean {
    return this.getCurrentUser()?.role === role;
  },
};
