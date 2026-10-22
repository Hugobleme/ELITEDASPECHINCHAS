'use client';

import React, { useState } from 'react';
import { OfferCreatePayload } from '@/types/offer';
import { X, PlusCircle, AlertCircle, Link as LinkIcon, Tag } from 'lucide-react';

interface OfferCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (payload: OfferCreatePayload) => Promise<void>;
  isCreating?: boolean;
}

const COMMON_STORES = [
  'Amazon',
  'Mercado Livre',
  'Shopee',
  'Magalu',
  'AliExpress',
  'Kabum',
  'Casas Bahia',
  'Fast Shop',
  'Pichau',
  'Terabyte',
];

const COMMON_CATEGORIES = [
  { slug: 'eletronicos', name: 'Eletrônicos & Informática' },
  { slug: 'smartphones', name: 'Smartphones & Celulares' },
  { slug: 'gamer', name: 'Games & Consoles' },
  { slug: 'casa', name: 'Casa & Cozinha' },
  { slug: 'moda', name: 'Moda & Acessórios' },
  { slug: 'beleza', name: 'Beleza & Saúde' },
  { slug: 'esportes', name: 'Esportes & Lazer' },
  { slug: 'livros', name: 'Livros & eBooks' },
];

export default function OfferCreateModal({
  isOpen,
  onClose,
  onCreate,
  isCreating = false,
}: OfferCreateModalProps) {
  const [title, setTitle] = useState('');
  const [priceCurrent, setPriceCurrent] = useState<string>('');
  const [priceOriginal, setPriceOriginal] = useState<string>('');
  const [store, setStore] = useState('Amazon');
  const [category, setCategory] = useState('eletronicos');
  const [originalLink, setOriginalLink] = useState('');
  const [affiliateLink, setAffiliateLink] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [publishImmediately, setPublishImmediately] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const numCurrent = parseFloat(priceCurrent) || 0;
  const numOriginal = parseFloat(priceOriginal) || 0;
  const calculatedDiscount =
    numOriginal > numCurrent && numOriginal > 0
      ? Math.round(((numOriginal - numCurrent) / numOriginal) * 100)
      : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!title.trim()) {
      setErrorMessage('Informe o título do produto.');
      return;
    }
    if (!numCurrent || numCurrent <= 0) {
      setErrorMessage('Informe um preço promocional válido.');
      return;
    }
    if (!originalLink.trim()) {
      setErrorMessage('Informe o link original da oferta.');
      return;
    }

    try {
      await onCreate({
        title: title.trim(),
        price_current: numCurrent,
        price_original: numOriginal > numCurrent ? numOriginal : numCurrent,
        discount_pct: calculatedDiscount,
        store,
        category,
        original_link: originalLink.trim(),
        affiliate_link: affiliateLink.trim() || undefined,
        image_url: imageUrl.trim() || undefined,
        coupon_code: couponCode.trim() || undefined,
        status: publishImmediately ? 'published' : 'pending',
      });
      onClose();
    } catch {
      setErrorMessage('Ocorreu um erro ao salvar a oferta. Tente novamente.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity" onClick={onClose} />

      {/* Modal Card */}
      <div className="relative flex max-h-[calc(100dvh-2rem)] w-full max-w-xl flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xl dark:border-amber-500/20 dark:bg-[#111116] sm:rounded-3xl sm:p-7">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 pb-4 dark:border-amber-500/15">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 font-black shadow-sm">
              <PlusCircle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">Cadastrar Nova Oferta</h3>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400">Publicação direta na vitrine ELITEDASPECHINCHAS</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/[0.05] cursor-pointer"
            aria-label="Fechar modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-4 overflow-y-auto py-4 pr-1">
            {/* Título */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300">
                Título do Produto *
              </label>
              <input
                type="text"
                placeholder="Ex: Smartphone Samsung Galaxy S24 256GB 5G"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-medium text-slate-900 focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-white/[0.08] dark:bg-[#070709] dark:text-zinc-100"
                required
              />
            </div>

            {/* Preços e Desconto */}
            <div className="grid grid-cols-1 gap-3 xs:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Preço Original (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Ex: 5499.00"
                  value={priceOriginal}
                  onChange={(e) => setPriceOriginal(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-medium text-slate-900 focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-white/[0.08] dark:bg-[#070709] dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Preço Promocional (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Ex: 3899.00"
                  value={priceCurrent}
                  onChange={(e) => setPriceCurrent(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-medium text-slate-900 focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-white/[0.08] dark:bg-[#070709] dark:text-zinc-100"
                  required
                />
              </div>
            </div>

            {/* Badge de Desconto Calculado em Tempo Real */}
            {calculatedDiscount > 0 && (
              <div className="flex items-center justify-between rounded-xl bg-amber-500/10 p-3 text-xs dark:bg-amber-500/20 border border-amber-500/20">
                <span className="font-semibold text-amber-800 dark:text-amber-300">Desconto Calculado:</span>
                <span className="font-black text-amber-600 dark:text-amber-400">
                  -{calculatedDiscount}% OFF
                </span>
              </div>
            )}

            {/* Loja e Categoria */}
            <div className="grid grid-cols-1 gap-3 xs:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Loja Parceira *
                </label>
                <input
                  type="text"
                  list="store-suggestions"
                  placeholder="Selecione ou digite..."
                  value={store}
                  onChange={(e) => setStore(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-medium text-slate-900 focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-white/[0.08] dark:bg-[#070709] dark:text-zinc-100"
                  required
                />
                <datalist id="store-suggestions">
                  {COMMON_STORES.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Categoria *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-semibold text-slate-700 focus:border-amber-400 focus:bg-white focus:outline-none dark:border-white/[0.08] dark:bg-[#070709] dark:text-zinc-300"
                >
                  {COMMON_CATEGORIES.map((cat) => (
                    <option key={cat.slug} value={cat.slug}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Link Original da Oferta */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300">
                Link da Oferta (URL de Destino) *
              </label>
              <div className="relative mt-1.5">
                <input
                  type="url"
                  placeholder="https://www.amazon.com.br/dp/B0..."
                  value={originalLink}
                  onChange={(e) => setOriginalLink(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 pl-9 text-xs font-medium text-slate-900 focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-white/[0.08] dark:bg-[#070709] dark:text-zinc-100"
                  required
                />
                <LinkIcon className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              </div>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-zinc-400">
                O backend converterá automaticamente para a sua tag de afiliado configurada se o link de afiliado abaixo for omitido.
              </p>
            </div>

            {/* Link de Afiliado Customizado (Opcional) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300">
                Link de Afiliado Customizado (Opcional)
              </label>
              <input
                type="url"
                placeholder="Deixe em branco para conversão automática"
                value={affiliateLink}
                onChange={(e) => setAffiliateLink(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-medium text-slate-900 focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-white/[0.08] dark:bg-[#070709] dark:text-zinc-100"
              />
            </div>

            {/* Imagem do Produto e Cupom */}
            <div className="grid grid-cols-1 gap-3 xs:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300">
                  URL da Imagem (Opcional)
                </label>
                <input
                  type="url"
                  placeholder="https://m.media-amazon.com/..."
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-medium text-slate-900 focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-white/[0.08] dark:bg-[#070709] dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Cupom de Desconto (Opcional)
                </label>
                <div className="relative mt-1.5">
                  <input
                    type="text"
                    placeholder="Ex: NOITE10"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 pl-9 text-xs font-bold uppercase text-slate-900 focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-white/[0.08] dark:bg-[#070709] dark:text-zinc-100"
                  />
                  <Tag className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                </div>
              </div>
            </div>

            {/* Opção de Publicação Imediata */}
            <div className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-slate-50 p-3 dark:border-white/[0.08] dark:bg-[#070709]">
              <input
                type="checkbox"
                id="publishImmediately"
                checked={publishImmediately}
                onChange={(e) => setPublishImmediately(e.target.checked)}
                className="h-4 w-4 rounded accent-amber-500"
              />
              <label htmlFor="publishImmediately" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                Publicar imediatamente na vitrine pública do site (status: <span className="font-bold text-emerald-600 dark:text-emerald-400">published</span>)
              </label>
            </div>
          </div>

          {/* Footer de Ações */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4 dark:border-amber-500/15">
            <button
              type="button"
              onClick={onClose}
              disabled={isCreating}
              className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-white/[0.05] cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isCreating}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 px-5 py-2.5 text-xs font-black text-slate-950 shadow-md shadow-amber-500/20 hover:from-amber-400 hover:to-yellow-300 active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <PlusCircle className="h-4 w-4" />
              <span>{isCreating ? 'Cadastrando...' : 'Cadastrar Oferta'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
