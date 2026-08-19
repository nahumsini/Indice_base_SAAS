export type DiscountScope = 'product' | 'category' | 'customer' | 'order' | 'manual';
export type DiscountType = 'percentage' | 'fixedAmount';
export type DiscountRuleStatus = 'active' | 'scheduled' | 'expired' | 'paused' | 'archived' | 'inactive';
export type DiscountChannel = 'pos' | 'sales' | 'kiosk' | 'publicCatalog';

export interface DiscountRule {
  id: string | number;
  unitId?: number;
  businessId?: number;
  warehouseId?: number;
  name: string;
  description: string;
  scope: DiscountScope;
  discountType: DiscountType;
  value: number;
  currencyCode?: string;
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
  enabledChannels: DiscountChannel[];
  version?: number;
  currentUserCanAuthorize?: boolean;
  evaluatedDiscountAmount?: number;
}

export interface DiscountEligibilityContext {
  amount: number;
  productId?: string;
  category?: string;
  customerType?: 'individual' | 'business';
  scope?: DiscountScope;
  date?: Date;
  channel?: DiscountChannel;
}
