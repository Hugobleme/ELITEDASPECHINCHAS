import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import SearchResultsClient from './SearchResultsClient';
import { Loader2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Resultado da Busca — Elite das Pechinchas',
  description: 'Confira as promoções e ofertas encontradas para sua pesquisa.',
};

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[400px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        </div>
      }
    >
      <SearchResultsClient />
    </Suspense>
  );
}
