import type { PeriodFilter } from '../types';

export const receivablesAccent = '#147514';

export const financeAccentButtonClass =
  'bg-[#147514] text-white shadow-sm shadow-[#147514]/20 hover:bg-[#0F5F10]';

export const financeSoftSurfaceClass =
  'border-[#147514]/20 bg-[#147514]/10 dark:border-emerald-400/20 dark:bg-emerald-400/10';

export const financeTextClass = 'text-[#147514] dark:text-emerald-300';

export const moduleModalOutlineButtonClassName =
  'h-10 rounded-xl border-white/30 bg-white/10 px-5 text-sm font-medium text-white shadow-none hover:bg-white/20 hover:text-white disabled:border-white/20 disabled:bg-white/5 disabled:text-white/50 dark:border-white/25 dark:bg-white/10 dark:text-white dark:hover:bg-white/20';

export const moduleModalPrimaryButtonClassName =
  'h-10 rounded-xl bg-white px-5 text-sm font-medium text-[#147514] shadow-sm hover:bg-slate-100 hover:text-[#147514] focus-visible:ring-white/40 dark:bg-white dark:text-[#147514] dark:hover:bg-slate-100';

export const receivablesTabIds = [
  'credit-sales',
  'accounts-receivable',
  'payments',
  'credit-customers',
] as const;

export type ReceivablesTabId = (typeof receivablesTabIds)[number];

export const legacyReceivablesTabAliases: Partial<Record<string, ReceivablesTabId>> = {
  abonos: 'payments',
  cartera: 'accounts-receivable',
  clientes: 'credit-customers',
  clientesCredito: 'credit-customers',
  clientes_credito: 'credit-customers',
  'clientes-credito': 'credit-customers',
  cobros: 'payments',
  cuentas: 'accounts-receivable',
  cuentasCobrar: 'accounts-receivable',
  cuentas_cobrar: 'accounts-receivable',
  'cuentas-cobrar': 'accounts-receivable',
  pagos: 'payments',
  ventas: 'credit-sales',
  ventasCredito: 'credit-sales',
  ventas_credito: 'credit-sales',
  'ventas-credito': 'credit-sales',
};

export type ReceivablesTab = {
  id: ReceivablesTabId;
  emoji: string;
};

export const receivablesTabs: ReceivablesTab[] = [
  { id: 'credit-sales', emoji: '💳' },
  { id: 'accounts-receivable', emoji: '🧾' },
  { id: 'payments', emoji: '💸' },
  { id: 'credit-customers', emoji: '👥' },
];

export type FilterState = {
  search: string;
  period: PeriodFilter;
  status: string;
  unit: string;
  business: string;
};

export const initialFilters: FilterState = {
  search: '',
  period: 'all',
  status: 'all',
  unit: 'all',
  business: 'all',
};

export const periodFilterValues: PeriodFilter[] = [
  'all',
  'today',
  'this_week',
  'this_month',
  'last_month',
];
