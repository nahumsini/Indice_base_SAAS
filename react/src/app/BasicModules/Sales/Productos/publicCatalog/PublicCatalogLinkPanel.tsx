import { Copy, Download, ExternalLink, Link2, QrCode, RefreshCw } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import type { ProductsTranslations } from '../translations';
import type { PublicCatalogConfig } from './types/publicCatalogTypes';

export function PublicCatalogLinkPanel({
  catalog,
  t,
  onRegenerateLink,
  onCopyLink,
  onPreview,
  onGenerateQr,
  onDownloadQr,
}: {
  catalog: PublicCatalogConfig;
  t: ProductsTranslations;
  onRegenerateLink: () => void;
  onCopyLink: () => void;
  onPreview: () => void;
  onGenerateQr: () => void;
  onDownloadQr: () => void;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="flex items-center gap-2 text-lg font-black text-slate-950">
        <Link2 className="h-5 w-5 text-[#FF6B5E]" />
        {t.publicCatalog.linkSection}
      </h3>
      <div className="mt-4 space-y-3">
        <Button className="w-full gap-2 rounded-lg bg-[#FF6B5E] font-black text-white hover:bg-[#E85C50]" onClick={onRegenerateLink}>
          <RefreshCw className="h-4 w-4" />
          {t.publicCatalog.regenerateLink}
        </Button>
        <Button variant="outline" className="w-full gap-2 rounded-lg" onClick={onCopyLink} disabled={!catalog.publicUrl}>
          <Copy className="h-4 w-4" />
          {t.publicCatalog.copyLink}
        </Button>
        <Button variant="outline" className="w-full gap-2 rounded-lg" onClick={onPreview}>
          <ExternalLink className="h-4 w-4" />
          {t.publicCatalog.openPreview}
        </Button>
        {catalog.publicUrl ? (
          <div className="break-all rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs font-bold text-slate-600">
            {catalog.publicUrl}
          </div>
        ) : null}
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
          <Button type="button" variant="outline" className="w-full gap-2 rounded-lg" onClick={onGenerateQr} disabled={!catalog.publicUrl}>
            <QrCode className="h-4 w-4" />
            {t.publicCatalog.generateQrImage}
          </Button>
          <Button type="button" variant="outline" className="w-full gap-2 rounded-lg" onClick={onDownloadQr} disabled={!catalog.qrImageDataUrl}>
            <Download className="h-4 w-4" />
            {t.publicCatalog.downloadQr}
          </Button>
        </div>
      </div>
    </section>
  );
}
