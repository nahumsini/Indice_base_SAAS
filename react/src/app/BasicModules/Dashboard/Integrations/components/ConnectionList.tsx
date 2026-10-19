import { Bot, ChevronRight, LoaderCircle } from 'lucide-react';
import type { AiConnection } from '../../../../api/aiConnections';
import type { IntegrationsTranslations } from '../translations';
import { formatConnectionDate, getConnectionStatus } from '../utils';

type ConnectionListProps = {
  connections: AiConnection[];
  copy: IntegrationsTranslations;
  isLoading: boolean;
  locale: string;
  onCreate: () => void;
  filtered?: boolean;
  emptyLabel?: string;
  emptyHelp?: string;
  onSelect: (connectionId: number) => void;
  selectedId: number | null;
};

export function ConnectionList({
  connections,
  copy,
  isLoading,
  locale,
  onCreate,
  filtered = false,
  emptyLabel,
  emptyHelp,
  onSelect,
  selectedId,
}: ConnectionListProps) {
  return (
    <aside className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3 px-2 py-2">
        <div>
          <h3 className="text-base font-medium text-slate-950 dark:text-white">{copy.connections.title}</h3>
          <p className="mt-0.5 text-xs leading-5 text-slate-500">{copy.connections.description}</p>
        </div>

      </div>

      <div className="mt-2 space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-slate-500"><LoaderCircle className="h-5 w-5 animate-spin" /></div>
        ) : connections.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center dark:border-slate-700">
            <Bot className="mx-auto h-8 w-8 text-[#2563EB]" />
            <p className="mt-3 text-sm font-medium text-slate-900 dark:text-white">{filtered ? emptyLabel : copy.connections.emptyTitle}</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">{filtered ? emptyHelp : copy.connections.emptyDescription}</p>
            {!filtered && <button type="button" onClick={onCreate} className="mt-4 inline-flex min-h-11 items-center text-sm font-medium text-[#2563EB] hover:text-[#1D4ED8]">
              {copy.connections.emptyAction}
            </button>}
          </div>
        ) : connections.map((connection) => {
          const status = getConnectionStatus(connection);
          const selected = selectedId === connection.id;
          return (
            <button
              type="button"
              aria-pressed={selected}
              key={connection.id}
              onClick={() => onSelect(connection.id)}
              className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] ${selected ? 'border-[#2563EB]/45 bg-[#2563EB]/5 dark:bg-[#2563EB]/10' : 'border-transparent bg-slate-50 hover:border-slate-200 dark:bg-slate-800/60 dark:hover:border-slate-700'}`}
            >
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${status === 'active' ? 'bg-emerald-500' : status === 'expired' ? 'bg-amber-500' : 'bg-slate-400'}`} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-slate-900 dark:text-white">{connection.label}</span>
                <span className="mt-0.5 block truncate text-xs text-slate-500">
                  {connection.lastUsedAt
                    ? formatConnectionDate(connection.lastUsedAt, locale, copy.connections.noActivity)
                    : copy.connections.noActivity}
                </span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
            </button>
          );
        })}
      </div>
    </aside>
  );
}
