import { useState } from 'react';
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
