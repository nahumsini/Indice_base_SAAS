export interface Product {
  id: string;
  code: string;
  name: string;
  price: number;
  cost: number;
  stock: number;
  category: string;
  image?: string;
  barcode?: string;
}

export interface SaleItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  discount: number; // Percentage or fixed amount
  discountType: 'percentage' | 'fixed';
  subtotal: number;
  tax: number;
  total: number;
}

export interface Sale {
  id: string;
  items: SaleItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  customerId?: string;
  customerName?: string;
  paymentMethod?: 'cash' | 'card' | 'transfer';
  status: 'pending' | 'completed' | 'cancelled';
  createdAt: Date;
}

export type PaymentMethod = 'cash' | 'card' | 'transfer';

export interface Payment {
  id: string;
  method: PaymentMethod;
  amount: number;
  reference?: string;
}
