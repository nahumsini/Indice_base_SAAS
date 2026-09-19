import { Boxes } from 'lucide-react';
import type { BillingCatalogProduct } from '../../api/billing';
import type { BillingCopy } from '../translations';
import { BillingProductCard } from './BillingProductCard';

type Props = {
  copy: BillingCopy;
  products: BillingCatalogProduct[];
  selectedCodes: string[];
  disabled: boolean;
  languageCode: string;
  currency: string;
  billingInterval: 'MONTH' | 'YEAR';
  onToggle: (code: string) => void;
};

export function ModuleSelectionPanel({
  copy,
  products,
  selectedCodes,
  disabled,
  languageCode,
  currency,
  billingInterval,
  onToggle,
}: Props) {
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
    <section id="billing-plan" tabIndex={-1} className="scroll-mt-40 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_46px_-38px_rgba(37,99,235,0.5)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--indice-brand-action)]/30 dark:border-slate-800 dark:bg-slate-900">
      <header className="flex flex-col gap-2 border-b border-slate-200 p-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--indice-brand-soft)] text-[var(--indice-brand-action)] dark:bg-blue-950/50 dark:text-blue-300"><Boxes className="h-5 w-5" /></span>
            <h2 className="text-lg font-medium text-slate-950 dark:text-white">{copy.catalog}</h2>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{copy.catalogDescription}</p>
        </div>
        <span className="w-fit rounded-full border border-[var(--indice-brand-border)] bg-[var(--indice-brand-soft)] px-3 py-1.5 text-xs font-medium text-[var(--indice-brand-text)] dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200">
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
                      <BillingProductCard
                        key={product.id}
                        copy={copy}
                        product={product}
                        selected={selected}
                        disabled={disabled || lastBase || overlaps}
                        overlaps={overlaps}
                        languageCode={languageCode}
                        currency={currency}
                        billingInterval={billingInterval}
                        showPrice={versionedOffer || product.product_type === 'ADDON'}
                        onToggle={() => onToggle(product.product_code)}
                      />
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
