import type { ReactNode } from 'react';
import { PosModalFrame, type PosModalType } from '../../Sale/components/PosModalFrame';

type CortesModalSize = 'md' | 'lg' | 'xl';

interface CortesModalFrameProps {
  children: ReactNode;
  closeLabel: string;
  eyebrow?: string;
  footer?: ReactNode;
  icon?: ReactNode;
  modalType?: PosModalType;
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
  modalType,
  onClose,
  open,
  size = 'lg',
  subtitle,
  title,
}: CortesModalFrameProps) {
  if (!open) return null;

  return (
    <PosModalFrame
      closeLabel={closeLabel}
      eyebrow={eyebrow}
      footer={footer}
      icon={icon ?? <span aria-hidden="true">🧾</span>}
      modalType={modalType ?? (size === 'md' ? 'standard-form' : 'operational-workspace')}
      onClose={onClose}
      size={size}
      subtitle={subtitle}
      title={title}
      tone="coral"
    >
      {children}
    </PosModalFrame>
  );
}
