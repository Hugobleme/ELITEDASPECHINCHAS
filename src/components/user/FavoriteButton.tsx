'use client';

import React, { useState } from 'react';
import { Heart } from 'lucide-react';
import { useIsFavorite, useAddFavorite, useRemoveFavorite } from '@/hooks/useFavorites';

interface FavoriteButtonProps {
  offerId: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

function FavoriteButtonComponent({
  offerId,
  className = '',
  size = 'md',
  showLabel = false,
}: FavoriteButtonProps) {
  const isFav = useIsFavorite(offerId);
  const addMutation = useAddFavorite();
  const removeMutation = useRemoveFavorite();
  const [animating, setAnimating] = useState(false);

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setAnimating(true);
    setTimeout(() => setAnimating(false), 400);

    if (isFav) {
      removeMutation.mutate(offerId);
    } else {
      addMutation.mutate(offerId);
    }
  };

  const isLoading = addMutation.isPending || removeMutation.isPending;

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isLoading}
      title={isFav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
      className={`group relative inline-flex items-center justify-center transition-all duration-200 active:scale-90 ${
        isFav
          ? 'text-rose-500 dark:text-rose-400'
          : 'text-slate-400 hover:text-rose-500 dark:text-slate-500 dark:hover:text-rose-400'
      } ${
        animating ? 'scale-125' : 'scale-100'
      } ${className}`}
      aria-label={isFav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
    >
      <Heart
        className={`${iconSizes[size]} transition-transform duration-200 group-hover:scale-110 ${
          isFav ? 'fill-rose-500 text-rose-500' : 'fill-none'
        }`}
      />
      {showLabel && (
        <span className="ml-2 text-sm font-medium">
          {isFav ? 'Favoritado' : 'Favoritar'}
        </span>
      )}
    </button>
  );
}

export const FavoriteButton = React.memo(FavoriteButtonComponent);
