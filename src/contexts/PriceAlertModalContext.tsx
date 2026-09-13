'use client';

import React, { createContext, useContext, useState } from 'react';

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

  const openAlertModal = (newDefaults?: AlertModalDefaults) => {
    setDefaults(newDefaults || {});
    setIsOpen(true);
  };

  const closeAlertModal = () => {
    setIsOpen(false);
  };

  return (
    <PriceAlertModalContext.Provider
      value={{
        isOpen,
        defaults,
        openAlertModal,
        closeAlertModal,
      }}
    >
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
