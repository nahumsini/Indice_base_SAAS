import type { CSSProperties } from 'react';
import {
  Boxes,
  ChartNoAxesCombined,
  Check,
  HandCoins,
  Layers3,
  ShoppingCart,
  UsersRound,
  WalletCards,
  Workflow,
  type LucideIcon,
} from 'lucide-react';
import type { BillingSignupProduct } from '../../api/billingSignup';

type PublicPlansProductCardProps = {
  product: BillingSignupProduct;
  label: string;
  description: string;
  selected: boolean;
  accent: string;
  accentText: string;
  detail: string;
  kind: string;
  addLabel: string;
  removeLabel: string;
  selectedLabel: string;
  onToggle: () => void;
};

const productIcons: Record<string, LucideIcon> = {
  basic_hr: UsersRound,
  module_hr: UsersRound,
  basic_process_tasks: Workflow,
  module_process_tasks: Workflow,
  basic_expenses: WalletCards,
  module_expenses: WalletCards,
  basic_pos_inventory: ShoppingCart,
  module_pos_inventory: ShoppingCart,
  basic_sales_inventory: ChartNoAxesCombined,
  module_sales_inventory: ChartNoAxesCombined,
  basic_receivables: HandCoins,
  module_receivables: HandCoins,
};

export function PublicPlansProductCard({
  product,
  label,
  description,
  selected,
  accent,
  accentText,
  detail,
  kind,
  addLabel,
  removeLabel,
  selectedLabel,
  onToggle,
}: PublicPlansProductCardProps) {
  const ProductIcon = product.commercialKind === 'PACKAGE'
    ? Boxes
    : productIcons[product.code] ?? Layers3;
  const style = {
    '--module-accent': accent,
    '--module-accent-text': accentText,
    '--module-soft': `${accent}12`,
  } as CSSProperties;

  return (
    <button
      type="button"
      aria-label={`${selected ? removeLabel : addLabel}: ${label}`}
      aria-pressed={selected}
      onClick={onToggle}
      style={style}
      className={`group relative flex min-h-56 flex-col overflow-hidden rounded-3xl border p-5 text-left transition-[transform,border-color,box-shadow,background-color] duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--indice-brand-border)] motion-safe:hover:-translate-y-1 motion-reduce:transition-none ${selected
        ? 'border-[var(--module-accent)] bg-[var(--module-soft)] shadow-[0_18px_44px_rgba(15,23,42,0.10)]'
        : 'border-slate-200 bg-white hover:border-[var(--module-accent)] hover:shadow-lg'}`}
    >
      <span className="absolute inset-x-0 top-0 h-1.5 bg-[var(--module-accent)]" />
      <span className="flex items-start justify-between gap-4">
        <span
          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--module-soft)] text-[var(--module-accent-text)]"
          aria-hidden="true"
        >
          <ProductIcon className="h-5 w-5" />
        </span>
        <span
          className={`inline-flex min-h-8 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition ${selected
            ? 'border-slate-900 bg-slate-900 text-white'
            : 'border-slate-200 bg-white text-slate-500 group-hover:border-[var(--module-accent)] group-hover:text-slate-700'}`}
        >
          {selected && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
          {selected ? selectedLabel : addLabel}
        </span>
      </span>

      <span className="mt-5 block text-xs font-medium text-slate-500">{kind}</span>
      <span className="mt-1.5 block text-lg font-semibold leading-snug text-slate-900">{label}</span>
      <span className="mt-2 block flex-1 text-sm font-normal leading-6 text-slate-600">{description}</span>

      <span className="mt-5 flex items-center justify-between gap-3 border-t border-slate-200/80 pt-4 text-sm">
        <span className="font-medium text-slate-700">{detail}</span>
        <span className="font-medium text-[var(--module-accent-text)]">{selected ? removeLabel : addLabel}</span>
      </span>
    </button>
  );
}
