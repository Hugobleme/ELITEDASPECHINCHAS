'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Inbox, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function AdminSourcesPage() {
  const router = useRouter();

  useEffect(() => {
    // Redireciona automaticamente para a fila de ofertas
    const timer = setTimeout(() => {
      router.replace('/admin/ofertas');
    }, 3000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="mx-auto max-w-xl py-12 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 dark:bg-amber-500/20 border border-amber-500/20">
        <CheckCircle2 className="h-8 w-8" />
      </div>
      <h2 className="mt-4 text-xl font-black text-slate-900 dark:text-white">
        Foco Exclusivo no Catálogo Web
      </h2>
      <p className="mt-2 text-xs text-slate-500 dark:text-zinc-400">
        As integrações com canais e bots externos foram desativadas. O gerenciamento de ofertas agora é realizado diretamente na Fila de Curadoria e no cadastro autônomo da vitrine.
      </p>
      <div className="mt-6">
        <Link
          href="/admin/ofertas"
          className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 px-5 py-2.5 text-xs font-black text-slate-950 shadow-md shadow-amber-500/20 hover:from-amber-400 hover:to-yellow-300"
        >
          <Inbox className="h-4 w-4" />
          <span>Ir para Fila de Ofertas</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
