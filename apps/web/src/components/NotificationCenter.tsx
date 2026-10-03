'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, X, CheckCheck } from 'lucide-react';
import { api } from '../lib/api';

interface Notif {
  id: string;
  tipo: string;
  titulo: string;
  mensaje: string;
  leida: boolean;
  createdAt: string;
  quoteId?: string | null;
  requestId?: string | null;
}

// ── Alarma sonora (WebAudio, sin archivos externos) ──

function beep(ctx: AudioContext) {
  const now = ctx.currentTime;
  [880, 1320].forEach((freq, i) => {
    const offset = i * 0.22;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, now + offset);
    gain.gain.exponentialRampToValueAtTime(0.25, now + offset + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.18);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + offset);
    osc.stop(now + offset + 0.2);
  });
}

export default function NotificationCenter({
  workshopId,
}: {
  workshopId?: string;
}) {
  const router = useRouter();
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notif[]>([]);
  const [toast, setToast] = useState<Notif | null>(null);

  const alarmRef = useRef<{ ctx: AudioContext; timer: ReturnType<typeof setInterval> } | null>(null);
  const prevUnread = useRef<number | null>(null);
  const audioUnlocked = useRef(false);

  const startAlarm = () => {
    if (alarmRef.current || typeof window === 'undefined') return;
    try {
      const ctx = new AudioContext();
      if (ctx.state === 'suspended') void ctx.resume();
      beep(ctx);
      const timer = setInterval(() => {
        if (ctx.state === 'running') beep(ctx);
      }, 1100);
      alarmRef.current = { ctx, timer };
    } catch {
      // navegador sin soporte: la notificación visual sigue funcionando
    }
  };

  const stopAlarm = () => {
    const a = alarmRef.current;
    if (!a) return;
    clearInterval(a.timer);
    void a.ctx.close().catch(() => undefined);
    alarmRef.current = null;
  };

  useEffect(() => {
    if (!workshopId) return;

    const unlock = () => {
      audioUnlocked.current = true;
      if (alarmRef.current && alarmRef.current.ctx.state === 'suspended') {
        void alarmRef.current.ctx.resume();
      }
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);

    const poll = async () => {
      try {
        const res = await api.get(`/notifications/workshop/${workshopId}/unread-count`);
        const count: number = res.data.count ?? 0;
        const prev = prevUnread.current;
        setUnread(count);
        if (prev !== null && count > prev) {
          // Nueva cotización (u otra notificación) aceptada → alarma
          try {
            const list = await api.get(`/notifications/workshop/${workshopId}`);
            const first = (list.data as Notif[]).find((n) => !n.leida);
            if (first) setToast(first);
          } catch {
            // el toast es best-effort
          }
          startAlarm();
        }
        prevUnread.current = count;
      } catch {
        // sin conexión: se reintenta en el próximo tick
      }
    };

    void poll();
    const timer = setInterval(poll, 10000);
    return () => {
      clearInterval(timer);
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      stopAlarm();
    };
  }, [workshopId]);

  useEffect(() => {
    if (!open || !workshopId) return;
    api
      .get(`/notifications/workshop/${workshopId}`)
      .then((res) => setItems(res.data))
      .catch(() => undefined);
  }, [open, workshopId]);

  if (!workshopId) {
    return (
      <button className="p-2 hover:bg-zinc-900 rounded-xl text-zinc-400 relative">
        <Bell className="w-5 h-5" />
      </button>
    );
  }

  const loadList = () => {
    api
      .get(`/notifications/workshop/${workshopId}`)
      .then((res) => setItems(res.data))
      .catch(() => undefined);
  };

  const openPanel = () => {
    setOpen(true);
    loadList();
  };

  const markRead = async (n: Notif) => {
    stopAlarm();
    setToast((t) => (t && t.id === n.id ? null : t));
    if (!n.leida) {
      setItems((list) => list.map((x) => (x.id === n.id ? { ...x, leida: true } : x)));
      setUnread((u) => Math.max(0, u - 1));
      try {
        await api.patch(`/notifications/${n.id}/read`);
      } catch {
        // se corregirá en el próximo polling
      }
    }
  };

  const markAllRead = async () => {
    stopAlarm();
    setToast(null);
    setItems((list) => list.map((x) => ({ ...x, leida: true })));
    setUnread(0);
    try {
      await api.patch(`/notifications/workshop/${workshopId}/read-all`);
    } catch {
      // idem
    }
  };

  const clickNotification = (n: Notif) => {
    stopAlarm();
    markRead(n);
    setOpen(false);
    if (n.quoteId) router.push('/dashboard/workshop/quotes');
  };

  return (
    <div className="relative">
      <button
        onClick={() => (open ? setOpen(false) : openPanel())}
        className="p-2 hover:bg-zinc-900 rounded-xl text-zinc-400 relative"
        aria-label="Notificaciones"
      >
        <Bell className={`w-5 h-5 ${unread > 0 ? 'text-brand-400 animate-pulse' : ''}`} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-12 z-50 w-80 max-w-[90vw] bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
              <span className="text-sm font-bold text-zinc-200">Notificaciones</span>
              <div className="flex items-center gap-2">
                {unread > 0 && (
                  <button
                    onClick={markAllRead}
                    className="flex items-center gap-1 text-[11px] font-semibold text-brand-400 hover:text-brand-300"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Marcar todas
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="text-zinc-500 hover:text-zinc-300">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {items.length === 0 ? (
                <p className="p-4 text-sm text-zinc-500">Sin notificaciones</p>
              ) : (
                items.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => clickNotification(n)}
                    className={`w-full text-left px-4 py-3 border-b border-zinc-800/60 hover:bg-zinc-800/40 transition-colors ${
                      n.leida ? 'opacity-60' : ''
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {!n.leida && <span className="mt-1.5 w-2 h-2 rounded-full bg-brand-400 shrink-0" />}
                      <div className={n.leida ? 'w-full' : 'flex-1 min-w-0'}>
                        <p className="text-xs font-bold text-zinc-200">{n.titulo}</p>
                        <p className="text-[11px] text-zinc-400 mt-0.5 leading-snug">{n.mensaje}</p>
                        <p className="text-[10px] text-zinc-600 mt-1">
                          {new Date(n.createdAt).toLocaleString('es-BO', {
                            timeZone: 'America/La_Paz',
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* Toast de alarma */}
      {toast && (
        <div
          onClick={() => {
            stopAlarm();
            setToast(null);
            openPanel();
          }}
          className="fixed top-20 right-4 z-50 w-80 max-w-[90vw] bg-zinc-900 border border-brand-600/60 rounded-2xl shadow-2xl shadow-brand-500/10 p-4 cursor-pointer animate-in slide-in-from-right duration-300"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-extrabold text-brand-400 flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 animate-pulse" />
                {toast.titulo}
              </p>
              <p className="text-[11px] text-zinc-300 mt-1 leading-snug">{toast.mensaje}</p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                stopAlarm();
                setToast(null);
              }}
              className="text-zinc-500 hover:text-zinc-300 shrink-0"
              aria-label="Silenciar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[10px] text-zinc-500 mt-2">Haz clic para ver</p>
        </div>
      )}
    </div>
  );
}
