'use client';

import React from 'react';

interface StoreLogoProps {
  storeName: string;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

const SIZE_MAP = {
  xs: 'h-4 w-4 rounded-md text-[9px]',
  sm: 'h-5 w-5 rounded-md text-[10px]',
  md: 'h-6 w-6 rounded-lg text-xs',
  lg: 'h-8 w-8 rounded-xl text-sm',
};

export default function StoreLogo({
  storeName,
  className = '',
  size = 'sm',
}: StoreLogoProps) {
  const norm = (storeName || '').toLowerCase().trim();
  const sizeClasses = SIZE_MAP[size] || SIZE_MAP.sm;

  // 1. Amazon
  if (norm.includes('amazon')) {
    return (
      <div
        className={`inline-flex shrink-0 items-center justify-center bg-white shadow-xs border border-slate-200/90 dark:border-zinc-700 overflow-hidden ${sizeClasses} ${className}`}
        title="Amazon"
      >
        <svg viewBox="0 0 24 24" className="w-4/5 h-4/5" fill="none">
          {/* 'a' symbol */}
          <path
            d="M12.8 7.2c-1.8 0-3 .6-3.7 1.8l1.3 1c.5-.8 1.3-1.2 2.3-1.2 1.4 0 2.1.8 2.1 2.1v.6c-.6-.2-1.4-.4-2.3-.4-2.5 0-4 1.3-4 3.2 0 1.9 1.4 3 3.3 3 1.3 0 2.3-.6 2.8-1.5v1.3h1.8v-6.9c0-2-1.5-3-3.6-3zm.4 8.7c-.9 0-1.7-.5-1.7-1.6 0-1.1.9-1.7 2-1.7.7 0 1.3.1 1.8.3-.1 1.8-1 3-2.1 3z"
            fill="#111827"
          />
          {/* Amazon smile arrow */}
          <path
            d="M4.5 17.8c3.8 2.8 9.6 2.8 13.8.4.3-.2.3-.6 0-.8-.2-.2-.6-.1-.9.1-3.8 2.2-9 2.2-12.4-.3-.3-.2-.7 0-.7.3 0 .1.1.2.2.3z"
            fill="#FF9900"
          />
          <path
            d="M18.8 16.4c-.4-.3-1.7-.1-2.4 0-.2 0-.3.2-.2.4.4.7 1 1.7 1.2 2 .1.1.3.1.4 0 .5-.5 1.1-1.8 1-2.4z"
            fill="#FF9900"
          />
        </svg>
      </div>
    );
  }

  // 2. Mercado Livre
  if (norm.includes('mercado livre') || norm.includes('mercadolivre')) {
    return (
      <div
        className={`inline-flex shrink-0 items-center justify-center bg-[#FFE600] shadow-xs border border-amber-300 overflow-hidden ${sizeClasses} ${className}`}
        title="Mercado Livre"
      >
        <svg viewBox="0 0 24 24" className="w-4/5 h-4/5" fill="none">
          {/* Handshake Silhouette */}
          <path
            d="M4 14.5l3.5-3.5a1.8 1.8 0 0 1 2.5 0l1 1 2-2a2 2 0 0 1 2.8 0l4.2 4a1 1 0 0 1-1.4 1.4L15 12l-2 2a1.8 1.8 0 0 1-2.5 0l-1-1-2.5 2.5a1 1 0 0 1-1.4 0 1 1 0 0 1-.6-.9z"
            fill="#2D3277"
          />
          <path
            d="M9 7c1 0 2 .5 2.5 1.2.5-.7 1.5-1.2 2.5-1.2 1.7 0 3 1.3 3 3 0 2-2.5 4.5-5.5 6.5C8.5 14.5 6 12 6 10c0-1.7 1.3-3 3-3z"
            fill="#2D3277"
            opacity="0.18"
          />
        </svg>
      </div>
    );
  }

  // 3. Kabum
  if (norm.includes('kabum')) {
    return (
      <div
        className={`inline-flex shrink-0 items-center justify-center bg-[#FF6500] shadow-xs border border-orange-600 overflow-hidden text-white font-black font-mono tracking-tighter ${sizeClasses} ${className}`}
        title="Kabum"
      >
        <svg viewBox="0 0 24 24" className="w-4/5 h-4/5" fill="none">
          <path d="M5 4h3.5v16H5V4z" fill="#FFFFFF" />
          <path d="M14.5 4l-6 7.5L15 20h4.2l-6.8-8.5L19 4h-4.5z" fill="#0060B2" stroke="#FFFFFF" strokeWidth="0.8" />
          <circle cx="19.5" cy="5.5" r="1.8" fill="#FFFFFF" />
        </svg>
      </div>
    );
  }

  // 4. Magalu / Magazine Luiza
  if (norm.includes('magalu') || norm.includes('magazine luiza') || norm.includes('magazineluiza')) {
    return (
      <div
        className={`inline-flex shrink-0 items-center justify-center bg-[#0086FF] shadow-xs border border-blue-600 overflow-hidden text-white font-extrabold ${sizeClasses} ${className}`}
        title="Magazine Luiza"
      >
        <svg viewBox="0 0 24 24" className="w-4/5 h-4/5" fill="none">
          <path
            d="M4 6v8a5 5 0 0 0 5 5h1a5 5 0 0 0 5-5V6h-3.5v8a1.5 1.5 0 0 1-1.5 1.5H9A1.5 1.5 0 0 1 7.5 14V6H4z"
            fill="#FFFFFF"
          />
          <circle cx="18" cy="15" r="3" fill="#FFE600" />
        </svg>
      </div>
    );
  }

  // 5. Shopee
  if (norm.includes('shopee')) {
    return (
      <div
        className={`inline-flex shrink-0 items-center justify-center bg-[#EE4D2D] shadow-xs border border-orange-600 overflow-hidden ${sizeClasses} ${className}`}
        title="Shopee"
      >
        <svg viewBox="0 0 24 24" className="w-4/5 h-4/5" fill="none">
          <path
            d="M5 8h14l-1.2 11.5a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 8z"
            fill="#FFFFFF"
          />
          <path
            d="M8.5 8V6a3.5 3.5 0 0 1 7 0v2"
            stroke="#FFFFFF"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M13.5 11.2c0-.7-.6-1.2-1.5-1.2-1 0-1.6.5-1.6 1.2 0 1.2 3.2 1.1 3.2 3 0 1.2-1 1.8-2 1.8-1.2 0-2.1-.7-2.1-1.6h1.2c0 .6.5.9 1 .9.7 0 1-.3 1-.8 0-1.3-3.2-1.2-3.2-3 0-1.2 1-1.8 2.2-1.8 1.1 0 2 .6 2 1.5h-1.2z"
            fill="#EE4D2D"
          />
        </svg>
      </div>
    );
  }

  // 6. Samsung
  if (norm.includes('samsung')) {
    return (
      <div
        className={`inline-flex shrink-0 items-center justify-center bg-[#034EA2] shadow-xs border border-blue-900 overflow-hidden ${sizeClasses} ${className}`}
        title="Samsung"
      >
        <span className="font-sans font-black text-[9px] tracking-tighter text-white uppercase">
          SAM
        </span>
      </div>
    );
  }

  // 7. Casas Bahia
  if (norm.includes('casas bahia') || norm.includes('casasbahia')) {
    return (
      <div
        className={`inline-flex shrink-0 items-center justify-center bg-[#003399] shadow-xs border border-blue-800 overflow-hidden ${sizeClasses} ${className}`}
        title="Casas Bahia"
      >
        <svg viewBox="0 0 24 24" className="w-4/5 h-4/5" fill="none">
          <path
            d="M5 4h7a4.5 4.5 0 0 1 3.8 6.8A5 5 0 0 1 12.5 20H5V4z"
            fill="#FFFFFF"
          />
          <path
            d="M9 7v10h3.5a2.5 2.5 0 0 0 0-5H9V7z"
            fill="#003399"
          />
          <path
            d="M14 12c1.5 0 2.5.8 2.5 2.2S15.5 17 13.5 17"
            stroke="#E52320"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      </div>
    );
  }

  // 8. Netshoes
  if (norm.includes('netshoes')) {
    return (
      <div
        className={`inline-flex shrink-0 items-center justify-center bg-[#55286F] shadow-xs border border-purple-900 overflow-hidden ${sizeClasses} ${className}`}
        title="Netshoes"
      >
        <span className="font-sans font-black text-[11px] text-white tracking-tighter">
          N
        </span>
      </div>
    );
  }

  // 9. AliExpress
  if (norm.includes('aliexpress')) {
    return (
      <div
        className={`inline-flex shrink-0 items-center justify-center bg-[#FF4747] shadow-xs border border-red-600 overflow-hidden text-white ${sizeClasses} ${className}`}
        title="AliExpress"
      >
        <span className="font-sans font-black text-[9px] tracking-tight">
          Ali
        </span>
      </div>
    );
  }

  // 10. Centauro
  if (norm.includes('centauro')) {
    return (
      <div
        className={`inline-flex shrink-0 items-center justify-center bg-[#E2001A] shadow-xs border border-red-700 overflow-hidden text-white ${sizeClasses} ${className}`}
        title="Centauro"
      >
        <svg viewBox="0 0 24 24" className="w-4/5 h-4/5" fill="none">
          <path
            d="M18 7a8 8 0 1 0 0 10l-2.5-2.5a4.5 4.5 0 1 1 0-5L18 7z"
            fill="#FFFFFF"
          />
        </svg>
      </div>
    );
  }

  // 11. Adidas
  if (norm.includes('adidas')) {
    return (
      <div
        className={`inline-flex shrink-0 items-center justify-center bg-black shadow-xs border border-zinc-700 overflow-hidden ${sizeClasses} ${className}`}
        title="Adidas"
      >
        <svg viewBox="0 0 24 24" className="w-4/5 h-4/5" fill="#FFFFFF">
          <path d="M5 18l3-6 2.5 1.5L7.5 19.5H5V18z" />
          <path d="M9.5 18l3.5-7 2.5 1.5L12 19.5H9.5V18z" />
          <path d="M14 18l4-8 2.5 1.5L16.5 19.5H14V18z" />
        </svg>
      </div>
    );
  }

  // 12. Natura
  if (norm.includes('natura')) {
    return (
      <div
        className={`inline-flex shrink-0 items-center justify-center bg-[#FFF8F0] shadow-xs border border-amber-200 overflow-hidden ${sizeClasses} ${className}`}
        title="Natura"
      >
        <svg viewBox="0 0 24 24" className="w-4/5 h-4/5" fill="none">
          <circle cx="12" cy="12" r="4" fill="#F26522" />
          <circle cx="12" cy="5" r="2.5" fill="#F7931E" opacity="0.8" />
          <circle cx="12" cy="19" r="2.5" fill="#F7931E" opacity="0.8" />
          <circle cx="5" cy="12" r="2.5" fill="#F7931E" opacity="0.8" />
          <circle cx="19" cy="12" r="2.5" fill="#F7931E" opacity="0.8" />
        </svg>
      </div>
    );
  }

  // 13. Fast Shop
  if (norm.includes('fast shop') || norm.includes('fastshop')) {
    return (
      <div
        className={`inline-flex shrink-0 items-center justify-center bg-[#1A1A1A] shadow-xs border border-zinc-700 overflow-hidden text-white ${sizeClasses} ${className}`}
        title="Fast Shop"
      >
        <span className="font-sans font-black text-[9px] text-[#FF4500]">FAST</span>
      </div>
    );
  }

  // 14. Pague Menos
  if (norm.includes('pague menos') || norm.includes('paguemenos')) {
    return (
      <div
        className={`inline-flex shrink-0 items-center justify-center bg-white shadow-xs border border-red-200 overflow-hidden ${sizeClasses} ${className}`}
        title="Pague Menos"
      >
        <svg viewBox="0 0 24 24" className="w-4/5 h-4/5" fill="none">
          <rect x="10" y="4" width="4" height="16" rx="1.5" fill="#E52320" />
          <rect x="4" y="10" width="16" height="4" rx="1.5" fill="#E52320" />
        </svg>
      </div>
    );
  }

  // 15. Zattini
  if (norm.includes('zattini')) {
    return (
      <div
        className={`inline-flex shrink-0 items-center justify-center bg-black shadow-xs border border-zinc-700 overflow-hidden text-white font-serif font-black ${sizeClasses} ${className}`}
        title="Zattini"
      >
        <span className="text-[11px]">Z</span>
      </div>
    );
  }

  // 16. Acer
  if (norm.includes('acer')) {
    return (
      <div
        className={`inline-flex shrink-0 items-center justify-center bg-white shadow-xs border border-slate-200 dark:border-zinc-700 overflow-hidden ${sizeClasses} ${className}`}
        title="Acer"
      >
        <span className="font-sans font-black text-[9px] text-[#83B81A] tracking-tighter lowercase">
          acer
        </span>
      </div>
    );
  }

  // 17. 123milhas
  if (norm.includes('123milhas') || norm.includes('123 milhas') || norm.includes('123')) {
    return (
      <div
        className={`inline-flex shrink-0 items-center justify-center bg-white shadow-xs border border-slate-200 dark:border-zinc-700 overflow-hidden ${sizeClasses} ${className}`}
        title="123milhas"
      >
        <span className="font-sans font-black text-[9px] text-[#FF8000] tracking-tighter">
          123
        </span>
      </div>
    );
  }

  // 18. Nike
  if (norm.includes('nike')) {
    return (
      <div
        className={`inline-flex shrink-0 items-center justify-center bg-black shadow-xs border border-zinc-700 overflow-hidden text-white ${sizeClasses} ${className}`}
        title="Nike"
      >
        <svg viewBox="0 0 24 24" className="w-4/5 h-4/5" fill="#FFFFFF">
          <path d="M21.5 7.5c-4.2 3.8-9 8.2-12.8 11.2-.6.5-1.4.7-2.2.5-.9-.2-1.6-.9-1.8-1.8-.3-1.4.4-2.8 1.7-3.4 3.1-1.4 7.2-2.7 11.2-3.8 1.5-.4 2.8-.8 3.9-1.2.3-.1.6-.2.9-.3.2-.1.3-.1.5-.1.1 0 .2 0 .2.1.2.2.1.5-.2.7l-.7.8z" />
        </svg>
      </div>
    );
  }

  // Fallback Genérico: Tile degradê com inicial da loja
  const initial = (storeName || 'L').charAt(0).toUpperCase();
  return (
    <div
      className={`inline-flex shrink-0 items-center justify-center bg-gradient-to-tr from-violet-600 to-fuchsia-600 text-white font-black shadow-xs overflow-hidden ${sizeClasses} ${className}`}
      title={storeName}
    >
      <span>{initial}</span>
    </div>
  );
}
