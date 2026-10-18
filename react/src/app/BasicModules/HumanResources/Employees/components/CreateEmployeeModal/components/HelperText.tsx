import type { ReactNode } from 'react';
import { cn } from '../../../../../../components/ui/utils';

interface HelperTextProps {
  children: ReactNode;
  id?: string;
  tone?: 'default' | 'error' | 'warning' | 'success';
  className?: string;
}

const toneClassNames: Record<NonNullable<HelperTextProps['tone']>, string> = {
  default: 'text-slate-500 dark:text-slate-400',
  error: 'text-red-600 dark:text-red-400',
  warning: 'text-amber-700 dark:text-amber-300',
  success: 'text-emerald-700 dark:text-emerald-300',
};

export function HelperText({ children, tone = 'default', className, id }: HelperTextProps) {
  return (
    <p id={id} role={tone === 'error' ? 'alert' : undefined} className={cn('mt-1.5 break-words text-xs leading-5', toneClassNames[tone], className)}>
      {children}
    </p>
  );
}
