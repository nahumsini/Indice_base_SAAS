export type PaymentAccountType = 'bank' | 'cash' | 'credit_card' | 'debit_card' | 'digital_wallet';

export type PaymentAccount = {
  id: string;
  unitId?: string;
  businessId?: string;
  name: string;
  type: PaymentAccountType;
  accountNumber?: string;
  bank?: string;
  currency: string;
  balance: number;
  isActive: boolean;
  lastTransaction?: string;
  source?: 'expenses' | 'petty_cash';
  linkedFundId?: string;
  custodian?: string;
  pendingReceipts?: number;
};

export type PaymentSortField = keyof PaymentAccount;
export type SortDirection = 'asc' | 'desc' | null;
