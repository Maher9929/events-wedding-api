import { apiService, type AuthResponse, type User } from './api';

export type { User };

export const authService = {
  async register(data: { email: string; password: string; full_name: string; role: string }): Promise<AuthResponse> {
    const res = await apiService.post<AuthResponse>('/users/register', data);
    if (res.access_token) {
      localStorage.setItem('access_token', res.access_token);
      localStorage.setItem('user', JSON.stringify(res.user));
    }
    return res;
  },

  async login(data: { email: string; password: string }): Promise<AuthResponse> {
    const res = await apiService.post<AuthResponse>('/users/login', data);
    if (res.access_token) {
      localStorage.setItem('access_token', res.access_token);
      localStorage.setItem('user', JSON.stringify(res.user));
    }
    return res;
  },

  logout(): void {
    // Notify backend to blacklist the token (fire-and-forget)
    const token = localStorage.getItem('access_token');
    if (token) {
      apiService.post('/users/logout', {}).catch(() => { /* non-critical */ });
    }
    localStorage.removeItem('access_token');
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
    return !!(localStorage.getItem('access_token') && localStorage.getItem('user'));
  },

  getCurrentUser(): User | null {
    const s = localStorage.getItem('user');
    return s ? JSON.parse(s) : null;
  },

  getToken(): string | null {
    return localStorage.getItem('access_token');
  },

  hasRole(role: string): boolean {
    return this.getCurrentUser()?.role === role;
  },
};
