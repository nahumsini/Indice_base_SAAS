import type { ReactNode } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

interface ConfirmDeleteDialogProps {
  isVisible: boolean;
  title: string;
  itemName?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmDisabled?: boolean;
  children?: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDeleteDialog({
  isVisible,
  title,
  itemName,
  description,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  confirmDisabled = false,
  children,
  onConfirm,
  onCancel,
}: ConfirmDeleteDialogProps) {
  return (
    <Dialog
      open={isVisible}
      onOpenChange={(open) => {
        if (!open) {
          onCancel();
        }
      }}
    >
      <DialogContent
        className="z-[100] w-[calc(100vw-2rem)] max-w-md overflow-hidden rounded-[28px] border border-red-200 bg-white p-0 shadow-[0_26px_70px_rgba(127,29,29,0.28)] dark:border-red-900/60 dark:bg-slate-950 sm:max-w-md"
        hideCloseButton
      >
        <div className="bg-red-600 px-5 py-4 text-white dark:bg-red-700">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white">
                <AlertTriangle className="h-5 w-5" />
              </span>
              <DialogHeader className="min-w-0 gap-1 text-left">
                <DialogTitle className="text-lg font-semibold leading-6 text-white">
                  {title}
                </DialogTitle>
              </DialogHeader>
            </div>
            <button
              type="button"
              aria-label={cancelLabel}
              onClick={onCancel}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="space-y-4 bg-slate-50/80 px-5 py-5 dark:bg-slate-950/70">
          {description ? (
            <DialogDescription className="text-sm leading-6 text-slate-600 dark:text-slate-300">
              {description}
            </DialogDescription>
          ) : null}
          {itemName ? (
            <div className="rounded-2xl border border-red-200 bg-white px-4 py-3 text-sm font-semibold text-red-700 shadow-sm dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
              {itemName}
            </div>
          ) : null}
          {children ? <div>{children}</div> : null}
        </div>

        <div className="flex flex-col-reverse gap-3 bg-red-600 px-5 py-4 dark:bg-red-700 sm:flex-row sm:justify-end">
          <Button
            type="button"
            onClick={onCancel}
            className="w-full rounded-xl border border-white/30 bg-white/10 text-white hover:bg-white/20 sm:w-auto"
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={confirmDisabled}
            className="w-full rounded-xl bg-white font-semibold text-red-700 hover:bg-red-50 disabled:bg-white/60 disabled:text-red-900 sm:w-auto"
          >
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
