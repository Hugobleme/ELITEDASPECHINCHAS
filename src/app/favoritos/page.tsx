'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useUserAuth } from '@/contexts/UserAuthContext';
import { useFavorites } from '@/hooks/useFavorites';
import OfferCard from '@/components/OfferCard';
import OfferCardSkeleton from '@/components/OfferCardSkeleton';
import { MOCK_OFFERS } from '@/lib/mock-data';
import { mockStore } from '@/lib/api/mock-store';
import { Heart, Sparkles, ArrowRight, LogIn, ShieldCheck, ChevronRight } from 'lucide-react';

export default function FavoritosPage() {
  const { isAuthenticated, openAuthModal, isLoading: isAuthLoading } = useUserAuth();
  const { data: serverFavorites = [], isLoading: isFavsLoading } = useFavorites();

  // Se autenticado, usa dados do backend/hook; se visitante/guest, exibe favoritos mockados de demonstração
  const displayedOffers = useMemo(() => {
    if (isAuthenticated) {
      return serverFavorites
        .map((f) => f.offer)
        .filter((offer): offer is NonNullable<typeof offer> => !!offer);
    }
    // Modo visitante / mock demo
    return MOCK_OFFERS.filter((offer) => mockStore.favorites.includes(offer.id));
  }, [isAuthenticated, serverFavorites]);

  const isLoading = isAuthLoading || (isAuthenticated && isFavsLoading);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-6">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
        <Link href="/" className="hover:text-violet-600 dark:hover:text-violet-400 transition-colors">
          Início
        </Link>
        <ChevronRight className="h-3 w-3 text-slate-400" />
        <span className="font-semibold text-slate-900 dark:text-slate-200">Meus Favoritos</span>
      </nav>

      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-6 dark:border-slate-800/80">
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
            Acompanhe suas promoções salvas e garanta os melhores preços antes que esgotem.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-rose-50 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-900/50 text-xs font-bold text-rose-700 dark:text-rose-300 w-fit">
          <Heart className="h-3.5 w-3.5 fill-current" />
          <span>{displayedOffers.length} {displayedOffers.length === 1 ? 'oferta salva' : 'ofertas salvas'}</span>
        </div>
      </div>

      {/* Banner Informativo para Visitante não logado */}
      {!isAuthenticated && !isAuthLoading && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-violet-200/80 bg-violet-50/70 p-4 dark:border-violet-900/50 dark:bg-violet-950/30">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white shadow-sm">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <p className="text-xs sm:text-sm font-medium text-violet-900 dark:text-violet-200">
              Você está visualizando a demonstração da sua lista de favoritos. Conecte sua conta gratuita para sincronizar em qualquer dispositivo.
            </p>
          </div>
          <button
            type="button"
            onClick={() => openAuthModal('login')}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs transition-colors cursor-pointer shrink-0 min-h-[44px]"
          >
            <LogIn className="h-3.5 w-3.5" />
            <span>Fazer Login / Cadastrar</span>
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <OfferCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Estado Vazio */}
      {!isLoading && displayedOffers.length === 0 && (
        <div className="mx-auto max-w-md my-12 p-6 sm:p-8 text-center rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/60 dark:bg-slate-900/40">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400">
            <Heart className="h-8 w-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1.5">
            Nenhuma oferta favoritada ainda
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
            Ao navegar pelas ofertas, clique no ícone de coração em qualquer card para guardar suas pechinchas preferidas nesta lista.
          </p>
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex min-h-[44px] items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold text-xs sm:text-sm transition-all shadow-md shadow-violet-500/25 active:scale-95 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Explorar Promoções do Dia</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Grid de Ofertas Favoritas */}
      {!isLoading && displayedOffers.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {displayedOffers.map((offer) => (
            <OfferCard key={offer.id} offer={offer} />
          ))}
        </div>
      )}
    </div>
  );
}
