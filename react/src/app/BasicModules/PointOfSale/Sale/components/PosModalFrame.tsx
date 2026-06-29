import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../../../components/ui/utils';

type PosModalSize = 'sm' | 'md' | 'lg' | 'xl';

const sizeClassNames: Record<PosModalSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-2xl',
  lg: 'max-w-5xl',
  xl: 'max-w-6xl',
};

interface PosModalFrameProps {
  actions?: ReactNode;
  children: ReactNode;
  closeLabel: string;
  eyebrow?: string;
  footer?: ReactNode;
  icon: ReactNode;
  isCloseDisabled?: boolean;
  onClose: () => void;
  size?: PosModalSize;
  subtitle?: string;
  title: string;
  zIndexClassName?: string;
}

export function PosModalFrame({
  actions,
  children,
  closeLabel,
  eyebrow,
  footer,
  icon,
  isCloseDisabled = false,
  onClose,
  size = 'lg',
  subtitle,
  title,
  zIndexClassName = 'z-50',
}: PosModalFrameProps) {
  return (
    <div className={cn('fixed inset-0 flex items-center justify-center bg-[#111827]/70 px-3 py-4 backdrop-blur-sm sm:px-4 sm:py-6', zIndexClassName)}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'flex max-h-[94vh] w-full flex-col overflow-hidden rounded-[24px] border border-white/10 bg-white shadow-2xl dark:bg-gray-950 sm:rounded-[28px]',
          sizeClassNames[size],
        )}
      >
        <header className="flex items-center justify-between gap-3 bg-[#222831] px-5 py-4 text-white sm:gap-4 sm:px-6 sm:py-5">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#FF6B5E]/20 text-white sm:h-14 sm:w-14">
              {icon}
            </span>
            <div className="min-w-0">
              {eyebrow ? (
                <p className="text-[11px] font-black uppercase tracking-normal text-[#F4C84A]">
                  {eyebrow}
                </p>
              ) : null}
              <h2 className="text-xl font-black leading-tight text-white sm:text-2xl">{title}</h2>
              {subtitle ? (
                <p className="mt-1 text-sm font-semibold leading-snug text-gray-300">{subtitle}</p>
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {actions}
            <button
              type="button"
              onClick={onClose}
              disabled={isCloseDisabled}
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label={closeLabel}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto bg-[#F7F8FA] p-4 dark:bg-[#111827] sm:p-5">
          {children}
        </div>

        {footer ? (
          <footer className="border-t border-gray-200 bg-white px-6 py-4 dark:border-gray-800 dark:bg-gray-950">
            {footer}
          </footer>
        ) : null}
      </section>
    </div>
  );
}

export function PosModalSection({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900', className)}>
      {children}
    </section>
  );
}
