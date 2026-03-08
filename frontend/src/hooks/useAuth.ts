import { useState, useEffect } from 'react';
import { authService } from '../services/auth.service';
import type { User } from '../services/api';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(authService.getCurrentUser());
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(authService.isAuthenticated());

  useEffect(() => {
    const localUser = authService.getCurrentUser();
    const authenticated = authService.isAuthenticated();
    setUser(localUser);
    setIsAuthenticated(authenticated);

    // Refresh profile from backend to keep data fresh
    if (authenticated) {
      authService.getProfile()
        .then(freshUser => {
          if (freshUser) {
            // Merge fresh data and persist
            const merged = { ...localUser, ...freshUser };
            localStorage.setItem('user', JSON.stringify(merged));
            setUser(merged as User);
          }
        })
        .catch(() => { }); // Silently fail - use cached data
    }

    // Listen for localStorage changes (e.g. token removed by 401 handler or another tab)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'access_token' || e.key === 'user' || e.key === null) {
        const updatedUser = authService.getCurrentUser();
        const updatedAuth = authService.isAuthenticated();
        setUser(updatedUser);
        setIsAuthenticated(updatedAuth);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const res = await authService.login({ email, password });
      setUser(res.user);
      setIsAuthenticated(true);
      return res;
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, password: string, fullName: string, role: string) => {
    setLoading(true);
    try {
      const res = await authService.register({ email, password, full_name: fullName, role });
      setUser(res.user);
      setIsAuthenticated(true);
      return res;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    setIsAuthenticated(false);
  };

  const hasRole = (role: string) => user?.role === role;

  return { user, loading, isAuthenticated, login, register, logout, hasRole };
};
