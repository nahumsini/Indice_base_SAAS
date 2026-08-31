import {
  Check,
  HandCoins,
  ListChecks,
  PackageOpen,
  ShoppingCart,
  Store,
  Timer,
  Users,
  WalletCards,
  Wrench,
} from 'lucide-react';
import type { ComponentType } from 'react';
import type { BillingCatalogProduct } from '../../api/billing';
import { formatBillingMoney } from '../billingFormatters';
import type { BillingCopy } from '../translations';

type Props = {
  copy: BillingCopy;
  product: BillingCatalogProduct;
  selected: boolean;
  disabled: boolean;
  overlaps: boolean;
  languageCode: string;
  currency: string;
  billingInterval: 'MONTH' | 'YEAR';
  showPrice: boolean;
  onToggle: () => void;
};

export function BillingProductCard(props: Props) {
  const identity = resolveProductIdentity(props.product.capabilities);
  const Icon = identity.icon;
  const name = props.copy.moduleNames[identity.key] || props.product.display_name;
  const capabilities = props.product.capabilities
    .slice(0, 3)
    .map((capability) => props.copy.capabilityNames[capability] || humanize(capability));
  const period = props.billingInterval === 'YEAR' ? props.copy.perYear : props.copy.perMonth;

  return (
    <button
      type="button"
      disabled={props.disabled}
      aria-pressed={props.selected}
      title={props.overlaps ? props.copy.includedElsewhere : undefined}
      onClick={props.onToggle}
      className={`group relative min-h-32 overflow-hidden rounded-xl border p-3.5 text-left outline-none transition duration-200 focus-visible:ring-2 focus-visible:ring-[#2563EB]/40 ${props.selected
        ? 'border-[#59C3A5] bg-[#59C3A5]/[0.07] shadow-[0_8px_24px_rgba(23,125,102,0.08)] dark:border-[#59C3A5]/60 dark:bg-[#59C3A5]/10'
        : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-[#59C3A5]/60 hover:shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:hover:border-[#59C3A5]/40'} disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0`}
    >
      <span className={`absolute inset-y-0 left-0 w-1 transition-colors ${props.selected ? 'bg-[#59C3A5]' : 'bg-transparent'}`} />
      <div className="flex items-start justify-between gap-3">
        <span className={`grid h-10 w-10 place-items-center rounded-xl transition-colors ${props.selected
          ? 'bg-white text-[#177D66] ring-1 ring-[#59C3A5]/20 dark:bg-slate-900 dark:text-[#8FE0CA]'
          : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300'}`}
        >
          <Icon className="h-5 w-5" />
        </span>
        <span className={`grid h-6 w-6 place-items-center rounded-full border transition-colors ${props.selected
          ? 'border-[#177D66] bg-[#177D66] text-white'
          : 'border-slate-300 text-transparent dark:border-slate-600'}`}
        >
          <Check className="h-3.5 w-3.5" />
        </span>
      </div>

      <p className="mt-3 text-sm font-medium leading-5 text-slate-950 dark:text-white">{name}</p>
      <p className="mt-0.5 line-clamp-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
        {capabilities.join(' · ') || props.copy.moduleFallback}
      </p>

      {props.showPrice ? (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
          <span className={`font-medium ${props.product.unit_amount_cents == null ? 'text-amber-700 dark:text-amber-300' : 'text-[#143675] dark:text-blue-200'}`}>
            {props.product.unit_amount_cents == null
              ? props.copy.pricePending
              : `${formatBillingMoney(props.product.unit_amount_cents, props.currency, props.languageCode)} ${period}`}
          </span>
          {props.product.commercial_kind === 'PACKAGE' ? (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {props.copy.packagePrice}
            </span>
          ) : null}
        </div>
      ) : null}

      {props.overlaps ? (
        <p className="mt-2 text-[11px] font-medium text-amber-700 dark:text-amber-300">{props.copy.includedElsewhere}</p>
      ) : null}
    </button>
  );
}

type ProductIdentity = { key: string; icon: ComponentType<{ className?: string }> };

function resolveProductIdentity(capabilities: string[]): ProductIdentity {
  const values = new Set(capabilities);
  if (values.has('human_resources')) return { key: 'human_resources', icon: Users };
  if (values.has('expenses') && values.has('petty_cash')) return { key: 'expenses_petty_cash', icon: WalletCards };
  if (values.has('pos') && values.has('inventory')) return { key: 'pos_inventory', icon: Store };
  if (values.has('sales') && values.has('inventory')) return { key: 'sales_inventory', icon: ShoppingCart };
  if (values.has('receivables')) return { key: 'receivables', icon: HandCoins };
  if (values.has('processes')) return { key: 'processes', icon: ListChecks };
  if (values.has('maintenance')) return { key: 'maintenance', icon: Wrench };
  if (values.has('control_minutes')) return { key: 'control_minutes', icon: Timer };
  return { key: '', icon: PackageOpen };
}

function humanize(value: string) {
  return value.replace(/[_-]/g, ' ').replace(/^./, (letter) => letter.toUpperCase());
}
