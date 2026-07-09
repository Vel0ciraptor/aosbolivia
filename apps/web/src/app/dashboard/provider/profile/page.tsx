'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { api } from '../../../../lib/api';
import { useProviderProfile } from '../../../../store/useProviderProfile';
import {
  Store, ArrowLeft, Save, Loader2, AlertCircle, CheckCircle2,
  Building2, Phone, Mail, MapPin, Hash,
} from 'lucide-react';

export default function ProviderProfilePage() {
  const { provider, loading, error, reload } = useProviderProfile();
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [direccion, setDireccion] = useState('');
  const [latitud, setLatitud] = useState('');
  const [longitud, setLongitud] = useState('');
  const [initialized, setInitialized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  React.useEffect(() => {
    if (provider && !initialized) {
      setNombre(provider.nombre || '');
      setTelefono(provider.telefono || '');
      setEmail(provider.email || '');
      setDireccion(provider.direccion || '');
      setLatitud(String(provider.latitud ?? ''));
      setLongitud(String(provider.longitud ?? ''));
      setInitialized(true);
    }
  }, [provider, initialized]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    const lat = parseFloat(latitud);
    const lng = parseFloat(longitud);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      setMessage({ type: 'error', text: 'La latitud debe estar entre -90 y 90.' });
      return;
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
      setMessage({ type: 'error', text: 'La longitud debe estar entre -180 y 180.' });
      return;
    }

    try {
      setSaving(true);
      await api.put('/providers/me', {
        nombre: nombre.trim(),
        telefono: telefono.trim(),
        email: email.trim(),
        direccion: direccion.trim(),
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
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !provider) {
    return (
      <div className="space-y-4">
        <Link
          href="/dashboard/provider/catalog"
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200"
        >
          <ArrowLeft className="w-4 h-4" /> Volver al catálogo
        </Link>
        <div className="p-8 bg-red-950/20 border border-red-800/40 rounded-2xl text-center">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <h3 className="font-bold text-zinc-200">No se pudo cargar el perfil del proveedor</h3>
          <p className="text-sm text-zinc-400 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/provider/catalog"
          className="p-2 hover:bg-zinc-900 rounded-xl text-zinc-400 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
            <Store className="w-6 h-6 text-indigo-400" />
            <span>Perfil del Negocio</span>
          </h2>
          <p className="text-sm text-zinc-400">Esta información la verán los clientes cuando cotices sus solicitudes.</p>
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
          <div className="w-14 h-14 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-indigo-400">
            <Building2 className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-zinc-200">{provider.nombre}</h3>
            <p className="text-xs text-zinc-500">ID: {provider.id.slice(0, 12)}...</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
            <Store className="w-3.5 h-3.5" /> Nombre comercial <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="AutoPartes Caracas C.A."
            className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-indigo-500 text-zinc-100 text-sm"
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
              placeholder="+58 212 5551234"
              className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-indigo-500 text-zinc-100 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" /> Email de contacto
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ventas@empresa.com"
              className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-indigo-500 text-zinc-100 text-sm"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5" /> Dirección
          </label>
          <input
            type="text"
            value={direccion}
            onChange={(e) => setDireccion(e.target.value)}
            placeholder="Av. Libertador, Caracas"
            className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-indigo-500 text-zinc-100 text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5" /> Latitud
            </label>
            <input
              type="number"
              step="any"
              value={latitud}
              onChange={(e) => setLatitud(e.target.value)}
              placeholder="10.4806"
              className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-indigo-500 text-zinc-100 text-sm font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5" /> Longitud
            </label>
            <input
              type="number"
              step="any"
              value={longitud}
              onChange={(e) => setLongitud(e.target.value)}
              placeholder="-66.9036"
              className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-indigo-500 text-zinc-100 text-sm font-mono"
            />
          </div>
        </div>

        <div className="p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-xl">
          <p className="text-[11px] text-indigo-300">
            💡 Las coordenadas se usan para mostrar tu negocio en búsquedas por cercanía a los clientes.
          </p>
        </div>

        <div className="pt-4 flex justify-end gap-3 border-t border-zinc-800">
          <Link
            href="/dashboard/provider/catalog"
            className="px-4 py-2.5 bg-zinc-950 border border-zinc-800 hover:bg-zinc-900 rounded-xl text-zinc-300 text-sm font-semibold transition-colors"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-emerald-500 hover:from-indigo-600 hover:to-emerald-600 text-zinc-950 font-bold rounded-xl text-sm transition-all flex items-center gap-2 disabled:opacity-50"
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
