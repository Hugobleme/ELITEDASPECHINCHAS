'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Lock, User, ShieldAlert, ArrowRight } from 'lucide-react';
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
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-slate-50 to-amber-50/20 p-4 dark:from-[#070709] dark:via-[#111116] dark:to-[#070709]">
      {/* Theme Toggle Top Right */}
      <div className="absolute right-6 top-6">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md">
        {/* Card do Formulário */}
        <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xl sm:p-8 dark:border-amber-500/20 dark:bg-[#111116]">
          {/* Logo Oficial e Título */}
          <div className="flex flex-col items-center text-center">
            <div className="relative h-16 w-16 rounded-full overflow-hidden ring-2 ring-amber-400/80 shadow-lg shadow-amber-500/25 bg-black">
              <Image
                src="/logo.png"
                alt="Elite das Pechinchas Logo"
                fill
                sizes="64px"
                className="object-cover"
                priority
              />
            </div>
            <h2 className="mt-4 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Painel de Curadoria
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
              Acesso restrito para moderação e auditoria de promoções
            </p>
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
              <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300">
                Usuário ou E-mail
              </label>
              <div className="relative mt-1.5 flex items-center">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-xs font-medium text-slate-900 focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-white/[0.08] dark:bg-[#070709] dark:text-zinc-100"
                />
                <User className="absolute left-3.5 h-4 w-4 text-slate-400" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300">
                Senha
              </label>
              <div className="relative mt-1.5 flex items-center">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-xs font-medium text-slate-900 focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-white/[0.08] dark:bg-[#070709] dark:text-zinc-100"
                />
                <Lock className="absolute left-3.5 h-4 w-4 text-slate-400" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 py-3 text-sm font-black text-slate-950 shadow-lg shadow-amber-500/25 transition-all hover:from-amber-400 hover:to-yellow-300 active:scale-95 disabled:opacity-50 cursor-pointer"
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
