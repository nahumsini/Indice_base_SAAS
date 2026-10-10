import { Grid2X2, Search, ShieldCheck, X } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import type { MultiKioskCard } from '../../api/multiKiosks';
import { cn } from '../../components/ui/utils';
import { getMultiKioskToolPresentation } from './toolPresentation';
import { MultiKioskToolTile } from './MultiKioskToolTile';

export interface MultiKioskLauncherDashboardCopy {
  accessCount: (count: number) => string;
  accessNote: string;
  available: string;
  intro: string;
  noAccess: string;
  noMatches: string;
  open: string;
  searchPlaceholder: string;
  clearSearch?: string;
  verificationRequired: string;
}

export interface MultiKioskLauncherDashboardProps {
  busyId?: number | null;
  cards: readonly MultiKioskCard[];
  className?: string;
  copy: MultiKioskLauncherDashboardCopy;
  moduleLabel?: (ownerModule: string) => string;
  onOpen: (card: MultiKioskCard) => void | Promise<void>;
  searchThreshold?: number;
  sessionLabel?: string;
  sessionStatusLabel?: string;
  compact?: boolean;
}

const normalizeSearch = (value: string) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim()
  .toLocaleLowerCase();

export function MultiKioskLauncherDashboard({
  busyId = null,
  cards,
  className,
  copy,
  moduleLabel,
  onOpen,
  searchThreshold = 6,
  sessionLabel,
  sessionStatusLabel,
  compact = false,
}: MultiKioskLauncherDashboardProps) {
  const [query, setQuery] = useState('');
  const searchInput = useRef<HTMLInputElement>(null);
  const clearSearch = () => { setQuery(''); searchInput.current?.focus(); };
  const shouldSearch = cards.length >= Math.max(6, searchThreshold);
  const visibleCards = useMemo(() => {
    const normalizedQuery = shouldSearch ? normalizeSearch(query) : '';
    if (!normalizedQuery) return cards;
    return cards.filter(card => {
      const presentation = getMultiKioskToolPresentation(card);
      const translatedModule = moduleLabel?.(presentation.ownerModule) ?? presentation.ownerModule;
      return normalizeSearch([
        presentation.name,
        presentation.description,
        translatedModule,
      ].join(' ')).includes(normalizedQuery);
    });
  }, [cards, moduleLabel, query, shouldSearch]);

  const resultCountLabel = copy.accessCount(visibleCards.length);

  return (
    <section
      aria-describedby="multi-kiosk-access-note"
      aria-labelledby="multi-kiosk-tool-dashboard-title"
      className={cn('space-y-4 sm:space-y-5', className)}
    >
      {compact ? (
        <header className="relative overflow-hidden rounded-[1.75rem] border border-[#DBEAFE] bg-[#EFF6FF] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] dark:border-blue-900 dark:bg-blue-950/50 dark:shadow-none sm:p-5">
          <div className="flex items-center gap-3 sm:gap-4">
            <span aria-hidden="true" className="grid h-14 w-14 shrink-0 -rotate-6 place-items-center rounded-[1.125rem] border border-white bg-white/90 text-[2rem] shadow-[0_4px_12px_-6px_rgba(20,54,117,0.25)] dark:border-blue-900 dark:bg-blue-950" style={{ fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif' }}>🧰</span>
            <div className="min-w-0">
              <h2 id="multi-kiosk-tool-dashboard-title" className="text-[22px] font-medium leading-7 tracking-tight text-[#143675] dark:text-blue-100 sm:text-2xl">{copy.available}</h2>
              <p className="mt-1 text-sm leading-5 text-[#425466] dark:text-slate-300">{copy.intro}</p>
            </div>
          </div>
          <div className="mt-4 flex min-w-0 flex-wrap items-center justify-between gap-2 border-t border-[#DBEAFE] pt-3 dark:border-blue-900">
            {sessionLabel ? <span className="inline-flex min-w-0 items-center gap-1.5 text-xs text-[#425466] dark:text-slate-300" aria-label={[sessionLabel, sessionStatusLabel].filter(Boolean).join('. ')}><ShieldCheck size={14} className="shrink-0 text-[#1D4ED8] dark:text-blue-300" aria-hidden="true" /><span className="max-w-48 truncate">{sessionLabel}</span></span> : null}
            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium tabular-nums text-[#143675] dark:bg-blue-950 dark:text-blue-200" aria-live="polite" aria-atomic="true">{resultCountLabel}</span>
          </div>
        </header>
      ) : <header className="space-y-1.5 px-0.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="multi-kiosk-tool-dashboard-title" className="text-lg font-medium leading-tight tracking-tight text-slate-950 dark:text-white">
            {copy.available}
          </h2>
          <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
            {sessionLabel ? (
              <span
                aria-label={[sessionLabel, sessionStatusLabel].filter(Boolean).join('. ')}
                className="inline-flex min-h-8 min-w-0 items-center gap-1.5 rounded-full bg-emerald-50 px-3 text-xs font-medium text-emerald-800 dark:bg-emerald-950/45 dark:text-emerald-200"
              >
                <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                <span className="max-w-40 truncate">{sessionLabel}</span>
              </span>
            ) : null}
            <span
              aria-atomic="true"
              aria-live="polite"
              className="inline-flex min-h-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white px-3 text-xs font-medium tabular-nums text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
            >
              {resultCountLabel}
            </span>
          </div>
        </div>
        <p className="max-w-3xl text-sm leading-5 text-slate-600 dark:text-slate-300">
          {copy.intro}
        </p>
      </header>}

      {shouldSearch ? (
        <div
          className="sticky top-0 z-20 -mx-1 bg-slate-50/95 px-1 py-1 backdrop-blur dark:bg-slate-900/95 sm:static sm:mx-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none sm:dark:bg-transparent"
          role="search"
        >
          <div className="relative">
          <label className="block">
            <span className="sr-only">{copy.searchPlaceholder}</span>
            <Search aria-hidden="true" className={cn('pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2', compact ? 'text-[#425466] dark:text-slate-300' : 'text-slate-400')} />
            <input
              aria-controls="multi-kiosk-tool-grid"
              ref={searchInput}
              autoComplete="off"
              type="search"
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder={copy.searchPlaceholder}
              className={cn('min-h-12 w-full rounded-2xl border bg-white py-3 pl-12 text-base text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 dark:border-slate-700 dark:bg-slate-950 dark:text-white', compact ? 'h-14 border-[#CFDBEB] pr-14 shadow-[0_2px_8px_-5px_rgba(20,54,117,0.2)] placeholder:text-[#526174] dark:placeholder:text-slate-400 [&::-webkit-search-cancel-button]:appearance-none' : 'border-slate-200 pr-4 placeholder:text-slate-400 dark:placeholder:text-slate-500 sm:text-sm')}
            />
          </label>
          {compact && query && copy.clearSearch ? <button type="button" onClick={clearSearch} aria-label={copy.clearSearch} className="absolute right-1 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-xl text-[#425466] hover:bg-[#EFF6FF] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/30 dark:text-slate-300 dark:hover:bg-slate-800"><X size={18} aria-hidden="true" /></button> : null}
          </div>
        </div>
      ) : null}

      {visibleCards.length > 0 ? (
        <ul
          id="multi-kiosk-tool-grid"
          className={cn('grid items-stretch gap-3 sm:gap-4', compact ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1 min-[360px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4')}
          data-kiosk-tool-grid
        >
          {visibleCards.map(card => {
            const presentation = getMultiKioskToolPresentation(card);
            const requiresVerification = card.availability === 'VERIFICATION_REQUIRED';
            return (
              <li key={card.id} className="min-w-0">
                <MultiKioskToolTile
                  compact={compact}
                  source={card}
                  actionLabel={copy.open}
                  busy={busyId === card.id}
                  disabled={busyId !== null}
                  moduleLabel={moduleLabel?.(presentation.ownerModule)}
                  onClick={() => { void onOpen(card); }}
                  statusLabel={requiresVerification ? copy.verificationRequired : undefined}
                  statusTone={requiresVerification ? 'attention' : 'ready'}
                />
              </li>
            );
          })}
        </ul>
      ) : (
        <div id="multi-kiosk-tool-grid" className="rounded-[1.5rem] border border-dashed border-slate-300 bg-white px-5 py-9 text-center dark:border-slate-700 dark:bg-slate-950" role="status">
          {compact ? <span aria-hidden="true" className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[#EFF6FF] text-3xl dark:bg-blue-950" style={{ fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif' }}>{cards.length === 0 ? '🧰' : '🔎'}</span> : <Grid2X2 aria-hidden="true" className="mx-auto h-8 w-8 text-slate-400" />}
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#425466] dark:text-slate-300">
            {cards.length === 0 ? copy.noAccess : copy.noMatches}
          </p>
          {compact && query && copy.clearSearch ? <button type="button" onClick={clearSearch} className="mt-5 min-h-12 rounded-xl bg-[#143675] px-5 py-3 text-sm font-medium text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/30 dark:bg-[#2563EB]">{copy.clearSearch}</button> : null}
        </div>
      )}

      <p id="multi-kiosk-access-note" className="flex items-start gap-1.5 px-0.5 text-xs leading-5 text-slate-500 dark:text-slate-400">
        <ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
        <span>{copy.accessNote}</span>
      </p>
    </section>
  );
}
