'use client';

import React, { useState } from 'react';
import { ExternalLink, ShoppingCart, Check, Loader2 } from 'lucide-react';
import { useTrackClick } from '@/hooks/useTrackClick';

interface AffiliateButtonProps {
  offerId: string;
  affiliateLink: string;
  storeName?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'card';
  label?: string;
  className?: string;
  showIcon?: boolean;
}

export default function AffiliateButton({
  offerId,
  affiliateLink,
  storeName,
  size = 'md',
  variant = 'primary',
  label,
  className = '',
  showIcon = true,
}: AffiliateButtonProps) {
  const { handleAffiliateClick } = useTrackClick();
  const [clicked, setClicked] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setClicked(true);
    handleAffiliateClick(offerId, affiliateLink);

    setTimeout(() => {
      setClicked(false);
    }, 2500);
  };

  const defaultLabel =
    label || (storeName ? `Pegar na ${storeName}` : 'Pegar Promoção');

  const sizeStyles = {
    sm: 'py-2 px-3.5 text-xs gap-1.5 font-bold rounded-xl',
    md: 'py-2.5 px-4 text-sm gap-2 font-bold rounded-xl',
    lg: 'py-3.5 px-6 text-base gap-2.5 font-black rounded-2xl shadow-lg',
  };

  const variantStyles = {
    primary:
      'bg-gradient-to-r from-orange-500 via-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-md shadow-orange-500/25 hover:shadow-xl hover:shadow-orange-500/35 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]',
    card:
      'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-sm shadow-orange-500/20 hover:shadow-md hover:shadow-orange-500/30 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]',
    secondary:
      'border-2 border-orange-500/80 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/30 active:scale-[0.98]',
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex items-center justify-center transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500/40 ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      title={defaultLabel}
    >
      {clicked ? (
        <>
          <Check className="h-4 w-4 animate-bounce text-white" />
          <span>Indo para a loja...</span>
        </>
      ) : (
        <>
          {showIcon &&
            (variant === 'primary' || size === 'lg' ? (
              <ShoppingCart className="h-4 w-4" />
            ) : (
              <ExternalLink className="h-3.5 w-3.5" />
            ))}
          <span>{defaultLabel}</span>
        </>
      )}
    </button>
  );
}
