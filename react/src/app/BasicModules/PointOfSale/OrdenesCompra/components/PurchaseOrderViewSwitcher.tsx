import { ClipboardList, Inbox } from 'lucide-react';

export type PurchaseOrderWorkspaceMode = 'orders' | 'submissions';

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
  return (
    <div className="inline-flex rounded-[18px] border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <SwitchButton
        active={mode === 'orders'}
        count={orderCount}
        icon={ClipboardList}
        label="Compras POS"
        onClick={() => onChange('orders')}
      />
      <SwitchButton
        active={mode === 'submissions'}
        count={submissionCount}
        icon={Inbox}
        label="Propuestas proveedor"
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
  count: number;
  icon: typeof ClipboardList;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-11 items-center gap-2 rounded-[14px] px-4 text-sm font-bold transition ${
        active
          ? 'bg-orange-500 text-white shadow-sm'
          : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
      <span className={`rounded-full px-2 py-0.5 text-xs ${active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300'}`}>
        {count}
      </span>
    </button>
  );
}
