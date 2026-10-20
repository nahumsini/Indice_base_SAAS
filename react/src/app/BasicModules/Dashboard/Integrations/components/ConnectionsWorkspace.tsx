import { useWorkspaceNavigationMemory } from '../../../../hooks/useWorkspaceNavigationMemory';
import { useState } from 'react';
import { IndiceFilterBar, IndiceFilterSearch, IndiceFilterSelect } from '../../../../components/frontend-os';
import { getAdminWorkspaceCopy } from '../../../../components/frontend-os/adminWorkspaceCopy';
import { Button } from '../../../../components/ui/button';
import { getConnectionStatus } from '../utils';
import { AlertTriangle, X } from 'lucide-react';
import type { AiConnection } from '../../../../api/aiConnections';
import type { AiConnectionsWorkspaceState } from '../hooks/useAiConnections';
import type { IntegrationsTranslations } from '../translations';
import { ConnectionDetail } from './ConnectionDetail';
import { ConnectionList } from './ConnectionList';
import { ConnectionTrustStrip } from './ConnectionTrustStrip';

type ConnectionsWorkspaceProps = {
  copy: IntegrationsTranslations;
  locale: string;
  onCreate: () => void;
  onRevoke: (connection: AiConnection) => void;
  workspace: AiConnectionsWorkspaceState;
};

export function ConnectionsWorkspace({ copy, locale, onCreate, onRevoke, workspace }: ConnectionsWorkspaceProps) {
  const labels = getAdminWorkspaceCopy(locale);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  useWorkspaceNavigationMemory({ moduleKey: 'home-panel', tabKey: 'ai-connections',
    state: { query, status }, defaults: { query: '', status: 'all' }, rememberScroll: false,
    onRestore: value => { setQuery(typeof value.query === 'string' ? value.query : ''); setStatus(['all', 'active', 'expired', 'revoked'].includes(value.status) ? value.status : 'all'); },
  });
  const filtered = Boolean(query.trim() || status !== 'all');
  const visibleConnections = workspace.connections.filter(connection =>
    (status === 'all' || getConnectionStatus(connection) === status) &&
    connection.label.toLocaleLowerCase(locale).includes(query.trim().toLocaleLowerCase(locale)));
  const visibleSelection = visibleConnections.find(connection => connection.id === workspace.selectedId) ?? null;
  return (
    <div className="space-y-4">
      <IndiceFilterBar title={labels.filters} summary={filtered ? <Button type="button" variant="outline" onClick={() => { setQuery(''); setStatus('all'); }}>{labels.clear}</Button> : undefined}>
        <IndiceFilterSearch label={labels.search} placeholder={labels.searchConnections} value={query} onValueChange={setQuery} onClear={() => setQuery('')} tone="blue" />
        <IndiceFilterSelect label={labels.status} value={status} onValueChange={setStatus} tone="blue" options={[{ value: 'all', label: labels.all }, ...Object.entries(copy.connections.status).map(([value, label]) => ({ value, label }))]} />
      </IndiceFilterBar>
      <ConnectionTrustStrip copy={copy} />

      {workspace.error ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200" role="alert">
          <span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 shrink-0" />{workspace.error}</span>
          <button type="button" onClick={() => workspace.setError('')} aria-label={copy.common.close}><X className="h-4 w-4" /></button>
        </div>
      ) : null}

      {workspace.connections.length ? (
        <p className="text-sm text-slate-600 dark:text-slate-300">{copy.connections.readyCount(workspace.activeCount)}</p>
      ) : null}

      <div className="grid min-h-[520px] gap-4 lg:grid-cols-[330px_minmax(0,1fr)]">
        <ConnectionList
          connections={visibleConnections}
          filtered={filtered}
          emptyLabel={labels.noResults}
          emptyHelp={labels.adjustFilters}
          copy={copy}
          isLoading={workspace.isLoading}
          locale={locale}
          onCreate={onCreate}
          onSelect={workspace.setSelectedId}
          selectedId={workspace.selectedId}
        />
        <ConnectionDetail
          activity={workspace.activity}
          activityError={workspace.activityError}
          connection={visibleSelection}
          copy={copy}
          isActivityLoading={workspace.isActivityLoading}
          locale={locale}
          onRevoke={onRevoke}
        />
      </div>
    </div>
  );
}
