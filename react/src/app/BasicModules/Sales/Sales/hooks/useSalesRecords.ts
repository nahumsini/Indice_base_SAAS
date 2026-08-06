import { useMemo, useState } from 'react';
import type { SaleRecord, SaleRecordDraft, SalesColumnId, SalesFiltersState } from '../types/salesTypes';
import { normalizeTextKey } from '../../utils/salesTextUtils';
import { getCustomerLifecycleSignals } from '../../utils/customerLifecycle';
import { validateSaleDraftForBackendReadiness } from '../../services/salesWorkflowBridge';
import { useSalesCrm } from '../../salesCrmContext';
import { defaultSalesCurrency } from '../../utils/salesCurrency';
import { calculateSalesMetrics } from '../utils/salesMetrics';
import { defaultVisibleSalesColumns } from '../utils/salesStatuses';
import { salesApi } from '../../salesApi';

const initialFilters: SalesFiltersState = {
  search: '',
  focus: 'all',
  businessUnit: 'all',
  business: 'all',
  period: 'all',
  seller: 'all',
  customer: 'all',
  commercialStatus: 'all',
  financeStatus: 'all',
  inventoryStatus: 'all',
  inventoryMovementStatus: 'all',
  commissionStatus: 'all',
  relationship: 'all',
  customerHealth: 'all',
  postSaleStatus: 'all',
};

function matchesFilter(value: string, filter: string) {
  return filter === 'all' || value === filter;
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function isWithinSelectedPeriod(value: string, period: SalesFiltersState['period']) {
  if (period === 'all' || period === 'custom') return true;
  if (!value) return false;

  const saleDate = startOfDay(new Date(`${value}T00:00:00`));
  const today = startOfDay(new Date());

  if (period === 'today') {
    return saleDate.getTime() === today.getTime();
  }

  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  if (period === 'this_month') {
    return saleDate.getMonth() === currentMonth && saleDate.getFullYear() === currentYear;
  }

  if (period === 'last_month') {
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    return saleDate.getMonth() === lastMonth.getMonth() && saleDate.getFullYear() === lastMonth.getFullYear();
  }

  const dayOfWeek = today.getDay() || 7;
  const weekStart = startOfDay(new Date(today));
  weekStart.setDate(today.getDate() - dayOfWeek + 1);
  const weekEnd = startOfDay(new Date(weekStart));
  weekEnd.setDate(weekStart.getDate() + 6);

  return saleDate >= weekStart && saleDate <= weekEnd;
}

function filterSalesRecords(
  records: SaleRecord[],
  filters: SalesFiltersState,
  lifecycleByRecordId: Record<string, ReturnType<typeof getCustomerLifecycleSignals>>,
) {
  const query = normalizeTextKey(filters.search);

  return records.filter((record) => {
    const lifecycle = lifecycleByRecordId[record.id];
    const isCancelled = record.commercialStatus === 'cancelled' || record.commercialStatus === 'rejected';
    const isOpen = record.deliveryStatus !== 'delivered' && !isCancelled;
    const focusMatches = (() => {
      if (filters.focus === 'all') return true;
      if (filters.focus === 'open') return isOpen;
      if (filters.focus === 'pending_finance') return record.financeStatus === 'pending';
      if (filters.focus === 'pending_inventory') {
        return record.inventoryMovementStatus === 'pending'
          || record.inventoryMovementStatus === 'not_generated'
          || record.inventoryStatus === 'pending';
      }
      if (filters.focus === 'to_deliver') return !isCancelled && record.deliveryStatus !== 'delivered';
      if (filters.focus === 'delivered') return record.deliveryStatus === 'delivered';
      if (filters.focus === 'cancelled') return isCancelled;
      return ['at_risk', 'lost'].includes(lifecycle?.health ?? '');
    })();
    const searchable = normalizeTextKey([
      record.saleNumber,
      record.quoteReference,
      record.customerName,
      record.sellerName,
      record.paymentReference,
      record.businessUnitName,
      record.businessName,
      record.inventoryMovementReference,
      lifecycle?.relationship,
      lifecycle?.health,
      lifecycle?.postSaleStatus,
      record.notes,
    ].join(' '));

    return (!query || searchable.includes(query))
      && focusMatches
      && matchesFilter(record.businessUnitId ?? '', filters.businessUnit)
      && matchesFilter(record.businessId ?? '', filters.business)
      && isWithinSelectedPeriod(record.saleDate, filters.period)
      && matchesFilter(record.sellerName, filters.seller)
      && matchesFilter(record.customerName, filters.customer)
      && matchesFilter(record.commercialStatus, filters.commercialStatus)
      && matchesFilter(record.financeStatus, filters.financeStatus)
      && matchesFilter(record.inventoryStatus, filters.inventoryStatus)
      && matchesFilter(record.inventoryMovementStatus, filters.inventoryMovementStatus)
      && matchesFilter(record.commissionStatus, filters.commissionStatus)
      && matchesFilter(lifecycle?.relationship ?? '', filters.relationship)
      && matchesFilter(lifecycle?.health ?? '', filters.customerHealth)
      && matchesFilter(lifecycle?.postSaleStatus ?? '', filters.postSaleStatus);
  });
}

function uniqueOptions(values: string[]) {
  return values
    .filter(Boolean)
    .filter((value, index, items) => items.findIndex((item) => normalizeTextKey(item) === normalizeTextKey(value)) === index)
    .sort((left, right) => left.localeCompare(right));
}

function uniqueBusinessUnits(records: SaleRecord[]) {
  return records
    .filter((record) => record.businessUnitId && record.businessUnitName)
    .map((record) => ({ id: record.businessUnitId ?? '', name: record.businessUnitName ?? '' }))
    .filter((unit, index, items) => items.findIndex((item) => item.id === unit.id) === index)
    .sort((left, right) => left.name.localeCompare(right.name));
}

function uniqueBusinesses(records: SaleRecord[]) {
  return records
    .filter((record) => record.businessId && record.businessName)
    .map((record) => ({
      id: record.businessId ?? '',
      name: record.businessName ?? '',
      businessUnitId: record.businessUnitId ?? '',
    }))
    .filter((business, index, items) => items.findIndex((item) => item.id === business.id) === index)
    .sort((left, right) => left.name.localeCompare(right.name));
}

export function useSalesRecords(
  preferredCurrency = defaultSalesCurrency,
) {
  const [creationWarning, setCreationWarning] = useState<'paymentEvidenceUploadFailed' | null>(null);
  const {
    salesRecords: records,
    postSaleCases,
    addSaleRecord,
    updateSaleRecord: updateSharedSaleRecord,
  } = useSalesCrm();
  const [filters, setFilters] = useState<SalesFiltersState>(initialFilters);
  const [visibleColumns, setVisibleColumns] = useState<SalesColumnId[]>(defaultVisibleSalesColumns);

  const lifecycleByRecordId = useMemo(
    () => Object.fromEntries(records.map((record) => [
      record.id,
      getCustomerLifecycleSignals({
        sale: record,
        sales: records,
        postSaleRecords: postSaleCases,
      }),
    ])),
    [postSaleCases, records],
  );

  const filteredRecords = useMemo(
    () => filterSalesRecords(records, filters, lifecycleByRecordId),
    [filters, lifecycleByRecordId, records],
  );

  const metrics = useMemo(
    () => calculateSalesMetrics(filteredRecords, lifecycleByRecordId, preferredCurrency),
    [filteredRecords, lifecycleByRecordId, preferredCurrency],
  );
  const sellers = useMemo(() => uniqueOptions(records.map((record) => record.sellerName)), [records]);
  const customers = useMemo(() => uniqueOptions(records.map((record) => record.customerName)), [records]);
  const businessUnits = useMemo(() => uniqueBusinessUnits(records), [records]);
  const businesses = useMemo(() => uniqueBusinesses(records), [records]);
  const postSaleStatuses = useMemo(
    () => uniqueOptions(Object.values(lifecycleByRecordId).map((lifecycle) => lifecycle.postSaleStatus ?? '')),
    [lifecycleByRecordId],
  );

  const createSaleRecord = async (draft: SaleRecordDraft) => {
    setCreationWarning(null);
    const validation = validateSaleDraftForBackendReadiness(draft);
    if (!validation.valid) return null;

    const { paymentEvidenceFiles = [], ...persistableDraft } = draft;
    const nextIndex = records.length + 1;
    const id = `SAL-${String(nextIndex).padStart(3, '0')}`;
    const totalAmount = Number(draft.totalAmount) || 0;
    const commissionRate = Number(draft.commissionRate) || 0;
    const saleLines = draft.saleLines.map((line, index) => ({
      ...line,
      id: `SLN-${id}-${String(index + 1).padStart(2, '0')}`,
      inventoryMovementDraftId: line.inventoryMovementDraftId
        ? `MOV-DRAFT-${id}-${String(index + 1).padStart(2, '0')}`
        : undefined,
    }));
    const createdRecord: SaleRecord = {
      ...persistableDraft,
      id,
      saleNumber: draft.saleNumber || `SALE-2026-${String(nextIndex).padStart(3, '0')}`,
      saleDocumentReference: draft.saleDocumentReference || `SALE-SUM-2026-${String(nextIndex).padStart(3, '0')}`,
      totalAmount,
      subtotal: Number(draft.subtotal) || saleLines.reduce((sum, line) => sum + line.subtotal, 0),
      discountTotal: Number(draft.discountTotal) || 0,
      taxTotal: Number(draft.taxTotal) || 0,
      marginTotal: Number(draft.marginTotal) || saleLines.reduce((sum, line) => sum + line.marginAmount, 0),
      commissionRate,
      commissionAmount: draft.commissionAmount ?? 0,
      inventoryMovementReference: draft.inventoryMovementReference || saleLines[0]?.inventoryMovementDraftId || '',
      saleLines,
    };

    const persistedRecord = await addSaleRecord(createdRecord);
    if (!paymentEvidenceFiles.length || persistedRecord.backendId === undefined) {
      return persistedRecord;
    }

    let uploadedFilesCount = 0;
    try {
      for (const file of paymentEvidenceFiles) {
        const upload = await salesApi.createSalePaymentEvidenceUpload({
          fileName: file.name,
          contentType: file.type || 'application/octet-stream',
          sizeBytes: file.size,
        });
        const objectKey = upload.objectKey ?? upload.object_key;
        const uploadUrl = upload.uploadUrl ?? upload.upload_url;
        const uploadHeaders = upload.uploadHeaders ?? upload.upload_headers;
        if (!objectKey || !uploadUrl) {
          throw new Error('Payment evidence upload could not be prepared.');
        }

        await salesApi.uploadSalePaymentEvidenceFile(uploadUrl, file, uploadHeaders);
        await salesApi.registerSalePaymentEvidence(persistedRecord.backendId, {
          objectKey,
          fileName: file.name,
          contentType: file.type || upload.contentType,
          sizeBytes: file.size,
        });
        uploadedFilesCount += 1;
      }
    } catch {
      const warningRecord: SaleRecord = {
        ...persistedRecord,
        paymentEvidenceStatus: uploadedFilesCount ? 'under_review' : 'missing',
        financeStatus: 'pending',
        filesCount: (persistedRecord.filesCount ?? 0) + uploadedFilesCount,
      };
      updateSharedSaleRecord(persistedRecord.id, {
        paymentEvidenceStatus: warningRecord.paymentEvidenceStatus,
        financeStatus: warningRecord.financeStatus,
        filesCount: warningRecord.filesCount,
      });
      // The sale already exists. Return it so retrying the wizard cannot create
      // a duplicate sale when only the evidence upload failed.
      setCreationWarning('paymentEvidenceUploadFailed');
      return warningRecord;
    }

    const completedRecord: SaleRecord = {
      ...persistedRecord,
      paymentEvidenceStatus: 'under_review',
      financeStatus: 'pending',
      filesCount: (persistedRecord.filesCount ?? 0) + paymentEvidenceFiles.length,
    };
    updateSharedSaleRecord(persistedRecord.id, {
      paymentEvidenceStatus: completedRecord.paymentEvidenceStatus,
      financeStatus: completedRecord.financeStatus,
      filesCount: completedRecord.filesCount,
    });
    return completedRecord;
  };

  const updateSaleRecord = (saleId: string, patch: Partial<SaleRecord>) => {
    updateSharedSaleRecord(saleId, patch);
  };

  return {
    records,
    filteredRecords,
    metrics,
    filters,
    setFilters,
    visibleColumns,
    setVisibleColumns,
    lifecycleByRecordId,
    sellers,
    customers,
    businessUnits,
    businesses,
    postSaleStatuses,
    createSaleRecord,
    updateSaleRecord,
    creationWarning,
    clearCreationWarning: () => setCreationWarning(null),
  };
}
