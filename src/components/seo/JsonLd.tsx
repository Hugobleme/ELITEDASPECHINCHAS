import React from 'react';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://elitedaspechinchas.com.br';

/**
 * Componente para inserção de dados estruturados JSON-LD Schema.org de Organização (Home).
 */
export function OrganizationJsonLd() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Elite das Pechinchas',
    url: BASE_URL,
    logo: `${BASE_URL}/favicon.svg`,
    description: 'A melhor curadoria de promoções, cupons de desconto e pechinchas da internet brasileira.',
    sameAs: [
      'https://t.me/elitedaspechinchas',
      'https://instagram.com/elitedaspechinchas',
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

/**
 * Componente para inserção de dados estruturados JSON-LD Schema.org de Navegação (BreadcrumbList).
 */
export function BreadcrumbJsonLd({
  items,
}: {
  items: Array<{ name: string; url: string }>;
}) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${BASE_URL}${item.url}`,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

/**
 * Componente para inserção de dados estruturados JSON-LD Schema.org de Produto e Oferta.
 */
export function ProductJsonLd({
  name,
  image,
  description,
  price,
  priceOriginal,
  store,
  url,
  availability = 'https://schema.org/InStock',
}: {
  name: string;
  image?: string;
  description?: string;
  price: number;
  priceOriginal?: number;
  store: string;
  url: string;
  availability?: string;
}) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    image: image ? [image] : undefined,
    description: description || `Compre ${name} com desconto verificado na ${store}.`,
    offers: {
      '@type': 'Offer',
      price: price.toFixed(2),
      priceCurrency: 'BRL',
      priceValidUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      availability,
      url,
      seller: {
        '@type': 'Organization',
        name: store,
      },
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

/**
 * Componente para inserção de dados estruturados JSON-LD Schema.org de Cupons de Desconto.
 */
export function CouponJsonLd({
  code,
  store,
  discount,
  description,
  validUntil,
  url,
}: {
  code: string;
  store: string;
  discount: string;
  description?: string;
  validUntil?: string;
  url?: string;
}) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SaleEvent',
    name: `Cupom ${code} — ${discount} na ${store}`,
    description: description || `Utilize o código promocional ${code} para garantir ${discount} na loja ${store}.`,
    url: url || `${BASE_URL}/cupons`,
    organizer: {
      '@type': 'Organization',
      name: store,
    },
    offers: {
      '@type': 'Offer',
      discount,
      priceCurrency: 'BRL',
      validThrough: validUntil,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
