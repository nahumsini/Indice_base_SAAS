import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { usePointOfSaleCatalogProducts } from '../../CommerceCore/usePointOfSaleCatalogProducts';
import { CreatePurchaseOrderModal } from './components/CreatePurchaseOrderModal';
import { PurchaseOrderDetailModal } from './components/PurchaseOrderDetailModal';
import { PurchaseOrderFiltersBar } from './components/PurchaseOrderFilters';
import { PurchaseOrderHeader } from './components/PurchaseOrderHeader';
import { PurchaseOrderKpis } from './components/PurchaseOrderKpis';
import { PurchaseOrdersTable } from './components/PurchaseOrdersTable';
import { ReceivePurchaseOrderModal } from './components/ReceivePurchaseOrderModal';
import { SupplierInvoiceModal } from './components/SupplierInvoiceModal';
import { SupplierInvoicesPanel } from './components/SupplierInvoicesPanel';
import { usePurchaseOrderWorkspace } from './hooks/usePurchaseOrderWorkspace';
import type { PurchaseOrder, SupplierInvoiceStatus } from './types/purchaseOrder.types';

export default function OrdenesCompra() {
  const { balanceLoadError, products, saleCurrency } = usePointOfSaleCatalogProducts();
  const {
    createOrder,
    error,
    filteredOrders,
    filters,
    loading,
    notice,
    performOrderAction,
    providers,
    receiveOrder,
    reload,
    reviewSupplierInvoice,
    saving,
    setFilters,
    setNotice,
    submitSupplierInvoice,
    supplierInvoices,
    supplierLinks,
    warehouses,
  } = usePurchaseOrderWorkspace();

  const [showCreateOrder, setShowCreateOrder] = useState(false);
  const [showSupplierInvoice, setShowSupplierInvoice] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [receivingOrder, setReceivingOrder] = useState<PurchaseOrder | null>(null);

  const handleOrderAction = (order: PurchaseOrder, action: 'request' | 'approve' | 'send' | 'cancel') => {
    void performOrderAction(order.id, action, action === 'cancel' ? 'Cancelada desde Punto de Venta.' : undefined)
      .catch(() => undefined);
  };

  const handleInvoiceReview = (invoiceId: number, status: SupplierInvoiceStatus) => {
    void reviewSupplierInvoice(invoiceId, status).catch(() => undefined);
  };

  return (
    <div className="space-y-6">
      <PurchaseOrderHeader
        onCreateInvoice={() => setShowSupplierInvoice(true)}
        onCreateOrder={() => setShowCreateOrder(true)}
        onRefresh={() => void reload()}
        refreshing={loading}
      />

      {notice ? (
        <div className="flex items-start justify-between gap-3 rounded-[20px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
          <span>{notice}</span>
          <button type="button" className="text-xs font-bold uppercase" onClick={() => setNotice(null)}>Cerrar</button>
        </div>
      ) : null}

      {(error || balanceLoadError) ? (
        <div className="flex items-start gap-3 rounded-[20px] border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error ?? balanceLoadError}</span>
        </div>
      ) : null}

      {(providers.length === 0 || warehouses.length === 0 || products.length === 0) ? (
        <section className="rounded-[24px] border border-amber-200 bg-amber-50 p-5 text-sm font-semibold text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
          Para comprar necesitas proveedores activos, almacenes POS y productos preparados para punto de venta. La orden queda bloqueada si falta cualquiera de esos tres datos.
        </section>
      ) : null}

      <PurchaseOrderFiltersBar
        filters={filters}
        providers={providers}
        warehouses={warehouses}
        onChange={setFilters}
      />

      <PurchaseOrderKpis
        currency={saleCurrency}
        invoices={supplierInvoices}
        orders={filteredOrders}
      />

      <PurchaseOrdersTable
        disabled={saving}
        invoices={supplierInvoices}
        orders={filteredOrders}
        onAction={handleOrderAction}
        onReceive={setReceivingOrder}
        onSelect={setSelectedOrder}
      />

      <SupplierInvoicesPanel
        disabled={saving}
        invoices={supplierInvoices}
        onReview={handleInvoiceReview}
      />

      {showCreateOrder ? (
        <CreatePurchaseOrderModal
          products={products}
          providers={providers}
          saleCurrency={saleCurrency}
          saving={saving}
          supplierLinks={supplierLinks}
          warehouses={warehouses}
          onClose={() => setShowCreateOrder(false)}
          onSubmit={createOrder}
        />
      ) : null}

      {showSupplierInvoice ? (
        <SupplierInvoiceModal
          orders={filteredOrders}
          providers={providers}
          saving={saving}
          onClose={() => setShowSupplierInvoice(false)}
          onSubmit={submitSupplierInvoice}
        />
      ) : null}

      <ReceivePurchaseOrderModal
        order={receivingOrder}
        saving={saving}
        onClose={() => setReceivingOrder(null)}
        onSubmit={receiveOrder}
      />

      <PurchaseOrderDetailModal
        invoices={supplierInvoices}
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
      />
    </div>
  );
}
