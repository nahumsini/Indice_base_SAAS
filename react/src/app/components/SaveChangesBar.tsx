import { Button } from './ui/button';
import { cn } from './ui/utils';

interface SaveChangesBarProps {
  isVisible: boolean;
  isSaving?: boolean;
  isSaveDisabled?: boolean;
  onSave: () => void | Promise<void>;
  onDiscard: () => void;
  saveLabel?: string;
  savingLabel?: string;
  discardLabel?: string;
  message?: string;
  className?: string;
}

export function SaveChangesBar({
  isVisible,
  isSaving = false,
  isSaveDisabled = false,
  onSave,
  onDiscard,
  saveLabel = 'Save',
  savingLabel = 'Saving...',
  discardLabel = 'Discard',
  message,
  className,
}: SaveChangesBarProps) {
  if (!isVisible) {
    return null;
  }

  return (
    <div
      className={cn(
        'fixed inset-x-0 bottom-0 z-[80] border-t border-slate-200/80 bg-white/95 shadow-[0_-12px_30px_rgba(15,23,42,0.08)] backdrop-blur dark:border-gray-700 dark:bg-gray-900/95',
        className,
      )}
    >
      <div className="mx-auto flex w-full max-w-[1600px] items-center justify-end gap-3 px-4 py-3 sm:px-8">
        {message ? (
          <p className="hidden flex-1 text-sm text-slate-600 dark:text-gray-300 sm:block">
            {message}
          </p>
        ) : null}

        <Button
          type="button"
          variant="outline"
          onClick={onDiscard}
          disabled={isSaving}
          className="border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          {discardLabel}
        </Button>
        <Button
          type="button"
          onClick={onSave}
          disabled={isSaving || isSaveDisabled}
          className="bg-purple-600 text-white hover:bg-purple-700"
        >
          {isSaving ? savingLabel : saveLabel}
        </Button>
      </div>
    </div>
  );
}
