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
        className="group flex w-full items-center justify-between rounded-xl border border-slate-200/90 bg-white p-2.5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-md dark:border-zinc-800 dark:bg-[#16161f] dark:hover:border-violet-500/50 cursor-pointer text-left"
      >
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700 transition-colors group-hover:bg-violet-100 group-hover:text-violet-600 dark:bg-zinc-800 dark:text-zinc-300 dark:group-hover:bg-violet-950/60 dark:group-hover:text-violet-300">
            <Ticket className="h-3.5 w-3.5" />
          </div>
          <span className="text-xs font-bold text-slate-900 dark:text-zinc-100 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
            Cupons de descontos
          </span>
        </div>

        {/* Seta Chevron Vermelha conforme layout do usuário */}
        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[#E52320] transition-transform duration-200 group-hover:translate-x-0.5" />
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
        className="flex w-full items-center justify-center gap-1 text-[11px] font-bold text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 transition-colors py-0.5 cursor-pointer"
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
