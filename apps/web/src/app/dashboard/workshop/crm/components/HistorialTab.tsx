'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../../../../../lib/api';
import { History, RefreshCw, Timer, Package, Edit2 } from 'lucide-react';

interface HistorialTabProps {
  canEditHours: boolean;
}

export default function HistorialTab({ canEditHours }: HistorialTabProps) {
  const [histTab, setHistTab] = useState<'hours' | 'movements'>('hours');
  const [histFrom, setHistFrom] = useState('');
  const [histTo, setHistTo] = useState('');
  const [mechanicHours, setMechanicHours] = useState<any[]>([]);
  const [invMovements, setInvMovements] = useState<any[]>([]);
  const [histLoading, setHistLoading] = useState(false);

  const loadHistorial = useCallback(async () => {
    setHistLoading(true);
    try {
      const [h, m] = await Promise.all([
        api.get('/workshops/me/mechanic-hours', {
          params: { from: histFrom || undefined, to: histTo || undefined },
        }),
        api.get('/workshops/me/inventory-movements'),
      ]);
      setMechanicHours(h.data || []);
      setInvMovements(m.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setHistLoading(false);
    }
  }, [histFrom, histTo]);

  useEffect(() => {
    loadHistorial();
  }, [loadHistorial]);

  const handleEditMechanicHour = async (row: any) => {
    const input = prompt(
      `Horas reales para ${row.nombre} en ${row.marca} ${row.modelo}:`,
      row.horasReales ?? '',
    );
    if (input === null) return;
    const horas = parseFloat(input);
    if (isNaN(horas) || horas < 0) {
      alert('Horas inválidas.');
      return;
    }
    try {
      await api.patch(
        `/workshops/me/jobs/${row.jobId}/worklogs/${row.worklogKey}`,
        { horasReales: horas },
      );
      await loadHistorial();
    } catch (err: any) {
      alert(err.response?.data?.message || 'No se pudo editar.');
    }
  };

  return (
    <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-brand-400" />
          <h3 className="font-bold text-zinc-100">Historial del Taller</h3>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <label className="text-[10px] text-zinc-500 font-bold uppercase">Desde</label>
            <input
              type="date"
              value={histFrom}
              onChange={(e) => setHistFrom(e.target.value)}
              className="px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 text-xs"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <label className="text-[10px] text-zinc-500 font-bold uppercase">Hasta</label>
            <input
              type="date"
              value={histTo}
              onChange={(e) => setHistTo(e.target.value)}
              className="px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 text-xs"
            />
          </div>
          <button
            onClick={loadHistorial}
            className="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Filtrar
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-zinc-800">
        <button
          onClick={() => setHistTab('hours')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
            histTab === 'hours'
              ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
              : 'bg-zinc-950 border border-zinc-800 text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Timer className="w-3.5 h-3.5" /> Horas de mecánicos
        </button>
        <button
          onClick={() => setHistTab('movements')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
            histTab === 'movements'
              ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
              : 'bg-zinc-950 border border-zinc-800 text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Package className="w-3.5 h-3.5" /> Movimientos de inventario
        </button>
      </div>

      {histLoading ? (
        <div className="flex items-center justify-center py-10">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : histTab === 'hours' ? (
        (() => {
          const totalHours = mechanicHours.reduce((s, r) => s + (r.horasReales ?? 0), 0);
          const totalJobs = new Set(mechanicHours.map((r) => r.jobId)).size;
          const byMechanic: Record<string, number> = {};
          mechanicHours.forEach((r) => {
            byMechanic[r.nombre || 'Sin asignar'] =
              (byMechanic[r.nombre || 'Sin asignar'] || 0) + (r.horasReales ?? 0);
          });
          return (
            <div className="space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl">
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Horas totales</p>
                  <p className="text-2xl font-extrabold text-zinc-100 mt-1">{totalHours.toFixed(2)} h</p>
                </div>
                <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl">
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Vehículos atendidos</p>
                  <p className="text-2xl font-extrabold text-zinc-100 mt-1">{totalJobs}</p>
                </div>
                <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl">
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Mecánicos activos</p>
                  <p className="text-2xl font-extrabold text-zinc-100 mt-1">{Object.keys(byMechanic).length}</p>
                </div>
              </div>
              {Object.entries(byMechanic).length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {Object.entries(byMechanic).map(([nombre, h]) => (
                    <div key={nombre} className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs">
                      <span className="text-zinc-300 font-semibold">{nombre}</span>
                      <span className="text-zinc-500 ml-2">{h.toFixed(2)} h</span>
                    </div>
                  ))}
                </div>
              )}
              {mechanicHours.length === 0 ? (
                <p className="text-sm text-zinc-500 text-center py-6">
                  Sin registros de horas en el rango seleccionado.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-800 text-left text-[10px] uppercase tracking-wider text-zinc-500">
                        <th className="py-2 pr-3 font-bold">Mecánico</th>
                        <th className="py-2 pr-3 font-bold">Vehículo</th>
                        <th className="py-2 pr-3 font-bold">Cliente</th>
                        <th className="py-2 pr-3 font-bold">Inicio</th>
                        <th className="py-2 pr-3 font-bold">Fin</th>
                        <th className="py-2 pr-3 font-bold text-right">Horas</th>
                        <th className="py-2 font-bold">Editar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mechanicHours.map((r, i) => (
                        <tr key={i} className="border-b border-zinc-800/60 hover:bg-zinc-900/50">
                          <td className="py-2.5 pr-3 text-zinc-200 font-semibold">{r.nombre || '-'}</td>
                          <td className="py-2.5 pr-3 text-zinc-300">
                            {r.marca} {r.modelo}
                            {r.placa ? ` (${r.placa})` : ''}
                          </td>
                          <td className="py-2.5 pr-3 text-zinc-500">{r.clienteNombre || '-'}</td>
                          <td className="py-2.5 pr-3 text-zinc-400 text-xs">
                            {r.inicio
                              ? new Date(r.inicio).toLocaleString('es-VE', {
                                  day: '2-digit',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : '-'}
                          </td>
                          <td className="py-2.5 pr-3 text-zinc-400 text-xs">
                            {r.fin
                              ? new Date(r.fin).toLocaleString('es-VE', {
                                  day: '2-digit',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : '-'}
                          </td>
                          <td className="py-2.5 pr-3 text-right font-bold text-zinc-200">
                            {r.horasReales != null ? `${r.horasReales} h` : '-'}
                          </td>
                          <td className="py-2.5">
                            {canEditHours ? (
                              <button
                                onClick={() => handleEditMechanicHour(r)}
                                className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-bold rounded-lg flex items-center gap-1"
                              >
                                <Edit2 className="w-3 h-3" /> Editar
                              </button>
                            ) : (
                              <span className="text-[10px] text-zinc-600">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })()
      ) : (
        (() => {
          const byItem: Record<string, { cant: number; jobs: number }> = {};
          invMovements.forEach((mv: any) => {
            const k = mv.nombre || 'Sin nombre';
            byItem[k] = byItem[k] || { cant: 0, jobs: 0 };
            byItem[k].cant += mv.cantidad;
            byItem[k].jobs += 1;
          });
          return (
            <div className="space-y-4">
              {Object.entries(byItem).length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {Object.entries(byItem).map(([nombre, v]) => (
                    <div key={nombre} className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs">
                      <span className="text-zinc-300 font-semibold">{nombre}</span>
                      <span className="text-zinc-500 ml-2">
                        {v.cant} uds · {v.jobs} jobs
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {invMovements.length === 0 ? (
                <p className="text-sm text-zinc-500 text-center py-6">
                  Sin movimientos de inventario registrados.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-800 text-left text-[10px] uppercase tracking-wider text-zinc-500">
                        <th className="py-2 pr-3 font-bold">Pieza</th>
                        <th className="py-2 pr-3 font-bold">Cant.</th>
                        <th className="py-2 pr-3 font-bold">Vehículo</th>
                        <th className="py-2 pr-3 font-bold">Cliente</th>
                        <th className="py-2 pr-3 font-bold">Salida</th>
                        <th className="py-2 font-bold">Usado por</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invMovements.map((mv: any, i) => (
                        <tr key={i} className="border-b border-zinc-800/60 hover:bg-zinc-900/50">
                          <td className="py-2.5 pr-3 text-zinc-200 font-semibold">{mv.nombre}</td>
                          <td className="py-2.5 pr-3 text-zinc-300">{mv.cantidad}</td>
                          <td className="py-2.5 pr-3 text-zinc-400 text-xs">
                            {mv.marca} {mv.modelo}
                            {mv.placa ? ` (${mv.placa})` : ''}
                          </td>
                          <td className="py-2.5 pr-3 text-zinc-500 text-xs">{mv.clienteNombre || '-'}</td>
                          <td className="py-2.5 pr-3 text-zinc-400 text-xs">
                            {mv.yaUsadoEn
                              ? new Date(mv.yaUsadoEn).toLocaleString('es-VE', {
                                  day: '2-digit',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : '-'}
                          </td>
                          <td className="py-2.5 text-zinc-400 text-xs">{mv.usadoPorNombre || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })()
      )}
    </div>
  );
}

