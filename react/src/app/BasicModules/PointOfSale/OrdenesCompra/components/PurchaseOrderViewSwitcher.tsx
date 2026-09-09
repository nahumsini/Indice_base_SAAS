import { Building2, ClipboardList, Inbox, type LucideIcon } from 'lucide-react';
import { cn } from '../../../../components/ui/utils';
import { usePurchaseOrderTranslations } from '../hooks/usePurchaseOrderTranslations';

export type PurchaseOrderWorkspaceMode = 'orders' | 'submissions' | 'provider-center';

export function PurchaseOrderViewSwitcher({
  mode,
  orderCount,
  submissionCount,
  onChange,
}: {
  mode: PurchaseOrderWorkspaceMode;
  orderCount: number;
  submissionCount: number;
  onChange: (mode: PurchaseOrderWorkspaceMode) => void;
}) {
  const { copy } = usePurchaseOrderTranslations();

  return (
    <div className="inline-flex w-fit flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <SwitchButton
        active={mode === 'orders'}
        count={orderCount}
        icon={ClipboardList}
        label={copy.views.orders}
        onClick={() => onChange('orders')}
      />
      <SwitchButton
        active={mode === 'provider-center'}
        icon={Building2}
        label="Centro de proveedores"
        onClick={() => onChange('provider-center')}
      />
      <SwitchButton
        active={mode === 'submissions'}
        count={submissionCount}
        icon={Inbox}
        label={copy.views.submissions}
        onClick={() => onChange('submissions')}
      />
    </div>
  );
}

function SwitchButton({
  active,
  count,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  count?: number;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex h-11 items-center gap-2 rounded-lg px-4 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B5E]/25',
        active
          ? 'bg-[#FF6B5E] text-[#222831] shadow-sm shadow-[#FF6B5E]/20'
          : 'text-slate-600 hover:bg-[#FF6B5E]/10 hover:text-[#B63B32] dark:text-slate-300 dark:hover:bg-[#FF6B5E]/15 dark:hover:text-[#FFB0AA]',
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
      {typeof count === 'number' ? <span className={cn(
        'rounded-full px-2 py-0.5 text-xs',
        active
          ? 'bg-white/45 text-[#222831]'
          : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300',
      )}>
        {count}
      </span> : null}
    </button>
  );
}
