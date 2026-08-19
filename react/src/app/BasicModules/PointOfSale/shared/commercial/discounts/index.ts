export { discountRules } from './data';
export {
  calculateDiscountPreview,
  calculateAutomaticDiscounts,
  getDiscountRuleAmount,
  getEligibleDiscountRules,
  isDiscountActive,
} from './utils';
export type {
  DiscountEligibilityContext,
  DiscountChannel,
  DiscountRule,
  DiscountRuleStatus,
  DiscountScope,
  DiscountType,
} from './types';
