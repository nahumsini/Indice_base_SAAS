import { useCallback, useEffect, useRef, useState } from 'react';
import type { Product } from '../Productos/types/product.types';
import { mockProducts } from '../Productos/data/products.mock';
import { IndiceSignalBar } from './components/IndiceSignalBar';
import { QuickProductsPanel } from './components/QuickProductsPanel';
import { SaleModals } from './components/SaleModals';
import { SaleNoShiftState } from './components/SaleNoShiftState';
import { SalePaymentPanel } from './components/SalePaymentPanel';
import { SaleSidePanel, type SaleSidePanelState } from './components/SaleSidePanel';
import { SaleTicketPanel } from './components/SaleTicketPanel';
import { ShiftBar } from './components/ShiftBar';
import { SmartAlertsStrip } from './components/SmartAlertsStrip';
import { useSaleActivityFeed } from './hooks/useSaleActivityFeed';
import { useSaleCatalog } from './hooks/useSaleCatalog';
import { useSaleCart } from './hooks/useSaleCart';
import { useSaleCheckout } from './hooks/useSaleCheckout';
import { useSaleKeyboardShortcuts } from './hooks/useSaleKeyboardShortcuts';
import { useSaleShift } from './hooks/useSaleShift';
import { useSaleSmartAlerts } from './hooks/useSaleSmartAlerts';
import { useSuspendedSales } from './hooks/useSuspendedSales';
import type { SaleItem } from './types/sale.types';
import { formatSaleCurrency as formatCurrency } from './utils/saleFormatters';

export default function Sale() {
  const {
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
  } = useSaleCart({ products: mockProducts });
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sidePanel, setSidePanel] = useState<SaleSidePanelState | null>(null);
  const { recentActivities, pushActivity } = useSaleActivityFeed();
  const {
    currentShift,
    setCurrentShift,
    showOpenShiftModal,
    setShowOpenShiftModal,
    showCloseShiftModal,
    setShowCloseShiftModal,
    showCashMovementModal,
    setShowCashMovementModal,
    handleOpenShift,
    handleCloseShift,
    handleCashMovement,
  } = useSaleShift({ pushActivity, formatCurrency });

  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [selectedItemForDiscount, setSelectedItemForDiscount] = useState<SaleItem | null>(null);
  const [showGlobalDiscountModal, setShowGlobalDiscountModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  const { categories, filteredQuickProducts, stockSignals } = useSaleCatalog(mockProducts, selectedCategory);
  const {
    payments,
    setPayments,
    setCashReceived,
    totals,
    showAddPaymentModal,
    selectedPaymentMethod,
    showTicketModal,
    setShowTicketModal,
    lastSale,
    clearPayments,
    closeAddPaymentModal,
    handleAddPayment,
    confirmAddPayment,
    removePayment,
    completeSale,
    handleExactPayment,
  } = useSaleCheckout({
    cart,
    products: mockProducts,
    currentShift,
    setCurrentShift,
    resetCart,
    pushActivity,
    formatCurrency,
  });
  const openProductPanel = useCallback((product: Product) => {
    setSidePanel({ type: 'product', product });
  }, []);
  const {
    suspendedSales,
    suspendCurrentSale,
    resumeSuspendedSale,
    discardSuspendedSale,
  } = useSuspendedSales({
    cart,
    payments,
    totals,
    currentShift,
    resetCart,
    setCart,
    setPayments,
    setCashReceived,
    pushActivity,
    formatCurrency,
  });

  const smartAlerts = useSaleSmartAlerts({
    currentShift,
    stockSignals,
    suspendedSalesCount: suspendedSales.length,
    onOpenProductPanel: openProductPanel,
  });
  const isAnySaleModalOpen =
    showAddPaymentModal
    || showOpenShiftModal
    || showCloseShiftModal
    || showCashMovementModal
    || showDiscountModal
    || showGlobalDiscountModal
    || showTicketModal
    || showReturnModal;

  useEffect(() => {
    const focusInput = () => {
      if (
        barcodeInputRef.current
        && !showAddPaymentModal
        && !showOpenShiftModal
        && !showCloseShiftModal
        && !showCashMovementModal
        && !showDiscountModal
        && !showGlobalDiscountModal
        && !showTicketModal
        && !showReturnModal
        && currentShift
      ) {
        barcodeInputRef.current.focus();
      }
    };

    focusInput();
    window.addEventListener('click', focusInput);
    return () => window.removeEventListener('click', focusInput);
  }, [
    showAddPaymentModal,
    showOpenShiftModal,
    showCloseShiftModal,
    showCashMovementModal,
    showDiscountModal,
    showGlobalDiscountModal,
    showTicketModal,
    showReturnModal,
    currentShift,
  ]);

  const clearCart = () => {
    if (cart.length === 0 && payments.length === 0) {
      return;
    }

    if (confirm('¿Cancelar venta actual?')) {
      resetCart();
      setPayments([]);
      setCashReceived(0);
    }
  };

  const openSalePanel = () => {
    setSidePanel({
      type: 'sale',
      cart,
      payments,
      totals,
      cashierName: currentShift?.cashierName ?? 'No active cashier',
    });
  };

  const toggleFullscreenMode = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
      return;
    }

    document.exitFullscreen?.();
  };

  const handleReturn = (saleId: string, type: 'full' | 'partial') => {
    console.log('Processing return:', { saleId, type });

    alert(`Devolución ${type === 'full' ? 'total' : 'parcial'} procesada.\nVenta: ${saleId}\n\nNota de crédito generada.`);
    setShowReturnModal(false);
    pushActivity({
      type: 'return',
      title: 'Return processed',
      description: `${type === 'full' ? 'Full' : 'Partial'} return for sale ${saleId}`,
      actor: currentShift?.cashierName ?? 'Supervisor',
      badge: 'Credit note',
      tone: 'danger',
    });
  };

  useSaleKeyboardShortcuts({
    barcodeInputRef,
    filteredQuickProducts,
    isPaid: totals.isPaid,
    isModalOpen: isAnySaleModalOpen,
    onAddToCart: addToCart,
    onAddPayment: handleAddPayment,
    onCompleteSale: () => completeSale(),
    onClearCart: clearCart,
  });

  const openItemDiscountModal = (item: SaleItem) => {
    setSelectedItemForDiscount(item);
    setShowDiscountModal(true);
  };

  const closeItemDiscountModal = () => {
    setShowDiscountModal(false);
    setSelectedItemForDiscount(null);
  };

  const confirmItemDiscount = (discount: number, type: SaleItem['discountType']) => {
    if (!selectedItemForDiscount) {
      return;
    }

    applyDiscount(selectedItemForDiscount.id, discount, type);
    closeItemDiscountModal();
  };

  const confirmGlobalDiscount = (discount: number, type: SaleItem['discountType']) => {
    applyGlobalDiscount(discount, type);
    setShowGlobalDiscountModal(false);
  };

  const closeTicketModal = () => {
    setShowTicketModal(false);
    setTimeout(() => {
      barcodeInputRef.current?.focus();
    }, 100);
  };

  if (!currentShift) {
    return (
      <SaleNoShiftState
        isOpenShiftModalOpen={showOpenShiftModal}
        onOpenShiftModal={() => setShowOpenShiftModal(true)}
        onOpenShift={handleOpenShift}
      />
    );
  }

  return (
    <>
      <ShiftBar
        shift={currentShift}
        onOpenCashMovement={() => setShowCashMovementModal(true)}
        onCloseShift={() => setShowCloseShiftModal(true)}
        onOpenReturn={() => setShowReturnModal(true)}
      />

      <div className="mt-3">
        <IndiceSignalBar
          salesTrendLabel={currentShift.totalSales > 0 ? '+18% shift pace' : 'baseline shift pace'}
          lowStockCount={stockSignals.lowStockProducts.length}
          suspendedCount={suspendedSales.length}
          activeAlertCount={smartAlerts.length}
          isShiftActive={Boolean(currentShift)}
        />
      </div>

      <div className="mt-3">
        <SmartAlertsStrip alerts={smartAlerts} />
      </div>

      <div className="h-[calc(100vh-390px)] min-h-[720px] flex gap-4 mt-3">
        <QuickProductsPanel
          categories={categories}
          filteredQuickProducts={filteredQuickProducts}
          selectedCategory={selectedCategory}
          selectedQuickQuantity={selectedQuickQuantity}
          blockSalesWithoutStock={blockSalesWithoutStock}
          onSelectCategory={setSelectedCategory}
          onAddToCart={addToCart}
          formatCurrency={formatCurrency}
        />

        <SaleTicketPanel
          cart={cart}
          barcodeInput={barcodeInput}
          barcodeInputRef={barcodeInputRef}
          lastAddedItem={lastAddedItem}
          totals={totals}
          products={mockProducts}
          onBarcodeInputChange={setBarcodeInput}
          onBarcodeSubmit={handleBarcodeSubmit}
          onClearCart={clearCart}
          onUpdateQuantity={updateQuantity}
          onRemoveItem={removeItem}
          onOpenItemDiscount={openItemDiscountModal}
          onOpenGlobalDiscount={() => setShowGlobalDiscountModal(true)}
          onOpenProductPanel={(product) => setSidePanel({ type: 'product', product })}
          formatCurrency={formatCurrency}
        />

        <SalePaymentPanel
          totals={totals}
          payments={payments}
          cartItemCount={cart.length}
          selectedQuickQuantity={selectedQuickQuantity}
          suspendedSales={suspendedSales}
          recentActivities={recentActivities}
          onRemovePayment={removePayment}
          onSuspendSale={suspendCurrentSale}
          onResumeSuspendedSale={resumeSuspendedSale}
          onDiscardSuspendedSale={discardSuspendedSale}
          onQuantityChange={setSelectedQuickQuantity}
          onOpenSalePanel={openSalePanel}
          onOpenReturn={() => setShowReturnModal(true)}
          onFullscreen={toggleFullscreenMode}
          onExactPayment={handleExactPayment}
          onAddPayment={handleAddPayment}
          onCompleteSale={() => completeSale()}
          formatCurrency={formatCurrency}
        />
      </div>

      <SaleSidePanel
        panel={sidePanel}
        onClose={() => setSidePanel(null)}
        formatCurrency={formatCurrency}
      />

      <SaleModals
        showAddPaymentModal={showAddPaymentModal}
        selectedPaymentMethod={selectedPaymentMethod}
        remainingAmount={totals.remaining}
        showCloseShiftModal={showCloseShiftModal}
        currentShift={currentShift}
        showCashMovementModal={showCashMovementModal}
        selectedItemForDiscount={selectedItemForDiscount}
        showDiscountModal={showDiscountModal}
        showGlobalDiscountModal={showGlobalDiscountModal}
        cart={cart}
        totals={totals}
        lastSale={lastSale}
        showTicketModal={showTicketModal}
        showReturnModal={showReturnModal}
        onCloseAddPayment={closeAddPaymentModal}
        onConfirmAddPayment={confirmAddPayment}
        onCloseShiftModal={() => setShowCloseShiftModal(false)}
        onConfirmCloseShift={handleCloseShift}
        onCloseCashMovementModal={() => setShowCashMovementModal(false)}
        onConfirmCashMovement={handleCashMovement}
        onCloseItemDiscount={closeItemDiscountModal}
        onConfirmItemDiscount={confirmItemDiscount}
        onCloseGlobalDiscount={() => setShowGlobalDiscountModal(false)}
        onConfirmGlobalDiscount={confirmGlobalDiscount}
        onCloseTicket={closeTicketModal}
        onCloseReturn={() => setShowReturnModal(false)}
        onConfirmReturn={handleReturn}
      />
    </>
  );
}
