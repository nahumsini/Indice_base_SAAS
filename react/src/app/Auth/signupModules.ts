export const SIGNUP_MODULE_OPTIONS = [
  { slug: 'human_resources', label: 'Human Resources' },
  { slug: 'expenses', label: 'Expenses' },
  { slug: 'petty_cash', label: 'Petty Cash' },
  { slug: 'pos', label: 'Point of Sale' },
  { slug: 'crm', label: 'Sales' },
  { slug: 'processes', label: 'Processes & Tasks' },
  { slug: 'kpis', label: 'KPIs' },
] as const;

export type SignupModuleSlug = (typeof SIGNUP_MODULE_OPTIONS)[number]['slug'];

export const SIGNUP_ALL_MODULE_SLUGS = SIGNUP_MODULE_OPTIONS.map((module) => module.slug);

export function normalizeSignupModuleSlugs(values?: readonly string[]) {
  const allowed = new Set<string>(SIGNUP_ALL_MODULE_SLUGS);
  const selected: SignupModuleSlug[] = [];
  for (const value of values ?? []) {
    const normalized = value === 'sales' ? 'crm' : value;
    if (allowed.has(normalized) && !selected.includes(normalized as SignupModuleSlug)) {
      selected.push(normalized as SignupModuleSlug);
    }
  }
  return selected;
}
