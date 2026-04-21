import { CheckCircle2, X } from 'lucide-react';
import { useEffect } from 'react';
import { Button } from './ui/button';
import { cn } from './ui/utils';

interface SuccessToastProps {
  isVisible: boolean;
  message: string;
  onClose: () => void;
  durationMs?: number;
  className?: string;
}

const DEFAULT_TOAST_DURATION_MS = 3200;

export function SuccessToast({
  isVisible,
  message,
  onClose,
  durationMs = DEFAULT_TOAST_DURATION_MS,
  className,
}: SuccessToastProps) {
  useEffect(() => {
    if (!isVisible) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      onClose();
    }, durationMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [durationMs, isVisible, onClose]);

  if (!isVisible || !message) {
    return null;
  }

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-[85] w-[calc(100vw-2rem)] max-w-sm rounded-xl border border-emerald-200 bg-emerald-50/95 p-3 shadow-[0_16px_30px_rgba(16,185,129,0.18)] backdrop-blur dark:border-emerald-700/60 dark:bg-emerald-950/90 sm:bottom-5 sm:right-5',
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600 dark:text-emerald-300" />
        <p className="flex-1 text-sm font-medium leading-5 text-emerald-800 dark:text-emerald-100">
          {message}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-7 w-7 rounded-full text-emerald-700 hover:bg-emerald-100 hover:text-emerald-900 dark:text-emerald-200 dark:hover:bg-emerald-900/60 dark:hover:text-white"
          aria-label="Close confirmation"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
