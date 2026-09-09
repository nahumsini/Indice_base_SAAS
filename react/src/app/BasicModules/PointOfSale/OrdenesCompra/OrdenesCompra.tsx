import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { ConfirmDeleteDialog } from '../../../components/ConfirmDeleteDialog';
import { useLearningModeHeaderActions } from '../../../learningMode';
import { buildSalesProductInputFromPointOfSale } from '../../CommerceCore/posProductMutations';
import { toPointOfSaleProduct } from '../../CommerceCore/posCatalog';
import { usePointOfSaleCatalogProducts } from '../../CommerceCore/usePointOfSaleCatalogProducts';
import { useSalesCrm } from '../../Sales/salesCrmContext';
import { CreatePurchaseOrderModal } from './components/CreatePurchaseOrderModal';
import { PurchaseOrderDetailModal } from './components/PurchaseOrderDetailModal';
import { PurchaseOrderFiltersBar } from './components/PurchaseOrderFilters';
import { PurchaseOrderHeader } from './components/PurchaseOrderHeader';
import { PurchaseOrderKpis } from './components/PurchaseOrderKpis';
import { ProviderCenterProcurementPanel } from './components/ProviderCenterProcurementPanel';
import { PurchaseOrderViewSwitcher, type PurchaseOrderWorkspaceMode } from './components/PurchaseOrderViewSwitcher';
import { PurchaseOrdersTable } from './components/PurchaseOrdersTable';
import { ReceivePurchaseOrderModal } from './components/ReceivePurchaseOrderModal';
import { SupplierSubmissionDetailModal } from './components/SupplierSubmissionDetailModal';
import { SupplierSubmissionKpis } from './components/SupplierSubmissionKpis';
import { SupplierSubmissionsTable } from './components/SupplierSubmissionsTable';
import { usePurchaseOrderWorkspace } from './hooks/usePurchaseOrderWorkspace';
import { usePurchaseOrderTranslations } from './hooks/usePurchaseOrderTranslations';
import type {
  PurchaseOrder,
  SupplierInvoiceStatus,
  SupplierSubmission,
  SupplierSubmissionConvertPayload,
  SupplierSubmissionReviewPayload,
  PurchaseOrderReceivePayload,
} from './types/purchaseOrder.types';

export default function OrdenesCompra() {
  const learningModeActive = useLearningModeHeaderActions()?.active ?? false;
  const { copy } = usePurchaseOrderTranslations();
  const {
    balanceLoadError,
    products,
    purchasingProducts,
    saleCurrency,
    reloadInventoryBalances,
  } = usePointOfSaleCatalogProducts();
  const { createProductRecord } = useSalesCrm();
  const {
    createOrder,
    error,
    filteredOrders,
    filteredSupplierSubmissions,
    filters,
    notice,
    performOrderAction,
    providers,
    receiveOrder,
    reload,
    reviewSupplierInvoice,
    reviewSupplierSubmission,
    saving,
    setFilters,
    setError,
    setNotice,
    submitSupplierInvoice,
    supplierInvoices,
    supplierLinks,
    warehouses,
    convertSupplierSubmission,
  } = usePurchaseOrderWorkspace();

  const [workspaceMode, setWorkspaceMode] = useState<PurchaseOrderWorkspaceMode>('orders');
  const [showCreateOrder, setShowCreateOrder] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<SupplierSubmission | null>(null);
  const [receivingOrder, setReceivingOrder] = useState<PurchaseOrder | null>(null);
  const [orderPendingCancellation, setOrderPendingCancellation] = useState<PurchaseOrder | null>(null);

  const handleOrderAction = (order: PurchaseOrder, action: 'request' | 'approve' | 'send' | 'cancel') => {
    if (action === 'cancel') {
      setOrderPendingCancellation(order);
      return;
    }

    void performOrderAction(order.id, action)
      .catch(() => undefined);
  };

  const confirmOrderCancellation = () => {
    if (!orderPendingCancellation) {
      return;
    }

    void performOrderAction(orderPendingCancellation.id, 'cancel', copy.cancelDialog.note)
      .finally(() => setOrderPendingCancellation(null));
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
      />

      {notice ? (
        <div className="flex items-start justify-between gap-3 rounded-[20px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
          <span>{notice}</span>
          <button type="button" className="text-xs font-medium" onClick={() => setNotice(null)}>{copy.common.close}</button>
        </div>
      ) : null}

      {(error || balanceLoadError) ? (
        <div className="flex items-start gap-3 rounded-[20px] border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
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

      {workspaceMode !== 'provider-center' ? <PurchaseOrderFiltersBar
          filters={filters}
          mode={workspaceMode}
          providers={providers}
          warehouses={warehouses}
          onChange={setFilters}
        /> : null}

      {!learningModeActive ? (
        workspaceMode === 'orders' ? (
          <PurchaseOrderKpis
            currency={saleCurrency}
            invoices={supplierInvoices}
            orders={filteredOrders}
          />
        ) : workspaceMode === 'submissions' ? (
          <SupplierSubmissionKpis submissions={filteredSupplierSubmissions} />
        ) : null
      ) : null}

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
      ) : workspaceMode === 'submissions' ? (
        <SupplierSubmissionsTable
          disabled={saving}
          submissions={filteredSupplierSubmissions}
          onConvert={openSubmissionConvert}
          onSelect={setSelectedSubmission}
          onStartReview={setSelectedSubmission}
        />
      ) : <ProviderCenterProcurementPanel
          products={purchasingProducts}
          providers={providers}
          onOrdersChanged={reload}
          onError={message => setError(message)}
          onNotice={message => setNotice(message)}
        />}

      {showCreateOrder ? (
        <CreatePurchaseOrderModal
          products={purchasingProducts}
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
        products={purchasingProducts}
        saving={saving}
        submission={selectedSubmission}
        warehouses={warehouses}
        onClose={() => setSelectedSubmission(null)}
        onConvert={handleSubmissionConvert}
        onReview={handleSubmissionReview}
      />

      <ConfirmDeleteDialog
        isVisible={Boolean(orderPendingCancellation)}
        title={copy.cancelDialog.title}
        itemName={orderPendingCancellation?.folio}
        description={copy.cancelDialog.description}
        cancelLabel={copy.common.close}
        confirmDisabled={saving}
        confirmLabel={copy.cancelDialog.confirm}
        onCancel={() => setOrderPendingCancellation(null)}
        onConfirm={confirmOrderCancellation}
      />
    </div>
  );
}
