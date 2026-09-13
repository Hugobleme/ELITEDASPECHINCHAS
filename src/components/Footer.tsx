'use client';

import React from 'react';
import Link from 'next/link';
import { Flame, ShieldCheck, Heart, Sparkles, Send, Bell } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="mt-24 border-t border-slate-200/80 bg-slate-50/50 text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
      {/* Telegram Community Invite Banner */}
      <div className="border-b border-slate-200/80 bg-white/70 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/60">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-6 sm:flex-row sm:px-6">
          <div className="flex items-center gap-3.5 text-center sm:text-left">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400">
              <Send className="h-5 w-5 stroke-[2.5]" />
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-900 dark:text-white">
                Receba ofertas e bugs de preço em tempo real
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Canal exclusivo no Telegram para quem quer economizar de verdade antes que esgote.
              </p>
            </div>
          </div>
          <a
            href="https://t.me"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-5 py-2.5 text-xs font-black text-white shadow-md shadow-sky-500/20 transition-all hover:bg-sky-600 active:scale-95"
          >
            <Bell className="h-4 w-4" />
            <span>Entrar no Grupo VIP</span>
          </a>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
          {/* Coluna 1: Sobre */}
          <div className="space-y-4 md:col-span-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 text-white shadow-glow-brand">
                <Flame className="h-5 w-5 fill-white stroke-white" />
              </div>
              <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                ELITEDAS<span className="text-orange-500">PECHINCHAS</span>
              </span>
            </div>
            <p className="max-w-md text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              O agregador definitivo de promoções e cupons da internet brasileira. Monitoramos continuamente os maiores e-commerces para garantir que você só pague o menor preço histórico em produtos verificados.
            </p>
            <div className="flex items-center gap-2 pt-1 text-xs font-semibold text-slate-400">
              <span>Feito com</span>
              <Heart className="h-3.5 w-3.5 fill-red-500 text-red-500 animate-pulse" />
              <span>para a comunidade de caçadores de ofertas</span>
            </div>
          </div>

          {/* Coluna 2: Lojas Populares */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-200">
              Lojas Populares
            </h4>
            <ul className="space-y-2 text-xs font-medium">
              <li>
                <Link href="/loja/amazon" className="transition-colors hover:text-orange-500">
                  Ofertas Amazon
                </Link>
              </li>
              <li>
                <Link href="/loja/mercado-livre" className="transition-colors hover:text-orange-500">
                  Mercado Livre
                </Link>
              </li>
              <li>
                <Link href="/loja/kabum" className="transition-colors hover:text-orange-500">
                  Kabum Gamer
                </Link>
              </li>
              <li>
                <Link href="/loja/magalu" className="transition-colors hover:text-orange-500">
                  Magazine Luiza
                </Link>
              </li>
              <li>
                <Link href="/loja/shopee" className="transition-colors hover:text-orange-500">
                  Shopee Oficial
                </Link>
              </li>
            </ul>
          </div>

          {/* Coluna 3: Categorias */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-200">
              Categorias
            </h4>
            <ul className="space-y-2 text-xs font-medium">
              <li>
                <Link href="/categoria/eletronicos" className="transition-colors hover:text-orange-500">
                  Eletrônicos & Celulares
                </Link>
              </li>
              <li>
                <Link href="/categoria/informatica" className="transition-colors hover:text-orange-500">
                  Informática & Hardware
                </Link>
              </li>
              <li>
                <Link href="/categoria/games" className="transition-colors hover:text-orange-500">
                  Games & Consoles
                </Link>
              </li>
              <li>
                <Link href="/categoria/casa-e-cozinha" className="transition-colors hover:text-orange-500">
                  Casa & Eletrodomésticos
                </Link>
              </li>
              <li>
                <Link href="/categoria/tv-e-audio" className="transition-colors hover:text-orange-500">
                  Smart TVs & Áudio
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Transparency Notice */}
        <div className="mt-10 rounded-2xl border border-slate-200/80 bg-white/60 p-4 dark:border-slate-800/80 dark:bg-slate-900/40">
          <div className="flex items-start sm:items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400">
            <ShieldCheck className="h-4 w-4 shrink-0 text-orange-500 mt-0.5 sm:mt-0" />
            <p className="leading-relaxed">
              <strong className="text-slate-700 dark:text-slate-300">Transparência & Afiliados:</strong> Este site contém links de afiliados. Quando você clica e realiza uma compra através de nossas indicações, podemos receber uma pequena comissão das lojas parceiras sem absolutamente nenhum custo extra para você. Os preços exibidos dependem da disponibilidade dos lojistas.
            </p>
          </div>
        </div>

        {/* Rodapé inferior com copyright */}
        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-slate-200/80 pt-6 text-center text-xs text-slate-400 sm:flex-row dark:border-slate-800">
          <p>© {new Date().getFullYear()} Elite das Pechinchas. Todos os direitos reservados.</p>
          <div className="flex items-center gap-1.5 font-medium">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            <span>Preços e estoques sujeitos a alterações pelas lojas.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
