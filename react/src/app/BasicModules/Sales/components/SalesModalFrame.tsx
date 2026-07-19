import type { ReactNode } from 'react';
import { IndiceModalFrame, type IndiceModalTone, type IndiceModalType } from '../../../components/indice-modal';
import type { SalesModalTone } from '../salesModalStyles';

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
  const resolvedModalType: IndiceModalType = modalType === 'large-workspace'
    ? 'operational-workspace'
    : modalType;
  const resolvedTone: IndiceModalTone = tone === 'graphite' ? 'blue' : tone;

  return (
    <IndiceModalFrame
      bodyClassName={bodyClassName}
      busy={busy}
      closeLabel={closeLabel ?? title}
      contentClassName={contentClassName}
      description={description}
      eyebrow={eyebrow}
      footer={footer}
      footerClassName={footerClassName}
      footerLeading={footerLeading}
      footerSummary={footerSummary}
      icon={icon}
      modalType={resolvedModalType}
      onOpenChange={onOpenChange}
      open={open}
      title={title}
      tone={resolvedTone}
    >
      {children}
    </IndiceModalFrame>
  );
}
