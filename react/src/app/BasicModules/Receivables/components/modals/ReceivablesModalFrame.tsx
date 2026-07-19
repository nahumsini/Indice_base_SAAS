import type { ReactNode } from 'react';
import {
  IndiceModalFrame,
  type IndiceModalType,
} from '../../../../components/indice-modal';

interface ReceivablesModalFrameProps {
  children: ReactNode;
  busy?: boolean;
  closeLabel?: string;
  description: string;
  footer: ReactNode;
  footerSummary?: ReactNode;
  icon: ReactNode;
  maxWidthClassName?: string;
  modalType?: IndiceModalType;
  onClose: () => void;
  title: string;
}

export function ReceivablesModalFrame({
  busy = false,
  children,
  closeLabel,
  description,
  footer,
  footerSummary,
  icon,
  maxWidthClassName = 'max-w-3xl',
  modalType = 'standard-form',
  onClose,
  title,
}: ReceivablesModalFrameProps) {
  return (
    <IndiceModalFrame
      busy={busy}
      closeLabel={closeLabel ?? title}
      contentClassName={maxWidthClassName}
      description={description}
      footer={footer}
      footerSummary={footerSummary}
      icon={icon}
      modalType={modalType}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      open
      title={title}
      tone="green"
    >
      {children}
    </IndiceModalFrame>
  );
}
