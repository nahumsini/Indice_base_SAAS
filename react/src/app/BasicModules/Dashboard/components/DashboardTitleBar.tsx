import type { ReactNode } from 'react';
import { IndiceTitleBar } from '../../../components/frontend-os';

interface DashboardTitleBarProps {
  actions?: ReactNode;
  emoji: string;
  subtitle: string;
  title: string;
}

/** Panel Inicial adapter for the canonical tab-level title-bar contract. */
export function DashboardTitleBar({ actions, emoji, subtitle, title }: DashboardTitleBarProps) {
  return (
    <IndiceTitleBar
      actions={actions}
      icon={emoji}
      subtitle={subtitle}
      title={title}
      tone="blue"
    />
  );
}
