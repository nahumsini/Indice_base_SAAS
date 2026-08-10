import {
  Ban,
  Building2,
  Copy,
  ExternalLink,
  KeyRound,
  Link2,
  MonitorSmartphone,
  MoreHorizontal,
  Pencil,
  Plus,
  Power,
  QrCode,
  RefreshCw,
  Save,
  Share2,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { KioskModalFrame } from '../../../components/kiosk-engine/KioskModalFrame';
import { KioskAdminActionButton, KioskAdminPanelAction } from '../../../components/kiosk-engine/KioskAdminPrimitives';
import { IndiceModalSummary, IndiceModalValidation } from '../../../components/indice-modal';
import { Button } from '../../../components/ui/button';
import { useLanguage } from '../../../shared/context';
import type { ProcessBusinessOption, ProcessUnitOption } from '../Processes/types';
import { TaskKioskSecurityPanel } from './components/TaskKioskSecurityPanel';
import { useTaskKioskQrCode } from './hooks/useTaskKioskQrCode';
import { useTaskKioskTranslations } from './hooks/useTaskKioskTranslations';
import type { ProcessTaskKiosk, ProcessTaskKioskPayload } from './processTaskKioskApi';
import type { TaskKioskTranslations } from './translations/types';

interface TaskKioskManagementModalProps {
  isOpen: boolean;
  isSaving: boolean;
  kiosks: ProcessTaskKiosk[];
  unitOptions: ProcessUnitOption[];
  businessOptions: ProcessBusinessOption[];
  onClose: () => void;
  onSave: (payload: ProcessTaskKioskPayload, kioskId?: number) => Promise<void> | void;
  onDelete: (kiosk: ProcessTaskKiosk) => Promise<void> | void;
  onCopy: (kiosk: ProcessTaskKiosk) => void;
  onOpen: (kiosk: ProcessTaskKiosk) => void;
  onRotate: (kiosk: ProcessTaskKiosk) => Promise<void> | void;
  onTransition: (kiosk: ProcessTaskKiosk, transition: 'disable' | 'enable' | 'revoke') => Promise<void> | void;
}

const inputClassName = 'mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-950 shadow-none outline-none transition focus:border-[#F4C84A] focus:ring-2 focus:ring-[#F4C84A]/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white';
const labelClassName = 'text-sm font-medium text-slate-700 dark:text-slate-200';

function createDefaultForm(): ProcessTaskKioskPayload {
  return { name: '', code: '', status: 'active', expires_at: null, unit_id: null, business_id: null, metadata: { notes: '', kiosk_type: 'task_access' } };
}

function referenceFromName(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48);
}

function formFromKiosk(kiosk: ProcessTaskKiosk): ProcessTaskKioskPayload {
  return {
    name: kiosk.name,
    code: kiosk.code,
    status: kiosk.status,
    expires_at: kiosk.expires_at,
    unit_id: kiosk.unit_id,
    business_id: kiosk.business_id,
    metadata: { ...(kiosk.metadata ?? {}), kiosk_type: 'task_access' },
  };
}

function kioskSaveErrorMessage(error: unknown, copy: TaskKioskTranslations['admin']['errors']) {
  const message = error instanceof Error ? error.message : '';
  if (/unauthorized|401/i.test(message)) return copy.sessionExpired;
  if (/forbidden|403/i.test(message)) return copy.forbidden;
  return message || copy.save;
}

export function TaskKioskManagementModal({
  isOpen,
  isSaving,
  kiosks,
  unitOptions,
  businessOptions,
  onClose,
  onSave,
  onDelete,
  onCopy,
  onOpen,
  onRotate,
  onTransition,
}: TaskKioskManagementModalProps) {
  const copy = useTaskKioskTranslations();
  const { currentLanguage } = useLanguage();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingKioskId, setEditingKioskId] = useState<number | undefined>();
  const [form, setForm] = useState<ProcessTaskKioskPayload>(() => createDefaultForm());
  const [editorError, setEditorError] = useState<string | null>(null);
  const [qrKioskId, setQrKioskId] = useState<number | null>(null);
  const [securityKioskId, setSecurityKioskId] = useState<number | null>(null);
  const [shareKioskId, setShareKioskId] = useState<number | null>(null);
  const [optionsKioskId, setOptionsKioskId] = useState<number | null>(null);

  const activeCount = kiosks.filter((kiosk) => kiosk.engine_status === 'ACTIVE').length;
  const readyCount = kiosks.filter((kiosk) => Boolean(kiosk.public_token_hint)).length;
  const qrKiosk = kiosks.find((kiosk) => kiosk.id === qrKioskId) ?? null;
  const securityKiosk = kiosks.find((kiosk) => kiosk.id === securityKioskId) ?? null;
  const shareKiosk = kiosks.find((kiosk) => kiosk.id === shareKioskId) ?? null;
  const optionsKiosk = kiosks.find((kiosk) => kiosk.id === optionsKioskId) ?? null;
  const qrDataUrl = useTaskKioskQrCode(qrKiosk?.public_access_token ?? '');
  const childViewOpen = isEditorOpen || Boolean(qrKiosk) || Boolean(securityKiosk) || Boolean(shareKiosk) || Boolean(optionsKiosk);
  const availableBusinesses = useMemo(
    () => businessOptions.filter((business) => !form.unit_id || business.unitId === form.unit_id),
    [businessOptions, form.unit_id],
  );
  const selectedContext = useMemo(() => {
    if (form.business_id) {
      const name = availableBusinesses.find((business) => business.id === form.business_id)?.name ?? copy.admin.context.businessFallback;
      return copy.admin.context.selectedBusiness(name);
    }
    if (form.unit_id) {
      const name = unitOptions.find((unit) => unit.id === form.unit_id)?.name ?? copy.admin.context.unitFallback;
      return copy.admin.context.selectedUnit(name);
    }
    return copy.admin.context.required;
  }, [availableBusinesses, copy.admin.context, form.business_id, form.unit_id, unitOptions]);

  const closeEditor = () => {
    setIsEditorOpen(false);
    setEditingKioskId(undefined);
    setEditorError(null);
    setForm(createDefaultForm());
  };
  const handleStartCreate = () => {
    setQrKioskId(null);
    setSecurityKioskId(null);
    setShareKioskId(null);
    setOptionsKioskId(null);
    setEditingKioskId(undefined);
    setEditorError(null);
    setForm({ ...createDefaultForm(), name: copy.admin.editor.defaultName, code: `task-access-${Math.random().toString(36).slice(2, 7)}` });
    setIsEditorOpen(true);
  };
  const handleStartEdit = (kiosk: ProcessTaskKiosk) => {
    setQrKioskId(null);
    setSecurityKioskId(null);
    setShareKioskId(null);
    setOptionsKioskId(null);
    setEditingKioskId(kiosk.id);
    setEditorError(null);
    setForm(formFromKiosk(kiosk));
    setIsEditorOpen(true);
  };
  const handleNameChange = (name: string) => {
    setForm((current) => {
      const shouldSyncCode = !current.code || current.code === referenceFromName(current.name);
      return { ...current, name, code: shouldSyncCode ? referenceFromName(name) : current.code };
    });
  };
  const handleSubmit = async () => {
    const payload: ProcessTaskKioskPayload = {
      ...form,
      name: form.name.trim(),
      code: form.code.trim(),
      expires_at: form.expires_at || null,
      unit_id: form.unit_id ?? null,
      business_id: form.business_id ?? null,
      metadata: { ...(form.metadata ?? {}), kiosk_type: 'task_access' },
    };
    if (!payload.name || !payload.code || !payload.unit_id || !payload.business_id) {
      setEditorError(copy.admin.errors.required);
      return;
    }
    setEditorError(null);
    try {
      await onSave(payload, editingKioskId);
      closeEditor();
    } catch (error) {
      setEditorError(kioskSaveErrorMessage(error, copy.admin.errors));
    }
  };
  const handleClose = () => {
    closeEditor();
    setQrKioskId(null);
    setSecurityKioskId(null);
    setShareKioskId(null);
    setOptionsKioskId(null);
    onClose();
  };
  const canSave = Boolean(form.name.trim() && form.code.trim() && form.unit_id && form.business_id) && !isSaving;

  return (
    <>
      <KioskModalFrame
        busy={isSaving}
        closeLabel={copy.admin.center.closeLabel}
        description={copy.admin.center.description}
        footer={<Button type="button" variant="outline" onClick={handleClose}>{copy.admin.center.close}</Button>}
        footerSummary={copy.admin.center.summary(activeCount, readyCount)}
        icon={<MonitorSmartphone className="h-5 w-5" />}
        onOpenChange={(nextOpen) => { if (!nextOpen) handleClose(); }}
        open={isOpen && !childViewOpen}
        size="workspace"
        surface="administration"
        title={copy.admin.center.title}
        tone="yellow"
      >
        <div className="space-y-4">
          <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-slate-700 dark:bg-slate-900">
            <div className="min-w-0">
              <h3 className="text-sm font-medium text-slate-950 dark:text-white">{copy.admin.center.accessTitle}</h3>
              <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">{copy.admin.center.accessDescription}</p>
            </div>
            <Button type="button" className="h-10 rounded-xl bg-[#F4C84A] px-4 text-[#5F4500] hover:bg-[#E5B835]" onClick={handleStartCreate}>
              <Plus className="h-4 w-4" />
              {copy.admin.center.create}
            </Button>
          </section>

          <IndiceModalSummary
            columns={3}
            items={[
              { label: copy.admin.center.total, value: kiosks.length, emphasized: true },
              { label: copy.admin.center.active, value: activeCount },
              { label: copy.admin.center.issued, value: readyCount },
            ]}
          />

          {kiosks.length ? (
            <div className="grid gap-3">
              {kiosks.map((kiosk) => {
                const isTerminal = kiosk.engine_status === 'REVOKED' || kiosk.engine_status === 'EXPIRED' || kiosk.engine_status === 'DELETED';
                return (
                  <article key={kiosk.id} className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-[#F4C84A]/60 hover:shadow-md dark:border-slate-700 dark:bg-slate-900">
                    <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex min-w-0 items-start gap-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F4C84A]/18 text-[#8A6200]">
                          <MonitorSmartphone className="h-5 w-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 flex-wrap items-center gap-2">
                            <h3 className="min-w-0 truncate text-sm font-medium text-slate-950 dark:text-white">{kiosk.name}</h3>
                            <span className={kioskStatusClassName(kiosk.engine_status)}>{copy.admin.state[kiosk.engine_status]}</span>
                            {kiosk.expires_at ? <span className="rounded-full bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-800">{copy.admin.center.expires(new Date(kiosk.expires_at).toLocaleString(currentLanguage.code))}</span> : null}
                          </div>
                          <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-slate-500">
                            <span className="inline-flex min-w-0 max-w-full items-center gap-1.5"><Building2 className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{kiosk.scope_label}</span></span>
                            <span aria-hidden="true" className="text-slate-300">·</span>
                            <span className="max-w-full truncate">{kiosk.code}</span>
                            <span className={kiosk.public_access_token ? 'rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700' : kiosk.public_token_hint ? 'rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-800' : 'rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500'}>
                              {kiosk.public_access_token ? copy.admin.center.linkAvailable : kiosk.public_token_hint ? copy.admin.center.linkProtected : copy.admin.center.linkMissing}
                            </span>
                            {kiosk.public_token_hint ? <Link2 className="h-3 w-3 text-slate-400" /> : null}
                          </div>
                        </div>
                      </div>

                      <div className="grid shrink-0 grid-cols-4 gap-2 sm:flex sm:flex-wrap sm:justify-end" aria-label={copy.admin.center.actions(kiosk.name)}>
                        <KioskActionButton label={copy.admin.center.edit} tone="primary" disabled={isTerminal} onClick={() => handleStartEdit(kiosk)}><Pencil className="h-4 w-4" /></KioskActionButton>
                        <KioskActionButton label={copy.admin.center.open} disabled={kiosk.engine_status !== 'ACTIVE'} onClick={() => kiosk.public_access_token ? onOpen(kiosk) : setShareKioskId(kiosk.id)}><ExternalLink className="h-4 w-4" /></KioskActionButton>
                        <KioskActionButton label={copy.admin.center.share} disabled={isTerminal && !kiosk.public_access_token} onClick={() => setShareKioskId(kiosk.id)}><Share2 className="h-4 w-4" /></KioskActionButton>
                        <KioskActionButton label={copy.admin.center.more} onClick={() => setOptionsKioskId(kiosk.id)}><MoreHorizontal className="h-4 w-4" /></KioskActionButton>
                      </div>
                    </div>

                    <div className="mt-3 flex min-w-0 items-start gap-2 border-t border-slate-100 pt-3 text-xs leading-5 text-slate-500 dark:border-slate-800">
                      <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                      <span>{copy.admin.center.visibility}</span>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-900">
              <MonitorSmartphone className="mx-auto h-10 w-10 text-[#9A6B05]" />
              <p className="mt-4 font-medium">{copy.admin.center.emptyTitle}</p>
              <p className="mt-2 text-sm text-slate-500">{copy.admin.center.emptyDescription}</p>
            </div>
          )}
        </div>
      </KioskModalFrame>

      <KioskModalFrame
        busy={isSaving}
        closeLabel={copy.admin.editor.closeLabel}
        description={copy.admin.editor.description}
        footer={(
          <>
            <Button type="button" variant="outline" disabled={isSaving} onClick={closeEditor}>{copy.admin.editor.cancel}</Button>
            <Button type="button" disabled={!canSave} onClick={() => void handleSubmit()}>
              <Save className="h-4 w-4" />
              {isSaving ? copy.admin.editor.saving : editingKioskId ? copy.admin.editor.save : copy.admin.editor.create}
            </Button>
          </>
        )}
        footerSummary={selectedContext}
        icon={<MonitorSmartphone className="h-5 w-5" />}
        onOpenChange={(nextOpen) => { if (!nextOpen) closeEditor(); }}
        open={isOpen && isEditorOpen}
        size="form"
        surface="administration"
        title={editingKioskId ? copy.admin.editor.editTitle : copy.admin.editor.createTitle}
        tone="yellow"
      >
        <div className="mx-auto grid w-full max-w-2xl gap-4">
          <IndiceModalValidation messages={editorError ? [editorError] : []} />
          <Field label={copy.admin.editor.name}>
            <input value={form.name} placeholder={copy.admin.editor.namePlaceholder} className={inputClassName} disabled={isSaving} onChange={(event) => handleNameChange(event.target.value)} />
          </Field>
          <Field label={copy.admin.editor.reference}>
            <input value={form.code} placeholder={copy.admin.editor.referencePlaceholder} className={inputClassName} disabled={isSaving} onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={copy.admin.editor.unit}>
              <select value={form.unit_id ?? ''} className={inputClassName} disabled={isSaving} onChange={(event) => setForm((current) => ({ ...current, unit_id: event.target.value ? Number(event.target.value) : null, business_id: null }))}>
                <option value="">{copy.admin.editor.selectUnit}</option>
                {unitOptions.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
              </select>
            </Field>
            <Field label={copy.admin.editor.business}>
              <select value={form.business_id ?? ''} disabled={!form.unit_id || isSaving} className={inputClassName} onChange={(event) => setForm((current) => ({ ...current, business_id: event.target.value ? Number(event.target.value) : null }))}>
                <option value="">{copy.admin.editor.selectBusiness}</option>
                {availableBusinesses.map((business) => <option key={business.id} value={business.id}>{business.name}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={copy.admin.editor.status}>
              <select value={form.status} className={inputClassName} disabled={isSaving} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as ProcessTaskKioskPayload['status'] }))}>
                <option value="active">{copy.admin.editor.active}</option>
                <option value="inactive">{copy.admin.editor.inactive}</option>
              </select>
            </Field>
            <Field label={copy.admin.editor.expiration}>
              <input type="datetime-local" value={form.expires_at?.slice(0, 16) ?? ''} className={inputClassName} disabled={isSaving} onChange={(event) => setForm((current) => ({ ...current, expires_at: event.target.value || null }))} />
            </Field>
          </div>
          <IndiceModalValidation tone="info" title={copy.admin.editor.visibility} messages={[selectedContext]} />
        </div>
      </KioskModalFrame>

      <KioskModalFrame
        closeLabel={copy.admin.share.closeLabel}
        description={shareKiosk ? copy.admin.share.description(shareKiosk.name) : copy.admin.share.fallback}
        footer={<Button type="button" variant="outline" onClick={() => setShareKioskId(null)}>{copy.admin.share.close}</Button>}
        icon={<Share2 className="h-5 w-5" />}
        onOpenChange={(nextOpen) => { if (!nextOpen) setShareKioskId(null); }}
        open={isOpen && Boolean(shareKiosk)}
        size="compact"
        surface="administration"
        title={copy.admin.share.title}
        tone="yellow"
      >
        {shareKiosk ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F4C84A]/20 text-[#7A5700]">
                  <Link2 className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-950 dark:text-white">{shareKiosk.name}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{shareKiosk.scope_label}</p>
                </div>
              </div>
            </div>

            {shareKiosk.public_access_token ? (
              <>
                <IndiceModalValidation
                  tone="info"
                  title={copy.admin.share.availableTitle}
                  messages={[copy.admin.share.availableMessage]}
                />
                <div className="grid gap-2">
                  <KioskPanelAction icon={<ExternalLink className="h-4 w-4" />} label={copy.admin.share.open} onClick={() => onOpen(shareKiosk)} primary />
                  <KioskPanelAction icon={<Copy className="h-4 w-4" />} label={copy.admin.share.copy} onClick={() => onCopy(shareKiosk)} />
                  <KioskPanelAction
                    icon={<QrCode className="h-4 w-4" />}
                    label={copy.admin.share.qr}
                    onClick={() => {
                      setShareKioskId(null);
                      setQrKioskId(shareKiosk.id);
                    }}
                  />
                  {!isTerminalKiosk(shareKiosk) ? (
                    <KioskPanelAction
                      icon={<RefreshCw className="h-4 w-4" />}
                      label={copy.admin.share.replace}
                      onClick={() => {
                        setShareKioskId(null);
                        void onRotate(shareKiosk);
                      }}
                    />
                  ) : null}
                </div>
              </>
            ) : (
              <>
                <IndiceModalValidation
                  tone="warning"
                  title={shareKiosk.public_token_hint ? copy.admin.share.protectedTitle : copy.admin.share.unavailableTitle}
                  messages={[
                    shareKiosk.public_token_hint
                      ? copy.admin.share.protectedMessage
                      : copy.admin.share.unavailableMessage,
                  ]}
                />
                {!isTerminalKiosk(shareKiosk) ? (
                  <KioskPanelAction
                    icon={<RefreshCw className="h-4 w-4" />}
                    label={shareKiosk.public_token_hint ? copy.admin.share.replaceAndIssue : copy.admin.share.issue}
                    onClick={() => {
                      setShareKioskId(null);
                      void onRotate(shareKiosk);
                    }}
                    primary
                  />
                ) : (
                  <p className="rounded-2xl bg-slate-100 p-4 text-sm leading-5 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {copy.admin.share.terminal}
                  </p>
                )}
              </>
            )}
          </div>
        ) : null}
      </KioskModalFrame>

      <KioskModalFrame
        closeLabel={copy.admin.options.closeLabel}
        description={optionsKiosk ? copy.admin.options.description(optionsKiosk.name) : copy.admin.options.fallback}
        footer={<Button type="button" variant="outline" onClick={() => setOptionsKioskId(null)}>{copy.admin.options.close}</Button>}
        icon={<MoreHorizontal className="h-5 w-5" />}
        onOpenChange={(nextOpen) => { if (!nextOpen) setOptionsKioskId(null); }}
        open={isOpen && Boolean(optionsKiosk)}
        size="compact"
        surface="administration"
        title={copy.admin.options.title}
        tone="yellow"
      >
        {optionsKiosk ? (
          <div className="space-y-3">
            <KioskPanelAction
              description={copy.admin.options.securityDescription}
              icon={<KeyRound className="h-4 w-4" />}
              label={copy.admin.options.security}
              onClick={() => {
                setOptionsKioskId(null);
                setSecurityKioskId(optionsKiosk.id);
              }}
            />

            {optionsKiosk.engine_status === 'ACTIVE' ? (
              <KioskPanelAction
                description={copy.admin.options.pauseDescription}
                icon={<Power className="h-4 w-4" />}
                label={copy.admin.options.pause}
                onClick={() => {
                  setOptionsKioskId(null);
                  void onTransition(optionsKiosk, 'disable');
                }}
              />
            ) : null}

            {optionsKiosk.engine_status === 'DISABLED' ? (
              <KioskPanelAction
                description={copy.admin.options.reactivateDescription}
                icon={<Power className="h-4 w-4" />}
                label={copy.admin.options.reactivate}
                onClick={() => {
                  setOptionsKioskId(null);
                  void onTransition(optionsKiosk, 'enable');
                }}
                primary
              />
            ) : null}

            {optionsKiosk.engine_status === 'ACTIVE' || optionsKiosk.engine_status === 'DISABLED' ? (
              <KioskPanelAction
                danger
                description={copy.admin.options.revokeDescription}
                icon={<Ban className="h-4 w-4" />}
                label={copy.admin.options.revoke}
                onClick={() => {
                  setOptionsKioskId(null);
                  void onTransition(optionsKiosk, 'revoke');
                }}
              />
            ) : null}

            <KioskPanelAction
              danger
              description={copy.admin.options.deleteDescription}
              icon={<Trash2 className="h-4 w-4" />}
              label={copy.admin.options.delete}
              onClick={() => {
                setOptionsKioskId(null);
                void onDelete(optionsKiosk);
              }}
            />
          </div>
        ) : null}
      </KioskModalFrame>

      <KioskModalFrame
        closeLabel={copy.admin.qr.closeLabel}
        description={qrKiosk ? copy.admin.qr.description(qrKiosk.name) : copy.admin.qr.fallback}
        footer={<Button type="button" variant="outline" onClick={() => setQrKioskId(null)}>{copy.admin.qr.close}</Button>}
        icon={<QrCode className="h-5 w-5" />}
        onOpenChange={(nextOpen) => { if (!nextOpen) setQrKioskId(null); }}
        open={isOpen && Boolean(qrKiosk)}
        size="compact"
        surface="administration"
        title={copy.admin.qr.title}
        tone="yellow"
      >
        <div className="flex flex-col items-center text-center">
          {qrDataUrl ? <img src={qrDataUrl} alt={copy.admin.qr.alt(qrKiosk?.name ?? '')} className="h-56 w-56 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm" /> : <p className="py-16 text-sm font-medium text-slate-600">{copy.admin.qr.generating}</p>}
          <p className="mt-4 text-xs leading-5 text-slate-500">{copy.admin.qr.note}</p>
        </div>
      </KioskModalFrame>

      <KioskModalFrame
        closeLabel={copy.admin.security.closeLabel}
        description={securityKiosk ? copy.admin.security.description(securityKiosk.name) : copy.admin.security.fallback}
        footer={<Button type="button" variant="outline" onClick={() => setSecurityKioskId(null)}>{copy.admin.security.close}</Button>}
        icon={<KeyRound className="h-5 w-5" />}
        onOpenChange={(nextOpen) => { if (!nextOpen) setSecurityKioskId(null); }}
        open={isOpen && Boolean(securityKiosk)}
        size="form"
        surface="administration"
        title={copy.admin.security.title}
        tone="yellow"
      >
        {securityKiosk ? <TaskKioskSecurityPanel embedded kiosk={securityKiosk} onClose={() => setSecurityKioskId(null)} /> : null}
      </KioskModalFrame>
    </>
  );
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  return <label className={labelClassName}>{label}{children}</label>;
}

function KioskActionButton({
  children,
  disabled,
  label,
  onClick,
  tone = 'neutral',
}: {
  children: ReactNode;
  disabled?: boolean;
  label: string;
  onClick: () => void;
  tone?: 'danger' | 'neutral' | 'primary';
}) {
  return (
    <KioskAdminActionButton accent="yellow" disabled={disabled} label={label} onClick={onClick} tone={tone}>
      {children}
    </KioskAdminActionButton>
  );
}

function KioskPanelAction({
  danger = false,
  description,
  icon,
  label,
  onClick,
  primary = false,
}: {
  danger?: boolean;
  description?: string;
  icon: ReactNode;
  label: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return <KioskAdminPanelAction accent="yellow" danger={danger} description={description} icon={icon} label={label} onClick={onClick} primary={primary} />;
}

function kioskStatusClassName(status: ProcessTaskKiosk['engine_status']) {
  if (status === 'ACTIVE') return 'rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700';
  if (status === 'DISABLED') return 'rounded-full bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-800';
  return 'rounded-full bg-red-50 px-2 py-1 text-[11px] font-medium text-red-700';
}

function isTerminalKiosk(kiosk: ProcessTaskKiosk) {
  return kiosk.engine_status === 'REVOKED' || kiosk.engine_status === 'EXPIRED' || kiosk.engine_status === 'DELETED';
}
