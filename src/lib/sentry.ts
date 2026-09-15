/**
 * Utilitário de monitoramento de erros e rastreamento para o frontend.
 * Conecta ao Sentry se NEXT_PUBLIC_SENTRY_DSN estiver definido;
 * caso contrário, provê logging estruturado seguro no cliente.
 */

export const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || '';

export function captureException(error: any, context?: Record<string, any>) {
  if (typeof window === 'undefined') return;

  if (process.env.NODE_ENV === 'development') {
    console.error('[Sentry Local Exception]:', error, context);
  }

  // Se o SDK do Sentry estiver presente no escopo global
  const windowSentry = (window as any).Sentry;
  if (windowSentry && typeof windowSentry.captureException === 'function') {
    windowSentry.captureException(error, { extra: context });
  }
}

export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
  if (typeof window === 'undefined') return;

  if (process.env.NODE_ENV === 'development') {
    console.log(`[Sentry Local Message (${level})]:`, message);
  }

  const windowSentry = (window as any).Sentry;
  if (windowSentry && typeof windowSentry.captureMessage === 'function') {
    windowSentry.captureMessage(message, level);
  }
}

export function addBreadcrumb(breadcrumb: {
  category: string;
  message: string;
  data?: Record<string, any>;
  level?: 'info' | 'warning' | 'error';
}) {
  if (typeof window === 'undefined') return;

  const windowSentry = (window as any).Sentry;
  if (windowSentry && typeof windowSentry.addBreadcrumb === 'function') {
    windowSentry.addBreadcrumb(breadcrumb);
  }
}
