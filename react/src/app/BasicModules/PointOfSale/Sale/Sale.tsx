import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { AlertTriangle, ReceiptText } from 'lucide-react';
import { useLocalStorageState } from '../../../hooks/useLocalStorageState';
import { defaultBusinessCurrency, normalizeBusinessCurrencyCode } from '../../shared/businessCurrency';
import { usePointOfSaleCatalogProducts } from '../../CommerceCore/usePointOfSaleCatalogProducts';
import { usePointOfSaleCustomers } from '../../CommerceCore/usePointOfSaleCustomers';
import { useSalesCrm } from '../../Sales/salesCrmContext';
import { readStoredCreditRules, type CreditRule } from '../shared/commercial/credit';
import type { DiscountRule } from '../shared/commercial/discounts';
import { evaluateDiscountRules } from '../shared/commercial/discounts/services/discountRulesApi';
import type { Product } from '../shared/commercial/products';
import { CashMovementModal } from './components/CashMovementModal';
import { IndiceSignalBar } from './components/IndiceSignalBar';
import { PendingPreTicketsPanel } from './components/PendingPreTicketsPanel';
import { PosFiscalSettingsModal } from './components/PosFiscalSettingsModal';
import { QuickProductsPanel } from './components/QuickProductsPanel';
import { ReturnModal } from './components/ReturnModal';
import { SaleModals } from './components/SaleModals';
import { SaleNoShiftState } from './components/SaleNoShiftState';
import { SalePaymentPanel } from './components/SalePaymentPanel';
import { SaleSidePanel, type SaleSidePanelState } from './components/SaleSidePanel';
import { SaleTicketPanel } from './components/SaleTicketPanel';
import { ShiftBar } from './components/ShiftBar';
import { ShiftSummaryWorkspace } from './components/ShiftSummaryWorkspace';
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
import { usePointOfSaleTranslations } from '../hooks/usePointOfSaleTranslations';
import type { PaymentMethod, PaymentPreview, SaleItem } from './types/sale.types';
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
  const pointOfSaleCopy = usePointOfSaleTranslations();
  const [customerDisplayPaymentPreview, setCustomerDisplayPaymentPreview] = useState<PaymentPreview | null>(null);
  const { reloadSalesRecords } = useSalesCrm();
  const creditCustomers = usePointOfSaleCustomers();
  const {
    registerContext,
    warehouses,
    activeCashRegisters,
    currentOpenShift,
    canManageCashRegisters,
    selectedCashRegisterId,
    isLoading: isRegisterContextLoading,
    error: registerContextError,
    setSelectedCashRegisterId,
    refreshContext: refreshRegisterContext,
    clearError: clearRegisterContextError,
  } = useSaleRegisterContext();
  const {
    balanceLoadError,
    isLoadingInventoryBalances,
    products: saleProducts,
    saleCurrency,
    reloadInventoryBalances,
  } = usePointOfSaleCatalogProducts(registerContext?.warehouseId);
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
  const cartTaxOverride = useMemo(
    () => ({
      taxRate: fiscalSettings.taxRate,
      taxCode: fiscalSettings.taxPresetId,
      taxLabel: fiscalSettings.taxLabel,
      taxJurisdiction: fiscalSettings.taxJurisdiction,
      taxIsCustom: fiscalSettings.isCustomRate,
      currency: fiscalSettings.currencyCode,
    }),
    [fiscalSettings],
  );
  const fiscalSummary = useMemo(() => getFiscalSummary(fiscalSettings), [fiscalSettings]);
  const shiftCurrencyMismatchNotice = useMemo(() => {
    const shiftCurrency = currentOpenShift?.currencyCode?.trim().toUpperCase();
    if (!shiftCurrency || shiftCurrency === transactionCurrency) {
      return '';
    }

    return pointOfSaleCopy.sale.shift.currencyMismatchNotice(shiftCurrency, transactionCurrency);
  }, [currentOpenShift?.currencyCode, pointOfSaleCopy.sale.shift, transactionCurrency]);
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
    replaceCartWithPreticket,
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
    activePreticketId,
    activePreticketCode,
    releaseActivePreticket,
    completeActivePreticket,
  } = usePendingPreTickets({
    cashRegisterId: Number(registerContext?.cashRegisterId) || undefined,
    products: saleProducts,
    cartHasItems: cart.length > 0,
    replaceCartWithPreticket,
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
    loadClosingSummary,
    isCreatingCashMovement,
  } = useSaleShift({
    pushActivity,
    formatCurrency: formatSaleCurrency,
    copy: pointOfSaleCopy.sale.shift,
    registerContext,
    backendCurrentShift: currentOpenShift,
    isRegisterContextLoading,
    canOpenShift: activeCashRegisters.length > 0,
    currency: transactionCurrency,
    refreshRegisterContext,
  });
  const syncCheckoutData = useCallback(async () => {
    await Promise.all([reloadSalesRecords(), reloadInventoryBalances()]);
  }, [reloadInventoryBalances, reloadSalesRecords]);
  const openCreditSaleInReceivables = useCallback(
    (candidateSaleId: string) => {
      navigate(`/receivables/credit-sales?candidateSaleId=${encodeURIComponent(candidateSaleId)}&openCreditSale=1`);
    },
    [navigate],
  );

  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [selectedItemForDiscount, setSelectedItemForDiscount] = useState<SaleItem | null>(null);
  const [showGlobalDiscountModal, setShowGlobalDiscountModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showShiftSummaryWorkspace, setShowShiftSummaryWorkspace] = useState(false);
  const [showFiscalSettingsModal, setShowFiscalSettingsModal] = useState(false);
  const [checkoutRequestId, setCheckoutRequestId] = useState(0);
  const [productSearchRequestId, setProductSearchRequestId] = useState(0);
  const [isProductWorkspaceOpen, setIsProductWorkspaceOpen] = useState(false);
  const [isPreticketWorkspaceOpen, setIsPreticketWorkspaceOpen] = useState(false);
  const [isPaymentWorkspaceOpen, setIsPaymentWorkspaceOpen] = useState(false);
  const [discountRules, setDiscountRules] = useState<DiscountRule[]>([]);
  const [discountRulesError, setDiscountRulesError] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [creditRules, setCreditRules] = useState<CreditRule[]>(() => readStoredCreditRules());
  const selectedCustomer = useMemo(
    () => creditCustomers.find((customer) => customer.id === selectedCustomerId),
    [creditCustomers, selectedCustomerId],
  );

  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const posFullscreenRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let animationFrame = 0;

    const syncTerminalHeight = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(() => {
        const terminalRoot = posFullscreenRef.current;
        if (!terminalRoot || document.fullscreenElement === terminalRoot) {
          return;
        }

        const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
        const terminalTop = Math.max(0, terminalRoot.getBoundingClientRect().top);
        const availableHeight = Math.max(540, viewportHeight - terminalTop - 12);
        terminalRoot.style.setProperty('--pos-terminal-height', `${availableHeight}px`);
      });
    };

    syncTerminalHeight();
    window.addEventListener('resize', syncTerminalHeight);
    window.addEventListener('scroll', syncTerminalHeight, { passive: true });
    window.visualViewport?.addEventListener('resize', syncTerminalHeight);
    document.addEventListener('fullscreenchange', syncTerminalHeight);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', syncTerminalHeight);
      window.removeEventListener('scroll', syncTerminalHeight);
      window.visualViewport?.removeEventListener('resize', syncTerminalHeight);
      document.removeEventListener('fullscreenchange', syncTerminalHeight);
    };
  }, [currentShift]);

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
    confirmWorkspacePayment,
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
    inventoryBalancesLoading: isLoadingInventoryBalances,
    inventoryBalancesError: balanceLoadError,
    customerId: selectedCustomerId,
    preticketId: activePreticketId,
    onCheckoutCompleted: () => {
      setSelectedCustomerId('');
      completeActivePreticket();
    },
  });

  useEffect(() => {
    const creditCustomerId = payments.find((payment) => payment.creditDetails?.customerId)?.creditDetails?.customerId;
    if (creditCustomerId && creditCustomerId !== selectedCustomerId) {
      setSelectedCustomerId(creditCustomerId);
    }
  }, [payments, selectedCustomerId]);
  const openProductPanel = useCallback((product: Product) => {
    setSidePanel({ type: 'product', product });
  }, []);
  const { suspendedSales, suspendCurrentSale, resumeSuspendedSale, discardSuspendedSale } = useSuspendedSales({
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
    showAddPaymentModal ||
    showOpenShiftModal ||
    showCloseShiftModal ||
    showCashMovementModal ||
    showDiscountModal ||
    showGlobalDiscountModal ||
    showTicketModal ||
    showReturnModal ||
    showShiftSummaryWorkspace ||
    showFiscalSettingsModal;

  useCustomerDisplayPublisher({
    cart,
    payments,
    totals,
    currentShift,
    currencyCode: transactionCurrency,
    paymentPreview: customerDisplayPaymentPreview,
  });

  useEffect(() => {
    const focusInput = (event?: MouseEvent) => {
      const target = event?.target instanceof Element ? event.target : null;
      if (target?.closest('button, input, select, textarea, a, [role="button"], [contenteditable="true"]')) {
        return;
      }
      if (
        barcodeInputRef.current &&
        !showAddPaymentModal &&
        !showOpenShiftModal &&
        !showCloseShiftModal &&
        !showCashMovementModal &&
        !showDiscountModal &&
        !showGlobalDiscountModal &&
        !showTicketModal &&
        !showReturnModal &&
        !showShiftSummaryWorkspace &&
        !showFiscalSettingsModal &&
        currentShift
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
    showShiftSummaryWorkspace,
    showFiscalSettingsModal,
    currentShift,
  ]);

  const clearCart = async () => {
    if (cart.length === 0 && payments.length === 0 && !activePreticketId) {
      return;
    }

    if (activePreticketId && !(await releaseActivePreticket())) {
      return;
    }
    resetCart();
    setPayments([]);
    setCashReceived(0);
    setSelectedCustomerId('');
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

  const openReturnWorkspace = () => {
    setShowCashMovementModal(false);
    setShowShiftSummaryWorkspace(false);
    setIsProductWorkspaceOpen(false);
    setIsPreticketWorkspaceOpen(false);
    setIsPaymentWorkspaceOpen(false);
    setShowReturnModal(true);
  };

  const openCashMovementWorkspace = () => {
    setShowReturnModal(false);
    setShowShiftSummaryWorkspace(false);
    setIsProductWorkspaceOpen(false);
    setIsPreticketWorkspaceOpen(false);
    setIsPaymentWorkspaceOpen(false);
    setShowCashMovementModal(true);
  };

  const openShiftSummaryWorkspace = () => {
    setShowReturnModal(false);
    setShowCashMovementModal(false);
    setIsProductWorkspaceOpen(false);
    setIsPreticketWorkspaceOpen(false);
    setIsPaymentWorkspaceOpen(false);
    setShowShiftSummaryWorkspace(true);
    void loadClosingSummary();
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

  const handleOpenShiftWithCurrency = useCallback(
    async (initialCash: number, openingNote?: string, selectedCurrencyCode?: string) => {
      const openingCurrency = normalizeBusinessCurrencyCode(selectedCurrencyCode, transactionCurrency);
      setStoredFiscalSettings(createDefaultPosFiscalSettings(openingCurrency));
      await handleOpenShift(initialCash, openingNote, openingCurrency);
    },
    [handleOpenShift, setStoredFiscalSettings, transactionCurrency],
  );

  useSaleKeyboardShortcuts({
    barcodeInputRef,
    filteredQuickProducts,
    isPaid: totals.isPaid,
    isModalOpen: isAnySaleModalOpen,
    onAddToCart: addToCart,
    onAddPayment: openPaymentModal,
    onCompleteSale: () => {
      void completeSale();
    },
    onClearCart: clearCart,
  });

  const openItemDiscountModal = async (item: SaleItem) => {
    if (activePreticketId) {
      setDiscountRulesError('El descuento del preticket ya fue calculado en kiosco. Cancela el pedido para iniciar un ticket editable.');
      return;
    }
    setSelectedItemForDiscount(item);
    setShowDiscountModal(true);
    setDiscountRules([]);
    setDiscountRulesError('');
    const product = saleProducts.find((candidate) => candidate.id === item.productId);
    try {
      setDiscountRules(await evaluateDiscountRules({
        channel: 'pos',
        amount: item.price * item.quantity,
        productId: product?.salesProductBackendId ?? null,
        category: product?.department,
        customerType: selectedCustomer?.customerType,
        scope: 'product',
        currencyCode: transactionCurrency,
        warehouseId: registerContext?.warehouseId ? Number(registerContext.warehouseId) : null,
        unitId: registerContext?.businessUnitId ? Number(registerContext.businessUnitId) : null,
        businessId: registerContext?.businessId ? Number(registerContext.businessId) : null,
      }));
    } catch (nextError) {
      setDiscountRulesError(nextError instanceof Error ? nextError.message : 'No se pudieron consultar las reglas.');
    }
  };

  const closeItemDiscountModal = () => {
    setShowDiscountModal(false);
    setSelectedItemForDiscount(null);
  };

  const confirmItemDiscount = (discount: number, type: SaleItem['discountType'], rule?: DiscountRule) => {
    if (!selectedItemForDiscount) {
      return;
    }

    applyDiscount(selectedItemForDiscount.id, discount, type, typeof rule?.id === 'number' ? rule.id : undefined);
    closeItemDiscountModal();
  };

  const confirmGlobalDiscount = (discount: number, type: SaleItem['discountType'], rule?: DiscountRule) => {
    applyGlobalDiscount(discount, type, typeof rule?.id === 'number' ? rule.id : undefined);
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

  const openGlobalDiscountModal = async () => {
    if (activePreticketId) {
      setDiscountRulesError('El descuento del preticket ya fue calculado en kiosco. Cancela el pedido para iniciar un ticket editable.');
      return;
    }
    setShowGlobalDiscountModal(true);
    setDiscountRules([]);
    setDiscountRulesError('');
    try {
      setDiscountRules(await evaluateDiscountRules({
        channel: 'pos',
        amount: totals.subtotal,
        scope: 'order',
        customerType: selectedCustomer?.customerType,
        currencyCode: transactionCurrency,
        warehouseId: registerContext?.warehouseId ? Number(registerContext.warehouseId) : null,
        unitId: registerContext?.businessUnitId ? Number(registerContext.businessUnitId) : null,
        businessId: registerContext?.businessId ? Number(registerContext.businessId) : null,
      }));
    } catch (nextError) {
      setDiscountRulesError(nextError instanceof Error ? nextError.message : 'No se pudieron consultar las reglas.');
    }
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
        warehouses={warehouses}
        activeCashRegisters={activeCashRegisters}
        canManageCashRegisters={canManageCashRegisters}
        selectedCashRegisterId={selectedCashRegisterId}
        preferredCurrencyCode={transactionCurrency}
        isLoading={isRegisterContextLoading}
        isOpeningShift={isOpeningShift}
        error={registerContextError || shiftError}
        notice={shiftNotice}
        onOpenShiftModal={() => setShowOpenShiftModal(true)}
        onCloseOpenShiftModal={() => setShowOpenShiftModal(false)}
        onOpenShift={handleOpenShiftWithCurrency}
        onSelectCashRegister={setSelectedCashRegisterId}
        onRetry={refreshRegisterContext}
        onClearError={() => {
          clearRegisterContextError();
          clearShiftError();
        }}
        onClearNotice={clearShiftNotice}
      />
    );
  }

  return (
    <>
      <div
        ref={posFullscreenRef}
        data-pos-fullscreen-root
        data-pos-terminal-mode
        className="rounded-xl bg-[#F7F8FA] p-3 sm:p-4 dark:bg-[#111827]"
      >
        <div data-pos-terminal-shell className="mx-auto flex min-h-0 w-full flex-col">
          <div data-pos-fixed-header>
            {/* Frontend Engine title-bar exception: an active shift uses this persistent terminal context instead of a second standard title bar. */}
            <ShiftBar
              shift={currentShift}
              onOpenCashMovement={openCashMovementWorkspace}
              onOpenShiftSummary={openShiftSummaryWorkspace}
              onCloseShift={() => {
                setShowShiftSummaryWorkspace(false);
                void openCloseShiftModal();
              }}
              onOpenReturn={openReturnWorkspace}
              onToggleFullscreen={toggleFullscreenMode}
              fiscalSummary={fiscalSummary}
              fiscalDetail={`${fiscalSettings.taxRate}%`}
              onOpenFiscalSettings={() => setShowFiscalSettingsModal(true)}
            />
          </div>

          <main data-pos-workspace-body>
            <div data-pos-secondary-status className="mt-2 space-y-2">
              {!learningModeActive && smartAlerts.length === 0 ? (
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

            {[cartNotice, checkoutNotice.startsWith('Venta ') ? '' : checkoutNotice, balanceLoadError, shiftCurrencyMismatchNotice, shiftNotice, shiftError, registerContextError, discountRulesError].filter(Boolean)
              .length > 0 && (
              <div className="mt-2 space-y-2">
                {cartNotice && <OperationalNotice message={cartNotice} onDismiss={clearCartNotice} />}
                {checkoutNotice && !checkoutNotice.startsWith('Venta ') && <OperationalNotice message={checkoutNotice} onDismiss={clearCheckoutNotice} />}
                {balanceLoadError && <OperationalNotice message={`${balanceLoadError} POS bloqueará el cobro de productos con stock hasta recuperarlas.`} onRetry={() => void reloadInventoryBalances()} />}
                {shiftCurrencyMismatchNotice && <OperationalNotice message={shiftCurrencyMismatchNotice} />}
                {shiftNotice && <OperationalNotice message={shiftNotice} onDismiss={clearShiftNotice} />}
                {shiftError && <OperationalNotice message={shiftError} onDismiss={clearShiftError} />}
                {registerContextError && <OperationalNotice message={registerContextError} onDismiss={clearRegisterContextError} />}
                {discountRulesError && <OperationalNotice message={discountRulesError} onDismiss={() => setDiscountRulesError('')} />}
              </div>
            )}

            <div
              data-pos-workspace-grid
              className="mt-3 grid min-h-0 grid-cols-1 gap-3 xl:grid-cols-[minmax(620px,1fr)_minmax(420px,520px)] 2xl:h-[clamp(600px,calc(100vh-15rem),780px)] 2xl:grid-cols-[minmax(480px,1.25fr)_minmax(380px,0.95fr)_minmax(280px,0.65fr)]"
            >
              <div
                data-pos-products-column
                data-workspace-active={isProductWorkspaceOpen ? 'true' : undefined}
                data-workspace-hidden={isPaymentWorkspaceOpen ? 'true' : undefined}
                style={isPaymentWorkspaceOpen ? { display: 'none' } : undefined}
                className="flex min-h-0 min-w-0 flex-col gap-4 xl:row-span-2 2xl:row-span-1"
              >
                {showShiftSummaryWorkspace ? (
                  <ShiftSummaryWorkspace
                    isOpen
                    shift={currentShift}
                    summary={closingSummary}
                    isLoading={isLoadingClosingSummary}
                    error={closingSummaryError}
                    onClose={() => setShowShiftSummaryWorkspace(false)}
                    onRefresh={loadClosingSummary}
                  />
                ) : showReturnModal ? (
                  <ReturnModal isOpen workspaceMode onClose={() => setShowReturnModal(false)} onConfirm={handleReturn} />
                ) : showCashMovementModal ? (
                  <CashMovementModal
                    isOpen
                    workspaceMode
                    onClose={() => setShowCashMovementModal(false)}
                    onConfirm={handleCashMovement}
                    isSubmitting={isCreatingCashMovement}
                    currency={currentShift.currencyCode || transactionCurrency}
                  />
                ) : (
                  <>
                    <div data-pos-pre-tickets data-workspace-active={isPreticketWorkspaceOpen ? 'true' : undefined}>
                      <PendingPreTicketsPanel
                        preTickets={preTickets}
                        onPullPreTicket={pullPreTicket}
                        onRetry={() => void reloadPreTickets()}
                        formatCurrency={formatSaleCurrency}
                        queueError={preTicketQueueError}
                        isRefreshing={isRefreshingPreTickets}
                        lastUpdatedAt={preTicketsLastUpdatedAt}
                        claimingPreTicketIds={claimingPreTicketIds}
                        workspaceMode={isPreticketWorkspaceOpen}
                      />
                    </div>

                    <div data-pos-quick-products className="min-h-0 flex-1">
                      <QuickProductsPanel
                        categories={categories}
                        filteredQuickProducts={filteredQuickProducts}
                        selectedCategory={selectedCategory}
                        selectedQuickQuantity={selectedQuickQuantity}
                        blockSalesWithoutStock={blockSalesWithoutStock}
                        onSelectCategory={setSelectedCategory}
                        onAddToCart={(product, quantity) => {
                          if (!activePreticketId) addToCart(product, quantity);
                        }}
                        searchRequestId={productSearchRequestId}
                        workspaceMode={isProductWorkspaceOpen}
                        formatCurrency={formatSaleCurrency}
                      />
                    </div>
                  </>
                )}
              </div>

              <div data-pos-ticket-column className="min-h-0 min-w-0 xl:col-start-2 xl:row-start-1 2xl:col-start-auto 2xl:row-start-auto">
                <SaleTicketPanel
                  cart={cart}
                  barcodeInput={barcodeInput}
                  barcodeInputRef={barcodeInputRef}
                  lastAddedItem={lastAddedItem}
                  totals={totals}
                  products={saleProducts}
                  customers={creditCustomers}
                  selectedCustomerId={selectedCustomerId}
                  preticketLocked={Boolean(activePreticketId)}
                  preticketCode={activePreticketCode}
                  onBarcodeInputChange={setBarcodeInput}
                  onBarcodeSubmit={handleBarcodeSubmit}
                  onClearCart={clearCart}
                  onUpdateQuantity={updateQuantity}
                  onRemoveItem={removeItem}
                  onOpenItemDiscount={openItemDiscountModal}
                  onOpenGlobalDiscount={openGlobalDiscountModal}
                  onOpenProductPanel={(product) => setSidePanel({ type: 'product', product })}
                  onSelectCustomer={setSelectedCustomerId}
                  formatCurrency={formatSaleCurrency}
                />
              </div>

              <div
                data-pos-payment-column
                data-workspace-active={isPaymentWorkspaceOpen ? 'true' : undefined}
                style={isPaymentWorkspaceOpen ? { display: 'block', gridColumn: '1', gridRow: '1' } : undefined}
                className="h-full min-h-0 min-w-0 overflow-hidden xl:col-start-2 xl:row-start-2 2xl:col-start-auto 2xl:row-start-auto"
              >
                <SalePaymentPanel
                  totals={totals}
                  payments={payments}
                  cartItemCount={cart.reduce((sum, item) => sum + item.quantity, 0)}
                  selectedQuickQuantity={selectedQuickQuantity}
                  suspendedSales={suspendedSales}
                  recentActivities={recentActivities}
                  onRemovePayment={removePayment}
                  onSuspendSale={() => {
                    if (activePreticketId) {
                      setDiscountRulesError('Los pretickets reclamados no se pueden suspender; cóbralos o cancélalos para liberarlos.');
                      return;
                    }
                    suspendCurrentSale();
                  }}
                  onResumeSuspendedSale={resumeSuspendedSale}
                  onDiscardSuspendedSale={discardSuspendedSale}
                  onQuantityChange={setSelectedQuickQuantity}
                  onOpenSalePanel={openSalePanel}
                  onOpenReturn={openReturnWorkspace}
                  onFullscreen={toggleFullscreenMode}
                  onExactPayment={handleExactPayment}
                  onAddPayment={openPaymentModal}
                  onConfirmWorkspacePayment={confirmWorkspacePayment}
                  onPaymentPreviewChange={setCustomerDisplayPaymentPreview}
                  creditRules={creditRules}
                  creditCustomers={creditCustomers}
                  currency={transactionCurrency}
                  onCompleteSale={() => {
                    void completeSale();
                  }}
                  isCompletingSale={isCompletingSale}
                  checkoutNotice={checkoutNotice}
                  checkoutRequestId={checkoutRequestId}
                  workspaceMode={isPaymentWorkspaceOpen}
                  onClearCheckoutNotice={clearCheckoutNotice}
                  formatCurrency={formatSaleCurrency}
                />
              </div>
            </div>
          </main>

          <footer data-pos-fixed-footer aria-label="Resumen y cobro del punto de venta">
            <div className="min-w-0">
              <p className="text-[11px] text-gray-400">Ticket actual</p>
              <p className="truncate text-sm text-white">
                {`${cart.reduce((sum, item) => sum + item.quantity, 0)} artículos · Caja ${currentShift.cashRegisterCode}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsPaymentWorkspaceOpen(false);
                  setIsProductWorkspaceOpen(false);
                  setShowReturnModal(false);
                  setShowCashMovementModal(false);
                  setShowShiftSummaryWorkspace(false);
                  setIsPreticketWorkspaceOpen((current) => !current);
                }}
                aria-pressed={isPreticketWorkspaceOpen}
                className={`inline-flex min-h-14 items-center justify-center gap-2 rounded-lg border px-5 text-base font-medium text-[#222831] transition ${isPreticketWorkspaceOpen ? 'border-[#F4C84A] bg-[#F4C84A] hover:bg-[#e8bb35]' : 'border-white/20 bg-white hover:bg-gray-100'}`}
              >
                <ReceiptText className="h-5 w-5" />
                {isPreticketWorkspaceOpen ? 'Ocultar pretickets' : 'Pretickets'}
                <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-[#222831] px-1.5 py-0.5 text-xs text-white">{preTickets.length}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsPaymentWorkspaceOpen(false);
                  setIsPreticketWorkspaceOpen(false);
                  setShowReturnModal(false);
                  setShowCashMovementModal(false);
                  setShowShiftSummaryWorkspace(false);
                  setIsProductWorkspaceOpen((current) => !current);
                }}
                aria-pressed={isProductWorkspaceOpen}
                className={`inline-flex min-h-14 items-center justify-center rounded-lg border px-6 text-base font-medium text-[#222831] transition ${isProductWorkspaceOpen ? 'border-[#FF6B5E] bg-[#FF6B5E] hover:bg-[#ff5a4b]' : 'border-white/20 bg-white hover:bg-gray-100'}`}
              >
                {isProductWorkspaceOpen ? 'Ocultar catálogo' : 'Buscar producto'}
              </button>
            </div>
            <div className="text-center">
              <p className="text-[11px] text-gray-400">Total a cobrar</p>
              <p className="text-3xl font-medium leading-none text-white">{formatSaleCurrency(totals.total)}</p>
            </div>
            <div className="flex items-center justify-end gap-4">
              <div className="hidden text-right text-[11px] text-gray-300 sm:block">
                <p>Subtotal {formatSaleCurrency(totals.subtotal)}</p>
                <p>IVA {formatSaleCurrency(totals.tax)}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsProductWorkspaceOpen(false);
                  setIsPreticketWorkspaceOpen(false);
                  setShowReturnModal(false);
                  setShowCashMovementModal(false);
                  setShowShiftSummaryWorkspace(false);
                  setIsPaymentWorkspaceOpen(true);
                }}
                disabled={cart.length === 0 || isPaymentWorkspaceOpen}
                className={`min-h-14 rounded-lg px-8 text-lg font-medium transition disabled:cursor-not-allowed ${isPaymentWorkspaceOpen ? 'bg-[#59C3A5] text-[#0B4F40]' : 'bg-[#FF6B5E] text-[#222831] hover:bg-[#ff5a4b] disabled:opacity-45'}`}
              >
                {isPaymentWorkspaceOpen ? 'Cobro en curso' : 'Cobrar'}
              </button>
            </div>
          </footer>
        </div>
      </div>

      <SaleSidePanel panel={sidePanel} onClose={() => setSidePanel(null)} formatCurrency={formatSaleCurrency} />

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
        selectedItemForDiscount={selectedItemForDiscount}
        showDiscountModal={showDiscountModal}
        showGlobalDiscountModal={showGlobalDiscountModal}
        itemDiscountRules={discountRules}
        globalDiscountRules={discountRules}
        creditRules={creditRules}
        creditCustomers={creditCustomers}
        currency={transactionCurrency}
        cart={cart}
        totals={totals}
        lastSale={lastSale}
        showTicketModal={showTicketModal}
        onCloseAddPayment={closeAddPaymentModal}
        onConfirmAddPayment={confirmAddPayment}
        onPaymentPreviewChange={setCustomerDisplayPaymentPreview}
        onCloseShiftModal={closeCloseShiftModal}
        onConfirmCloseShift={handleCloseShift}
        onCloseItemDiscount={closeItemDiscountModal}
        onConfirmItemDiscount={confirmItemDiscount}
        onCloseGlobalDiscount={() => setShowGlobalDiscountModal(false)}
        onConfirmGlobalDiscount={confirmGlobalDiscount}
        onCloseTicket={closeTicketModal}
      />
    </>
  );
}

function OperationalNotice({ message, onDismiss, onRetry }: { message: string; onDismiss?: () => void; onRetry?: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
      <span className="flex min-w-0 items-center gap-2">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span className="min-w-0">{message}</span>
      </span>
      <span className="flex shrink-0 items-center gap-1">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="min-h-9 rounded-xl px-3 py-1 text-xs font-medium text-amber-700 transition hover:bg-amber-100 dark:text-amber-200 dark:hover:bg-amber-500/20"
          >
            Reintentar
          </button>
        )}
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="min-h-9 rounded-xl px-3 py-1 text-xs font-medium text-amber-700 transition hover:bg-amber-100 dark:text-amber-200 dark:hover:bg-amber-500/20"
          >
            Cerrar
          </button>
        )}
      </span>
    </div>
  );
}
