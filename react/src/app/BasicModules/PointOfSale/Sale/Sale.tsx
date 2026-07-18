import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { AlertTriangle } from 'lucide-react';
import { useLocalStorageState } from '../../../hooks/useLocalStorageState';
import { defaultBusinessCurrency, normalizeBusinessCurrencyCode } from '../../shared/businessCurrency';
import { usePointOfSaleCatalogProducts } from '../../CommerceCore/usePointOfSaleCatalogProducts';
import { usePointOfSaleCustomers } from '../../CommerceCore/usePointOfSaleCustomers';
import { useSalesCrm } from '../../Sales/salesCrmContext';
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
import { CustomerDisplaySetupModal } from './components/CustomerDisplaySetupModal';
import { IndiceSignalBar } from './components/IndiceSignalBar';
import { PendingPreTicketsPanel } from './components/PendingPreTicketsPanel';
import { PosFiscalSettingsModal } from './components/PosFiscalSettingsModal';
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
import { useCustomerDisplayPublisher } from './hooks/useCustomerDisplayPublisher';
import { useSaleKeyboardShortcuts } from './hooks/useSaleKeyboardShortcuts';
import { useSaleRegisterContext } from './hooks/useSaleRegisterContext';
import { useSaleShift } from './hooks/useSaleShift';
import { useSaleSmartAlerts } from './hooks/useSaleSmartAlerts';
import { usePendingPreTickets } from './hooks/usePendingPreTickets';
import { useSuspendedSales } from './hooks/useSuspendedSales';
import type { PaymentMethod, SaleItem } from './types/sale.types';
import { useLearningModeHeaderActions } from '../../../learningMode';
import { formatPosDisplayCurrency } from './utils/posCurrencyDisplay';
import {
  createDefaultPosFiscalSettings,
  getFiscalSummary,
  normalizePosFiscalSettings,
  type PosFiscalSettings,
} from './utils/posFiscalSettings';

export default function Sale() {
  const learningModeActive = useLearningModeHeaderActions()?.active ?? false;
  const navigate = useNavigate();
  const { products: saleProducts, saleCurrency, reloadInventoryBalances } = usePointOfSaleCatalogProducts();
  const { reloadSalesRecords } = useSalesCrm();
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
  const baseTransactionCurrency = useMemo(() => {
    const productCurrency = saleProducts.find((product) => product.currency?.trim())?.currency;
    return (currentOpenShift?.currencyCode || saleCurrency || productCurrency || defaultBusinessCurrency).trim().toUpperCase();
  }, [currentOpenShift?.currencyCode, saleCurrency, saleProducts]);
  const [storedFiscalSettings, setStoredFiscalSettings] = useLocalStorageState<Partial<PosFiscalSettings> | null>(
    'indice.pos.saleFiscalSettings',
    null,
  );
  const fiscalSettings = useMemo(
    () => normalizePosFiscalSettings(storedFiscalSettings, baseTransactionCurrency),
    [baseTransactionCurrency, storedFiscalSettings],
  );
  const transactionCurrency = fiscalSettings.currencyCode;
  const formatSaleCurrency = useCallback(
    (amount: number) => formatPosDisplayCurrency(amount, transactionCurrency, transactionCurrency),
    [transactionCurrency],
  );
  const cartTaxOverride = useMemo(() => ({
    taxRate: fiscalSettings.taxRate,
    taxCode: fiscalSettings.taxPresetId,
    taxLabel: fiscalSettings.taxLabel,
    taxJurisdiction: fiscalSettings.taxJurisdiction,
    taxIsCustom: fiscalSettings.isCustomRate,
    currency: fiscalSettings.currencyCode,
  }), [fiscalSettings]);
  const fiscalSummary = useMemo(
    () => getFiscalSummary(fiscalSettings),
    [fiscalSettings],
  );
  const shiftCurrencyMismatchNotice = useMemo(() => {
    const shiftCurrency = currentOpenShift?.currencyCode?.trim().toUpperCase();
    if (!shiftCurrency || shiftCurrency === transactionCurrency) {
      return '';
    }

    return `El turno actual esta abierto en ${shiftCurrency}, pero la configuracion fiscal usa ${transactionCurrency}. Para finalizar con esa divisa, cierra este turno y abre caja en ${transactionCurrency}.`;
  }, [currentOpenShift?.currencyCode, transactionCurrency]);
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
    applyTaxOverride,
    removeItem,
    resetCart,
  } = useSaleCart({ products: saleProducts, taxOverride: cartTaxOverride });
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sidePanel, setSidePanel] = useState<SaleSidePanelState | null>(null);
  const { recentActivities, pushActivity } = useSaleActivityFeed();
  const {
    preTickets,
    pullPreTicket,
    reloadPreTickets,
    queueError: preTicketQueueError,
    isRefreshing: isRefreshingPreTickets,
    lastUpdatedAt: preTicketsLastUpdatedAt,
    claimingPreTicketIds,
  } = usePendingPreTickets({
    cashRegisterId: Number(registerContext.cashRegisterId) || undefined,
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
    currency: transactionCurrency,
    refreshRegisterContext,
  });
  const syncCheckoutData = useCallback(async () => {
    await Promise.all([
      reloadSalesRecords(),
      reloadInventoryBalances(),
    ]);
  }, [reloadInventoryBalances, reloadSalesRecords]);
  const openCreditSaleInReceivables = useCallback((candidateSaleId: string) => {
    navigate(`/receivables/credit-sales?candidateSaleId=${encodeURIComponent(candidateSaleId)}&openCreditSale=1`);
  }, [navigate]);

  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [selectedItemForDiscount, setSelectedItemForDiscount] = useState<SaleItem | null>(null);
  const [showGlobalDiscountModal, setShowGlobalDiscountModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showCustomerDisplayModal, setShowCustomerDisplayModal] = useState(false);
  const [showFiscalSettingsModal, setShowFiscalSettingsModal] = useState(false);
  const [discountRules, setDiscountRules] = useState<DiscountRule[]>(() => readStoredDiscountRules());
  const [creditRules, setCreditRules] = useState<CreditRule[]>(() => readStoredCreditRules());

  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const posFullscreenRef = useRef<HTMLDivElement>(null);

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
    currency: transactionCurrency,
    refreshRegisterContext,
    syncCheckoutData,
    onCreditCheckoutCompleted: openCreditSaleInReceivables,
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
    || showReturnModal
    || showCustomerDisplayModal
    || showFiscalSettingsModal;

  useCustomerDisplayPublisher({
    cart,
    payments,
    totals,
    currentShift,
    currencyCode: transactionCurrency,
  });

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
        && !showCustomerDisplayModal
        && !showFiscalSettingsModal
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
    showCustomerDisplayModal,
    showFiscalSettingsModal,
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
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
      return;
    }

    posFullscreenRef.current?.requestFullscreen?.();
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

  const handleOpenShiftWithCurrency = useCallback(async (
    initialCash: number,
    openingNote?: string,
    selectedCurrencyCode?: string,
  ) => {
    const openingCurrency = normalizeBusinessCurrencyCode(selectedCurrencyCode, transactionCurrency);
    setStoredFiscalSettings(createDefaultPosFiscalSettings(openingCurrency));
    await handleOpenShift(initialCash, openingNote, openingCurrency);
  }, [handleOpenShift, setStoredFiscalSettings, transactionCurrency]);

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

  const confirmFiscalSettings = (settings: PosFiscalSettings) => {
    const normalizedSettings = normalizePosFiscalSettings(settings, transactionCurrency);
    setStoredFiscalSettings(normalizedSettings);
    applyTaxOverride({
      taxRate: normalizedSettings.taxRate,
      taxCode: normalizedSettings.taxPresetId,
      taxLabel: normalizedSettings.taxLabel,
      taxJurisdiction: normalizedSettings.taxJurisdiction,
      taxIsCustom: normalizedSettings.isCustomRate,
      currency: normalizedSettings.currencyCode,
    });
    if (payments.length > 0) {
      setPayments([]);
      setCashReceived(0);
    }
    setShowFiscalSettingsModal(false);
    pushActivity({
      type: 'sale',
      title: 'Fiscal configurado',
      description: `${normalizedSettings.currencyCode} con ${normalizedSettings.taxLabel} aplicado al ticket.`,
      actor: currentShift?.cashierName ?? 'POS',
      badge: `${normalizedSettings.taxRate}%`,
      tone: 'info',
    });
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
        preferredCurrencyCode={transactionCurrency}
        isLoading={isRegisterContextLoading}
        isOpeningShift={isOpeningShift}
        error={registerContextError || shiftError}
        onOpenShiftModal={() => setShowOpenShiftModal(true)}
        onCloseOpenShiftModal={() => setShowOpenShiftModal(false)}
        onOpenShift={handleOpenShiftWithCurrency}
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
      <div
        ref={posFullscreenRef}
        data-pos-fullscreen-root
        className="rounded-lg bg-[#F7F8FA] p-3 dark:bg-[#111827]"
      >
        <div data-pos-terminal-shell className="mx-auto flex min-h-0 w-full flex-col">
          <ShiftBar
            shift={currentShift}
            onOpenCashMovement={() => setShowCashMovementModal(true)}
            onCloseShift={() => { void openCloseShiftModal(); }}
            onOpenReturn={() => setShowReturnModal(true)}
            onToggleFullscreen={toggleFullscreenMode}
            onOpenCustomerDisplay={() => setShowCustomerDisplayModal(true)}
            fiscalSummary={fiscalSummary}
            fiscalDetail={`${fiscalSettings.taxRate}%`}
            onOpenFiscalSettings={() => setShowFiscalSettingsModal(true)}
          />

          <div className={`mt-2 grid gap-2 ${smartAlerts.length > 0 ? '2xl:grid-cols-[minmax(0,1fr)_minmax(300px,400px)]' : ''}`}>
            {!learningModeActive ? (
              <IndiceSignalBar
                salesTrendLabel={currentShift.totalSales > 0 ? '+18% ritmo de turno' : 'ritmo base de turno'}
                lowStockCount={stockSignals.lowStockProducts.length}
                suspendedCount={suspendedSales.length}
                activeAlertCount={smartAlerts.length}
                isShiftActive={Boolean(currentShift)}
              />
            ) : null}

            {smartAlerts.length > 0 && <SmartAlertsStrip alerts={smartAlerts} />}
          </div>

          {[cartNotice, checkoutNotice, shiftCurrencyMismatchNotice, shiftNotice, shiftError, registerContextError].filter(Boolean).length > 0 && (
            <div className="mt-2 space-y-2">
              {cartNotice && <OperationalNotice message={cartNotice} onDismiss={clearCartNotice} />}
              {checkoutNotice && <OperationalNotice message={checkoutNotice} onDismiss={clearCheckoutNotice} />}
              {shiftCurrencyMismatchNotice && <OperationalNotice message={shiftCurrencyMismatchNotice} />}
              {shiftNotice && <OperationalNotice message={shiftNotice} onDismiss={clearShiftNotice} />}
              {shiftError && <OperationalNotice message={shiftError} onDismiss={clearShiftError} />}
              {registerContextError && <OperationalNotice message={registerContextError} onDismiss={clearRegisterContextError} />}
            </div>
          )}

          <div
            data-pos-workspace-grid
            className="mt-3 grid min-h-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(620px,1fr)_minmax(420px,520px)] 2xl:h-[clamp(560px,calc(100vh-25rem),720px)] 2xl:grid-cols-[minmax(560px,1fr)_minmax(420px,520px)_minmax(320px,400px)]"
          >
            <div data-pos-products-column className="flex min-h-0 min-w-0 flex-col gap-4 xl:row-span-2 2xl:row-span-1">
              <PendingPreTicketsPanel
                preTickets={preTickets}
                onPullPreTicket={pullPreTicket}
                onRetry={() => void reloadPreTickets()}
                formatCurrency={formatSaleCurrency}
                queueError={preTicketQueueError}
                isRefreshing={isRefreshingPreTickets}
                lastUpdatedAt={preTicketsLastUpdatedAt}
                claimingPreTicketIds={claimingPreTicketIds}
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

            <div data-pos-ticket-column className="min-h-0 min-w-0 xl:col-start-2 xl:row-start-1 2xl:col-start-auto 2xl:row-start-auto">
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
            </div>

            <div data-pos-payment-column className="min-h-0 min-w-0 xl:col-start-2 xl:row-start-2 2xl:col-start-auto 2xl:row-start-auto">
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
                onOpenCustomerDisplay={() => setShowCustomerDisplayModal(true)}
                onExactPayment={handleExactPayment}
                onAddPayment={openPaymentModal}
                onCompleteSale={() => { void completeSale(); }}
                isCompletingSale={isCompletingSale}
                checkoutNotice={checkoutNotice}
                onClearCheckoutNotice={clearCheckoutNotice}
                formatCurrency={formatSaleCurrency}
              />
            </div>
          </div>
        </div>
      </div>

      <SaleSidePanel
        panel={sidePanel}
        onClose={() => setSidePanel(null)}
        formatCurrency={formatSaleCurrency}
      />

      <CustomerDisplaySetupModal
        isOpen={showCustomerDisplayModal}
        shift={currentShift}
        onClose={() => setShowCustomerDisplayModal(false)}
      />

      <PosFiscalSettingsModal
        isOpen={showFiscalSettingsModal}
        settings={fiscalSettings}
        totals={totals}
        cartItemCount={cart.length}
        formatCurrency={formatSaleCurrency}
        onClose={() => setShowFiscalSettingsModal(false)}
        onConfirm={confirmFiscalSettings}
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
        currency={transactionCurrency}
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
  onDismiss?: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800 shadow-sm dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
      <span className="flex min-w-0 items-center gap-2">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span className="min-w-0">{message}</span>
      </span>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-lg px-2 py-1 text-xs font-black uppercase tracking-[0.08em] text-amber-700 transition hover:bg-amber-100 dark:text-amber-200 dark:hover:bg-amber-500/20"
        >
          Cerrar
        </button>
      )}
    </div>
  );
}
