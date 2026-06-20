export type DiscountScope = 'product' | 'category' | 'customer' | 'order' | 'manual';
export type DiscountType = 'percentage' | 'fixedAmount';
export type DiscountRuleStatus = 'active' | 'scheduled' | 'expired' | 'inactive';

export interface DiscountRule {
  id: string;
  name: string;
  description: string;
  scope: DiscountScope;
  discountType: DiscountType;
  value: number;
  startsAt: Date;
  endsAt: Date;
  minimumAmount?: number;
  maximumDiscountAmount?: number;
  customerType?: 'individual' | 'business';
  productId?: string;
  category?: string;
  requiresAuthorization: boolean;
  stackable?: boolean;
  priority?: number;
  status: DiscountRuleStatus;
}

export interface DiscountEligibilityContext {
  amount: number;
  productId?: string;
  category?: string;
  customerType?: 'individual' | 'business';
  scope?: DiscountScope;
  date?: Date;
}
