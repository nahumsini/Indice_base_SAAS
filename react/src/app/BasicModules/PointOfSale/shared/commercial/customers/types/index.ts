export interface CommercialCustomer {
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

export type Customer = CommercialCustomer;
export type CustomerStatus = CommercialCustomer['status'];
export type CustomerType = CommercialCustomer['customerType'];
