import type { ReactNode } from 'react';
import { Button } from '../ui/button';

export type KioskAdminAccent = 'aqua' | 'green' | 'yellow';

const accentStyles: Record<KioskAdminAccent, { action: string; panel: string; primary: string }> = {
  aqua: {
    action: 'hover:border-[#59C3A5]/60 hover:bg-[#59C3A5]/10 hover:text-[#18715D]',
    panel: 'hover:border-[#59C3A5]/60 hover:bg-[#59C3A5]/10 hover:text-[#18715D]',
    primary: 'bg-[#59C3A5] text-white hover:bg-[#3AAE90]',
  },
  green: {
    action: 'hover:border-emerald-300 hover:bg-emerald-50 hover:text-[#147514] dark:hover:border-emerald-800 dark:hover:bg-emerald-950/40',
    panel: 'hover:border-emerald-300 hover:bg-emerald-50 hover:text-[#147514] dark:hover:border-emerald-800 dark:hover:bg-emerald-950/40',
    primary: 'bg-[#147514] text-white hover:bg-[#105F10]',
  },
  yellow: {
    action: 'hover:border-[#F4C84A]/60 hover:bg-[#F4C84A]/10 hover:text-[#7A5700]',
    panel: 'hover:border-[#F4C84A]/60 hover:bg-[#F4C84A]/10 hover:text-[#6B4D00]',
    primary: 'bg-[#F4C84A] text-[#5F4500] hover:bg-[#E5B835]',
  },
};

export function KioskAdminActionButton({
  accent = 'green',
  children,
  disabled,
  label,
  onClick,
  tone = 'neutral',
}: {
  accent?: KioskAdminAccent;
  children: ReactNode;
  disabled?: boolean;
  label: string;
  onClick: () => void;
  tone?: 'danger' | 'neutral' | 'primary';
}) {
  const className = tone === 'danger'
    ? 'h-10 w-10 justify-self-center rounded-xl border-red-200 bg-red-50 text-red-600 hover:border-red-300 hover:bg-red-100 hover:text-red-700 sm:justify-self-auto'
    : tone === 'primary'
      ? `h-10 w-10 justify-self-center rounded-xl border-transparent sm:justify-self-auto ${accentStyles[accent].primary}`
      : `h-10 w-10 justify-self-center rounded-xl border-slate-200 bg-white text-slate-600 sm:justify-self-auto dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 ${accentStyles[accent].action}`;

  return (
    <Button
      aria-label={label}
      className={className}
      disabled={disabled}
      onClick={onClick}
      size="icon"
      title={label}
      type="button"
      variant={tone === 'primary' ? 'default' : 'outline'}
    >
      {children}
    </Button>
  );
}

export function KioskAdminPanelAction({
  accent = 'green',
  danger = false,
  description,
  disabled,
  icon,
  label,
  onClick,
  primary = false,
}: {
  accent?: KioskAdminAccent;
  danger?: boolean;
  description?: string;
  disabled?: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
  primary?: boolean;
}) {
  const className = danger
    ? 'h-auto min-h-12 w-full justify-start gap-3 rounded-xl border-red-200 bg-red-50 px-4 py-3 text-left text-red-700 hover:border-red-300 hover:bg-red-100 hover:text-red-800'
    : primary
      ? `h-auto min-h-12 w-full justify-start gap-3 rounded-xl px-4 py-3 text-left ${accentStyles[accent].primary}`
      : `h-auto min-h-12 w-full justify-start gap-3 rounded-xl border-slate-200 bg-white px-4 py-3 text-left text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 ${accentStyles[accent].panel}`;

  return (
    <Button
      className={className}
      disabled={disabled}
      onClick={onClick}
      type="button"
      variant={primary ? 'default' : 'outline'}
    >
      <span className="shrink-0">{icon}</span>
      <span className="min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        {description ? <span className="mt-0.5 block whitespace-normal text-xs font-normal leading-4 opacity-75">{description}</span> : null}
      </span>
    </Button>
  );
}
