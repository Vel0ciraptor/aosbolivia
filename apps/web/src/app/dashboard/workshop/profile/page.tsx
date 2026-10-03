'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import { api } from '../../../../lib/api';
import { useWorkshopProfile } from '../../../../store/useWorkshopProfile';
import {
  Building2, ArrowLeft, Save, Loader2, AlertCircle, CheckCircle2,
  Phone, MapPin, Wrench, Users, ImagePlus, Trash2,
} from 'lucide-react';
import TeamTab from './TeamTab';
import LocationFields from '../../../../components/LocationFields';

type Tab = 'profile' | 'team';

const MAX_LOGO_SIZE = 300;

function resizeLogo(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, MAX_LOGO_SIZE / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('No se pudo procesar la imagen'));
        return;
      }
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('No se pudo comprimir la imagen'));
        },
        'image/jpeg',
        0.85,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Archivo de imagen no válido'));
    };
    img.src = url;
  });
}

export default function WorkshopProfilePage() {
  const { workshop, loading, error, reload } = useWorkshopProfile();
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [latitud, setLatitud] = useState('');
  const [longitud, setLongitud] = useState('');
  const [initialized, setInitialized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleLogoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Selecciona un archivo de imagen válido.' });
      return;
    }
    try {
      setLogoUploading(true);
      setMessage(null);
      const blob = await resizeLogo(file);
      if (blob.size > 300 * 1024) {
        setMessage({ type: 'error', text: 'El logo pesa más de 300 KB después de comprimir. Elige una imagen más ligera.' });
        return;
      }
      const formData = new FormData();
      formData.append('file', blob, 'logo.jpg');
      await api.post('/workshops/me/logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setMessage({ type: 'success', text: 'Logo actualizado correctamente.' });
      reload();
      setTimeout(() => setMessage(null), 3500);
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'No se pudo subir el logo.',
      });
      setTimeout(() => setMessage(null), 5000);
    } finally {
      setLogoUploading(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!confirm('¿Eliminar el logo del taller?')) return;
    try {
      setLogoUploading(true);
      await api.delete('/workshops/me/logo');
      setMessage({ type: 'success', text: 'Logo eliminado.' });
      reload();
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'No se pudo eliminar el logo.',
      });
      setTimeout(() => setMessage(null), 5000);
    } finally {
      setLogoUploading(false);
    }
  };

  React.useEffect(() => {
    if (workshop && !initialized) {
      setNombre(workshop.nombre || '');
      setDescripcion(workshop.descripcion || '');
      setTelefono(workshop.telefono || '');
      setDireccion(workshop.direccion || '');
      setLatitud(String(workshop.latitud ?? ''));
      setLongitud(String(workshop.longitud ?? ''));
      setInitialized(true);
    }
  }, [workshop, initialized]);

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
      await api.put('/workshops/me', {
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || undefined,
        telefono: telefono.trim(),
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
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !workshop) {
    return (
      <div className="space-y-4">
        <Link
          href="/dashboard/workshop/requests"
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200"
        >
          <ArrowLeft className="w-4 h-4" /> Volver
        </Link>
        <div className="p-8 bg-red-950/20 border border-red-800/40 rounded-2xl text-center">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <h3 className="font-bold text-zinc-200">No se pudo cargar el perfil del taller</h3>
          <p className="text-sm text-zinc-400 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/workshop/services"
          className="p-2 hover:bg-zinc-900 rounded-xl text-zinc-400 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
            <Wrench className="w-6 h-6 text-brand-400" />
            <span>Perfil del Taller</span>
          </h2>
          <p className="text-sm text-zinc-400">Gestiona la información de tu taller y tu equipo</p>
        </div>
      </div>

      <div className="flex gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
            activeTab === 'profile'
              ? 'bg-zinc-800 text-zinc-100 border border-zinc-700'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Información
        </button>
        <button
          onClick={() => setActiveTab('team')}
          className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
            activeTab === 'team'
              ? 'bg-zinc-800 text-zinc-100 border border-zinc-700'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Users className="w-4 h-4" />
          Equipo
        </button>
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

      {activeTab === 'profile' && (
        <form onSubmit={handleSubmit} className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-5">
          <div className="flex items-center gap-4 pb-5 border-b border-zinc-800">
            <div className="relative">
              {workshop.imageUrl ? (
                <img
                  src={workshop.imageUrl}
                  alt={`Logo de ${workshop.nombre}`}
                  className="w-14 h-14 rounded-2xl border border-zinc-800 object-cover bg-zinc-950"
                />
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-brand-400">
                  <Building2 className="w-7 h-7" />
                </div>
              )}
              {logoUploading && (
                <div className="absolute inset-0 bg-zinc-950/70 rounded-2xl flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-brand-400 animate-spin" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-zinc-200">{workshop.nombre}</h3>
              <p className="text-xs text-zinc-500">ID: {workshop.id.slice(0, 12)}...</p>
              <div className="flex flex-wrap gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={logoUploading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-xs font-semibold text-zinc-300 transition-colors disabled:opacity-50"
                >
                  <ImagePlus className="w-3.5 h-3.5" />
                  {workshop.imageUrl ? 'Cambiar logo' : 'Subir logo'}
                </button>
                {workshop.imageUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    disabled={logoUploading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-950/30 hover:bg-red-950/50 border border-red-900/40 rounded-lg text-xs font-semibold text-red-400 transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Quitar
                  </button>
                )}
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  onChange={handleLogoSelect}
                />
              </div>
              <p className="text-[10px] text-zinc-600 mt-1">Máximo 300x300 px · 300 KB (se redimensiona y comprime automáticamente)</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" /> Nombre del taller <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Taller Mecánico Los Hermanos"
              className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-brand-500 text-zinc-100 text-sm"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">Descripción</label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={3}
              placeholder="Especialidad del taller, años de experiencia..."
              className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-brand-500 text-zinc-100 text-sm resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" /> Teléfono <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="+58 212 5551234"
                className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-brand-500 text-zinc-100 text-sm"
                required
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
              placeholder="Av. Principal, Edif. Taller, Local 5"
              className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-brand-500 text-zinc-100 text-sm"
            />
          </div>

          <LocationFields
            latitud={latitud}
            longitud={longitud}
            onLatitudChange={setLatitud}
            onLongitudChange={setLongitud}
          />

          <div className="p-3 bg-brand-500/5 border border-brand-500/10 rounded-xl">
            <p className="text-[11px] text-brand-300">
              💡 Las coordenadas son la ubicación de tu taller. Se usan para mostrar tu negocio a clientes cercanos.
            </p>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-zinc-800">
            <Link
              href="/dashboard/workshop/services"
              className="px-4 py-2.5 bg-zinc-950 border border-zinc-800 hover:bg-zinc-900 rounded-xl text-zinc-300 text-sm font-semibold transition-colors"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white font-bold rounded-xl text-sm transition-all flex items-center gap-2 disabled:opacity-50"
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
      )}

      {activeTab === 'team' && (
        <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl">
          <TeamTab workshopName={workshop.nombre} />
        </div>
      )}
    </div>
  );
}
