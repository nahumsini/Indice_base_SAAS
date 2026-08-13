import type { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '../ui/button';
import { IndiceModalFrame, type IndiceModalTone } from './IndiceModalFrame';

export type IndiceConfirmationDialogProps = {
  busy?: boolean;
  cancelLabel?: string;
  children?: ReactNode;
  confirmDisabled?: boolean;
  confirmLabel?: string;
  description: ReactNode;
  destructive?: boolean;
  icon?: ReactNode;
  itemName?: ReactNode;
  onCancel: () => void;
  onConfirm: () => void;
  open: boolean;
  title: ReactNode;
  tone?: IndiceModalTone;
};

export function IndiceConfirmationDialog({
  busy = false,
  cancelLabel = 'Cancelar',
  children,
  confirmDisabled = false,
  confirmLabel = 'Confirmar',
  description,
  destructive = false,
  icon = <AlertTriangle className="h-5 w-5" />,
  itemName,
  onCancel,
  onConfirm,
  open,
  title,
  tone = 'aqua',
}: IndiceConfirmationDialogProps) {
  return (
    <IndiceModalFrame
      busy={busy}
      description={description}
      footer={(
        <>
          <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            data-modal-destructive={destructive ? true : undefined}
            onClick={onConfirm}
            disabled={busy || confirmDisabled}
          >
            {confirmLabel}
          </Button>
        </>
      )}
      icon={icon}
      modalType="confirmation"
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onCancel();
      }}
      open={open}
      title={title}
      tone={tone}
    >
      <div className="space-y-4">
        {itemName ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
            {itemName}
          </div>
        ) : null}
        {children}
      </div>
    </IndiceModalFrame>
  );
}
