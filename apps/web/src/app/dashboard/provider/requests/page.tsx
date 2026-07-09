'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '../../../../lib/api';
import { useProviderProfile } from '../../../../store/useProviderProfile';
import {
  ClipboardList, Search, Filter, ArrowRight, Tag, Car,
  Calendar, MessageSquare, Clock, CheckCircle2, XCircle, Inbox,
  Store, AlertCircle,
} from 'lucide-react';

interface Vehicle {
  id: string;
  marca: string;
  modelo: string;
  anio: number;
}

interface RequestItem {
  id: string;
  titulo: string;
  descripcion: string;
  categoria: string;
  estado: string;
  createdAt: string;
  user: { name: string; email?: string; phone?: string };
  vehicle?: Vehicle | null;
  aiParsed?: { pieza?: string; marca?: string; modelo?: string; anio?: number } | null;
  _count?: { quotes: number };
}

const STATUS_META: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  OPEN: { label: 'Abierta', icon: Clock, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
  IN_PROGRESS: { label: 'En progreso', icon: Inbox, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  CLOSED: { label: 'Cerrada', icon: CheckCircle2, color: 'text-zinc-400', bg: 'bg-zinc-500/10 border-zinc-500/20' },
  CANCELLED: { label: 'Cancelada', icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
};

export default function ProviderRequestsPage() {
  const { provider, loading: loadingProvider, error: providerError } = useProviderProfile();
  const [allRequests, setAllRequests] = useState<RequestItem[]>([]);
  const [myQuotesByRequest, setMyQuotesByRequest] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  useEffect(() => {
    if (loadingProvider) return;
    if (!provider) {
      setLoading(false);
      return;
    }
    const providerId = provider.id;
    let cancelled = false;
    async function load() {
      try {
        const [reqRes, quotesRes] = await Promise.all([
          api.get('/requests/all'),
          api.get(`/quotes/provider/${providerId}`),
        ]);
        if (cancelled) return;
        const all = (reqRes.data || []).filter((r: RequestItem) => r.categoria === 'REPUESTO');
        setAllRequests(all);
        const map: Record<string, string> = {};
        (quotesRes.data || []).forEach((q: any) => {
          map[q.requestId] = q.estado;
        });
        setMyQuotesByRequest(map);
      } catch (err) {
        console.error('Error fetching requests:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [provider, loadingProvider]);

  const filtered = useMemo(() => {
    return allRequests.filter((r) => {
      if (statusFilter !== 'ALL' && r.estado !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const haystack = `${r.titulo} ${r.descripcion} ${r.user.name} ${r.vehicle?.marca ?? ''} ${r.vehicle?.modelo ?? ''} ${r.aiParsed?.pieza ?? ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [allRequests, search, statusFilter]);

  if (loading || loadingProvider) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (providerError || !provider) {
    return (
      <div className="p-8 bg-red-950/20 border border-red-800/40 rounded-2xl text-center">
        <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
        <h3 className="font-bold text-zinc-200">No se pudo cargar el perfil del proveedor</h3>
        <p className="text-sm text-zinc-400 mt-1">{providerError || 'Verifica que tu cuenta esté vinculada a un proveedor activo.'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
          <ClipboardList className="w-6 h-6 text-indigo-400" />
          <span>Solicitudes de Repuestos</span>
        </h2>
        <p className="text-sm text-zinc-400">
          Estas son todas las solicitudes activas de clientes que buscan repuestos.
        </p>
      </div>

      <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título, pieza, cliente, vehículo..."
            className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-indigo-500 text-zinc-100 transition-colors text-sm"
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
            className="px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-indigo-500 text-zinc-200 text-xs font-semibold"
          >
            <option value="ALL">Todos</option>
            <option value="OPEN">Abierta</option>
            <option value="IN_PROGRESS">En progreso</option>
            <option value="CLOSED">Cerrada</option>
            <option value="CANCELLED">Cancelada</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="p-12 bg-zinc-900/30 border border-zinc-800/80 border-dashed rounded-3xl text-center">
          <div className="w-16 h-16 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-4 text-zinc-500">
            <Inbox className="w-8 h-8" />
          </div>
          {allRequests.length === 0 ? (
            <>
              <h3 className="font-bold text-zinc-300 text-base">No hay solicitudes de repuestos</h3>
              <p className="text-zinc-500 text-sm mt-1 max-w-sm mx-auto">
                Cuando los clientes publiquen solicitudes de repuestos, aparecerán aquí para que puedas cotizar.
              </p>
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
          {filtered.map((r) => {
            const statusMeta = STATUS_META[r.estado] || STATUS_META.OPEN;
            const StatusIcon = statusMeta.icon;
            const myQuoteStatus = myQuotesByRequest[r.id];
            return (
              <Link
                key={r.id}
                href={`/dashboard/provider/requests/${r.id}`}
                className="block p-5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-2xl transition-all group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider bg-indigo-500/10 border-indigo-500/20 text-indigo-400">
                        <Tag className="w-3 h-3" /> REPUESTO
                      </span>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${statusMeta.bg} ${statusMeta.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {statusMeta.label}
                      </span>
                      {myQuoteStatus && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 border-emerald-500/20 text-emerald-400">
                          <CheckCircle2 className="w-3 h-3" />
                          Cotizado: {myQuoteStatus === 'ACCEPTED' ? 'Aceptada' : myQuoteStatus === 'REJECTED' ? 'Rechazada' : 'Pendiente'}
                        </span>
                      )}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-zinc-100 group-hover:text-indigo-300 transition-colors">
                        {r.titulo}
                      </h3>
                      <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{r.descripcion}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-500">
                      <span className="inline-flex items-center gap-1 font-semibold text-zinc-300">
                        <Store className="w-3.5 h-3.5" />
                        {r.user.name}
                      </span>
                      {r.vehicle && (
                        <span className="inline-flex items-center gap-1">
                          <Car className="w-3.5 h-3.5" />
                          {r.vehicle.marca} {r.vehicle.modelo} {r.vehicle.anio}
                        </span>
                      )}
                      {r.aiParsed?.pieza && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-500/5 border border-indigo-500/10 rounded-lg text-indigo-300 font-semibold">
                          {r.aiParsed.pieza}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(r.createdAt).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MessageSquare className="w-3.5 h-3.5" />
                        {r._count?.quotes || 0} cotizaciones totales
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0 p-2 text-zinc-500 group-hover:text-indigo-400 transition-colors">
                    <ArrowRight className="w-5 h-5" />
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
