'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '../../../../lib/api';
import { useWorkshopProfile } from '../../../../store/useWorkshopProfile';
import {
  CalendarDays, Plus, Copy, Trash2, Clock, AlertCircle,
  User as UserIcon, Car, Inbox, CheckCircle2, X, Loader2, Repeat,
} from 'lucide-react';
import type { WeeklyPattern } from '../../../../store/useWorkshopProfile';

interface Block {
  id: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  slotMinutes: number;
}

interface Appointment {
  id: string;
  startAt: string;
  endAt: string;
  clientUserId: string;
  quote?: { precio: number | string; comentario?: string } | null;
  request?: {
    titulo: string;
    user?: { name: string; phone?: string };
    vehicle?: { marca: string; modelo: string; placa?: string } | null;
  } | null;
}

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function dateKey(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return d.toLocaleDateString('en-CA', { timeZone: 'America/La_Paz' });
}

function fmt(iso: string): string {
  return new Date(iso).toLocaleString('es-BO', {
    timeZone: 'America/La_Paz',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function todayPlus(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

type Notify = (type: 'success' | 'error', text: string) => void;

// Horario habitual: se define una vez (días + rangos) y la agenda
// se genera sola hacia el futuro. Se monta solo cuando el perfil ya cargó,
// por eso lee el patrón guardado directo en los valores iniciales del estado.
function WeeklyScheduleCard({
  horario,
  capacidadInicial,
  notify,
  onSaved,
}: {
  horario?: WeeklyPattern | null;
  capacidadInicial?: number;
  notify: Notify;
  onSaved: () => Promise<void>;
}) {
  const [dias, setDias] = useState<number[]>(
    horario?.dias?.length ? [...horario.dias] : [1, 2, 3, 4, 5],
  );
  const [rangos, setRangos] = useState<{ inicio: string; fin: string }[]>(
    horario?.rangos?.length
      ? horario.rangos.map((r) => ({ ...r }))
      : [{ inicio: '08:00', fin: '12:00' }],
  );
  const [slotMinutes, setSlotMinutes] = useState(horario?.slotMinutes ?? 30);
  const [capacidadSlot, setCapacidadSlot] = useState(
    capacidadInicial && capacidadInicial > 0 ? capacidadInicial : 1,
  );
  const [hasta, setHasta] = useState(todayPlus(horario?.horizonteDias ?? 90));
  const [generadoHasta, setGeneradoHasta] = useState<string | undefined>(
    horario?.generadoHasta,
  );
  const [saving, setSaving] = useState(false);

  const setRango = (i: number, field: 'inicio' | 'fin', value: string) =>
    setRangos((rs) => rs.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));

  const addRango = () =>
    setRangos((rs) =>
      rs.length >= 4 ? rs : [...rs, { inicio: '14:00', fin: '18:00' }],
    );

  const removeRango = (i: number) =>
    setRangos((rs) => (rs.length <= 1 ? rs : rs.filter((_, idx) => idx !== i)));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dias.length) {
      notify('error', 'Elige al menos un día de la semana');
      return;
    }
    const ordenados = [...rangos].sort((a, b) => a.inicio.localeCompare(b.inicio));
    for (const r of ordenados) {
      if (!r.inicio || !r.fin || r.inicio >= r.fin) {
        notify('error', 'Cada horario debe terminar después de su hora de inicio');
        return;
      }
    }
    for (let i = 1; i < ordenados.length; i++) {
      if (ordenados[i].inicio < ordenados[i - 1].fin) {
        notify('error', 'Los horarios no pueden solaparse');
        return;
      }
    }
    const hoyKey = dateKey(new Date());
    const horizonteDias = Math.min(
      365,
      Math.max(
        1,
        Math.round(
          (new Date(`${hasta}T12:00:00Z`).getTime() -
            new Date(`${hoyKey}T12:00:00Z`).getTime()) /
            86400000,
        ),
      ),
    );

    setSaving(true);
    try {
      const res = await api.post('/workshops/me/availability/weekly', {
        dias,
        rangos: ordenados,
        slotMinutes,
        horizonteDias,
        capacidadSlot,
      });
      const created: number = res.data?.created ?? 0;
      const hastaGen: string = res.data?.hasta ?? '';
      setGeneradoHasta(hastaGen);
      notify(
        'success',
        created === 0
          ? 'Horario guardado; la agenda ya estaba generada hasta esa fecha'
          : `Horario guardado: se ${created === 1 ? 'creó 1 bloque' : `crearon ${created} bloques`} (agenda hasta el ${hastaGen})`,
      );
      await onSaved();
    } catch (err: unknown) {
      const data = (err as { response?: { data?: { message?: string } } })?.response?.data;
      notify('error', data?.message || 'No se pudo guardar el horario');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="p-6 bg-gradient-to-br from-brand-950/30 to-zinc-900 border border-brand-500/20 rounded-2xl space-y-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Repeat className="w-4 h-4 text-brand-400" />
          <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">
            Horario habitual
          </h3>
        </div>
        {generadoHasta && (
          <span className="text-[10px] font-bold text-brand-300 bg-brand-500/10 border border-brand-500/30 px-2 py-1 rounded-lg">
            Agenda hasta {generadoHasta}
          </span>
        )}
      </div>

      <p className="text-[11px] text-zinc-500 -mt-1">
        Define tu horario una vez: se repite cada semana y la agenda se genera sola.
      </p>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-zinc-300">Días que atiendes</label>
        <div className="flex flex-wrap gap-1.5">
          {DAY_NAMES.map((name, idx) => {
            const active = dias.includes(idx);
            return (
              <button
                key={name}
                type="button"
                onClick={() =>
                  setDias((d) =>
                    d.includes(idx) ? d.filter((x) => x !== idx) : [...d, idx].sort(),
                  )
                }
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${
                  active
                    ? 'bg-brand-500/15 border-brand-500/40 text-brand-300'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-700'
                }`}
              >
                {name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold text-zinc-300">
          Horarios del día
        </label>
        {rangos.map((r, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="time"
              value={r.inicio}
              onChange={(e) => setRango(i, 'inicio', e.target.value)}
              required
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-brand-500 text-zinc-100 text-sm font-mono"
            />
            <span className="text-zinc-600 text-xs">–</span>
            <input
              type="time"
              value={r.fin}
              onChange={(e) => setRango(i, 'fin', e.target.value)}
              required
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-brand-500 text-zinc-100 text-sm font-mono"
            />
            <button
              type="button"
              onClick={() => removeRango(i)}
              disabled={rangos.length <= 1}
              className="p-2 text-zinc-600 hover:text-red-400 disabled:opacity-30 transition-colors"
              aria-label="Quitar horario"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        {rangos.length < 4 && (
          <button
            type="button"
            onClick={addRango}
            className="text-[11px] font-bold text-brand-400 hover:text-brand-300 flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> Agregar otro horario (ej. tarde)
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-300">
            Duración de cada cita
          </label>
          <select
            value={slotMinutes}
            onChange={(e) => setSlotMinutes(Number(e.target.value))}
            className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-brand-500 text-zinc-100 text-sm"
          >
            <option value={15}>15 minutos</option>
            <option value={30}>30 minutos</option>
            <option value={45}>45 minutos</option>
            <option value={60}>1 hora</option>
            <option value={90}>1 hora 30 min</option>
            <option value={120}>2 horas</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-300">Generar hasta</label>
          <input
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            min={todayPlus(1)}
            required
            className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-brand-500 text-zinc-100 text-sm"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-zinc-300">
          Vehículos por slot
        </label>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min={1}
            max={20}
            value={capacidadSlot}
            onChange={(e) =>
              setCapacidadSlot(
                Math.min(20, Math.max(1, parseInt(e.target.value) || 1)),
              )
            }
            className="w-24 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-brand-500 text-zinc-100 text-sm font-mono"
          />
          <p className="text-[10px] text-zinc-600">
            Cuántos vehículos puedes atender en el mismo horario (un slot
            desaparece para los clientes cuando se llena).
          </p>
        </div>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="w-full px-4 py-2.5 bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Repeat className="w-4 h-4" />}
        Guardar horario y generar agenda
      </button>

      <p className="text-[10px] text-zinc-600">
        Los bloques ya generados no se duplican y los que borres manualmente se respetan.
        Al acercarse la fecha se genera agenda nueva automáticamente.
      </p>
    </form>
  );
}

export default function WorkshopSchedulePage() {
  const { workshop, loading: loadingWorkshop, error: workshopError } = useWorkshopProfile();
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Formulario de bloque
  const [fecha, setFecha] = useState(todayPlus(1));
  const [horaInicio, setHoraInicio] = useState('08:00');
  const [horaFin, setHoraFin] = useState('12:00');
  const [slotMinutes, setSlotMinutes] = useState(30);
  const [saving, setSaving] = useState(false);

  // Copiar a rango
  const [showCopy, setShowCopy] = useState(false);
  const [sourceFecha, setSourceFecha] = useState('');
  const [fromDate, setFromDate] = useState(todayPlus(1));
  const [toDate, setToDate] = useState(todayPlus(30));
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([1, 2, 3, 4, 5]);
  const [copying, setCopying] = useState(false);

  const load = async () => {
    if (!workshop) return;
    try {
      setLoading(true);
      const [b, a] = await Promise.all([
        api.get(`/workshops/me/availability?from=${todayPlus(-1)}&to=${todayPlus(60)}`),
        api.get(`/workshops/me/appointments?from=${todayPlus(-1)}&to=${todayPlus(60)}`),
      ]);
      setBlocks(b.data || []);
      setAppointments(a.data || []);
    } catch (err) {
      console.error('Error loading agenda:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (workshop) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workshop]);

  const notify = (type: 'success' | 'error', text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 4000);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/workshops/me/availability', {
        fecha: `${fecha}T12:00:00Z`,
        horaInicio,
        horaFin,
        slotMinutes,
      });
      notify('success', 'Bloque de horario creado');
      await load();
    } catch (err: any) {
      notify('error', err.response?.data?.message || 'No se pudo crear el bloque');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBlock = async (id: string) => {
    try {
      await api.delete(`/workshops/me/availability/${id}`);
      await load();
    } catch (err: any) {
      notify('error', err.response?.data?.message || 'No se pudo eliminar');
    }
  };

  const handleCopy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceFecha) {
      notify('error', 'Selecciona el día modelo a copiar');
      return;
    }
    setCopying(true);
    try {
      const res = await api.post('/workshops/me/availability/copy', {
        sourceFecha: `${sourceFecha}T12:00:00Z`,
        fromDate,
        toDate,
        daysOfWeek,
      });
      notify('success', `Se crearon ${res.data.created} bloques en el rango`);
      setShowCopy(false);
      await load();
    } catch (err: any) {
      notify('error', err.response?.data?.message || 'No se pudo copiar el rango');
    } finally {
      setCopying(false);
    }
  };

  const handleCancelAppt = async (id: string) => {
    try {
      await api.delete(`/workshops/me/appointments/${id}`);
      notify('success', 'Cita cancelada. El horario vuelve a estar libre');
      await load();
    } catch (err: any) {
      notify('error', err.response?.data?.message || 'No se pudo cancelar la cita');
    }
  };

  const blocksByDay = useMemo(() => {
    const map = new Map<string, Block[]>();
    for (const b of blocks) {
      const key = dateKey(b.fecha);
      const list = map.get(key) || [];
      list.push(b);
      map.set(key, list);
    }
    return map;
  }, [blocks]);

  const apptsByDay = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const a of appointments) {
      const key = dateKey(a.startAt);
      const list = map.get(key) || [];
      list.push(a);
      map.set(key, list);
    }
    return map;
  }, [appointments]);

  const allDays = useMemo(() => {
    const set = new Set([...blocksByDay.keys(), ...apptsByDay.keys()]);
    return Array.from(set).sort();
  }, [blocksByDay, apptsByDay]);

  if (loading || loadingWorkshop) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (workshopError || !workshop) {
    return (
      <div className="p-8 bg-red-950/20 border border-red-800/40 rounded-2xl text-center">
        <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
        <h3 className="font-bold text-zinc-200">No se pudo cargar el perfil del taller</h3>
        <p className="text-sm text-zinc-400 mt-1">{workshopError}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
          <CalendarDays className="w-6 h-6 text-brand-400" />
          <span>Agenda de Citas</span>
        </h2>
        <p className="text-sm text-zinc-400">
          Define tu horario habitual (días y rangos) y la agenda se genera sola. Los clientes
          escogerán entre tus citas libres.
        </p>
      </div>

      {msg && (
        <div
          className={`p-3 rounded-xl flex items-center gap-2 text-sm ${
            msg.type === 'success'
              ? 'bg-emerald-950/30 border border-emerald-800/50 text-emerald-200'
              : 'bg-red-950/30 border border-red-800/50 text-red-200'
          }`}
        >
          {msg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{msg.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formularios */}
        <div className="space-y-4">
          <WeeklyScheduleCard
            horario={workshop.horario}
            capacidadInicial={workshop.capacidadSlot}
            notify={notify}
            onSaved={load}
          />

          <form onSubmit={handleCreate} className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-4">
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-zinc-400" />
              <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">Bloque puntual (un solo día)</h3>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Día</label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                min={todayPlus(0)}
                required
                className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-brand-500 text-zinc-100 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Desde
                </label>
                <input
                  type="time"
                  value={horaInicio}
                  onChange={(e) => setHoraInicio(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-brand-500 text-zinc-100 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Hasta</label>
                <input
                  type="time"
                  value={horaFin}
                  onChange={(e) => setHoraFin(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-brand-500 text-zinc-100 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Duración de cada cita</label>
              <select
                value={slotMinutes}
                onChange={(e) => setSlotMinutes(Number(e.target.value))}
                className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-brand-500 text-zinc-100 text-sm"
              >
                <option value={15}>15 minutos</option>
                <option value={30}>30 minutos</option>
                <option value={45}>45 minutos</option>
                <option value={60}>1 hora</option>
                <option value={90}>1 hora 30 minutos</option>
                <option value={120}>2 horas</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full px-4 py-2.5 bg-gradient-to-r from-zinc-700 to-zinc-600 hover:from-zinc-600 hover:to-zinc-500 text-zinc-100 font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Crear bloque
            </button>

            <button
              type="button"
              onClick={() => setShowCopy((v) => !v)}
              className="w-full px-4 py-2.5 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-zinc-300 font-semibold rounded-xl text-sm transition-all flex items-center justify-center gap-2"
            >
              <Copy className="w-4 h-4" />
              Copiar horarios a un rango de días
            </button>
          </form>

          {showCopy && (
            <form onSubmit={handleCopy} className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">Copiar agenda</h3>
                <button type="button" onClick={() => setShowCopy(false)} className="text-zinc-500 hover:text-zinc-300">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Día modelo (a copiar)</label>
                <select
                  value={sourceFecha}
                  onChange={(e) => setSourceFecha(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-brand-500 text-zinc-100 text-sm"
                >
                  <option value="">Selecciona un día con bloques...</option>
                  {Array.from(blocksByDay.keys()).sort().map((key) => {
                    const list = blocksByDay.get(key)!;
                    const d = new Date(`${key}T12:00:00Z`);
                    return (
                      <option key={key} value={key}>
                        {DAY_NAMES[d.getUTCDay()]} {d.getUTCDate()}/{d.getUTCMonth() + 1} —{' '}
                        {list.map((b) => `${b.horaInicio}-${b.horaFin}`).join(', ')}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300">Desde</label>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-brand-500 text-zinc-100 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300">Hasta</label>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-brand-500 text-zinc-100 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Días a incluir</label>
                <div className="flex flex-wrap gap-1.5">
                  {DAY_NAMES.map((name, idx) => {
                    const active = daysOfWeek.includes(idx);
                    return (
                      <button
                        key={name}
                        type="button"
                        onClick={() =>
                          setDaysOfWeek((d) =>
                            d.includes(idx) ? d.filter((x) => x !== idx) : [...d, idx].sort()
                          )
                        }
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${
                          active
                            ? 'bg-brand-500/15 border-brand-500/40 text-brand-300'
                            : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-700'
                        }`}
                      >
                        {name}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-zinc-600">
                  Sin selección = todos los días del rango. Puedes copiar hasta 365 días (meses de citas).
                </p>
              </div>

              <button
                type="submit"
                disabled={copying}
                className="w-full px-4 py-2.5 bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {copying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
                Copiar al rango
              </button>
            </form>
          )}
        </div>

        {/* Agenda por día */}
        <div className="lg:col-span-2 space-y-4">
          {allDays.length === 0 ? (
            <div className="p-12 bg-zinc-900/30 border border-zinc-800/80 border-dashed rounded-3xl text-center">
              <div className="w-16 h-16 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-4 text-zinc-500">
                <CalendarDays className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-zinc-300 text-base">Tu agenda está vacía</h3>
              <p className="text-zinc-500 text-sm mt-1 max-w-sm mx-auto">
                Define tu horario habitual (días y rangos) en la tarjeta de la izquierda: la agenda
                se generará sola y los clientes podrán escoger sus citas.
              </p>
            </div>
          ) : (
            allDays.map((key) => {
              const dayBlocks = blocksByDay.get(key) || [];
              const dayAppts = apptsByDay.get(key) || [];
              const d = new Date(`${key}T12:00:00Z`);
              return (
                <div key={key} className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-800/60">
                    <h3 className="text-sm font-bold text-zinc-200 capitalize flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-brand-400" />
                      {DAY_NAMES[d.getUTCDay()]} {d.getUTCDate()} de{' '}
                      {d.toLocaleDateString('es-BO', { month: 'long', timeZone: 'America/La_Paz' })}
                    </h3>
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                      {dayAppts.length} citas · {dayBlocks.length} bloques
                    </span>
                  </div>

                  {dayAppts.length > 0 && (
                    <div className="space-y-2">
                      {dayAppts.map((a) => (
                        <div
                          key={a.id}
                          className="p-3 bg-brand-500/5 border border-brand-500/20 rounded-xl flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-xs font-mono font-bold text-brand-300 shrink-0">
                              {new Date(a.startAt).toLocaleTimeString('es-BO', {
                                timeZone: 'America/La_Paz',
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: false,
                              })}
                            </span>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-zinc-200 truncate flex items-center gap-1.5">
                                <UserIcon className="w-3.5 h-3.5 text-zinc-500" />
                                {a.request?.user?.name || 'Cliente'}
                              </p>
                              {a.request?.vehicle && (
                                <p className="text-[11px] text-zinc-500 truncate flex items-center gap-1.5">
                                  <Car className="w-3 h-3" />
                                  {a.request.vehicle.marca} {a.request.vehicle.modelo}
                                  {a.request.vehicle.placa ? ` · ${a.request.vehicle.placa}` : ''}
                                </p>
                              )}
                              {a.request?.titulo && (
                                <p className="text-[10px] text-zinc-600 truncate">{a.request.titulo}</p>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => handleCancelAppt(a.id)}
                            className="text-[11px] font-bold text-red-400 hover:text-red-300 shrink-0 flex items-center gap-1"
                          >
                            <X className="w-3.5 h-3.5" />
                            Cancelar
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {dayBlocks.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {dayBlocks.map((b) => (
                        <span
                          key={b.id}
                          className="group inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-[11px] text-zinc-300 font-mono"
                        >
                          {b.horaInicio} – {b.horaFin}
                          <span className="text-zinc-600">({b.slotMinutes}m)</span>
                          <button
                            onClick={() => handleDeleteBlock(b.id)}
                            className="text-zinc-600 hover:text-red-400 transition-colors"
                            aria-label="Eliminar bloque"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}

          <div className="p-4 bg-zinc-900/40 border border-zinc-800/60 rounded-2xl flex items-start gap-3 text-[11px] text-zinc-500">
            <Inbox className="w-4 h-4 text-zinc-600 shrink-0 mt-0.5" />
            <p>
              Los bloques definen tus horarios de atención; cada cita del cliente ocupa un slot
              dentro de ellos. Si cancelas una cita, ese slot vuelve a estar disponible
              automáticamente.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
