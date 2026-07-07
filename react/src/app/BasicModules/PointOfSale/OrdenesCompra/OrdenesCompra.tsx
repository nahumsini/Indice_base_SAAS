import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { buildSalesProductInputFromPointOfSale } from '../../CommerceCore/posProductMutations';
import { toPointOfSaleProduct } from '../../CommerceCore/posCatalog';
import { usePointOfSaleCatalogProducts } from '../../CommerceCore/usePointOfSaleCatalogProducts';
import { useSalesCrm } from '../../Sales/salesCrmContext';
import { CreatePurchaseOrderModal } from './components/CreatePurchaseOrderModal';
import { PurchaseOrderDetailModal } from './components/PurchaseOrderDetailModal';
import { PurchaseOrderFiltersBar } from './components/PurchaseOrderFilters';
import { PurchaseOrderHeader } from './components/PurchaseOrderHeader';
import { PurchaseOrderKpis } from './components/PurchaseOrderKpis';
import { PurchaseOrderViewSwitcher, type PurchaseOrderWorkspaceMode } from './components/PurchaseOrderViewSwitcher';
import { PurchaseOrdersTable } from './components/PurchaseOrdersTable';
import { ReceivePurchaseOrderModal } from './components/ReceivePurchaseOrderModal';
import { SupplierSubmissionDetailModal } from './components/SupplierSubmissionDetailModal';
import { SupplierSubmissionKpis } from './components/SupplierSubmissionKpis';
import { SupplierSubmissionsTable } from './components/SupplierSubmissionsTable';
import { SupplierPortalAccessModal } from './components/SupplierPortalAccessModal';
import { usePurchaseOrderWorkspace } from './hooks/usePurchaseOrderWorkspace';
import type {
  PurchaseOrder,
  SupplierInvoiceStatus,
  SupplierPortalAccessPayload,
  SupplierSubmission,
  SupplierSubmissionConvertPayload,
  SupplierSubmissionReviewPayload,
  PurchaseOrderReceivePayload,
} from './types/purchaseOrder.types';

export default function OrdenesCompra() {
  const { balanceLoadError, products, saleCurrency, reloadInventoryBalances } = usePointOfSaleCatalogProducts();
  const { createProductRecord } = useSalesCrm();
  const {
    changeSupplierPortalAccessPin,
    createOrder,
    createSupplierPortalAccess,
    error,
    filteredOrders,
    filteredSupplierSubmissions,
    filters,
    notice,
    performOrderAction,
    providers,
    receiveOrder,
    reviewSupplierInvoice,
    reviewSupplierSubmission,
    saving,
    setFilters,
    setNotice,
    submitSupplierInvoice,
    supplierInvoices,
    supplierLinks,
    supplierPortalAccess,
    warehouses,
    convertSupplierSubmission,
    updateSupplierPortalAccessStatus,
  } = usePurchaseOrderWorkspace();

  const [workspaceMode, setWorkspaceMode] = useState<PurchaseOrderWorkspaceMode>('orders');
  const [showCreateOrder, setShowCreateOrder] = useState(false);
  const [showSupplierPortal, setShowSupplierPortal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<SupplierSubmission | null>(null);
  const [receivingOrder, setReceivingOrder] = useState<PurchaseOrder | null>(null);

  const handleOrderAction = (order: PurchaseOrder, action: 'request' | 'approve' | 'send' | 'cancel') => {
    void performOrderAction(order.id, action, action === 'cancel' ? 'Cancelada desde Punto de Venta.' : undefined)
      .catch(() => undefined);
  };

  const handleInvoiceReview = (invoiceId: number, status: SupplierInvoiceStatus) => {
    void reviewSupplierInvoice(invoiceId, status).catch(() => undefined);
  };

  const handleSubmissionReview = async (
    submissionId: number,
    payload: SupplierSubmissionReviewPayload,
  ) => {
    const updated = await reviewSupplierSubmission(submissionId, payload);
    setSelectedSubmission(updated);
    return updated;
  };

  const handleSubmissionConvert = async (
    submissionId: number,
    payload: SupplierSubmissionConvertPayload,
  ) => {
    const order = await convertSupplierSubmission(submissionId, payload);
    setSelectedSubmission(null);
    setWorkspaceMode('orders');
    setSelectedOrder(order);
    return order;
  };

  const handleCreateSupplierPortalAccess = async (payload: SupplierPortalAccessPayload) => (
    createSupplierPortalAccess(payload)
  );

  const handleCreatePurchaseProduct = async (product: Partial<(typeof products)[number]>) => {
    const savedProduct = await createProductRecord(buildSalesProductInputFromPointOfSale(product, saleCurrency));
    return toPointOfSaleProduct(savedProduct);
  };

  const handleReceiveOrder = async (
    orderId: number,
    payload: PurchaseOrderReceivePayload,
  ) => {
    const receivedOrder = await receiveOrder(orderId, payload);
    await reloadInventoryBalances();
    return receivedOrder;
  };

  const openSubmissionConvert = (submission: SupplierSubmission) => {
    setSelectedSubmission(submission);
  };

  return (
    <div className="space-y-6">
      <PurchaseOrderHeader
        onCreateOrder={() => setShowCreateOrder(true)}
        onManageSupplierPortal={() => setShowSupplierPortal(true)}
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

      <PurchaseOrderViewSwitcher
        mode={workspaceMode}
        orderCount={filteredOrders.length}
        submissionCount={filteredSupplierSubmissions.length}
        onChange={setWorkspaceMode}
      />

      <PurchaseOrderFiltersBar
        filters={filters}
        mode={workspaceMode}
        providers={providers}
        warehouses={warehouses}
        onChange={setFilters}
      />

      {workspaceMode === 'orders' ? (
        <PurchaseOrderKpis
          currency={saleCurrency}
          invoices={supplierInvoices}
          orders={filteredOrders}
        />
      ) : (
        <SupplierSubmissionKpis submissions={filteredSupplierSubmissions} />
      )}

      {workspaceMode === 'orders' ? (
        <>
          <PurchaseOrdersTable
            disabled={saving}
            invoices={supplierInvoices}
            orders={filteredOrders}
            onAction={handleOrderAction}
            onInvoiceReview={handleInvoiceReview}
            onReceive={setReceivingOrder}
            onSelect={setSelectedOrder}
          />
        </>
      ) : (
        <SupplierSubmissionsTable
          disabled={saving}
          submissions={filteredSupplierSubmissions}
          onConvert={openSubmissionConvert}
          onSelect={setSelectedSubmission}
          onStartReview={setSelectedSubmission}
        />
      )}

      {showCreateOrder ? (
        <CreatePurchaseOrderModal
          products={products}
          providers={providers}
          saleCurrency={saleCurrency}
          saving={saving}
          supplierLinks={supplierLinks}
          warehouses={warehouses}
          onClose={() => setShowCreateOrder(false)}
          onCreateProduct={handleCreatePurchaseProduct}
          onSubmit={createOrder}
          onSubmitInvoice={submitSupplierInvoice}
        />
      ) : null}

      {showSupplierPortal ? (
        <SupplierPortalAccessModal
          accessList={supplierPortalAccess}
          providers={providers}
          saving={saving}
          onChangePin={changeSupplierPortalAccessPin}
          onClose={() => setShowSupplierPortal(false)}
          onStatusChange={updateSupplierPortalAccessStatus}
          onSubmit={handleCreateSupplierPortalAccess}
        />
      ) : null}

      <ReceivePurchaseOrderModal
        order={receivingOrder}
        saving={saving}
        onClose={() => setReceivingOrder(null)}
        onSubmit={handleReceiveOrder}
      />

      <PurchaseOrderDetailModal
        invoices={supplierInvoices}
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
      />

      <SupplierSubmissionDetailModal
        saving={saving}
        submission={selectedSubmission}
        warehouses={warehouses}
        onClose={() => setSelectedSubmission(null)}
        onConvert={handleSubmissionConvert}
        onReview={handleSubmissionReview}
      />
    </div>
  );
}
