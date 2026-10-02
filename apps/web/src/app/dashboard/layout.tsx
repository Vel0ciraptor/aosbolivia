'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '../../store/useAuthStore';
import { api } from '../../lib/api';
import {
  Car, Settings, Wrench, Truck, LogOut, LayoutDashboard,
  MessageSquareCode, FileText, ClipboardList, PlusCircle,
  Menu, X, User as UserIcon, Shield, Users, Store, Package,
  KeyRound, Eye, EyeOff, CalendarDays,
} from 'lucide-react';
import Link from 'next/link';
import NotificationCenter from '../../components/NotificationCenter';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading, logout, checkAuth } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showChangePwd, setShowChangePwd] = useState(false);
  const [pwdCurrent, setPwdCurrent] = useState('');
  const [pwdNew, setPwdNew] = useState('');
  const [pwdShow, setPwdShow] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || !isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-100 font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-zinc-500 text-sm">Cargando aplicación...</span>
        </div>
      </div>
    );
  }

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const isWorkshopUser = (user.role as string) === 'WORKSHOP_USER';

  const openChangePwd = () => {
    setPwdCurrent('');
    setPwdNew('');
    setPwdMsg(null);
    setShowChangePwd(true);
  };

  const handleChangePwd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwdNew.length < 6) {
      setPwdMsg({ type: 'error', text: 'La nueva contraseña debe tener al menos 6 caracteres' });
      return;
    }
    setPwdLoading(true);
    setPwdMsg(null);
    try {
      await api.post('/workshops/me/change-password', {
        currentPassword: pwdCurrent,
        newPassword: pwdNew,
      });
      setPwdMsg({ type: 'success', text: 'Contraseña actualizada correctamente' });
      setTimeout(() => {
        setShowChangePwd(false);
        setPwdMsg(null);
      }, 1500);
    } catch (err: any) {
      setPwdMsg({
        type: 'error',
        text: err.response?.data?.message || 'No se pudo cambiar la contraseña',
      });
    } finally {
      setPwdLoading(false);
    }
  };

  // Define sidebar items based on role
  const getNavItems = () => {
    const base = [
      { name: 'Inicio', href: '/dashboard', icon: LayoutDashboard }
    ];

    if (user.role === 'CLIENT') {
      return [
        ...base,
        { name: 'Mis Vehículos', href: '/dashboard/client/vehicles', icon: Car },
        { name: 'Crear Solicitud', href: '/dashboard/client/new-request', icon: PlusCircle },
        { name: 'Mis Solicitudes', href: '/dashboard/client/requests', icon: ClipboardList }
      ];
    }

    if (user.role === 'PROVIDER') {
      return [
        ...base,
        { name: 'Solicitudes', href: '/dashboard/provider/requests', icon: ClipboardList },
        { name: 'Mis Cotizaciones', href: '/dashboard/provider/quotes', icon: MessageSquareCode },
        { name: 'Mi Catálogo', href: '/dashboard/provider/catalog', icon: Settings },
        { name: 'Perfil del Negocio', href: '/dashboard/provider/profile', icon: FileText }
      ];
    }

    if (user.role === 'WORKSHOP') {
      return [
        ...base,
        { name: 'CRM', href: '/dashboard/workshop/crm', icon: Car },
        { name: 'Solicitudes', href: '/dashboard/workshop/requests', icon: ClipboardList },
        { name: 'Mis Cotizaciones', href: '/dashboard/workshop/quotes', icon: MessageSquareCode },
        { name: 'Agenda', href: '/dashboard/workshop/schedule', icon: CalendarDays },
        { name: 'Servicios', href: '/dashboard/workshop/services', icon: Wrench },
        { name: 'Inventario', href: '/dashboard/workshop/inventory', icon: Package },
        { name: 'Perfil del Taller', href: '/dashboard/workshop/profile', icon: FileText }
      ];
    }

    if ((user.role as string) === 'WORKSHOP_USER') {
      return [
        ...base,
        { name: 'CRM', href: '/dashboard/workshop/crm', icon: Car }
      ];
    }

    if (user.role === 'TOW_SERVICE') {
      return [
        ...base,
        { name: 'Solicitudes', href: '/dashboard/tow/requests', icon: ClipboardList },
        { name: 'Perfil del Servicio', href: '/dashboard/tow/profile', icon: Wrench }
      ];
    }

    if (user.role === 'ADMIN') {
      return [
        ...base,
        { name: 'Usuarios', href: '/dashboard/admin/users', icon: Users },
        { name: 'Proveedores', href: '/dashboard/admin/providers', icon: Store },
        { name: 'Talleres', href: '/dashboard/admin/workshops', icon: Wrench },
        { name: 'Grúas', href: '/dashboard/admin/tows', icon: Truck },
        { name: 'Solicitudes', href: '/dashboard/admin/requests', icon: ClipboardList },
        { name: 'Cotizaciones', href: '/dashboard/admin/quotes', icon: MessageSquareCode }
      ];
    }

    return base;
  };

  const navItems = getNavItems();

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN': return { text: 'Admin', color: 'bg-red-500/10 text-red-400 border-red-500/20' };
      case 'PROVIDER': return { text: 'Proveedor', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' };
      case 'WORKSHOP': return { text: 'Taller', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
      case 'WORKSHOP_USER': return { text: user?.workshopUserRole === 'MECANICO' ? 'Mecánico' : 'Taller', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
      case 'TOW_SERVICE': return { text: 'Grúa', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' };
      default: return { text: 'Cliente', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' };
    }
  };

  const badge = getRoleBadge(user.role);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex font-sans">
      
      {/* SIDEBAR FOR DESKTOP */}
      <aside className="w-64 border-r border-zinc-900 bg-zinc-950 flex-col justify-between hidden md:flex shrink-0">
        <div>
          {/* Logo */}
          <div className="p-6 border-b border-zinc-900 flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-tr from-indigo-500 to-emerald-400 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/10 shrink-0">
              <Car className="w-4 h-4 text-zinc-950 font-bold" />
            </div>
            <span className="font-extrabold text-lg bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
              RepuestoIA
            </span>
          </div>

          {/* Nav Items */}
          <nav className="p-4 space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all ${
                    isActive 
                      ? 'bg-zinc-900 border border-zinc-800 text-indigo-400' 
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
                  }`}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User profile & logout */}
        <div className="p-4 border-t border-zinc-900 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 text-zinc-400">
              <UserIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold truncate text-zinc-200">{user.name}</p>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${badge.color}`}>
                {badge.text}
              </span>
            </div>
          </div>

          {isWorkshopUser && (
            <button
              onClick={openChangePwd}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-emerald-400 text-sm font-semibold rounded-2xl transition-all border border-zinc-800"
            >
              <KeyRound className="w-4 h-4" />
              <span>Cambiar contraseña</span>
            </button>
          )}

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-zinc-900 hover:bg-red-950/20 hover:text-red-400 text-zinc-400 text-sm font-semibold rounded-2xl transition-all border border-zinc-800 hover:border-red-900/30"
          >
            <LogOut className="w-4 h-4" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* MOBILE HEADER */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 hover:bg-zinc-900 rounded-xl md:hidden text-zinc-400"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-bold text-zinc-200">
              {pathname === '/dashboard' ? 'Panel de Control' :
               pathname.includes('/admin/users') ? 'Gestión de Usuarios' :
               pathname.includes('/admin/providers') ? 'Proveedores' :
               pathname.includes('/admin/workshops') ? 'Talleres' :
               pathname.includes('/admin/tows') ? 'Servicios de Grúa' :
               pathname.includes('/admin/requests') ? 'Solicitudes' :
               pathname.includes('/admin/quotes') ? 'Cotizaciones' :
               pathname.includes('/provider/profile') ? 'Perfil del Negocio' :
               pathname.includes('/provider/catalog') ? 'Mi Catálogo' :
               pathname.includes('/provider/quotes') ? 'Mis Cotizaciones' :
               pathname.includes('/provider/requests') ? 'Solicitudes' :
               pathname.includes('/workshop/crm') ? 'CRM - Vehículos en Taller' :
               pathname.includes('/workshop/profile') ? 'Perfil del Taller' :
               pathname.includes('/workshop/services') ? 'Servicios del Taller' :
               pathname.includes('/workshop/quotes') ? 'Mis Cotizaciones' :
               pathname.includes('/workshop/schedule') ? 'Agenda de Citas' :
               pathname.includes('/workshop/requests') ? 'Solicitudes' :
               pathname.includes('/tow/profile') ? 'Perfil del Servicio' :
               pathname.includes('/tow/requests') ? 'Solicitudes' :
               pathname.includes('vehicles') ? 'Mis Vehículos' :
               pathname.includes('new-request') ? 'Nueva Solicitud' :
               pathname.includes('requests') ? 'Solicitudes' : 'RepuestoIA'}
            </h1>
          </div>

          {/* Header Action Bar */}
          <div className="flex items-center gap-3">
            <NotificationCenter workshopId={user.workshopId} />
            <div className="h-8 w-px bg-zinc-900" />
            <span className="text-xs text-zinc-500 hidden sm:inline-block font-semibold">
              Dev Local Mode (SQLite)
            </span>
          </div>
        </header>

        {/* MOBILE DRAWER */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 md:hidden flex">
            <div className="w-72 bg-zinc-950 h-full border-r border-zinc-900 flex flex-col justify-between p-6 animate-in slide-in-from-left duration-200">
              <div>
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-tr from-indigo-500 to-emerald-400 rounded-xl flex items-center justify-center">
                      <Car className="w-4 h-4 text-zinc-950 font-bold" />
                    </div>
                    <span className="font-extrabold text-lg text-zinc-100">
                      RepuestoIA
                    </span>
                  </div>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2 hover:bg-zinc-900 rounded-xl text-zinc-400"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <nav className="space-y-1.5">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all ${
                          isActive 
                            ? 'bg-zinc-900 border border-zinc-800 text-indigo-400' 
                            : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
                        }`}
                      >
                        <Icon className="w-5 h-5 shrink-0" />
                        <span>{item.name}</span>
                      </Link>
                    );
                  })}
                </nav>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 text-zinc-400">
                    <UserIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-zinc-200">{user.name}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${badge.color}`}>
                      {badge.text}
                    </span>
                  </div>
                </div>

                {isWorkshopUser && (
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      openChangePwd();
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-emerald-400 text-sm font-semibold rounded-2xl transition-all border border-zinc-800"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>Cambiar contraseña</span>
                  </button>
                )}

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-zinc-900 hover:bg-red-950/20 hover:text-red-400 text-zinc-400 text-sm font-semibold rounded-2xl transition-all border border-zinc-800 hover:border-red-900/30"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            </div>
            <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
          </div>
        )}

        {/* MAIN PANEL CONTENT */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* CHANGE PASSWORD MODAL */}
      {showChangePwd && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleChangePwd} className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-emerald-400" />
                Cambiar contraseña
              </h3>
              <button type="button" onClick={() => setShowChangePwd(false)} className="p-2 hover:bg-zinc-800 rounded-xl text-zinc-400 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {pwdMsg && (
              <div className={`p-3 rounded-xl text-sm flex items-center gap-2 ${
                pwdMsg.type === 'success'
                  ? 'bg-emerald-950/30 border border-emerald-800/50 text-emerald-200'
                  : 'bg-red-950/30 border border-red-800/50 text-red-200'
              }`}>
                {pwdMsg.text}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Contraseña actual *</label>
              <div className="relative">
                <input
                  type={pwdShow ? 'text' : 'password'}
                  value={pwdCurrent}
                  onChange={(e) => setPwdCurrent(e.target.value)}
                  placeholder="Tu contraseña actual"
                  required
                  minLength={6}
                  className="w-full px-4 pr-11 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-emerald-500 text-zinc-100 text-sm"
                />
                <button type="button" onClick={() => setPwdShow((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors" aria-label={pwdShow ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                  {pwdShow ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Nueva contraseña *</label>
              <div className="relative">
                <input
                  type={pwdShow ? 'text' : 'password'}
                  value={pwdNew}
                  onChange={(e) => setPwdNew(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                  minLength={6}
                  className="w-full px-4 pr-11 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-emerald-500 text-zinc-100 text-sm"
                />
                <button type="button" onClick={() => setPwdShow((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors" aria-label={pwdShow ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                  {pwdShow ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
              <button type="button" onClick={() => setShowChangePwd(false)} className="px-4 py-2.5 bg-zinc-950 border border-zinc-800 hover:bg-zinc-900 rounded-xl text-zinc-300 text-sm font-semibold transition-colors">
                Cancelar
              </button>
              <button type="submit" disabled={pwdLoading} className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-zinc-950 font-bold rounded-xl text-sm transition-all flex items-center gap-2 disabled:opacity-50">
                {pwdLoading ? <><KeyRound className="w-4 h-4 animate-spin" /><span>Guardando...</span></> : <>Guardar</>}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
