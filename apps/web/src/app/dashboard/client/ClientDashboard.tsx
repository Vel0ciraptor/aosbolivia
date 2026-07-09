'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '../../../lib/api';
import { Car, FileText, ArrowRight, Plus, Activity, ClipboardList, MessageSquare } from 'lucide-react';

interface Vehicle {
  id: string;
  marca: string;
  modelo: string;
  anio: number;
  placa?: string;
}

interface RequestItem {
  id: string;
  titulo: string;
  categoria: string;
  estado: string;
  createdAt: string;
  quotes?: any[];
}

export default function ClientDashboard() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [vehiclesRes, requestsRes] = await Promise.all([
          api.get('/vehicles'),
          api.get('/requests')
        ]);
        setVehicles(vehiclesRes.data);
        setRequests(requestsRes.data);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Card */}
      <div className="p-6 md:p-8 bg-gradient-to-r from-indigo-900/40 via-purple-900/20 to-zinc-900 border border-zinc-800 rounded-3xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-xl space-y-4">
          <h2 className="text-2xl md:text-3xl font-extrabold text-zinc-100">
            ¿Qué necesita tu vehículo hoy?
          </h2>
          <p className="text-zinc-400 text-sm md:text-base leading-relaxed">
            Escribe en lenguaje natural lo que le pasa a tu coche. Nuestra Inteligencia Artificial detectará si necesitas un repuesto específico, taller mecánico o servicio de grúa de manera inmediata.
          </p>
          <div className="pt-2">
            <Link
              href="/dashboard/client/new-request"
              className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-indigo-500 to-emerald-500 hover:from-indigo-600 hover:to-emerald-600 text-zinc-950 font-bold rounded-2xl transition-all hover:shadow-lg hover:shadow-indigo-500/10 transform active:scale-95"
            >
              <span>Crear Solicitud con IA</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">Mis Vehículos</span>
            <p className="text-3xl font-extrabold text-zinc-100">{vehicles.length}</p>
          </div>
          <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400">
            <Car className="w-6 h-6" />
          </div>
        </div>

        <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">Solicitudes Activas</span>
            <p className="text-3xl font-extrabold text-zinc-100">
              {requests.filter(r => r.estado === 'OPEN' || r.estado === 'IN_PROGRESS').length}
            </p>
          </div>
          <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400">
            <Activity className="w-6 h-6" />
          </div>
        </div>

        <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">Historial Total</span>
            <p className="text-3xl font-extrabold text-zinc-100">{requests.length}</p>
          </div>
          <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-400">
            <ClipboardList className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Grid: Vehicles & Recent Requests */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Vehicles */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-zinc-200 flex items-center gap-2">
              <Car className="w-5 h-5 text-indigo-400" />
              <span>Mis Vehículos</span>
            </h3>
            <Link
              href="/dashboard/client/vehicles"
              className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
            >
              <span>Gestionar</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {vehicles.length === 0 ? (
              <div className="p-8 bg-zinc-900/30 border border-zinc-800/80 border-dashed rounded-2xl text-center">
                <p className="text-zinc-500 text-sm">No tienes vehículos registrados</p>
                <Link
                  href="/dashboard/client/vehicles"
                  className="mt-3 inline-flex items-center gap-1.5 text-xs text-indigo-400 font-bold hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" /> Registrar vehículo
                </Link>
              </div>
            ) : (
              vehicles.slice(0, 3).map((v) => (
                <div key={v.id} className="p-4 bg-zinc-900 border border-zinc-800 hover:border-zinc-700/80 rounded-2xl flex items-center justify-between transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-400">
                      <Car className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-zinc-200 text-sm">{v.marca} {v.modelo}</h4>
                      <p className="text-xs text-zinc-500">Año: {v.anio} {v.placa ? `| Placa: ${v.placa}` : ''}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Requests */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-zinc-200 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-indigo-400" />
              <span>Solicitudes Recientes</span>
            </h3>
            <Link
              href="/dashboard/client/requests"
              className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
            >
              <span>Ver todas</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {requests.length === 0 ? (
              <div className="p-8 bg-zinc-900/30 border border-zinc-800/80 border-dashed rounded-2xl text-center">
                <p className="text-zinc-500 text-sm">No has realizado ninguna solicitud</p>
                <Link
                  href="/dashboard/client/new-request"
                  className="mt-3 inline-flex items-center gap-1.5 text-xs text-indigo-400 font-bold hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" /> Crear nueva solicitud
                </Link>
              </div>
            ) : (
              requests.slice(0, 3).map((r) => (
                <Link
                  key={r.id}
                  href={`/dashboard/client/requests/${r.id}`}
                  className="p-4 bg-zinc-900 border border-zinc-800 hover:border-zinc-700/80 rounded-2xl flex items-center justify-between transition-colors block"
                >
                  <div>
                    <h4 className="font-bold text-zinc-200 text-sm truncate max-w-xs">{r.titulo}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full uppercase font-bold tracking-wider">
                        {r.categoria}
                      </span>
                      <span className="text-xs text-zinc-500">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-zinc-500 flex items-center gap-1 bg-indigo-500/5 text-indigo-400 border border-indigo-500/10 px-2.5 py-1 rounded-xl">
                      <MessageSquare className="w-3.5 h-3.5" />
                      <strong>{r.quotes?.length || 0}</strong> cotizaciones
                    </span>
                    <ArrowRight className="w-4 h-4 text-zinc-500" />
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
