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
  limit = 4,
}: CouponSectionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Exibe os primeiros cupons por padrão (exatamente os 4 do layout do usuário)
  const featuredCoupons = MOCK_COUPONS.slice(0, limit);

  return (
    <div className={`space-y-2.5 ${className}`}>
      {/* Botão de Cabeçalho: [🎟️] Cupons de descontos > */}
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className="group flex w-full items-center justify-between rounded-2xl border border-slate-200/90 bg-white p-3 sm:p-3.5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-md dark:border-zinc-800 dark:bg-[#16161f] dark:hover:border-violet-500/50 cursor-pointer text-left"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700 transition-colors group-hover:bg-violet-100 group-hover:text-violet-600 dark:bg-zinc-800 dark:text-zinc-300 dark:group-hover:bg-violet-950/60 dark:group-hover:text-violet-300">
            <Ticket className="h-4 w-4" />
          </div>
          <span className="text-sm font-bold text-slate-900 dark:text-zinc-100 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
            Cupons de descontos
          </span>
        </div>

        {/* Seta Chevron Vermelha conforme layout do usuário */}
        <ChevronRight className="h-4 w-4 shrink-0 text-[#E52320] transition-transform duration-200 group-hover:translate-x-0.5" />
      </button>

      {/* Lista de Cards de Cupom estilo Ingresso com Recorte Lateral */}
      <div className="space-y-2.5">
        {featuredCoupons.map((coupon) => (
          <CouponTicketCard key={coupon.id} coupon={coupon} />
        ))}
      </div>

      {/* Modal de Cupons Completo */}
      <CouponModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
