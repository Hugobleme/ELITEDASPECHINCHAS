import { CONFIG } from '@/lib/config';

export const API_BASE_URL = CONFIG.API_BASE_URL;

/**
 * Utilitário seguro de recuperação de token do localStorage com suporte retroativo.
 */
export function getStoredToken(key: string, legacyKey?: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const token = localStorage.getItem(key);
    if (token) return token;
    if (legacyKey) {
      const legacyToken = localStorage.getItem(legacyKey);
      if (legacyToken) return legacyToken;
    }
  } catch {
    // Ignora erro de acesso ao localStorage (ex: SSR ou restrições de sandbox)
  }
  return null;
}

/**
 * Utilitário de fetch com timeout configurável (10s padrão), abort controller e retry para falhas transitórias de rede.
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = CONFIG.HTTP.DEFAULT_TIMEOUT_MS,
  retries: number = 2
): Promise<Response> {
  let lastError: any;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      return response;
    } catch (err: any) {
      lastError = err;
      if (attempt < retries) {
        // Intervalo incremental curto antes do próximo retry
        await new Promise((resolve) => setTimeout(resolve, (attempt + 1) * 300));
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }
  throw lastError;
}

/**
 * Gera headers autenticados para operações administrativas.
 */
export function getAuthHeaders(token?: string): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const activeToken =
    token ||
    getStoredToken(
      CONFIG.STORAGE_KEYS.ADMIN_TOKEN,
      CONFIG.STORAGE_KEYS.ADMIN_TOKEN_LEGACY
    );

  if (activeToken) {
    headers['Authorization'] = `Bearer ${activeToken}`;
  }

  return headers;
}

/**
 * Gera headers autenticados para operações do usuário final.
 */
export function getUserAuthHeaders(token?: string): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const activeToken =
    token ||
    getStoredToken(
      CONFIG.STORAGE_KEYS.USER_TOKEN,
      CONFIG.STORAGE_KEYS.USER_TOKEN_LEGACY
    );

  if (activeToken) {
    headers['Authorization'] = `Bearer ${activeToken}`;
  }

  return headers;
}
