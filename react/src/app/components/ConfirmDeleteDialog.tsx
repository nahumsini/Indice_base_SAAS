import type { ReactNode } from 'react';
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
        className="z-[100] w-full max-w-md overflow-hidden border-gray-200 bg-white p-0 shadow-2xl dark:border-gray-700 dark:bg-gray-800"
        hideCloseButton
      >
        <DialogHeader className="border-b border-gray-200 px-5 py-4 dark:border-gray-700">
          <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">
            {title}
          </DialogTitle>
          {description ? (
            <DialogDescription className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              {description}
            </DialogDescription>
          ) : null}
          {itemName ? (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:border-red-800/60 dark:bg-red-900/20 dark:text-red-300">
              {itemName}
            </div>
          ) : null}
          {children ? (
            <div className="mt-4">
              {children}
            </div>
          ) : null}
        </DialogHeader>

        <div className="flex flex-col-reverse gap-3 bg-gray-50 px-5 py-4 dark:bg-gray-900/40 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="w-full sm:w-auto"
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={confirmDisabled}
            className="w-full sm:w-auto"
          >
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
