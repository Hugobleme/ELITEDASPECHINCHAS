/**
 * Configurações Centrais do Frontend — Elite das Pechinchas
 * Centraliza variáveis de ambiente, chaves de armazenamento local e constantes do sistema.
 */

export const CONFIG = {
  // URLs da Aplicação e APIs
  API_BASE_URL: process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || '',
  APP_BASE_URL: process.env.NEXT_PUBLIC_APP_BASE_URL || 'http://localhost:3000',

  // Chaves de Armazenamento Local (com suporte retroativo transparente)
  STORAGE_KEYS: {
    ADMIN_TOKEN: 'elitedaspechinchas_admin_token',
    ADMIN_TOKEN_LEGACY: 'promoradar_admin_token',
    LEGACY_ADMIN_TOKEN: 'promoradar_admin_token',
    ADMIN_USER: 'elitedaspechinchas_admin_user',
    ADMIN_USER_LEGACY: 'promoradar_admin_user',
    LEGACY_ADMIN_USER: 'promoradar_admin_user',

    USER_TOKEN: 'elitedaspechinchas_user_token',
    USER_TOKEN_LEGACY: 'promoradar_user_token',
    LEGACY_USER_TOKEN: 'promoradar_user_token',
    USER_DATA: 'elitedaspechinchas_user_data',
    USER_DATA_LEGACY: 'promoradar_user_data',
    LEGACY_USER_DATA: 'promoradar_user_data',

    THEME: 'elitedaspechinchas_theme',
  },

  // Chave pública VAPID para Web Push Notifications
  VAPID_PUBLIC_KEY:
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
    'BExamplePublicKey_ReplaceWithGeneratedVapidKeyInProductionEnv1234567890',

  // Configurações de Requisições HTTP
  HTTP: {
    DEFAULT_TIMEOUT_MS: 10000,
    EXTENDED_TIMEOUT_MS: 15000,
  },

  // Paginação e limites padrão
  PAGINATION: {
    DEFAULT_LIMIT: 12,
    MAX_LIMIT: 100,
    FEED_LIMIT: 24,
  },
} as const;

export const API_BASE_URL = CONFIG.API_BASE_URL;
export const APP_BASE_URL = CONFIG.APP_BASE_URL;
export const STORAGE_KEYS = CONFIG.STORAGE_KEYS;
