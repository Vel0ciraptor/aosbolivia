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

      // Fetch profile
      let { data: profileData, error: profileError } = await insforge.database
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (profileError && profileError.code === 'PGRST116') {
        // Profile doesn't exist, create it from metadata
        const { data: newProfile, error: insertError } = await insforge.database.from('profiles').insert([{
          id: data.user.id,
          name: data.user.user_metadata?.name || 'Usuario',
          role: data.user.user_metadata?.role || 'CLIENT',
          phone: data.user.user_metadata?.phone || null,
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
        redirectTo: `${window.location.origin}/login`,
      });

      if (authError) throw authError;
      
      // If session is null, email confirmation is required.
      if (!authData.session) {
        set({ isLoading: false });
        return null; 
      }

      // If session is returned immediately (email confirmation off), create profile in DB
      const { error: profileError } = await insforge.database.from('profiles').insert([{
        id: authData.user!.id,
        name: data.name,
        role: data.role,
        phone: data.phone || null,
      }]);

      if (profileError && profileError.code !== '23505') {
        // Ignore duplicate key (profile already exists), throw any other error
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
      const { data: { session } } = await insforge.auth.getSession();
      
      if (session?.user) {
        // Fetch profile
        let { data: profileData, error: profileError } = await insforge.database
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profileError && profileError.code === 'PGRST116') {
          // Profile doesn't exist, create it from metadata
          const { data: newProfile, error: insertError } = await insforge.database.from('profiles').insert([{
            id: session.user.id,
            name: session.user.user_metadata?.name || 'Usuario',
            role: session.user.user_metadata?.role || 'CLIENT',
            phone: session.user.user_metadata?.phone || null,
          }]).select().single();
          
          if (!insertError) profileData = newProfile;
        }

        if (profileData) {
          const user: User = {
            id: session.user.id,
            email: session.user.email!,
            name: profileData.name,
            role: profileData.role,
            phone: profileData.phone,
          };

          set({
            user,
            isAuthenticated: true,
          });
        }
      } else {
        set({
          user: null,
          isAuthenticated: false,
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
