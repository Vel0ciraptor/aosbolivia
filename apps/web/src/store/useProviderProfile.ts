'use client';

import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export interface ProviderProfile {
  id: string;
  userId: string;
  nombre: string;
  telefono: string;
  email: string;
  direccion: string;
  latitud: number;
  longitud: number;
  estado: string;
  _count?: { parts: number; quotes: number };
}

export function useProviderProfile() {
  const [provider, setProvider] = useState<ProviderProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const res = await api.get('/providers/me');
        if (!cancelled) setProvider(res.data);
      } catch (err: any) {
        if (!cancelled) {
          console.error('Error loading provider profile:', err);
          setError(err.response?.data?.message || 'No se pudo cargar el perfil del proveedor');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return { provider, loading, error, reload: () => {
    setLoading(true);
    api.get('/providers/me').then(res => setProvider(res.data)).catch(err => {
      setError(err.response?.data?.message || 'No se pudo cargar el perfil del proveedor');
    }).finally(() => setLoading(false));
  } };
}
