import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { findCatalogProductByBarcode, type Product } from '../../shared/commercial/products';
import { LAST_ADDED_ITEM_ANIMATION_MS } from '../constants/sale.constants';
import type { SaleItem } from '../types/sale.types';
import {
  buildSaleItem,
  recalculateSaleItem,
  type SaleTaxOverride,
} from '../utils/saleCalculations';
import { convertPosDisplayCurrencyAmount } from '../utils/posCurrencyDisplay';

interface UseSaleCartOptions {
  products: Product[];
  taxOverride?: SaleTaxOverride;
}

interface CartProductRequest {
  product: Product;
  quantity: number;
}

export interface PreticketCartLineRequest extends CartProductRequest {
  unitPrice: number;
  discountAmount: number;
  discountRuleId?: number | null;
}

export interface CartBatchResult {
  addedCount: number;
  insufficientStock: string[];
}

const normalizeSaleQuantity = (quantity: number) => Number(quantity.toFixed(3));

export function useSaleCart({ products, taxOverride }: UseSaleCartOptions) {
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [lastAddedItem, setLastAddedItem] = useState<string | null>(null);
  const [selectedQuickQuantity, setSelectedQuickQuantity] = useState(1);
  const [blockSalesWithoutStock] = useState(true);
  const [cartNotice, setCartNotice] = useState('');

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
    const normalizedQuantity = normalizeSaleQuantity(newQuantity);
    if (normalizedQuantity <= 0) {
      removeItem(itemId);
      return;
    }

    setCart((currentCart) => currentCart.map((item) => {
      if (item.id !== itemId) {
        return item;
      }

      const product = products.find((candidate) => candidate.id === item.productId);
      if (product && product.useInventory && normalizedQuantity > product.currentStock) {
        setCartNotice(`Stock insuficiente para ${product.name}. Disponible: ${product.currentStock}.`);
        return item;
      }

      return recalculateSaleItem(item, { quantity: normalizedQuantity });
    }));
  }, [products, removeItem]);

  const addToCart = useCallback((product: Product, quantity = product.minimumSaleQuantity ?? 1) => {
    const requestedQuantity = normalizeSaleQuantity(quantity);
    if (product.useInventory) {
      const currentInCart = cart.find((item) => item.productId === product.id)?.quantity || 0;

      if (product.currentStock <= 0) {
        setCartNotice(`${product.name} esta agotado. Agrega inventario antes de venderlo en POS.`);
        return;
      } else if (currentInCart + requestedQuantity > product.currentStock) {
        setCartNotice(`Stock insuficiente para ${product.name}. Disponible: ${product.currentStock}.`);
        return;
      }
    }

    const existingItem = cart.find((item) => item.productId === product.id);

    if (existingItem) {
      updateQuantity(existingItem.id, existingItem.quantity + requestedQuantity);
      setLastAddedItem(existingItem.id);
      setCartNotice('');
      return;
    }

    const newItem = buildSaleItem(product, requestedQuantity, taxOverride);
    setCart([newItem, ...cart]);
    setLastAddedItem(newItem.id);
    setCartNotice('');
  }, [blockSalesWithoutStock, cart, taxOverride, updateQuantity]);

  const addProductsToCart = useCallback((requests: CartProductRequest[]): CartBatchResult => {
    if (requests.length === 0) {
      return { addedCount: 0, insufficientStock: [] };
    }

    const invalidRequest = requests.some(({ quantity }) => !Number.isFinite(quantity) || quantity <= 0);
    if (invalidRequest) {
      return { addedCount: 0, insufficientStock: [] };
    }

    const requestedQuantityByProduct = requests.reduce<Map<string, number>>((totals, request) => {
      totals.set(request.product.id, (totals.get(request.product.id) ?? 0) + request.quantity);
      return totals;
    }, new Map());
    const blockedProductIds = new Set(requests.flatMap(({ product }) => {
      const currentInCart = cart.find((item) => item.productId === product.id)?.quantity || 0;
      const requestedQuantity = requestedQuantityByProduct.get(product.id) ?? 0;
      return product.useInventory && currentInCart + requestedQuantity > product.currentStock
        ? [product.id]
        : [];
    }));
    const insufficientStock = Array.from(new Set(
      requests.filter(({ product }) => blockedProductIds.has(product.id)).map(({ product }) => product.name),
    ));
    const acceptedRequests = requests.filter(({ product }) => !blockedProductIds.has(product.id));

    setCart((currentCart) => {
      let nextCart = [...currentCart];
      let lastItemId: string | null = null;

      acceptedRequests.forEach(({ product, quantity }) => {
        const existingItem = nextCart.find((item) => item.productId === product.id);

        if (existingItem) {
          nextCart = nextCart.map((item) => (
            item.id === existingItem.id
              ? recalculateSaleItem(item, { quantity: item.quantity + quantity })
              : item
          ));
          lastItemId = existingItem.id;
          return;
        }

        const newItem = buildSaleItem(product, quantity, taxOverride);
        nextCart = [newItem, ...nextCart];
        lastItemId = newItem.id;
      });

      if (lastItemId) {
        setLastAddedItem(lastItemId);
      }

      return nextCart;
    });
    if (insufficientStock.length > 0) {
      setCartNotice(`Revisa existencia antes de cobrar: ${insufficientStock.join(', ')}.`);
    }
    return { addedCount: acceptedRequests.length, insufficientStock };
  }, [cart, taxOverride]);

  const replaceCartWithPreticket = useCallback((requests: PreticketCartLineRequest[]): CartBatchResult => {
    if (requests.length === 0 || requests.some(({ quantity, unitPrice, discountAmount }) => (
      !Number.isFinite(quantity) || quantity <= 0
      || !Number.isFinite(unitPrice) || unitPrice < 0
      || !Number.isFinite(discountAmount) || discountAmount < 0
    ))) {
      return { addedCount: 0, insufficientStock: [] };
    }

    const insufficientStock = requests
      .filter(({ product, quantity }) => product.useInventory && quantity > product.currentStock)
      .map(({ product }) => product.name);
    if (insufficientStock.length > 0) {
      setCartNotice(`Revisa existencia antes de cargar el preticket: ${insufficientStock.join(', ')}.`);
      return { addedCount: 0, insufficientStock };
    }

    const nextCart = requests.map(({ product, quantity, unitPrice, discountAmount, discountRuleId }) => (
      recalculateSaleItem(buildSaleItem(product, quantity, taxOverride), {
        price: unitPrice,
        discount: discountAmount / quantity,
        discountType: 'fixed',
        discountRuleId: discountRuleId ?? undefined,
      })
    )).map((item, index) => ({ ...item, id: `preticket-item-${Date.now()}-${index}-${item.productId}` }));

    setCart(nextCart);
    setLastAddedItem(nextCart[nextCart.length - 1]?.id ?? null);
    setCartNotice('');
    return { addedCount: nextCart.length, insufficientStock: [] };
  }, [taxOverride]);

  const applyDiscount = useCallback((itemId: string, discount: number, type: SaleItem['discountType'], discountRuleId?: number) => {
    setCart((currentCart) => currentCart.map((item) => {
      if (item.id !== itemId) {
        return item;
      }

      return recalculateSaleItem(item, {
        discount,
        discountType: type,
        discountRuleId,
      });
    }));
  }, []);

  const applyGlobalDiscount = useCallback((discount: number, type: SaleItem['discountType'], discountRuleId?: number) => {
    setCart((currentCart) => currentCart.map((item) => recalculateSaleItem(item, {
      discount,
      discountType: type,
      discountRuleId,
    })));
  }, []);

  const applyTaxOverride = useCallback((nextTaxOverride: SaleTaxOverride) => {
    setCart((currentCart) => currentCart.map((item) => recalculateSaleItem(item, {
      price: convertPosDisplayCurrencyAmount(item.price, item.currency, nextTaxOverride.currency ?? item.currency),
      unitCost: convertPosDisplayCurrencyAmount(item.unitCost ?? 0, item.currency, nextTaxOverride.currency ?? item.currency),
      taxRate: nextTaxOverride.taxRate,
      taxCode: nextTaxOverride.taxCode,
      taxLabel: nextTaxOverride.taxLabel,
      taxJurisdiction: nextTaxOverride.taxJurisdiction,
      taxIsCustom: nextTaxOverride.taxIsCustom,
      currency: nextTaxOverride.currency,
    })));
  }, []);

  const resetCart = useCallback(() => {
    setCart([]);
    setBarcodeInput('');
    setLastAddedItem(null);
    setCartNotice('');
  }, []);

  const handleBarcodeSubmit = useCallback((event: FormEvent) => {
    event.preventDefault();

    if (!barcodeInput.trim()) {
      return;
    }

    const product = findCatalogProductByBarcode(products, barcodeInput);

    if (product) {
      addToCart(product);
      setBarcodeInput('');
      return;
    }

    setCartNotice(`Producto no encontrado: ${barcodeInput}.`);
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
    cartNotice,
    clearCartNotice: () => setCartNotice(''),
    handleBarcodeSubmit,
    addToCart,
    addProductsToCart,
    replaceCartWithPreticket,
    updateQuantity,
    applyDiscount,
    applyGlobalDiscount,
    applyTaxOverride,
    removeItem,
    resetCart,
  };
}
