'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { ShoppingBag } from 'lucide-react';

interface ImageWithFallbackProps {
  src: string;
  alt: string;
  className?: string;
  fill?: boolean;
  width?: number;
  height?: number;
  priority?: boolean;
  sizes?: string;
}

export default function ImageWithFallback({
  src,
  alt,
  className = '',
  fill = false,
  width,
  height,
  priority = false,
  sizes,
}: ImageWithFallbackProps) {
  const [hasError, setHasError] = useState(!src);

  if (hasError || !src) {
    return (
      <div
        className={`flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400 dark:from-slate-800 dark:to-slate-900 dark:text-slate-500 ${className}`}
        style={{ width: fill ? '100%' : width, height: fill ? '100%' : height }}
      >
        <div className="flex flex-col items-center gap-1.5 p-3 text-center">
          <ShoppingBag className="h-8 w-8 stroke-[1.5] text-slate-400 dark:text-slate-600" />
          <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">Sem imagem</span>
        </div>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill={fill}
      width={!fill ? width : undefined}
      height={!fill ? height : undefined}
      className={className}
      priority={priority}
      sizes={sizes}
      onError={() => setHasError(true)}
      unoptimized={src.startsWith('http://localhost') || src.startsWith('blob:')}
    />
  );
}
