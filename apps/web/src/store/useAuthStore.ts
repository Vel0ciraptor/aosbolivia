import { create } from 'zustand';
import { api } from '../lib/api';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'CLIENT' | 'PROVIDER' | 'WORKSHOP' | 'TOW_SERVICE' | 'ADMIN';
  phone?: string;
  workshopUserRole?: string;
  workshopId?: string;
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

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  // Si hay token guardado, empezar en estado de carga para evitar que el
  // layout redirija a /login antes de que /auth/me responda (carrera).
  isLoading:
    typeof window !== 'undefined' && !!localStorage.getItem('accessToken'),
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
        workshopUserRole: p.workshopUserRole,
        workshopId: p.workshopId,
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
        workshopUserRole: p.workshopUserRole,
        workshopId: p.workshopId,
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
        set({ user: null, isAuthenticated: false, isLoading: false });
        return;
      }
      // Solo bloquear la UI al restaurar la sesión. Si ya hay usuario,
      // refrescar en segundo plano: poner isLoading=true desmontaría los
      // hijos del layout y entraría en bucle con los effects que llaman
      // checkAuth al montar (pantalla de carga infinita).
      if (!get().user) set({ isLoading: true });
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
          workshopUserRole: p.workshopUserRole,
          workshopId: p.workshopId,
        },
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err: any) {
      // Solo cerrar sesión si el servidor respondió 401 y no se pudo refrescar.
      // Errores transitorios (5xx, timeout, red) NO deben desloguear.
      const status = err.response?.status;
      if (status === 401 || status === 403) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        set({ user: null, isAuthenticated: false, isLoading: false });
      } else {
        // Mantener la sesión existente ante fallos temporales
        set({ isLoading: false });
      }
    }
  },
}));
