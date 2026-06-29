import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../../../components/ui/utils';

type CortesModalSize = 'md' | 'lg' | 'xl';

const sizeClassNames: Record<CortesModalSize, string> = {
  md: 'max-w-2xl',
  lg: 'max-w-4xl',
  xl: 'max-w-6xl',
};

interface CortesModalFrameProps {
  children: ReactNode;
  closeLabel: string;
  eyebrow?: string;
  footer?: ReactNode;
  icon?: ReactNode;
  onClose: () => void;
  open: boolean;
  size?: CortesModalSize;
  subtitle?: string;
  title: string;
}

export function CortesModalFrame({
  children,
  closeLabel,
  eyebrow,
  footer,
  icon,
  onClose,
  open,
  size = 'lg',
  subtitle,
  title,
}: CortesModalFrameProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'flex max-h-[90vh] w-full flex-col overflow-hidden rounded-[24px] border border-white/10 bg-white shadow-2xl dark:bg-slate-900',
          sizeClassNames[size],
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-6 py-5 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex min-w-0 items-start gap-3">
            {icon ? (
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#FF6B5E]/10 text-[#FF6B5E]">
                {icon}
              </span>
            ) : null}
            <div className="min-w-0">
              {eyebrow ? (
                <p className="text-xs font-black uppercase tracking-normal text-[#B63B32] dark:text-[#FFB0AA]">
                  {eyebrow}
                </p>
              ) : null}
              <h3 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">{title}</h3>
              {subtitle ? (
                <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-500 dark:text-slate-300">
                  {subtitle}
                </p>
              ) : null}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            aria-label={closeLabel}
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 p-6 dark:bg-slate-950">
          {children}
        </div>

        {footer ? (
          <footer className="border-t border-slate-200 bg-white px-6 py-4 dark:border-slate-700 dark:bg-slate-900">
            {footer}
          </footer>
        ) : null}
      </section>
    </div>
  );
}
