import type {
  CommercialStatus,
  CommissionStatus,
  DeliveryStatus,
  FinanceStatus,
  InventoryMovementStatus,
  InventoryStatus,
  PaymentEvidenceStatus,
  SalesColumnConfig,
} from '../types/salesTypes';

export const commercialStatuses: CommercialStatus[] = ['pending_validation', 'approved', 'rejected', 'cancelled'];
export const financeStatuses: FinanceStatus[] = ['pending', 'approved', 'rejected'];
export const inventoryStatuses: InventoryStatus[] = ['pending', 'reserved', 'approved', 'unavailable'];
export const deliveryStatuses: DeliveryStatus[] = ['pending', 'in_progress', 'delivered'];
export const commissionStatuses: CommissionStatus[] = ['pending', 'calculated', 'cut', 'paid'];
export const inventoryMovementStatuses: InventoryMovementStatus[] = ['not_generated', 'pending', 'approved', 'completed'];
export const paymentEvidenceStatuses: PaymentEvidenceStatus[] = ['missing', 'uploaded', 'under_review', 'approved', 'rejected'];

export const salesColumnConfigs: SalesColumnConfig[] = [
  { id: 'saleNumber', defaultVisible: true, locked: true },
  { id: 'customer', defaultVisible: true, locked: true },
  { id: 'seller', defaultVisible: true },
  { id: 'total', defaultVisible: true },
  { id: 'saleDate', defaultVisible: false },
  { id: 'relationship', defaultVisible: false },
  { id: 'customerHealth', defaultVisible: false },
  { id: 'postSaleStatus', defaultVisible: false },
  { id: 'commercialStatus', defaultVisible: false },
  { id: 'financeStatus', defaultVisible: true },
  { id: 'inventoryStatus', defaultVisible: false },
  { id: 'inventoryMovement', defaultVisible: false },
  { id: 'commission', defaultVisible: false },
  { id: 'commissionStatus', defaultVisible: false },
  { id: 'quoteReference', defaultVisible: false },
  { id: 'paymentMethod', defaultVisible: false },
  { id: 'paymentEvidence', defaultVisible: false },
  { id: 'deliveryStatus', defaultVisible: true },
  { id: 'commissionAmount', defaultVisible: false },
  { id: 'movementReference', defaultVisible: false },
  { id: 'nextAction', defaultVisible: true },
  { id: 'actions', defaultVisible: true, locked: true },
];

export const defaultVisibleSalesColumns = salesColumnConfigs
  .filter((column) => column.defaultVisible)
  .map((column) => column.id);

export const commercialStatusClasses: Record<CommercialStatus, string> = {
  completed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  pending_validation: 'border-[#F4C84A]/45 bg-[#F4C84A]/15 text-[#9a6b05]',
  approved: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  rejected: 'border-[#FF6B5E]/30 bg-[#FF6B5E]/10 text-[#B63B32]',
  cancelled: 'border-slate-300 bg-slate-100 text-slate-500',
};

export const validationStatusClasses = {
  returned: 'border-slate-300 bg-slate-100 text-slate-600',
  captured: 'border-blue-200 bg-blue-50 text-blue-700',
  pending: 'border-[#F4C84A]/45 bg-[#F4C84A]/15 text-[#9a6b05]',
  approved: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  rejected: 'border-[#FF6B5E]/30 bg-[#FF6B5E]/10 text-[#B63B32]',
  reserved: 'border-[#2563EB]/25 bg-[#2563EB]/10 text-[#1D4ED8]',
  unavailable: 'border-[#FF6B5E]/30 bg-[#FF6B5E]/10 text-[#B63B32]',
  in_progress: 'border-[#2563EB]/25 bg-[#2563EB]/10 text-[#1D4ED8]',
  delivered: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  calculated: 'border-[#59C3A5]/30 bg-[#59C3A5]/10 text-[#177d66]',
  cut: 'border-blue-200 bg-blue-50 text-blue-700',
  paid: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  missing: 'border-slate-300 bg-slate-100 text-slate-500',
  uploaded: 'border-[#2563EB]/25 bg-[#2563EB]/10 text-[#1D4ED8]',
  under_review: 'border-[#F4C84A]/45 bg-[#F4C84A]/15 text-[#9a6b05]',
} as const;
