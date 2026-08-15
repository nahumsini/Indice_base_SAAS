import { useEffect, useState } from 'react';
import { Monitor, Plus, Power, RefreshCw, ShieldOff, Trash2, Wifi, WifiOff } from 'lucide-react';
import {
  selfServiceKioskApi,
  type PosCashRegisterOption,
} from '../SelfServiceKiosk/selfServiceKioskApi';
import {
  customerDisplayApi,
  type CustomerDisplayAdminItem,
} from '../shared/customerDisplay/customerDisplayApi';
import {
  PosModalFrame,
  posModalModuleFooterClassName,
  posModalPrimaryActionClassName,
  posModalSecondaryActionClassName,
} from '../Sale/components/PosModalFrame';
import {
  type PointOfSaleKioskTranslations,
  usePointOfSaleKioskTranslations,
} from './kioskTranslations';
import { CustomerDisplaySetupModal } from './CustomerDisplaySetupModal';

type LifecycleAction = 'disable' | 'enable' | 'revoke' | 'delete';
type PendingAction = { action: LifecycleAction; kiosk: CustomerDisplayAdminItem };

/** Exportable workspace for the shared POS kiosk administration tab. */
export function CustomerDisplayManager({ startWithSetup = false }: { startWithSetup?: boolean }) {
  const { copy, locale } = usePointOfSaleKioskTranslations();
  const [items, setItems] = useState<CustomerDisplayAdminItem[]>([]);
  const [registers, setRegisters] = useState<PosCashRegisterOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [reason, setReason] = useState('');
  const [showSetup, setShowSetup] = useState(startWithSetup);

  const reload = async () => {
    setLoading(true);
    setError('');
    try {
      const [displays, cashRegisters] = await Promise.all([
        customerDisplayApi.listAdmin(),
        selfServiceKioskApi.listCashRegisters(),
      ]);
      setItems(displays);
      setRegisters(cashRegisters.filter((register) => register.active));
    } catch (requestError) {
      setError(requestError instanceof Error
        ? requestError.message
        : copy.customerDisplayAdmin.loadError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void reload(); }, []);

  const requestAction = (kiosk: CustomerDisplayAdminItem, action: LifecycleAction) => {
    setReason('');
    setPending({ kiosk, action });
  };

  const executeAction = async () => {
    if (!pending) return;
    setBusy(true);
    setError('');
    try {
      if (pending.action === 'delete') {
        await customerDisplayApi.deleteAdmin(pending.kiosk.id, reason);
      } else {
        await customerDisplayApi.transitionAdmin(pending.kiosk.id, pending.action, reason);
      }
      setPending(null);
      await reload();
    } catch (requestError) {
      setError(requestError instanceof Error
        ? requestError.message
        : copy.customerDisplayAdmin.transitionError);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-[#C74337]">{copy.customerDisplayAdmin.eyebrow}</p>
          <h2 className="mt-1 text-xl font-medium text-slate-950 dark:text-white">{copy.customerDisplayAdmin.title}</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
            {copy.customerDisplayAdmin.description}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void reload()}
            disabled={loading}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {copy.common.update}
          </button>
          <button
            type="button"
            onClick={() => setShowSetup(true)}
            disabled={loading || registers.length === 0}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#FF6B5E] px-4 text-sm font-medium text-[#222831] disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            {copy.customerDisplayAdmin.newDisplay}
          </button>
        </div>
      </div>

      {error ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
          {error}
        </div>
      ) : null}
      {loading ? (
        <div role="status" className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm font-medium text-slate-500 dark:border-slate-800 dark:bg-slate-950">
          {copy.customerDisplayAdmin.loading}
        </div>
      ) : null}
      {!loading && items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm font-medium text-slate-500 dark:border-slate-700">
          {copy.customerDisplayAdmin.empty}
        </div>
      ) : null}
      {!loading && registers.length === 0 ? (
        <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
          {copy.customerDisplayAdmin.registerRequired}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {items.map((kiosk) => (
          <article key={kiosk.id} className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#FF6B5E]/10 text-[#C74337]">
                <Monitor className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate text-lg font-medium">{kiosk.name}</h3>
                  <StatusBadge status={kiosk.status} copy={copy} />
                </div>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                  {kiosk.cashRegisterName} · {kiosk.cashRegisterCode}
                </p>
              </div>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
                <dt className="text-xs font-medium text-slate-500">{copy.customerDisplayAdmin.connection}</dt>
                <dd className="mt-1 flex items-center gap-2 font-medium">
                  {kiosk.connected ? <Wifi className="h-4 w-4 text-emerald-600" /> : <WifiOff className="h-4 w-4 text-slate-400" />}
                  {kiosk.connected ? copy.customerDisplayAdmin.online : copy.customerDisplayAdmin.inactive}
                </dd>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
                <dt className="text-xs font-medium text-slate-500">{copy.customerDisplayAdmin.lastActivity}</dt>
                <dd className="mt-1 font-medium">{formatDate(kiosk.lastSeenAt, locale, copy)}</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs font-medium text-slate-500">
              {copy.common.protectedLinkEnding} {kiosk.publicTokenHint}
            </p>

            <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
              {kiosk.status === 'ACTIVE' ? (
                <button type="button" onClick={() => requestAction(kiosk, 'disable')} className="inline-flex h-11 items-center gap-2 rounded-xl border border-amber-300 px-3 text-xs font-medium text-amber-800 dark:text-amber-200">
                  <Power className="h-4 w-4" />{copy.common.deactivate}
                </button>
              ) : null}
              {kiosk.status === 'DISABLED' ? (
                <button type="button" onClick={() => requestAction(kiosk, 'enable')} className="inline-flex h-11 items-center gap-2 rounded-xl border border-emerald-300 px-3 text-xs font-medium text-emerald-800 dark:text-emerald-200">
                  <Power className="h-4 w-4" />{copy.common.activate}
                </button>
              ) : null}
              {!['REVOKED', 'EXPIRED'].includes(kiosk.status) ? (
                <button type="button" onClick={() => requestAction(kiosk, 'revoke')} className="ml-auto inline-flex h-11 items-center gap-2 rounded-xl border border-red-200 px-3 text-xs font-medium text-red-700 dark:text-red-200">
                  <ShieldOff className="h-4 w-4" />{copy.common.revoke}
                </button>
              ) : null}
              {['REVOKED', 'EXPIRED'].includes(kiosk.status) ? (
                <button type="button" onClick={() => requestAction(kiosk, 'delete')} className="ml-auto inline-flex h-11 items-center gap-2 rounded-xl border border-red-200 px-3 text-xs font-medium text-red-700 dark:text-red-200">
                  <Trash2 className="h-4 w-4" />{copy.common.delete}
                </button>
              ) : null}
            </div>
          </article>
        ))}
      </div>

      {pending ? (
        <LifecycleConfirmation
          pending={pending}
          reason={reason}
          busy={busy}
          copy={copy}
          onReasonChange={setReason}
          onCancel={() => setPending(null)}
          onConfirm={() => void executeAction()}
        />
      ) : null}
      {showSetup ? (
        <CustomerDisplaySetupModal
          registers={registers}
          onClose={() => setShowSetup(false)}
          onGenerated={() => void reload()}
        />
      ) : null}
    </section>
  );
}

function LifecycleConfirmation({ pending, reason, busy, copy, onReasonChange, onCancel, onConfirm }: {
  pending: PendingAction;
  reason: string;
  busy: boolean;
  copy: PointOfSaleKioskTranslations;
  onReasonChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const destructive = pending.action === 'revoke' || pending.action === 'delete';
  const labels: Record<LifecycleAction, string> = {
    disable: copy.customerDisplayAdmin.disableTitle,
    enable: copy.customerDisplayAdmin.enableTitle,
    revoke: copy.customerDisplayAdmin.revokeTitle,
    delete: copy.customerDisplayAdmin.deleteTitle,
  };
  return (
    <PosModalFrame
      modalType="confirmation"
      closeLabel={copy.common.closeConfirmation}
      eyebrow={copy.common.engine}
      icon={destructive ? <ShieldOff className="h-6 w-6" /> : <Power className="h-6 w-6" />}
      isCloseDisabled={busy}
      onClose={onCancel}
      subtitle={destructive
        ? copy.customerDisplayAdmin.destructiveDescription
        : copy.customerDisplayAdmin.transitionDescription}
      title={labels[pending.action]}
      tone="coral"
      footerClassName={posModalModuleFooterClassName}
      footer={(
        <div className="flex gap-3">
          <button type="button" onClick={onCancel} disabled={busy} className={posModalSecondaryActionClassName}>{copy.common.cancel}</button>
          <button type="button" onClick={onConfirm} disabled={busy} className={posModalPrimaryActionClassName}>
            {busy ? copy.common.processing : copy.common.confirm}
          </button>
        </div>
      )}
    >
      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{pending.kiosk.name}</p>
      <label className="mt-4 block">
        <span className="mb-2 block text-sm font-medium">{copy.common.optionalReason}</span>
        <textarea value={reason} onChange={(event) => onReasonChange(event.target.value)} maxLength={500} className="min-h-24 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-900" />
      </label>
    </PosModalFrame>
  );
}

function StatusBadge({ status, copy }: { status: CustomerDisplayAdminItem['status']; copy: PointOfSaleKioskTranslations }) {
  const classes = status === 'ACTIVE'
    ? 'bg-emerald-100 text-emerald-800'
    : status === 'DISABLED'
      ? 'bg-amber-100 text-amber-800'
      : 'bg-red-100 text-red-800';
  const label = status === 'ACTIVE'
    ? copy.common.active
    : status === 'DISABLED'
      ? copy.common.disabled
      : status === 'EXPIRED'
        ? copy.common.expired
        : copy.common.revoked;
  return <span className={`rounded-full px-2 py-1 text-[11px] font-medium ${classes}`}>{label}</span>;
}

function formatDate(value: string | null | undefined, locale: string, copy: PointOfSaleKioskTranslations) {
  if (!value) return copy.customerDisplayAdmin.noConnectionRecorded;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? copy.common.notAvailable : parsed.toLocaleString(locale);
}
