import type {
  BillingSelectionResponse,
  BillingPaymentMethodResponse,
  BillingSubscriptionResponse,
  BillingInvoiceRecord,
} from '../api/billing';
import type { ManagedCompanyContext } from '../api/managedCompanies';

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
  managedContext: ManagedCompanyContext | null;
  draft: BillingDraft;
  loading: boolean;
  action: string;
  error: string;
  success: string;
};

export type BillingPaymentMethodState = {
  loading: boolean;
  ownerOnly: boolean;
  summary: BillingPaymentMethodResponse | null;
};
