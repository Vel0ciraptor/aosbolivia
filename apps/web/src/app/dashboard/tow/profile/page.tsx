'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '../../../../lib/api';
import { useTowProfile } from '../../../../store/useTowProfile';
import {
  Truck, ArrowLeft, Save, Loader2, AlertCircle, CheckCircle2,
  Building2, Phone, MapPin, Hash, DollarSign, Compass,
} from 'lucide-react';

export default function TowProfilePage() {
  const { tow, loading, error, reload } = useTowProfile();

  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [costoBase, setCostoBase] = useState('');
  const [costoKm, setCostoKm] = useState('');
  const [cobertura, setCobertura] = useState('');
  const [latitud, setLatitud] = useState('');
  const [longitud, setLongitud] = useState('');
  const [initialized, setInitialized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (tow && !initialized) {
      setNombre(tow.nombre || '');
      setTelefono(tow.telefono || '');
      setDireccion(tow.direccion || '');
      setCostoBase(String(tow.costoBase ?? ''));
      setCostoKm(String(tow.costoKm ?? ''));
      setCobertura(String(tow.cobertura ?? ''));
      setLatitud(String(tow.latitud ?? ''));
      setLongitud(String(tow.longitud ?? ''));
      setInitialized(true);
    }
  }, [tow, initialized]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    const base = parseFloat(costoBase);
    const km = parseFloat(costoKm);
    const cob = parseFloat(cobertura);
    const lat = parseFloat(latitud);
    const lng = parseFloat(longitud);

    if (isNaN(base) || base < 0) { setMessage({ type: 'error', text: 'Tarifa base inválida.' }); return; }
    if (isNaN(km) || km < 0) { setMessage({ type: 'error', text: 'Costo por km inválido.' }); return; }
    if (isNaN(cob) || cob < 0) { setMessage({ type: 'error', text: 'Cobertura inválida.' }); return; }
    if (isNaN(lat) || lat < -90 || lat > 90) { setMessage({ type: 'error', text: 'Latitud inválida.' }); return; }
    if (isNaN(lng) || lng < -180 || lng > 180) { setMessage({ type: 'error', text: 'Longitud inválida.' }); return; }

    try {
      setSaving(true);
      await api.put('/tows/me', {
        nombre: nombre.trim(),
        telefono: telefono.trim(),
        direccion: direccion.trim(),
        costoBase: base,
        costoKm: km,
        cobertura: cob,
        latitud: lat,
        longitud: lng,
      });
      setMessage({ type: 'success', text: 'Perfil actualizado correctamente.' });
      reload();
      setTimeout(() => setMessage(null), 3500);
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'No se pudo actualizar el perfil.',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !tow) {
    return (
      <div className="space-y-4">
        <Link
          href="/dashboard/tow/requests"
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200"
        >
          <ArrowLeft className="w-4 h-4" /> Volver
        </Link>
        <div className="p-8 bg-red-950/20 border border-red-800/40 rounded-2xl text-center">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <h3 className="font-bold text-zinc-200">No se pudo cargar el perfil del servicio</h3>
          <p className="text-sm text-zinc-400 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/tow/requests"
          className="p-2 hover:bg-zinc-900 rounded-xl text-zinc-400 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
            <Truck className="w-6 h-6 text-rose-400" />
            <span>Perfil del Servicio de Grúa</span>
          </h2>
          <p className="text-sm text-zinc-400">Tarifas, cobertura y ubicación base de tu servicio.</p>
        </div>
      </div>

      {message && (
        <div
          className={`p-3 rounded-xl flex items-center gap-2 text-sm ${
            message.type === 'success'
              ? 'bg-emerald-950/30 border border-emerald-800/50 text-emerald-200'
              : 'bg-red-950/30 border border-red-800/50 text-red-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-5">
        <div className="flex items-center gap-4 pb-5 border-b border-zinc-800">
          <div className="w-14 h-14 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-rose-400">
            <Building2 className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-zinc-200">{tow.nombre}</h3>
            <p className="text-xs text-zinc-500">ID: {tow.id.slice(0, 12)}...</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5" /> Nombre del servicio <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Grúas Rápidas 24h"
            className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-rose-500 text-zinc-100 text-sm"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" /> Teléfono
            </label>
            <input
              type="text"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="+58 414 1112233"
              className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-rose-500 text-zinc-100 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5" /> Cobertura (km) <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              min="0"
              step="0.1"
              value={cobertura}
              onChange={(e) => setCobertura(e.target.value)}
              placeholder="50"
              className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-rose-500 text-zinc-100 text-sm font-mono"
              required
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5" /> Dirección base
          </label>
          <input
            type="text"
            value={direccion}
            onChange={(e) => setDireccion(e.target.value)}
            placeholder="Autopista Caracas-La Guaira, Km 2"
            className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-rose-500 text-zinc-100 text-sm"
          />
        </div>

        <div className="p-4 bg-rose-500/5 border border-rose-500/20 rounded-2xl space-y-4">
          <h4 className="text-xs font-bold text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5" /> Tarifas
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Tarifa base (USD) <span className="text-red-400">*</span></label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={costoBase}
                onChange={(e) => setCostoBase(e.target.value)}
                placeholder="25.00"
                className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-rose-500 text-zinc-100 text-sm font-mono"
                required
              />
              <p className="text-[11px] text-zinc-500">Costo fijo por tomar el servicio</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Costo por kilómetro (USD) <span className="text-red-400">*</span></label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={costoKm}
                onChange={(e) => setCostoKm(e.target.value)}
                placeholder="2.50"
                className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-rose-500 text-zinc-100 text-sm font-mono"
                required
              />
              <p className="text-[11px] text-zinc-500">Multiplicado por la distancia recorrida</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5" /> Latitud <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              step="any"
              value={latitud}
              onChange={(e) => setLatitud(e.target.value)}
              placeholder="10.5050"
              className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-rose-500 text-zinc-100 text-sm font-mono"
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5" /> Longitud <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              step="any"
              value={longitud}
              onChange={(e) => setLongitud(e.target.value)}
              placeholder="-66.9200"
              className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-rose-500 text-zinc-100 text-sm font-mono"
              required
            />
          </div>
        </div>

        <div className="p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-xl">
          <p className="text-[11px] text-indigo-300">
            💡 Las coordenadas son tu base de operaciones. Se usan para calcular distancias y
            filtrar solicitudes dentro de tu radio de cobertura.
          </p>
        </div>

        <div className="pt-4 flex justify-end gap-3 border-t border-zinc-800">
          <Link
            href="/dashboard/tow/requests"
            className="px-4 py-2.5 bg-zinc-950 border border-zinc-800 hover:bg-zinc-900 rounded-xl text-zinc-300 text-sm font-semibold transition-colors"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-zinc-950 font-bold rounded-xl text-sm transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Guardar cambios</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
