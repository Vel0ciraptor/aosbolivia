import { create } from 'zustand';
import { insforge } from '../lib/insforge';

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
  register: (data: any) => Promise<User | null>; // Returns null if email confirmation is required
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await insforge.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) throw error;
      if (!data.user) throw new Error('No user returned');

      let { data: profileData, error: profileError } = await insforge.database
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (profileError && profileError.code === 'PGRST116') {
        const { data: newProfile, error: insertError } = await insforge.database.from('profiles').insert([{
          id: data.user.id,
          name: data.user.profile?.name || 'Usuario',
          role: 'CLIENT',
        }]).select().single();
        
        if (insertError) throw insertError;
        profileData = newProfile;
      } else if (profileError) {
        throw profileError;
      }

      const user: User = {
        id: data.user.id,
        email: data.user.email!,
        name: profileData.name,
        role: profileData.role,
        phone: profileData.phone,
      };

      set({
        user,
        isAuthenticated: true,
        isLoading: false,
      });
      return user;
    } catch (err: any) {
      const msg = err.message || 'Error al iniciar sesión';
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  register: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const { data: authData, error: authError } = await insforge.auth.signUp({
        email: data.email,
        password: data.password,
        name: data.name,
      });

      if (authError) throw authError;
      
      if (!authData.accessToken) {
        set({ isLoading: false });
        return null; 
      }

      const { error: profileError } = await insforge.database.from('profiles').insert([{
        id: authData.user!.id,
        name: data.name,
        role: data.role,
        phone: data.phone || null,
      }]);

      if (profileError && profileError.code !== '23505') {
        throw profileError;
      }

      const user: User = {
        id: authData.user!.id,
        email: authData.user!.email!,
        name: data.name,
        role: data.role,
        phone: data.phone,
      };

      set({
        user,
        isAuthenticated: true,
        isLoading: false,
      });
      return user;
    } catch (err: any) {
      const msg = err.message || 'Error al registrarse';
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  logout: async () => {
    await insforge.auth.signOut();
    set({
      user: null,
      isAuthenticated: false,
      error: null,
    });
  },

  checkAuth: async () => {
    if (typeof window === 'undefined') return;
    try {
      const { data, error } = await insforge.auth.getCurrentUser();
      
      if (error || !data.user) {
        set({
          user: null,
          isAuthenticated: false,
        });
        return;
      }

      let { data: profileData, error: profileError } = await insforge.database
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (profileError && profileError.code === 'PGRST116') {
        const { data: newProfile, error: insertError } = await insforge.database.from('profiles').insert([{
          id: data.user.id,
          name: data.user.profile?.name || 'Usuario',
          role: 'CLIENT',
        }]).select().single();
        
        if (!insertError) profileData = newProfile;
      }

      if (profileData) {
        const user: User = {
          id: data.user.id,
          email: data.user.email!,
          name: profileData.name,
          role: profileData.role,
          phone: profileData.phone,
        };

        set({
          user,
          isAuthenticated: true,
        });
      }
    } catch (error) {
      console.error('Error checking auth status', error);
      set({
        user: null,
        isAuthenticated: false,
      });
    }
  },
}));
