export interface Transaction {
  id: string;
  customerId: string;
  date: Date;
  type: 'sale' | 'payment' | 'credit_note' | 'debit_note';
  description: string;
  amount: number;
  balance: number;
  reference?: string;
  invoice?: string;
}

export type TransactionType = 'sale' | 'payment' | 'credit_note' | 'debit_note';
