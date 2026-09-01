import { Ban, LoaderCircle, MoreHorizontal, Power, RefreshCw } from 'lucide-react';
import type { MultiKioskSummary } from '../api/multiKiosks';
import { KioskModalFrame } from '../components/kiosk-engine/KioskModalFrame';
import { Button } from '../components/ui/button';
import { cn } from '../components/ui/utils';
import type { KioskCenterWorkspaceCopy } from './kioskCenterWorkspaceTranslations';

export type MultiKioskLifecycleAction = 'enable' | 'disable' | 'revoke';
export type MultiKioskPendingCommand = {
  action: MultiKioskLifecycleAction | 'rotate';
  item: MultiKioskSummary;
};

export function MultiKioskOptionsModal({
  copy,
  item,
  onClose,
  onCommand,
}: {
  copy: KioskCenterWorkspaceCopy;
  item: MultiKioskSummary;
  onClose: () => void;
  onCommand: (command: MultiKioskPendingCommand) => void;
}) {
  const actions: Array<{
    action: MultiKioskPendingCommand['action'];
    danger?: boolean;
    description: string;
    icon: React.ReactNode;
    label: string;
  }> = [
    { action: 'rotate', label: copy.options.rotate, description: copy.options.rotateHelp, icon: <RefreshCw className="h-4 w-4" /> },
    ...(item.status === 'DISABLED' ? [{ action: 'enable' as const, label: copy.options.enable, description: copy.options.enableHelp, icon: <Power className="h-4 w-4" /> }] : []),
    ...(item.status === 'ACTIVE' ? [{ action: 'disable' as const, label: copy.options.disable, description: copy.options.disableHelp, icon: <Power className="h-4 w-4" /> }] : []),
    { action: 'revoke', label: copy.options.revoke, description: copy.options.revokeHelp, icon: <Ban className="h-4 w-4" />, danger: true },
  ];
  return (
    <KioskModalFrame
      open
      onOpenChange={open => { if (!open) onClose(); }}
      size="form"
      surface="administration"
      tone="blue"
      icon={<MoreHorizontal className="h-5 w-5" />}
      title={copy.options.title}
      description={copy.options.description}
      footer={<Button type="button" variant="outline" onClick={onClose}>{copy.options.close}</Button>}
      footerSummary={item.name}
    >
      <div className="space-y-3">
        {actions.map(action => (
          <button
            key={action.action}
            type="button"
            onClick={() => onCommand({ item, action: action.action })}
            className={cn(
              'flex min-h-14 w-full items-center gap-3 rounded-2xl border bg-white px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:bg-slate-900',
              action.danger
                ? 'border-red-200 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/30'
                : 'border-slate-200 text-slate-800 hover:border-blue-300 hover:bg-blue-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-blue-950/25',
            )}
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-100 dark:bg-slate-800">{action.icon}</span>
            <span><span className="block text-sm font-medium">{action.label}</span><span className="mt-1 block text-xs font-normal opacity-75">{action.description}</span></span>
          </button>
        ))}
      </div>
    </KioskModalFrame>
  );
}

export function MultiKioskCommandConfirmationModal({
  busy,
  command,
  copy,
  onCancel,
  onConfirm,
}: {
  busy: boolean;
  command: MultiKioskPendingCommand;
  copy: KioskCenterWorkspaceCopy;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const content = command.action === 'rotate'
    ? { title: copy.confirmation.rotateTitle, description: copy.confirmation.rotateDescription, action: copy.confirmation.rotateAction, tone: 'blue' as const, icon: <RefreshCw className="h-5 w-5" /> }
    : command.action === 'enable'
      ? { title: copy.confirmation.enableTitle, description: copy.confirmation.enableDescription, action: copy.confirmation.enableAction, tone: 'aqua' as const, icon: <Power className="h-5 w-5" /> }
      : command.action === 'disable'
        ? { title: copy.confirmation.disableTitle, description: copy.confirmation.disableDescription, action: copy.confirmation.disableAction, tone: 'yellow' as const, icon: <Power className="h-5 w-5" /> }
        : { title: copy.confirmation.revokeTitle, description: copy.confirmation.revokeDescription, action: copy.confirmation.revokeAction, tone: 'coral' as const, icon: <Ban className="h-5 w-5" /> };
  return (
    <KioskModalFrame
      open
      onOpenChange={open => { if (!open && !busy) onCancel(); }}
      busy={busy}
      size="compact"
      surface="administration"
      tone={content.tone}
      icon={content.icon}
      title={content.title}
      description={content.description}
      footerSummary={command.item.name}
      footer={(
        <>
          <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>{copy.confirmation.cancel}</Button>
          <Button type="button" onClick={onConfirm} disabled={busy} data-modal-destructive={command.action === 'revoke' ? true : undefined}>
            {busy ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
            {busy ? copy.confirmation.processing : content.action}
          </Button>
        </>
      )}
    >
      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white">{command.item.name}</div>
    </KioskModalFrame>
  );
}
