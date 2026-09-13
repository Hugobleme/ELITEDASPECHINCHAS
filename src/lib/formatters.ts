import { formatDistanceToNow, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Formata um valor numérico para Moeda Brasileira (BRL).
 * Exemplo: 1899 -> R$ 1.899,00
 */
export function formatBRL(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return 'R$ 0,00';
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Formata o percentual de desconto com prefixo negativo.
 * Exemplo: 53 -> -53%
 */
export function formatDiscount(discountPct: number | null | undefined): string {
  if (!discountPct || discountPct <= 0) return 'OFERTA';
  return `-${Math.round(discountPct)}%`;
}

/**
 * Calcula e formata o valor economizado.
 * Exemplo: (1899, 899) -> R$ 1.000,00
 */
export function formatSavings(original: number, current: number): string {
  const diff = original - current;
  if (diff <= 0) return '';
  return formatBRL(diff);
}

/**
 * Formata datas relativas em português brasileiro ("há 2 horas", "há 10 minutos").
 */
export function formatRelativeDate(dateString: string | null | undefined): string {
  if (!dateString) return 'Recentemente';

  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : new Date(dateString);
    if (!isValid(date)) return 'Recentemente';

    const formatted = formatDistanceToNow(date, {
      addSuffix: true,
      locale: ptBR,
    });

    return formatted; // ex: "há cerca de 2 horas", "há 15 minutos"
  } catch {
    return 'Recentemente';
  }
}

/**
 * Formata slug para exibição com primeira letra maiúscula
 */
export function formatSlugToName(slug: string): string {
  if (!slug) return '';
  return slug
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
