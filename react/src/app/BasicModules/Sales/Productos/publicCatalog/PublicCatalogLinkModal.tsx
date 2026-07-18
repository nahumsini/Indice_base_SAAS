import { Link2 } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { SalesModalFrame } from '../../components/SalesModalFrame';
import { getSalesModalActionClassNames } from '../../salesModalStyles';
import type { ProductsTranslations } from '../translations';
import { PublicCatalogLinkPanel } from './PublicCatalogLinkPanel';
import type { PublicCatalogConfig } from './types/publicCatalogTypes';

const linkActionClassNames = getSalesModalActionClassNames('coral');

export function PublicCatalogLinkModal({
  catalog,
  t,
  onOpenChange,
  onRegenerateLink,
  onCopyLink,
  onPreview,
  onGenerateQr,
  onDownloadQr,
  busy = false,
  error = '',
}: {
  catalog: PublicCatalogConfig | null;
  t: ProductsTranslations;
  onOpenChange: (open: boolean) => void;
  onRegenerateLink: () => void;
  onCopyLink: () => void;
  onPreview: () => void;
  onGenerateQr: () => void;
  onDownloadQr: () => void;
  busy?: boolean;
  error?: string;
}) {
  return (
    <SalesModalFrame
      open={Boolean(catalog)}
      onOpenChange={onOpenChange}
      title={t.publicCatalog.linkSection}
      description={catalog?.title ?? t.publicCatalog.publicCatalog}
      icon={<Link2 className="h-6 w-6" />}
      contentClassName="sm:max-w-[460px]"
      bodyClassName="p-0"
      footerClassName="sm:justify-end"
      footer={(
        <Button
          type="button"
          variant="outline"
          className={linkActionClassNames.secondary}
          onClick={() => onOpenChange(false)}
        >
          {t.common.close}
        </Button>
      )}
    >
        {catalog ? (
          <div className="min-h-0 overflow-y-auto bg-slate-50/70 p-5">
            <PublicCatalogLinkPanel
              catalog={catalog}
              t={t}
              onRegenerateLink={onRegenerateLink}
              onCopyLink={onCopyLink}
              onPreview={onPreview}
              onGenerateQr={onGenerateQr}
              onDownloadQr={onDownloadQr}
              busy={busy}
              error={error}
            />
          </div>
        ) : null}
    </SalesModalFrame>
  );
}
