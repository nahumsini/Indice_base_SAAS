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
  return (
    <div className="space-y-4">
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
          connections={workspace.connections}
          copy={copy}
          isLoading={workspace.isLoading}
          locale={locale}
          onCreate={onCreate}
          onRefresh={() => void workspace.loadConnections()}
          onSelect={workspace.setSelectedId}
          selectedId={workspace.selectedId}
        />
        <ConnectionDetail
          activity={workspace.activity}
          activityError={workspace.activityError}
          connection={workspace.selectedConnection}
          copy={copy}
          isActivityLoading={workspace.isActivityLoading}
          locale={locale}
          onRevoke={onRevoke}
        />
      </div>
    </div>
  );
}
