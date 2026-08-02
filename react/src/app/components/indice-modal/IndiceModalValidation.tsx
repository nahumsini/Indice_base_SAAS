import type { ReactNode } from 'react';
import { AlertTriangle, CircleAlert, Info } from 'lucide-react';
import { cn } from '../ui/utils';

export type IndiceModalValidationTone = 'error' | 'info' | 'warning';

export type IndiceModalValidationProps = {
  className?: string;
  messages: readonly ReactNode[];
  title?: ReactNode;
  tone?: IndiceModalValidationTone;
};

const toneStyles: Record<IndiceModalValidationTone, { container: string; icon: typeof CircleAlert }> = {
  error: {
    container: 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200',
    icon: CircleAlert,
  },
  info: {
    container: 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200',
    icon: Info,
  },
  warning: {
    container: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100',
    icon: AlertTriangle,
  },
};

export function IndiceModalValidation({
  className,
  messages,
  title,
  tone = 'error',
}: IndiceModalValidationProps) {
  if (!messages.length) return null;

  const toneStyle = toneStyles[tone];
  const Icon = toneStyle.icon;

  return (
    <div
      aria-live={tone === 'error' ? 'assertive' : 'polite'}
      className={cn('flex items-start gap-3 rounded-xl border px-4 py-3 text-sm leading-6', toneStyle.container, className)}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
      <div className="min-w-0">
        {title ? <p className="font-medium">{title}</p> : null}
        {messages.length === 1 ? (
          <p className={cn(title && 'mt-1')}>{messages[0]}</p>
        ) : (
          <ul className={cn('space-y-1', title && 'mt-1')}>
            {messages.map((message, index) => <li key={index}>{message}</li>)}
          </ul>
        )}
      </div>
    </div>
  );
}
