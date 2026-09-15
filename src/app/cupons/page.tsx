import React from 'react';
import type { Metadata } from 'next';
import CuponsClient from './CuponsClient';
import { BreadcrumbJsonLd } from '@/components/seo/JsonLd';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://elitedaspechinchas.com.br';

export const metadata: Metadata = {
  title: 'Cupons de Desconto e Códigos Promocionais Testados — Elite das Pechinchas',
  description:
    'Encontre cupons de desconto válidos e atualizados para Amazon, Mercado Livre, KaBuM!, Magalu, Shopee e mais. Economize com códigos verificados diariamente.',
  keywords: [
    'cupons de desconto',
    'código promocional',
    'cupom amazon',
    'cupom mercado livre',
    'cupom kabum',
    'cupom magalu',
    'descontos',
    'promoções',
  ],
  alternates: {
    canonical: `${SITE_URL}/cupons`,
  },
  openGraph: {
    title: 'Cupons de Desconto Verificados — Elite das Pechinchas',
    description: 'Códigos promocionais e cupons de desconto atualizados para as melhores lojas online do Brasil.',
    url: `${SITE_URL}/cupons`,
    type: 'website',
    siteName: 'Elite das Pechinchas',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cupons de Desconto Verificados — Elite das Pechinchas',
    description: 'Encontre cupons de desconto válidos e economize nas suas compras online.',
  },
};

export default function CuponsPage() {
  const breadcrumbs = [
    { name: 'Início', url: '/' },
    { name: 'Cupons de Desconto', url: '/cupons' },
  ];

  return (
    <>
      <BreadcrumbJsonLd items={breadcrumbs} />
      <CuponsClient />
    </>
  );
}
