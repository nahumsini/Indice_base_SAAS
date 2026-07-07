import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../../../components/ui/utils';

interface ReceivablesModalFrameProps {
  children: ReactNode;
  description: string;
  footer: ReactNode;
  icon: ReactNode;
  maxWidthClassName?: string;
  onClose: () => void;
  title: string;
}

export function ReceivablesModalFrame({
  children,
  description,
  footer,
  icon,
  maxWidthClassName = 'max-w-3xl',
  onClose,
  title,
}: ReceivablesModalFrameProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <section
        className={cn(
          'flex max-h-[92vh] w-full flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900',
          maxWidthClassName,
        )}
      >
        <header className="flex shrink-0 items-start justify-between gap-4 bg-[#147514] px-6 py-4 text-white">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white shadow-sm">
              {icon}
            </div>
            <div className="min-w-0">
              <h3 className="text-xl font-semibold leading-6 text-white">{title}</h3>
              <p className="mt-1 max-w-2xl text-sm leading-5 text-white/80">{description}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white transition-colors hover:bg-white/20"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/70 p-6 dark:bg-slate-950/40">
          {children}
        </div>

        <footer className="flex shrink-0 flex-col-reverse gap-3 bg-[#147514] px-6 py-4 sm:flex-row sm:items-center sm:justify-end">
          {footer}
        </footer>
      </section>
    </div>
  );
}
