import { useMemo } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import type { ProductsTranslations } from '../translations';
import type { PublicCatalogConfig } from './types/publicCatalogTypes';
import { PublicCatalogListCard } from './PublicCatalogListCard';

export type PublicCatalogCardSummary = {
  productCount: number;
  hasPublicLink: boolean;
  hasQrImage: boolean;
};

type PublicCatalogCardsPanelProps = {
  catalogs: PublicCatalogConfig[];
  t: ProductsTranslations;
  onCreate: () => void;
  onEdit: (catalog: PublicCatalogConfig) => void;
  onCatalogLink: (catalog: PublicCatalogConfig) => void;
  onPreview: (catalog: PublicCatalogConfig) => void;
  onDelete: (catalogId: string) => void;
};

export function PublicCatalogCardsPanel({
  catalogs,
  t,
  onCreate,
  onEdit,
  onCatalogLink,
  onPreview,
  onDelete,
}: PublicCatalogCardsPanelProps) {
  const catalogSummaries = useMemo(() => catalogs.map((catalog) => ({
    catalog,
    summary: {
      productCount: catalog.selectedProductIds.length,
      hasPublicLink: Boolean(catalog.publicUrl),
      hasQrImage: Boolean(catalog.qrImageDataUrl),
    },
  })), [catalogs]);

  return (
    <section className="min-h-0 overflow-y-auto bg-slate-50/70">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 p-4 lg:p-5">
        <div className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-black text-slate-950">{t.publicCatalog.managerTitle}</h3>
            <p className="mt-1 max-w-3xl text-sm font-semibold text-slate-500">{t.publicCatalog.managerDescription}</p>
          </div>
          <Button type="button" className="h-10 shrink-0 gap-2 rounded-lg bg-[#FF6B5E] text-white hover:bg-[#E85C50]" onClick={onCreate}>
            <Plus className="h-4 w-4" />
            {t.publicCatalog.createPublicCatalog}
          </Button>
        </div>

        {catalogs.length === 0 ? (
          <div className="flex min-h-[360px] items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
            <div className="max-w-md">
              <h3 className="text-xl font-black text-slate-950">{t.publicCatalog.noCatalogsTitle}</h3>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">{t.publicCatalog.noCatalogsDescription}</p>
              <Button type="button" className="mt-5 h-10 gap-2 rounded-lg bg-[#FF6B5E] text-white hover:bg-[#E85C50]" onClick={onCreate}>
                <Plus className="h-4 w-4" />
                {t.publicCatalog.createPublicCatalog}
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3">
            {catalogSummaries.map(({ catalog, summary }) => (
              <PublicCatalogListCard
                key={catalog.id}
                catalog={catalog}
                summary={summary}
                t={t}
                onSelect={() => onEdit(catalog)}
                onCatalogLink={() => onCatalogLink(catalog)}
                onPreview={() => onPreview(catalog)}
                onDelete={() => catalog.id && onDelete(catalog.id)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
