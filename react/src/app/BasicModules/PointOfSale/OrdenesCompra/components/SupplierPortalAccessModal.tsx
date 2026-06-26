import { Copy, ExternalLink, KeyRound, Plus, ShieldCheck, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import type {
  ProviderOption,
  SupplierPortalAccess,
  SupplierPortalAccessPayload,
} from '../types/purchaseOrder.types';

const randomPin = () => String(Math.floor(100000 + Math.random() * 900000));

export function SupplierPortalAccessModal({
  accessList,
  onClose,
  onSubmit,
  providers,
  saving,
}: {
  accessList: SupplierPortalAccess[];
  onClose: () => void;
  onSubmit: (payload: SupplierPortalAccessPayload) => Promise<SupplierPortalAccess>;
  providers: ProviderOption[];
  saving: boolean;
}) {
  const [providerId, setProviderId] = useState(providers[0]?.id ? String(providers[0].id) : '');
  const [portalCode, setPortalCode] = useState('');
  const [pin, setPin] = useState(() => randomPin());
  const [expiresAt, setExpiresAt] = useState('');
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const activeProviders = useMemo(() => providers.filter(provider => provider.status !== 'INACTIVE'), [providers]);
  const canSubmit = Boolean(providerId && pin.trim().length >= 4 && !saving);

  const submit = async () => {
    if (!canSubmit) return;
    const payload: SupplierPortalAccessPayload = {
      providerId: Number(providerId),
      portalCode: portalCode.trim() || null,
      pin: pin.trim(),
      status: 'ACTIVE',
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
    };
    await onSubmit(payload);
    setPortalCode('');
    setPin(randomPin());
    setExpiresAt('');
  };

  const copyLink = async (access: SupplierPortalAccess) => {
    const url = `${window.location.origin}${access.portalUrl}`;
    await navigator.clipboard?.writeText(url);
    setCopiedId(access.id);
    window.setTimeout(() => setCopiedId(null), 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[24px] bg-white shadow-2xl dark:bg-slate-900">
        <header className="bg-orange-500 px-6 py-5 text-white">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
                <KeyRound className="h-6 w-6" />
              </span>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-white/75">Kiosko proveedor</p>
                <h3 className="text-2xl font-bold">Accesos por PIN</h3>
                <p className="mt-1 text-sm font-medium text-white/85">
                  Comparte un link controlado para que el proveedor capture propuestas de compra.
                </p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="rounded-full p-2 text-white/80 hover:bg-white/10">
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        <div className="grid flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 lg:grid-cols-[360px_1fr]">
          <section className="border-r border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <h4 className="text-lg font-bold text-slate-950 dark:text-white">Crear acceso</h4>
            <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
              El PIN no se vuelve a mostrar después de crear el acceso. Compártelo junto con el link.
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
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Código opcional</span>
              <input
                value={portalCode}
                onChange={(event) => setPortalCode(event.target.value)}
                placeholder="Se genera automático"
                className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </label>

            <label className="mt-4 block space-y-2">
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">PIN proveedor</span>
              <div className="flex gap-2">
                <input
                  value={pin}
                  onChange={(event) => setPin(event.target.value)}
                  className="h-12 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
                <button type="button" onClick={() => setPin(randomPin())} className="rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                  Nuevo
                </button>
              </div>
            </label>

            <label className="mt-4 block space-y-2">
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Expira</span>
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={(event) => setExpiresAt(event.target.value)}
                className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </label>

            <button
              type="button"
              disabled={!canSubmit}
              onClick={() => void submit()}
              className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
              Crear acceso
            </button>
          </section>

          <section className="space-y-3 p-6">
            <div>
              <h4 className="text-lg font-bold text-slate-950 dark:text-white">Accesos activos</h4>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Usa estos links para que el proveedor capture productos, cantidades, costos e imagenes.
              </p>
            </div>

            {accessList.length === 0 ? (
              <div className="rounded-[20px] border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
                <p className="font-bold text-slate-950 dark:text-white">Todavía no hay accesos de proveedor.</p>
                <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
                  Crea el primero para empezar a recibir propuestas desde kiosko.
                </p>
              </div>
            ) : accessList.map((access) => (
              <article key={access.id} className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      <h5 className="font-bold text-slate-950 dark:text-white">{access.providerName}</h5>
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200">
                        {access.status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
                      {window.location.origin}{access.portalUrl}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => void copyLink(access)} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                      <Copy className="h-4 w-4" />
                      {copiedId === access.id ? 'Copiado' : 'Copiar'}
                    </button>
                    <a href={access.portalUrl} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-950 px-3 text-xs font-bold text-white dark:bg-white dark:text-slate-950">
                      <ExternalLink className="h-4 w-4" />
                      Abrir
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </section>
        </div>
      </div>
    </div>
  );
}
