'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '../../../../lib/api';
import {
  Activity, Car, ArrowRight, Loader2, AlertCircle, Building2,
  CheckCircle2, Clock,
} from 'lucide-react';
import { PHASES, PHASE_INDEX, PHASE_META } from './phases';

interface MyJob {
  id: string;
  estado: string;
  marca: string;
  modelo: string;
  anio: number;
  placa?: string;
  problema?: string;
  workshop?: { id: string; nombre: string; direccion?: string };
  request?: { id: string; titulo: string };
  createdAt: string;
  updatedAt: string;
}

export default function ClientTrackingPage() {
  const [jobs, setJobs] = useState<MyJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get('/my/jobs')
      .then((res) => setJobs(res.data || []))
      .catch((err) =>
        setError(err.response?.data?.message || 'No se pudo cargar el seguimiento.')
      )
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 bg-red-950/20 border border-red-800/40 rounded-2xl text-center">
        <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
        <h3 className="font-bold text-zinc-200">No se pudo cargar el seguimiento</h3>
        <p className="text-sm text-zinc-400 mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
          <Activity className="w-6 h-6 text-brand-400" />
          Seguimiento de Vehículos
        </h2>
        <p className="text-sm text-zinc-400">
          Sigue paso a paso las fases por las que pasa tu vehículo en el taller y revisa sus fotos.
        </p>
      </div>

      {jobs.length === 0 ? (
        <div className="p-12 bg-zinc-900/30 border border-zinc-800/80 border-dashed rounded-3xl text-center">
          <div className="w-16 h-16 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-4 text-zinc-500">
            <Car className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-zinc-300 text-base">Ningún vehículo en taller</h3>
          <p className="text-zinc-500 text-sm mt-1 max-w-sm mx-auto">
            Cuando dejes un vehículo en un taller aceptando una solicitud o cotización, verás aquí su progreso en tiempo real.
          </p>
          <Link
            href="/dashboard/client/new-request"
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 font-semibold border border-zinc-800 rounded-xl transition-colors text-sm"
          >
            Crear una solicitud
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => {
            const meta = PHASE_META[job.estado] || PHASE_META.INGRESANDO;
            const idx = PHASE_INDEX[job.estado] ?? 0;
            const total = PHASES.length;
            return (
              <Link
                key={job.id}
                href={`/dashboard/client/tracking/${job.id}`}
                className="block p-5 bg-zinc-900 border border-zinc-800 hover:border-brand-500/40 rounded-2xl transition-all group"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-brand-400 shrink-0">
                      <Car className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-bold text-zinc-200">
                          {job.marca} {job.modelo} <span className="text-zinc-500 font-normal">{job.anio}</span>
                        </h4>
                        {job.placa && (
                          <span className="text-[10px] text-zinc-400 bg-zinc-950 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border border-zinc-800">
                            {job.placa}
                          </span>
                        )}
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${meta.bg} ${meta.color}`}>
                          {job.estado === 'TRABAJANDO' ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : idx >= 3 ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : (
                            <Clock className="w-3 h-3" />
                          )}
                          {meta.label}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1.5 truncate">
                        {job.workshop && (
                          <span className="inline-flex items-center gap-1">
                            <Building2 className="w-3 h-3" /> {job.workshop.nombre}
                          </span>
                        )}
                        {job.problema && <span className="truncate">· {job.problema}</span>}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Fases</p>
                      <p className="text-sm font-extrabold text-zinc-200">
                        {idx + 1}/{total}
                      </p>
                    </div>
                    <div className="w-28 h-1.5 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                      <div
                        className="h-full bg-gradient-to-r from-brand-500 to-emerald-500 rounded-full transition-all"
                        style={{ width: `${((idx + 1) / total) * 100}%` }}
                      />
                    </div>
                    <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-brand-400 transition-colors" />
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
