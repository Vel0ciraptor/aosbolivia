'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '../../store/useAuthStore';
import { User, Mail, Phone, KeyRound, AlertCircle, ArrowRight, Car, Settings, ShieldAlert, Wrench, Truck } from 'lucide-react';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'CLIENT' | 'PROVIDER' | 'WORKSHOP' | 'TOW_SERVICE'>('CLIENT');
  const [formError, setFormError] = useState<string | null>(null);

  const { register, isLoading, error, isAuthenticated, checkAuth } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name || !email || !password) {
      setFormError('Por favor complete los campos requeridos (Nombre, Correo y Contraseña)');
      return;
    }

    if (password.length < 6) {
      setFormError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    try {
      await register({
        name,
        email,
        phone: phone || undefined,
        password,
        role,
      });
    } catch (err: any) {
      // Error handled by store
    }
  };

  const roles = [
    {
      id: 'CLIENT' as const,
      title: 'Cliente',
      desc: 'Quiero buscar repuestos y contratar talleres/grúas.',
      icon: Car,
      color: 'from-blue-500 to-indigo-500',
    },
    {
      id: 'PROVIDER' as const,
      title: 'Proveedor',
      desc: 'Vendo repuestos y quiero enviar cotizaciones.',
      icon: Settings,
      color: 'from-amber-500 to-orange-500',
    },
    {
      id: 'WORKSHOP' as const,
      title: 'Taller Mecánico',
      desc: 'Ofrezco servicios de reparación y mantenimiento.',
      icon: Wrench,
      color: 'from-emerald-500 to-teal-500',
    },
    {
      id: 'TOW_SERVICE' as const,
      title: 'Servicio de Grúa',
      desc: 'Presto asistencia de remolque y traslado.',
      icon: Truck,
      color: 'from-rose-500 to-red-500',
    },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-100 relative overflow-hidden py-12 px-4 font-sans">
      {/* Background Gradients */}
      <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-emerald-900/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-indigo-900/20 rounded-full blur-[120px]" />

      <div className="w-full max-w-2xl p-8 bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-3xl shadow-2xl relative z-10">
        
        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-gradient-to-tr from-indigo-500 to-emerald-400 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-3">
            <Car className="w-6 h-6 text-zinc-950 font-bold" />
          </div>
          <h2 className="text-3xl font-extrabold bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
            Crea tu Cuenta
          </h2>
          <p className="text-sm text-zinc-500 mt-1">Únete a la red de servicios automotrices RepuestoIA</p>
        </div>

        {/* Errors */}
        {(formError || error) && (
          <div className="mb-6 p-4 bg-red-950/30 border border-red-800/50 rounded-2xl flex items-start gap-3 text-red-200 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-400 mt-0.5" />
            <span>{formError || error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* Step 1: Select Role */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-zinc-300 block mb-2">Selecciona tu Rol</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {roles.map((r) => {
                const IconComponent = r.icon;
                const isSelected = role === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setRole(r.id)}
                    className={`p-4 rounded-2xl border text-left flex items-start gap-4 transition-all duration-200 ${
                      isSelected 
                        ? 'bg-zinc-800/80 border-indigo-500 shadow-md shadow-indigo-500/5 scale-[1.01]' 
                        : 'bg-zinc-950/40 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/30'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${r.color} flex items-center justify-center shrink-0`}>
                      <IconComponent className="w-5 h-5 text-zinc-950" />
                    </div>
                    <div>
                      <h4 className="font-bold text-zinc-200 text-sm">{r.title}</h4>
                      <p className="text-xs text-zinc-500 mt-0.5">{r.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="h-px bg-zinc-800/50 my-6" />

          {/* Step 2: Form Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300 block">Nombre Completo *</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Juan Pérez"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-zinc-950 border border-zinc-800 rounded-2xl focus:outline-none focus:border-indigo-500 text-zinc-100 transition-colors placeholder:text-zinc-600"
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300 block">Correo Electrónico *</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <input
                  type="email"
                  placeholder="juan@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-zinc-950 border border-zinc-800 rounded-2xl focus:outline-none focus:border-indigo-500 text-zinc-100 transition-colors placeholder:text-zinc-600"
                />
              </div>
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300 block">Teléfono (Opcional)</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <input
                  type="text"
                  placeholder="+58 412 1234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-zinc-950 border border-zinc-800 rounded-2xl focus:outline-none focus:border-indigo-500 text-zinc-100 transition-colors placeholder:text-zinc-600"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300 block">Contraseña *</label>
              <div className="relative">
                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <input
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-zinc-950 border border-zinc-800 rounded-2xl focus:outline-none focus:border-indigo-500 text-zinc-100 transition-colors placeholder:text-zinc-600"
                />
              </div>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 bg-gradient-to-r from-indigo-500 to-emerald-500 hover:from-indigo-600 hover:to-emerald-600 text-zinc-950 font-bold rounded-2xl shadow-lg transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 mt-4"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                Registrarse <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-zinc-500">
          ¿Ya tienes una cuenta?{' '}
          <Link href="/login" className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors">
            Inicia sesión aquí
          </Link>
        </div>

      </div>
    </div>
  );
}
