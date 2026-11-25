'use client';

import { useEffect, useCallback } from 'react';
import { create } from 'zustand';
import { api } from '../lib/api';
import { useAuthStore } from './useAuthStore';

export interface WorkshopService {
  id: string;
  nombre: string;
  descripcion?: string;
  precioReferencial?: string | number;
  createdAt: string;
}

export interface WeeklyPattern {
  dias?: number[];
  rangos?: { inicio: string; fin: string }[];
  slotMinutes?: number;
  horizonteDias?: number;
  generadoHasta?: string;
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
  colorPrimario?: string;
  trabajoTags?: string[];
  pdfModoServicioHoras?: 'DESGLOSADO' | 'COMBINADO';
  horario?: WeeklyPattern | null;
  capacidadSlot?: number;
  services: WorkshopService[];
}

interface WorkshopProfileState {
  workshop: WorkshopProfile | null;
  loading: boolean;
  error: string | null;
  loadedForKey: string | null;
  fetchProfile: (userKey: string, force?: boolean) => Promise<void>;
  reset: () => void;
}

let inFlightKey: string | null = null;
let inFlightPromise: Promise<void> | null = null;

export const useWorkshopProfileStore = create<WorkshopProfileState>((set, get) => ({
  workshop: null,
  loading: false,
  error: null,
  loadedForKey: null,

  fetchProfile: async (userKey: string, force = false) => {
    const state = get();
    if (!force && state.loadedForKey === userKey && state.workshop) {
      return;
    }
    if (!force && inFlightPromise && inFlightKey === userKey) {
      return inFlightPromise;
    }

    const showSpinner = force || !state.workshop || state.loadedForKey !== userKey;
    if (showSpinner) {
      set({ loading: true, error: null });
    }

    inFlightKey = userKey;
    const promise: Promise<void> = (async () => {
      try {
        const res = await api.get('/workshops/me');
        set({
          workshop: res.data,
          error: null,
          loading: false,
          loadedForKey: userKey,
        });
      } catch (err: any) {
        console.error('Error loading workshop profile:', err);
        set({
          error: err.response?.data?.message || 'No se pudo cargar el perfil del taller',
          loading: false,
          loadedForKey: userKey,
        });
      } finally {
        if (inFlightKey === userKey) {
          inFlightPromise = null;
          inFlightKey = null;
        }
      }
    })();

    inFlightPromise = promise;
    return promise;
  },

  reset: () => {
    inFlightPromise = null;
    inFlightKey = null;
    set({ workshop: null, loading: false, error: null, loadedForKey: null });
  },
}));

/**
 * Perfil del taller cacheado en Zustand para evitar llamadas repetidas a
 * `GET /workshops/me` al navegar entre pantallas del taller.
 */
export function useWorkshopProfile() {
  const user = useAuthStore((s) => s.user);
  const { workshop, loading, error, loadedForKey, fetchProfile, reset } =
    useWorkshopProfileStore();

  const userKey = user ? `${user.id}:${user.workshopId || ''}` : null;

  useEffect(() => {
    if (!userKey) {
      if (loadedForKey !== null || workshop !== null) {
        reset();
      }
      return;
    }
    if (loadedForKey !== userKey) {
      fetchProfile(userKey, false);
    }
  }, [userKey, loadedForKey, workshop, fetchProfile, reset]);

  const reload = useCallback(async () => {
    if (!userKey) return;
    await fetchProfile(userKey, true);
  }, [userKey, fetchProfile]);

  const effectiveLoading =
    loading || (!!userKey && loadedForKey !== userKey && !workshop && !error);

  return { workshop, loading: effectiveLoading, error, reload };
}
