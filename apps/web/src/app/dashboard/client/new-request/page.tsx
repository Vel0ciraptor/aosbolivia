'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '../../../../lib/api';
import {
  Sparkles, Send, ArrowLeft, AlertCircle, Loader2,
  Car, Tag, MapPin, Wrench, Truck, MessageCircle, CheckCircle2,
} from 'lucide-react';

interface Vehicle {
  id: string;
  marca: string;
  modelo: string;
  anio: number;
  placa?: string;
}

interface AIParsed {
  categoria: 'REPUESTO' | 'TALLER' | 'GRUA' | 'CONSULTA';
  marca?: string;
  modelo?: string;
  anio?: number;
  pieza?: string;
  especialidad?: string;
  ubicacion?: string;
  confianza: number;
  resumen: string;
}

const CATEGORY_META: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  REPUESTO: { label: 'Repuesto', icon: Tag, color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/20' },
  TALLER: { label: 'Servicio de Taller', icon: Wrench, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  GRUA: { label: 'Servicio de Grúa', icon: Truck, color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' },
  CONSULTA: { label: 'Consulta General', icon: MessageCircle, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
};

const EXAMPLES = [
  'Necesito una bomba de gasolina para mi Toyota Hilux 2019',
  'El motor de mi Ford Explorer hace un ruido extraño al arrancar',
  'Busco un taller especializado en frenos cerca de Caracas',
  'Mi carro no enciende, necesito una grúa urgente',
];

export default function NewRequestPage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [descripcion, setDescripcion] = useState('');
  const [vehicleId, setVehicleId] = useState<string>('');
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<AIParsed | null>(null);

  useEffect(() => {
    async function loadVehicles() {
      try {
        const res = await api.get('/vehicles');
        setVehicles(res.data || []);
        if (res.data && res.data.length > 0) {
          setVehicleId(res.data[0].id);
        }
      } catch (err) {
        console.error('Error loading vehicles:', err);
      } finally {
        setLoadingVehicles(false);
      }
    }
    loadVehicles();
  }, []);

  useEffect(() => {
    const text = descripcion.trim();
    if (text.length < 5) {
      return;
    }
    const timer = setTimeout(async () => {
      setParsing(true);
      try {
        const res = await api.post('/ai/parse-request', { text });
        setParsed(res.data);
      } catch (err) {
        console.error('Error parsing with AI:', err);
      } finally {
        setParsing(false);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [descripcion]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!descripcion.trim()) {
      setError('Por favor describe lo que necesitas.');
      return;
    }
    if (descripcion.trim().length < 10) {
      setError('La descripción es muy corta. Cuéntanos un poco más (mínimo 10 caracteres).');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.post('/requests', {
        descripcion: descripcion.trim(),
        vehicleId: vehicleId || undefined,
        categoria: parsed?.categoria,
      });
      const requestId = res.data?.request?.id;
      if (requestId) {
        router.push(`/dashboard/client/requests/${requestId}`);
      } else {
        router.push('/dashboard/client/requests');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'No se pudo crear la solicitud. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  const meta = parsed ? CATEGORY_META[parsed.categoria] : null;
  const MetaIcon = meta?.icon;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/client/requests"
          className="p-2 hover:bg-zinc-900 rounded-xl text-zinc-400 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-indigo-400" />
            <span>Nueva Solicitud con IA</span>
          </h2>
          <p className="text-sm text-zinc-400">
            Describe lo que necesitas con tus propias palabras. Nuestra IA identificará la categoría y los detalles.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-300 block">
                  ¿Qué necesitas? <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  rows={6}
                  placeholder="Ej: Necesito cambiar las pastillas de freno de mi Ford Explorer 2021, hace un chillido al frenar..."
                  className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-indigo-500 text-zinc-100 transition-colors text-sm resize-none"
                  disabled={submitting}
                />
                <div className="flex items-center justify-between text-[11px] text-zinc-500">
                  <span>Sé lo más específico posible para recibir mejores cotizaciones.</span>
                  <span>{descripcion.length} caracteres</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-300 block">
                  Vehículo (opcional)
                </label>
                {loadingVehicles ? (
                  <div className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-500 text-sm flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Cargando vehículos...
                  </div>
                ) : vehicles.length === 0 ? (
                  <div className="w-full p-4 bg-zinc-950 border border-zinc-800 border-dashed rounded-xl text-zinc-500 text-sm">
                    No tienes vehículos registrados.{' '}
                    <Link
                      href="/dashboard/client/vehicles"
                      className="text-indigo-400 hover:underline font-semibold"
                    >
                      Registrar vehículo
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setVehicleId('')}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        vehicleId === ''
                          ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-300'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <span className="text-xs font-semibold">Sin vehículo</span>
                      <p className="text-[11px] text-zinc-500 mt-0.5">La solicitud no se asociará a ningún vehículo</p>
                    </button>
                    {vehicles.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setVehicleId(v.id)}
                        className={`p-3 rounded-xl border text-left transition-all flex items-center gap-3 ${
                          vehicleId === v.id
                            ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-300'
                            : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                        }`}
                      >
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                          vehicleId === v.id ? 'bg-indigo-500/20' : 'bg-zinc-900'
                        }`}>
                          <Car className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate">
                            {v.marca} {v.modelo}
                          </p>
                          <p className="text-[11px] text-zinc-500">
                            {v.anio} {v.placa ? `· ${v.placa}` : ''}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {error && (
                <div className="p-3 bg-red-950/30 border border-red-800/50 rounded-xl flex items-start gap-2 text-red-200 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-zinc-800/60">
                <Link
                  href="/dashboard/client/requests"
                  className="px-4 py-2.5 bg-zinc-950 border border-zinc-800 hover:bg-zinc-900 rounded-xl text-zinc-300 text-sm font-semibold transition-colors"
                >
                  Cancelar
                </Link>
                <button
                  type="submit"
                  disabled={submitting || !descripcion.trim()}
                  className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-emerald-500 hover:from-indigo-600 hover:to-emerald-600 text-zinc-950 font-bold rounded-xl text-sm transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Creando...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Publicar Solicitud</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="p-5 bg-zinc-900/30 border border-zinc-800/80 border-dashed rounded-2xl">
              <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-3">
                Ejemplos de solicitudes
              </p>
              <div className="flex flex-wrap gap-2">
                {EXAMPLES.map((ex, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setDescripcion(ex)}
                    className="text-xs px-3 py-1.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-full text-zinc-400 hover:text-zinc-200 transition-colors"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          </form>
        </div>

        <div className="space-y-4">
          <div className="p-6 bg-gradient-to-br from-indigo-950/40 to-zinc-900 border border-indigo-500/20 rounded-2xl space-y-4 sticky top-6">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              <h3 className="text-sm font-bold text-zinc-200">Análisis con IA</h3>
            </div>

            {!descripcion.trim() || descripcion.trim().length < 5 ? (
              <div className="text-center py-8 text-zinc-500">
                <Sparkles className="w-8 h-8 mx-auto mb-2 text-zinc-700" />
                <p className="text-xs">Empieza a escribir y nuestra IA identificará automáticamente:</p>
                <ul className="text-[11px] text-zinc-600 mt-3 space-y-1">
                  <li>• Categoría (repuesto, taller, grúa)</li>
                  <li>• Marca y modelo del vehículo</li>
                  <li>• Año y pieza solicitada</li>
                </ul>
              </div>
            ) : parsing ? (
              <div className="flex items-center gap-2 text-zinc-400 text-xs py-8 justify-center">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                <span>Analizando con IA...</span>
              </div>
            ) : parsed && meta && MetaIcon ? (
              <div className="space-y-3 animate-in fade-in duration-300">
                <div className={`p-3 rounded-xl border ${meta.bg}`}>
                  <div className="flex items-center gap-2">
                    <MetaIcon className={`w-4 h-4 ${meta.color}`} />
                    <span className={`text-xs font-bold ${meta.color} uppercase tracking-wider`}>
                      {meta.label}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-200 font-semibold mt-2 leading-snug">
                    {parsed.resumen}
                  </p>
                </div>

                <div className="space-y-2">
                  {parsed.marca && (
                    <div className="flex items-center justify-between p-2.5 bg-zinc-950/60 border border-zinc-800/60 rounded-lg">
                      <span className="text-[11px] text-zinc-500 font-semibold uppercase">Marca</span>
                      <span className="text-xs text-zinc-200 font-bold">{parsed.marca}</span>
                    </div>
                  )}
                  {parsed.modelo && (
                    <div className="flex items-center justify-between p-2.5 bg-zinc-950/60 border border-zinc-800/60 rounded-lg">
                      <span className="text-[11px] text-zinc-500 font-semibold uppercase">Modelo</span>
                      <span className="text-xs text-zinc-200 font-bold">{parsed.modelo}</span>
                    </div>
                  )}
                  {parsed.anio && (
                    <div className="flex items-center justify-between p-2.5 bg-zinc-950/60 border border-zinc-800/60 rounded-lg">
                      <span className="text-[11px] text-zinc-500 font-semibold uppercase">Año</span>
                      <span className="text-xs text-zinc-200 font-bold">{parsed.anio}</span>
                    </div>
                  )}
                  {parsed.pieza && (
                    <div className="flex items-center justify-between p-2.5 bg-zinc-950/60 border border-zinc-800/60 rounded-lg">
                      <span className="text-[11px] text-zinc-500 font-semibold uppercase">Pieza</span>
                      <span className="text-xs text-zinc-200 font-bold capitalize">{parsed.pieza}</span>
                    </div>
                  )}
                  {parsed.especialidad && (
                    <div className="flex items-center justify-between p-2.5 bg-zinc-950/60 border border-zinc-800/60 rounded-lg">
                      <span className="text-[11px] text-zinc-500 font-semibold uppercase">Especialidad</span>
                      <span className="text-xs text-zinc-200 font-bold capitalize">{parsed.especialidad}</span>
                    </div>
                  )}
                  {parsed.ubicacion && (
                    <div className="flex items-center justify-between p-2.5 bg-zinc-950/60 border border-zinc-800/60 rounded-lg">
                      <span className="text-[11px] text-zinc-500 font-semibold uppercase flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> Ubicación
                      </span>
                      <span className="text-xs text-zinc-200 font-bold">{parsed.ubicacion}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-zinc-800/60">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[11px] text-zinc-500">
                    Confianza: <strong className="text-zinc-300">{Math.round(parsed.confianza * 100)}%</strong>
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
