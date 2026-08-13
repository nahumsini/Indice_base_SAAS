import type {
  BillingSelectionResponse,
  BillingSubscriptionResponse,
  BillingInvoiceRecord,
} from '../api/billing';

export type BillingDraft = {
  productCodes: string[];
  extraSeats: number;
  billingInterval: 'MONTH' | 'YEAR';
};

export type BillingManagementState = {
  subscription: BillingSubscriptionResponse | null;
  selection: BillingSelectionResponse | null;
  preview: BillingSelectionResponse | null;
  invoices: BillingInvoiceRecord[];
  draft: BillingDraft;
  loading: boolean;
  action: string;
  error: string;
  success: string;
};
