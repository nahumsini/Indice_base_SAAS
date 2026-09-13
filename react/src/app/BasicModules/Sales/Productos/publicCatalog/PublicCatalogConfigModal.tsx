import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ClipboardList, Globe2, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { SalesModalFrame } from '../../components/SalesModalFrame';
import { getSalesModalActionClassNames } from '../../salesModalStyles';
import { salesApi } from '../../salesApi';
import type { SalesCatalogItem } from '../../types';
import { publicCatalogContactCtaDefaults, type ProductsTranslations } from '../translations';
import { publicCatalogApi } from './publicCatalogApi';
import { PublicCatalogCardsPanel } from './PublicCatalogCardsPanel';
import { PublicCatalogEditorModal } from './PublicCatalogEditorModal';
import { PublicCatalogLinkModal } from './PublicCatalogLinkModal';
import { PublicCatalogRequestsModal } from './PublicCatalogRequestsModal';
import type { PublicCatalogConfig } from './types/publicCatalogTypes';
import { createDefaultPublicCatalogConfig } from './utils/publicCatalogAdapters';
import {
  createPublicCatalogId,
  createQrImageDataUrl,
  downloadQrImage,
  getPublicCatalogTimestamp,
} from './utils/publicCatalogManagerUtils';
import { resolvePublicCatalogContactLabel } from './utils/publicCatalogLocalization';

type PublicCatalogEditorMode = 'create' | 'edit';
type DestructiveAction = { catalog: PublicCatalogConfig; kind: 'revoke' | 'delete' };
type OrganizationUnit = { id: number; name: string };
type OrganizationBusiness = { id: number; unitId: number; name: string };
const catalogManagerActionClassNames = getSalesModalActionClassNames('coral');

const isValidCatalogContact = (catalog: PublicCatalogConfig) => {
  const value = catalog.contactValue.trim();
  if (!value) return false;
  if (catalog.contactMethod === 'email') {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }
  if (catalog.contactMethod === 'phone' || catalog.contactMethod === 'whatsapp') {
    const digits = value.replace(/\D/g, '');
    return digits.length >= 8 && digits.length <= 15;
  }
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    return Boolean(url.hostname && url.hostname.includes('.'));
  } catch {
    return false;
  }
};

const mergeEphemeralLink = (
  current: PublicCatalogConfig | undefined,
  persisted: PublicCatalogConfig,
): PublicCatalogConfig => ({
  ...persisted,
  publicAccessToken: persisted.publicAccessToken ?? current?.publicAccessToken,
  publicUrl: persisted.publicUrl ?? current?.publicUrl,
  qrImageDataUrl: persisted.publicUrl ? undefined : current?.qrImageDataUrl,
});

const withoutEphemeralLink = (catalog: PublicCatalogConfig): PublicCatalogConfig => ({
  ...catalog,
  publicAccessToken: undefined,
  publicUrl: undefined,
  qrImageDataUrl: undefined,
});

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
  const defaultCatalog = useMemo(() => createDefaultPublicCatalogConfig(products, {
    title: t.publicCatalog.defaultTitle,
    description: t.publicCatalog.defaultDescription,
    contactCta: t.publicCatalog.contactCta,
  }), [products, t]);
  const [catalogs, setCatalogs] = useState<PublicCatalogConfig[]>([]);
  const [units, setUnits] = useState<OrganizationUnit[]>([]);
  const [businesses, setBusinesses] = useState<OrganizationBusiness[]>([]);
  const [linkCatalogId, setLinkCatalogId] = useState<string | null>(null);
  const [editingCatalog, setEditingCatalog] = useState<PublicCatalogConfig | null>(null);
  const [editingMode, setEditingMode] = useState<PublicCatalogEditorMode | null>(null);
  const [requestsOpen, setRequestsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [operationBusy, setOperationBusy] = useState(false);
  const [error, setError] = useState('');
  const [editorError, setEditorError] = useState('');
  const [linkError, setLinkError] = useState('');
  const [destructiveAction, setDestructiveAction] = useState<DestructiveAction | null>(null);
  const [rotateCatalog, setRotateCatalog] = useState<PublicCatalogConfig | null>(null);
  const operationLockRef = useRef(false);
  const loadSequenceRef = useRef(0);

  const linkCatalog = useMemo(
    () => catalogs.find((catalog) => catalog.id === linkCatalogId) ?? null,
    [catalogs, linkCatalogId],
  );
  const childViewOpen = Boolean(
    editingCatalog || linkCatalog || requestsOpen || destructiveAction,
  );

  const tryAcquireOperation = () => {
    if (operationLockRef.current) return false;
    operationLockRef.current = true;
    return true;
  };

  const releaseOperation = () => {
    operationLockRef.current = false;
  };

  const closeLinkView = () => {
    setLinkCatalogId(null);
    setRotateCatalog(null);
    setLinkError('');
  };

  const resetTransientViews = () => {
    loadSequenceRef.current += 1;
    setCatalogs((current) => current.map(withoutEphemeralLink));
    setLinkCatalogId(null);
    setEditingCatalog(null);
    setEditingMode(null);
    setRequestsOpen(false);
    setDestructiveAction(null);
    setRotateCatalog(null);
    setEditorError('');
    setLinkError('');
  };

  const closeManager = () => {
    if (saving || operationBusy) return;
    resetTransientViews();
    onOpenChange(false);
  };

  const withScopeNames = (catalog: PublicCatalogConfig): PublicCatalogConfig => ({
    ...catalog,
    unitName: units.find((unit) => unit.id === catalog.unitId)?.name,
    businessName: businesses.find((business) => business.id === catalog.businessId)?.name,
  });

  const loadCatalogs = async () => {
    const sequence = ++loadSequenceRef.current;
    setLoading(true);
    setError('');
    try {
      const [persistedCatalogs, context] = await Promise.all([
        publicCatalogApi.listAdmin(),
        salesApi.context(),
      ]);
      const availableUnits = context.units
        .map((row) => ({ id: Number(row.id), name: String(row.name ?? '') }))
        .filter((row) => Number.isFinite(row.id) && row.id > 0 && row.name.trim());
      const availableBusinesses = context.businesses
        .map((row) => ({ id: Number(row.id), unitId: Number(row.unitId), name: String(row.name ?? '') }))
        .filter((row) => Number.isFinite(row.id) && row.id > 0
          && Number.isFinite(row.unitId) && row.unitId > 0 && row.name.trim());
      if (sequence !== loadSequenceRef.current) return;
      setCatalogs(persistedCatalogs.map((catalog) => ({
        ...catalog,
        unitName: availableUnits.find((unit) => unit.id === catalog.unitId)?.name,
        businessName: availableBusinesses.find((business) => business.id === catalog.businessId)?.name,
      })));
      setUnits(availableUnits);
      setBusinesses(availableBusinesses);
    } catch (reason) {
      if (sequence === loadSequenceRef.current) {
        setError(reason instanceof Error ? reason.message : t.publicCatalog.loadCatalogsError);
      }
    } finally {
      if (sequence === loadSequenceRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      void loadCatalogs();
    } else {
      resetTransientViews();
    }
  }, [open]);

  const updateCatalog = (catalogId: string | null, next: PublicCatalogConfig) => {
    if (!catalogId) return;
    setCatalogs((current) => current.map((catalog) => catalog.id === catalogId ? next : catalog));
  };

  const updateEditingCatalog = (patch: Partial<PublicCatalogConfig>) => {
    setEditingCatalog((current) => current ? { ...current, ...patch } : current);
  };

  const handleCreateCatalog = () => {
    const firstBusiness = businesses.find((business) => units.some((unit) => unit.id === business.unitId));
    const nextDraft: PublicCatalogConfig = {
      ...defaultCatalog,
      id: createPublicCatalogId(),
      unitId: firstBusiness?.unitId,
      businessId: firstBusiness?.id,
      status: 'draft',
      publicAccessToken: undefined,
      publicUrl: undefined,
      qrImageDataUrl: undefined,
      updatedAt: getPublicCatalogTimestamp(),
    };
    setEditorError('');
    setEditingCatalog(nextDraft);
    setEditingMode('create');
  };

  const handleEditCatalog = (catalog: PublicCatalogConfig) => {
    if (catalog.status === 'revoked' || catalog.status === 'expired') return;
    setEditorError('');
    setEditingCatalog({
      ...catalog,
      contactCtaLabel: resolvePublicCatalogContactLabel(
        catalog.contactCtaLabel,
        t.publicCatalog.contactCta,
        publicCatalogContactCtaDefaults,
      ),
      selectedCategoryIds: [...catalog.selectedCategoryIds],
      selectedProductIds: [...catalog.selectedProductIds],
    });
    setEditingMode('edit');
  };

  const handleCloseEditor = () => {
    if (saving) return;
    setEditingCatalog(null);
    setEditingMode(null);
    setEditorError('');
  };

  const handleSaveEditor = async () => {
    if (!editingCatalog || !editingCatalog.title.trim()) {
      setEditorError(t.publicCatalog.requiredIdentityError);
      return;
    }
    const catalogToSave: PublicCatalogConfig = {
      ...editingCatalog,
      title: editingCatalog.title.trim(),
      contactCtaLabel: editingCatalog.contactCtaLabel.trim() || t.publicCatalog.contactCta,
      contactValue: editingCatalog.contactValue.trim(),
    };
    if (!catalogToSave.unitId || !catalogToSave.businessId) {
      setEditorError(t.publicCatalog.requiredScopeError);
      return;
    }
    if (!isValidCatalogContact(catalogToSave)) {
      setEditorError(t.publicCatalog.contactInputs[catalogToSave.contactMethod].error);
      return;
    }
    if (catalogToSave.expiresAt && new Date(catalogToSave.expiresAt).getTime() <= Date.now()) {
      setEditorError(t.publicCatalog.futureExpirationError);
      return;
    }
    if (!tryAcquireOperation()) return;
    setSaving(true);
    setEditorError('');
    try {
      const persisted = editingMode === 'edit'
        ? await publicCatalogApi.updateAdmin(catalogToSave, products)
        : await publicCatalogApi.createAdmin(catalogToSave, products);
      const saved = withScopeNames(mergeEphemeralLink(editingMode === 'edit' ? catalogToSave : undefined, persisted));
      setCatalogs((current) => editingMode === 'edit'
        ? current.map((catalog) => catalog.id === saved.id ? saved : catalog)
        : [saved, ...current]);
      setEditingCatalog(null);
      setEditingMode(null);
      if (editingMode === 'create' && saved.id) {
        setLinkCatalogId(saved.id);
      }
    } catch (reason) {
      setEditorError(reason instanceof Error ? reason.message : t.publicCatalog.saveError);
    } finally {
      setSaving(false);
      releaseOperation();
    }
  };

  const handleConfirmDestructiveAction = async () => {
    const action = destructiveAction;
    if (!action?.catalog.backendId) return;
    if (!tryAcquireOperation()) return;
    const catalog = action.catalog;
    setOperationBusy(true);
    setError('');
    try {
      if (action.kind === 'revoke') {
        const transitioned = await publicCatalogApi.transition(catalog.backendId, 'REVOKED');
        const revoked = withScopeNames({
          ...transitioned,
          publicAccessToken: undefined,
          publicUrl: undefined,
          qrImageDataUrl: undefined,
        });
        updateCatalog(catalog.id ?? null, revoked);
      } else {
        await publicCatalogApi.deleteAdmin(catalog.backendId);
        setCatalogs((current) => current.filter((candidate) => candidate.id !== catalog.id));
      }
      if (linkCatalogId === catalog.id) setLinkCatalogId(null);
      setDestructiveAction(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t.publicCatalog.operationError);
    } finally {
      setOperationBusy(false);
      releaseOperation();
    }
  };

  const handleToggleStatus = async (catalog: PublicCatalogConfig) => {
    if (!catalog.backendId || catalog.status === 'revoked' || catalog.status === 'expired') return;
    if (!tryAcquireOperation()) return;
    setOperationBusy(true);
    setError('');
    try {
      const transitioned = await publicCatalogApi.transition(
        catalog.backendId,
        catalog.status === 'active' ? 'DISABLED' : 'ACTIVE',
      );
      updateCatalog(catalog.id ?? null, mergeEphemeralLink(catalog, transitioned));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t.publicCatalog.statusChangeError);
    } finally {
      setOperationBusy(false);
      releaseOperation();
    }
  };

  const handleRegenerateLink = async (catalogId = linkCatalogId) => {
    const catalog = catalogs.find((candidate) => candidate.id === catalogId);
    if (!catalog?.backendId) return;
    if (!tryAcquireOperation()) return;
    setOperationBusy(true);
    setLinkError('');
    try {
      const rotated = await publicCatalogApi.rotateLink(catalog.backendId);
      updateCatalog(catalog.id ?? null, withScopeNames(mergeEphemeralLink(catalog, rotated)));
    } catch (reason) {
      setLinkError(reason instanceof Error ? reason.message : t.publicCatalog.rotateLinkError);
    } finally {
      setOperationBusy(false);
      setRotateCatalog(null);
      releaseOperation();
    }
  };

  const handleCopyLink = async (catalog = linkCatalog) => {
    if (!catalog?.publicUrl) return;
    try {
      await navigator.clipboard.writeText(catalog.publicUrl);
      setLinkError('');
    } catch {
      setLinkError(t.publicCatalog.copyLinkError);
    }
  };

  const handleOpenPublicLink = (catalog = linkCatalog) => {
    if (!catalog?.publicUrl) return;
    window.open(catalog.publicUrl, '_blank', 'noopener,noreferrer');
  };

  const resolveCatalogLink = async (catalog: PublicCatalogConfig) => {
    if (catalog.publicUrl) return catalog.publicUrl;
    if (!catalog.backendId) throw new Error(t.publicCatalog.publicLinkMissing);
    const revealed = await publicCatalogApi.revealLink(catalog.backendId);
    if (catalog.id) {
      updateCatalog(catalog.id, {
        ...catalog,
        publicUrl: revealed.publicUrl,
        publicTokenHint: revealed.publicTokenHint,
        version: revealed.version,
      });
    }
    return revealed.publicUrl;
  };

  const handleCatalogLinkAction = async (catalog: PublicCatalogConfig) => {
    try {
      const publicUrl = await resolveCatalogLink(catalog);
      await navigator.clipboard.writeText(publicUrl);
      setLinkError('');
    } catch (reason) {
      setLinkError(reason instanceof Error ? reason.message : t.publicCatalog.copyLinkError);
      setLinkCatalogId(catalog.id ?? null);
    }
  };

  const handleOpenCatalogAction = async (catalog: PublicCatalogConfig) => {
    if (catalog.publicUrl) {
      window.open(catalog.publicUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    const target = window.open('about:blank', '_blank');
    if (target) target.opener = null;
    try {
      const publicUrl = await resolveCatalogLink(catalog);
      if (target) {
        target.location.replace(publicUrl);
      } else {
        window.open(publicUrl, '_blank', 'noopener,noreferrer');
      }
      setLinkError('');
    } catch (reason) {
      target?.close();
      setLinkError(reason instanceof Error ? reason.message : t.publicCatalog.operationError);
      setLinkCatalogId(catalog.id ?? null);
    }
  };

  const handleGenerateQr = async (catalog = linkCatalog) => {
    if (!catalog?.id || !catalog.publicUrl) return;
    if (!tryAcquireOperation()) return;
    setOperationBusy(true);
    setLinkError('');
    try {
      const qrImageDataUrl = await createQrImageDataUrl(catalog.publicUrl);
      updateCatalog(catalog.id, { ...catalog, qrImageDataUrl });
    } catch (reason) {
      setLinkError(reason instanceof Error ? reason.message : t.publicCatalog.generateQrError);
    } finally {
      setOperationBusy(false);
      releaseOperation();
    }
  };

  return (
    <>
      <SalesModalFrame
        open={open && !childViewOpen}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) closeManager();
        }}
        title={t.publicCatalog.managerTitle}
        description={t.publicCatalog.managerDescription}
        icon={<Globe2 className="h-5 w-5" />}
        contentClassName="flex h-[90vh] max-h-[900px] w-[calc(100vw-3rem)] max-w-[1400px] flex-col sm:max-w-[1400px]"
        bodyClassName="!max-h-none min-h-0 flex-1 overflow-hidden bg-white p-0"
        footerClassName="sm:justify-between"
        footer={(
          <>
            <Button type="button" variant="outline" className="gap-2" onClick={() => setRequestsOpen(true)}>
              <ClipboardList className="h-4 w-4" /> {t.publicCatalog.requestsAction}
            </Button>
            <Button variant="outline" className={catalogManagerActionClassNames.secondary} onClick={closeManager}>
              {t.common.close}
            </Button>
          </>
        )}
      >
        <div className="flex h-full min-h-0 flex-col">
          {error ? (
            <div role="alert" className="m-4 mb-0 flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              <span>{error}</span>
              <Button size="sm" variant="outline" className="gap-1" disabled={loading} onClick={() => void loadCatalogs()}><RefreshCw className="h-4 w-4" /> {t.publicCatalog.retry}</Button>
            </div>
          ) : null}
          {loading && catalogs.length === 0 ? (
            <div className="grid flex-1 place-items-center text-sm font-medium text-slate-500"><span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> {t.publicCatalog.loadingCatalogs}</span></div>
          ) : (
            <div className={`min-h-0 flex-1 overflow-hidden ${operationBusy ? 'pointer-events-none opacity-70' : ''}`}>
              <PublicCatalogCardsPanel
                catalogs={catalogs}
                t={t}
                onCreate={handleCreateCatalog}
                onEdit={handleEditCatalog}
                onCatalogLink={(catalog) => void handleCatalogLinkAction(catalog)}
                onOpenPublicCatalog={(catalog) => void handleOpenCatalogAction(catalog)}
                onToggleStatus={(catalog) => void handleToggleStatus(catalog)}
                onDelete={(catalogId) => {
                  const catalog = catalogs.find((candidate) => candidate.id === catalogId);
                  if (catalog) setDestructiveAction({
                    catalog,
                    kind: catalog.status === 'revoked' || catalog.status === 'expired' ? 'delete' : 'revoke',
                  });
                }}
              />
            </div>
          )}
        </div>
      </SalesModalFrame>

      <PublicCatalogEditorModal
        catalog={open ? editingCatalog : null}
        mode={editingMode}
        products={products}
        units={units}
        businesses={businesses}
        t={t}
        saving={saving}
        error={editorError}
        onOpenChange={(nextOpen) => !nextOpen && handleCloseEditor()}
        onChange={updateEditingCatalog}
        onSave={() => void handleSaveEditor()}
      />

      <PublicCatalogLinkModal
        catalog={open && !rotateCatalog ? linkCatalog : null}
        t={t}
        busy={operationBusy}
        error={linkError}
        onOpenChange={(nextOpen) => !nextOpen && closeLinkView()}
        onRegenerateLink={() => linkCatalog && setRotateCatalog(linkCatalog)}
        onCopyLink={() => void handleCopyLink(linkCatalog)}
        onOpenPublicLink={() => handleOpenPublicLink(linkCatalog)}
        onGenerateQr={() => void handleGenerateQr(linkCatalog)}
        onDownloadQr={() => linkCatalog && downloadQrImage(linkCatalog)}
      />

      <PublicCatalogRequestsModal open={open && requestsOpen} t={t} onOpenChange={setRequestsOpen} />

      <SalesModalFrame
        open={open && Boolean(destructiveAction)}
        modalType="confirmation"
        busy={operationBusy}
        tone="coral"
        title={destructiveAction?.kind === 'delete' ? t.publicCatalog.deleteRevokedTitle : t.publicCatalog.revokeCatalogTitle}
        description={destructiveAction?.kind === 'delete'
          ? t.publicCatalog.deleteRevokedDescription
          : t.publicCatalog.revokeCatalogDescription}
        icon={<AlertTriangle className="h-5 w-5" />}
        onOpenChange={(nextOpen) => !nextOpen && setDestructiveAction(null)}
        footer={(
          <>
            <Button type="button" variant="outline" className={catalogManagerActionClassNames.secondary} disabled={operationBusy} onClick={() => setDestructiveAction(null)}>
              {t.common.cancel}
            </Button>
            <Button type="button" className={catalogManagerActionClassNames.primary} disabled={operationBusy} onClick={() => void handleConfirmDestructiveAction()}>
              {operationBusy ? t.publicCatalog.processing : destructiveAction?.kind === 'delete' ? t.publicCatalog.deletePermanently : t.publicCatalog.revokeAccess}
            </Button>
          </>
        )}
      >
        <div className="rounded-xl border border-red-200 bg-white px-4 py-3 text-sm font-medium text-red-700 shadow-sm">
          {destructiveAction?.catalog.title}
        </div>
      </SalesModalFrame>

      <SalesModalFrame
        open={open && Boolean(rotateCatalog)}
        modalType="confirmation"
        busy={operationBusy}
        tone="coral"
        title={t.publicCatalog.rotateLinkTitle}
        description={t.publicCatalog.rotateLinkDescription}
        icon={<AlertTriangle className="h-5 w-5" />}
        onOpenChange={(nextOpen) => !nextOpen && !operationBusy && setRotateCatalog(null)}
        footer={(
          <>
            <Button type="button" variant="outline" className={catalogManagerActionClassNames.secondary} disabled={operationBusy} onClick={() => setRotateCatalog(null)}>
              {t.common.cancel}
            </Button>
            <Button type="button" className={catalogManagerActionClassNames.primary} disabled={operationBusy} onClick={() => void handleRegenerateLink(rotateCatalog?.id ?? null)}>
              {operationBusy ? t.publicCatalog.processing : t.publicCatalog.rotateLinkConfirm}
            </Button>
          </>
        )}
      >
        <div className="rounded-xl border border-amber-200 bg-white px-4 py-3 text-sm font-medium text-amber-800 shadow-sm">
          {rotateCatalog?.title}
        </div>
      </SalesModalFrame>

    </>
  );
}
