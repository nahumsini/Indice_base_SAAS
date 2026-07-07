import type { ReactNode } from 'react';
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
  children,
  contentClassName,
  description,
  footer,
  footerClassName,
  icon,
  onOpenChange,
  open,
  title,
  tone = 'coral',
}: {
  bodyClassName?: string;
  children: ReactNode;
  contentClassName?: string;
  description: string;
  footer?: ReactNode;
  footerClassName?: string;
  icon: ReactNode;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  title: string;
  tone?: SalesModalTone;
}) {
  const modalStyles = getSalesModalStyles(tone);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(modalStyles.content, '!gap-0', contentClassName)} closeButtonClassName={modalStyles.close}>
        <DialogHeader className={modalStyles.header}>
          <DialogTitle className={modalStyles.title}>
            {icon}
            {title}
          </DialogTitle>
          <DialogDescription className={modalStyles.description}>{description}</DialogDescription>
        </DialogHeader>

        <div className={cn(modalStyles.body, bodyClassName)}>
          {children}
        </div>

        {footer ? (
          <DialogFooter className={cn(modalStyles.footer, footerClassName)}>
            {footer}
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
