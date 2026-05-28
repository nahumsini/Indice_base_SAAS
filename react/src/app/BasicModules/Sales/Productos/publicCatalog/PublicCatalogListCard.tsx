import { useState } from 'react';
import { ExternalLink, Link2, PencilLine, QrCode, Trash2 } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import type { ProductsTranslations } from '../translations';
import type { PublicCatalogConfig } from './types/publicCatalogTypes';

type PublicCatalogCardSummary = {
  productCount: number;
  hasPublicLink: boolean;
  hasQrImage: boolean;
};

type PublicCatalogListCardProps = {
  catalog: PublicCatalogConfig;
  isSelected?: boolean;
  summary?: PublicCatalogCardSummary;
  t: ProductsTranslations;
  onSelect: () => void;
  onCatalogLink: () => void;
  onPreview: () => void;
  onDelete: () => void;
};

export function PublicCatalogListCard({
  catalog,
  isSelected = false,
  summary,
  t,
  onSelect,
  onCatalogLink,
  onPreview,
  onDelete,
}: PublicCatalogListCardProps) {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const status = catalog.status ?? 'draft';
  const cardSummary = summary ?? {
    productCount: catalog.selectedProductIds.length,
    hasPublicLink: Boolean(catalog.publicUrl),
    hasQrImage: Boolean(catalog.qrImageDataUrl),
  };

  const handleDelete = () => {
    if (!isConfirmingDelete) {
      setIsConfirmingDelete(true);
      return;
    }

    onDelete();
  };

  return (
    <article className={`flex h-full flex-col rounded-lg border bg-white p-4 transition ${isSelected ? 'border-[#FF6B5E] shadow-sm' : 'border-slate-200 hover:border-[#FF6B5E]/35 hover:shadow-sm'}`}>
      <button type="button" className="w-full text-left" onClick={onSelect}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h4 className="truncate text-sm font-black text-slate-950">{catalog.title}</h4>
            <p className="mt-1 text-xs font-bold text-slate-500">
              {cardSummary.productCount} · {t.publicCatalog.selectedProductsLabel}
            </p>
          </div>
          <span className={`rounded-full px-2 py-1 text-xs font-black ${status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
            {status === 'active' ? t.publicCatalog.statusActive : t.publicCatalog.statusDraft}
          </span>
        </div>
        <div className="mt-4 grid gap-2 rounded-lg border border-slate-100 bg-slate-50/70 p-3 text-xs font-semibold text-slate-500">
          <span className="grid gap-0.5">
            <span className="text-[10px] font-black uppercase text-slate-400">{t.publicCatalog.contactMethodLabel}</span>
            <span className="truncate text-slate-700">{t.publicCatalog.contactMethods[catalog.contactMethod]}</span>
          </span>
          <span className="grid gap-0.5">
            <span className="text-[10px] font-black uppercase text-slate-400">{t.publicCatalog.updatedAtLabel}</span>
            <span className="truncate text-slate-700">{catalog.updatedAt ?? t.common.notAvailable}</span>
          </span>
          <span className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex rounded-full px-2 py-1 font-black ${cardSummary.hasPublicLink ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
              {cardSummary.hasPublicLink ? t.publicCatalog.publicLinkReady : t.publicCatalog.publicLinkMissing}
            </span>
            {cardSummary.hasPublicLink ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 font-black text-slate-600">
                <Link2 className="h-3 w-3" />
                {cardSummary.hasQrImage ? <QrCode className="h-3 w-3" /> : null}
              </span>
            ) : null}
          </span>
        </div>
      </button>

      {isConfirmingDelete ? (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-sm font-black text-red-700">{t.publicCatalog.deleteTitle}</p>
          <p className="mt-1 text-xs font-semibold leading-5 text-red-600">{t.publicCatalog.deleteDescription}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" className="h-8 rounded-lg px-2 text-xs font-bold" onClick={() => setIsConfirmingDelete(false)}>
              {t.common.cancel}
            </Button>
            <Button type="button" size="sm" className="h-8 rounded-lg bg-red-600 px-2 text-xs font-bold text-white hover:bg-red-700" onClick={onDelete}>
              {t.publicCatalog.deleteCatalog}
            </Button>
          </div>
        </div>
      ) : null}

      <div className="mt-auto flex flex-wrap gap-1.5 pt-4">
        <Button type="button" size="sm" variant="outline" className="h-8 gap-1 rounded-lg px-2 text-xs font-bold" onClick={onSelect}>
          <PencilLine className="h-3.5 w-3.5" />
          {t.publicCatalog.editAction}
        </Button>
        <Button type="button" size="sm" variant="outline" className="h-8 gap-1 rounded-lg px-2 text-xs font-bold" onClick={onCatalogLink}>
          <Link2 className="h-3.5 w-3.5" />
          {t.publicCatalog.linkAction}
        </Button>
        <Button type="button" size="sm" variant="outline" className="h-8 gap-1 rounded-lg px-2 text-xs font-bold" onClick={onPreview}>
          <ExternalLink className="h-3.5 w-3.5" />
          {t.publicCatalog.previewAction}
        </Button>
        <Button type="button" size="sm" variant="outline" className="h-8 gap-1 rounded-lg border-red-200 bg-red-50 px-2 text-xs font-bold text-red-600 hover:bg-red-100" onClick={handleDelete}>
          <Trash2 className="h-3.5 w-3.5" />
          {t.publicCatalog.deleteAction}
        </Button>
      </div>
    </article>
  );
}
