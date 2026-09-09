import type { PlatformCatalogProduct, PlatformCompanyDetail } from '../../api/platformAdmin';
import { getCustomerAccountCopy, type CustomerAccountMessage } from '../Customers/customerAccountTranslations';

const codeLabels: Record<string, CustomerAccountMessage> = {
  ACTIVE: 'active', INACTIVE: 'inactive', CANCELED: 'canceled', CANCELLED: 'canceled', EXPIRED: 'expired',
  PAST_DUE: 'pendingPayment', REVOKED: 'revoked', SCHEDULED: 'scheduled', TRIALING: 'trial', TRIAL: 'trial',
  SUCCESS: 'paid', SUCCEEDED: 'paid', PAID: 'paid', UNPAID: 'unpaid', FAILED: 'failed', OPEN: 'open', PENDING: 'pending', PROCESSING: 'processing',
  COURTESY: 'courtesy', SUPPORT: 'support', PROMOTION: 'promotion', SUBSCRIPTION: 'subscription',
  TEST: 'trial', DEMO: 'demo', ROOT: 'root', SUPER_ADMIN: 'superAdmin', SUPERADMIN: 'superAdmin',
  ADMIN: 'administrator', OWNER: 'owner', USER: 'user', EMPLOYEE: 'employee', DISTRIBUTOR: 'distributor',
  MONTH: 'monthly', YEAR: 'annual', PRODUCT: 'module', SEAT: 'extraUsers', STORAGE: 'storage',
  BASIC_1: 'oneModule', BASIC_2: 'twoModules', BASIC_3: 'threeModules', BASIC_ALL: 'fourModules',
};
export function humanize(value?: string | null, locale?: string) {
  if (!value) return '—';
  const key = codeLabels[value.toUpperCase()];
  // Unknown names remain intact; never infer or translate user-authored product names.
  return key ? getCustomerAccountCopy(locale).t(key) : value;
}
export function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('');
}
export function formatDate(value?: string | null, locale?: string) {
  const copy = getCustomerAccountCopy(locale);
  if (!value) return copy.t('noDate');
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(copy.locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}
export function formatMoney(cents?: number | null, currency?: string | null, locale?: string) {
  if (cents == null) return '—';
  return new Intl.NumberFormat(getCustomerAccountCopy(locale).locale, { style: 'currency', currency: currency || 'USD' }).format(cents / 100);
}
export function displayProductName(product: PlatformCatalogProduct, locale?: string) {
  return product.display_name || humanize(product.product_code, locale);
}
export function commercialOrigin(company: PlatformCompanyDetail, locale?: string) {
  const { t } = getCustomerAccountCopy(locale);
  if (company.user_type === 'DISTRIBUTOR') return {
    value: t('distributorAccount'), hint: company.created_by_user_name ? t('createdBy', { name: company.created_by_user_name }) : t('indiceNetwork'),
  };
  if (company.distributor_company_name || company.creation_origin === 'DISTRIBUTOR_PORTAL') return {
    value: company.distributor_company_name || company.created_by_distributor_company_name || t('assignedDistributor'),
    hint: company.created_by_user_name ? t('createdBy', { name: company.created_by_user_name }) : t('distributorOrigin'),
  };
  if (company.creation_origin === 'WEB_SELF_SERVICE') return { value: t('webSignup'), hint: t('directSignup') };
  if (company.creation_origin === 'PLATFORM_ADMIN') return { value: t('directWithIndice'), hint: t('adminSignup') };
  return { value: t('historicalOrigin'), hint: t('noSignupHistory') };
}
