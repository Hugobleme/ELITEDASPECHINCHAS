'use client';

import React from 'react';
import Link from 'next/link';
import { useUserAuth } from '@/contexts/UserAuthContext';
import { useFavorites } from '@/hooks/useFavorites';
import OfferCard from '@/components/OfferCard';
import OfferCardSkeleton from '@/components/OfferCardSkeleton';
import { Heart, Sparkles, ArrowRight, LogIn } from 'lucide-react';

export default function FavoritosPage() {
  const { isAuthenticated, openAuthModal, isLoading: isAuthLoading } = useUserAuth();
  const { data: favorites = [], isLoading: isFavsLoading } = useFavorites();

  const validOffers = favorites
    .map((f) => f.offer)
    .filter((offer): offer is NonNullable<typeof offer> => !!offer);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Cabeçalho */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-6 dark:border-slate-800/80">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500 dark:bg-rose-500/20 shadow-sm">
              <Heart className="h-5 w-5 fill-rose-500" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Meus Favoritos
            </h1>
          </div>
          <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">
            Acompanhe suas promoções salvas e garanta os melhores preços antes que acabem.
          </p>
        </div>

        {isAuthenticated && (
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-50 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-900/50 text-xs font-bold text-rose-700 dark:text-rose-300 w-fit">
            <span>{validOffers.length} {validOffers.length === 1 ? 'oferta salva' : 'ofertas salvas'}</span>
          </div>
        )}
      </div>

      {/* Não Autenticado */}
      {!isAuthenticated && !isAuthLoading && (
        <div className="mx-auto max-w-md my-12 p-8 text-center rounded-3xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900/90 shadow-card">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-500 shadow-inner">
            <Heart className="h-8 w-8 fill-current" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            Acesse seus Favoritos
          </h2>
          <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
            Crie sua conta gratuita ou faça login para salvar promoções e sincronizá-las em qualquer dispositivo.
          </p>
          <button
            type="button"
            onClick={() => openAuthModal('login')}
            className="w-full inline-flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-sm shadow-md shadow-orange-500/25 transition-all cursor-pointer active:scale-95"
          >
            <LogIn className="w-4 h-4" />
            <span>Fazer Login ou Cadastrar</span>
          </button>
        </div>
      )}

      {/* Loading */}
      {(isAuthLoading || (isAuthenticated && isFavsLoading)) && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <OfferCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Vazio (Logado mas sem favoritos) */}
      {isAuthenticated && !isFavsLoading && validOffers.length === 0 && (
        <div className="mx-auto max-w-md my-12 p-6 sm:p-8 text-center rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/60 dark:bg-slate-900/40">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400">
            <Heart className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1.5">
            Nenhuma oferta favoritada ainda
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
            Ao navegar pelas ofertas, clique no ícone de coração em qualquer card para guardar suas pechinchas preferidas nesta lista.
          </p>
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs sm:text-sm transition-all shadow-md shadow-orange-500/20 active:scale-95 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Explorar Promoções do Dia</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Lista de Favoritos */}
      {isAuthenticated && !isFavsLoading && validOffers.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {validOffers.map((offer) => (
            <OfferCard key={offer.id} offer={offer} />
          ))}
        </div>
      )}
    </div>
  );
}
