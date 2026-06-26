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
  SupplierPortalAccess,
  SupplierPortalAccessPayload,
  SupplierSubmission,
  SupplierSubmissionConvertPayload,
  SupplierSubmissionReviewPayload,
  SupplierSubmissionStatus,
} from '../types/purchaseOrder.types';

export type PurchaseOrderFilters = {
  query: string;
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
  const [supplierPortalAccess, setSupplierPortalAccess] = useState<SupplierPortalAccess[]>([]);
  const [filters, setFilters] = useState<PurchaseOrderFilters>(initialFilters);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadStaticData = useCallback(async () => {
    const [context, providerResponse, supplierLinkResponse, supplierPortalResponse] = await Promise.all([
      purchaseOrdersApi.context(),
      purchaseOrdersApi.providers(),
      purchaseOrdersApi.productSuppliers(),
      purchaseOrdersApi.listSupplierPortalAccess(),
    ]);
    setWarehouses(context.warehouses ?? []);
    setProviders((providerResponse.providers ?? []).filter((provider) => provider.status !== 'INACTIVE'));
    setSupplierLinks(supplierLinkResponse.items ?? []);
    setSupplierPortalAccess(supplierPortalResponse.items ?? []);
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
    if (!query) return orders;
    return orders.filter((order) => (
      `${order.folio} ${order.providerName} ${order.warehouseName} ${order.notes ?? ''}`
        .toLowerCase()
        .includes(query)
    ));
  }, [filters.query, orders]);

  const filteredSupplierSubmissions = useMemo(() => {
    const query = filters.query.trim().toLowerCase();
    if (!query) return supplierSubmissions;
    return supplierSubmissions.filter((submission) => (
      `${submission.submissionNumber} ${submission.providerName} ${submission.submittedByName ?? ''} ${submission.notes ?? ''}`
        .toLowerCase()
        .includes(query)
    ));
  }, [filters.query, supplierSubmissions]);

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
      setError(toErrorMessage(mutationError, 'No se pudo completar la accion.'));
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
    mutate(() => purchaseOrdersApi.receive(orderId, payload), 'Recepcion guardada e inventario actualizado.')
  ), [mutate]);

  const submitSupplierInvoice = useCallback((payload: SupplierInvoicePayload) => (
    mutate(() => purchaseOrdersApi.submitSupplierInvoice(payload), 'Factura de proveedor registrada para revision.')
  ), [mutate]);

  const createSupplierPortalAccess = useCallback((payload: SupplierPortalAccessPayload) => (
    mutate(() => purchaseOrdersApi.createSupplierPortalAccess(payload), 'Acceso de proveedor listo para compartir.')
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
    createSupplierPortalAccess,
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
    setNotice,
    submitSupplierInvoice,
    supplierInvoices,
    supplierLinks,
    supplierPortalAccess,
    supplierSubmissions,
    warehouses,
  };
}
