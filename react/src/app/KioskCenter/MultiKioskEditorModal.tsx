import { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Check,
  Grid2X2,
  LoaderCircle,
  Search,
} from 'lucide-react';
import {
  multiKioskAdminApi,
  type MultiKioskCatalogEmployee,
  type MultiKioskCatalogTool,
  type MultiKioskDetail,
  type MultiKioskPayload,
} from '../api/multiKiosks';
import { KioskModalFrame } from '../components/kiosk-engine/KioskModalFrame';
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
  tools: MultiKioskCatalogTool[];
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
};

export const createEmptyMultiKioskEditor = (): MultiKioskEditorState => ({
  name: '',
  description: '',
  theme_key: 'indice-blue',
  default_locale: 'es-MX',
  expires_at: '',
  toolKeys: [],
  legacyKioskDefinitionIds: [],
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
  legacy_kiosk_definition_ids: editor.legacyKioskDefinitionIds.length > 0
    ? editor.legacyKioskDefinitionIds
    : undefined,
});

export function MultiKioskEditorModal({ catalog, editor, onClose, onSaved }: {
  catalog: MultiKioskCatalog;
  editor: MultiKioskEditorState;
  onClose: () => void;
  onSaved: (item: MultiKioskDetail) => void;
}) {
  const { currentLanguage } = useLanguage();
  const copy = getMultiKioskAdminCopy(currentLanguage.code);
  const [form, setForm] = useState(editor);
  const [step, setStep] = useState<Step>(1);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const normalizedSearch = search.trim().toLocaleLowerCase();
  const visibleTools = catalog.tools.filter(tool => !normalizedSearch
    || [toolName(tool, copy), toolDescription(tool, copy), moduleLabel(tool.owner_module, copy)]
      .some(value => value.toLocaleLowerCase().includes(normalizedSearch)));
  const selectedTools = form.toolKeys
    .map(key => catalog.tools.find(tool => tool.key === key))
    .filter((tool): tool is MultiKioskCatalogTool => Boolean(tool));
  const selectableToolCount = catalog.tools.filter(toolIsSelectable).length;
  const hasComposition = form.toolKeys.length > 0 || (
    form.id !== undefined && form.legacyKioskDefinitionIds.length > 0
  );
  const canContinue = step === 1 ? form.name.trim().length >= 3 : hasComposition;

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

  return (
    <KioskModalFrame
      open
      onOpenChange={open => { if (!open) onClose(); }}
      busy={busy}
      size="wizard"
      tone="blue"
      icon={<Grid2X2 className="h-5 w-5" />}
      eyebrow={form.id ? copy.editor.editEyebrow(form.name) : copy.editor.newEyebrow}
      title={form.id ? copy.editor.editTitle : copy.editor.createTitle}
      description={copy.editor.description}
      footerSummary={copy.editor.footerSummary(
        step,
        form.toolKeys.length,
        selectableToolCount,
        form.legacyKioskDefinitionIds.length,
      )}
      footer={<>
        <Button variant="outline" type="button" onClick={step === 1 ? onClose : () => setStep(1)} disabled={busy}>
          {step === 1 ? copy.editor.cancel : copy.editor.previous}
        </Button>
        {step === 1 ? (
          <Button type="button" onClick={() => { setSearch(''); setStep(2); }} disabled={!canContinue || busy}>
            {copy.editor.continue}
          </Button>
        ) : (
          <Button type="button" onClick={() => void save()} disabled={!canContinue || busy}>
            {busy ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
            {form.id ? copy.editor.save : copy.editor.create}
          </Button>
        )}
      </>}
    >
      <div className="mb-5 grid grid-cols-2 gap-2">
        {([copy.editor.stepData, copy.editor.stepTools] as const).map((label, index) => (
          <div key={label} className={cn(
            'rounded-xl border px-3 py-2 text-center text-xs font-medium',
            step === index + 1
              ? 'border-blue-600 bg-blue-50 text-blue-700'
              : step > index + 1
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-slate-200 bg-white text-slate-400',
          )}>
            {step > index + 1 ? '✓ ' : ''}{label}
          </div>
        ))}
      </div>
      {error ? <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      {step === 1 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2 rounded-2xl border border-blue-100 bg-blue-50/70 p-4 text-sm text-blue-900">
            <p className="font-medium">{copy.editor.companyAccessTitle}</p>
            <p className="mt-1 leading-5 text-blue-800">{copy.editor.companyAccessDescription}</p>
          </div>
          <label className="sm:col-span-2"><span className="text-sm font-medium text-slate-700">{copy.editor.name}</span><input autoFocus value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} maxLength={140} placeholder={copy.editor.namePlaceholder} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" /></label>
          <label className="sm:col-span-2"><span className="text-sm font-medium text-slate-700">{copy.editor.descriptionLabel}</span><textarea value={form.description} onChange={event => setForm(current => ({ ...current, description: event.target.value }))} maxLength={500} rows={3} placeholder={copy.editor.descriptionPlaceholder} className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" /></label>
          <label><span className="text-sm font-medium text-slate-700">{copy.editor.colour}</span><select value={form.theme_key} onChange={event => setForm(current => ({ ...current, theme_key: event.target.value }))} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="indice-blue">{copy.editor.colourBlue}</option><option value="indice-green">{copy.editor.colourGreen}</option><option value="indice-yellow">{copy.editor.colourYellow}</option><option value="indice-coral">{copy.editor.colourCoral}</option></select></label>
          <label><span className="text-sm font-medium text-slate-700">{copy.editor.initialLanguage}</span><select value={form.default_locale} onChange={event => setForm(current => ({ ...current, default_locale: event.target.value }))} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm">{languages.map(language => <option key={language.code} value={language.code}>{language.flag} {language.name}</option>)}</select><span className="mt-1 block text-xs leading-5 text-slate-500">{copy.editor.initialLanguageHelp}</span></label>
          <label><span className="text-sm font-medium text-slate-700">{copy.editor.expiry}</span><input type="datetime-local" value={form.expires_at} onChange={event => setForm(current => ({ ...current, expires_at: event.target.value }))} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm" /></label>
        </div>
      ) : (
        <div>
          <div className="mb-4 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 text-sm text-emerald-900">
            <p className="font-medium">{copy.editor.catalogTitle}</p>
            <p className="mt-1 leading-5 text-emerald-800">{copy.editor.catalogDescription}</p>
          </div>
          {form.legacyKioskDefinitionIds.length > 0 ? (
            <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
              {copy.editor.legacyNotice(form.legacyKioskDefinitionIds.length)}
            </p>
          ) : null}
          <section aria-labelledby="multi-kiosk-preview-title" className="mb-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/80">
            <div className="flex items-start gap-3 border-b border-slate-200 bg-white px-4 py-3">
              <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700">
                <Grid2X2 className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <h3 id="multi-kiosk-preview-title" className="text-sm font-semibold text-slate-900">{copy.editor.previewTitle}</h3>
                <p className="mt-0.5 text-xs leading-5 text-slate-500">{copy.editor.previewDescription}</p>
              </div>
            </div>
            <div aria-live="polite" className="p-3">
              {selectedTools.length > 0 ? (
                <ol aria-label={copy.editor.previewTitle} className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-2 sm:grid-cols-3">
                  {selectedTools.map((tool, index) => {
                    const presentation = getMultiKioskToolPresentation(tool);
                    return (
                      <li key={tool.key} className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
                        <span aria-hidden="true" className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-slate-900 text-[10px] font-semibold text-white">
                          {index + 1}
                        </span>
                        <MultiKioskToolGlyph source={tool} className="h-9 w-9 rounded-lg [&_svg]:h-4 [&_svg]:w-4" />
                        <span className="min-w-0">
                          <span className="block truncate text-xs font-semibold text-slate-900">{toolName(tool, copy)}</span>
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
          <div className="relative mb-4"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input aria-label={copy.editor.searchPlaceholder} value={search} onChange={event => setSearch(event.target.value)} placeholder={copy.editor.searchPlaceholder} className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-blue-500" /></div>
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
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-xl p-1 text-left outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20"
                  >
                    <MultiKioskToolGlyph source={tool} selected={selected} className="h-11 w-11 rounded-xl [&_svg]:h-5 [&_svg]:w-5" />
                    <span className="min-w-0 flex-1">
                      <span className={cn('mb-1 block truncate text-[10px] font-semibold uppercase tracking-wide', presentation.toneClasses.module)}>
                        {moduleLabel(presentation.ownerModule, copy)}
                      </span>
                      <span className="block truncate text-sm font-semibold text-slate-900">{displayName}</span>
                      <span className="mt-1 block line-clamp-2 text-xs leading-5 text-slate-500">{toolDescription(tool, copy)}</span>
                      <span className="mt-2 flex flex-wrap gap-1.5">
                        <span className={cn('rounded-full border px-2 py-0.5 text-[10px]', presentation.toneClasses.badge)}>{audienceLabel(tool, copy)}</span>
                        <span className={cn('rounded-full border px-2 py-0.5 text-[10px]', selectable ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-800')}>{readinessLabel(tool, copy)}</span>
                      </span>
                    </span>
                  </button>
                  {selected ? <span className="flex flex-col gap-1"><button type="button" aria-label={copy.editor.moveUp(displayName)} disabled={order === 0} onClick={() => moveTool(tool.key, -1)} className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-white outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20 disabled:opacity-30"><ArrowUp className="h-3.5 w-3.5" /></button><button type="button" aria-label={copy.editor.moveDown(displayName)} disabled={order === form.toolKeys.length - 1} onClick={() => moveTool(tool.key, 1)} className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-white outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20 disabled:opacity-30"><ArrowDown className="h-3.5 w-3.5" /></button></span> : null}
                </div>
              );
            })}
          </div>
          {visibleTools.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 px-5 py-10 text-center text-sm text-slate-500">{copy.editor.emptyTools}</div>
          ) : null}
        </div>
      )}
    </KioskModalFrame>
  );
}
