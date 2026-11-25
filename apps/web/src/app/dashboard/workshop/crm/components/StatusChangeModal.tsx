'use client';

import React, { useState } from 'react';
import { api } from '../../../../../lib/api';
import { RefreshCw, ArrowRight, X, User, CheckCircle2, Loader2 } from 'lucide-react';
import { STATUS_META, WorkshopJob, prevStatusOf } from '../types';

interface StatusChangeModalProps {
  job: WorkshopJob | null;
  user: any;
  isWorkshopAdmin: boolean;
  onClose: () => void;
  onChanged: (jobId: string, newStatus: string) => Promise<void>;
}

export default function StatusChangeModal({
  job,
  user,
  isWorkshopAdmin,
  onClose,
  onChanged,
}: StatusChangeModalProps) {
  const [statusObs, setStatusObs] = useState('');
  const [changingStatus, setChangingStatus] = useState(false);

  if (!job) return null;

  const handleStatusChange = async (newStatus: string) => {
    setChangingStatus(true);
    try {
      await api.patch(`/workshops/me/jobs/${job.id}/status`, {
        estado: newStatus,
        observaciones: statusObs.trim() || undefined,
      });
      setStatusObs('');
      onClose();
      await onChanged(job.id, newStatus);
    } catch (err: any) {
      alert(err.response?.data?.message || 'No se pudo cambiar el estado.');
    } finally {
      setChangingStatus(false);
    }
  };

  const prev = prevStatusOf(job.estado);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl relative p-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-zinc-800 rounded-xl text-zinc-400 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        <h3 className="text-xl font-bold text-zinc-200 mb-1 flex items-center gap-2">
          {job.estado === 'FINALIZADO' ? (
            <>
              <RefreshCw className="w-5 h-5 text-amber-400" />
              Reabrir Vehículo
            </>
          ) : (
            <>
              <ArrowRight className="w-5 h-5 text-brand-400" />
              Cambiar Estado
            </>
          )}
        </h3>
        <p className="text-xs text-zinc-500 mb-4">
          {job.marca} {job.modelo} {job.anio}
        </p>
        {user && (
          <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl">
            <User className="w-4 h-4 text-zinc-500" />
            <span className="text-xs text-zinc-400">Firmando como:</span>
            <span className="text-xs font-bold text-zinc-200">{user.name}</span>
            <span className="text-[10px] text-zinc-500 px-1.5 py-0.5 bg-zinc-800 rounded-full">
              {user.workshopUserRole || user.role}
            </span>
          </div>
        )}
        <div className="space-y-3 mb-4">
          <p className="text-xs text-zinc-400">
            Estado actual:
            {(() => {
              const meta = STATUS_META[job.estado] || STATUS_META.INGRESANDO;
              const Icon = meta.icon;
              return (
                <span
                  className={`ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${meta.bg} ${meta.color}`}
                >
                  <Icon className="w-3 h-3" />
                  {meta.label}
                </span>
              );
            })()}
          </p>
          {job.estado === 'FINALIZADO' ? (
            <p className="text-xs text-zinc-400">
              Reabrir a:
              {(() => {
                const meta = STATUS_META.INGRESANDO;
                const Icon = meta.icon;
                return (
                  <span
                    className={`ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${meta.bg} ${meta.color}`}
                  >
                    <Icon className="w-3 h-3" />
                    {meta.label}
                  </span>
                );
              })()}
            </p>
          ) : (
            STATUS_META[job.estado]?.next && (
              <p className="text-xs text-zinc-400">
                Avanzar a:
                {(() => {
                  const nextKey = STATUS_META[job.estado].next!;
                  const meta = STATUS_META[nextKey];
                  const Icon = meta.icon;
                  return (
                    <span
                      className={`ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${meta.bg} ${meta.color}`}
                    >
                      <Icon className="w-3 h-3" />
                      {meta.label}
                    </span>
                  );
                })()}
              </p>
            )
          )}
          {isWorkshopAdmin && prev && (
            <p className="text-xs text-zinc-500">
              Volver atrás a:
              {(() => {
                const meta = STATUS_META[prev];
                const Icon = meta.icon;
                return (
                  <span
                    className={`ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${meta.bg} ${meta.color}`}
                  >
                    <Icon className="w-3 h-3" />
                    {meta.label}
                  </span>
                );
              })()}
            </p>
          )}
        </div>

        <div className="space-y-1.5 mb-6">
          <label className="text-xs font-semibold text-zinc-300">Observaciones (opcional)</label>
          <textarea
            value={statusObs}
            onChange={(e) => setStatusObs(e.target.value)}
            rows={2}
            placeholder="Detalles del cambio de estado..."
            className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-brand-500 text-zinc-100 text-sm resize-none"
          />
        </div>
        <div className="flex justify-end gap-3 flex-wrap">
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-zinc-950 border border-zinc-800 hover:bg-zinc-900 rounded-xl text-zinc-300 text-sm font-semibold transition-colors"
          >
            Cancelar
          </button>
          {isWorkshopAdmin && prev && (
            <button
              onClick={() => handleStatusChange(prev)}
              disabled={changingStatus}
              className="px-4 py-2.5 bg-zinc-950 border border-amber-500/40 hover:bg-zinc-900 text-amber-400 text-sm font-bold rounded-xl flex items-center gap-1.5 transition-colors disabled:opacity-50"
              title="Volver a la etapa anterior (solo administrador)"
            >
              <ArrowRight className="w-4 h-4 rotate-180" />
              <span>Volver a {STATUS_META[prev].label}</span>
            </button>
          )}
          {(job.estado !== 'FINALIZADO' || isWorkshopAdmin) && (
            <button
              onClick={() => {
                const target =
                  job.estado === 'FINALIZADO' ? 'INGRESANDO' : STATUS_META[job.estado]?.next!;
                handleStatusChange(target);
              }}
              disabled={changingStatus || (job.estado === 'INGRESANDO' && !job.kilometraje)}
              className={`px-5 py-2.5 font-bold rounded-xl text-sm transition-all flex items-center gap-2 disabled:opacity-50 ${
                job.estado === 'FINALIZADO'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-zinc-950'
                  : 'bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white'
              }`}
            >
              {changingStatus ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Cambiando...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{job.estado === 'FINALIZADO' ? 'Reabrir' : 'Confirmar cambio'}</span>
                </>
              )}
            </button>
          )}
        </div>
        {job.estado === 'FINALIZADO' && !isWorkshopAdmin && (
          <p className="text-[11px] text-zinc-500 text-right mt-2">
            Solo el administrador del taller puede reabrir este vehículo.
          </p>
        )}
      </div>
    </div>
  );
}

