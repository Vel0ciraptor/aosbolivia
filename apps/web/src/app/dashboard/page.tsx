'use client';

import React, { useEffect } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import ClientDashboard from './client/ClientDashboard';
import ProviderDashboard from './provider/ProviderDashboard';
import WorkshopDashboard from './workshop/WorkshopDashboard';
import TowDashboard from './tow/TowDashboard';
import AdminDashboard from './admin/AdminDashboard';

export default function DashboardHome() {
  const { user, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (!user) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  switch (user.role) {
    case 'CLIENT':
      return <ClientDashboard />;
    case 'PROVIDER':
      return <ProviderDashboard />;
    case 'WORKSHOP':
      return <WorkshopDashboard />;
    case 'TOW_SERVICE':
      return <TowDashboard />;
    case 'ADMIN':
      return <AdminDashboard />;
    default:
      return (
        <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl">
          <h2 className="text-xl font-bold text-zinc-100 mb-2">Panel Administrativo</h2>
          <p className="text-sm text-zinc-400">Bienvenido al sistema administrativo central de RepuestoIA. Selecciona una sección de la barra lateral.</p>
        </div>
      );
  }
}
