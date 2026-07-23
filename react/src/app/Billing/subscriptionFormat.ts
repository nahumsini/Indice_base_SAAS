import { SIGNUP_MODULE_OPTIONS } from '../Auth/signupModules';
import type { BillingSubscriptionResponse } from '../api/billing';

const moduleLabelBySlug = new Map<string, string>(SIGNUP_MODULE_OPTIONS.map((module) => [module.slug, module.label]));

export function selectedModuleLabels(subscription: BillingSubscriptionResponse | null) {
  return subscription?.selected_module_slugs?.map((slug) => moduleLabelBySlug.get(slug) ?? slug) ?? [];
}

export function planLabel(planId: string) {
  return planId.split('-').map((part) => part[0]?.toUpperCase() + part.slice(1)).join(' ');
}

export function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format((cents || 0) / 100);
}

export function formatDate(value: string) {
  return value ? new Date(value).toLocaleDateString() : 'Not set';
}
