import { useId, useState } from 'react';
import { ArrowRight, ChevronDown, ChevronUp, Clock, Loader2, ReceiptText, RefreshCw, Search, User } from 'lucide-react';
import { usePointOfSaleKioskTranslations } from '../../Kiosks/kioskTranslations';
import type { PreTicket } from '../../shared/cashClosing.types';

interface PendingPreTicketsPanelProps {
  preTickets: PreTicket[];
  onPullPreTicket: (preTicketId: string) => void;
  onRetry: () => void;
  formatCurrency: (amount: number) => string;
  queueError: boolean;
  isRefreshing: boolean;
  lastUpdatedAt: Date | null;
  claimingPreTicketIds: string[];
}

export function PendingPreTicketsPanel({
  preTickets,
  onPullPreTicket,
  onRetry,
  formatCurrency,
  queueError,
  isRefreshing,
  lastUpdatedAt,
  claimingPreTicketIds,
}: PendingPreTicketsPanelProps) {
  const { copy, locale } = usePointOfSaleKioskTranslations();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const panelId = useId();
  const nextPreTicket = preTickets[0];
  const normalizedQuery = query.trim().toLocaleLowerCase(locale);
  const filteredPreTickets = normalizedQuery
    ? preTickets.filter((preTicket) => `${preTicket.code} ${preTicket.customerName}`.toLocaleLowerCase(locale).includes(normalizedQuery))
    : preTickets;

  return (
    <div className="overflow-hidden rounded-lg border border-[#F4C84A]/35 bg-white shadow-sm dark:border-[#F4C84A]/20 dark:bg-gray-800">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="flex min-h-11 w-full items-center justify-between gap-3 px-5 py-4 text-left transition hover:bg-[#F4C84A]/10 dark:hover:bg-[#F4C84A]/10"
        aria-expanded={isOpen}
        aria-controls={panelId}
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#F4C84A]/25 dark:bg-[#F4C84A]/15" aria-hidden="true">
            <ReceiptText className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-base font-medium text-[#222831] dark:text-white">{copy.pendingPretickets.title}</h3>
            <p className="truncate text-sm font-medium text-gray-500 dark:text-gray-400">
              {preTickets.length === 0
                ? copy.pendingPretickets.emptySummary
                : nextPreTicket
                  ? copy.pendingPretickets.summary(preTickets.length, nextPreTicket.code, formatCurrency(nextPreTicket.total))
                  : copy.pendingPretickets.readySummary(preTickets.length)}
            </p>
            {lastUpdatedAt ? (
              <p className="mt-0.5 text-[11px] font-medium text-gray-400">
                {copy.pendingPretickets.lastUpdatedAt(lastUpdatedAt.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }))}
              </p>
            ) : null}
          </div>
        </div>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#222831] text-white dark:bg-gray-700 dark:text-gray-200" aria-hidden="true">
          {isRefreshing ? <Loader2 className="h-5 w-5 animate-spin" /> : isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </span>
      </button>

      {isOpen ? (
        <div id={panelId} className="max-h-80 space-y-2 overflow-y-auto border-t border-gray-200 p-3 dark:border-gray-700">
          {queueError ? (
            <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
              <span>{copy.pendingPretickets.loadError}</span>
              <button type="button" disabled={isRefreshing} onClick={onRetry} className="inline-flex h-11 items-center gap-2 rounded-lg border border-amber-300 bg-white px-3 text-xs font-medium disabled:opacity-50 dark:border-amber-700 dark:bg-gray-900">
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? copy.pendingPretickets.refreshing : copy.pendingPretickets.retry}
              </button>
            </div>
          ) : null}

          <label className="relative block">
            <span className="sr-only">{copy.pendingPretickets.searchLabel}</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={copy.pendingPretickets.searchPlaceholder}
              className="h-11 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 text-sm dark:border-gray-700 dark:bg-gray-900"
            />
          </label>

          {filteredPreTickets.map((preTicket) => {
            const claiming = claimingPreTicketIds.includes(preTicket.id);
            return (
              <button
                type="button"
                key={preTicket.id}
                disabled={claiming}
                onClick={() => onPullPreTicket(preTicket.id)}
                aria-label={copy.pendingPretickets.claimAction(preTicket.code)}
                className="group min-h-11 w-full rounded-lg border border-gray-200 bg-gray-50 p-3 text-left transition hover:border-[#59C3A5]/50 hover:bg-[#59C3A5]/10 disabled:cursor-wait disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900/40 dark:hover:border-[#59C3A5]/40 dark:hover:bg-[#59C3A5]/10"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-gray-950 dark:text-white">{preTicket.code}</p>
                      <span className="rounded-md bg-white px-1.5 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                        {copy.pendingPretickets.lineCount(preTicket.items.length)}
                      </span>
                      <span className="rounded-md bg-[#59C3A5]/20 px-1.5 py-0.5 text-[10px] font-medium text-[#14745F] dark:bg-[#59C3A5]/15 dark:text-[#9DE7D3]">
                        {claiming ? copy.pendingPretickets.claiming : preTicket.status === 'pending' ? copy.pendingPretickets.pendingStatus : copy.pendingPretickets.loadedStatus}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-xs font-medium text-gray-700 dark:text-gray-200">
                      {preTicket.customerName || copy.pendingPretickets.customerFallback}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {preTicket.advisorName || copy.pendingPretickets.advisor}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {preTicket.createdAt.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-medium text-gray-950 dark:text-white">{formatCurrency(preTicket.total)}</p>
                    <span className="mt-2 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-[#2563EB] text-white transition group-hover:bg-[#1D4ED8]">
                      {claiming ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}

          {!queueError && filteredPreTickets.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 p-4 text-center dark:border-gray-700">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{preTickets.length === 0 ? copy.pendingPretickets.emptyTitle : copy.pendingPretickets.noMatchTitle}</p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{preTickets.length === 0 ? copy.pendingPretickets.emptyHelp : copy.pendingPretickets.noMatchHelp}</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
