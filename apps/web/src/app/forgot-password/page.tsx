'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { api } from '../../lib/api';
import { Mail, AlertCircle, ArrowRight, Car, CheckCircle2, ArrowLeft } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!email) {
      setFormError('Ingresa tu correo electrónico');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email });
      setSent(true);
      if (res.data?.devResetUrl) {
        setDevResetUrl(res.data.devResetUrl);
      }
    } catch (err: any) {
      setFormError(
        err.response?.data?.message || 'No se pudo procesar la solicitud. Intenta de nuevo.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-100 relative overflow-hidden font-sans">
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-indigo-900/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-emerald-900/20 rounded-full blur-[120px]" />

      <div className="w-full max-w-md p-8 bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-3xl shadow-2xl relative z-10 mx-4">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-gradient-to-tr from-indigo-500 to-emerald-400 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-3">
            <Car className="w-6 h-6 text-zinc-950 font-bold" />
          </div>
          <h2 className="text-2xl font-extrabold bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
            ¿Olvidaste tu contraseña?
          </h2>
          <p className="text-sm text-zinc-500 mt-1 text-center">
            Te enviaremos un enlace para restablecerla
          </p>
        </div>

        {formError && (
          <div className="mb-6 p-4 bg-red-950/30 border border-red-800/50 rounded-2xl flex items-start gap-3 text-red-200 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-400 mt-0.5" />
            <span>{formError}</span>
          </div>
        )}

        {sent ? (
          <div className="space-y-6 text-center">
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            {devResetUrl ? (
              <>
                <p className="text-sm text-zinc-300 leading-relaxed">
                  Modo desarrollo: aún no hay un servicio de correo configurado, así que usa este
                  enlace directamente:
                </p>
                <a
                  href={devResetUrl}
                  className="block p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-mono text-indigo-300 hover:text-indigo-200 hover:border-indigo-500/50 break-all transition-colors"
                >
                  {devResetUrl}
                </a>
              </>
            ) : (
              <p className="text-sm text-zinc-300 leading-relaxed">
                Si existe una cuenta con <span className="font-bold text-white">{email}</span>,
                recibirás un correo con instrucciones para restablecer tu contraseña.
                <br />
                <span className="text-zinc-500 text-xs">Revisa también la carpeta de spam.</span>
              </p>
            )}
            <Link
              href="/login"
              className="inline-flex py-3 px-6 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 font-bold rounded-2xl transition-all border border-zinc-800"
            >
              Volver a iniciar sesión
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300 block">Correo Electrónico</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <input
                  type="email"
                  placeholder="correo@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-zinc-950 border border-zinc-800 rounded-2xl focus:outline-none focus:border-indigo-500 text-zinc-100 transition-colors placeholder:text-zinc-600"
                  autoFocus
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-indigo-500 to-emerald-500 hover:from-indigo-600 hover:to-emerald-600 text-zinc-950 font-bold rounded-2xl shadow-lg transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  Enviar enlace <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        <div className="mt-8 text-center text-sm text-zinc-500">
          <Link href="/login" className="inline-flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 font-semibold transition-colors">
            <ArrowLeft className="w-4 h-4" /> Volver a iniciar sesión
          </Link>
        </div>
      </div>
    </div>
  );
}
