import type { ReactNode } from 'react';
import { Button } from '../../../../components/ui/button';
import { cn } from '../../../../components/ui/utils';

export type ReceivablesModalAction = {
  download?: boolean;
  disabled?: boolean;
  href?: string;
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  tone?: 'default' | 'primary';
};

export function ReceivablesModalActionToolbar({ actions }: { actions: ReceivablesModalAction[] }) {
  if (!actions.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-2" role="toolbar">
      {actions.map((action) => (
        <Button
          key={action.label}
          asChild={Boolean(action.href)}
          className={cn(
            'h-9 gap-2 rounded-xl px-3 text-sm font-medium shadow-sm',
            action.tone === 'primary'
              ? 'bg-[#147514] text-white hover:bg-[#0f5f0f] dark:bg-emerald-500 dark:hover:bg-emerald-400'
              : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800',
          )}
          disabled={action.disabled}
          onClick={action.onClick}
          title={action.label}
          type="button"
          variant={action.tone === 'primary' ? 'default' : 'outline'}
        >
          {action.href ? (
            <a
              download={action.download ? action.label : undefined}
              href={action.href}
              target={action.download || action.href.startsWith('data:') ? undefined : '_blank'}
              rel="noreferrer"
            >
              {action.icon}
              {action.label}
            </a>
          ) : (
            <span className="inline-flex items-center gap-2">{action.icon}{action.label}</span>
          )}
        </Button>
      ))}
    </div>
  );
}
