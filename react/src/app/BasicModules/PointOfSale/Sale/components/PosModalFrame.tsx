import type { ReactNode } from 'react';
import { IndiceModalFooter } from '../../../../components/indice-modal';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../../components/ui/dialog';
import { cn } from '../../../../components/ui/utils';

export type PosModalType = 'confirmation' | 'standard-form' | 'wizard' | 'operational-workspace';
type PosModalSize = 'sm' | 'md' | 'lg' | 'xl';
type PosModalTone = 'graphite' | 'coral';

const sizeClassNames: Record<PosModalSize, string> = {
  sm: 'sm:w-[min(92vw,28rem)] sm:max-w-md',
  md: 'sm:w-[min(94vw,42rem)] sm:max-w-2xl',
  lg: 'sm:w-[min(96vw,64rem)] sm:max-w-5xl',
  xl: 'sm:w-[min(96vw,72rem)] sm:max-w-6xl',
};

const typeClassNames: Record<PosModalType, string> = {
  confirmation: 'sm:w-[min(92vw,28rem)] sm:max-w-md',
  'standard-form': 'sm:w-[min(94vw,48rem)] sm:max-w-3xl',
  wizard: 'sm:w-[min(96vw,900px)] sm:max-w-[900px]',
  'operational-workspace': 'sm:w-[96vw] sm:max-w-[96rem]',
};

const toneClassNames: Record<PosModalTone, {
  close: string;
  eyebrow: string;
  header: string;
  icon: string;
  subtitle: string;
  title: string;
}> = {
  graphite: {
    close: 'border-white/20 bg-white/10 text-white hover:bg-white/20 focus:ring-white/60',
    eyebrow: 'text-[#F4C84A]',
    header: 'bg-[#222831]',
    icon: 'border-white/15 bg-[#FF6B5E]/20 text-white',
    subtitle: 'text-gray-300',
    title: 'text-white',
  },
  coral: {
    close: 'border-[#222831]/20 bg-white/20 text-[#222831] hover:bg-white/35 focus:ring-[#222831]/30',
    eyebrow: 'text-[#222831]/75',
    header: 'bg-[#FF6B5E] text-[#222831]',
    icon: 'border-[#222831]/15 bg-white/20 text-[#222831]',
    subtitle: 'text-[#222831]/75',
    title: 'text-[#222831]',
  },
};

export const posModalPrimaryActionClassName = 'inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-[#B63B32] shadow-sm transition hover:bg-white/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-white/60 disabled:text-[#B63B32]/50 disabled:active:scale-100 sm:w-auto';

export const posModalSecondaryActionClassName = 'inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#222831]/35 bg-white/10 px-5 py-2.5 text-sm font-medium text-[#222831] transition hover:bg-white/25 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 sm:w-auto';

export const posModalModuleFooterClassName = 'border-t border-[#FF6B5E] bg-[#FF6B5E] px-6 py-4 text-[#222831] dark:border-[#b63b32] dark:bg-[#b63b32] dark:text-white';

interface PosModalFrameProps {
  actions?: ReactNode;
  bodyClassName?: string;
  children: ReactNode;
  closeLabel: string;
  contentClassName?: string;
  eyebrow?: string;
  footer?: ReactNode;
  footerClassName?: string;
  footerLeading?: ReactNode;
  footerSummary?: ReactNode;
  icon: ReactNode;
  isCloseDisabled?: boolean;
  modalType?: PosModalType;
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
  footerLeading,
  footerSummary,
  icon,
  isCloseDisabled = false,
  modalType,
  onClose,
  onMouseEnter,
  onMouseLeave,
  size = 'lg',
  subtitle,
  tone = 'coral',
  title,
  zIndexClassName = 'z-50',
}: PosModalFrameProps) {
  const toneClasses = toneClassNames[tone];
  const widthClassName = modalType && modalType !== 'standard-form'
    ? typeClassNames[modalType]
    : sizeClassNames[size];

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && !isCloseDisabled) onClose();
  };

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent
        aria-busy={isCloseDisabled}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onEscapeKeyDown={(event) => isCloseDisabled && event.preventDefault()}
        onPointerDownOutside={(event) => isCloseDisabled && event.preventDefault()}
        className={cn(
          'flex max-h-[94vh] w-full flex-col overflow-hidden rounded-lg border border-white/10 bg-white p-0 shadow-xl dark:bg-gray-950',
          widthClassName,
          zIndexClassName,
          contentClassName,
        )}
        closeButtonClassName={cn('right-4 top-4 h-11 w-11 rounded-lg border opacity-100', toneClasses.close)}
        closeButtonDisabled={isCloseDisabled}
        closeButtonLabel={closeLabel}
        overlayClassName={cn('bg-[#111827]/70 backdrop-blur-sm', zIndexClassName)}
      >
        <DialogHeader className={cn('shrink-0 px-5 py-4 text-left sm:px-6', toneClasses.header)}>
          <div className="flex min-w-0 items-start gap-3 pr-14">
            <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border shadow-sm', toneClasses.icon)} aria-hidden="true">
              {icon}
            </span>
            <div className="min-w-0 flex-1">
              {eyebrow ? <p className={cn('mb-1 text-xs font-medium leading-5 tracking-normal', toneClasses.eyebrow)}>{eyebrow}</p> : null}
              <DialogTitle className={cn('text-xl font-medium leading-tight sm:text-2xl', toneClasses.title)}>{title}</DialogTitle>
              {subtitle ? <DialogDescription className={cn('mt-1 text-sm font-normal leading-5', toneClasses.subtitle)}>{subtitle}</DialogDescription> : null}
            </div>
            {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
          </div>
        </DialogHeader>

        <div className={cn(
          'min-h-0 flex-1 overflow-y-auto bg-[#F7F8FA] p-4 dark:bg-[#111827] sm:p-5',
          bodyClassName,
        )}>
          {children}
        </div>

        {footer || footerLeading || footerSummary ? (
          <DialogFooter className={cn(
            'shrink-0 border-t border-[#FF6B5E] bg-[#FF6B5E] px-6 py-4 text-[#222831] dark:border-[#b63b32] dark:bg-[#b63b32] dark:text-white',
            footerClassName,
          )}>
            <IndiceModalFooter actions={footer} leading={footerLeading} summary={footerSummary} tone="coral" />
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
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
