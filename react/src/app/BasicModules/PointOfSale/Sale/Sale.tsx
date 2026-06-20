import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { usePointOfSaleCatalogProducts } from '../../CommerceCore/usePointOfSaleCatalogProducts';
import { usePointOfSaleCustomers } from '../../CommerceCore/usePointOfSaleCustomers';
import {
  readStoredCreditRules,
  type CreditRule,
} from '../shared/commercial/credit';
import {
  getEligibleDiscountRules,
  readStoredDiscountRules,
  type DiscountRule,
} from '../shared/commercial/discounts';
import type { Product } from '../shared/commercial/products';
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
import type { PaymentMethod, SaleItem } from './types/sale.types';
import { formatSaleCurrency as formatCurrency } from './utils/saleFormatters';

export default function Sale() {
  const { products: saleProducts, saleCurrency } = usePointOfSaleCatalogProducts();
  const creditCustomers = usePointOfSaleCustomers();
  const {
    registerContext,
    warehouses,
    activeCashRegisters,
    currentOpenShift,
    selectedCashRegisterId,
    isLoading: isRegisterContextLoading,
    error: registerContextError,
    setSelectedCashRegisterId,
    refreshContext: refreshRegisterContext,
    clearError: clearRegisterContextError,
  } = useSaleRegisterContext();
  const effectiveSaleCurrency = useMemo(() => {
    const productCurrency = saleProducts.find((product) => product.currency?.trim())?.currency;
    return (productCurrency || currentOpenShift?.currencyCode || saleCurrency).trim().toUpperCase();
  }, [currentOpenShift?.currencyCode, saleCurrency, saleProducts]);
  const formatSaleCurrency = useCallback(
    (amount: number) => formatCurrency(amount, effectiveSaleCurrency),
    [effectiveSaleCurrency],
  );
  const {
    cart,
    setCart,
    barcodeInput,
    setBarcodeInput,
    lastAddedItem,
    selectedQuickQuantity,
    setSelectedQuickQuantity,
    blockSalesWithoutStock,
    cartNotice,
    clearCartNotice,
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
    formatCurrency: formatSaleCurrency,
  });
  const {
    currentShift,
    setCurrentShift,
    showOpenShiftModal,
    setShowOpenShiftModal,
    showCloseShiftModal,
    openCloseShiftModal,
    closeCloseShiftModal,
    showCashMovementModal,
    setShowCashMovementModal,
    closingSummary,
    closingSummaryError,
    handleOpenShift,
    handleCloseShift,
    handleCashMovement,
    shiftNotice,
    clearShiftNotice,
    shiftError,
    clearShiftError,
    isOpeningShift,
    isClosingShift,
    isLoadingClosingSummary,
    isCreatingCashMovement,
  } = useSaleShift({
    pushActivity,
    formatCurrency: formatSaleCurrency,
    registerContext,
    backendCurrentShift: currentOpenShift,
    isRegisterContextLoading,
    canOpenShift: activeCashRegisters.length > 0,
    currency: effectiveSaleCurrency,
    refreshRegisterContext,
  });

  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [selectedItemForDiscount, setSelectedItemForDiscount] = useState<SaleItem | null>(null);
  const [showGlobalDiscountModal, setShowGlobalDiscountModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [discountRules, setDiscountRules] = useState<DiscountRule[]>(() => readStoredDiscountRules());
  const [creditRules, setCreditRules] = useState<CreditRule[]>(() => readStoredCreditRules());

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
    checkoutNotice,
    clearCheckoutNotice,
    isCompletingSale,
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
    formatCurrency: formatSaleCurrency,
    currency: effectiveSaleCurrency,
    refreshRegisterContext,
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
    formatCurrency: formatSaleCurrency,
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

    resetCart();
    setPayments([]);
    setCashReceived(0);
    pushActivity({
      type: 'sale',
      title: 'Venta cancelada',
      description: 'El ticket activo se limpio desde POS.',
      actor: currentShift?.cashierName ?? 'POS',
      badge: 'Ticket limpio',
      tone: 'warning',
    });
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

  const openPaymentModal = (method: PaymentMethod) => {
    if (method === 'credit') {
      setCreditRules(readStoredCreditRules());
    }

    handleAddPayment(method);
  };

  useSaleKeyboardShortcuts({
    barcodeInputRef,
    filteredQuickProducts,
    isPaid: totals.isPaid,
    isModalOpen: isAnySaleModalOpen,
    onAddToCart: addToCart,
    onAddPayment: openPaymentModal,
    onCompleteSale: () => { void completeSale(); },
    onClearCart: clearCart,
  });

  const openItemDiscountModal = (item: SaleItem) => {
    setDiscountRules(readStoredDiscountRules());
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

  const openGlobalDiscountModal = () => {
    setDiscountRules(readStoredDiscountRules());
    setShowGlobalDiscountModal(true);
  };

  const itemDiscountRules = useMemo(() => {
    if (!selectedItemForDiscount) {
      return [];
    }

    const product = saleProducts.find((candidate) => candidate.id === selectedItemForDiscount.productId);
    return getEligibleDiscountRules(discountRules, {
      amount: selectedItemForDiscount.price * selectedItemForDiscount.quantity,
      productId: selectedItemForDiscount.productId,
      category: product?.department,
    });
  }, [discountRules, saleProducts, selectedItemForDiscount]);

  const globalDiscountRules = useMemo(() => getEligibleDiscountRules(discountRules, {
    amount: totals.subtotal,
    scope: 'order',
  }), [discountRules, totals.subtotal]);

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
        warehouses={warehouses}
        activeCashRegisters={activeCashRegisters}
        selectedCashRegisterId={selectedCashRegisterId}
        isLoading={isRegisterContextLoading}
        isOpeningShift={isOpeningShift}
        error={registerContextError || shiftError}
        onOpenShiftModal={() => setShowOpenShiftModal(true)}
        onOpenShift={handleOpenShift}
        onSelectCashRegister={setSelectedCashRegisterId}
        onRetry={refreshRegisterContext}
        onClearError={() => {
          clearRegisterContextError();
          clearShiftError();
        }}
      />
    );
  }

  return (
    <>
      <ShiftBar
        shift={currentShift}
        onOpenCashMovement={() => setShowCashMovementModal(true)}
        onCloseShift={() => { void openCloseShiftModal(); }}
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

      {[cartNotice, checkoutNotice, shiftNotice, shiftError, registerContextError].filter(Boolean).length > 0 && (
        <div className="mt-3 space-y-2">
          {cartNotice && <OperationalNotice message={cartNotice} onDismiss={clearCartNotice} />}
          {checkoutNotice && <OperationalNotice message={checkoutNotice} onDismiss={clearCheckoutNotice} />}
          {shiftNotice && <OperationalNotice message={shiftNotice} onDismiss={clearShiftNotice} />}
          {shiftError && <OperationalNotice message={shiftError} onDismiss={clearShiftError} />}
          {registerContextError && <OperationalNotice message={registerContextError} onDismiss={clearRegisterContextError} />}
        </div>
      )}

      <div className="mt-3 grid min-h-[720px] grid-cols-1 gap-4 xl:h-[calc(100vh-390px)] xl:grid-cols-[minmax(260px,320px)_minmax(460px,1fr)_minmax(340px,384px)]">
        <div className="min-w-0 space-y-4">
          <PendingPreTicketsPanel
            preTickets={preTickets}
            onPullPreTicket={pullPreTicket}
            formatCurrency={formatSaleCurrency}
          />

          <QuickProductsPanel
            categories={categories}
            filteredQuickProducts={filteredQuickProducts}
            selectedCategory={selectedCategory}
            selectedQuickQuantity={selectedQuickQuantity}
            blockSalesWithoutStock={blockSalesWithoutStock}
            onSelectCategory={setSelectedCategory}
            onAddToCart={addToCart}
            formatCurrency={formatSaleCurrency}
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
          onOpenGlobalDiscount={openGlobalDiscountModal}
          onOpenProductPanel={(product) => setSidePanel({ type: 'product', product })}
          formatCurrency={formatSaleCurrency}
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
          onAddPayment={openPaymentModal}
          onCompleteSale={() => { void completeSale(); }}
          isCompletingSale={isCompletingSale}
          formatCurrency={formatSaleCurrency}
        />
      </div>

      <SaleSidePanel
        panel={sidePanel}
        onClose={() => setSidePanel(null)}
        formatCurrency={formatSaleCurrency}
      />

      <SaleModals
        showAddPaymentModal={showAddPaymentModal}
        selectedPaymentMethod={selectedPaymentMethod}
        remainingAmount={totals.remaining}
        showCloseShiftModal={showCloseShiftModal}
        currentShift={currentShift}
        isClosingShift={isClosingShift}
        closingSummary={closingSummary}
        isLoadingClosingSummary={isLoadingClosingSummary}
        closingSummaryError={closingSummaryError}
        showCashMovementModal={showCashMovementModal}
        isCreatingCashMovement={isCreatingCashMovement}
        selectedItemForDiscount={selectedItemForDiscount}
        showDiscountModal={showDiscountModal}
        showGlobalDiscountModal={showGlobalDiscountModal}
        itemDiscountRules={itemDiscountRules}
        globalDiscountRules={globalDiscountRules}
        creditRules={creditRules}
        creditCustomers={creditCustomers}
        currency={effectiveSaleCurrency}
        cart={cart}
        totals={totals}
        lastSale={lastSale}
        showTicketModal={showTicketModal}
        showReturnModal={showReturnModal}
        onCloseAddPayment={closeAddPaymentModal}
        onConfirmAddPayment={confirmAddPayment}
        onCloseShiftModal={closeCloseShiftModal}
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

function OperationalNotice({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[20px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800 shadow-sm dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
      <span className="flex min-w-0 items-center gap-2">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span className="min-w-0">{message}</span>
      </span>
      <button
        type="button"
        onClick={onDismiss}
        className="rounded-lg px-2 py-1 text-xs font-black uppercase tracking-[0.08em] text-amber-700 transition hover:bg-amber-100 dark:text-amber-200 dark:hover:bg-amber-500/20"
      >
        Cerrar
      </button>
    </div>
  );
}
