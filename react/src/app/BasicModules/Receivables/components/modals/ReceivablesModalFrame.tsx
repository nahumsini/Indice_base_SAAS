import type { ReactNode } from 'react';
import { IndiceModalFrame } from '../../../../components/indice-modal';

interface ReceivablesModalFrameProps {
  children: ReactNode;
  closeLabel?: string;
  description: string;
  footer: ReactNode;
  icon: ReactNode;
  maxWidthClassName?: string;
  onClose: () => void;
  title: string;
}

export function ReceivablesModalFrame({
  children,
  closeLabel,
  description,
  footer,
  icon,
  maxWidthClassName = 'max-w-3xl',
  onClose,
  title,
}: ReceivablesModalFrameProps) {
  return (
    <IndiceModalFrame
      closeLabel={closeLabel ?? title}
      contentClassName={maxWidthClassName}
      description={description}
      footer={footer}
      icon={icon}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
      open
      title={title}
      tone="green"
    >
      {children}
    </IndiceModalFrame>
  );
}
