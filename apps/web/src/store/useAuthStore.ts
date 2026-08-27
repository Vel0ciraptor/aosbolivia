import { create } from 'zustand';
import { api } from '../lib/api';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'CLIENT' | 'PROVIDER' | 'WORKSHOP' | 'TOW_SERVICE' | 'ADMIN';
  phone?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: any) => Promise<User>;
  register: (data: any) => Promise<User | null>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

function parseError(err: any, fallback: string): string {
  const msg = err.response?.data?.message;
  if (Array.isArray(msg)) return msg.join(', ');
  return msg || err.message || fallback;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post('/auth/login', {
        email: credentials.email,
        password: credentials.password,
      });

      const { accessToken, refreshToken } = res.data;
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);

      const profileRes = await api.get('/auth/me');
      const p = profileRes.data;

      const user: User = {
        id: p.id,
        email: p.email,
        name: p.name,
        role: p.role,
        phone: p.phone,
      };

      set({ user, isAuthenticated: true, isLoading: false });
      return user;
    } catch (err: any) {
      const msg = parseError(err, 'Error al iniciar sesión');
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  register: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post('/auth/register', {
        name: data.name,
        email: data.email,
        phone: data.phone || undefined,
        password: data.password,
        role: data.role,
      });

      const { accessToken, refreshToken } = res.data;
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);

      const profileRes = await api.get('/auth/me');
      const p = profileRes.data;

      const user: User = {
        id: p.id,
        email: p.email,
        name: p.name,
        role: p.role,
        phone: p.phone,
      };

      set({ user, isAuthenticated: true, isLoading: false });
      return user;
    } catch (err: any) {
      const msg = parseError(err, 'Error al registrarse');
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  logout: async () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    set({ user: null, isAuthenticated: false, error: null });
  },

  checkAuth: async () => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('accessToken');
    if (!token) {
      set({ user: null, isAuthenticated: false });
      return;
    }
    try {
      const res = await api.get('/auth/me');
      const p = res.data;
      set({
        user: {
          id: p.id,
          email: p.email,
          name: p.name,
          role: p.role,
          phone: p.phone,
        },
        isAuthenticated: true,
      });
    } catch {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      set({ user: null, isAuthenticated: false });
    }
  },
}));
