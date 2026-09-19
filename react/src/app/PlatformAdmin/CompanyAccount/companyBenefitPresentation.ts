import type { PlatformBenefit, PlatformCatalogProduct, PlatformCompanyDetail } from '../../api/platformAdmin';
import { catalogProductLabel } from '../CatalogWorkspace/catalogLabels';
import { getCustomerAccountCopy } from '../Customers/customerAccountTranslations';
import { getCatalogCopy, type CatalogCopy } from "../CatalogWorkspace/translations";
import { humanize } from './companyAccountUtils';

export function benefitLabel(benefit: PlatformBenefit, company: PlatformCompanyDetail, products: PlatformCatalogProduct[], locale: string) {
  const { t } = getCustomerAccountCopy(locale);
  if (benefit.benefit_type === 'SEAT') return t('accessExtraSeats', { count: benefit.quantity });
  if (benefit.benefit_type === 'STORAGE') return t('accessStorageBlocks', { count: benefit.quantity });
  const current = company.products.find(product => product.code === benefit.product_code);
  const catalog = products.find(product => product.product_code === benefit.product_code);
  const legacyKeys: Record<string, keyof CatalogCopy> = {
    basic_hr: 'humanResources', basic_processes: 'processTasks', basic_process_tasks: 'processTasks',
    basic_expenses: 'expensesPettyCash', basic_sales_inventory: 'salesInventory',
    basic_pos_inventory: 'posInventory', basic_receivables: 'receivablesModule',
  };
  const legacyKey = legacyKeys[benefit.product_code ?? ''];
  return current ? catalogProductLabel({ product_code: current.code, display_name: current.name }, locale)
    : catalog ? catalogProductLabel(catalog, locale) : legacyKey ? getCatalogCopy(locale)[legacyKey] : humanize(benefit.product_code, locale);
}

export type BenefitRevocationImpact = { label: string; description: string };

// Mirrors the existing revocation scope: all stored ACTIVE grants for a product,
// including future/expired dates; exactly one grant for SEAT or STORAGE.
export function benefitRevocationImpact(company: PlatformCompanyDetail, reference: string, products: PlatformCatalogProduct[], locale: string): BenefitRevocationImpact | undefined {
  const benefit = company.benefits.find(item => item.reference === reference);
  if (!benefit) return undefined;
  const { t } = getCustomerAccountCopy(locale);
  const label = benefitLabel(benefit, company, products, locale);
  if (benefit.benefit_type === 'PRODUCT') {
    const count = company.benefits.filter(item => item.benefit_type === 'PRODUCT' && item.product_code === benefit.product_code && item.status.toUpperCase() === 'ACTIVE').length;
    return { label, description: t('accessRevokeProductEffect', { count }) };
  }
  return { label, description: t(benefit.benefit_type === 'SEAT' ? 'accessRevokeSeatsEffect' : 'accessRevokeStorageEffect', { count: benefit.quantity }) };
}
