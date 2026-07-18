import type { ReactNode } from 'react';
import { IndiceModalFooter } from '../../../components/indice-modal';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import { cn } from '../../../components/ui/utils';
import { getSalesModalStyles, type SalesModalTone } from '../salesModalStyles';

export function SalesModalFrame({
  bodyClassName,
  busy = false,
  children,
  closeLabel,
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
  tone = 'coral',
}: {
  bodyClassName?: string;
  busy?: boolean;
  children: ReactNode;
  closeLabel?: string;
  contentClassName?: string;
  description: string;
  eyebrow?: string;
  footer?: ReactNode;
  footerClassName?: string;
  footerLeading?: ReactNode;
  footerSummary?: ReactNode;
  icon: ReactNode;
  modalType?: 'confirmation' | 'standard-form' | 'wizard' | 'operational-workspace' | 'large-workspace';
  onOpenChange: (open: boolean) => void;
  open: boolean;
  title: string;
  tone?: SalesModalTone;
}) {
  const modalStyles = getSalesModalStyles(tone);
  const widthClassName = {
    confirmation: 'sm:w-[min(92vw,28rem)] sm:max-w-md',
    'standard-form': 'sm:w-[min(96vw,48rem)] sm:max-w-3xl',
    wizard: 'sm:w-[min(96vw,900px)] sm:max-w-[900px]',
    'operational-workspace': 'sm:w-[96vw] sm:max-w-[96rem]',
    'large-workspace': 'sm:w-[96vw] sm:max-w-[96rem]',
  }[modalType];

  const handleOpenChange = (nextOpen: boolean) => {
    if (busy && !nextOpen) return;
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        aria-busy={busy}
        className={cn(modalStyles.content, widthClassName, '!gap-0', contentClassName)}
        closeButtonClassName={cn(modalStyles.close, busy && 'pointer-events-none opacity-50')}
        closeButtonDisabled={busy}
        closeButtonLabel={closeLabel ?? title}
        overlayClassName="bg-slate-950/55 backdrop-blur-[2px]"
        onEscapeKeyDown={(event) => busy && event.preventDefault()}
        onPointerDownOutside={(event) => busy && event.preventDefault()}
      >
        <DialogHeader className={modalStyles.header}>
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/15 shadow-sm" aria-hidden="true">
              {icon}
            </span>
            <div className="min-w-0 flex-1">
              {eyebrow ? <p className={cn('mb-1 text-xs font-semibold leading-5 tracking-normal', modalStyles.description)}>{eyebrow}</p> : null}
              <DialogTitle className={modalStyles.title}>{title}</DialogTitle>
              <DialogDescription className={cn(modalStyles.description, 'mt-1')}>{description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className={cn(modalStyles.body, bodyClassName)}>
          {children}
        </div>

        {footer || footerLeading || footerSummary ? (
          <DialogFooter className={cn(modalStyles.footer, footerClassName)}>
            <IndiceModalFooter actions={footer} leading={footerLeading} summary={footerSummary} />
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
