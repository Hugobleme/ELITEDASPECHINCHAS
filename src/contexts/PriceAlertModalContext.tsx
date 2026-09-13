'use client';

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

export interface AlertModalDefaults {
  keyword?: string;
  category?: string;
  store?: string;
  target_discount?: number;
}

interface PriceAlertModalContextType {
  isOpen: boolean;
  defaults: AlertModalDefaults;
  openAlertModal: (defaults?: AlertModalDefaults) => void;
  closeAlertModal: () => void;
}

const PriceAlertModalContext = createContext<PriceAlertModalContextType | undefined>(undefined);

export function PriceAlertModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [defaults, setDefaults] = useState<AlertModalDefaults>({});

  const openAlertModal = useCallback((newDefaults?: AlertModalDefaults) => {
    setDefaults(newDefaults || {});
    setIsOpen(true);
  }, []);

  const closeAlertModal = useCallback(() => {
    setIsOpen(false);
  }, []);

  const value = useMemo(
    () => ({
      isOpen,
      defaults,
      openAlertModal,
      closeAlertModal,
    }),
    [isOpen, defaults, openAlertModal, closeAlertModal]
  );

  return (
    <PriceAlertModalContext.Provider value={value}>
      {children}
    </PriceAlertModalContext.Provider>
  );
}

export function usePriceAlertModal() {
  const context = useContext(PriceAlertModalContext);
  if (!context) {
    throw new Error('usePriceAlertModal deve ser usado dentro de um PriceAlertModalProvider');
  }
  return context;
}
