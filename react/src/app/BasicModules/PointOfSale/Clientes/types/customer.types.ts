export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  rfc?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  customerType: 'individual' | 'business';
  status: 'active' | 'inactive';
  totalPurchases: number;
  lastPurchaseDate?: Date;
  creditLimit?: number;
  currentBalance: number;
  loyaltyPoints: number;
  createdAt: Date;
  notes?: string;
}

export type CustomerStatus = 'active' | 'inactive';
export type CustomerType = 'individual' | 'business';
