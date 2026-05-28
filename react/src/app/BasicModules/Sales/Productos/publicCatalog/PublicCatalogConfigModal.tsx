import { useMemo, useState } from 'react';
import { Globe2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../../components/ui/dialog';
import { Button } from '../../../../components/ui/button';
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
      <Dialog open={open} onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          handleCloseEditor();
        }

        onOpenChange(nextOpen);
      }}>
        <DialogContent className="grid h-[90vh] max-h-[900px] w-[calc(100vw-3rem)] max-w-[1400px] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-lg border-slate-200 p-0 sm:max-w-[1400px]">
          <DialogHeader className="bg-[#FF6B5E] px-6 py-5 text-white">
            <DialogTitle className="flex items-center gap-2 text-2xl font-black">
              <Globe2 className="h-5 w-5" />
              {t.publicCatalog.managerTitle}
            </DialogTitle>
            <DialogDescription className="font-semibold text-white/85">{t.publicCatalog.managerDescription}</DialogDescription>
          </DialogHeader>

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

          <DialogFooter className="border-t border-slate-200 bg-white px-6 py-4">
            <Button variant="outline" className="rounded-lg" onClick={() => onOpenChange(false)}>
              {t.common.cancel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      <Dialog open={Boolean(previewCatalog)} onOpenChange={(nextOpen) => !nextOpen && setPreviewCatalog(null)}>
        <DialogContent className="h-[92vh] w-[calc(100vw-2rem)] max-w-[1500px] overflow-hidden rounded-lg border-slate-200 p-0 sm:max-w-[1500px]">
          <div className="h-full overflow-y-auto">
            {previewCatalog ? <PublicCatalogPage config={previewCatalog} products={products} embedded /> : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
