import { ExternalLink, Globe2, Link2, PencilLine, Power, PowerOff, QrCode, Trash2 } from 'lucide-react';
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
  onOpenPublicCatalog: () => void;
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
  onOpenPublicCatalog,
  onToggleStatus,
  onDelete,
}: PublicCatalogListCardProps) {
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
    <article className={`min-w-0 overflow-hidden rounded-xl border bg-white p-3 transition ${isSelected ? 'border-[#FF6B5E] shadow-sm' : 'border-slate-200 hover:border-[#FF6B5E]/35 hover:shadow-sm'}`}>
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#FF6B5E]/10 text-[#B63B32]">
            <Globe2 className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <h4 className="min-w-0 truncate text-sm font-medium text-slate-950">{catalog.title}</h4>
              <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-medium ${status === 'active' ? 'bg-emerald-50 text-emerald-700' : terminal ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                {statusText}
              </span>
            </div>
            <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5">
              <span className="max-w-full truncate text-xs font-medium text-slate-600">
                {catalog.unitName ?? t.publicCatalog.unitFallback(catalog.unitId ?? '-')} / {catalog.businessName ?? t.publicCatalog.businessFallback(catalog.businessId ?? '-')}
              </span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span className="text-xs font-medium text-slate-500">{cardSummary.productCount} · {t.publicCatalog.selectedProductsLabel}</span>
              <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${cardSummary.hasPublicLink ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                {cardSummary.hasPublicLink ? t.publicCatalog.publicLinkReady : t.publicCatalog.publicLinkMissing}
              </span>
              {cardSummary.hasPublicLink ? <Link2 className="h-3 w-3 text-slate-400" /> : null}
              {cardSummary.hasQrImage ? <QrCode className="h-3 w-3 text-slate-400" /> : null}
            </div>
          </div>
        </div>

        <div className="flex min-w-0 shrink-0 flex-wrap items-center gap-1.5 sm:flex-nowrap sm:justify-end">
          <Button type="button" size="icon" className="h-9 w-9 shrink-0 rounded-lg bg-[#FF6B5E] text-[#222831] hover:bg-[#E85C50]" onClick={onSelect} disabled={terminal} title={t.publicCatalog.editAction} aria-label={t.publicCatalog.editAction}>
            <PencilLine className="h-4 w-4" />
          </Button>
          <Button type="button" size="icon" variant="outline" className="h-9 w-9 shrink-0 rounded-lg border-slate-200 text-slate-600 hover:border-[#FF6B5E]/30 hover:bg-[#FF6B5E]/5 hover:text-[#B63B32]" onClick={onCatalogLink} disabled={terminal} title={t.publicCatalog.copyLink} aria-label={t.publicCatalog.copyLink}>
            <Link2 className="h-4 w-4" />
          </Button>
          <Button type="button" size="icon" variant="outline" className="h-9 w-9 shrink-0 rounded-lg border-slate-200 text-slate-600 hover:border-[#FF6B5E]/30 hover:bg-[#FF6B5E]/5 hover:text-[#B63B32]" onClick={onOpenPublicCatalog} disabled={terminal} title={t.publicCatalog.openPublicCatalog} aria-label={t.publicCatalog.openPublicCatalog}>
            <ExternalLink className="h-4 w-4" />
          </Button>
          {!terminal ? (
            <Button type="button" size="icon" variant="outline" className="h-9 w-9 shrink-0 rounded-lg border-slate-200 text-slate-600 hover:bg-slate-100" onClick={onToggleStatus} title={status === 'active' ? t.publicCatalog.disableAction : t.publicCatalog.enableAction} aria-label={status === 'active' ? t.publicCatalog.disableAction : t.publicCatalog.enableAction}>
              {status === 'active' ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
            </Button>
          ) : null}
          <Button type="button" size="icon" variant="outline" className="h-9 w-9 shrink-0 rounded-lg border-red-200 bg-red-50 text-red-600 hover:border-red-300 hover:bg-red-100" onClick={onDelete} title={terminal ? t.publicCatalog.deleteAction : t.publicCatalog.revokeAction} aria-label={terminal ? t.publicCatalog.deleteAction : t.publicCatalog.revokeAction}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </article>
  );
}
