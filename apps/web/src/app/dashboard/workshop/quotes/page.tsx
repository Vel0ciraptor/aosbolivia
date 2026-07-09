'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '../../../../lib/api';
import { useWorkshopProfile } from '../../../../store/useWorkshopProfile';
import {
  Send, Search, Filter, Calendar, CheckCircle2,
  XCircle, Clock, ArrowRight, Inbox, AlertCircle, User as UserIcon,
  Car, FileText,
} from 'lucide-react';

interface Vehicle {
  id: string;
  marca: string;
  modelo: string;
  anio: number;
}

interface RequestLite {
  id: string;
  titulo: string;
  estado: string;
  user: { name: string; phone?: string };
  vehicle?: Vehicle | null;
}

interface Quote {
  id: string;
  precio: number | string;
  comentario?: string;
  tiempoEntrega?: string;
  estado: string;
  createdAt: string;
  request: RequestLite;
}

const STATUS_META: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  PENDING: { label: 'Pendiente', icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
  ACCEPTED: { label: 'Aceptada', icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  REJECTED: { label: 'Rechazada', icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
  EXPIRED: { label: 'Expirada', icon: Clock, color: 'text-zinc-500', bg: 'bg-zinc-500/10 border-zinc-500/20' },
};

export default function WorkshopMyQuotesPage() {
  const { workshop, loading: loadingWorkshop, error: workshopError } = useWorkshopProfile();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  useEffect(() => {
    if (loadingWorkshop) return;
    if (!workshop) {
      setLoading(false);
      return;
    }
    const workshopId = workshop.id;
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const res = await api.get(`/quotes/workshop/${workshopId}`);
        if (!cancelled) setQuotes(res.data || []);
      } catch (err) {
        console.error('Error fetching workshop quotes:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [workshop, loadingWorkshop]);

  const filtered = useMemo(() => {
    return quotes.filter((q) => {
      if (statusFilter !== 'ALL' && q.estado !== statusFilter) return false;
      if (search.trim()) {
        const q2 = search.toLowerCase();
        const haystack = `${q.request.titulo} ${q.request.user.name} ${q.request.vehicle?.marca ?? ''} ${q.request.vehicle?.modelo ?? ''} ${q.comentario ?? ''}`.toLowerCase();
        if (!haystack.includes(q2)) return false;
      }
      return true;
    });
  }, [quotes, search, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: quotes.length,
      pending: quotes.filter((q) => q.estado === 'PENDING').length,
      accepted: quotes.filter((q) => q.estado === 'ACCEPTED').length,
      rejected: quotes.filter((q) => q.estado === 'REJECTED').length,
    };
  }, [quotes]);

  if (loading || loadingWorkshop) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (workshopError || !workshop) {
    return (
      <div className="p-8 bg-red-950/20 border border-red-800/40 rounded-2xl text-center">
        <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
        <h3 className="font-bold text-zinc-200">No se pudo cargar el perfil del taller</h3>
        <p className="text-sm text-zinc-400 mt-1">{workshopError}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
          <Send className="w-6 h-6 text-emerald-400" />
          <span>Mis Cotizaciones</span>
        </h2>
        <p className="text-sm text-zinc-400">
          Historial de cotizaciones que has enviado a clientes.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl">
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Total</p>
          <p className="text-2xl font-extrabold text-zinc-100 mt-1">{stats.total}</p>
        </div>
        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl">
          <p className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">Pendientes</p>
          <p className="text-2xl font-extrabold text-zinc-100 mt-1">{stats.pending}</p>
        </div>
        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl">
          <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Aceptadas</p>
          <p className="text-2xl font-extrabold text-emerald-400 mt-1">{stats.accepted}</p>
        </div>
        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl">
          <p className="text-[10px] text-red-400 font-bold uppercase tracking-wider">Rechazadas</p>
          <p className="text-2xl font-extrabold text-zinc-100 mt-1">{stats.rejected}</p>
        </div>
      </div>

      <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por solicitud, cliente, vehículo..."
            className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-emerald-500 text-zinc-100 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-zinc-500 text-xs font-semibold">
            <Filter className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Estado:</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-emerald-500 text-zinc-200 text-xs font-semibold"
          >
            <option value="ALL">Todos</option>
            <option value="PENDING">Pendiente</option>
            <option value="ACCEPTED">Aceptada</option>
            <option value="REJECTED">Rechazada</option>
            <option value="EXPIRED">Expirada</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="p-12 bg-zinc-900/30 border border-zinc-800/80 border-dashed rounded-3xl text-center">
          <div className="w-16 h-16 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-4 text-zinc-500">
            <Inbox className="w-8 h-8" />
          </div>
          {quotes.length === 0 ? (
            <>
              <h3 className="font-bold text-zinc-300 text-base">Aún no has enviado cotizaciones</h3>
              <p className="text-zinc-500 text-sm mt-1 max-w-sm mx-auto">
                Explora las solicitudes de taller y envía tu primera cotización.
              </p>
              <Link
                href="/dashboard/workshop/requests"
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 font-semibold border border-zinc-800 rounded-xl transition-colors text-sm"
              >
                Ver solicitudes
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </>
          ) : (
            <>
              <h3 className="font-bold text-zinc-300 text-base">Sin resultados</h3>
              <p className="text-zinc-500 text-sm mt-1">Intenta con otros filtros o términos de búsqueda.</p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((q) => {
            const statusMeta = STATUS_META[q.estado] || STATUS_META.PENDING;
            const StatusIcon = statusMeta.icon;
            const precioNum = typeof q.precio === 'string' ? parseFloat(q.precio) : q.precio;
            return (
              <Link
                key={q.id}
                href={`/dashboard/workshop/requests/${q.request.id}`}
                className="block p-5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-2xl transition-all group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${statusMeta.bg} ${statusMeta.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {statusMeta.label}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-zinc-100 group-hover:text-emerald-300 transition-colors flex items-center gap-2">
                        <FileText className="w-4 h-4 text-zinc-500" />
                        {q.request.titulo}
                      </h3>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-500">
                      <span className="inline-flex items-center gap-1 font-semibold text-zinc-300">
                        <UserIcon className="w-3.5 h-3.5" />
                        {q.request.user.name}
                      </span>
                      {q.request.vehicle && (
                        <span className="inline-flex items-center gap-1">
                          <Car className="w-3.5 h-3.5" />
                          {q.request.vehicle.marca} {q.request.vehicle.modelo} {q.request.vehicle.anio}
                        </span>
                      )}
                      {q.tiempoEntrega && (
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          Entrega: {q.tiempoEntrega}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(q.createdAt).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    {q.comentario && (
                      <p className="text-xs text-zinc-400 italic border-l-2 border-zinc-800 pl-3 line-clamp-1">
                        &ldquo;{q.comentario}&rdquo;
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Mi precio</p>
                    <p className="text-2xl font-extrabold text-emerald-400 font-mono">${precioNum.toFixed(2)}</p>
                    <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-emerald-400 transition-colors ml-auto mt-1" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
