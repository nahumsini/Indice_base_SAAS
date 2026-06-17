import { useMemo, useState } from 'react';
import { Globe2 } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { getSalesModalActionClassNames, SalesModalFrame } from '../../components/SalesModalFrame';
import type { SalesCatalogItem } from '../../types';
import type { ProductsTranslations } from '../translations';
import { PublicCatalogCardsPanel } from './PublicCatalogCardsPanel';
import { PublicCatalogEditorModal } from './PublicCatalogEditorModal';
import { PublicCatalogLinkModal } from './PublicCatalogLinkModal';
import { PublicCatalogPage } from './PublicCatalogPage';
import type { PublicCatalogConfig } from './types/publicCatalogTypes';
import { createDefaultPublicCatalogConfig } from './utils/publicCatalogAdapters';
import {
  createPublicCatalogId,
  createPublicCatalogLink,
  createQrImageDataUrl,
  downloadQrImage,
  getPublicCatalogTimestamp,
} from './utils/publicCatalogManagerUtils';

type PublicCatalogEditorMode = 'create' | 'edit';
const catalogManagerActionClassNames = getSalesModalActionClassNames('coral');

function withCatalogManagerDefaults(config: PublicCatalogConfig): PublicCatalogConfig {
  const token = config.publicAccessToken ?? 'demo-token';
  const origin = typeof window === 'undefined' ? 'http://localhost:5173' : window.location.origin;

  return {
    ...config,
    id: config.id ?? createPublicCatalogId(),
    status: config.status ?? 'active',
    publicAccessToken: token,
    publicUrl: config.publicUrl ?? `${origin}/public-catalog/${token}`,
    updatedAt: config.updatedAt ?? getPublicCatalogTimestamp(),
  };
}

export function PublicCatalogConfigModal({
  open,
  products,
  t,
  onOpenChange,
}: {
  open: boolean;
  products: SalesCatalogItem[];
  t: ProductsTranslations;
  onOpenChange: (open: boolean) => void;
}) {
  const defaultCatalog = useMemo(() => withCatalogManagerDefaults(createDefaultPublicCatalogConfig(products, {
    title: t.publicCatalog.defaultTitle,
    description: t.publicCatalog.defaultDescription,
    contactCta: t.publicCatalog.contactCta,
  })), [products, t]);
  const [catalogs, setCatalogs] = useState<PublicCatalogConfig[]>([defaultCatalog]);
  const [linkCatalogId, setLinkCatalogId] = useState<string | null>(null);
  const [previewCatalog, setPreviewCatalog] = useState<PublicCatalogConfig | null>(null);
  const [editingCatalog, setEditingCatalog] = useState<PublicCatalogConfig | null>(null);
  const [editingMode, setEditingMode] = useState<PublicCatalogEditorMode | null>(null);

  const linkCatalog = useMemo(
    () => catalogs.find((catalog) => catalog.id === linkCatalogId) ?? null,
    [catalogs, linkCatalogId],
  );

  const updateCatalog = (catalogId: string | null, patch: Partial<PublicCatalogConfig>) => {
    if (!catalogId) {
      return;
    }

    setCatalogs((currentCatalogs) => currentCatalogs.map((catalog) => (
      catalog.id === catalogId
        ? { ...catalog, ...patch, updatedAt: getPublicCatalogTimestamp() }
        : catalog
    )));
  };

  const updateEditingCatalog = (patch: Partial<PublicCatalogConfig>) => {
    setEditingCatalog((currentCatalog) => (
      currentCatalog ? { ...currentCatalog, ...patch } : currentCatalog
    ));
  };

  const handleCreateCatalog = () => {
    const draft = createDefaultPublicCatalogConfig(products, {
      title: `${t.publicCatalog.defaultTitle} ${catalogs.length + 1}`,
      description: t.publicCatalog.defaultDescription,
      contactCta: t.publicCatalog.contactCta,
    });
    const nextDraft: PublicCatalogConfig = {
      ...draft,
      id: createPublicCatalogId(),
      status: 'draft',
      publicAccessToken: undefined,
      publicUrl: undefined,
      qrImageDataUrl: undefined,
      updatedAt: getPublicCatalogTimestamp(),
    };

    setEditingCatalog(nextDraft);
    setEditingMode('create');
  };

  const handleEditCatalog = (catalog: PublicCatalogConfig) => {
    setEditingCatalog({
      ...catalog,
      selectedCategoryIds: [...catalog.selectedCategoryIds],
      selectedProductIds: [...catalog.selectedProductIds],
    });
    setEditingMode('edit');
  };

  const handleCloseEditor = () => {
    setEditingCatalog(null);
    setEditingMode(null);
  };

  const handleSaveEditor = () => {
    if (!editingCatalog?.id) {
      return;
    }

    const savedCatalog: PublicCatalogConfig = {
      ...editingCatalog,
      status: 'active',
      updatedAt: getPublicCatalogTimestamp(),
    };

    setCatalogs((currentCatalogs) => {
      if (editingMode === 'edit') {
        return currentCatalogs.map((catalog) => (
          catalog.id === savedCatalog.id ? savedCatalog : catalog
        ));
      }

      return [savedCatalog, ...currentCatalogs];
    });
    handleCloseEditor();
  };

  const handleDeleteCatalog = (catalogId: string) => {
    setCatalogs((currentCatalogs) => {
      const nextCatalogs = currentCatalogs.filter((catalog) => catalog.id !== catalogId);

      if (linkCatalogId === catalogId) {
        setLinkCatalogId(null);
      }

      return nextCatalogs;
    });
  };

  const handleRegenerateLink = (catalogId = linkCatalogId) => {
    const link = createPublicCatalogLink();
    updateCatalog(catalogId, {
      publicAccessToken: link.token,
      publicUrl: link.url,
      qrImageDataUrl: undefined,
    });
  };

  const handleCopyLink = async (catalog = linkCatalog) => {
    if (!catalog?.publicUrl) {
      return;
    }

    await navigator.clipboard?.writeText(catalog.publicUrl);
  };

  const handleGenerateQr = (catalog = linkCatalog) => {
    if (!catalog?.id || !catalog.publicUrl) {
      return;
    }

    updateCatalog(catalog.id, { qrImageDataUrl: createQrImageDataUrl(catalog.publicUrl) });
  };

  return (
    <>
      <SalesModalFrame
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            handleCloseEditor();
          }

          onOpenChange(nextOpen);
        }}
        title={t.publicCatalog.managerTitle}
        description={t.publicCatalog.managerDescription}
        icon={<Globe2 className="h-5 w-5" />}
        contentClassName="flex h-[90vh] max-h-[900px] w-[calc(100vw-3rem)] max-w-[1400px] flex-col sm:max-w-[1400px]"
        bodyClassName="!max-h-none min-h-0 flex-1 overflow-hidden bg-white p-0"
        footerClassName="sm:justify-end"
        footer={(
          <Button variant="outline" className={catalogManagerActionClassNames.secondary} onClick={() => onOpenChange(false)}>
            {t.common.cancel}
          </Button>
        )}
      >
          <div className="min-h-0 overflow-hidden">
            <PublicCatalogCardsPanel
              catalogs={catalogs}
              t={t}
              onCreate={handleCreateCatalog}
              onEdit={handleEditCatalog}
              onCatalogLink={(catalog) => setLinkCatalogId(catalog.id ?? null)}
              onPreview={setPreviewCatalog}
              onDelete={handleDeleteCatalog}
            />
          </div>
      </SalesModalFrame>

      <PublicCatalogEditorModal
        catalog={editingCatalog}
        mode={editingMode}
        products={products}
        t={t}
        onOpenChange={(nextOpen) => !nextOpen && handleCloseEditor()}
        onChange={updateEditingCatalog}
        onSave={handleSaveEditor}
      />

      <PublicCatalogLinkModal
        catalog={linkCatalog}
        t={t}
        onOpenChange={(nextOpen) => !nextOpen && setLinkCatalogId(null)}
        onRegenerateLink={() => handleRegenerateLink()}
        onCopyLink={() => void handleCopyLink(linkCatalog)}
        onPreview={() => linkCatalog && setPreviewCatalog(linkCatalog)}
        onGenerateQr={() => handleGenerateQr(linkCatalog)}
        onDownloadQr={() => linkCatalog && downloadQrImage(linkCatalog)}
      />

      <SalesModalFrame
        open={Boolean(previewCatalog)}
        onOpenChange={(nextOpen) => !nextOpen && setPreviewCatalog(null)}
        title={t.publicCatalog.previewAction}
        description={previewCatalog?.title ?? t.publicCatalog.publicCatalog}
        icon={<Globe2 className="h-5 w-5" />}
        contentClassName="flex h-[92vh] w-[calc(100vw-2rem)] max-w-[1500px] flex-col sm:max-w-[1500px]"
        bodyClassName="!max-h-none min-h-0 flex-1 overflow-hidden bg-white p-0"
        footerClassName="sm:justify-end"
        footer={(
          <Button variant="outline" className={catalogManagerActionClassNames.secondary} onClick={() => setPreviewCatalog(null)}>
            {t.common.close}
          </Button>
        )}
      >
          <div className="h-full overflow-y-auto">
            {previewCatalog ? <PublicCatalogPage config={previewCatalog} products={products} embedded /> : null}
          </div>
      </SalesModalFrame>
    </>
  );
}
