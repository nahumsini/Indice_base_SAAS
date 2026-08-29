import { Boxes, Check, PackageOpen } from 'lucide-react';
import type { BillingCatalogProduct } from '../../api/billing';
import type { BillingCopy } from '../translations';

type Props = {
  copy: BillingCopy;
  products: BillingCatalogProduct[];
  selectedCodes: string[];
  disabled: boolean;
  onToggle: (code: string) => void;
};

export function ModuleSelectionPanel({ copy, products, selectedCodes, disabled, onToggle }: Props) {
  const versionedOffer = products.some((product) => product.commercial_kind === 'PACKAGE');
  const groups = versionedOffer
    ? [
        { type: 'MODULE', title: copy.baseModules, description: copy.baseModulesDescription },
        { type: 'PACKAGE', title: copy.complementaryModules, description: copy.complementaryModulesDescription },
      ]
    : [
        { type: 'BASIC', title: copy.baseModules, description: copy.baseModulesDescription },
        { type: 'ADDON', title: copy.complementaryModules, description: copy.complementaryModulesDescription },
      ];
  const selectedBasicCount = products.filter(
    (product) => product.product_type === 'BASIC' && selectedCodes.includes(product.product_code),
  ).length;
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <header className="flex flex-col gap-2 border-b border-slate-200 p-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#59C3A5]/10 text-[#177D66] dark:bg-[#59C3A5]/15 dark:text-[#8FE0CA]"><Boxes className="h-5 w-5" /></span>
            <h2 className="text-lg font-medium text-slate-950 dark:text-white">{copy.catalog}</h2>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{copy.catalogDescription}</p>
        </div>
        <span className="w-fit rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {copy.selected(selectedCodes.length)}
        </span>
      </header>
      {products.length ? (
        <div className="space-y-5 p-4">
          {groups.map((group) => {
            const groupedProducts = products.filter((product) =>
              versionedOffer
                ? (product.commercial_kind || 'MODULE') === group.type
                : product.product_type === group.type,
            );
            if (!groupedProducts.length) return null;
            return (
              <div key={group.type}>
                <div className="mb-2 flex flex-col gap-0.5 sm:flex-row sm:items-end sm:justify-between">
                  <h3 className="text-sm font-medium text-slate-900 dark:text-white">{group.title}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{group.description}</p>
                </div>
                <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
          {groupedProducts.map((product) => {
            const selected = selectedCodes.includes(product.product_code);
            const lastBase = product.product_type === 'BASIC' && selected && selectedBasicCount === 1;
            const selectedCapabilities = products
              .filter((candidate) => candidate.product_code !== product.product_code && selectedCodes.includes(candidate.product_code))
              .flatMap((candidate) => candidate.capabilities);
            const overlaps = versionedOffer && !selected && product.capabilities.some((capability) => selectedCapabilities.includes(capability));
            return (
              <button
                key={product.id}
                type="button"
                disabled={disabled || lastBase || overlaps}
                aria-pressed={selected}
                onClick={() => onToggle(product.product_code)}
                className={`group min-h-24 rounded-xl border p-3 text-left outline-none transition focus-visible:ring-2 focus-visible:ring-[#2563EB]/40 ${selected ? 'border-[#59C3A5] bg-[#59C3A5]/7 dark:border-[#59C3A5]/60 dark:bg-[#59C3A5]/10' : 'border-slate-200 bg-white hover:border-[#59C3A5]/50 hover:bg-[#59C3A5]/5 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-[#59C3A5]/40'} disabled:cursor-not-allowed disabled:opacity-60`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className={`grid h-9 w-9 place-items-center rounded-xl ${selected ? 'bg-white text-[#177D66] ring-1 ring-[#59C3A5]/20 dark:bg-slate-900' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                    <PackageOpen className="h-4.5 w-4.5" />
                  </span>
                  <span className={`grid h-6 w-6 place-items-center rounded-full border ${selected ? 'border-[#177D66] bg-[#177D66] text-white' : 'border-slate-300 text-transparent dark:border-slate-600'}`}>
                    <Check className="h-3.5 w-3.5" />
                  </span>
                </div>
                <p className="mt-2 text-sm font-medium text-slate-950 dark:text-white">{product.display_name}</p>
                <p className="mt-0.5 line-clamp-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  {product.capabilities.slice(0, 3).map(humanize).join(' · ') || copy.moduleFallback}
                </p>
                {versionedOffer || product.product_type === 'ADDON' ? (
                  <p className="mt-1 text-xs font-medium text-[#143675] dark:text-blue-200">
                    {formatPrice(product.unit_amount_cents)}{product.commercial_kind === 'PACKAGE' ? ' · precio de paquete' : ''}
                  </p>
                ) : null}
                {overlaps ? <p className="mt-1 text-[11px] text-amber-700">Ya está incluido en otra selección.</p> : null}
              </button>
            );
          })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-8 text-center text-sm font-medium text-amber-700 dark:text-amber-300">{copy.noCatalog}</div>
      )}
    </section>
  );
}

function formatPrice(cents: number | null) {
  if (cents == null) return '—';
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(cents / 100);
}

function humanize(value: string) {
  return value.replace(/[_-]/g, ' ').replace(/^./, (letter) => letter.toUpperCase());
}
