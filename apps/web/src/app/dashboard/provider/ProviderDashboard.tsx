'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '../../../lib/api';
import { useProviderProfile } from '../../../store/useProviderProfile';
import { ClipboardList, TrendingUp, CheckCircle2, ArrowRight, Package, Plus, Store, Building2 } from 'lucide-react';

interface Part {
  id: string;
  nombre: string;
  precio: string;
  stock: number;
  marca: string;
  modelo: string;
  estado: string;
}

interface RequestItem {
  id: string;
  titulo: string;
  descripcion: string;
  categoria: string;
  estado: string;
  createdAt: string;
  user: { name: string };
  vehicle?: { marca: string; modelo: string; anio: number } | null;
  _count?: { quotes: number };
}

export default function ProviderDashboard() {
  const { provider, loading: loadingProvider } = useProviderProfile();
  const [parts, setParts] = useState<Part[]>([]);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [quotesCount, setQuotesCount] = useState({ total: 0, accepted: 0, pending: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (loadingProvider) return;
    if (!provider) {
      setLoading(false);
      return;
    }
    const providerId = provider.id;

    let cancelled = false;
    async function fetchData() {
      try {
        const [partsRes, requestsRes, quotesRes] = await Promise.all([
          api.get(`/parts/provider/${providerId}`),
          api.get('/requests/all'),
          api.get(`/quotes/provider/${providerId}`),
        ]);

        if (cancelled) return;

        setParts(partsRes.data || []);

        const spareRequests = (requestsRes.data || []).filter(
          (r: RequestItem) => r.categoria === 'REPUESTO' && r.estado !== 'CANCELLED'
        );
        setRequests(spareRequests);

        const allQuotes = quotesRes.data || [];
        setQuotesCount({
          total: allQuotes.length,
          accepted: allQuotes.filter((q: any) => q.estado === 'ACCEPTED').length,
          pending: allQuotes.filter((q: any) => q.estado === 'PENDING').length,
        });
      } catch (err) {
        console.error('Error fetching provider dashboard data:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchData();
    return () => { cancelled = true; };
  }, [provider, loadingProvider]);

  if (loading || loadingProvider) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-indigo-400" />
            <span>{provider?.nombre || 'Mi Negocio'}</span>
          </h2>
          <p className="text-sm text-zinc-400">Gestiona tu catálogo de repuestos y responde a cotizaciones de clientes.</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/dashboard/provider/catalog/new"
            className="px-4 py-2.5 bg-zinc-900 border border-zinc-800 text-zinc-300 font-semibold text-sm rounded-xl hover:bg-zinc-800 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Repuesto</span>
          </Link>
          <Link
            href="/dashboard/provider/requests"
            className="px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-emerald-500 text-zinc-950 font-bold text-sm rounded-xl hover:shadow-lg transition-all flex items-center gap-2"
          >
            <ClipboardList className="w-4 h-4" />
            <span>Ver Solicitudes</span>
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="p-5 md:p-6 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-zinc-500 text-[10px] md:text-xs font-semibold uppercase tracking-wider">Mi Catálogo</span>
            <p className="text-2xl md:text-3xl font-extrabold text-zinc-100">{parts.length}</p>
          </div>
          <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400">
            <Package className="w-5 h-5 md:w-6 md:h-6" />
          </div>
        </div>

        <div className="p-5 md:p-6 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-zinc-500 text-[10px] md:text-xs font-semibold uppercase tracking-wider">Cotizaciones</span>
            <p className="text-2xl md:text-3xl font-extrabold text-zinc-100">{quotesCount.total}</p>
          </div>
          <div className="w-10 h-10 md:w-12 md:h-12 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-400">
            <TrendingUp className="w-5 h-5 md:w-6 md:h-6" />
          </div>
        </div>

        <div className="p-5 md:p-6 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-zinc-500 text-[10px] md:text-xs font-semibold uppercase tracking-wider">Aceptadas</span>
            <p className="text-2xl md:text-3xl font-extrabold text-emerald-400">{quotesCount.accepted}</p>
          </div>
          <div className="w-10 h-10 md:w-12 md:h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6" />
          </div>
        </div>

        <div className="p-5 md:p-6 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-zinc-500 text-[10px] md:text-xs font-semibold uppercase tracking-wider">Solicitudes</span>
            <p className="text-2xl md:text-3xl font-extrabold text-zinc-100">{requests.length}</p>
          </div>
          <div className="w-10 h-10 md:w-12 md:h-12 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-400">
            <ClipboardList className="w-5 h-5 md:w-6 md:h-6" />
          </div>
        </div>
      </div>

      {/* Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Incoming Requests */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-zinc-200 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-indigo-400" />
              <span>Solicitudes de Repuestos</span>
            </h3>
            <Link
              href="/dashboard/provider/requests"
              className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
            >
              <span>Ver todas</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {requests.length === 0 ? (
              <div className="p-8 bg-zinc-900/30 border border-zinc-800/80 border-dashed rounded-2xl text-center">
                <Store className="w-8 h-8 mx-auto text-zinc-600 mb-2" />
                <p className="text-zinc-500 text-sm">No hay solicitudes de repuestos activas</p>
                <p className="text-zinc-600 text-xs mt-1">Las nuevas solicitudes aparecerán aquí</p>
              </div>
            ) : (
              requests.slice(0, 3).map((r) => (
                <Link
                  key={r.id}
                  href={`/dashboard/provider/requests/${r.id}`}
                  className="p-4 bg-zinc-900 border border-zinc-800 hover:border-zinc-700/80 rounded-2xl flex items-center justify-between transition-colors block group"
                >
                  <div className="min-w-0 flex-1 pr-4">
                    <h4 className="font-bold text-zinc-200 text-sm truncate group-hover:text-indigo-300 transition-colors">{r.titulo}</h4>
                    <p className="text-xs text-zinc-500 truncate mt-0.5">{r.descripcion}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className="text-[10px] text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-full font-semibold">
                        {r.user.name}
                      </span>
                      {r.vehicle && (
                        <span className="text-[10px] text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full font-semibold">
                          {r.vehicle.marca} {r.vehicle.modelo} {r.vehicle.anio}
                        </span>
                      )}
                      <span className="text-[10px] text-zinc-500">
                        {new Date(r.createdAt).toLocaleDateString('es-VE', { day: '2-digit', month: 'short' })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-indigo-400 bg-indigo-500/5 px-2 py-1 rounded-lg border border-indigo-500/10 font-semibold">
                      {r._count?.quotes || 0} cotiz.
                    </span>
                    <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-indigo-400 transition-colors" />
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Catalog Preview */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-zinc-200 flex items-center gap-2">
              <Package className="w-5 h-5 text-indigo-400" />
              <span>Mi Catálogo</span>
            </h3>
            <Link
              href="/dashboard/provider/catalog"
              className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
            >
              <span>Gestionar</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {parts.length === 0 ? (
              <div className="p-8 bg-zinc-900/30 border border-zinc-800/80 border-dashed rounded-2xl text-center">
                <Package className="w-8 h-8 mx-auto text-zinc-600 mb-2" />
                <p className="text-zinc-500 text-sm">Tu catálogo está vacío</p>
                <Link
                  href="/dashboard/provider/catalog/new"
                  className="mt-3 inline-flex items-center gap-1 text-xs text-indigo-400 font-bold hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" /> Agregar primer repuesto
                </Link>
              </div>
            ) : (
              parts.slice(0, 3).map((p) => (
                <div key={p.id} className="p-4 bg-zinc-900 border border-zinc-800 hover:border-zinc-700/80 rounded-2xl flex items-center justify-between transition-colors">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-zinc-200 text-sm truncate">{p.nombre}</h4>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {p.marca} {p.modelo} · Stock: <strong className="text-zinc-400">{p.stock}</strong>
                    </p>
                  </div>
                  <span className="text-base font-extrabold text-emerald-400 font-mono">
                    ${parseFloat(p.precio).toFixed(2)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
