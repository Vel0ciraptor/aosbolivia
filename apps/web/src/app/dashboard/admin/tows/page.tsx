'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '../../../../lib/api';
import {
  Truck, Search, CheckCircle2, XCircle, Clock, AlertCircle,
  RefreshCw, ChevronRight, DollarSign, Compass,
} from 'lucide-react';

interface TowRow {
  id: string;
  nombre: string;
  telefono: string;
  direccion: string;
  costoBase: number | string;
  costoKm: number | string;
  cobertura: number | string;
  estado: string;
  createdAt: string;
  user: { id: string; name: string; email: string; status: string };
}

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  ACTIVE: { label: 'Activo', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', icon: CheckCircle2 },
  INACTIVE: { label: 'Inactivo', color: 'text-zinc-400', bg: 'bg-zinc-500/10 border-zinc-500/20', icon: Clock },
  PENDING_REVIEW: { label: 'En revisión', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', icon: Clock },
};

export default function AdminTowsPage() {
  const [tows, setTows] = useState<TowRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [actionId, setActionId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/tows');
      setTows(res.data || []);
    } catch (err) {
      console.error('Error fetching tows:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = useMemo(() => {
    return tows.filter((t) => {
      if (statusFilter !== 'ALL' && t.estado !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const haystack = `${t.nombre} ${t.user.name} ${t.direccion}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [tows, search, statusFilter]);

  const stats = useMemo(() => ({
    total: tows.length,
    active: tows.filter((t) => t.estado === 'ACTIVE').length,
  }), [tows]);

  const handleToggleStatus = async (t: TowRow) => {
    const next = t.estado === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    if (!confirm(`¿Cambiar estado de "${t.nombre}" a ${next}?`)) return;
    try {
      setActionId(t.id);
      await api.patch(`/admin/tows/${t.id}/status`, { estado: next });
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'No se pudo cambiar el estado.');
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
            <Truck className="w-6 h-6 text-rose-400" />
            <span>Gestión de Grúas</span>
          </h2>
          <p className="text-sm text-zinc-400">Administra los servicios de grúas y remolques.</p>
        </div>
        <button
          onClick={fetchData}
          className="px-3 py-2.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 rounded-xl text-zinc-300 transition-colors flex items-center gap-2 text-sm"
        >
          <RefreshCw className="w-4 h-4" /> Recargar
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl">
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Total</p>
          <p className="text-2xl font-extrabold text-zinc-100 mt-1">{stats.total}</p>
        </div>
        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl">
          <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Activos</p>
          <p className="text-2xl font-extrabold text-emerald-400 mt-1">{stats.active}</p>
        </div>
      </div>

      <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, operador, dirección..."
            className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-rose-500 text-zinc-100 text-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-200 text-xs font-semibold"
        >
          <option value="ALL">Todos</option>
          <option value="ACTIVE">Activo</option>
          <option value="INACTIVE">Inactivo</option>
          <option value="PENDING_REVIEW">En revisión</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 bg-zinc-900/30 border border-zinc-800/80 border-dashed rounded-3xl text-center">
          <div className="w-16 h-16 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-4 text-zinc-500">
            <Truck className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-zinc-300 text-base">Sin resultados</h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((t) => {
            const statusMeta = STATUS_META[t.estado] || STATUS_META.ACTIVE;
            const StatusIcon = statusMeta.icon;
            return (
              <div key={t.id} className="p-5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-2xl flex flex-col gap-3 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-zinc-200 text-sm truncate">{t.nombre}</p>
                      <span className={`inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-wider ${statusMeta.bg} ${statusMeta.color}`}>
                        <StatusIcon className="w-2.5 h-2.5" /> {statusMeta.label}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-500 truncate">{t.user.name}</p>
                    <p className="text-[10px] text-zinc-600 truncate mt-0.5">{t.direccion}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-800/60 text-[10px]">
                  <div>
                    <p className="text-zinc-500">Tarifa base</p>
                    <p className="text-zinc-200 font-mono font-bold">${Number(t.costoBase).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-zinc-500">Por km</p>
                    <p className="text-zinc-200 font-mono font-bold">${Number(t.costoKm).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-zinc-500">Cobertura</p>
                    <p className="text-zinc-200 font-bold">{Number(t.cobertura).toFixed(0)} km</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 pt-1">
                  <Link
                    href={`/dashboard/admin/users/${t.user.id}`}
                    className="flex-1 px-3 py-1.5 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-[10px] font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5"
                  >
                    Ver usuario <ChevronRight className="w-3 h-3" />
                  </Link>
                  <button
                    onClick={() => handleToggleStatus(t)}
                    disabled={actionId === t.id}
                    className={`flex-1 px-3 py-1.5 text-[10px] font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-30 ${
                      t.estado === 'ACTIVE'
                        ? 'bg-zinc-950 hover:bg-red-950/30 border border-zinc-800 hover:border-red-900/30 text-zinc-400 hover:text-red-400'
                        : 'bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300'
                    }`}
                  >
                    {t.estado === 'ACTIVE' ? 'Suspender' : 'Activar'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
