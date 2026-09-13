'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import { Loader2 } from 'lucide-react';

function AdminProtectedShell({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isLoginPage = pathname === '/admin/login';

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated && !isLoginPage) {
        router.push('/admin/login');
      } else if (isAuthenticated && isLoginPage) {
        router.push('/admin');
      }
    }
  }, [isAuthenticated, isLoading, isLoginPage, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
          <span className="text-xs font-semibold text-slate-500">Carregando painel administrativo...</span>
        </div>
      </div>
    );
  }

  // Página de login é renderizada sem a sidebar administrativa
  if (isLoginPage) {
    return <>{children}</>;
  }

  // Se não estiver autenticado e ainda não completou o redirect, exibe loading
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 dark:bg-[#080c14] dark:text-slate-100">
      <AdminSidebar />
      <div className="flex flex-1 flex-col overflow-x-hidden">
        <AdminHeader />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AdminProtectedShell>{children}</AdminProtectedShell>
    </AuthProvider>
  );
}
