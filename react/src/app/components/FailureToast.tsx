import { AlertCircle, X } from 'lucide-react';
import { useEffect } from 'react';
import { Button } from './ui/button';
import { cn } from './ui/utils';

interface FailureToastProps {
  isVisible: boolean;
  message: string;
  onClose: () => void;
  durationMs?: number;
  className?: string;
}

const DEFAULT_TOAST_DURATION_MS = 4500;

export function FailureToast({
  isVisible,
  message,
  onClose,
  durationMs = DEFAULT_TOAST_DURATION_MS,
  className,
}: FailureToastProps) {
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
        'fixed bottom-4 right-4 z-[85] w-[calc(100vw-2rem)] max-w-sm rounded-xl border border-red-200 bg-red-50/95 p-3 shadow-[0_16px_30px_rgba(239,68,68,0.18)] backdrop-blur dark:border-red-700/60 dark:bg-red-950/90 sm:bottom-5 sm:right-5',
        className,
      )}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-300" />
        <p className="flex-1 text-sm font-medium leading-5 text-red-800 dark:text-red-100">
          {message}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-7 w-7 rounded-full text-red-700 hover:bg-red-100 hover:text-red-900 dark:text-red-200 dark:hover:bg-red-900/60 dark:hover:text-white"
          aria-label="Close error message"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
