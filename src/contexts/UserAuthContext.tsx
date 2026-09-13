'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { EndUser } from '@/types/user';
import { apiUserLogin, apiUserRegister, apiUserGoogle, apiGetMe } from '@/lib/api';
import { CONFIG } from '@/lib/config';

interface UserAuthContextType {
  user: EndUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAuthModalOpen: boolean;
  authModalTab: 'login' | 'register';
  openAuthModal: (tab?: 'login' | 'register') => void;
  closeAuthModal: () => void;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: (idToken?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const UserAuthContext = createContext<UserAuthContextType | undefined>(undefined);

const USER_TOKEN_KEY = CONFIG.STORAGE_KEYS.USER_TOKEN;
const LEGACY_USER_TOKEN_KEY = CONFIG.STORAGE_KEYS.LEGACY_USER_TOKEN;
const USER_DATA_KEY = 'elitedaspechinchas_user_data';
const LEGACY_USER_DATA_KEY = 'promoradar_user_data';

export function UserAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<EndUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Controle do modal global de autenticação
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'register'>('login');

  useEffect(() => {
    try {
      const savedToken =
        localStorage.getItem(USER_TOKEN_KEY) ||
        localStorage.getItem(LEGACY_USER_TOKEN_KEY);
      const savedUser =
        localStorage.getItem(USER_DATA_KEY) ||
        localStorage.getItem(LEGACY_USER_DATA_KEY);

      if (savedToken && savedUser) {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      }
    } catch {
      // Ignora erro
    } finally {
      setIsLoading(false);
    }
  }, []);

  const openAuthModal = (tab: 'login' | 'register' = 'login') => {
    setAuthModalTab(tab);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  const login = async (email: string, password: string) => {
    try {
      const res = await apiUserLogin(email, password);
      setToken(res.access_token);
      localStorage.setItem(USER_TOKEN_KEY, res.access_token);

      // Busca dados do usuário ou usa fallback
      const me = await apiGetMe(res.access_token);
      setUser(me);
      localStorage.setItem(USER_DATA_KEY, JSON.stringify(me));

      closeAuthModal();
      return { success: true };
    } catch (err: unknown) {
      const error = err as Error;
      return { success: false, error: error.message || 'Erro ao realizar login.' };
    }
  };

  const register = async (email: string, password: string, name: string) => {
    try {
      const res = await apiUserRegister(email, password, name);
      setToken(res.access_token);
      localStorage.setItem(USER_TOKEN_KEY, res.access_token);

      const me = await apiGetMe(res.access_token);
      setUser(me);
      localStorage.setItem(USER_DATA_KEY, JSON.stringify(me));

      closeAuthModal();
      return { success: true };
    } catch (err: unknown) {
      const error = err as Error;
      return { success: false, error: error.message || 'Erro ao criar conta.' };
    }
  };

  const loginWithGoogle = async (idToken?: string) => {
    try {
      const res = await apiUserGoogle(idToken || 'mock_google_usuario_demo');
      setToken(res.access_token);
      localStorage.setItem(USER_TOKEN_KEY, res.access_token);

      const me = await apiGetMe(res.access_token);
      setUser(me);
      localStorage.setItem(USER_DATA_KEY, JSON.stringify(me));

      closeAuthModal();
      return { success: true };
    } catch (err: unknown) {
      const error = err as Error;
      return { success: false, error: error.message || 'Erro no login com Google.' };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(USER_TOKEN_KEY);
    localStorage.removeItem(LEGACY_USER_TOKEN_KEY);
    localStorage.removeItem(USER_DATA_KEY);
    localStorage.removeItem(LEGACY_USER_DATA_KEY);
  };

  return (
    <UserAuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        isAuthModalOpen,
        authModalTab,
        openAuthModal,
        closeAuthModal,
        login,
        register,
        loginWithGoogle,
        logout,
      }}
    >
      {children}
    </UserAuthContext.Provider>
  );
}

export function useUserAuth() {
  const context = useContext(UserAuthContext);
  if (!context) {
    throw new Error('useUserAuth deve ser usado dentro de um UserAuthProvider');
  }
  return context;
}
