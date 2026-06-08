import { useCallback, useEffect, useState, type FormEvent } from 'react';
import type { Product } from '../../Productos/types/product.types';
import { LAST_ADDED_ITEM_ANIMATION_MS } from '../constants/sale.constants';
import type { SaleItem } from '../types/sale.types';
import {
  buildSaleItem,
  recalculateSaleItem,
} from '../utils/saleCalculations';

interface UseSaleCartOptions {
  products: Product[];
}

export function useSaleCart({ products }: UseSaleCartOptions) {
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [lastAddedItem, setLastAddedItem] = useState<string | null>(null);
  const [selectedQuickQuantity, setSelectedQuickQuantity] = useState(1);
  const [blockSalesWithoutStock] = useState(false);

  useEffect(() => {
    if (!lastAddedItem) {
      return undefined;
    }

    const timer = setTimeout(() => setLastAddedItem(null), LAST_ADDED_ITEM_ANIMATION_MS);
    return () => clearTimeout(timer);
  }, [lastAddedItem]);

  const removeItem = useCallback((itemId: string) => {
    setCart((currentCart) => currentCart.filter((item) => item.id !== itemId));
  }, []);

  const updateQuantity = useCallback((itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(itemId);
      return;
    }

    setCart((currentCart) => currentCart.map((item) => {
      if (item.id !== itemId) {
        return item;
      }

      const product = products.find((candidate) => candidate.id === item.productId);
      if (product && product.useInventory && newQuantity > product.currentStock) {
        alert(`Stock insuficiente. Disponible: ${product.currentStock}`);
        return item;
      }

      return recalculateSaleItem(item, { quantity: newQuantity });
    }));
  }, [products, removeItem]);

  const addToCart = useCallback((product: Product, quantity = 1) => {
    if (product.useInventory) {
      const currentInCart = cart.find((item) => item.productId === product.id)?.quantity || 0;

      if (product.currentStock <= 0) {
        if (blockSalesWithoutStock) {
          alert(`${product.name} está agotado`);
          return;
        }

        if (!confirm(`${product.name} está agotado. ¿Continuar?`)) {
          return;
        }
      } else if (currentInCart + quantity > product.currentStock) {
        alert(`Stock insuficiente. Disponible: ${product.currentStock}`);
        return;
      }
    }

    const existingItem = cart.find((item) => item.productId === product.id);

    if (existingItem) {
      updateQuantity(existingItem.id, existingItem.quantity + quantity);
      setLastAddedItem(existingItem.id);
      return;
    }

    const newItem = buildSaleItem(product, quantity);
    setCart([newItem, ...cart]);
    setLastAddedItem(newItem.id);
  }, [blockSalesWithoutStock, cart, updateQuantity]);

  const applyDiscount = useCallback((itemId: string, discount: number, type: SaleItem['discountType']) => {
    setCart((currentCart) => currentCart.map((item) => {
      if (item.id !== itemId) {
        return item;
      }

      return recalculateSaleItem(item, {
        discount,
        discountType: type,
      });
    }));
  }, []);

  const applyGlobalDiscount = useCallback((discount: number, type: SaleItem['discountType']) => {
    setCart((currentCart) => currentCart.map((item) => recalculateSaleItem(item, {
      discount,
      discountType: type,
    })));
  }, []);

  const resetCart = useCallback(() => {
    setCart([]);
    setBarcodeInput('');
    setLastAddedItem(null);
  }, []);

  const handleBarcodeSubmit = useCallback((event: FormEvent) => {
    event.preventDefault();

    if (!barcodeInput.trim()) {
      return;
    }

    const product = products.find(
      (candidate) => candidate.barcode === barcodeInput.trim() && candidate.status === 'active',
    );

    if (product) {
      addToCart(product);
      setBarcodeInput('');
      return;
    }

    alert(`Producto no encontrado: ${barcodeInput}`);
    setBarcodeInput('');
  }, [addToCart, barcodeInput, products]);

  return {
    cart,
    setCart,
    barcodeInput,
    setBarcodeInput,
    lastAddedItem,
    selectedQuickQuantity,
    setSelectedQuickQuantity,
    blockSalesWithoutStock,
    handleBarcodeSubmit,
    addToCart,
    updateQuantity,
    applyDiscount,
    applyGlobalDiscount,
    removeItem,
    resetCart,
  };
}

