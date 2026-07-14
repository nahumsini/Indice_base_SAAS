import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../../../components/ui/utils';

type PosModalSize = 'sm' | 'md' | 'lg' | 'xl';
type PosModalTone = 'graphite' | 'coral';

const sizeClassNames: Record<PosModalSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-2xl',
  lg: 'max-w-5xl',
  xl: 'max-w-6xl',
};

const toneClassNames: Record<PosModalTone, {
  eyebrow: string;
  header: string;
  icon: string;
  subtitle: string;
}> = {
  graphite: {
    eyebrow: 'text-[#F4C84A]',
    header: 'bg-[#222831]',
    icon: 'bg-[#FF6B5E]/20 text-white',
    subtitle: 'text-gray-300',
  },
  coral: {
    eyebrow: 'text-white/80',
    header: 'bg-[#FF6B5E]',
    icon: 'bg-white/15 text-white',
    subtitle: 'text-white/85',
  },
};

export const posModalPrimaryActionClassName = 'inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-black text-[#B63B32] shadow-sm transition hover:bg-white/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-white/60 disabled:text-[#B63B32]/50 disabled:active:scale-100 sm:w-auto';

export const posModalSecondaryActionClassName = 'inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-white/40 bg-white/10 px-5 py-2.5 text-sm font-black text-white transition hover:bg-white/20 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 sm:w-auto';

export const posModalModuleFooterClassName = 'border-t border-[#FF6B5E] bg-[#FF6B5E] px-6 py-4 text-white';

interface PosModalFrameProps {
  actions?: ReactNode;
  bodyClassName?: string;
  children: ReactNode;
  closeLabel: string;
  contentClassName?: string;
  eyebrow?: string;
  footer?: ReactNode;
  footerClassName?: string;
  icon: ReactNode;
  isCloseDisabled?: boolean;
  onClose: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  size?: PosModalSize;
  subtitle?: string;
  tone?: PosModalTone;
  title: string;
  zIndexClassName?: string;
}

export function PosModalFrame({
  actions,
  bodyClassName,
  children,
  closeLabel,
  contentClassName,
  eyebrow,
  footer,
  footerClassName,
  icon,
  isCloseDisabled = false,
  onClose,
  onMouseEnter,
  onMouseLeave,
  size = 'lg',
  subtitle,
  tone = 'graphite',
  title,
  zIndexClassName = 'z-50',
}: PosModalFrameProps) {
  const toneClasses = toneClassNames[tone];

  return (
    <div className={cn('fixed inset-0 flex items-center justify-center bg-[#111827]/70 px-3 py-4 backdrop-blur-sm sm:px-4 sm:py-6', zIndexClassName)}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        className={cn(
          'flex max-h-[94vh] w-full flex-col overflow-hidden rounded-lg border border-white/10 bg-white shadow-xl dark:bg-gray-950',
          sizeClassNames[size],
          contentClassName,
        )}
      >
        <header className={cn('flex items-center justify-between gap-3 px-5 py-4 text-white sm:gap-4 sm:px-6 sm:py-5', toneClasses.header)}>
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <span className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-lg sm:h-14 sm:w-14', toneClasses.icon)}>
              {icon}
            </span>
            <div className="min-w-0">
              {eyebrow ? (
                <p className={cn('text-[11px] font-black uppercase tracking-normal', toneClasses.eyebrow)}>
                  {eyebrow}
                </p>
              ) : null}
              <h2 className="text-xl font-black leading-tight text-white sm:text-2xl">{title}</h2>
              {subtitle ? (
                <p className={cn('mt-1 text-sm font-semibold leading-snug', toneClasses.subtitle)}>{subtitle}</p>
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {actions}
            <button
              type="button"
              onClick={onClose}
              disabled={isCloseDisabled}
              className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/10 text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label={closeLabel}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        <div className={cn('min-h-0 flex-1 overflow-y-auto bg-[#F7F8FA] p-4 dark:bg-[#111827] sm:p-5', bodyClassName)}>
          {children}
        </div>

        {footer ? (
          <footer className={cn('border-t border-gray-200 bg-white px-6 py-4 dark:border-gray-800 dark:bg-gray-950', footerClassName)}>
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
    <section className={cn('rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900', className)}>
      {children}
    </section>
  );
}
