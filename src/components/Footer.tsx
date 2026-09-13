'use client';

import React from 'react';
import Link from 'next/link';
import { Flame, ShieldCheck, Heart, Sparkles } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
      {/* Top Banner / Transparency Notice */}
      <div className="border-b border-slate-100 bg-orange-50/50 py-4 dark:border-slate-800/80 dark:bg-orange-950/10">
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 text-center text-xs font-medium text-slate-600 dark:text-slate-400">
          <ShieldCheck className="h-4 w-4 shrink-0 text-orange-500" />
          <span>
            <strong>Aviso de Transparência:</strong> Este site contém links de afiliados. Quando você clica e realiza uma compra, podemos receber uma pequena comissão sem nenhum custo adicional para você.
          </span>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Coluna 1: Sobre */}
          <div className="space-y-3 md:col-span-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500 text-white">
                <Flame className="h-5 w-5 fill-white stroke-white" />
              </div>
              <span className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
                ELITEDAS<span className="text-orange-500">PECHINCHAS</span>
              </span>
            </div>
            <p className="max-w-md text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              O seu agregador inteligente de promoções e cupons da internet. Monitoramos os maiores e-commerces do Brasil para trazer ofertas reais com desconto verificado todos os dias.
            </p>
            <div className="flex items-center gap-2 pt-2 text-xs font-medium text-slate-400">
              <span>Feito com</span>
              <Heart className="h-3.5 w-3.5 fill-red-500 text-red-500" />
              <span>para caçadores de promoções</span>
            </div>
          </div>

          {/* Coluna 2: Lojas Populares */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-200">
              Lojas Populares
            </h4>
            <ul className="space-y-1.5 text-xs">
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
                  Kabum
                </Link>
              </li>
              <li>
                <Link href="/loja/magalu" className="transition-colors hover:text-orange-500">
                  Magazine Luiza
                </Link>
              </li>
              <li>
                <Link href="/loja/shopee" className="transition-colors hover:text-orange-500">
                  Shopee
                </Link>
              </li>
            </ul>
          </div>

          {/* Coluna 3: Categorias */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-200">
              Categorias
            </h4>
            <ul className="space-y-1.5 text-xs">
              <li>
                <Link href="/categoria/eletronicos" className="transition-colors hover:text-orange-500">
                  Eletrônicos & Celulares
                </Link>
              </li>
              <li>
                <Link href="/categoria/informatica" className="transition-colors hover:text-orange-500">
                  Informática & PCs
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
                  Smart TVs & Som
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Rodapé inferior com copyright */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-slate-200/80 pt-6 text-center text-xs text-slate-400 sm:flex-row dark:border-slate-800">
          <p>© {new Date().getFullYear()} Elite das Pechinchas. Todos os direitos reservados.</p>
          <div className="flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-amber-500" />
            <span>Os preços e estoques podem variar conforme a loja parceira.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
