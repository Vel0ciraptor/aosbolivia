'use client';

import React, { useState } from 'react';
import { Hash, MapPin, Crosshair, ExternalLink, Loader2 } from 'lucide-react';

interface LocationFieldsProps {
  latitud: string;
  longitud: string;
  onLatitudChange: (v: string) => void;
  onLongitudChange: (v: string) => void;
}

export default function LocationFields({
  latitud,
  longitud,
  onLatitudChange,
  onLongitudChange,
}: LocationFieldsProps) {
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const lat = parseFloat(latitud);
  const lng = parseFloat(longitud);
  const hasCoords =
    !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;

  const handleUseMyLocation = () => {
    setGeoError(null);
    if (!navigator.geolocation) {
      setGeoError('Tu navegador no soporta geolocalización');
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onLatitudChange(pos.coords.latitude.toFixed(6));
        onLongitudChange(pos.coords.longitude.toFixed(6));
        setGeoLoading(false);
      },
      (err) => {
        setGeoLoading(false);
        setGeoError(
          err.code === err.PERMISSION_DENIED
            ? 'Permiso de ubicación denegado. Actívalo en tu navegador.'
            : 'No se pudo obtener tu ubicación',
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  };

  const mapsUrl = hasCoords
    ? `https://www.google.com/maps?q=${lat},${lng}`
    : 'https://www.google.com/maps';

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5" /> Ubicación <span className="text-red-400">*</span>
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleUseMyLocation}
            disabled={geoLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
          >
            {geoLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Crosshair className="w-3.5 h-3.5" />
            )}
            Mi ubicación
          </button>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 rounded-lg text-xs font-semibold transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Ver en Google Maps
          </a>
        </div>
      </div>

      {geoError && <p className="text-[11px] text-red-400">{geoError}</p>}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
            <Hash className="w-3.5 h-3.5" /> Latitud
          </label>
          <input
            type="number"
            step="any"
            value={latitud}
            onChange={(e) => onLatitudChange(e.target.value)}
            placeholder="10.480600"
            className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-emerald-500 text-zinc-100 text-sm font-mono"
            required
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
            onChange={(e) => onLongitudChange(e.target.value)}
            placeholder="-66.903600"
            className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-emerald-500 text-zinc-100 text-sm font-mono"
            required
          />
        </div>
      </div>

      <p className="text-[11px] text-zinc-500">
        Usa <span className="text-indigo-300">Mi ubicación</span> para llenarlas automáticamente, o ábrelos en{' '}
        <span className="text-emerald-300">Google Maps</span> para ajustar el punto exacto y copiar las coordenadas.
      </p>
    </div>
  );
}
