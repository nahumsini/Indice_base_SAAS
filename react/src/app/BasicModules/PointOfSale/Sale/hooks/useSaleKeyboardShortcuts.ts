import { useEffect, type RefObject } from 'react';
import type { Product } from '../../shared/commercial/products';
import type { PaymentMethod } from '../types/sale.types';

interface UseSaleKeyboardShortcutsOptions {
  barcodeInputRef: RefObject<HTMLInputElement | null>;
  filteredQuickProducts: Product[];
  isPaid: boolean;
  isModalOpen: boolean;
  onAddToCart: (product: Product) => void;
  onAddPayment: (method: PaymentMethod) => void;
  onCompleteSale: () => void;
  onClearCart: () => void;
}

export function useSaleKeyboardShortcuts({
  barcodeInputRef,
  filteredQuickProducts,
  isPaid,
  isModalOpen,
  onAddToCart,
  onAddPayment,
  onCompleteSale,
  onClearCart,
}: UseSaleKeyboardShortcutsOptions) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target === barcodeInputRef.current || isModalOpen) {
        return;
      }

      if (event.key >= '1' && event.key <= '9') {
        const index = parseInt(event.key) - 1;
        if (filteredQuickProducts[index]) {
          event.preventDefault();
          onAddToCart(filteredQuickProducts[index]);
        }
      }

      if (event.key === 'F1') {
        event.preventDefault();
        onAddPayment('cash');
      }

      if (event.key === 'F2') {
        event.preventDefault();
        onAddPayment('card');
      }

      if (event.key === 'F3') {
        event.preventDefault();
        onAddPayment('transfer');
      }

      if (event.key === 'F4') {
        event.preventDefault();
        if (isPaid) {
          onCompleteSale();
        }
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        onClearCart();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    barcodeInputRef,
    filteredQuickProducts,
    isPaid,
    isModalOpen,
    onAddToCart,
    onAddPayment,
    onCompleteSale,
    onClearCart,
  ]);
}
