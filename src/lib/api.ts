/**
 * Re-export all modular API submodules for seamless backward compatibility.
 * Allows imports from either '@/lib/api' or '@/lib/api/submodule'.
 */

export * from './api/client';
export * from './api/mock-store';
export * from './api/offers';
export * from './api/admin';
export * from './api/user';
