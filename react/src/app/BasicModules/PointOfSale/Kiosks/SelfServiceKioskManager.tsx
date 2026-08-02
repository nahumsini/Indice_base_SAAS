import { useEffect, useMemo, useState } from 'react';
import { Copy, ExternalLink, Link2, Pencil, Plus, Power, QrCode, RefreshCw, ShieldOff, Store, Trash2 } from 'lucide-react';
import {
  PosModalFrame,
  posModalModuleFooterClassName,
  posModalPrimaryActionClassName,
  posModalSecondaryActionClassName,
} from '../Sale/components/PosModalFrame';
import {
  selfServiceKioskApi,
  type PosCashRegisterOption,
  type SelfServiceKioskAdmin,
} from '../SelfServiceKiosk/selfServiceKioskApi';
import { usePointOfSaleKioskTranslations } from './kioskTranslations';

type FormState = {
  cashRegisterId: string;
  name: string;
  expiresAt: string;
  showStock: boolean;
  customerNameRequired: boolean;
  maxItemsPerTicket: number;
  preticketTtlMinutes: number;
};

type SensitiveAction = 'rotate' | 'revoke' | 'delete';
type PendingSensitiveAction = { action: SensitiveAction; kiosk: SelfServiceKioskAdmin };

const initialForm: FormState = {
  cashRegisterId: '',
  name: '',
  expiresAt: '',
  showStock: true,
  customerNameRequired: false,
  maxItemsPerTicket: 30,
  preticketTtlMinutes: 120,
};

const toLocalDateTimeInput = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};

export function SelfServiceKioskManager() {
  const { copy } = usePointOfSaleKioskTranslations();
  const [items, setItems] = useState<SelfServiceKioskAdmin[]>([]);
  const [registers, setRegisters] = useState<PosCashRegisterOption[]>([]);
  const [editing, setEditing] = useState<SelfServiceKioskAdmin | 'new' | null>(null);
  const [form, setForm] = useState<FormState>(initialForm);
  const [issuedLinks, setIssuedLinks] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingSensitiveAction | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [actionBusy, setActionBusy] = useState(false);
  const [error, setError] = useState('');

  const reload = async () => {
    setLoading(true);
    setError('');
    try {
      const [kiosks, cashRegisters] = await Promise.all([
        selfServiceKioskApi.listAdmin(),
        selfServiceKioskApi.listCashRegisters(),
      ]);
      setItems(kiosks);
      setRegisters(cashRegisters.filter((register) => register.active));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : copy.selfServiceAdmin.loadError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void reload(); }, []);

  const openCreate = () => {
    const first = registers[0];
    setForm({ ...initialForm, cashRegisterId: first ? String(first.id) : '', name: first ? copy.selfServiceAdmin.defaultName(first.name) : '' });
    setEditing('new');
  };

  const openEdit = (kiosk: SelfServiceKioskAdmin) => {
    setForm({
      cashRegisterId: String(kiosk.cashRegisterId),
      name: kiosk.name,
      expiresAt: toLocalDateTimeInput(kiosk.expiresAt),
      showStock: kiosk.showStock,
      customerNameRequired: kiosk.customerNameRequired,
      maxItemsPerTicket: kiosk.maxItemsPerTicket,
      preticketTtlMinutes: kiosk.preticketTtlMinutes,
    });
    setEditing(kiosk);
  };

  const save = async () => {
    const cashRegisterId = Number(form.cashRegisterId);
    if (!form.name.trim() || !cashRegisterId) {
      setError(copy.selfServiceAdmin.validation);
      return;
    }
    if (form.expiresAt && new Date(form.expiresAt).getTime() <= Date.now()) {
      setError(copy.selfServiceAdmin.expirationValidation);
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        name: form.name.trim(),
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
        showStock: form.showStock,
        customerNameRequired: form.customerNameRequired,
        maxItemsPerTicket: form.maxItemsPerTicket,
        preticketTtlMinutes: form.preticketTtlMinutes,
      };
      const saved = editing === 'new'
        ? await selfServiceKioskApi.createAdmin({ ...payload, cashRegisterId })
        : await selfServiceKioskApi.updateAdmin(editing as SelfServiceKioskAdmin, payload);
      if (saved.publicUrl) {
        setIssuedLinks((current) => ({ ...current, [saved.id]: saved.publicUrl! }));
      }
      setEditing(null);
      await reload();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : copy.selfServiceAdmin.saveError);
    } finally {
      setSaving(false);
    }
  };

  const transition = async (kiosk: SelfServiceKioskAdmin, status: 'ACTIVE' | 'DISABLED' | 'REVOKED') => {
    setError('');
    try {
      await selfServiceKioskApi.transition(kiosk.id, status, copy.selfServiceAdmin.administrationReason);
      await reload();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : copy.selfServiceAdmin.transitionError);
    }
  };

  const requestSensitiveAction = (kiosk: SelfServiceKioskAdmin, action: SensitiveAction) => {
    setActionReason('');
    setPendingAction({ kiosk, action });
  };

  const executeSensitiveAction = async () => {
    if (!pendingAction) return;
    setActionBusy(true);
    setError('');
    try {
      if (pendingAction.action === 'rotate') {
        const rotated = await selfServiceKioskApi.rotateLink(pendingAction.kiosk.id);
        if (rotated.publicUrl) {
          setIssuedLinks((current) => ({
            ...current,
            [pendingAction.kiosk.id]: rotated.publicUrl!,
          }));
        }
      } else {
        if (pendingAction.action === 'revoke') {
          await selfServiceKioskApi.transition(
            pendingAction.kiosk.id,
            'REVOKED',
            actionReason.trim() || copy.selfServiceAdmin.revocationReason,
          );
          setIssuedLinks((current) => {
            const next = { ...current };
            delete next[pendingAction.kiosk.id];
            return next;
          });
        } else {
          await selfServiceKioskApi.deleteAdmin(pendingAction.kiosk.id, actionReason.trim());
        }
      }
      setPendingAction(null);
      await reload();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : copy.selfServiceAdmin.actionError);
    } finally {
      setActionBusy(false);
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-teal-700">{copy.selfServiceAdmin.eyebrow}</p>
          <h2 className="mt-1 text-xl font-medium text-slate-950 dark:text-white">{copy.selfServiceAdmin.title}</h2>
          <p className="mt-1 text-sm text-slate-500">{copy.selfServiceAdmin.description}</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => void reload()} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium dark:border-slate-700 dark:bg-slate-950"><RefreshCw className="h-4 w-4" />{copy.common.update}</button>
          <button type="button" onClick={openCreate} disabled={registers.length === 0} className="inline-flex h-10 items-center gap-2 rounded-lg bg-teal-600 px-4 text-sm font-medium text-white disabled:opacity-50"><Plus className="h-4 w-4" />{copy.selfServiceAdmin.newKiosk}</button>
        </div>
      </div>

      {error ? <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div> : null}
      {loading ? <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm font-medium text-slate-500">{copy.selfServiceAdmin.loading}</div> : null}
      {!loading && items.length === 0 ? <div className="rounded-lg border border-dashed border-slate-300 p-10 text-center text-sm font-medium text-slate-500">{copy.selfServiceAdmin.empty}</div> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {items.map((kiosk) => (
          <article key={kiosk.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-lg bg-teal-100 text-teal-700"><Store className="h-5 w-5" /></span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2"><h3 className="truncate text-lg font-medium">{kiosk.name}</h3><StatusBadge status={kiosk.status} /></div>
                <p className="mt-1 text-sm text-slate-500">{kiosk.cashRegisterName} · {kiosk.code}</p>
              </div>
              {!['REVOKED', 'EXPIRED'].includes(kiosk.status) ? <button type="button" onClick={() => openEdit(kiosk)} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200" aria-label={copy.selfServiceAdmin.editKiosk(kiosk.name)}><Pencil className="h-4 w-4" /></button> : null}
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-900"><dt className="text-xs font-medium text-slate-500">{copy.selfServiceAdmin.limit}</dt><dd className="mt-1 font-medium">{kiosk.maxItemsPerTicket} {copy.selfServiceAdmin.products}</dd></div>
              <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-900"><dt className="text-xs font-medium text-slate-500">{copy.selfServiceAdmin.preticketValidity}</dt><dd className="mt-1 font-medium">{kiosk.preticketTtlMinutes} {copy.selfServiceAdmin.minutes}</dd></div>
            </dl>
            <p className="mt-3 text-xs font-medium text-slate-500">{copy.common.protectedLinkEnding} {kiosk.publicTokenHint}</p>
            {issuedLinks[kiosk.id] ? <IssuedLinkPanel path={issuedLinks[kiosk.id]} /> : null}
            <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
              {!['REVOKED', 'EXPIRED'].includes(kiosk.status) ? <button type="button" onClick={() => requestSensitiveAction(kiosk, 'rotate')} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 px-3 text-xs font-medium"><Link2 className="h-4 w-4" />{copy.selfServiceAdmin.rotateLink}</button> : null}
              {kiosk.status === 'ACTIVE' ? <button type="button" onClick={() => void transition(kiosk, 'DISABLED')} className="inline-flex h-9 items-center gap-2 rounded-lg border border-amber-300 px-3 text-xs font-medium text-amber-800"><Power className="h-4 w-4" />{copy.common.deactivate}</button> : null}
              {kiosk.status === 'DISABLED' ? <button type="button" onClick={() => void transition(kiosk, 'ACTIVE')} className="inline-flex h-9 items-center gap-2 rounded-lg border border-emerald-300 px-3 text-xs font-medium text-emerald-800"><Power className="h-4 w-4" />{copy.common.activate}</button> : null}
              {!['REVOKED', 'EXPIRED'].includes(kiosk.status) ? <button type="button" onClick={() => requestSensitiveAction(kiosk, 'revoke')} className="ml-auto inline-flex h-9 items-center gap-2 rounded-lg border border-red-200 px-3 text-xs font-medium text-red-700"><ShieldOff className="h-4 w-4" />{copy.common.revoke}</button> : null}
              {['REVOKED', 'EXPIRED'].includes(kiosk.status) ? <button type="button" onClick={() => requestSensitiveAction(kiosk, 'delete')} className="ml-auto inline-flex h-9 items-center gap-2 rounded-lg border border-red-200 px-3 text-xs font-medium text-red-700"><Trash2 className="h-4 w-4" />{copy.common.delete}</button> : null}
            </div>
          </article>
        ))}
      </div>

      {editing ? (
        <SelfServiceKioskFormModal
          editing={editing}
          form={form}
          registers={registers}
          saving={saving}
          setForm={setForm}
          onClose={() => setEditing(null)}
          onSave={() => void save()}
        />
      ) : null}
      {pendingAction ? (
        <SensitiveActionModal
          pending={pendingAction}
          reason={actionReason}
          busy={actionBusy}
          onReasonChange={setActionReason}
          onClose={() => setPendingAction(null)}
          onConfirm={() => void executeSensitiveAction()}
        />
      ) : null}
    </section>
  );
}

function SensitiveActionModal({ pending, reason, busy, onReasonChange, onClose, onConfirm }: {
  pending: PendingSensitiveAction;
  reason: string;
  busy: boolean;
  onReasonChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const { copy } = usePointOfSaleKioskTranslations();
  const revoking = pending.action === 'revoke';
  const deleting = pending.action === 'delete';
  const destructive = revoking || deleting;
  return (
    <PosModalFrame
      modalType="confirmation"
      closeLabel={copy.common.closeConfirmation}
      eyebrow={copy.common.engine}
      icon={deleting ? <Trash2 className="h-6 w-6" /> : revoking ? <ShieldOff className="h-6 w-6" /> : <Link2 className="h-6 w-6" />}
      isCloseDisabled={busy}
      onClose={onClose}
      subtitle={deleting
        ? copy.selfServiceAdmin.deleteDescription
        : revoking
          ? copy.selfServiceAdmin.revokeDescription
          : copy.selfServiceAdmin.rotateDescription}
      title={deleting ? copy.selfServiceAdmin.deleteTitle : revoking ? copy.selfServiceAdmin.revokeTitle : copy.selfServiceAdmin.rotateTitle}
      tone="coral"
      footerClassName={posModalModuleFooterClassName}
      footer={(
        <div className="flex gap-3">
          <button type="button" onClick={onClose} disabled={busy} className={posModalSecondaryActionClassName}>{copy.common.cancel}</button>
          <button type="button" onClick={onConfirm} disabled={busy} className={posModalPrimaryActionClassName}>
            {busy ? copy.common.processing : copy.common.confirm}
          </button>
        </div>
      )}
    >
      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{pending.kiosk.name}</p>
      {destructive ? (
        <label className="mt-4 block">
          <span className="mb-2 block text-sm font-medium">{copy.common.optionalReason}</span>
          <textarea value={reason} onChange={(event) => onReasonChange(event.target.value)} maxLength={500} className="min-h-24 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-900" />
        </label>
      ) : null}
    </PosModalFrame>
  );
}

function SelfServiceKioskFormModal({ editing, form, registers, saving, setForm, onClose, onSave }: {
  editing: SelfServiceKioskAdmin | 'new';
  form: FormState;
  registers: PosCashRegisterOption[];
  saving: boolean;
  setForm: (value: FormState) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const { copy } = usePointOfSaleKioskTranslations();
  const now = new Date();
  const minimumExpiration = new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
  return (
    <PosModalFrame
      modalType="standard-form"
      closeLabel={copy.selfServiceAdmin.closeConfiguration}
      eyebrow={copy.common.engine}
      icon={<Store className="h-6 w-6" />}
      isCloseDisabled={saving}
      onClose={onClose}
      subtitle={copy.selfServiceAdmin.formDescription}
      title={editing === 'new' ? copy.selfServiceAdmin.createTitle : copy.selfServiceAdmin.editTitle}
      tone="coral"
      footerClassName={posModalModuleFooterClassName}
      footer={<div className="flex gap-3"><button type="button" onClick={onClose} disabled={saving} className={posModalSecondaryActionClassName}>{copy.common.cancel}</button><button type="button" onClick={onSave} disabled={saving} className={posModalPrimaryActionClassName}>{saving ? copy.common.saving : copy.selfServiceAdmin.saveKiosk}</button></div>}
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="sm:col-span-2"><span className="mb-2 block text-sm font-medium">{copy.selfServiceAdmin.receivingRegister}</span><select disabled={editing !== 'new'} value={form.cashRegisterId} onChange={(event) => setForm({ ...form, cashRegisterId: event.target.value })} className="h-12 w-full rounded-lg border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-900">{registers.map((register) => <option key={register.id} value={register.id}>{register.name} · {register.warehouseName}</option>)}</select></label>
        <label className="sm:col-span-2"><span className="mb-2 block text-sm font-medium">{copy.selfServiceAdmin.publicName}</span><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} maxLength={180} className="h-12 w-full rounded-lg border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-900" /></label>
        <label><span className="mb-2 block text-sm font-medium">{copy.selfServiceAdmin.kioskExpiration}</span><input type="datetime-local" min={minimumExpiration} value={form.expiresAt} onChange={(event) => setForm({ ...form, expiresAt: event.target.value })} className="h-12 w-full rounded-lg border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-900" /></label>
        <label><span className="mb-2 block text-sm font-medium">{copy.selfServiceAdmin.preticketValidity}</span><input type="number" min={15} max={1440} value={form.preticketTtlMinutes} onChange={(event) => setForm({ ...form, preticketTtlMinutes: Number(event.target.value) })} className="h-12 w-full rounded-lg border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-900" /></label>
        <label><span className="mb-2 block text-sm font-medium">{copy.selfServiceAdmin.maximumProducts}</span><input type="number" min={1} max={100} value={form.maxItemsPerTicket} onChange={(event) => setForm({ ...form, maxItemsPerTicket: Number(event.target.value) })} className="h-12 w-full rounded-lg border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-900" /></label>
        <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"><label className="flex items-center gap-3 text-sm font-medium"><input type="checkbox" checked={form.showStock} onChange={(event) => setForm({ ...form, showStock: event.target.checked })} />{copy.selfServiceAdmin.showStock}</label><label className="flex items-center gap-3 text-sm font-medium"><input type="checkbox" checked={form.customerNameRequired} onChange={(event) => setForm({ ...form, customerNameRequired: event.target.checked })} />{copy.selfServiceAdmin.requiredName}</label></div>
      </div>
    </PosModalFrame>
  );
}

function IssuedLinkPanel({ path }: { path: string }) {
  const { copy } = usePointOfSaleKioskTranslations();
  const absoluteUrl = useMemo(() => new URL(path, window.location.origin).toString(), [path]);
  const [qr, setQr] = useState('');
  useEffect(() => {
    let active = true;
    void import('qrcode').then(({ default: QRCode }) => QRCode.toDataURL(absoluteUrl, { width: 220, margin: 2 })).then((value) => { if (active) setQr(value); });
    return () => { active = false; };
  }, [absoluteUrl]);
  return (
    <div className="mt-4 flex flex-col gap-3 rounded-lg border border-teal-200 bg-teal-50 p-4 sm:flex-row sm:items-center dark:bg-teal-950/20">
      {qr ? <img src={qr} alt={copy.selfServiceAdmin.qrAlt} className="h-24 w-24 rounded-md bg-white p-1" /> : <QrCode className="h-16 w-16 text-teal-700" />}
      <div className="min-w-0 flex-1"><p className="text-xs font-medium text-teal-800">{copy.selfServiceAdmin.oneTimeLink}</p><p className="mt-1 truncate text-xs text-teal-700">{absoluteUrl}</p><div className="mt-3 flex gap-2"><button type="button" onClick={() => void navigator.clipboard.writeText(absoluteUrl)} className="inline-flex h-9 items-center gap-2 rounded-lg bg-white px-3 text-xs font-medium text-teal-800"><Copy className="h-4 w-4" />{copy.selfServiceAdmin.copy}</button><a href={absoluteUrl} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-2 rounded-lg bg-teal-700 px-3 text-xs font-medium text-white"><ExternalLink className="h-4 w-4" />{copy.selfServiceAdmin.open}</a></div></div>
    </div>
  );
}

function StatusBadge({ status }: { status: SelfServiceKioskAdmin['status'] }) {
  const { copy } = usePointOfSaleKioskTranslations();
  const classes = status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : status === 'DISABLED' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800';
  const label = status === 'ACTIVE' ? copy.common.active : status === 'DISABLED' ? copy.common.disabled : status === 'EXPIRED' ? copy.common.expired : copy.common.revoked;
  return <span className={`rounded-full px-2 py-1 text-[11px] font-medium ${classes}`}>{label}</span>;
}
