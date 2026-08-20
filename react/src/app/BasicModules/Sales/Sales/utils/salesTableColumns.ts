import type { SaleLifecycleSignals, SaleReceivableSummary, SaleRecord, SalesColumnId } from '../types/salesTypes';
import { getSaleNextActionKey, getSaleNextActionPriority } from './salesOperationalSignals';

export type SortableSalesColumnId = Exclude<SalesColumnId, 'actions'>;
export type SalesSortState = {
  columnId: SortableSalesColumnId;
  direction: 'asc' | 'desc';
} | null;

export const defaultSalesColumnWidths: Record<SalesColumnId, number> = {
  saleNumber: 195,
  customer: 210,
  seller: 155,
  total: 160,
  saleDate: 165,
  relationship: 180,
  customerHealth: 190,
  postSaleStatus: 210,
  commercialStatus: 190,
  financeStatus: 230,
  inventoryStatus: 175,
  inventoryMovement: 210,
  commission: 180,
  commissionStatus: 180,
  quoteReference: 170,
  paymentMethod: 190,
  paymentEvidence: 190,
  deliveryStatus: 215,
  nextAction: 190,
  commissionAmount: 180,
  movementReference: 210,
  actions: 198,
};

export const minimumSalesColumnWidths: Record<SalesColumnId, number> = {
  saleNumber: 150,
  customer: 150,
  seller: 120,
  total: 120,
  saleDate: 130,
  relationship: 140,
  customerHealth: 160,
  postSaleStatus: 170,
  commercialStatus: 160,
  financeStatus: 180,
  inventoryStatus: 150,
  inventoryMovement: 170,
  commission: 140,
  commissionStatus: 160,
  quoteReference: 140,
  paymentMethod: 150,
  paymentEvidence: 160,
  deliveryStatus: 170,
  nextAction: 160,
  commissionAmount: 160,
  movementReference: 170,
  actions: 198,
};

export const salesActionsColumnWidth = 198;
export const salesColumnWidthsStorageKey = 'sales-records-column-widths-v2';

export const sortableSalesColumns = new Set<SalesColumnId>([
  'saleNumber',
  'customer',
  'seller',
  'total',
  'saleDate',
  'relationship',
  'customerHealth',
  'postSaleStatus',
  'commercialStatus',
  'financeStatus',
  'inventoryStatus',
  'inventoryMovement',
  'commission',
  'commissionStatus',
  'quoteReference',
  'paymentMethod',
  'paymentEvidence',
  'deliveryStatus',
  'nextAction',
  'commissionAmount',
  'movementReference',
]);

const salesSortCollator = new Intl.Collator('es-MX', { numeric: true, sensitivity: 'base' });

function getSalesSortValue(
  record: SaleRecord,
  lifecycle: SaleLifecycleSignals | undefined,
  receivable: SaleReceivableSummary | undefined,
  columnId: SortableSalesColumnId,
) {
  switch (columnId) {
    case 'saleNumber':
      return record.saleNumber;
    case 'customer':
      return record.customerName;
    case 'seller':
      return record.sellerName;
    case 'total':
      return record.totalAmount;
    case 'saleDate':
      return record.saleDate;
    case 'relationship':
      return lifecycle?.relationship ?? '';
    case 'customerHealth':
      return lifecycle?.health ?? '';
    case 'postSaleStatus':
      return lifecycle?.postSaleStatus ?? '';
    case 'commercialStatus':
      return record.commercialStatus;
    case 'financeStatus':
      return record.financeStatus;
    case 'inventoryStatus':
      return record.inventoryStatus;
    case 'inventoryMovement':
      return record.inventoryMovementStatus;
    case 'commission':
    case 'commissionAmount':
      return record.commissionAmount;
    case 'commissionStatus':
      return record.commissionStatus;
    case 'quoteReference':
      return record.quoteReference;
    case 'paymentMethod':
      return record.paymentMethod;
    case 'paymentEvidence':
      return record.paymentEvidenceStatus;
    case 'deliveryStatus':
      return record.deliveryStatus;
    case 'nextAction':
      return getSaleNextActionPriority(getSaleNextActionKey(record, receivable));
    case 'movementReference':
      return record.inventoryMovementReference;
    default:
      return '';
  }
}

function compareSalesValues(left: string | number, right: string | number) {
  if (typeof left === 'number' && typeof right === 'number') {
    return left - right;
  }

  return salesSortCollator.compare(String(left), String(right));
}

export function sortSalesRecords(
  records: SaleRecord[],
  lifecycleByRecordId: Record<string, SaleLifecycleSignals>,
  receivablesByRecordId: Record<string, SaleReceivableSummary | undefined>,
  sortState: SalesSortState,
) {
  if (!sortState) {
    return records;
  }

  const directionFactor = sortState.direction === 'asc' ? 1 : -1;

  return [...records].sort((left, right) => {
    const leftValue = getSalesSortValue(left, lifecycleByRecordId[left.id], receivablesByRecordId[left.id], sortState.columnId);
    const rightValue = getSalesSortValue(right, lifecycleByRecordId[right.id], receivablesByRecordId[right.id], sortState.columnId);
    const result = compareSalesValues(leftValue, rightValue);
    if (result !== 0) return result * directionFactor;
    return salesSortCollator.compare(left.saleNumber, right.saleNumber);
  });
}
