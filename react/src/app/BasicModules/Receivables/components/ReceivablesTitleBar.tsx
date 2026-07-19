import type { ReactNode } from 'react';
import { IndiceTitleBar } from '../../../components/frontend-os';

interface ReceivablesTitleBarProps {
  actions?: ReactNode;
  icon: ReactNode;
  subtitle: string;
  title: string;
}

export function ReceivablesTitleBar({
  actions,
  icon,
  subtitle,
  title,
}: ReceivablesTitleBarProps) {
  return <IndiceTitleBar actions={actions} className="mb-5" icon={icon} subtitle={subtitle} title={title} tone="green" />;
}
