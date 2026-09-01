import { Power } from 'lucide-react';
import type { AiConnection } from '../../../../api/aiConnections';
import { IndiceConfirmationDialog } from '../../../../components/indice-modal';
import type { IntegrationsTranslations } from '../translations';

export function RevokeAiConnectionDialog({ busy, connection, copy, onCancel, onConfirm }: {
  busy: boolean;
  connection: AiConnection | null;
  copy: IntegrationsTranslations;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <IndiceConfirmationDialog
      busy={busy}
      cancelLabel={copy.revoke.cancel}
      confirmLabel={copy.revoke.confirm}
      description={copy.revoke.description}
      destructive
      icon={<Power className="h-5 w-5" />}
      itemName={connection?.label}
      onCancel={onCancel}
      onConfirm={onConfirm}
      open={Boolean(connection)}
      title={copy.revoke.title}
      tone="blue"
    >
      <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{copy.revoke.consequence}</p>
    </IndiceConfirmationDialog>
  );
}
