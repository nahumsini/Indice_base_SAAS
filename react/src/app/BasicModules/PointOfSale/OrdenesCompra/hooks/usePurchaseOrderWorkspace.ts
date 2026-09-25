import { useCallback, useEffect, useMemo, useState } from 'react';
import type { PosWarehouseSummary } from '../../Sale/services/posBackendApi';
import { purchaseOrdersApi } from '../services/purchaseOrdersApi';
import type {
  ProductSupplier,
  ProviderOption,
  PurchaseOrder,
  PurchaseOrderCreatePayload,
  PurchaseOrderOrigin,
  PurchaseOrderReceivePayload,
  PurchaseOrderStatus,
  SupplierInvoice,
  SupplierInvoicePayload,
  SupplierInvoiceStatus,
  SupplierSubmission,
  SupplierSubmissionConvertPayload,
  SupplierSubmissionReviewPayload,
  SupplierSubmissionStatus,
} from '../types/purchaseOrder.types';

export type PurchaseOrderFilters = {
  query: string;
  period: 'ALL' | 'CURRENT_MONTH' | 'PREVIOUS_MONTH' | 'LAST_90_DAYS' | 'CURRENT_YEAR';
  status: PurchaseOrderStatus | 'ALL';
  origin: PurchaseOrderOrigin | 'ALL';
  providerId: number | 'ALL';
  warehouseId: number | 'ALL';
  dateFrom: string;
  dateTo: string;
  submissionStatus: SupplierSubmissionStatus | 'ALL';
};

const initialFilters: PurchaseOrderFilters = {
  query: '',
  period: 'ALL',
  status: 'ALL',
  origin: 'ALL',
  providerId: 'ALL',
  warehouseId: 'ALL',
  dateFrom: '',
  dateTo: '',
  submissionStatus: 'ALL',
};

const toErrorMessage = (error: unknown, fallback: string) => (
  error instanceof Error && error.message ? error.message : fallback
);

export function usePurchaseOrderWorkspace() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [providers, setProviders] = useState<ProviderOption[]>([]);
  const [warehouses, setWarehouses] = useState<PosWarehouseSummary[]>([]);
  const [supplierLinks, setSupplierLinks] = useState<ProductSupplier[]>([]);
  const [supplierInvoices, setSupplierInvoices] = useState<SupplierInvoice[]>([]);
  const [supplierSubmissions, setSupplierSubmissions] = useState<SupplierSubmission[]>([]);
  const [filters, setFilters] = useState<PurchaseOrderFilters>(initialFilters);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadStaticData = useCallback(async () => {
    const [context, providerResponse, supplierLinkResponse] = await Promise.all([
      purchaseOrdersApi.context(),
      purchaseOrdersApi.providers(),
      purchaseOrdersApi.productSuppliers(),
    ]);
    setWarehouses(context.warehouses ?? []);
    setProviders((providerResponse.providers ?? []).filter((provider) => provider.status !== 'INACTIVE'));
    setSupplierLinks(supplierLinkResponse.items ?? []);
  }, []);

  const loadOrders = useCallback(async () => {
    const [orderResponse, invoiceResponse, submissionResponse] = await Promise.all([
      purchaseOrdersApi.listOrders(filters),
      purchaseOrdersApi.listSupplierInvoices({
        providerId: filters.providerId,
      }),
      purchaseOrdersApi.listSupplierSubmissions({
        status: filters.submissionStatus,
        providerId: filters.providerId,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
      }),
    ]);
    setOrders(orderResponse.items ?? []);
    setSupplierInvoices(invoiceResponse.items ?? []);
    setSupplierSubmissions(submissionResponse.items ?? []);
  }, [filters]);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await loadStaticData();
      await loadOrders();
    } catch (loadError) {
      setError(toErrorMessage(loadError, 'No se pudieron cargar las ordenes de compra POS.'));
    } finally {
      setLoading(false);
    }
  }, [loadOrders, loadStaticData]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const filteredOrders = useMemo(() => {
    const query = filters.query.trim().toLowerCase();
    return orders.filter((order) => (
      (!query
        || `${order.folio} ${order.providerName} ${order.warehouseName} ${order.notes ?? ''}`
          .toLowerCase()
          .includes(query))
      && (filters.status === 'ALL' || order.status === filters.status)
      && (filters.origin === 'ALL' || order.origin === filters.origin)
      && (filters.providerId === 'ALL' || order.providerId === filters.providerId)
      && (filters.warehouseId === 'ALL' || order.warehouseId === filters.warehouseId)
      && (!filters.dateFrom || (order.expectedDate ?? '') >= filters.dateFrom)
      && (!filters.dateTo || (order.expectedDate ?? '') <= filters.dateTo)
    ));
  }, [filters, orders]);

  const filteredSupplierSubmissions = useMemo(() => {
    const query = filters.query.trim().toLowerCase();
    return supplierSubmissions.filter((submission) => (
      (!query
        || `${submission.submissionNumber} ${submission.providerName} ${submission.submittedByName ?? ''} ${submission.notes ?? ''}`
          .toLowerCase()
          .includes(query))
      && (filters.submissionStatus === 'ALL' || submission.status === filters.submissionStatus)
      && (filters.providerId === 'ALL' || submission.providerId === filters.providerId)
      && (!filters.dateFrom || (submission.submittedAt?.slice(0, 10) ?? '') >= filters.dateFrom)
      && (!filters.dateTo || (submission.submittedAt?.slice(0, 10) ?? '') <= filters.dateTo)
    ));
  }, [filters, supplierSubmissions]);

  const mutate = useCallback(async <T,>(operation: () => Promise<T>, successMessage: string) => {
    setSaving(true);
    setError(null);
    try {
      const result = await operation();
      setNotice(successMessage);
      await loadStaticData();
      await loadOrders();
      return result;
    } catch (mutationError) {
      setError(toErrorMessage(mutationError, 'No se pudo completar la acción.'));
      throw mutationError;
    } finally {
      setSaving(false);
    }
  }, [loadOrders, loadStaticData]);

  const createOrder = useCallback((payload: PurchaseOrderCreatePayload) => (
    mutate(() => purchaseOrdersApi.createOrder(payload), 'Orden de compra creada y lista para solicitar.')
  ), [mutate]);

  const performOrderAction = useCallback((orderId: number, action: 'request' | 'approve' | 'send' | 'cancel', note?: string) => (
    mutate(() => purchaseOrdersApi.action(orderId, action, note), 'Estado de orden actualizado.')
  ), [mutate]);

  const receiveOrder = useCallback((orderId: number, payload: PurchaseOrderReceivePayload) => (
    mutate(() => purchaseOrdersApi.receive(orderId, payload), 'Recepción guardada e inventario actualizado.')
  ), [mutate]);

  const submitSupplierInvoice = useCallback((payload: SupplierInvoicePayload) => (
    mutate(() => purchaseOrdersApi.submitSupplierInvoice(payload), 'Factura de proveedor registrada para revisión.')
  ), [mutate]);

  const updateSupplierPortalAccessStatus = useCallback((accessId: number, status: SupplierPortalAccessStatus) => (
    mutate(
      () => purchaseOrdersApi.updateSupplierPortalAccessStatus(accessId, { status }),
      status === 'ACTIVE' ? 'Acceso de proveedor activado.' : 'Acceso de proveedor desactivado.',
    )
  ), [mutate]);

  const changeSupplierPortalAccessPin = useCallback((accessId: number, pin: string) => (
    mutate(() => purchaseOrdersApi.changeSupplierPortalAccessPin(accessId, { pin }), 'NIP de proveedor actualizado.')
  ), [mutate]);

  const reviewSupplierInvoice = useCallback((invoiceId: number, status: SupplierInvoiceStatus, reviewNote?: string) => (
    mutate(() => purchaseOrdersApi.reviewSupplierInvoice(invoiceId, status, reviewNote), 'Factura de proveedor actualizada.')
  ), [mutate]);

  const reviewSupplierSubmission = useCallback((submissionId: number, payload: SupplierSubmissionReviewPayload) => (
    mutate(() => purchaseOrdersApi.reviewSupplierSubmission(submissionId, payload), 'Propuesta de proveedor actualizada.')
  ), [mutate]);

  const convertSupplierSubmission = useCallback((submissionId: number, payload: SupplierSubmissionConvertPayload) => (
    mutate(() => purchaseOrdersApi.convertSupplierSubmission(submissionId, payload), 'Propuesta convertida en orden de compra.')
  ), [mutate]);

  return {
    convertSupplierSubmission,
    createOrder,
    error,
    filteredOrders,
    filteredSupplierSubmissions,
    filters,
    loading,
    notice,
    orders,
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
    supplierSubmissions,
    updateSupplierPortalAccessStatus,
    warehouses,
  };
}
