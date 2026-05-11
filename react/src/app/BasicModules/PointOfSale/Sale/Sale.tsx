import { useState, useEffect, useRef, useMemo } from 'react';
import { X, Trash2, Barcode, DollarSign, Sparkles, Check, Plus, AlertCircle, LogIn, Percent, Package } from 'lucide-react';
import { SaleItem, PaymentMethod, Payment } from './types/sale.types';
import { Shift, CashMovement } from './types/shift.types';
import { mockProducts } from '../Productos/data/products.mock';
import { AddPaymentModal } from './components/AddPaymentModal';
import { OpenShiftModal } from './components/OpenShiftModal';
import { CloseShiftModal } from './components/CloseShiftModal';
import { CashMovementModal } from './components/CashMovementModal';
import { ShiftBar } from './components/ShiftBar';
import { TicketModal } from './components/TicketModal';
import { DiscountModal } from './components/DiscountModal';
import { ReturnModal } from './components/ReturnModal';
import { IndiceSignalBar } from './components/IndiceSignalBar';
import { OperationalActivityFeed, type OperationalActivity } from './components/OperationalActivityFeed';
import { SaleSidePanel, type SaleSidePanelState } from './components/SaleSidePanel';
import { SmartAlertsStrip, type SmartAlert } from './components/SmartAlertsStrip';
import { SuspendedSalesPanel, type SuspendedSale } from './components/SuspendedSalesPanel';
import { TouchKeypad } from './components/TouchKeypad';

function buildInitialActivities(): OperationalActivity[] {
  const now = Date.now();

  return [
    {
      id: 'activity-sale-completed',
      type: 'sale',
      title: 'Sale completed',
      description: 'Counter ticket collected with mixed payment',
      timestamp: new Date(now - 5 * 60 * 1000),
      actor: 'Ana POS',
      badge: '$1,250',
      tone: 'success',
    },
    {
      id: 'activity-shift-opened',
      type: 'shift',
      title: 'Shift opened',
      description: 'Juan opened register 01',
      timestamp: new Date(now - 18 * 60 * 1000),
      actor: 'Juan',
      badge: 'Register 01',
      tone: 'info',
    },
    {
      id: 'activity-low-stock',
      type: 'stock',
      title: 'Low stock detected',
      description: 'Reorder point reached in quick-sale products',
      timestamp: new Date(now - 31 * 60 * 1000),
      actor: 'System',
      badge: 'Stock',
      tone: 'warning',
    },
    {
      id: 'activity-invoice-generated',
      type: 'invoice',
      title: 'Invoice generated',
      description: 'Customer invoice sent by email',
      timestamp: new Date(now - 44 * 60 * 1000),
      actor: 'Finance',
      badge: 'PDF/XML',
      tone: 'neutral',
    },
    {
      id: 'activity-return-processed',
      type: 'return',
      title: 'Return processed',
      description: 'Partial return authorized by supervisor',
      timestamp: new Date(now - 56 * 60 * 1000),
      actor: 'Supervisor',
      badge: 'Return',
      tone: 'danger',
    },
  ];
}

export default function Sale() {
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [lastAddedItem, setLastAddedItem] = useState<string | null>(null);
  const [cashReceived, setCashReceived] = useState<number>(0);
  const [selectedQuickQuantity, setSelectedQuickQuantity] = useState(1);
  const [suspendedSales, setSuspendedSales] = useState<SuspendedSale[]>([]);
  const [recentActivities, setRecentActivities] = useState<OperationalActivity[]>(buildInitialActivities);
  const [sidePanel, setSidePanel] = useState<SaleSidePanelState | null>(null);

  // Shift management
  const [currentShift, setCurrentShift] = useState<Shift | null>(null);
  const [showOpenShiftModal, setShowOpenShiftModal] = useState(false);
  const [showCloseShiftModal, setShowCloseShiftModal] = useState(false);
  const [showCashMovementModal, setShowCashMovementModal] = useState(false);
  const [cashMovements, setCashMovements] = useState<CashMovement[]>([]);

  // Ticket
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [lastSale, setLastSale] = useState<{
    saleNumber: string;
    items: SaleItem[];
    payments: Payment[];
    totals: any;
  } | null>(null);

  // Discount
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [selectedItemForDiscount, setSelectedItemForDiscount] = useState<SaleItem | null>(null);
  const [showGlobalDiscountModal, setShowGlobalDiscountModal] = useState(false);

  // Return
  const [showReturnModal, setShowReturnModal] = useState(false);

  // Settings
  const [blockSalesWithoutStock, setBlockSalesWithoutStock] = useState(false);

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  const pushActivity = (activity: Omit<OperationalActivity, 'id' | 'timestamp'>) => {
    setRecentActivities((currentActivities) => [
      {
        ...activity,
        id: `activity-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        timestamp: new Date(),
      },
      ...currentActivities,
    ].slice(0, 20));
  };

  // Check if shift is needed on mount
  useEffect(() => {
    if (!currentShift) {
      setShowOpenShiftModal(true);
    }
  }, []);

  // Auto-focus barcode input
  useEffect(() => {
    const focusInput = () => {
      if (barcodeInputRef.current && !showAddPaymentModal && !showOpenShiftModal && !showCloseShiftModal && !showCashMovementModal && !showDiscountModal && !showGlobalDiscountModal && !showTicketModal && !showReturnModal && currentShift) {
        barcodeInputRef.current.focus();
      }
    };

    focusInput();
    window.addEventListener('click', focusInput);
    return () => window.removeEventListener('click', focusInput);
  }, [showAddPaymentModal, showOpenShiftModal, showCloseShiftModal, showCashMovementModal, showDiscountModal, showGlobalDiscountModal, showTicketModal, showReturnModal, currentShift]);

  // Get quick access products (most common items)
  const quickProducts = useMemo(() => {
    // Filter active products only and take first 9 for quick access
    return mockProducts.filter(p => p.status === 'active').slice(0, 9);
  }, []);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(mockProducts.map(p => p.department));
    return ['all', ...Array.from(cats)];
  }, []);

  // Filter quick products by category
  const filteredQuickProducts = useMemo(() => {
    if (selectedCategory === 'all') return quickProducts;
    return quickProducts.filter(p => p.department === selectedCategory);
  }, [selectedCategory, quickProducts]);

  // Clear last added animation after 1 second
  useEffect(() => {
    if (lastAddedItem) {
      const timer = setTimeout(() => setLastAddedItem(null), 1000);
      return () => clearTimeout(timer);
    }
  }, [lastAddedItem]);

  // Calculate totals
  const totals = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
    const tax = subtotal * 0.16;
    const total = subtotal + tax;
    const paid = payments.reduce((sum, payment) => sum + payment.amount, 0);
    const remaining = total - paid;
    const change = paid > total ? paid - total : 0;
    const isPaid = paid >= total;
    return { subtotal, tax, total, paid, remaining, change, isPaid };
  }, [cart, payments]);

  const stockSignals = useMemo(() => {
    const lowStockProducts = mockProducts.filter(
      (product) => product.status === 'active' && product.useInventory && product.currentStock <= product.minStock,
    );
    const outOfStockProducts = lowStockProducts.filter((product) => product.currentStock <= 0);
    const topProduct = mockProducts.find((product) => product.status === 'active');

    return {
      lowStockProducts,
      outOfStockProducts,
      topProduct,
    };
  }, []);

  const smartAlerts = useMemo<SmartAlert[]>(() => {
    const { lowStockProducts, outOfStockProducts, topProduct } = stockSignals;
    const alerts: SmartAlert[] = [];

    if (outOfStockProducts.length > 0) {
      alerts.push({
        id: 'out-of-stock',
        category: 'Risk',
        title: 'Product out of stock',
        description: `${outOfStockProducts[0].name} cannot be sold without override.`,
        tone: 'critical',
        actionLabel: 'Open decision panel',
        onAction: () => setSidePanel({ type: 'product', product: outOfStockProducts[0] }),
      });
    }

    if (lowStockProducts.length > 0) {
      alerts.push({
        id: 'low-stock',
        category: 'Risk',
        title: 'Critical stock',
        description: `${lowStockProducts.length} product${lowStockProducts.length === 1 ? '' : 's'} need replenishment.`,
        tone: 'warning',
        actionLabel: 'Open decision panel',
        onAction: () => setSidePanel({ type: 'product', product: lowStockProducts[0] }),
      });
    }

    if (topProduct) {
      alerts.push({
        id: 'top-product',
        category: 'Opportunity',
        title: 'Top seller detected',
        description: `${topProduct.name} is moving faster than usual.`,
        tone: 'hot',
        actionLabel: 'Open decision panel',
        onAction: () => setSidePanel({ type: 'product', product: topProduct }),
      });
    }

    if (currentShift && currentShift.totalSales > 0) {
      alerts.push({
        id: 'sales-trend',
        category: 'Opportunity',
        title: 'Sales trend up',
        description: 'Current shift is pacing above the usual morning baseline.',
        tone: 'success',
      });
    }

    if (suspendedSales.length > 0) {
      alerts.push({
        id: 'suspended-sales',
        category: 'Control',
        title: 'Open tickets waiting',
        description: `${suspendedSales.length} suspended sale${suspendedSales.length === 1 ? '' : 's'} need follow-up.`,
        tone: 'info',
      });
    }

    return alerts.slice(0, 4);
  }, [currentShift, stockSignals, suspendedSales.length]);

  // Handle barcode scan
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!barcodeInput.trim()) return;

    // Find product by barcode
    const product = mockProducts.find(p => p.barcode === barcodeInput.trim() && p.status === 'active');

    if (product) {
      addToCart(product);
      setBarcodeInput('');
    } else {
      alert(`Producto no encontrado: ${barcodeInput}`);
      setBarcodeInput('');
    }
  };

  // Add to cart
  const addToCart = (product: any, quantity = 1) => {
    // Check stock
    if (product.useInventory) {
      const currentInCart = cart.find(item => item.productId === product.id)?.quantity || 0;

      if (product.currentStock <= 0) {
        if (blockSalesWithoutStock) {
          alert(`${product.name} está agotado`);
          return;
        } else {
          if (!confirm(`${product.name} está agotado. ¿Continuar?`)) {
            return;
          }
        }
      } else if (currentInCart + quantity > product.currentStock) {
        alert(`Stock insuficiente. Disponible: ${product.currentStock}`);
        return;
      }
    }

    const existingItem = cart.find(item => item.productId === product.id);

    if (existingItem) {
      updateQuantity(existingItem.id, existingItem.quantity + quantity);
      setLastAddedItem(existingItem.id);
    } else {
      const subtotal = product.salePrice * quantity;
      const newItem: SaleItem = {
        id: `item-${Date.now()}-${product.id}`,
        productId: product.id,
        name: product.name,
        price: product.salePrice,
        quantity,
        discount: 0,
        discountType: 'percentage',
        subtotal,
        tax: subtotal * 0.16,
        total: subtotal * 1.16,
      };
      setCart([newItem, ...cart]); // Add to top
      setLastAddedItem(newItem.id);
    }
  };

  // Update quantity
  const updateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(itemId);
      return;
    }

    setCart(cart.map(item => {
      if (item.id === itemId) {
        // Check stock
        const product = mockProducts.find(p => p.id === item.productId);
        if (product && product.useInventory && newQuantity > product.currentStock) {
          alert(`Stock insuficiente. Disponible: ${product.currentStock}`);
          return item;
        }

        const baseSubtotal = item.price * newQuantity;
        const discountAmount = item.discountType === 'percentage'
          ? baseSubtotal * (item.discount / 100)
          : item.discount * newQuantity;
        const subtotal = baseSubtotal - discountAmount;

        return {
          ...item,
          quantity: newQuantity,
          subtotal,
          total: subtotal * 1.16
        };
      }
      return item;
    }));
  };

  // Apply discount to item
  const applyDiscount = (itemId: string, discount: number, type: 'percentage' | 'fixed') => {
    setCart(cart.map(item => {
      if (item.id === itemId) {
        const baseSubtotal = item.price * item.quantity;
        const discountAmount = type === 'percentage'
          ? baseSubtotal * (discount / 100)
          : discount * item.quantity;
        const subtotal = baseSubtotal - discountAmount;

        return {
          ...item,
          discount,
          discountType: type,
          subtotal,
          total: subtotal * 1.16
        };
      }
      return item;
    }));
  };

  // Apply global discount to all items
  const applyGlobalDiscount = (discount: number, type: 'percentage' | 'fixed') => {
    setCart(cart.map(item => {
      const baseSubtotal = item.price * item.quantity;
      const discountAmount = type === 'percentage'
        ? baseSubtotal * (discount / 100)
        : discount * item.quantity;
      const subtotal = baseSubtotal - discountAmount;

      return {
        ...item,
        discount,
        discountType: type,
        subtotal,
        total: subtotal * 1.16
      };
    }));
  };

  // Remove item
  const removeItem = (itemId: string) => {
    setCart(cart.filter(item => item.id !== itemId));
  };

  // Clear cart
  const clearCart = () => {
    if (cart.length === 0 && payments.length === 0) return;
    if (confirm('¿Cancelar venta actual?')) {
      setCart([]);
      setPayments([]);
      setCashReceived(0);
      setBarcodeInput('');
    }
  };

  const suspendCurrentSale = () => {
    if (cart.length === 0) {
      return;
    }

    const suspendedSale: SuspendedSale = {
      id: `suspended-${Date.now()}`,
      title: `Ticket ${suspendedSales.length + 1}`,
      items: [...cart],
      payments: [...payments],
      total: totals.total,
      createdAt: new Date(),
    };

    setSuspendedSales([suspendedSale, ...suspendedSales]);
    setCart([]);
    setPayments([]);
    setCashReceived(0);
    setBarcodeInput('');
    pushActivity({
      type: 'sale',
      title: 'Sale suspended',
      description: `${suspendedSale.items.length} lines parked for later recovery`,
      actor: currentShift?.cashierName ?? 'Cashier',
      badge: formatCurrency(suspendedSale.total),
      tone: 'info',
    });
  };

  const resumeSuspendedSale = (saleId: string) => {
    const suspendedSale = suspendedSales.find((sale) => sale.id === saleId);
    if (!suspendedSale) {
      return;
    }

    if ((cart.length > 0 || payments.length > 0) && !confirm('Replace the current ticket with this suspended sale?')) {
      return;
    }

    setCart(suspendedSale.items);
    setPayments(suspendedSale.payments);
    setSuspendedSales(suspendedSales.filter((sale) => sale.id !== saleId));
    pushActivity({
      type: 'sale',
      title: 'Suspended sale resumed',
      description: `${suspendedSale.title} returned to the selling surface`,
      actor: currentShift?.cashierName ?? 'Cashier',
      badge: formatCurrency(suspendedSale.total),
      tone: 'success',
    });
  };

  const discardSuspendedSale = (saleId: string) => {
    setSuspendedSales(suspendedSales.filter((sale) => sale.id !== saleId));
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

  // Add payment
  const handleAddPayment = (method: PaymentMethod) => {
    if (cart.length === 0) {
      alert('No hay productos en la venta');
      return;
    }

    if (totals.isPaid) {
      alert('El pago ya está completo');
      return;
    }

    setSelectedPaymentMethod(method);
    setShowAddPaymentModal(true);
  };

  // Confirm add payment
  const confirmAddPayment = (amount: number, reference?: string, cashReceived?: number) => {
    if (!selectedPaymentMethod) return;

    const newPayment: Payment = {
      id: `payment-${Date.now()}`,
      method: selectedPaymentMethod,
      amount,
      reference,
    };

    setPayments([...payments, newPayment]);

    if (selectedPaymentMethod === 'cash' && cashReceived) {
      setCashReceived(cashReceived);
    }

    setShowAddPaymentModal(false);
    setSelectedPaymentMethod(null);
  };

  // Remove payment
  const removePayment = (paymentId: string) => {
    setPayments(payments.filter(p => p.id !== paymentId));
    setCashReceived(0);
  };

  // Complete sale
  const completeSale = (salePayments = payments, saleTotals = totals) => {
    if (!saleTotals.isPaid) {
      alert('El pago no está completo. Agrega más pagos para cubrir el total.');
      return;
    }

    if (!currentShift) {
      alert('No hay turno activo');
      return;
    }

    // Generate sale number
    const saleNumber = `V${currentShift.id.slice(-6).toUpperCase()}-${String(currentShift.sales + 1).padStart(4, '0')}`;

    // Save sale data for ticket
    setLastSale({
      saleNumber,
      items: [...cart],
      payments: [...salePayments],
      totals: { ...saleTotals },
    });

    // Update shift with sale
    const cashPayment = salePayments.find(p => p.method === 'cash')?.amount || 0;
    setCurrentShift({
      ...currentShift,
      sales: currentShift.sales + 1,
      totalSales: currentShift.totalSales + saleTotals.total,
      expectedCash: currentShift.expectedCash + cashPayment,
    });

    // Update inventory (decrease stock)
    cart.forEach(item => {
      const product = mockProducts.find(p => p.id === item.productId);
      if (product && product.useInventory) {
        // In real app, this would call an API to update stock
        console.log(`Decrease stock: ${product.name} by ${item.quantity}`);
      }
    });

    // Reset cart and payments
    setCart([]);
    setPayments([]);
    setCashReceived(0);
    setBarcodeInput('');

    // Show ticket
    setShowTicketModal(true);
    pushActivity({
      type: 'sale',
      title: 'Sale completed',
      description: `${cart.length} lines collected by ${currentShift.cashierName}`,
      actor: currentShift.cashierName,
      badge: formatCurrency(saleTotals.total),
      tone: 'success',
    });
  };

  // Quick exact payment (no modal)
  const handleExactPayment = () => {
    if (cart.length === 0) {
      alert('No hay productos en la venta');
      return;
    }

    if (totals.isPaid) {
      alert('El pago ya está completo');
      return;
    }

    // Add exact cash payment
    const exactPayment: Payment = {
      id: `payment-${Date.now()}`,
      method: 'cash',
      amount: totals.remaining,
    };

    const nextPayments = [...payments, exactPayment];
    const nextTotals = {
      ...totals,
      paid: totals.total,
      remaining: 0,
      change: 0,
      isPaid: true,
    };

    setPayments(nextPayments);

    // Complete sale immediately
    setTimeout(() => {
      completeSale(nextPayments, nextTotals);
    }, 100);
  };

  // Open shift
  const handleOpenShift = (cashierId: string, cashierName: string, initialCash: number) => {
    const newShift: Shift = {
      id: `shift-${Date.now()}`,
      cashierId,
      cashierName,
      startTime: new Date(),
      initialCash,
      expectedCash: initialCash,
      status: 'open',
      sales: 0,
      totalSales: 0,
    };

    setCurrentShift(newShift);
    setShowOpenShiftModal(false);
    pushActivity({
      type: 'shift',
      title: 'Shift opened',
      description: `Initial cash ${formatCurrency(initialCash)}`,
      actor: cashierName,
      badge: 'Register open',
      tone: 'info',
    });
  };

  // Close shift
  const handleCloseShift = (actualCash: number) => {
    if (!currentShift) return;

    const difference = actualCash - currentShift.expectedCash;

    const closedShift: Shift = {
      ...currentShift,
      endTime: new Date(),
      actualCash,
      difference,
      status: 'closed',
    };

    // Log shift closed
    console.log('Turno cerrado:', closedShift);

    // Show summary
    alert(`Turno cerrado.\nVentas: ${closedShift.sales}\nTotal: ${formatCurrency(closedShift.totalSales)}\nDiferencia: ${formatCurrency(difference)}`);

    // Reset shift
    setCurrentShift(null);
    setShowCloseShiftModal(false);
    setCashMovements([]);

    // Reopen shift modal
    setTimeout(() => setShowOpenShiftModal(true), 500);
  };

  // Add cash movement
  const handleCashMovement = (type: 'entry' | 'withdrawal', amount: number, reason: string) => {
    if (!currentShift) return;

    const movement: CashMovement = {
      id: `movement-${Date.now()}`,
      shiftId: currentShift.id,
      type,
      amount,
      reason,
      timestamp: new Date(),
      cashierName: currentShift.cashierName,
    };

    setCashMovements([...cashMovements, movement]);

    // Update expected cash
    const newExpectedCash = type === 'entry'
      ? currentShift.expectedCash + amount
      : currentShift.expectedCash - amount;

    setCurrentShift({
      ...currentShift,
      expectedCash: newExpectedCash,
    });

    alert(`${type === 'entry' ? 'Entrada' : 'Salida'} registrada: ${formatCurrency(amount)}`);
    pushActivity({
      type: 'cash',
      title: type === 'entry' ? 'Cash entry recorded' : 'Cash withdrawal recorded',
      description: reason,
      actor: currentShift.cashierName,
      badge: formatCurrency(amount),
      tone: type === 'entry' ? 'success' : 'warning',
    });
  };

  // Process return
  const handleReturn = (saleId: string, type: 'full' | 'partial') => {
    // In real app, this would look up the sale and process the return
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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in input or modal is open
      if (e.target === barcodeInputRef.current || showAddPaymentModal || showOpenShiftModal || showCloseShiftModal || showCashMovementModal || showDiscountModal || showGlobalDiscountModal || showTicketModal || showReturnModal) return;

      // Numbers 1-9 for quick products
      if (e.key >= '1' && e.key <= '9') {
        const index = parseInt(e.key) - 1;
        if (filteredQuickProducts[index]) {
          e.preventDefault();
          addToCart(filteredQuickProducts[index]);
        }
      }

      // F1 - Cash payment
      if (e.key === 'F1') {
        e.preventDefault();
        handleAddPayment('cash');
      }
      // F2 - Card payment
      if (e.key === 'F2') {
        e.preventDefault();
        handleAddPayment('card');
      }
      // F3 - Transfer payment
      if (e.key === 'F3') {
        e.preventDefault();
        handleAddPayment('transfer');
      }
      // F4 - Complete sale
      if (e.key === 'F4') {
        e.preventDefault();
        if (totals.isPaid) {
          completeSale();
        }
      }
      // Escape - Cancel
      if (e.key === 'Escape') {
        e.preventDefault();
        clearCart();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, filteredQuickProducts, totals.isPaid, showAddPaymentModal, showOpenShiftModal, showCloseShiftModal, showCashMovementModal, showDiscountModal, showGlobalDiscountModal, showTicketModal, showReturnModal]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount);
  };

  // No shift - Show welcome message
  if (!currentShift) {
    return (
      <>
        <div className="h-[calc(100vh-240px)] flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <LogIn className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Inicia tu turno
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Identifícate e ingresa el monto inicial de caja para comenzar a vender
            </p>
            <button
              onClick={() => setShowOpenShiftModal(true)}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-md transition-colors"
            >
              Abrir Turno
            </button>
          </div>
        </div>

        {/* Modals */}
        <OpenShiftModal
          isOpen={showOpenShiftModal}
          onClose={() => {}} // Don't allow closing without opening shift
          onConfirm={handleOpenShift}
        />
      </>
    );
  }

  return (
    <>
      {/* Shift Bar */}
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
      {/* Left Panel - Quick Products */}
      <div className="w-80 flex flex-col bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-orange-500 to-orange-600">
          <div className="flex items-center gap-2 text-white">
            <Sparkles className="w-5 h-5" />
            <h3 className="font-semibold">Productos Rápidos</h3>
          </div>
          <p className="text-xs text-orange-100 mt-1">Presiona 1-9 para agregar</p>
        </div>

        {/* Category Filter */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
          <div className="flex gap-2">
            {categories.slice(0, 3).map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {cat === 'all' ? 'Todos' : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Quick Product Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 gap-3">
            {filteredQuickProducts.map((product, index) => {
              const hasLowStock = product.useInventory && product.currentStock <= product.minStock!;
              const isOutOfStock = product.useInventory && product.currentStock <= 0;

              return (
                <button
                  key={product.id}
                  onClick={() => addToCart(product, selectedQuickQuantity)}
                  disabled={isOutOfStock && blockSalesWithoutStock}
                  className={`relative group p-4 rounded-xl border-2 transition-all shadow-sm hover:shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                    isOutOfStock
                      ? 'bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-300 dark:border-red-700'
                      : hasLowStock
                      ? 'bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 border-yellow-300 dark:border-yellow-700 hover:border-yellow-400'
                      : 'bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 hover:from-orange-50 hover:to-orange-100 dark:hover:from-orange-900/30 dark:hover:to-orange-800/30 border-gray-200 dark:border-gray-600 hover:border-orange-400 dark:hover:border-orange-500'
                  }`}
                >
                  {/* Keyboard Number Badge */}
                  <div className="absolute top-2 right-2 w-6 h-6 bg-orange-500 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-sm">
                    {index + 1}
                  </div>

                  {selectedQuickQuantity > 1 && (
                    <div className="absolute bottom-2 right-2 rounded-full bg-gray-900 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm dark:bg-white dark:text-gray-900">
                      x{selectedQuickQuantity}
                    </div>
                  )}

                  {/* Stock Status Badge */}
                  {isOutOfStock && (
                    <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded">
                      AGOTADO
                    </div>
                  )}
                  {hasLowStock && !isOutOfStock && (
                    <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-yellow-500 text-white text-[10px] font-bold rounded">
                      BAJO
                    </div>
                  )}

                  {/* Product Info */}
                  <div className="text-left space-y-1 mt-4">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2 leading-tight min-h-[2.5rem]">
                      {product.name}
                    </p>
                    <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
                      {formatCurrency(product.salePrice)}
                    </p>
                    <p className={`text-xs font-medium ${
                      isOutOfStock ? 'text-red-600 dark:text-red-400' :
                      hasLowStock ? 'text-yellow-600 dark:text-yellow-400' :
                      'text-gray-500 dark:text-gray-400'
                    }`}>
                      Stock: {product.currentStock}
                    </p>
                  </div>

                  {/* Click Animation */}
                  <div className="absolute inset-0 bg-orange-400 opacity-0 group-active:opacity-20 rounded-xl transition-opacity pointer-events-none" />
                </button>
              );
            })}
          </div>

          {filteredQuickProducts.length === 0 && (
            <div className="h-full flex items-center justify-center text-center text-gray-400 dark:text-gray-500 p-4">
              <p className="text-sm">No hay productos en esta categoría</p>
            </div>
          )}
        </div>
      </div>

      {/* Center Area - Ticket */}
      <div className="flex-1 flex flex-col bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Nueva Venta</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {cart.reduce((sum, item) => sum + item.quantity, 0)} artículos
            </p>
          </div>

          <button
            onClick={clearCart}
            disabled={cart.length === 0}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <X className="w-4 h-4" />
            Cancelar (ESC)
          </button>
        </div>

        {/* Barcode Scanner Input */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
          <form onSubmit={handleBarcodeSubmit} className="relative">
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
              <Barcode className="w-5 h-5 text-gray-400" />
            </div>
            <input
              ref={barcodeInputRef}
              type="text"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              placeholder="Escanea código de barras..."
              className="w-full pl-12 pr-4 py-3 text-lg font-mono bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-200 dark:focus:ring-orange-900/30 transition-all"
              autoComplete="off"
            />
          </form>
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
              <Barcode className="w-24 h-24 mb-4 opacity-20" />
              <p className="text-xl font-medium">Escanea un producto</p>
              <p className="text-sm">Los productos aparecerán aquí</p>
            </div>
          ) : (
            <div className="space-y-2">
              {cart.map((item) => {
                const product = mockProducts.find(p => p.id === item.productId);
                const hasLowStock = product && product.useInventory && product.currentStock <= product.minStock!;
                const isOutOfStock = product && product.useInventory && product.currentStock <= 0;

                return (
                  <div
                    key={item.id}
                    className={`flex flex-col gap-2 p-4 rounded-lg transition-all group ${
                      lastAddedItem === item.id
                        ? 'bg-orange-100 dark:bg-orange-900/30 border-2 border-orange-400 shadow-lg scale-105'
                        : 'bg-gray-50 dark:bg-gray-700/30 hover:bg-gray-100 dark:hover:bg-gray-700/50 border-2 border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      {/* Quantity Badge */}
                      <div className="flex items-center justify-center w-12 h-12 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 font-bold text-lg rounded-lg flex-shrink-0">
                        {item.quantity}
                      </div>

                      {/* Product Info */}
                      <div
                        className="flex-1 min-w-0 cursor-pointer rounded-lg p-1 -m-1 transition hover:bg-white/70 dark:hover:bg-gray-800/50"
                        onClick={() => {
                          if (product) {
                            setSidePanel({ type: 'product', product });
                          }
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900 dark:text-white truncate">
                            {item.name}
                          </p>
                          {isOutOfStock && (
                            <span className="px-2 py-0.5 text-xs font-bold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded">
                              SIN STOCK
                            </span>
                          )}
                          {hasLowStock && !isOutOfStock && (
                            <span className="px-2 py-0.5 text-xs font-bold bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded">
                              BAJO
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-gray-500 dark:text-gray-400">
                            {formatCurrency(item.price)} c/u
                          </span>
                          {product?.useInventory && (
                            <>
                              <span className="text-gray-400 dark:text-gray-500">•</span>
                              <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                <Package className="w-3 h-3" />
                                Stock: {product.currentStock}
                              </span>
                            </>
                          )}
                        </div>
                        {item.discount > 0 && (
                          <div className="flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400 font-medium">
                            <Percent className="w-3 h-3" />
                            <span>
                              Descuento: {item.discountType === 'percentage' ? `${item.discount}%` : formatCurrency(item.discount)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-8 h-8 flex items-center justify-center bg-white dark:bg-gray-600 hover:bg-gray-100 dark:hover:bg-gray-500 rounded-lg transition-colors border border-gray-200 dark:border-gray-600"
                        >
                          <span className="text-lg font-bold text-gray-700 dark:text-gray-300">−</span>
                        </button>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-8 h-8 flex items-center justify-center bg-white dark:bg-gray-600 hover:bg-gray-100 dark:hover:bg-gray-500 rounded-lg transition-colors border border-gray-200 dark:border-gray-600"
                        >
                          <span className="text-lg font-bold text-gray-700 dark:text-gray-300">+</span>
                        </button>
                      </div>

                      {/* Subtotal */}
                      <div className="w-32 text-right">
                        {item.discount > 0 && (
                          <p className="text-sm text-gray-400 dark:text-gray-500 line-through">
                            {formatCurrency(item.price * item.quantity)}
                          </p>
                        )}
                        <p className="text-xl font-bold text-gray-900 dark:text-white">
                          {formatCurrency(item.subtotal)}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setSelectedItemForDiscount(item);
                            setShowDiscountModal(true);
                          }}
                          className="p-2 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-all"
                          title="Aplicar descuento"
                        >
                          <Percent className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Totals Footer */}
        <div className="px-6 py-5 border-t-4 border-orange-500 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20">
          {/* Main Total - HUGE and always visible */}
          <div className="text-center mb-4">
            <p className="text-sm font-medium text-orange-700 dark:text-orange-400 uppercase tracking-wide mb-2">
              Total a Cobrar
            </p>
            <p className="text-6xl font-black text-orange-600 dark:text-orange-400 tracking-tight leading-none">
              {formatCurrency(totals.total)}
            </p>
          </div>

          {/* Global Discount Button */}
          {cart.length > 0 && (
            <button
              onClick={() => setShowGlobalDiscountModal(true)}
              className="w-full mb-3 py-2 px-4 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-semibold text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
            >
              <Percent className="w-4 h-4" />
              <span>Descuento a toda la venta</span>
            </button>
          )}

          {/* Subtotals - Collapsed */}
          <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 border-t border-orange-200 dark:border-orange-700 pt-3">
            <span>Subtotal: {formatCurrency(totals.subtotal)}</span>
            <span>IVA: {formatCurrency(totals.tax)}</span>
          </div>
        </div>
      </div>

      {/* Right Panel - Payment */}
      <div className="w-96 flex flex-col bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        {/* Total Display */}
        <div className={`px-6 py-6 ${
          totals.isPaid
            ? 'bg-gradient-to-br from-green-500 to-green-600'
            : 'bg-gradient-to-br from-orange-500 to-orange-600'
        } text-white transition-all`}>
          <p className="text-sm font-medium opacity-90 mb-1">Total a Cobrar</p>
          <p className="text-5xl font-bold tracking-tight">
            {formatCurrency(totals.total)}
          </p>
        </div>

        {/* Payment Status */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600 dark:text-gray-400">Total Pagado:</span>
            <span className="text-lg font-bold text-gray-900 dark:text-white">
              {formatCurrency(totals.paid)}
            </span>
          </div>

          {totals.isPaid ? (
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-500 rounded-lg">
              <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-green-700 dark:text-green-400">Pago Completo</p>
                {totals.change > 0 && (
                  <p className="text-xs text-green-600 dark:text-green-500">
                    Cambio: {formatCurrency(totals.change)}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-500 rounded-lg">
              <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-orange-700 dark:text-orange-400">Falta por pagar</p>
                <p className="text-lg font-bold text-orange-600 dark:text-orange-500">
                  {formatCurrency(totals.remaining)}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="border-b border-gray-200 p-4 dark:border-gray-700">
          <SuspendedSalesPanel
            suspendedSales={suspendedSales}
            canSuspend={cart.length > 0}
            onSuspend={suspendCurrentSale}
            onResume={resumeSuspendedSale}
            onDiscard={discardSuspendedSale}
            formatCurrency={formatCurrency}
          />
        </div>

        {/* Payments List */}
        {payments.length > 0 && (
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3">Pagos Agregados</p>
            <div className="space-y-2">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white dark:bg-gray-600 rounded-lg flex items-center justify-center">
                      {payment.method === 'cash' && <span className="text-xl">💵</span>}
                      {payment.method === 'card' && <span className="text-xl">💳</span>}
                      {payment.method === 'transfer' && <span className="text-xl">📱</span>}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white capitalize">
                        {payment.method === 'cash' && 'Efectivo'}
                        {payment.method === 'card' && 'Tarjeta'}
                        {payment.method === 'transfer' && 'Transferencia'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {payment.reference || 'Sin referencia'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-base font-bold text-gray-900 dark:text-white">
                      {formatCurrency(payment.amount)}
                    </p>
                    <button
                      onClick={() => removePayment(payment.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-all"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Payment Methods */}
        <div className="flex-1 p-6 space-y-3 overflow-y-auto">
          <TouchKeypad
            selectedQuantity={selectedQuickQuantity}
            suspendedCount={suspendedSales.length}
            canSuspendSale={cart.length > 0}
            onQuantityChange={setSelectedQuickQuantity}
            onOpenSalePanel={openSalePanel}
            onOpenReturn={() => setShowReturnModal(true)}
            onSuspendSale={suspendCurrentSale}
            onFullscreen={toggleFullscreenMode}
          />

          {/* Quick Exact Payment Button */}
          {!totals.isPaid && payments.length === 0 && (
            <button
              onClick={handleExactPayment}
              disabled={cart.length === 0}
              className="w-full p-5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-98"
            >
              <div className="flex items-center justify-center gap-3">
                <span className="text-3xl">⚡</span>
                <div className="text-left">
                  <p className="text-xl font-bold">COBRAR EXACTO</p>
                  <p className="text-sm opacity-90">Efectivo • Sin cambio</p>
                </div>
              </div>
            </button>
          )}

          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            {payments.length > 0 ? 'O agregar otro pago' : 'Pago personalizado'}
          </p>

          {/* Cash */}
          <button
            onClick={() => handleAddPayment('cash')}
            disabled={cart.length === 0 || totals.isPaid}
            className="w-full p-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:from-green-500 flex items-center gap-3"
          >
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <span className="text-2xl">💵</span>
            </div>
            <div className="flex-1 text-left">
              <p className="font-bold">Efectivo</p>
              <p className="text-xs opacity-90">F1</p>
            </div>
            <Plus className="w-5 h-5" />
          </button>

          {/* Card */}
          <button
            onClick={() => handleAddPayment('card')}
            disabled={cart.length === 0 || totals.isPaid}
            className="w-full p-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:from-blue-500 flex items-center gap-3"
          >
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <span className="text-2xl">💳</span>
            </div>
            <div className="flex-1 text-left">
              <p className="font-bold">Tarjeta</p>
              <p className="text-xs opacity-90">F2</p>
            </div>
            <Plus className="w-5 h-5" />
          </button>

          {/* Transfer */}
          <button
            onClick={() => handleAddPayment('transfer')}
            disabled={cart.length === 0 || totals.isPaid}
            className="w-full p-4 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:from-purple-500 flex items-center gap-3"
          >
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <span className="text-2xl">📱</span>
            </div>
            <div className="flex-1 text-left">
              <p className="font-bold">Transferencia</p>
              <p className="text-xs opacity-90">F3</p>
            </div>
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Complete Sale Button */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => completeSale()}
            disabled={!totals.isPaid}
            className={`w-full p-4 rounded-xl font-bold text-lg shadow-lg transition-all ${
              totals.isPaid
                ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white hover:shadow-xl active:scale-98'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
            }`}
          >
            {totals.isPaid ? (
              <div className="flex items-center justify-center gap-2">
                <Check className="w-6 h-6" />
                <span>COMPLETAR VENTA (F4)</span>
              </div>
            ) : (
              <span>AGREGAR PAGOS PARA CONTINUAR</span>
            )}
          </button>
        </div>

        {/* Operational Activity */}
        <div className="border-t border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/50">
          <OperationalActivityFeed activities={recentActivities} />
        </div>
      </div>

      <SaleSidePanel
        panel={sidePanel}
        onClose={() => setSidePanel(null)}
        formatCurrency={formatCurrency}
      />

      {/* Payment Modal */}
      <AddPaymentModal
        isOpen={showAddPaymentModal}
        onClose={() => {
          setShowAddPaymentModal(false);
          setSelectedPaymentMethod(null);
        }}
        paymentMethod={selectedPaymentMethod}
        remainingAmount={totals.remaining}
        onConfirm={confirmAddPayment}
      />

      {/* Shift Modals */}
      <CloseShiftModal
        isOpen={showCloseShiftModal}
        onClose={() => setShowCloseShiftModal(false)}
        shift={currentShift}
        onConfirm={handleCloseShift}
      />

      <CashMovementModal
        isOpen={showCashMovementModal}
        onClose={() => setShowCashMovementModal(false)}
        onConfirm={handleCashMovement}
      />

      {/* Discount Modal */}
      {selectedItemForDiscount && (
        <DiscountModal
          isOpen={showDiscountModal}
          onClose={() => {
            setShowDiscountModal(false);
            setSelectedItemForDiscount(null);
          }}
          itemName={selectedItemForDiscount.name}
          itemPrice={selectedItemForDiscount.price}
          itemQuantity={selectedItemForDiscount.quantity}
          currentDiscount={selectedItemForDiscount.discount}
          currentDiscountType={selectedItemForDiscount.discountType}
          onConfirm={(discount, type) => {
            applyDiscount(selectedItemForDiscount.id, discount, type);
            setShowDiscountModal(false);
            setSelectedItemForDiscount(null);
          }}
        />
      )}

      {/* Global Discount Modal */}
      <DiscountModal
        isOpen={showGlobalDiscountModal}
        onClose={() => setShowGlobalDiscountModal(false)}
        itemName={`Toda la venta (${cart.length} productos)`}
        itemPrice={totals.subtotal / cart.reduce((sum, item) => sum + item.quantity, 0) || 0}
        itemQuantity={cart.reduce((sum, item) => sum + item.quantity, 0)}
        currentDiscount={0}
        currentDiscountType="percentage"
        onConfirm={(discount, type) => {
          applyGlobalDiscount(discount, type);
          setShowGlobalDiscountModal(false);
        }}
      />

      {/* Ticket Modal */}
      {lastSale && (
        <TicketModal
          isOpen={showTicketModal}
          onClose={() => {
            setShowTicketModal(false);
            setTimeout(() => {
              if (barcodeInputRef.current) {
                barcodeInputRef.current.focus();
              }
            }, 100);
          }}
          items={lastSale.items}
          payments={lastSale.payments}
          totals={lastSale.totals}
          shift={currentShift}
          saleNumber={lastSale.saleNumber}
        />
      )}

      {/* Return Modal */}
      <ReturnModal
        isOpen={showReturnModal}
        onClose={() => setShowReturnModal(false)}
        onConfirm={handleReturn}
      />
    </div>
    </>
  );
}
