import type { ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { cn } from '../ui/utils';
import { IndiceModalFooter, type IndiceModalFooterTone } from './IndiceModalFooter';

export type IndiceModalType = 'confirmation' | 'standard-form' | 'wizard' | 'operational-workspace';
export type IndiceModalTone = IndiceModalFooterTone;

export type IndiceModalFrameProps = {
  bodyClassName?: string;
  busy?: boolean;
  children: ReactNode;
  closeLabel?: string;
  contentClassName?: string;
  description: ReactNode;
  eyebrow?: ReactNode;
  footer?: ReactNode;
  footerClassName?: string;
  footerLeading?: ReactNode;
  footerSummary?: ReactNode;
  icon: ReactNode;
  modalType?: IndiceModalType;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  title: ReactNode;
  tone?: IndiceModalTone;
};

const toneStyles: Record<IndiceModalTone, {
  close: string;
  description: string;
  footer: string;
  header: string;
  title: string;
}> = {
  aqua: {
    close: 'border-white/30 bg-white/10 text-white hover:bg-white/20',
    description: 'text-white/85',
    footer: 'bg-[#269C82] dark:bg-[#176a59]',
    header: 'bg-[#59C3A5] text-white dark:bg-[#269C82]',
    title: 'text-white',
  },
  blue: {
    close: 'border-white/30 bg-white/10 text-white hover:bg-white/20',
    description: 'text-white/85',
    footer: 'bg-[#1D4ED8] dark:bg-[#1E3A8A]',
    header: 'bg-[#2563EB] text-white dark:bg-[#1D4ED8]',
    title: 'text-white',
  },
  coral: {
    close: 'border-white/35 bg-white/15 text-white hover:bg-white/25',
    description: 'text-white/90',
    footer: 'bg-[#FF6B5E] dark:bg-[#b63b32]',
    header: 'bg-[#FF6B5E] text-white dark:bg-[#b63b32]',
    title: 'text-white',
  },
  green: {
    close: 'border-white/30 bg-white/10 text-white hover:bg-white/20',
    description: 'text-white/85',
    footer: 'bg-[#147514] dark:bg-[#0b3f1b]',
    header: 'bg-[#147514] text-white dark:bg-[#0b3f1b]',
    title: 'text-white',
  },
  yellow: {
    close: 'border-white/35 bg-white/15 text-white hover:bg-white/25',
    description: 'text-white/90',
    footer: 'bg-[#F8C842] dark:bg-[#9c7110]',
    header: 'bg-[#F8C842] text-white dark:bg-[#9c7110]',
    title: 'text-white',
  },
};

const widthStyles: Record<IndiceModalType, string> = {
  confirmation: 'sm:w-[min(92vw,28rem)] sm:max-w-md',
  'standard-form': 'sm:w-[min(96vw,48rem)] sm:max-w-3xl',
  wizard: 'sm:w-[min(96vw,900px)] sm:max-w-[900px]',
  'operational-workspace': 'sm:w-[96vw] sm:max-w-[96rem]',
};

export function IndiceModalFrame({
  bodyClassName,
  busy = false,
  children,
  closeLabel = 'Cerrar',
  contentClassName,
  description,
  eyebrow,
  footer,
  footerClassName,
  footerLeading,
  footerSummary,
  icon,
  modalType = 'standard-form',
  onOpenChange,
  open,
  title,
  tone = 'green',
}: IndiceModalFrameProps) {
  const styles = toneStyles[tone];
  const handleOpenChange = (nextOpen: boolean) => {
    if (busy && !nextOpen) return;
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        aria-busy={busy}
        className={cn(
          'flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white p-0 shadow-[0_28px_80px_rgba(15,23,42,0.3)] dark:border-slate-700 dark:bg-slate-950',
          widthStyles[modalType],
          contentClassName,
        )}
        closeButtonClassName={cn(
          'right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full border opacity-100 focus:ring-white/70 [&_svg]:h-5 [&_svg]:w-5',
          styles.close,
          busy && 'pointer-events-none opacity-50',
        )}
        closeButtonDisabled={busy}
        closeButtonLabel={closeLabel}
        overlayClassName="bg-slate-950/55 backdrop-blur-[2px]"
        onEscapeKeyDown={(event) => busy && event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
      >
        <DialogHeader className={cn('shrink-0 gap-0 px-6 py-4 pr-20 text-left', styles.header)}>
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-current/10 bg-white/15 shadow-sm" aria-hidden="true">
              {icon}
            </span>
            <div className="min-w-0 flex-1">
              {eyebrow ? <p className={cn('mb-0.5 text-xs font-medium tracking-normal', styles.description)}>{eyebrow}</p> : null}
              <DialogTitle className={cn('text-xl font-semibold leading-7', styles.title)}>{title}</DialogTitle>
              <DialogDescription className={cn('mt-0.5 text-sm leading-5', styles.description)}>{description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className={cn('min-h-0 flex-1 overflow-y-auto bg-slate-50/80 px-6 py-5 dark:bg-slate-950/70', bodyClassName)}>
          {children}
        </div>

        {footer || footerLeading || footerSummary ? (
          <DialogFooter className={cn('shrink-0 px-6 py-3', styles.footer, footerClassName)}>
            <IndiceModalFooter actions={footer} leading={footerLeading} summary={footerSummary} tone={tone} />
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
