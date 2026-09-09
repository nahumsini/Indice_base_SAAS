import type { PlatformCatalogValidation } from '../../api/platformAdmin';
import { getCatalogCopy, type CatalogCopy } from './translations';

type CatalogValidationBlocker = PlatformCatalogValidation['blockers'][number];

/** Backend validation codes are stable; backend/provider prose is not a localized UI contract. */
export const catalogValidationMessageKeys = {
  MISSING_BILLING_RATES: 'validationMissingRates',
  EMPTY_OFFER: 'validationEmptyOffer',
  MISSING_EXTRA_USER: 'validationMissingExtraUser',
  DUPLICATE_COMMERCIAL_NAME: 'validationDuplicateName',
  STRIPE_PRODUCT_NOT_VERIFIED: 'validationProductUnverified',
  MODULE_NOT_AVAILABLE: 'validationModuleUnavailable',
  PACKAGE_NEEDS_MODULES: 'validationPackageModules',
  PROMOTION_NOT_READY: 'validationPromotionNotReady',
  STRIPE_DISABLED: 'validationStripeDisabled',
  STRIPE_UNAVAILABLE: 'validationStripeUnavailable',
  STRIPE_PRODUCT_MISMATCH: 'validationStripeProductMismatch',
  STRIPE_PRICE_MISMATCH: 'validationStripePriceMismatch',
} as const satisfies Record<string, keyof CatalogCopy>;

export function catalogValidationMessage(blocker: CatalogValidationBlocker, locale: string): string {
  const copy = getCatalogCopy(locale);
  const key = Object.prototype.hasOwnProperty.call(catalogValidationMessageKeys, blocker.code)
    ? catalogValidationMessageKeys[blocker.code as keyof typeof catalogValidationMessageKeys]
    : 'validationReviewRequired';
  const message = copy[key];
  return blocker.product_code ? `${blocker.product_code}: ${message}` : message;
}
