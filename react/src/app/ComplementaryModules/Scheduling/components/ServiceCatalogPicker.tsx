import { useCallback, useEffect, useId, useState } from 'react';
import { ExternalLink, RefreshCw } from 'lucide-react';
import { authApi } from '../../../api/auth';
import { dashboardApi } from '../../../api/dashboard';
import { IndiceFilterSearch } from '../../../components/frontend-os/IndiceFilterBar';
import { IndiceViewState } from '../../../components/frontend-os/IndiceViewState';
import { schedulingApi, type InventoryService, type Service } from '../services/schedulingApi';
import { useSchedulingQuery } from '../hooks/useSchedulingQuery';
import { canOpenInventoryProducts } from '../utils/schedulingNavigation';
import type { SchedulingCopy } from '../translations/schedulingCopy';
import { getServiceEditorCopy } from '../translations/serviceEditorCopy';
import { getSchedulingSetupCopy } from '../translations/schedulingSetupCopy';
import { ActionButton, Feedback } from './SchedulingPrimitives';

export function ServiceCatalogPicker({ selected, configuredServices, serviceId, copy, locale, onSelect, onEditConfigured }: {
  selected?: InventoryService; configuredServices: Service[]; serviceId?: number; copy: SchedulingCopy; locale: string;
  onSelect: (item: InventoryService) => void; onEditConfigured: (id: number) => void;
}) {
  const text = getServiceEditorCopy(locale), setup = getSchedulingSetupCopy(locale), groupId = useId();
  const [term,setTerm] = useState(''), [search,setSearch] = useState(''), [page,setPage] = useState(1);
  useEffect(() => { const timer = setTimeout(() => { setSearch(term); setPage(1); },250); return () => clearTimeout(timer); },[term]);
  const catalog = useSchedulingQuery(useCallback(signal => schedulingApi.inventoryServices(search,page,signal),[search,page]));
  const access = useSchedulingQuery(useCallback(async () => {
    const [session,modules] = await Promise.all([authApi.getSessionOrNull(),dashboardApi.listModules()]);
    return canOpenInventoryProducts(session,modules);
  },[]));
  const pages = Math.ceil((catalog.data?.total ?? 0)/25);
  const outOfRange = Boolean(catalog.data && page > Math.max(1,pages));
  const loading = catalog.loading || term !== search || outOfRange;
  useEffect(() => { if (outOfRange) setPage(Math.max(1,pages)); },[outOfRange,pages]);
  return <section className="min-w-0 space-y-4" aria-label={text.results}>
    <div className="flex flex-wrap items-end gap-3"><IndiceFilterSearch className="min-w-0 flex-1 basis-56" label={setup.findService} placeholder={text.searchPlaceholder} tone="coral" value={term} onValueChange={value => setTerm(value.slice(0,180))} onClear={() => setTerm('')} clearLabel={text.clearSearch}/>
      <ActionButton disabled={loading} onClick={catalog.reload}><RefreshCw aria-hidden="true" className="h-4 w-4"/>{text.refreshCatalog}</ActionButton></div>
    {loading ? <Feedback>{copy.loading}</Feedback> : catalog.error ? <Feedback error>{copy.error}<ActionButton onClick={catalog.reload}>{copy.retry}</ActionButton></Feedback> : catalog.data && <>
      {!catalog.data.items.length ? <IndiceViewState compact variant="empty" tone="coral" title={search.trim() ? text.noMatches : text.emptyTitle} description={search.trim() ? text.noMatchesHint : text.emptyHint} action={search.trim()
        ? <ActionButton onClick={() => setTerm('')}>{text.clearSearch}</ActionButton>
        : access.data === true ? <a href="/inventory/products" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 focus-visible:outline-2 focus-visible:outline-[#FF6B5E] dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200">{text.openInventory}<ExternalLink aria-hidden="true" className="h-4 w-4"/></a> : undefined}/> :
        <fieldset className="min-w-0"><legend className="sr-only">{text.selectService}</legend><ul className="space-y-2">{catalog.data.items.map(item => {
          const configured = configuredServices.find(value => value.productId === item.id && value.id !== serviceId);
          const details = <span className="min-w-0 flex-1"><span className="block break-words text-sm font-medium">{item.name}</span>{item.sku && <span className="mt-1 block break-words text-xs text-slate-500 dark:text-slate-400">{text.inventoryCode}: {item.sku}</span>}{item.description && <span className="mt-1 line-clamp-2 break-words text-xs leading-5 text-slate-500 dark:text-slate-400">{item.description}</span>}{!item.active && <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{text.inactive}</span>}</span>;
          return <li key={item.id}>{configured ? <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">{details}<div className="flex flex-wrap items-center gap-2"><span className="text-xs text-slate-500 dark:text-slate-400">{text.configured}</span><ActionButton onClick={() => onEditConfigured(configured.id)} aria-label={`${text.editConfiguration}: ${item.name}`}>{text.editConfiguration}</ActionButton></div></div> :
            <label className={`flex min-h-16 items-start gap-3 rounded-xl border p-3 ${selected?.id === item.id ? 'border-[#FF6B5E] bg-[#FF6B5E]/5' : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'} ${item.active ? 'cursor-pointer' : 'opacity-60'}`}>
              <input type="radio" name={groupId} value={item.id} checked={selected?.id === item.id} disabled={!item.active} className="mt-1 h-4 w-4 shrink-0 accent-[#FF6B5E]" aria-label={`${text.selectService}: ${item.name}`} onChange={() => onSelect(item)}/>{details}
            </label>}</li>;
        })}</ul></fieldset>}
      {pages > 1 && <nav aria-label={text.catalogPages} className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600 dark:text-slate-300"><span>{text.page} {page} {text.of} {pages}</span><div className="flex flex-wrap gap-2"><ActionButton disabled={page <= 1} onClick={() => setPage(value => value-1)}>{text.previousPage}</ActionButton><ActionButton disabled={page >= pages} onClick={() => setPage(value => value+1)}>{text.nextPage}</ActionButton></div></nav>}
    </>}
  </section>;
}
