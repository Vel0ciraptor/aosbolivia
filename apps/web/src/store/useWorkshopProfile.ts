'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api';

export interface WorkshopService {
  id: string;
  nombre: string;
  descripcion?: string;
  precioReferencial?: string | number;
  createdAt: string;
}

export interface WorkshopProfile {
  id: string;
  userId: string;
  nombre: string;
  descripcion?: string;
  telefono: string;
  direccion: string;
  latitud: number;
  longitud: number;
  estado: string;
  imageUrl?: string;
  horario?: Record<string, string> | null;
  services: WorkshopService[];
}

export function useWorkshopProfile() {
  const [workshop, setWorkshop] = useState<WorkshopProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/workshops/me');
      setWorkshop(res.data);
      setError(null);
    } catch (err: any) {
      console.error('Error loading workshop profile:', err);
      setError(err.response?.data?.message || 'No se pudo cargar el perfil del taller');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        setLoading(true);
        const res = await api.get('/workshops/me');
        if (!cancelled) {
          setWorkshop(res.data);
          setError(null);
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error('Error loading workshop profile:', err);
          setError(err.response?.data?.message || 'No se pudo cargar el perfil del taller');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => { cancelled = true; };
  }, []);

  return { workshop, loading, error, reload: load };
}
