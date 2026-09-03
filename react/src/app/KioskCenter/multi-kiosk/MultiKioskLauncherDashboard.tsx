import { Grid2X2, Search, ShieldCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
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
}: MultiKioskLauncherDashboardProps) {
  const [query, setQuery] = useState('');
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
      <header className="space-y-1.5 px-0.5">
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
      </header>

      {shouldSearch ? (
        <div
          className="sticky top-0 z-20 -mx-1 bg-slate-50/95 px-1 py-1 backdrop-blur dark:bg-slate-900/95 sm:static sm:mx-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none sm:dark:bg-transparent"
          role="search"
        >
          <label className="relative block">
            <span className="sr-only">{copy.searchPlaceholder}</span>
            <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              aria-controls="multi-kiosk-tool-grid"
              autoComplete="off"
              type="search"
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder={copy.searchPlaceholder}
              className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/15 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-blue-700 sm:text-sm"
            />
          </label>
        </div>
      ) : null}

      {visibleCards.length > 0 ? (
        <ul
          id="multi-kiosk-tool-grid"
          className="grid grid-cols-1 items-stretch gap-3 min-[360px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 sm:gap-4"
          data-kiosk-tool-grid
        >
          {visibleCards.map(card => {
            const presentation = getMultiKioskToolPresentation(card);
            const requiresVerification = card.availability === 'VERIFICATION_REQUIRED';
            return (
              <li key={card.id} className="min-w-0">
                <MultiKioskToolTile
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
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center dark:border-slate-700 dark:bg-slate-950" role="status">
          <Grid2X2 aria-hidden="true" className="mx-auto h-8 w-8 text-slate-400" />
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            {cards.length === 0 ? copy.noAccess : copy.noMatches}
          </p>
        </div>
      )}

      <p id="multi-kiosk-access-note" className="flex items-start gap-1.5 px-0.5 text-xs leading-5 text-slate-500 dark:text-slate-400">
        <ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
        <span>{copy.accessNote}</span>
      </p>
    </section>
  );
}
