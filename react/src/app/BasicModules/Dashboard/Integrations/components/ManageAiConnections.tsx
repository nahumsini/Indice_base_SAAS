import { useState } from 'react';
import { Bot, RefreshCw } from 'lucide-react';
import { IndiceTitleBar } from '../../../../components/frontend-os';
import { Button } from '../../../../components/ui/button';
import type { AiConnection } from '../../../../api/aiConnections';
import { useAiConnections } from '../hooks/useAiConnections';
import type { IntegrationsTranslations } from '../translations';
import { ConnectionsWorkspace } from './ConnectionsWorkspace';
import { RevokeAiConnectionDialog } from './RevokeAiConnectionDialog';

export function ManageAiConnections({ copy, locale, onConnect }: {
  copy: IntegrationsTranslations;
  locale: string;
  onConnect: () => void;
}) {
  const workspace = useAiConnections(copy);
  const [pendingRevoke, setPendingRevoke] = useState<AiConnection | null>(null);
  const busy = workspace.revokingId !== null;

  const confirmRevoke = async () => {
    if (!pendingRevoke || busy) return;
    if (await workspace.revokeConnection(pendingRevoke)) setPendingRevoke(null);
  };

  return (
    <>
      <IndiceTitleBar tone="blue" icon={<Bot />} title={copy.navigation.connections} subtitle={copy.connections.description} actions={<>
        <Button type="button" variant="outline" className="h-11 rounded-xl" disabled={workspace.isLoading} onClick={() => void workspace.loadConnections()}><RefreshCw className={workspace.isLoading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />{copy.connections.refresh}</Button>
        <Button type="button" className="h-11 rounded-xl bg-blue-600 text-white hover:bg-blue-700" onClick={onConnect}><Bot className="h-4 w-4" />{copy.connectButton}</Button>
      </>} />
      <ConnectionsWorkspace
        copy={copy}
        locale={locale}
        onCreate={onConnect}
        onRevoke={(connection) => {
          workspace.setError('');
          setPendingRevoke(connection);
        }}
        workspace={workspace}
      />
      <RevokeAiConnectionDialog
        busy={busy}
        connection={pendingRevoke}
        copy={copy}
        error={workspace.error}
        onCancel={() => { if (!busy) setPendingRevoke(null); }}
        onConfirm={() => void confirmRevoke()}
      />
    </>
  );
}
