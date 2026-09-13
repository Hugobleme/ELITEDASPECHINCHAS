'use client';

import React, { useState } from 'react';
import { ExternalLink, ShoppingCart, Check } from 'lucide-react';
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
    sm: 'py-1.5 px-3 text-xs gap-1.5 font-semibold rounded-lg',
    md: 'py-2.5 px-4 text-sm gap-2 font-bold rounded-xl',
    lg: 'py-3.5 px-6 text-base gap-2.5 font-extrabold rounded-2xl shadow-lg',
  };

  const variantStyles = {
    primary:
      'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-orange-500/20 hover:shadow-orange-500/30 hover:scale-[1.02] active:scale-[0.98]',
    card:
      'bg-orange-500 hover:bg-orange-600 text-white shadow-sm hover:shadow-md active:scale-[0.98]',
    secondary:
      'border-2 border-orange-500 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/30',
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex items-center justify-center transition-all duration-200 ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      title={defaultLabel}
    >
      {clicked ? (
        <>
          <Check className="h-4 w-4 animate-bounce" />
          <span>Indo para a loja...</span>
        </>
      ) : (
        <>
          {showIcon && (variant === 'primary' || size === 'lg' ? (
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
