import { useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  AlertTriangle,
  Check,
  Clipboard,
  Grid2X2,
  Handshake,
  KeyRound,
  LoaderCircle,
  MapPin,
  Search,
  ShieldOff,
  Store,
} from 'lucide-react';
import {
  multiKioskAdminApi,
  type MultiKioskCatalogEmployee,
  type MultiKioskCatalogKiosk,
  type MultiKioskCatalogTool,
  type MultiKioskDetail,
  type MultiKioskPayload,
  type MultiKioskAudience,
  type ProviderCenterAccessItem,
  type ProviderCenterIssuedPin,
} from '../api/multiKiosks';
import { KioskModalFrame } from '../components/kiosk-engine/KioskModalFrame';
import { IndiceModalWizardStepper } from '../components/indice-modal';
import { Button } from '../components/ui/button';
import { cn } from '../components/ui/utils';
import { languages, useLanguage } from '../shared/context';
import {
  getMultiKioskAdminCopy,
  type MultiKioskAdminCopy,
} from './multiKioskAdminTranslations';
import {
  getMultiKioskToolPresentation,
  MultiKioskToolGlyph,
} from './multi-kiosk/toolPresentation';

export type MultiKioskCatalog = {
  employees: MultiKioskCatalogEmployee[];
  kiosks: MultiKioskCatalogKiosk[];
  tools: MultiKioskCatalogTool[];
  providerTools: MultiKioskCatalogTool[];
};

type Step = 1 | 2;

export type MultiKioskEditorState = {
  default_locale: string;
  description: string;
  expires_at: string;
  id?: number;
  legacyKioskDefinitionIds: number[];
  name: string;
  theme_key: string;
  toolKeys: string[];
  audience_type: MultiKioskAudience;
  allow_provider_registration: boolean;
};

export const createEmptyMultiKioskEditor = (): MultiKioskEditorState => ({
  name: '',
  description: '',
  theme_key: 'indice-blue',
  default_locale: 'es-MX',
  expires_at: '',
  toolKeys: [],
  legacyKioskDefinitionIds: [],
  audience_type: 'EMPLOYEE',
  allow_provider_registration: false,
});

const localDateTimeValue = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
    + `T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const mapMultiKioskDetailToEditor = (detail: MultiKioskDetail): MultiKioskEditorState => ({
  id: detail.id,
  name: detail.name,
  description: detail.description ?? '',
  theme_key: detail.theme_key,
  default_locale: detail.default_locale,
  expires_at: detail.expires_at ? localDateTimeValue(detail.expires_at) : '',
  toolKeys: detail.tools
    ? [...detail.tools]
      .sort((left, right) => left.sort_order - right.sort_order)
      .map(tool => tool.key)
    : [...(detail.tool_keys ?? [])],
  legacyKioskDefinitionIds: [...(detail.legacy_kiosk_definition_ids ?? [])],
  audience_type: detail.audience_type ?? 'EMPLOYEE',
  allow_provider_registration: detail.allow_provider_registration ?? false,
});

const normalizedCode = (value: string) => value.trim().toUpperCase().replace(/[\s-]+/g, '_');

const moduleLabel = (value: string, copy: MultiKioskAdminCopy) => (
  copy.moduleNames[value] ?? value.replace(/_/g, ' ')
);

const toolName = (tool: MultiKioskCatalogTool, copy: MultiKioskAdminCopy) => {
  const presentation = getMultiKioskToolPresentation(tool);
  return copy.toolNames[presentation.workspaceKind] ?? presentation.name;
};

const toolDescription = (tool: MultiKioskCatalogTool, copy: MultiKioskAdminCopy) => {
  const presentation = getMultiKioskToolPresentation(tool);
  return copy.toolDescriptions[presentation.workspaceKind]
    ?? presentation.description
    ?? moduleLabel(presentation.ownerModule, copy);
};

const toolIsSelectable = (tool: MultiKioskCatalogTool) => (
  ['AVAILABLE', 'READY'].includes(normalizedCode(tool.readiness))
);

const kioskIsSelectable = (kiosk: MultiKioskCatalogKiosk) => (
  kiosk.employee_center_supported === true
  && ['AVAILABLE', 'READY'].includes(normalizedCode(kiosk.readiness ?? kiosk.availability ?? ''))
);

const kioskScope = (kiosk: MultiKioskCatalogKiosk) => (
  [kiosk.unit_name, kiosk.business_name, kiosk.location_name, kiosk.cash_register_name]
    .filter((value, index, values): value is string => Boolean(value) && values.indexOf(value) === index)
    .join(' · ')
);

const kioskAsTool = (kiosk: MultiKioskCatalogKiosk): MultiKioskCatalogTool => ({
  key: `operational:${kiosk.id}`,
  name: kiosk.name,
  description: kioskScope(kiosk),
  owner_module: kiosk.owner_module,
  module_slug: kiosk.module_slug,
  kiosk_type: kiosk.kiosk_type,
  workspace_kind: kiosk.workspace_kind ?? kiosk.kiosk_type,
  audience_policy: kiosk.audience_policy ?? 'SCOPED_COMPANY_MEMBERS',
  readiness: kiosk.readiness ?? kiosk.availability ?? 'UNAVAILABLE',
  required_tab_scopes: kiosk.required_tab_scopes ?? [],
});

const readinessLabel = (tool: MultiKioskCatalogTool, copy: MultiKioskAdminCopy) => {
  const readiness = normalizedCode(tool.readiness);
  if (readiness === 'AVAILABLE' || readiness === 'READY') return copy.editor.available;
  if (readiness === 'SETUP_REQUIRED') return copy.editor.setupRequired;
  return copy.editor.unavailable;
};

const audienceLabel = (tool: MultiKioskCatalogTool, copy: MultiKioskAdminCopy) => {
  const audience = normalizedCode(tool.audience_policy);
  return ['COMPANY_MEMBERS', 'ALL_EMPLOYEES', 'COMPANY'].includes(audience)
    ? copy.editor.companyAudience
    : copy.editor.authorizedAudience;
};

const payloadFrom = (editor: MultiKioskEditorState): MultiKioskPayload => ({
  name: editor.name.trim(),
  description: editor.description.trim(),
  theme_key: editor.theme_key,
  default_locale: editor.default_locale,
  unit_id: null,
  business_id: null,
  expires_at: editor.expires_at ? new Date(editor.expires_at).toISOString() : null,
  tool_keys: editor.toolKeys,
  legacy_kiosk_definition_ids: editor.legacyKioskDefinitionIds,
  audience_type: editor.audience_type,
  allow_provider_registration: editor.audience_type === 'PROVIDER'
    && editor.allow_provider_registration,
});

function ProviderCenterAccessManager({ multiKioskId, tools }: {
  multiKioskId: number;
  tools: MultiKioskCatalogTool[];
}) {
  const [items, setItems] = useState<ProviderCenterAccessItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyProviderId, setBusyProviderId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [issued, setIssued] = useState<ProviderCenterIssuedPin | null>(null);
  const [copied, setCopied] = useState(false);
  const [pendingRevoke, setPendingRevoke] = useState<ProviderCenterAccessItem | null>(null);

  const load = async (signal?: AbortSignal) => {
    setLoading(true);
    setError('');
    try {
      setItems(await multiKioskAdminApi.providerAccesses(multiKioskId, signal));
    } catch (failure) {
      if (!signal?.aborted) setError(failure instanceof Error
        ? failure.message : 'No pudimos cargar los proveedores.');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [multiKioskId]);

  const issue = async (providerId: number) => {
    setBusyProviderId(providerId); setError(''); setIssued(null); setCopied(false);
    try {
      setIssued(await multiKioskAdminApi.issueProviderPin(multiKioskId, providerId));
      await load();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'No pudimos generar el NIP.');
    } finally { setBusyProviderId(null); }
  };

  const revoke = async () => {
    const provider = pendingRevoke;
    if (!provider) return;
    setBusyProviderId(provider.provider_id); setError(''); setIssued(null);
    try {
      await multiKioskAdminApi.revokeProviderPin(multiKioskId, provider.provider_id);
      await load();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'No pudimos revocar el NIP.');
    } finally { setBusyProviderId(null); setPendingRevoke(null); }
  };

  const normalizedSearch = search.trim().toLocaleLowerCase();
  const visible = items.filter(item => !normalizedSearch
    || [item.name, item.email, item.unit_name, item.business_name]
      .some(value => value.toLocaleLowerCase().includes(normalizedSearch)));

  const copyCredential = async () => {
    if (!issued) return;
    await navigator.clipboard.writeText(
      `Proveedor: ${issued.provider_name}\nNIP: ${issued.pin}`,
    );
    setCopied(true);
  };

  if (pendingRevoke) return <div className="grid min-h-[360px] place-items-center p-4"><section className="w-full max-w-lg rounded-3xl border border-red-200 bg-red-50 p-6 text-red-950"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-red-600 shadow-sm"><ShieldOff className="h-6 w-6" /></span><h3 className="mt-4 text-xl font-semibold">Revocar acceso de proveedor</h3><p className="mt-2 text-sm leading-6 text-red-800">Se revocará el NIP de <strong>{pendingRevoke.name}</strong> y se cerrarán sus sesiones activas. Las propuestas, órdenes, facturas y pagos permanecerán en el historial.</p><div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" disabled={busyProviderId !== null} onClick={() => setPendingRevoke(null)} className="h-11 rounded-xl border border-red-200 bg-white px-4 text-sm font-medium">Conservar acceso</button><button type="button" disabled={busyProviderId !== null} onClick={() => void revoke()} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-red-700 px-4 text-sm font-semibold text-white disabled:opacity-50">{busyProviderId !== null ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldOff className="h-4 w-4" />}Revocar NIP</button></div></section></div>;

  return <div className="space-y-4">
    <section className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4 text-blue-950">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-blue-700 shadow-sm"><Handshake className="h-5 w-5" /></span>
        <div><h3 className="text-sm font-semibold">Un acceso, cuatro herramientas</h3><p className="mt-1 text-xs leading-5 text-blue-800">Todos los proveedores habilitados entran con su nombre y un solo NIP de seis dígitos. La moneda siempre pertenece a cada cotización, orden, factura o cuenta; no se configura en el portal.</p></div>
      </div>
      <ol className="mt-3 grid gap-2 min-[440px]:grid-cols-2">
        {tools.map((tool, index) => <li key={tool.key} className="flex items-center gap-2 rounded-xl border border-blue-100 bg-white px-3 py-2 text-xs"><span className="grid h-5 w-5 place-items-center rounded-full bg-blue-700 text-[10px] font-semibold text-white">{index + 1}</span><MultiKioskToolGlyph source={tool} className="h-8 w-8 rounded-lg [&_svg]:h-4 [&_svg]:w-4" /><span className="font-medium text-slate-800">{tool.name}</span></li>)}
      </ol>
    </section>

    {issued ? <section className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-emerald-950" role="status">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="text-xs font-medium text-emerald-700">Guárdalo ahora · se muestra una sola vez</p><p className="mt-1 text-sm font-semibold">{issued.provider_name}</p><p className="mt-2 font-mono text-2xl font-bold tracking-[0.28em]">{issued.pin}</p></div>
        <button type="button" onClick={() => void copyCredential()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-white px-4 text-sm font-medium text-emerald-800"><Clipboard className="h-4 w-4" />{copied ? 'Copiado' : 'Copiar nombre y NIP'}</button>
      </div>
      <p className="mt-3 text-xs leading-5 text-emerald-800">Después solo verás “NIP activo”. Si el proveedor lo pierde, genera uno nuevo; el anterior y sus sesiones quedarán invalidados.</p>
    </section> : null}

    {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs leading-5 text-red-700">{error}</p> : null}
    <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input aria-label="Buscar proveedor" value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar proveedor, correo, unidad o negocio" className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-[#59C3A5] focus:ring-4 focus:ring-[#59C3A5]/15" /></div>

    {loading ? <div className="grid min-h-32 place-items-center"><LoaderCircle className="h-6 w-6 animate-spin text-[#177D66]" /></div> : visible.length ? <div className="space-y-2">
      {visible.map(provider => {
        const busy = busyProviderId === provider.provider_id;
        const active = provider.provider_status === 'ACTIVE';
        return <article key={provider.provider_id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center">
          <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl', provider.pin_ready ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500')}><KeyRound className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h4 className="truncate text-sm font-semibold text-slate-900">{provider.name}</h4><span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', provider.pin_ready ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600')}>{provider.pin_ready ? 'NIP activo' : 'Sin acceso'}</span>{!active ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">Proveedor inactivo</span> : null}</div><p className="mt-1 truncate text-xs text-slate-500">{provider.email || 'Sin correo'} · {[provider.unit_name, provider.business_name].filter(Boolean).join(' · ') || 'Falta asignar alcance'}</p>{active && !provider.scope_ready ? <p className="mt-1 text-[11px] text-amber-700">Asigna unidad y negocio en Proveedores antes de generar el NIP.</p> : null}</div>
          <div className="flex gap-2 sm:justify-end"><button type="button" disabled={busy || !active || !provider.scope_ready} onClick={() => void issue(provider.provider_id)} className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-[#177D66] px-3 text-xs font-medium text-white disabled:opacity-40 sm:flex-none">{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}{provider.pin_ready ? 'Generar nuevo NIP' : 'Generar NIP'}</button>{provider.pin_ready ? <button type="button" disabled={busy} aria-label={`Revocar acceso de ${provider.name}`} onClick={() => setPendingRevoke(provider)} className="grid h-10 w-10 place-items-center rounded-xl border border-red-200 text-red-600 disabled:opacity-40"><ShieldOff className="h-4 w-4" /></button> : null}</div>
        </article>;
      })}
    </div> : <div className="rounded-2xl border border-dashed border-slate-300 px-5 py-10 text-center text-sm text-slate-500">No hay proveedores que coincidan con la búsqueda.</div>}
  </div>;
}

export function MultiKioskEditorModal({ catalog, editor, onClose, onSaved }: {
  catalog: MultiKioskCatalog;
  editor: MultiKioskEditorState;
  onClose: () => void;
  onSaved: (item: MultiKioskDetail, close?: boolean) => void;
}) {
  const { currentLanguage } = useLanguage();
  const copy = getMultiKioskAdminCopy(currentLanguage.code);
  const [form, setForm] = useState(editor);
  const [baseline, setBaseline] = useState(editor);
  const [step, setStep] = useState<Step>(1);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [discardPromptOpen, setDiscardPromptOpen] = useState(false);
  const normalizedSearch = search.trim().toLocaleLowerCase();
  const providerFlow = form.audience_type === 'PROVIDER';
  const activeTools = providerFlow ? catalog.providerTools : catalog.tools;
  const visibleTools = activeTools.filter(tool => !normalizedSearch
    || [toolName(tool, copy), toolDescription(tool, copy), moduleLabel(tool.owner_module, copy)]
      .some(value => value.toLocaleLowerCase().includes(normalizedSearch)));
  const visibleKiosks = form.audience_type === 'EMPLOYEE' ? catalog.kiosks.filter(kiosk => !normalizedSearch
    || [kiosk.name, moduleLabel(kiosk.owner_module, copy), kioskScope(kiosk)]
      .some(value => value.toLocaleLowerCase().includes(normalizedSearch))) : [];
  const selectedTools = (providerFlow ? activeTools.map(tool => tool.key) : form.toolKeys)
    .map(key => activeTools.find(tool => tool.key === key))
    .filter((tool): tool is MultiKioskCatalogTool => Boolean(tool));
  const selectedKiosks = form.legacyKioskDefinitionIds
    .map(id => catalog.kiosks.find(kiosk => kiosk.id === id))
    .filter((kiosk): kiosk is MultiKioskCatalogKiosk => Boolean(kiosk));
  const missingSavedKioskCount = form.legacyKioskDefinitionIds.length - selectedKiosks.length;
  const previewItems = [
    ...selectedTools,
    ...selectedKiosks.map(kioskAsTool),
  ];
  const selectableToolCount = activeTools.filter(toolIsSelectable).length
    + (form.audience_type === 'EMPLOYEE' ? catalog.kiosks.filter(kioskIsSelectable).length : 0);
  const hasComposition = providerFlow
    ? activeTools.length === 4 && activeTools.every(toolIsSelectable)
    : form.toolKeys.length > 0 || form.legacyKioskDefinitionIds.length > 0;
  const canContinue = step === 1 ? form.name.trim().length >= 3 : hasComposition;
  const hasUnsavedChanges = JSON.stringify(form) !== JSON.stringify(baseline);

  const requestClose = () => {
    if (busy) return;
    if (hasUnsavedChanges) {
      setDiscardPromptOpen(true);
      return;
    }
    onClose();
  };

  const save = async () => {
    setBusy(true);
    setError('');
    try {
      onSaved(form.id
        ? await multiKioskAdminApi.update(form.id, payloadFrom(form))
        : await multiKioskAdminApi.create(payloadFrom(form)));
    } catch {
      setError(copy.editor.saveError);
    } finally {
      setBusy(false);
    }
  };

  const openProviderAccess = async () => {
    setBusy(true);
    setError('');
    try {
      const candidate = {
        ...form,
        toolKeys: catalog.providerTools.map(tool => tool.key),
        legacyKioskDefinitionIds: [],
      };
      const saved = candidate.id
        ? await multiKioskAdminApi.update(candidate.id, payloadFrom(candidate))
        : await multiKioskAdminApi.create(payloadFrom(candidate));
      const persisted = mapMultiKioskDetailToEditor(saved);
      setForm(persisted);
      setBaseline(persisted);
      setSearch('');
      setStep(2);
      onSaved(saved, false);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : copy.editor.saveError);
    } finally {
      setBusy(false);
    }
  };

  const toggleTool = (key: string) => setForm(current => ({
    ...current,
    toolKeys: current.toolKeys.includes(key)
      ? current.toolKeys.filter(value => value !== key)
      : [...current.toolKeys, key],
  }));

  const moveTool = (key: string, direction: -1 | 1) => setForm(current => {
    const keys = [...current.toolKeys];
    const index = keys.indexOf(key);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= keys.length) return current;
    [keys[index], keys[target]] = [keys[target], keys[index]];
    return { ...current, toolKeys: keys };
  });

  const toggleKiosk = (id: number) => setForm(current => ({
    ...current,
    legacyKioskDefinitionIds: current.legacyKioskDefinitionIds.includes(id)
      ? current.legacyKioskDefinitionIds.filter(value => value !== id)
      : [...current.legacyKioskDefinitionIds, id],
  }));

  const moveKiosk = (id: number, direction: -1 | 1) => setForm(current => {
    const ids = [...current.legacyKioskDefinitionIds];
    const index = ids.indexOf(id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= ids.length) return current;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    return { ...current, legacyKioskDefinitionIds: ids };
  });

  return (
    <>
      <KioskModalFrame
        open={!discardPromptOpen}
        onOpenChange={open => { if (!open) requestClose(); }}
        busy={busy}
        size="wizard"
        tone="aqua"
        icon={<Grid2X2 className="h-5 w-5" />}
        eyebrow={form.id ? copy.editor.editEyebrow(form.name) : copy.editor.newEyebrow}
        title={form.id ? copy.editor.editTitle : copy.editor.createTitle}
        description={copy.editor.description}
        footerSummary={copy.editor.footerSummary(
          step,
          form.toolKeys.length + form.legacyKioskDefinitionIds.length,
          selectableToolCount,
          missingSavedKioskCount,
        )}
        footer={<>
          <Button variant="outline" type="button" onClick={step === 1 ? requestClose : () => setStep(1)} disabled={busy}>
            {step === 1 ? copy.editor.cancel : copy.editor.previous}
          </Button>
          {step === 1 ? (
            <Button type="button" onClick={() => {
              if (providerFlow) void openProviderAccess();
              else { setSearch(''); setStep(2); }
            }} disabled={!canContinue || busy}>
              {busy ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
              {providerFlow ? 'Guardar y administrar NIP' : copy.editor.continue}
            </Button>
          ) : providerFlow ? (
            <Button type="button" onClick={onClose} disabled={busy}>Listo</Button>
          ) : (
            <Button type="button" onClick={() => void save()} disabled={!canContinue || busy}>
              {busy ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
              {form.id ? copy.editor.save : copy.editor.create}
            </Button>
          )}
        </>}
      >
        <IndiceModalWizardStepper
          accent="aqua"
          activeStepId={step === 1 ? 'details' : 'tools'}
          className="mb-5"
          progressLabel={copy.editor.footerSummary(
            step,
            form.toolKeys.length + form.legacyKioskDefinitionIds.length,
            selectableToolCount,
            missingSavedKioskCount,
          )}
          steps={[
            { id: 'details', label: providerFlow ? 'Portal' : copy.editor.stepData },
            { id: 'tools', label: providerFlow ? 'Proveedores y NIP' : copy.editor.stepTools },
          ]}
        />
      {error ? <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      {step === 1 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2 rounded-2xl border border-[#59C3A5]/40 bg-[#59C3A5]/10 p-4 text-sm text-slate-800 dark:border-emerald-800 dark:bg-emerald-950/25 dark:text-slate-100">
            <p className="font-medium">{copy.editor.companyAccessTitle}</p>
            <p className="mt-1 leading-5 text-slate-600 dark:text-slate-300">{copy.editor.companyAccessDescription}</p>
          </div>
          <fieldset className="sm:col-span-2">
            <legend className="text-sm font-medium text-slate-700 dark:text-slate-200">¿Quién usará este centro?</legend>
            <p className="mt-1 text-xs leading-5 text-slate-500">El tipo de acceso no puede cambiarse después de crear el enlace.</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {([
                ['EMPLOYEE', Grid2X2, 'Personal', 'Herramientas internas para colaboradores autorizados.'],
                ['PROVIDER', Handshake, 'Proveedores', 'Un enlace común para cotizaciones, órdenes, cuentas y pagos.'],
              ] as const).map(([value, Icon, title, description]) => {
                const selected = form.audience_type === value;
                return (
                  <button
                    key={value}
                    type="button"
                    disabled={Boolean(form.id)}
                    aria-pressed={selected}
                    onClick={() => setForm(current => ({
                      ...current,
                      audience_type: value,
                      allow_provider_registration: value === 'PROVIDER' && current.allow_provider_registration,
                      toolKeys: value === 'PROVIDER'
                        ? catalog.providerTools.map(tool => tool.key) : [],
                      legacyKioskDefinitionIds: [],
                    }))}
                    className={cn(
                      'flex min-h-24 items-start gap-3 rounded-2xl border p-4 text-left outline-none transition focus-visible:ring-4 focus-visible:ring-[#59C3A5]/20 disabled:cursor-not-allowed',
                      selected ? 'border-[#59C3A5] bg-[#59C3A5]/10' : 'border-slate-200 bg-white hover:border-[#59C3A5]/60',
                    )}
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-[#177D66] shadow-sm"><Icon className="h-5 w-5" /></span>
                    <span><span className="block text-sm font-medium text-slate-900">{title}</span><span className="mt-1 block text-xs leading-5 text-slate-500">{description}</span></span>
                  </button>
                );
              })}
            </div>
          </fieldset>
          {form.audience_type === 'PROVIDER' ? (
            <label className="sm:col-span-2 flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50/70 p-4 text-sm text-blue-950">
              <input
                type="checkbox"
                checked={form.allow_provider_registration}
                onChange={event => setForm(current => ({ ...current, allow_provider_registration: event.target.checked }))}
                className="mt-1 h-4 w-4 rounded border-blue-300 text-blue-700 focus:ring-blue-500"
              />
              <span><span className="block font-medium">Permitir solicitudes de alta</span><span className="mt-1 block text-xs leading-5 text-blue-800">El proveedor envía sus datos sin elegir unidad, negocio ni almacén. La empresa revisa y asigna el alcance antes de activar su acceso.</span></span>
            </label>
          ) : null}
          <label className="sm:col-span-2"><span className="text-sm font-medium text-slate-700 dark:text-slate-200">{copy.editor.name}</span><input autoFocus value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} maxLength={140} placeholder={copy.editor.namePlaceholder} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#59C3A5] focus:ring-4 focus:ring-[#59C3A5]/15 dark:border-slate-700 dark:bg-slate-950" /></label>
          <label className="sm:col-span-2"><span className="text-sm font-medium text-slate-700 dark:text-slate-200">{copy.editor.descriptionLabel}</span><textarea value={form.description} onChange={event => setForm(current => ({ ...current, description: event.target.value }))} maxLength={500} rows={3} placeholder={copy.editor.descriptionPlaceholder} className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-[#59C3A5] focus:ring-4 focus:ring-[#59C3A5]/15 dark:border-slate-700 dark:bg-slate-950" /></label>
          <details className="sm:col-span-2 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <summary className="cursor-pointer text-sm font-medium text-[#177D66] dark:text-emerald-300">{copy.editor.presentationOptions}</summary>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{copy.editor.presentationOptionsHelp}</p>
            <div className="mt-4 grid gap-4 border-t border-slate-200 pt-4 dark:border-slate-700 sm:grid-cols-2">
              <label><span className="text-sm font-medium text-slate-700 dark:text-slate-200">{copy.editor.colour}</span><select value={form.theme_key} onChange={event => setForm(current => ({ ...current, theme_key: event.target.value }))} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#59C3A5] focus:ring-4 focus:ring-[#59C3A5]/15 dark:border-slate-700 dark:bg-slate-950"><option value="indice-blue">{copy.editor.colourBlue}</option><option value="indice-green">{copy.editor.colourGreen}</option><option value="indice-yellow">{copy.editor.colourYellow}</option><option value="indice-coral">{copy.editor.colourCoral}</option></select></label>
              <label><span className="text-sm font-medium text-slate-700 dark:text-slate-200">{copy.editor.initialLanguage}</span><select value={form.default_locale} onChange={event => setForm(current => ({ ...current, default_locale: event.target.value }))} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#59C3A5] focus:ring-4 focus:ring-[#59C3A5]/15 dark:border-slate-700 dark:bg-slate-950">{languages.map(language => <option key={language.code} value={language.code}>{language.flag} {language.name}</option>)}</select><span className="mt-1 block text-xs leading-5 text-slate-500">{copy.editor.initialLanguageHelp}</span></label>
              <label className="sm:col-span-2"><span className="text-sm font-medium text-slate-700 dark:text-slate-200">{copy.editor.expiry}</span><input type="datetime-local" value={form.expires_at} onChange={event => setForm(current => ({ ...current, expires_at: event.target.value }))} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#59C3A5] focus:ring-4 focus:ring-[#59C3A5]/15 dark:border-slate-700 dark:bg-slate-950" /></label>
            </div>
          </details>
        </div>
      ) : providerFlow && form.id ? (
        <ProviderCenterAccessManager multiKioskId={form.id} tools={catalog.providerTools} />
      ) : (
        <div>
          <div className="mb-4 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 text-sm text-emerald-900">
            <p className="font-medium">{copy.editor.catalogTitle}</p>
            <p className="mt-1 leading-5 text-emerald-800">{copy.editor.catalogDescription}</p>
          </div>
          {missingSavedKioskCount > 0 ? (
            <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
              {copy.editor.legacyNotice(missingSavedKioskCount)}
            </p>
          ) : null}
          <section aria-labelledby="multi-kiosk-preview-title" className="mb-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/80">
            <div className="flex items-start gap-3 border-b border-slate-200 bg-white px-4 py-3">
              <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#59C3A5]/15 text-[#177D66]">
                <Grid2X2 className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <h3 id="multi-kiosk-preview-title" className="text-sm font-medium text-slate-900">{copy.editor.previewTitle}</h3>
                <p className="mt-0.5 text-xs leading-5 text-slate-500">{copy.editor.previewDescription}</p>
              </div>
            </div>
            <div aria-live="polite" className="p-3">
              {previewItems.length > 0 ? (
                <ol aria-label={copy.editor.previewTitle} className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-2 sm:grid-cols-3">
                  {previewItems.map((tool, index) => {
                    const presentation = getMultiKioskToolPresentation(tool);
                    return (
                      <li key={tool.key} className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
                        <span aria-hidden="true" className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-slate-900 text-[10px] font-medium text-white">
                          {index + 1}
                        </span>
                        <MultiKioskToolGlyph source={tool} className="h-9 w-9 rounded-lg [&_svg]:h-4 [&_svg]:w-4" />
                        <span className="min-w-0">
                          <span className="block truncate text-xs font-medium text-slate-900">{toolName(tool, copy)}</span>
                          <span className={cn('mt-0.5 block truncate text-[10px] font-medium', presentation.toneClasses.module)}>
                            {moduleLabel(presentation.ownerModule, copy)}
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <p className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-5 text-center text-xs text-slate-500">
                  {copy.editor.previewEmpty}
                </p>
              )}
            </div>
          </section>
          <div className="sticky top-0 z-20 -mx-1 mb-4 bg-[#F7F8FA]/95 px-1 py-1 backdrop-blur dark:bg-slate-900/95"><Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input aria-label={copy.editor.searchPlaceholder} value={search} onChange={event => setSearch(event.target.value)} placeholder={copy.editor.searchPlaceholder} className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-[#59C3A5] focus:ring-4 focus:ring-[#59C3A5]/15 dark:border-slate-700 dark:bg-slate-950" /></div>
          <div className="grid gap-3 sm:grid-cols-2">
            {visibleTools.map(tool => {
              const displayName = toolName(tool, copy);
              const selected = form.toolKeys.includes(tool.key);
              const selectable = toolIsSelectable(tool);
              const order = form.toolKeys.indexOf(tool.key);
              const presentation = getMultiKioskToolPresentation(tool);
              return (
                <div key={tool.key} className={cn(
                  'flex items-center gap-2 rounded-2xl border bg-white p-2 transition-colors',
                  selected ? presentation.toneClasses.tileSelected : 'border-slate-200',
                  selectable && presentation.toneClasses.tileHover,
                  !selectable && 'bg-slate-50 opacity-75',
                )}>
                  <button
                    type="button"
                    aria-label={selected ? copy.editor.removeTool(displayName) : copy.editor.addTool(displayName)}
                    aria-pressed={selected}
                    disabled={!selectable}
                    onClick={() => toggleTool(tool.key)}
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-xl p-1 text-left outline-none focus-visible:ring-4 focus-visible:ring-[#59C3A5]/25"
                  >
                    <MultiKioskToolGlyph source={tool} selected={selected} className="h-11 w-11 rounded-xl [&_svg]:h-5 [&_svg]:w-5" />
                    <span className="min-w-0 flex-1">
                      <span className={cn('mb-1 block truncate text-[11px] font-medium', presentation.toneClasses.module)}>
                        {moduleLabel(presentation.ownerModule, copy)}
                      </span>
                      <span className="block truncate text-sm font-medium text-slate-900">{displayName}</span>
                      <span className="mt-1 block line-clamp-2 text-xs leading-5 text-slate-500">{toolDescription(tool, copy)}</span>
                      <span className="mt-2 flex flex-wrap gap-1.5">
                        <span className={cn('rounded-full border px-2 py-0.5 text-[10px]', presentation.toneClasses.badge)}>{audienceLabel(tool, copy)}</span>
                        <span className={cn('rounded-full border px-2 py-0.5 text-[10px]', selectable ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-800')}>{readinessLabel(tool, copy)}</span>
                      </span>
                    </span>
                  </button>
                  {selected ? <span className="flex flex-col gap-1"><button type="button" aria-label={copy.editor.moveUp(displayName)} disabled={order === 0} onClick={() => moveTool(tool.key, -1)} className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 bg-white outline-none focus-visible:ring-4 focus-visible:ring-[#59C3A5]/25 disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button><button type="button" aria-label={copy.editor.moveDown(displayName)} disabled={order === form.toolKeys.length - 1} onClick={() => moveTool(tool.key, 1)} className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 bg-white outline-none focus-visible:ring-4 focus-visible:ring-[#59C3A5]/25 disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button></span> : null}
                </div>
              );
            })}
          </div>
          {visibleTools.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 px-5 py-10 text-center text-sm text-slate-500">{copy.editor.emptyTools}</div>
          ) : null}
          {form.audience_type === 'EMPLOYEE' ? <section aria-labelledby="multi-kiosk-operational-catalog-title" className="mt-6">
            <div className="mb-3 flex items-start gap-3">
              <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-700">
                <Store className="h-5 w-5" />
              </span>
              <div>
                <h3 id="multi-kiosk-operational-catalog-title" className="text-sm font-medium text-slate-900">
                  {copy.editor.operationalCatalogTitle}
                </h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {copy.editor.operationalCatalogDescription}
                </p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {visibleKiosks.map(kiosk => {
                const source = kioskAsTool(kiosk);
                const presentation = getMultiKioskToolPresentation(source);
                const selected = form.legacyKioskDefinitionIds.includes(kiosk.id);
                const selectable = kioskIsSelectable(kiosk);
                const order = form.legacyKioskDefinitionIds.indexOf(kiosk.id);
                const scope = kioskScope(kiosk);
                return (
                  <div key={kiosk.id} className={cn(
                    'flex items-center gap-2 rounded-2xl border bg-white p-2 transition-colors',
                    selected ? presentation.toneClasses.tileSelected : 'border-slate-200',
                    selectable && presentation.toneClasses.tileHover,
                    !selectable && 'bg-slate-50 opacity-75',
                  )}>
                    <button
                      type="button"
                      aria-label={selected ? copy.editor.removeTool(kiosk.name) : copy.editor.addTool(kiosk.name)}
                      aria-pressed={selected}
                      disabled={!selectable}
                      onClick={() => toggleKiosk(kiosk.id)}
                      className="flex min-h-20 min-w-0 flex-1 items-center gap-3 rounded-xl p-1 text-left outline-none focus-visible:ring-4 focus-visible:ring-[#59C3A5]/25"
                    >
                      <MultiKioskToolGlyph source={source} selected={selected} className="h-11 w-11 rounded-xl [&_svg]:h-5 [&_svg]:w-5" />
                      <span className="min-w-0 flex-1">
                        <span className={cn('mb-1 block truncate text-[11px] font-medium', presentation.toneClasses.module)}>
                          {moduleLabel(kiosk.owner_module, copy)}
                        </span>
                        <span className="block truncate text-sm font-medium text-slate-900">{kiosk.name}</span>
                        <span className="mt-1 flex items-start gap-1 text-xs leading-5 text-slate-500">
                          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          <span className="line-clamp-2">{scope || copy.editor.companyAudience}</span>
                        </span>
                        <span className="mt-2 flex flex-wrap gap-1.5">
                          <span className={cn('rounded-full border px-2 py-0.5 text-[10px]', presentation.toneClasses.badge)}>{copy.editor.authorizedAudience}</span>
                          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] text-emerald-700">{readinessLabel(source, copy)}</span>
                        </span>
                      </span>
                    </button>
                    {selected ? <span className="flex flex-col gap-1"><button type="button" aria-label={copy.editor.moveUp(kiosk.name)} disabled={order === 0} onClick={() => moveKiosk(kiosk.id, -1)} className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 bg-white outline-none focus-visible:ring-4 focus-visible:ring-[#59C3A5]/25 disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button><button type="button" aria-label={copy.editor.moveDown(kiosk.name)} disabled={order === form.legacyKioskDefinitionIds.length - 1} onClick={() => moveKiosk(kiosk.id, 1)} className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 bg-white outline-none focus-visible:ring-4 focus-visible:ring-[#59C3A5]/25 disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button></span> : null}
                  </div>
                );
              })}
            </div>
            {visibleKiosks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 px-5 py-8 text-center text-sm text-slate-500">{copy.editor.emptyOperationalKiosks}</div>
            ) : null}
          </section> : null}
        </div>
      )}
      </KioskModalFrame>
      <KioskModalFrame
        open={discardPromptOpen}
        onOpenChange={open => { if (!open) setDiscardPromptOpen(false); }}
        size="compact"
        surface="administration"
        tone="yellow"
        icon={<AlertTriangle className="h-5 w-5" />}
        title={copy.editor.discardTitle}
        description={copy.editor.discardDescription}
        footer={(
          <>
            <Button type="button" variant="outline" onClick={() => setDiscardPromptOpen(false)}>{copy.editor.keepEditing}</Button>
            <Button type="button" onClick={onClose} data-modal-destructive>{copy.editor.discard}</Button>
          </>
        )}
      >
        {null}
      </KioskModalFrame>
    </>
  );
}
