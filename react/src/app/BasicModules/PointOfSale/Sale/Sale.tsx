import { useCallback, useEffect, useRef, useState } from 'react';
import { pointOfSaleCatalogProducts as saleProducts, type Product } from '../shared/commercial/products';
import { IndiceSignalBar } from './components/IndiceSignalBar';
import { PendingPreTicketsPanel } from './components/PendingPreTicketsPanel';
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
import { useSaleRegisterContext } from './hooks/useSaleRegisterContext';
import { useSaleShift } from './hooks/useSaleShift';
import { useSaleSmartAlerts } from './hooks/useSaleSmartAlerts';
import { usePendingPreTickets } from './hooks/usePendingPreTickets';
import { useSuspendedSales } from './hooks/useSuspendedSales';
import type { SaleItem } from './types/sale.types';
import { formatSaleCurrency as formatCurrency } from './utils/saleFormatters';

export default function Sale() {
  const registerContext = useSaleRegisterContext();
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
    addProductsToCart,
    updateQuantity,
    applyDiscount,
    applyGlobalDiscount,
    removeItem,
    resetCart,
  } = useSaleCart({ products: saleProducts });
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sidePanel, setSidePanel] = useState<SaleSidePanelState | null>(null);
  const { recentActivities, pushActivity } = useSaleActivityFeed();
  const {
    preTickets,
    pullPreTicket,
  } = usePendingPreTickets({
    products: saleProducts,
    addProductsToCart,
    pushActivity,
    formatCurrency,
  });
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
  } = useSaleShift({ pushActivity, formatCurrency, registerContext });

  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [selectedItemForDiscount, setSelectedItemForDiscount] = useState<SaleItem | null>(null);
  const [showGlobalDiscountModal, setShowGlobalDiscountModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  const { categories, filteredQuickProducts, stockSignals } = useSaleCatalog(saleProducts, selectedCategory);
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
    products: saleProducts,
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
      cashierName: currentShift?.cashierName ?? 'Sin cajero activo',
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
      title: 'Devolucion procesada',
      description: `Devolucion ${type === 'full' ? 'total' : 'parcial'} para venta ${saleId}`,
      actor: currentShift?.cashierName ?? 'Supervisor',
      badge: 'Nota credito',
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
        registerContext={registerContext}
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
          salesTrendLabel={currentShift.totalSales > 0 ? '+18% ritmo de turno' : 'ritmo base de turno'}
          lowStockCount={stockSignals.lowStockProducts.length}
          suspendedCount={suspendedSales.length}
          activeAlertCount={smartAlerts.length}
          isShiftActive={Boolean(currentShift)}
        />
      </div>

      <div className="mt-3">
        <SmartAlertsStrip alerts={smartAlerts} />
      </div>

      <div className="mt-3 grid min-h-[720px] grid-cols-1 gap-4 xl:h-[calc(100vh-390px)] xl:grid-cols-[minmax(260px,320px)_minmax(460px,1fr)_minmax(340px,384px)]">
        <div className="min-w-0 space-y-4">
          <PendingPreTicketsPanel
            preTickets={preTickets}
            onPullPreTicket={pullPreTicket}
            formatCurrency={formatCurrency}
          />

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
        </div>

        <SaleTicketPanel
          cart={cart}
          barcodeInput={barcodeInput}
          barcodeInputRef={barcodeInputRef}
          lastAddedItem={lastAddedItem}
          totals={totals}
          products={saleProducts}
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
