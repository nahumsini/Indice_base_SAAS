import { Copy, ExternalLink, KeyRound, Plus, Power, RefreshCw, ShieldCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  PosModalFrame,
  posModalModuleFooterClassName,
  posModalSecondaryActionClassName,
} from '../../Sale/components/PosModalFrame';
import type {
  ProviderOption,
  SupplierPortalAccess,
  SupplierPortalAccessPayload,
  SupplierPortalAccessStatus,
} from '../types/purchaseOrder.types';

const randomNip = () => String(Math.floor(100000 + Math.random() * 900000));

const statusCopy: Record<SupplierPortalAccessStatus, { label: string; className: string }> = {
  ACTIVE: {
    label: 'Activo',
    className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200',
  },
  PAUSED: {
    label: 'Inactivo',
    className: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-200',
  },
  EXPIRED: {
    label: 'Sin uso',
    className: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200',
  },
  REVOKED: {
    label: 'Revocado',
    className: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-200',
  },
};

export function SupplierPortalAccessModal({
  accessList,
  onChangePin,
  onClose,
  onStatusChange,
  onSubmit,
  providers,
  saving,
}: {
  accessList: SupplierPortalAccess[];
  onChangePin: (accessId: number, nip: string) => Promise<SupplierPortalAccess>;
  onClose: () => void;
  onStatusChange: (accessId: number, status: SupplierPortalAccessStatus) => Promise<SupplierPortalAccess>;
  onSubmit: (payload: SupplierPortalAccessPayload) => Promise<SupplierPortalAccess>;
  providers: ProviderOption[];
  saving: boolean;
}) {
  const [providerId, setProviderId] = useState(providers[0]?.id ? String(providers[0].id) : '');
  const [portalCode, setPortalCode] = useState('');
  const [generatedNip, setGeneratedNip] = useState(() => randomNip());
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [revealedNips, setRevealedNips] = useState<Record<number, string>>({});

  const activeProviders = useMemo(() => providers.filter(provider => provider.status !== 'INACTIVE'), [providers]);
  const activeCount = accessList.filter(access => access.status === 'ACTIVE').length;
  const pausedCount = accessList.filter(access => access.status === 'PAUSED').length;
  const canSubmit = Boolean(providerId && generatedNip && !saving);

  const submit = async () => {
    if (!canSubmit) return;
    const nipToCreate = generatedNip || randomNip();
    const payload: SupplierPortalAccessPayload = {
      providerId: Number(providerId),
      portalCode: portalCode.trim() || null,
      pin: nipToCreate,
      status: 'ACTIVE',
      expiresAt: null,
    };
    await onSubmit(payload);
    setPortalCode('');
    setGeneratedNip(randomNip());
  };

  const fullPortalUrl = (access: SupplierPortalAccess) => `${window.location.origin}${access.portalUrl}`;

  const markCopied = (key: string) => {
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey(null), 1800);
  };

  const copyValue = async (key: string, value: string) => {
    await navigator.clipboard?.writeText(value);
    markCopied(key);
  };

  const changeStatus = async (access: SupplierPortalAccess) => {
    const nextStatus: SupplierPortalAccessStatus = access.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    await onStatusChange(access.id, nextStatus);
  };

  const changeNip = async (access: SupplierPortalAccess) => {
    const nextNip = randomNip();
    await onChangePin(access.id, nextNip);
    setRevealedNips(current => ({ ...current, [access.id]: nextNip }));
  };

  return (
    <PosModalFrame
      modalType="operational-workspace"
      onClose={onClose}
      closeLabel="Cerrar accesos de proveedor"
      title="Accesos por NIP"
      subtitle="Comparte un link controlado para que el proveedor capture propuestas de compra."
      eyebrow="Kiosko proveedor"
      icon={<KeyRound className="h-6 w-6" />}
      tone="coral"
      size="lg"
      bodyClassName="p-0"
      footerClassName={posModalModuleFooterClassName}
      footer={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-white/85">{activeCount} activos - {pausedCount} inactivos</p>
          <div className="flex flex-wrap justify-end gap-3">
            <button type="button" onClick={onClose} className={posModalSecondaryActionClassName}>
              Cerrar
            </button>
            <button
              type="button"
              disabled={!canSubmit}
              onClick={() => void submit()}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-black text-[#B63B32] shadow-sm transition hover:bg-white/90 disabled:cursor-not-allowed disabled:bg-white/60 disabled:text-[#B63B32]/50 sm:w-auto"
            >
              <Plus className="h-4 w-4" />
              Crear acceso
            </button>
          </div>
        </div>
      }
    >
        <div className="grid min-h-0 bg-slate-50 dark:bg-slate-950 lg:grid-cols-[360px_1fr]">
          <section className="border-r border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <h4 className="text-lg font-bold text-slate-950 dark:text-white">Crear acceso</h4>
            <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
              El NIP se genera automaticamente. Guardalo al crear el acceso; despues solo podras cambiarlo.
            </p>

            <label className="mt-5 block space-y-2">
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Proveedor</span>
              <select
                value={providerId}
                onChange={(event) => setProviderId(event.target.value)}
                className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                {activeProviders.map((provider) => (
                  <option key={provider.id} value={provider.id}>{provider.name}</option>
                ))}
              </select>
            </label>

            <label className="mt-4 block space-y-2">
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Codigo de acceso opcional</span>
              <input
                value={portalCode}
                onChange={(event) => setPortalCode(event.target.value)}
                placeholder="Se genera automatico"
                className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </label>

            <div className="mt-4 rounded-2xl border border-[#FFB3AD] bg-[#FFF1EF] p-4 dark:border-[#FF6B5E]/40 dark:bg-[#FF6B5E]/10">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-black uppercase tracking-[0.14em] text-[#B63B32] dark:text-[#FFC7C3]">NIP automatico</span>
                  <p className="mt-1 text-2xl font-black text-slate-950 dark:text-white">{generatedNip}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setGeneratedNip(randomNip())}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#FFB3AD] bg-white px-3 text-xs font-bold text-[#B63B32] hover:bg-[#FFF7F5] dark:border-[#FF6B5E]/40 dark:bg-slate-950 dark:text-[#FFC7C3]"
                >
                  <RefreshCw className="h-4 w-4" />
                  Nuevo
                </button>
              </div>
              <p className="mt-2 text-xs font-semibold text-[#B63B32]/80 dark:text-[#FFC7C3]/80">
                No hay expiracion. El acceso se controla activando, desactivando o cambiando el NIP.
              </p>
            </div>
          </section>

          <section className="space-y-3 p-6">
            <div>
              <h4 className="text-lg font-bold text-slate-950 dark:text-white">Accesos de proveedor</h4>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Activa, desactiva o cambia el NIP sin crear accesos duplicados.
              </p>
            </div>

            {accessList.length === 0 ? (
              <div className="rounded-[20px] border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
                <p className="font-bold text-slate-950 dark:text-white">Todavia no hay accesos de proveedor.</p>
                <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
                  Crea el primero para empezar a recibir propuestas desde el kiosko.
                </p>
              </div>
            ) : accessList.map((access) => {
              const status = statusCopy[access.status] ?? statusCopy.PAUSED;
              const revealedNip = revealedNips[access.id];
              const linkKey = `link-${access.id}`;
              const nipKey = `nip-${access.id}`;

              return (
                <article key={access.id} className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-emerald-600" />
                        <h5 className="font-bold text-slate-950 dark:text-white">{access.providerName}</h5>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${status.className}`}>
                          {status.label}
                        </span>
                      </div>
                      <p className="mt-1 max-w-full truncate text-sm font-semibold text-slate-500 dark:text-slate-400">
                        {fullPortalUrl(access)}
                      </p>
                      {revealedNip ? (
                        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-[#FFB3AD] bg-[#FFF1EF] px-3 py-2 text-sm font-bold text-[#B63B32] dark:border-[#FF6B5E]/40 dark:bg-[#FF6B5E]/10 dark:text-[#FFC7C3]">
                          <span>Nuevo NIP: {revealedNip}</span>
                          <button type="button" onClick={() => void copyValue(nipKey, revealedNip)} className="rounded-lg bg-white px-2 py-1 text-xs dark:bg-slate-950">
                            {copiedKey === nipKey ? 'Copiado' : 'Copiar NIP'}
                          </button>
                        </div>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      <button type="button" onClick={() => void copyValue(linkKey, fullPortalUrl(access))} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                        <Copy className="h-4 w-4" />
                        {copiedKey === linkKey ? 'Copiado' : 'Copiar'}
                      </button>
                      <button type="button" disabled={saving} onClick={() => void changeNip(access)} className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#FFB3AD] px-3 text-xs font-bold text-[#B63B32] hover:bg-[#FFF1EF] disabled:opacity-60 dark:border-[#FF6B5E]/40 dark:text-[#FFC7C3] dark:hover:bg-[#FF6B5E]/10">
                        <RefreshCw className="h-4 w-4" />
                        Cambiar NIP
                      </button>
                      <button type="button" disabled={saving} onClick={() => void changeStatus(access)} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                        <Power className="h-4 w-4" />
                        {access.status === 'ACTIVE' ? 'Desactivar' : 'Activar'}
                      </button>
                      <a href={access.portalUrl} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-950 px-3 text-xs font-bold text-white dark:bg-white dark:text-slate-950">
                        <ExternalLink className="h-4 w-4" />
                        Abrir
                      </a>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        </div>
    </PosModalFrame>
  );
}
