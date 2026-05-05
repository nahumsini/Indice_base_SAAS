export interface Return {
  id: string;
  originalSaleId: string;
  items: ReturnItem[];
  subtotal: number;
  tax: number;
  total: number;
  type: 'full' | 'partial';
  refundMethod: 'cash' | 'card' | 'credit_note';
  creditNoteNumber?: string;
  timestamp: Date;
  cashierName: string;
}

export interface ReturnItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  total: number;
}
