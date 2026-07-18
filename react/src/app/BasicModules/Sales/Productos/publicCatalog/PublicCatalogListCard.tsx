import { ExternalLink, Link2, PencilLine, Power, PowerOff, QrCode, Trash2 } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { useProductsResolvedLocale, type ProductsTranslations } from '../translations';
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
  onToggleStatus: () => void;
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
  onToggleStatus,
  onDelete,
}: PublicCatalogListCardProps) {
  const locale = useProductsResolvedLocale();
  const status = catalog.status ?? 'draft';
  const cardSummary = summary ?? {
    productCount: catalog.selectedProductIds.length,
    hasPublicLink: Boolean(catalog.publicUrl || catalog.publicTokenHint),
    hasQrImage: Boolean(catalog.qrImageDataUrl),
  };
  const statusText = status === 'active'
    ? t.publicCatalog.statusActive
    : status === 'revoked'
      ? t.publicCatalog.statusRevoked
      : status === 'expired'
        ? t.publicCatalog.statusExpired
      : status === 'disabled'
        ? t.publicCatalog.statusDisabled
        : t.publicCatalog.statusDraft;
  const terminal = status === 'revoked' || status === 'expired';

  return (
    <article className={`flex h-full flex-col rounded-lg border bg-white p-4 transition ${isSelected ? 'border-[#FF6B5E] shadow-sm' : 'border-slate-200 hover:border-[#FF6B5E]/35 hover:shadow-sm'}`}>
      <button type="button" className="w-full text-left disabled:cursor-default" onClick={onSelect} disabled={terminal}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h4 className="truncate text-sm font-bold text-slate-950">{catalog.title}</h4>
            <p className="mt-1 text-xs font-bold text-slate-500">
              {cardSummary.productCount} · {t.publicCatalog.selectedProductsLabel}
            </p>
          </div>
          <span className={`rounded-full px-2 py-1 text-xs font-semibold ${status === 'active' ? 'bg-emerald-50 text-emerald-700' : terminal ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
            {statusText}
          </span>
        </div>
        <div className="mt-4 grid gap-2 rounded-lg border border-slate-100 bg-slate-50/70 p-3 text-xs font-semibold text-slate-500">
          <span className="grid gap-0.5">
            <span className="text-[11px] font-semibold text-slate-500">{t.publicCatalog.organizationalScope}</span>
            <span className="truncate text-slate-700">
              {catalog.unitName ?? t.publicCatalog.unitFallback(catalog.unitId ?? '-')} / {catalog.businessName ?? t.publicCatalog.businessFallback(catalog.businessId ?? '-')}
            </span>
          </span>
          <span className="grid gap-0.5">
            <span className="text-[11px] font-semibold text-slate-500">{t.publicCatalog.contactMethodLabel}</span>
            <span className="truncate text-slate-700">{t.publicCatalog.contactMethods[catalog.contactMethod]}</span>
          </span>
          <span className="grid gap-0.5">
            <span className="text-[11px] font-semibold text-slate-500">{t.publicCatalog.updatedAtLabel}</span>
            <span className="truncate text-slate-700">{catalog.updatedAt ?? t.common.notAvailable}</span>
          </span>
          {catalog.expiresAt ? (
            <span className="grid gap-0.5">
              <span className="text-[11px] font-semibold text-slate-500">{t.publicCatalog.validityLabel}</span>
              <span className="truncate text-slate-700">{new Date(catalog.expiresAt).toLocaleString(locale)}</span>
            </span>
          ) : null}
          <span className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex rounded-full px-2 py-1 font-semibold ${cardSummary.hasPublicLink ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
              {cardSummary.hasPublicLink ? t.publicCatalog.publicLinkReady : t.publicCatalog.publicLinkMissing}
            </span>
            {cardSummary.hasPublicLink ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 font-semibold text-slate-600">
                <Link2 className="h-3 w-3" />
                {cardSummary.hasQrImage ? <QrCode className="h-3 w-3" /> : null}
              </span>
            ) : null}
          </span>
        </div>
      </button>

      <div className="mt-auto flex flex-wrap gap-1.5 pt-4">
        <Button type="button" size="sm" variant="outline" className="h-8 gap-1 rounded-lg px-2 text-xs font-bold" onClick={onSelect} disabled={terminal}>
          <PencilLine className="h-3.5 w-3.5" />
          {t.publicCatalog.editAction}
        </Button>
        <Button type="button" size="sm" variant="outline" className="h-8 gap-1 rounded-lg px-2 text-xs font-bold" onClick={onCatalogLink} disabled={terminal}>
          <Link2 className="h-3.5 w-3.5" />
          {t.publicCatalog.linkAction}
        </Button>
        <Button type="button" size="sm" variant="outline" className="h-8 gap-1 rounded-lg px-2 text-xs font-bold" onClick={onPreview} disabled={terminal}>
          <ExternalLink className="h-3.5 w-3.5" />
          {t.publicCatalog.previewAction}
        </Button>
        {!terminal ? (
          <Button type="button" size="sm" variant="outline" className="h-8 gap-1 rounded-lg px-2 text-xs font-bold" onClick={onToggleStatus}>
            {status === 'active' ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
            {status === 'active' ? t.publicCatalog.disableAction : t.publicCatalog.enableAction}
          </Button>
        ) : null}
        <Button type="button" size="sm" variant="outline" className="h-8 gap-1 rounded-lg border-red-200 bg-red-50 px-2 text-xs font-bold text-red-600 hover:bg-red-100" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5" />
          {terminal ? t.publicCatalog.deleteAction : t.publicCatalog.revokeAction}
        </Button>
      </div>
    </article>
  );
}
