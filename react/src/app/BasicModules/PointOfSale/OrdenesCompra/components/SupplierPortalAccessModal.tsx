import {
  AlertTriangle,
  CalendarDays,
  Copy,
  ExternalLink,
  History,
  KeyRound,
  Loader2,
  Pencil,
  Plus,
  Power,
  QrCode,
  RefreshCw,
  Save,
  ShieldCheck,
  ShieldX,
  Trash2,
  Users,
} from 'lucide-react';
import QRCode from 'qrcode';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ConfirmDeleteDialog } from '../../../../components/ConfirmDeleteDialog';
import { useSupplierPortalTranslations } from '../../SupplierPortal/supplierPortalTranslations';
import {
  PosModalFrame,
  posModalModuleFooterClassName,
  posModalSecondaryActionClassName,
} from '../../Sale/components/PosModalFrame';
import { purchaseOrdersApi } from '../services/purchaseOrdersApi';
import type {
  ProviderOption,
  SupplierPortalAccess,
  SupplierPortalAccessPayload,
  SupplierPortalAccessStatus,
  SupplierPortalKioskAuditEvent,
  SupplierPortalKioskConfigurationPayload,
  SupplierPortalKioskDefinition,
  SupplierPortalKioskGrant,
} from '../types/purchaseOrder.types';

type DetailState = {
  audit: SupplierPortalKioskAuditEvent[];
  grants: SupplierPortalKioskGrant[];
  loading: boolean;
};

const statusClassName: Record<SupplierPortalAccessStatus, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200',
  DISABLED: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-200',
  EXPIRED: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200',
  REVOKED: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-200',
};

const randomPin = () => {
  const randomValues = new Uint32Array(6);
  globalThis.crypto.getRandomValues(randomValues);
  return Array.from(randomValues, value => String(value % 10)).join('');
};

const defaultExpiration = () => {
  const expiration = new Date();
  expiration.setDate(expiration.getDate() + 90);
  return toLocalDateTime(expiration.toISOString());
};

const toLocalDateTime = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const localTime = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localTime.toISOString().slice(0, 16);
};

const effectiveStatus = (
  access: SupplierPortalAccess,
  kiosk?: SupplierPortalKioskDefinition,
): SupplierPortalAccessStatus => {
  if (kiosk) return kiosk.status;
  if (access.status !== 'REVOKED' && access.expiresAt && new Date(access.expiresAt).getTime() <= Date.now()) {
    return 'EXPIRED';
  }
  return access.status;
};

const fullCreatedPortalUrl = (portalUrl: string) => {
  try {
    return new URL(portalUrl, window.location.origin).toString();
  } catch {
    return portalUrl;
  }
};

function PortalQr({ alt, errorMessage, linkLabel, url }: {
  alt: string;
  errorMessage: string;
  linkLabel: string;
  url: string;
}) {
  const [dataUrl, setDataUrl] = useState('');
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let mounted = true;
    setDataUrl('');
    setFailed(false);
    void QRCode.toDataURL(url, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 256,
    }).then(result => {
      if (mounted) setDataUrl(result);
    }).catch(() => {
      if (mounted) setFailed(true);
    });
    return () => { mounted = false; };
  }, [url]);

  return (
    <div className="flex min-h-32 w-full flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-950 sm:w-32">
      {failed ? (
        <p role="status" className="px-2 text-center text-xs font-semibold text-red-600 dark:text-red-300">{errorMessage}</p>
      ) : dataUrl ? (
        <a href={dataUrl} target="_blank" rel="noreferrer" aria-label={linkLabel} className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-orange-400">
          <img src={dataUrl} alt={alt} className="h-28 w-28 rounded-md" />
        </a>
      ) : (
        <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin text-slate-400" />
      )}
    </div>
  );
}

export function SupplierPortalAccessModal({
  accessList,
  onChangePin,
  onClose,
  onDelete,
  onStatusChange,
  onSubmit,
  onUpdateConfiguration,
  providers,
  saving,
}: {
  accessList: SupplierPortalAccess[];
  onChangePin: (accessId: number, pin: string) => Promise<SupplierPortalAccess>;
  onClose: () => void;
  onDelete: (kioskId: number, reason?: string) => Promise<{ deleted: boolean }>;
  onStatusChange: (accessId: number, status: SupplierPortalAccessStatus) => Promise<SupplierPortalAccess>;
  onSubmit: (payload: SupplierPortalAccessPayload) => Promise<SupplierPortalAccess>;
  onUpdateConfiguration: (
    kioskId: number,
    payload: SupplierPortalKioskConfigurationPayload,
  ) => Promise<SupplierPortalKioskDefinition>;
  providers: ProviderOption[];
  saving: boolean;
}) {
  const { copy, locale } = useSupplierPortalTranslations();
  const [providerId, setProviderId] = useState(providers[0]?.id ? String(providers[0].id) : '');
  const [generatedPin, setGeneratedPin] = useState(() => randomPin());
  const [expiresAt, setExpiresAt] = useState(() => defaultExpiration());
  const [neverExpires, setNeverExpires] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [revealedPins, setRevealedPins] = useState<Record<number, string>>({});
  const [revealedLinks, setRevealedLinks] = useState<Record<number, string>>({});
  const [credentialOutcomes, setCredentialOutcomes] = useState<Record<number, 'created' | 'reused'>>({});
  const [actionError, setActionError] = useState('');
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [pendingPinRotationId, setPendingPinRotationId] = useState<number | null>(null);
  const [pendingRevocationId, setPendingRevocationId] = useState<number | null>(null);
  const [kiosks, setKiosks] = useState<SupplierPortalKioskDefinition[]>([]);
  const [engineLoading, setEngineLoading] = useState(true);
  const [engineError, setEngineError] = useState('');
  const [editingAccessId, setEditingAccessId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editExpiresAt, setEditExpiresAt] = useState('');
  const [editNeverExpires, setEditNeverExpires] = useState(false);
  const [expandedAccessId, setExpandedAccessId] = useState<number | null>(null);
  const [detailsByKioskId, setDetailsByKioskId] = useState<Record<number, DetailState>>({});
  const [pendingDeleteAccess, setPendingDeleteAccess] = useState<SupplierPortalAccess | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const submitLockRef = useRef(false);
  const actionLockRef = useRef(false);

  const activeProviders = useMemo(() => providers.filter(provider => provider.status !== 'INACTIVE'), [providers]);
  const accessRevision = accessList.map(access => `${access.id}:${access.status}:${access.expiresAt ?? ''}:${access.updatedAt ?? ''}`).join('|');

  const loadKiosks = useCallback(async (showLoading = true) => {
    if (showLoading) setEngineLoading(true);
    setEngineError('');
    try {
      setKiosks(await purchaseOrdersApi.listSupplierPortalKiosks());
    } catch (error) {
      setEngineError(error instanceof Error && error.message ? error.message : copy.admin.loadEngineError);
    } finally {
      if (showLoading) setEngineLoading(false);
    }
  }, [copy.admin.loadEngineError]);

  useEffect(() => {
    void loadKiosks();
  }, [accessRevision, loadKiosks]);

  useEffect(() => {
    if (!providerId && activeProviders[0]?.id) setProviderId(String(activeProviders[0].id));
  }, [activeProviders, providerId]);

  const kioskByAccessId = useMemo(
    () => new Map(kiosks.map(kiosk => [kiosk.legacyReferenceId, kiosk])),
    [kiosks],
  );
  const statuses = accessList.map(access => effectiveStatus(access, kioskByAccessId.get(access.id)));
  const activeCount = statuses.filter(status => status === 'ACTIVE').length;
  const disabledCount = statuses.filter(status => status === 'DISABLED').length;
  const expiredCount = statuses.filter(status => status === 'EXPIRED').length;
  const revokedCount = statuses.filter(status => status === 'REVOKED').length;
  const expirationTime = expiresAt ? new Date(expiresAt).getTime() : Number.NaN;
  const hasValidExpiration = neverExpires || (Number.isFinite(expirationTime) && expirationTime > Date.now());
  const canSubmit = Boolean(providerId && generatedPin && hasValidExpiration && !saving && !pendingAction);

  const formatDateTime = (value?: string | null, fallback = copy.common.notAvailable) => {
    if (!value) return fallback;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return fallback;
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
  };

  const formatExpiration = (value?: string | null) => (
    value ? copy.admin.expires(formatDateTime(value, copy.admin.expirationUnavailable)) : copy.admin.noExpiration
  );

  const submit = async () => {
    if (!canSubmit || submitLockRef.current) return;
    const expiration = neverExpires ? null : new Date(expiresAt);
    if (expiration && (!Number.isFinite(expiration.getTime()) || expiration.getTime() <= Date.now())) {
      setActionError(copy.admin.futureExpiration);
      return;
    }
    submitLockRef.current = true;
    setActionError('');
    setPendingAction('create');
    const pinToCreate = generatedPin || randomPin();
    try {
      const createdAccess = await onSubmit({
        providerId: Number(providerId),
        portalCode: null,
        pin: pinToCreate,
        status: 'ACTIVE',
        expiresAt: expiration?.toISOString() ?? null,
      });
      setCredentialOutcomes(current => ({
        ...current,
        [createdAccess.id]: createdAccess.personalPinCreated === true ? 'created' : 'reused',
      }));
      if (createdAccess.personalPinCreated === true) {
        setRevealedPins(current => ({ ...current, [createdAccess.id]: pinToCreate }));
      } else {
        setRevealedPins(current => {
          const next = { ...current };
          delete next[createdAccess.id];
          return next;
        });
      }
      setRevealedLinks(current => ({
        ...current,
        [createdAccess.id]: fullCreatedPortalUrl(createdAccess.portalUrl),
      }));
      setGeneratedPin(randomPin());
      setExpiresAt(defaultExpiration());
      setNeverExpires(false);
      await loadKiosks(false);
    } catch (error) {
      setActionError(error instanceof Error && error.message ? error.message : copy.admin.createError);
    } finally {
      submitLockRef.current = false;
      setPendingAction(null);
    }
  };

  const markCopied = (key: string) => {
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey(current => current === key ? null : current), 1800);
  };

  const copyValue = async (key: string, value: string) => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(value);
      markCopied(key);
    } catch {
      setActionError(copy.admin.clipboardError);
    }
  };

  const runLockedAction = async (key: string, action: () => Promise<void>, fallback: string) => {
    if (actionLockRef.current || pendingAction) return;
    actionLockRef.current = true;
    setActionError('');
    setPendingAction(key);
    try {
      await action();
    } catch (error) {
      setActionError(error instanceof Error && error.message ? error.message : fallback);
    } finally {
      actionLockRef.current = false;
      setPendingAction(null);
    }
  };

  const changeStatus = (access: SupplierPortalAccess, nextStatus: SupplierPortalAccessStatus) => (
    runLockedAction(`status-${access.id}`, async () => {
      await onStatusChange(access.id, nextStatus);
      setPendingPinRotationId(null);
      setPendingRevocationId(null);
      await loadKiosks(false);
    }, copy.admin.statusError)
  );

  const changePin = (access: SupplierPortalAccess) => {
    const nextPin = randomPin();
    return runLockedAction(`pin-${access.id}`, async () => {
      await onChangePin(access.id, nextPin);
      setRevealedPins(current => ({ ...current, [access.id]: nextPin }));
      setCredentialOutcomes(current => ({ ...current, [access.id]: 'created' }));
      setPendingPinRotationId(null);
      await loadKiosks(false);
    }, copy.admin.pinError);
  };

  const beginConfigurationEdit = (access: SupplierPortalAccess, kiosk: SupplierPortalKioskDefinition) => {
    setEditingAccessId(access.id);
    setEditName(kiosk.name);
    setEditNeverExpires(!kiosk.expiresAt);
    setEditExpiresAt(toLocalDateTime(kiosk.expiresAt));
    setExpandedAccessId(null);
  };

  const saveConfiguration = (
    access: SupplierPortalAccess,
    kiosk: SupplierPortalKioskDefinition,
  ) => runLockedAction(`config-${access.id}`, async () => {
    const trimmedName = editName.trim();
    const expiration = editNeverExpires ? null : new Date(editExpiresAt);
    if (!trimmedName || trimmedName.length > 180) throw new Error(copy.admin.configurationError);
    if (expiration && (!Number.isFinite(expiration.getTime()) || expiration.getTime() <= Date.now())) {
      throw new Error(copy.admin.futureExpiration);
    }
    const updated = await onUpdateConfiguration(kiosk.id, {
      name: trimmedName,
      expiresAt: expiration?.toISOString() ?? null,
    });
    setKiosks(current => current.map(item => item.id === updated.id ? updated : item));
    setEditingAccessId(null);
  }, copy.admin.configurationError);

  const toggleDetails = async (access: SupplierPortalAccess, kiosk: SupplierPortalKioskDefinition) => {
    if (expandedAccessId === access.id) {
      setExpandedAccessId(null);
      return;
    }
    setEditingAccessId(null);
    setExpandedAccessId(access.id);
    if (detailsByKioskId[kiosk.id] && !detailsByKioskId[kiosk.id].loading) return;
    setDetailsByKioskId(current => ({
      ...current,
      [kiosk.id]: { audit: [], grants: [], loading: true },
    }));
    try {
      const [grants, audit] = await Promise.all([
        purchaseOrdersApi.listSupplierPortalKioskGrants(kiosk.id),
        purchaseOrdersApi.listSupplierPortalKioskAudit(kiosk.id),
      ]);
      setDetailsByKioskId(current => ({
        ...current,
        [kiosk.id]: { audit, grants, loading: false },
      }));
    } catch (error) {
      setDetailsByKioskId(current => {
        const next = { ...current };
        delete next[kiosk.id];
        return next;
      });
      setActionError(error instanceof Error && error.message ? error.message : copy.admin.detailsError);
    }
  };

  const confirmDelete = () => {
    if (!pendingDeleteAccess) return;
    const kiosk = kioskByAccessId.get(pendingDeleteAccess.id);
    if (!kiosk) return;
    void runLockedAction(`delete-${pendingDeleteAccess.id}`, async () => {
      await onDelete(kiosk.id, deleteReason);
      setKiosks(current => current.filter(item => item.id !== kiosk.id));
      setPendingDeleteAccess(null);
      setDeleteReason('');
      setExpandedAccessId(null);
      setEditingAccessId(null);
    }, copy.admin.deleteError);
  };

  if (pendingDeleteAccess) {
    return (
      <ConfirmDeleteDialog
        isVisible
        title={copy.admin.deleteTitle}
        itemName={kioskByAccessId.get(pendingDeleteAccess.id)?.name || pendingDeleteAccess.providerName}
        description={copy.admin.deleteDescription}
        confirmLabel={copy.admin.confirmDelete}
        cancelLabel={copy.common.cancel}
        confirmDisabled={Boolean(pendingAction)}
        onCancel={() => {
          if (!pendingAction) {
            setPendingDeleteAccess(null);
            setDeleteReason('');
            setActionError('');
          }
        }}
        onConfirm={confirmDelete}
      >
        <div className="space-y-3">
          {actionError ? <p role="alert" className="text-sm font-semibold text-red-700 dark:text-red-200">{actionError}</p> : null}
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{copy.admin.deleteReason}</span>
            <textarea
              value={deleteReason}
              maxLength={500}
              placeholder={copy.admin.deleteReasonPlaceholder}
              onChange={event => setDeleteReason(event.target.value)}
              className="min-h-24 w-full rounded-xl border border-red-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus-visible:ring-2 focus-visible:ring-red-400 dark:border-red-900/60 dark:bg-slate-950 dark:text-white"
            />
          </label>
        </div>
      </ConfirmDeleteDialog>
    );
  }

  const revocationAccess = pendingRevocationId == null
    ? null
    : accessList.find(access => access.id === pendingRevocationId) ?? null;
  if (revocationAccess) {
    return (
      <ConfirmDeleteDialog
        isVisible
        title={copy.admin.revokeTitle}
        itemName={kioskByAccessId.get(revocationAccess.id)?.name || revocationAccess.providerName}
        description={copy.admin.revokeWarning}
        confirmLabel={copy.admin.confirmRevocation}
        cancelLabel={copy.common.cancel}
        confirmDisabled={Boolean(pendingAction)}
        onCancel={() => {
          if (!pendingAction) {
            setPendingRevocationId(null);
            setActionError('');
          }
        }}
        onConfirm={() => void changeStatus(revocationAccess, 'REVOKED')}
      >
        {actionError ? <p role="alert" className="text-sm font-semibold text-red-700 dark:text-red-200">{actionError}</p> : null}
      </ConfirmDeleteDialog>
    );
  }

  return (
    <PosModalFrame
        modalType="operational-workspace"
        onClose={onClose}
        isCloseDisabled={saving || Boolean(pendingAction)}
        closeLabel={copy.admin.closeLabel}
        title={copy.admin.title}
        subtitle={copy.admin.subtitle}
        eyebrow={copy.admin.eyebrow}
        icon={<KeyRound className="h-6 w-6" />}
        tone="coral"
        size="xl"
        bodyClassName="p-0"
        footerClassName={posModalModuleFooterClassName}
        footer={(
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold text-white/90" aria-live="polite">
              {copy.admin.countSummary(activeCount, disabledCount, expiredCount, revokedCount)}
            </p>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" disabled={saving || Boolean(pendingAction)} onClick={onClose} className={posModalSecondaryActionClassName}>
                {copy.common.close}
              </button>
              <button
                type="button"
                disabled={!canSubmit || pendingAction === 'create'}
                onClick={() => void submit()}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-black text-[#B63B32] shadow-sm transition hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:bg-white/60 disabled:text-[#B63B32]/50 sm:w-auto"
              >
                {pendingAction === 'create' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {copy.admin.createAccess}
              </button>
            </div>
          </div>
        )}
      >
        <div className="grid min-h-0 bg-slate-50 dark:bg-slate-950 xl:grid-cols-[360px_minmax(0,1fr)]">
          <section className="border-b border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:p-6 xl:border-b-0 xl:border-r">
            <h2 className="text-lg font-bold text-slate-950 dark:text-white">{copy.admin.createAccess}</h2>
            <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">{copy.admin.createDescription}</p>
            <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold leading-5 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
              {copy.admin.credentialPolicy}
            </p>

            {actionError ? (
              <div role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                {actionError}
              </div>
            ) : null}
            {engineError ? (
              <div role="status" className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
                <p>{engineError}</p>
                <button type="button" disabled={engineLoading} onClick={() => void loadKiosks()} className="mt-2 min-h-9 rounded-lg border border-amber-300 bg-white px-3 font-bold text-amber-900 disabled:opacity-60 dark:border-amber-800 dark:bg-slate-950 dark:text-amber-100">
                  {copy.admin.retryEngine}
                </button>
              </div>
            ) : null}

            <label className="mt-5 block space-y-2">
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{copy.admin.supplier}</span>
              <select
                value={providerId}
                disabled={activeProviders.length === 0}
                onChange={(event) => setProviderId(event.target.value)}
                className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-950 outline-none focus-visible:ring-2 focus-visible:ring-orange-400 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                {activeProviders.length === 0 ? <option value="">{copy.admin.noSuppliers}</option> : null}
                {activeProviders.map(provider => <option key={provider.id} value={provider.id}>{provider.name}</option>)}
              </select>
            </label>

            <div className="mt-4 rounded-2xl border border-[#FFB3AD] bg-[#FFF1EF] p-4 dark:border-[#FF6B5E]/40 dark:bg-[#FF6B5E]/10">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-black uppercase tracking-[0.14em] text-[#B63B32] dark:text-[#FFC7C3]">{copy.admin.oneTimePin}</span>
                  <p className="mt-1 text-2xl font-black text-slate-950 dark:text-white">{generatedPin}</p>
                </div>
                <button type="button" disabled={Boolean(pendingAction)} onClick={() => setGeneratedPin(randomPin())} className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#FFB3AD] bg-white px-3 text-xs font-bold text-[#B63B32] outline-none hover:bg-[#FFF7F5] focus-visible:ring-2 focus-visible:ring-orange-400 disabled:opacity-60 dark:border-[#FF6B5E]/40 dark:bg-slate-950 dark:text-[#FFC7C3]">
                  <RefreshCw className="h-4 w-4" />
                  {copy.admin.generateNew}
                </button>
              </div>
              <p className="mt-2 text-xs font-semibold text-[#B63B32]/80 dark:text-[#FFC7C3]/80">{copy.admin.pinCopyReminder}</p>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
                <CalendarDays className="h-4 w-4" />
                {copy.admin.validity}
              </div>
              <label className="mt-3 flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                <input type="checkbox" checked={neverExpires} onChange={(event) => setNeverExpires(event.target.checked)} className="h-4 w-4 rounded border-slate-300" />
                {copy.admin.neverExpires}
              </label>
              {!neverExpires ? (
                <input
                  type="datetime-local"
                  aria-label={copy.admin.validity}
                  value={expiresAt}
                  min={toLocalDateTime(new Date().toISOString())}
                  onChange={(event) => setExpiresAt(event.target.value)}
                  className="mt-3 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-950 outline-none focus-visible:ring-2 focus-visible:ring-orange-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              ) : null}
              {!hasValidExpiration ? <p className="mt-2 text-xs font-bold text-red-600 dark:text-red-300">{copy.admin.futureExpiration}</p> : null}
            </div>
          </section>

          <section className="min-w-0 space-y-4 p-4 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-950 dark:text-white">{copy.admin.accessList}</h2>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{copy.admin.accessListDescription}</p>
              </div>
              {engineLoading ? <Loader2 aria-label={copy.admin.loadingDetails} className="h-5 w-5 animate-spin text-slate-400" /> : null}
            </div>

            {accessList.length === 0 ? (
              <div className="rounded-[20px] border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
                <p className="font-bold text-slate-950 dark:text-white">{copy.admin.emptyTitle}</p>
                <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">{copy.admin.emptyDescription}</p>
              </div>
            ) : accessList.map(access => {
              const kiosk = kioskByAccessId.get(access.id);
              const accessStatus = effectiveStatus(access, kiosk);
              const revealedPin = revealedPins[access.id];
              const credentialOutcome = credentialOutcomes[access.id];
              const linkKey = `link-${access.id}`;
              const pinKey = `pin-${access.id}`;
              const isBusy = pendingAction?.endsWith(`-${access.id}`) ?? false;
              const canRotatePin = accessStatus === 'ACTIVE' || accessStatus === 'DISABLED';
              const canOpen = accessStatus === 'ACTIVE';
              const canEdit = Boolean(kiosk && (accessStatus === 'ACTIVE' || accessStatus === 'DISABLED'));
              const canRevoke = accessStatus === 'ACTIVE' || accessStatus === 'DISABLED';
              const canDelete = Boolean(kiosk && (accessStatus === 'REVOKED' || accessStatus === 'EXPIRED'));
              const details = kiosk ? detailsByKioskId[kiosk.id] : undefined;
              const portalUrl = revealedLinks[access.id] ?? '';

              return (
                <article key={access.id} className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-5">
                  <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_128px]">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-emerald-600" />
                        <h3 className="font-bold text-slate-950 dark:text-white">{kiosk?.name || access.providerName}</h3>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${statusClassName[accessStatus]}`}>
                          {copy.common.status[accessStatus]}
                        </span>
                        {kiosk ? <span className="rounded-full bg-sky-50 px-2 py-0.5 text-xs font-bold text-sky-700 dark:bg-sky-500/10 dark:text-sky-200">{copy.admin.engineBadge}</span> : null}
                      </div>
                      <p className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200">{access.providerName}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {kiosk?.publicTokenHint ? copy.admin.protectedLink(kiosk.publicTokenHint) : copy.admin.linkHidden}
                      </p>
                      {portalUrl ? <p className="mt-1 break-all text-xs font-semibold text-orange-700 dark:text-orange-200">{portalUrl}</p> : null}
                      <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">{formatExpiration(kiosk?.expiresAt ?? access.expiresAt)}</p>
                      {kiosk ? (
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                          <span>{copy.admin.configurationVersion(kiosk.configurationVersion)}</span>
                          <span>{copy.admin.scope}: {kiosk.businessName || kiosk.unitName || copy.admin.noScope}</span>
                          <span>{copy.admin.lastActivity}: {formatDateTime(kiosk.lastActivityAt, copy.admin.noActivity)}</span>
                        </div>
                      ) : !engineLoading ? (
                        <p className="mt-2 text-xs font-semibold text-amber-700 dark:text-amber-200">{copy.admin.advancedUnavailable}</p>
                      ) : null}

                      {credentialOutcome === 'reused' ? (
                        <div role="status" className="mt-3 rounded-2xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-800 dark:border-sky-900/50 dark:bg-sky-950/40 dark:text-sky-100">
                          {copy.admin.reusedCredential}
                        </div>
                      ) : null}
                      {revealedPin ? (
                        <div role="status" className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-[#FFB3AD] bg-[#FFF1EF] px-3 py-2 text-sm font-bold text-[#B63B32] dark:border-[#FF6B5E]/40 dark:bg-[#FF6B5E]/10 dark:text-[#FFC7C3]">
                          <span>{copy.admin.createdPin(revealedPin)}</span>
                          <button type="button" onClick={() => void copyValue(pinKey, revealedPin)} className="rounded-lg bg-white px-2 py-1 text-xs outline-none focus-visible:ring-2 focus-visible:ring-orange-400 dark:bg-slate-950">
                            {copiedKey === pinKey ? copy.common.copied : copy.admin.copyPin}
                          </button>
                          <button type="button" onClick={() => setRevealedPins(current => {
                            const next = { ...current };
                            delete next[access.id];
                            return next;
                          })} className="rounded-lg px-2 py-1 text-xs outline-none hover:bg-white/70 focus-visible:ring-2 focus-visible:ring-orange-400 dark:hover:bg-slate-950/70">
                            {copy.admin.hidePin}
                          </button>
                        </div>
                      ) : null}

                      {pendingPinRotationId === access.id ? (
                        <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
                          <p className="font-bold">{copy.admin.pinRotationWarning}</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button type="button" disabled={isBusy} onClick={() => void changePin(access)} className="min-h-10 rounded-lg bg-amber-600 px-3 text-xs font-bold text-white disabled:opacity-60">{copy.admin.confirmRotation}</button>
                            <button type="button" disabled={isBusy} onClick={() => setPendingPinRotationId(null)} className="min-h-10 rounded-lg border border-amber-200 bg-white px-3 text-xs font-bold text-amber-800 disabled:opacity-60 dark:bg-slate-950">{copy.common.cancel}</button>
                          </div>
                        </div>
                      ) : null}
                    </div>

                    {portalUrl ? (
                      <PortalQr alt={copy.admin.qrAlt(access.providerName)} errorMessage={copy.admin.qrError} linkLabel={copy.admin.downloadQr} url={portalUrl} />
                    ) : (
                      <div className="flex min-h-32 w-full flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-3 text-center dark:border-slate-700 dark:bg-slate-950 sm:w-32">
                        <QrCode aria-hidden="true" className="h-7 w-7 text-slate-400" />
                        <p className="mt-2 text-[11px] font-semibold leading-4 text-slate-500 dark:text-slate-400">{copy.admin.linkHidden}</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                    {portalUrl ? (
                      <button type="button" disabled={accessStatus === 'REVOKED'} onClick={() => void copyValue(linkKey, portalUrl)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-700 outline-none hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-orange-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                        <Copy className="h-4 w-4" />
                        {copiedKey === linkKey ? copy.common.copied : copy.admin.copyLink}
                      </button>
                    ) : null}
                    {canRotatePin && pendingPinRotationId !== access.id ? (
                      <button type="button" disabled={saving || Boolean(pendingAction)} onClick={() => {
                        setPendingRevocationId(null);
                        setPendingPinRotationId(access.id);
                      }} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#FFB3AD] px-3 text-xs font-bold text-[#B63B32] outline-none hover:bg-[#FFF1EF] focus-visible:ring-2 focus-visible:ring-orange-400 disabled:opacity-60 dark:border-[#FF6B5E]/40 dark:text-[#FFC7C3] dark:hover:bg-[#FF6B5E]/10">
                        <RefreshCw className="h-4 w-4" />
                        {copy.admin.rotatePin}
                      </button>
                    ) : null}
                    {accessStatus === 'ACTIVE' ? (
                      <button type="button" disabled={saving || Boolean(pendingAction)} onClick={() => void changeStatus(access, 'DISABLED')} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-700 outline-none hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-orange-400 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                        <Power className="h-4 w-4" />
                        {copy.admin.disable}
                      </button>
                    ) : null}
                    {accessStatus === 'DISABLED' ? (
                      <button type="button" disabled={saving || Boolean(pendingAction)} onClick={() => void changeStatus(access, 'ACTIVE')} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-emerald-200 px-3 text-xs font-bold text-emerald-700 outline-none hover:bg-emerald-50 focus-visible:ring-2 focus-visible:ring-emerald-400 disabled:opacity-60 dark:border-emerald-900/50 dark:text-emerald-200 dark:hover:bg-emerald-950/30">
                        <Power className="h-4 w-4" />
                        {copy.admin.enable}
                      </button>
                    ) : null}
                    {canRevoke && pendingRevocationId !== access.id ? (
                      <button type="button" disabled={saving || Boolean(pendingAction)} onClick={() => {
                        setActionError('');
                        setPendingPinRotationId(null);
                        setPendingRevocationId(access.id);
                      }} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-red-200 px-3 text-xs font-bold text-red-700 outline-none hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-red-400 disabled:opacity-60 dark:border-red-900/50 dark:text-red-200 dark:hover:bg-red-950/30">
                        <ShieldX className="h-4 w-4" />
                        {copy.admin.revoke}
                      </button>
                    ) : null}
                    {canEdit && kiosk ? (
                      <button type="button" disabled={saving || Boolean(pendingAction)} onClick={() => beginConfigurationEdit(access, kiosk)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-sky-200 px-3 text-xs font-bold text-sky-700 outline-none hover:bg-sky-50 focus-visible:ring-2 focus-visible:ring-sky-400 disabled:opacity-60 dark:border-sky-900/50 dark:text-sky-200 dark:hover:bg-sky-950/30">
                        <Pencil className="h-4 w-4" />
                        {copy.admin.configuration}
                      </button>
                    ) : null}
                    {kiosk ? (
                      <button type="button" disabled={saving || Boolean(pendingAction)} onClick={() => void toggleDetails(access, kiosk)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-violet-200 px-3 text-xs font-bold text-violet-700 outline-none hover:bg-violet-50 focus-visible:ring-2 focus-visible:ring-violet-400 disabled:opacity-60 dark:border-violet-900/50 dark:text-violet-200 dark:hover:bg-violet-950/30">
                        <History className="h-4 w-4" />
                        {expandedAccessId === access.id ? copy.admin.hideDetails : copy.admin.details}
                      </button>
                    ) : null}
                    {canDelete ? (
                      <button type="button" disabled={saving || Boolean(pendingAction)} onClick={() => {
                        setActionError('');
                        setDeleteReason('');
                        setPendingDeleteAccess(access);
                      }} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-red-300 px-3 text-xs font-bold text-red-800 outline-none hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-red-400 disabled:opacity-60 dark:border-red-800 dark:text-red-200 dark:hover:bg-red-950/30">
                        <Trash2 className="h-4 w-4" />
                        {copy.admin.permanentDelete}
                      </button>
                    ) : null}
                    {canOpen && portalUrl ? (
                      <a href={portalUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-slate-950 px-3 text-xs font-bold text-white outline-none focus-visible:ring-2 focus-visible:ring-orange-400 dark:bg-white dark:text-slate-950">
                        <ExternalLink className="h-4 w-4" />
                        {copy.admin.open}
                      </a>
                    ) : null}
                  </div>

                  {editingAccessId === access.id && kiosk ? (
                    <section className="mt-4 rounded-2xl border border-sky-200 bg-sky-50/70 p-4 dark:border-sky-900/50 dark:bg-sky-950/20" aria-label={copy.admin.configuration}>
                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="block space-y-2">
                          <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{copy.admin.kioskName}</span>
                          <input value={editName} maxLength={180} onChange={event => setEditName(event.target.value)} className="h-11 w-full rounded-xl border border-sky-200 bg-white px-3 text-sm font-semibold text-slate-950 outline-none focus-visible:ring-2 focus-visible:ring-sky-400 dark:border-sky-800 dark:bg-slate-950 dark:text-white" />
                        </label>
                        <div>
                          <label className="flex min-h-11 items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                            <input type="checkbox" checked={editNeverExpires} onChange={event => setEditNeverExpires(event.target.checked)} className="h-4 w-4 rounded border-slate-300" />
                            {copy.admin.neverExpires}
                          </label>
                          {!editNeverExpires ? (
                            <input type="datetime-local" aria-label={copy.admin.validity} value={editExpiresAt} min={toLocalDateTime(new Date().toISOString())} onChange={event => setEditExpiresAt(event.target.value)} className="h-11 w-full rounded-xl border border-sky-200 bg-white px-3 text-sm font-semibold text-slate-950 outline-none focus-visible:ring-2 focus-visible:ring-sky-400 dark:border-sky-800 dark:bg-slate-950 dark:text-white" />
                          ) : null}
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button type="button" disabled={!editName.trim() || Boolean(pendingAction)} onClick={() => void saveConfiguration(access, kiosk)} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-sky-700 px-4 text-xs font-bold text-white disabled:opacity-60">
                          {pendingAction === `config-${access.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                          {copy.admin.saveConfiguration}
                        </button>
                        <button type="button" disabled={Boolean(pendingAction)} onClick={() => setEditingAccessId(null)} className="min-h-10 rounded-xl border border-sky-200 bg-white px-4 text-xs font-bold text-sky-800 disabled:opacity-60 dark:border-sky-800 dark:bg-slate-950 dark:text-sky-200">{copy.common.cancel}</button>
                      </div>
                    </section>
                  ) : null}

                  {expandedAccessId === access.id && kiosk ? (
                    <section className="mt-4 grid gap-4 rounded-2xl border border-violet-200 bg-violet-50/60 p-4 dark:border-violet-900/50 dark:bg-violet-950/20 lg:grid-cols-2" aria-label={copy.admin.details}>
                      {details?.loading ? (
                        <div className="col-span-full flex min-h-24 items-center justify-center gap-2 text-sm font-semibold text-violet-700 dark:text-violet-200">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          {copy.admin.loadingDetails}
                        </div>
                      ) : (
                        <>
                          <div>
                            <h4 className="flex items-center gap-2 text-sm font-bold text-slate-950 dark:text-white"><Users className="h-4 w-4" />{copy.admin.grants}</h4>
                            <div className="mt-2 space-y-2">
                              {details?.grants.length ? details.grants.map(grant => (
                                <div key={grant.id} className="rounded-xl border border-violet-100 bg-white p-3 text-xs dark:border-violet-900/40 dark:bg-slate-950">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <span className="font-bold text-slate-900 dark:text-white">{copy.admin.providerGrant} #{grant.identityId}</span>
                                    <span className={grant.status === 'ACTIVE' ? 'font-bold text-emerald-600 dark:text-emerald-300' : 'font-bold text-red-600 dark:text-red-300'}>{grant.status}</span>
                                  </div>
                                  <p className="mt-1 text-slate-500 dark:text-slate-400">{copy.admin.capability}: {grant.capabilityKey} · {formatDateTime(grant.createdAt)}</p>
                                </div>
                              )) : <p className="rounded-xl border border-dashed border-violet-200 p-3 text-xs font-semibold text-slate-500 dark:border-violet-900/50 dark:text-slate-400">{copy.admin.noGrants}</p>}
                            </div>
                          </div>
                          <div>
                            <h4 className="flex items-center gap-2 text-sm font-bold text-slate-950 dark:text-white"><History className="h-4 w-4" />{copy.admin.audit}</h4>
                            <div className="mt-2 max-h-64 space-y-2 overflow-y-auto pr-1">
                              {details?.audit.length ? details.audit.map(event => (
                                <div key={`${event.eventId}-${event.createdAt}`} className="rounded-xl border border-violet-100 bg-white p-3 text-xs dark:border-violet-900/40 dark:bg-slate-950">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <span className="font-bold text-slate-900 dark:text-white">{event.eventType}</span>
                                    <span className="font-bold text-violet-700 dark:text-violet-200">{event.outcome}</span>
                                  </div>
                                  <p className="mt-1 text-slate-500 dark:text-slate-400">{formatDateTime(event.createdAt)} · {copy.admin.actor(event.actorType || copy.admin.systemActor, event.actorId)}</p>
                                </div>
                              )) : <p className="rounded-xl border border-dashed border-violet-200 p-3 text-xs font-semibold text-slate-500 dark:border-violet-900/50 dark:text-slate-400">{copy.admin.noAudit}</p>}
                            </div>
                          </div>
                        </>
                      )}
                    </section>
                  ) : null}
                </article>
              );
            })}
          </section>
        </div>
    </PosModalFrame>
  );
}
