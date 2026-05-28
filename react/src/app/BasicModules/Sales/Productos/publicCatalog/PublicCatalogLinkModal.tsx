import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../../../components/ui/dialog';
import type { ProductsTranslations } from '../translations';
import { PublicCatalogLinkPanel } from './PublicCatalogLinkPanel';
import type { PublicCatalogConfig } from './types/publicCatalogTypes';

export function PublicCatalogLinkModal({
  catalog,
  t,
  onOpenChange,
  onRegenerateLink,
  onCopyLink,
  onPreview,
  onGenerateQr,
  onDownloadQr,
}: {
  catalog: PublicCatalogConfig | null;
  t: ProductsTranslations;
  onOpenChange: (open: boolean) => void;
  onRegenerateLink: () => void;
  onCopyLink: () => void;
  onPreview: () => void;
  onGenerateQr: () => void;
  onDownloadQr: () => void;
}) {
  return (
    <Dialog open={Boolean(catalog)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto rounded-xl border-slate-200 p-0 sm:max-w-[460px]">
        <DialogHeader className="border-b border-slate-200 px-5 py-4">
          <DialogTitle className="text-xl font-black text-slate-950">{t.publicCatalog.linkSection}</DialogTitle>
          <DialogDescription className="font-semibold text-slate-500">
            {catalog?.title ?? t.publicCatalog.publicCatalog}
          </DialogDescription>
        </DialogHeader>
        {catalog ? (
          <div className="p-5">
            <PublicCatalogLinkPanel
              catalog={catalog}
              t={t}
              onRegenerateLink={onRegenerateLink}
              onCopyLink={onCopyLink}
              onPreview={onPreview}
              onGenerateQr={onGenerateQr}
              onDownloadQr={onDownloadQr}
            />
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
