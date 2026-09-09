export type ExpenseBulkStatusChange = {
  target: 'PAID' | 'PENDING' | 'OVERDUE'; effectiveDate: string; paymentAccountId?: string; requestKey: string;
};
