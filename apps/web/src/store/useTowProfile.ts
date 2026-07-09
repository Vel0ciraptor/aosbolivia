'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api';

export interface TowProfile {
  id: string;
  userId: string;
  nombre: string;
  telefono: string;
  direccion: string;
  latitud: number;
  longitud: number;
  costoBase: string | number;
  costoKm: string | number;
  cobertura: number;
  estado: string;
  horario?: Record<string, string> | null;
}

export function useTowProfile() {
  const [tow, setTow] = useState<TowProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/tows/me');
      setTow(res.data);
      setError(null);
    } catch (err: any) {
      console.error('Error loading tow profile:', err);
      setError(err.response?.data?.message || 'No se pudo cargar el perfil del servicio de grúa');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        setLoading(true);
        const res = await api.get('/tows/me');
        if (!cancelled) {
          setTow(res.data);
          setError(null);
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error('Error loading tow profile:', err);
          setError(err.response?.data?.message || 'No se pudo cargar el perfil del servicio de grúa');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => { cancelled = true; };
  }, []);

  return { tow, loading, error, reload: load };
}
