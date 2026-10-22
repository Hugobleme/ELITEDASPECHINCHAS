'use client';

import React, { useState } from 'react';
import { MOCK_COUPONS } from '@/lib/mock-coupons';
import CouponTicketCard from './CouponTicketCard';
import CouponModal from './CouponModal';
import { Ticket, ChevronRight } from 'lucide-react';

interface CouponSectionProps {
  className?: string;
  limit?: number;
}

export default function CouponSection({
  className = '',
  limit = 3,
}: CouponSectionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Exibe os primeiros cupons por padrão (compactos para caber na tela)
  const featuredCoupons = MOCK_COUPONS.slice(0, limit);

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Botão de Cabeçalho: [🎟️] Cupons de descontos > */}
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className="group flex w-full items-center justify-between rounded-xl border border-slate-200/90 bg-white p-2.5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-400 hover:shadow-md dark:border-amber-500/20 dark:bg-[#111116] dark:hover:border-amber-500/50 cursor-pointer text-left"
      >
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 transition-colors group-hover:bg-amber-500 group-hover:text-slate-950 dark:bg-amber-500/20 dark:text-amber-400 dark:group-hover:bg-amber-400 dark:group-hover:text-slate-950">
            <Ticket className="h-3.5 w-3.5" />
          </div>
          <span className="text-xs font-bold text-slate-900 dark:text-zinc-100 group-hover:text-amber-500 dark:group-hover:text-amber-400 transition-colors">
            Cupons de descontos
          </span>
        </div>

        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-amber-500 transition-transform duration-200 group-hover:translate-x-0.5" />
      </button>

      {/* Lista de Cards de Cupom estilo Ingresso com Recorte Lateral */}
      <div className="space-y-2">
        {featuredCoupons.map((coupon) => (
          <CouponTicketCard key={coupon.id} coupon={coupon} />
        ))}
      </div>

      {/* Link para abrir modal com todos os cupons */}
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className="flex w-full items-center justify-center gap-1 text-[11px] font-bold text-amber-600 hover:text-amber-500 dark:text-amber-400 dark:hover:text-amber-300 transition-colors py-0.5 cursor-pointer"
      >
        <span>Ver todos ({MOCK_COUPONS.length}) cupons</span>
        <ChevronRight className="h-3 w-3" />
      </button>

      {/* Modal de Cupons Completo */}
      <CouponModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
