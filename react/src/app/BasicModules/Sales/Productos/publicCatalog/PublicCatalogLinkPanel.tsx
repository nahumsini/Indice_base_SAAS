import { Copy, Download, ExternalLink, Link2, QrCode, RefreshCw } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import type { ProductsTranslations } from '../translations';
import type { PublicCatalogConfig } from './types/publicCatalogTypes';

export function PublicCatalogLinkPanel({
  catalog,
  t,
  onRegenerateLink,
  onCopyLink,
  onOpenPublicLink,
  onGenerateQr,
  onDownloadQr,
  busy = false,
  error = '',
}: {
  catalog: PublicCatalogConfig;
  t: ProductsTranslations;
  onRegenerateLink: () => void;
  onCopyLink: () => void;
  onOpenPublicLink: () => void;
  onGenerateQr: () => void;
  onDownloadQr: () => void;
  busy?: boolean;
  error?: string;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="flex items-center gap-2 text-lg font-bold text-slate-950">
        <Link2 className="h-5 w-5 text-[#FF6B5E]" />
        {t.publicCatalog.linkSection}
      </h3>
      <div className="mt-4 space-y-3">
        {error ? <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</div> : null}
        {!catalog.publicUrl && catalog.publicTokenHint ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold leading-5 text-amber-800">
            {t.publicCatalog.protectedLinkHint(catalog.publicTokenHint)}
          </div>
        ) : null}
        {catalog.publicUrl ? (
          <>
            <div className="break-all rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs font-bold text-slate-600">
              {catalog.publicUrl}
            </div>
            <Button className="w-full gap-2 rounded-lg bg-[#FF6B5E] font-semibold text-white hover:bg-[#E85C50]" onClick={onCopyLink} disabled={busy}>
              <Copy className="h-4 w-4" />
              {t.publicCatalog.copyLink}
            </Button>
            <Button variant="outline" className="w-full gap-2 rounded-lg" onClick={onOpenPublicLink} disabled={busy}>
              <ExternalLink className="h-4 w-4" />
              {t.publicCatalog.openPublicCatalog}
            </Button>
          </>
        ) : (
          <Button className="w-full gap-2 rounded-lg bg-[#FF6B5E] font-semibold text-white hover:bg-[#E85C50]" onClick={onRegenerateLink} disabled={busy}>
            <RefreshCw className="h-4 w-4" />
            {t.publicCatalog.generateNewLink}
          </Button>
        )}
        <div className="flex aspect-square items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-center text-sm font-bold text-slate-400">
          {catalog.qrImageDataUrl ? (
            <img src={catalog.qrImageDataUrl} alt={t.publicCatalog.qrPlaceholder} className="h-full w-full object-contain p-5" />
          ) : (
            <div>
              <QrCode className="mx-auto mb-2 h-8 w-8" />
              {t.publicCatalog.qrPlaceholder}
            </div>
          )}
        </div>
        <div className="grid gap-2">
          <Button type="button" variant="outline" className="w-full gap-2 rounded-lg" onClick={onGenerateQr} disabled={busy || !catalog.publicUrl}>
            <QrCode className="h-4 w-4" />
            {t.publicCatalog.generateQrImage}
          </Button>
          <Button type="button" variant="outline" className="w-full gap-2 rounded-lg" onClick={onDownloadQr} disabled={busy || !catalog.qrImageDataUrl}>
            <Download className="h-4 w-4" />
            {t.publicCatalog.downloadQr}
          </Button>
          {catalog.publicUrl ? (
            <Button type="button" variant="ghost" className="w-full gap-2 rounded-lg text-slate-500" onClick={onRegenerateLink} disabled={busy}>
              <RefreshCw className="h-4 w-4" />
              {t.publicCatalog.regenerateLink}
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
