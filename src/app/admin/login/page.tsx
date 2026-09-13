'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Flame, Lock, User, ShieldAlert, ArrowRight, CheckCircle2 } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';

export default function AdminLoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const res = await login(username, password);
      if (res.success) {
        router.push('/admin');
      } else {
        setError(res.error || 'Credenciais inválidas. Tente novamente.');
      }
    } catch {
      setError('Erro ao autenticar. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-slate-50 to-violet-50/40 p-4 dark:from-[#09090c] dark:via-[#111116] dark:to-violet-950/20">
      {/* Theme Toggle Top Right */}
      <div className="absolute right-6 top-6">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md">
        {/* Card do Formulário */}
        <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xl sm:p-8 dark:border-slate-800 dark:bg-[#121217]">
          {/* Logo e Título */}
          <div className="flex flex-col items-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/30">
              <Flame className="h-7 w-7 fill-white stroke-white" />
            </div>
            <h2 className="mt-4 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Painel de Curadoria
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Acesso restrito para moderação e auditoria de promoções
            </p>
          </div>

          {/* Dica de Credenciais Padrão para Testes */}
          <div className="mt-6 rounded-2xl border border-violet-200/80 bg-violet-50/80 p-3.5 text-xs text-violet-900 dark:border-violet-900/40 dark:bg-violet-950/30 dark:text-violet-300">
            <div className="flex items-center gap-1.5 font-bold">
              <CheckCircle2 className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              <span>Acesso Rápido para Demonstração:</span>
            </div>
            <div className="mt-1.5 flex justify-between font-mono text-[11px] text-slate-700 dark:text-slate-300">
              <span>Usuário: <strong>admin</strong></span>
              <span>Senha: <strong>admin123</strong></span>
            </div>
          </div>

          {/* Mensagem de Erro */}
          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-600 dark:bg-red-950/40 dark:text-red-400">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Usuário ou E-mail
              </label>
              <div className="relative mt-1.5 flex items-center">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-xs font-medium text-slate-900 focus:border-violet-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                />
                <User className="absolute left-3.5 h-4 w-4 text-slate-400" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Senha
              </label>
              <div className="relative mt-1.5 flex items-center">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-xs font-medium text-slate-900 focus:border-violet-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                />
                <Lock className="absolute left-3.5 h-4 w-4 text-slate-400" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 py-3 text-sm font-bold text-white shadow-lg shadow-violet-500/25 transition-all hover:from-violet-500 hover:to-fuchsia-500 active:scale-95 disabled:opacity-50"
            >
              <span>{isSubmitting ? 'Verificando...' : 'Entrar no Painel'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
