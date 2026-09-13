'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { AdminUser } from '@/types/admin';
import { CONFIG } from '@/lib/config';

interface AuthContextType {
  user: AdminUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = CONFIG.STORAGE_KEYS.ADMIN_TOKEN;
const LEGACY_TOKEN_KEY = CONFIG.STORAGE_KEYS.LEGACY_ADMIN_TOKEN;
const USER_KEY = 'elitedaspechinchas_admin_user';
const LEGACY_USER_KEY = 'promoradar_admin_user';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Carrega sessão salva no navegador com compatibilidade retroativa
    try {
      const savedToken =
        localStorage.getItem(TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY);
      const savedUser =
        localStorage.getItem(USER_KEY) || localStorage.getItem(LEGACY_USER_KEY);
      if (savedToken && savedUser) {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
        document.cookie = `admin_token=${savedToken}; path=/; max-age=604800; SameSite=Lax`;
      }
    } catch {
      // Ignora erro de parsing
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    // 1. Se houver API FastAPI configurada, tenta autenticar no endpoint remoto
    const apiUrl = CONFIG.API_BASE_URL;
    if (apiUrl) {
      try {
        const res = await fetch(`${apiUrl}/admin/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
        });

        if (res.ok) {
          const data = await res.json();
          const authToken = data.access_token || data.token || 'jwt_session_token';
          const authUser: AdminUser = data.user || {
            id: '1',
            name: username,
            email: `${username}@elitedaspechinchas.com.br`,
            role: 'admin',
          };

          setToken(authToken);
          setUser(authUser);
          localStorage.setItem(TOKEN_KEY, authToken);
          localStorage.setItem(USER_KEY, JSON.stringify(authUser));
          document.cookie = `admin_token=${authToken}; path=/; max-age=604800; SameSite=Lax`;
          return { success: true };
        }
      } catch {
        console.warn('[Auth] FastAPI offline. Validando credenciais via fallback.');
      }
    }

    // 2. Fallback de Autenticação (Modo Demonstração / Dev)
    const validUser = process.env.NEXT_PUBLIC_ADMIN_USERNAME || 'admin';
    const validPass = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'admin123';

    if ((username === validUser && password === validPass) || (username === 'admin' && password === 'admin123')) {
      const demoToken = `demo_jwt_${Date.now()}`;
      const demoUser: AdminUser = {
        id: 'usr_admin_01',
        name: 'Administrador Elite das Pechinchas',
        email: 'admin@elitedaspechinchas.com.br',
        role: 'admin',
      };

      setToken(demoToken);
      setUser(demoUser);
      localStorage.setItem(TOKEN_KEY, demoToken);
      localStorage.setItem(USER_KEY, JSON.stringify(demoUser));
      document.cookie = `admin_token=${demoToken}; path=/; max-age=604800; SameSite=Lax`;
      return { success: true };
    }

    return {
      success: false,
      error: 'Credenciais inválidas. Use usuário "admin" e senha "admin123".',
    };
  };

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(LEGACY_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(LEGACY_USER_KEY);
    document.cookie = 'admin_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    router.push('/admin/login');
  }, [router]);

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: !!token,
      isLoading,
      login,
      logout,
    }),
    [user, token, isLoading, logout]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
}
