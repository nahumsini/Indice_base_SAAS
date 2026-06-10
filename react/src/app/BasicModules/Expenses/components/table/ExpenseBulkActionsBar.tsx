import { CheckCircle2, Trash2, X } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import type { ExpenseStatus } from '../../types/expenses.types';
import type { SelectOption } from './ExpenseInlineControls';

type ProviderOption = {
  id: string;
  name: string;
};

type ExpenseBulkActionsBarProps = {
  accountingAccountOptions: SelectOption[];
  businessOptions: SelectOption[];
  isDisabled?: boolean;
  onAccountingAccountChange: (value: string) => void;
  onAuthorizerChange: (value: string) => void;
  onBusinessChange: (value: string) => void;
  onClearSelection: () => void;
  onDeleteSelected: () => void;
  onMarkPaidSelected: () => void;
  onProviderChange: (value: string) => void;
  onResponsibleChange: (value: string) => void;
  onStatusChange: (value: ExpenseStatus) => void;
  onUnitChange: (value: string) => void;
  providers: ProviderOption[];
  selectedCount: number;
  unitOptions: SelectOption[];
  userOptions: SelectOption[];
};

const bulkSelectClass =
  'h-9 min-w-[150px] rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-none outline-none transition hover:bg-slate-50 focus:border-[#147514]/40 focus:ring-2 focus:ring-[#147514]/10 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';
const bulkPlaceholderValue = '__bulk_placeholder__';
const bulkEmptyValue = '__bulk_empty__';

const statusOptions: Array<{ value: ExpenseStatus; label: string }> = [
  { value: 'pending', label: 'Pendiente' },
  { value: 'paid', label: 'Pagado' },
  { value: 'partial', label: 'Parcial' },
  { value: 'overdue', label: 'Vencido' },
];

export function ExpenseBulkActionsBar({
  accountingAccountOptions,
  businessOptions,
  isDisabled = false,
  onAccountingAccountChange,
  onAuthorizerChange,
  onBusinessChange,
  onClearSelection,
  onDeleteSelected,
  onMarkPaidSelected,
  onProviderChange,
  onResponsibleChange,
  onStatusChange,
  onUnitChange,
  providers,
  selectedCount,
  unitOptions,
  userOptions,
}: ExpenseBulkActionsBarProps) {
  return (
    <section className="sticky bottom-[calc(1rem+env(safe-area-inset-bottom))] z-30 mb-4 rounded-2xl border border-[#147514]/25 bg-[#147514]/10 px-4 py-3 shadow-lg shadow-slate-950/10 backdrop-blur dark:border-[#147514]/40 dark:bg-[#147514]/15 sm:static sm:shadow-sm sm:backdrop-blur-0">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
          <span className="rounded-full border border-[#147514]/30 bg-white px-3 py-1 text-sm font-extrabold text-[#147514] dark:bg-slate-800 dark:text-emerald-200">
            {selectedCount} seleccionados
          </span>
          <span className="text-slate-500 dark:text-slate-400">Edición múltiple</span>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:flex-wrap sm:overflow-visible sm:pb-0 [&::-webkit-scrollbar]:hidden">
          <BulkSelect disabled={isDisabled} label="Unidad" onChange={onUnitChange} options={[{ value: '', label: 'Sin unidad' }, ...unitOptions]} />
          <BulkSelect disabled={isDisabled} label="Negocio" onChange={onBusinessChange} options={[{ value: '', label: 'Sin negocio' }, ...businessOptions]} />
          <BulkSelect disabled={isDisabled} label="Proveedor" onChange={onProviderChange} options={[{ value: '', label: 'Sin proveedor' }, ...providers.map(provider => ({ value: provider.id, label: provider.name }))]} />
          <BulkSelect disabled={isDisabled} label="Cuenta contable" onChange={onAccountingAccountChange} options={accountingAccountOptions} />
          <BulkSelect disabled={isDisabled} label="Estado" onChange={(value) => onStatusChange(value as ExpenseStatus)} options={statusOptions} />
          <BulkSelect disabled={isDisabled} label="Autoriza" onChange={onAuthorizerChange} options={userOptions} />
          <BulkSelect disabled={isDisabled} label="Responsable" onChange={onResponsibleChange} options={userOptions} />

          <Button
            type="button"
            variant="outline"
            className="h-9 rounded-xl border-emerald-200 bg-emerald-50 px-3 text-sm font-semibold text-emerald-700 shadow-none hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/60 dark:text-emerald-300"
            disabled={isDisabled}
            onClick={onMarkPaidSelected}
          >
            <CheckCircle2 className="h-4 w-4" />
            Pagado
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-9 rounded-xl border-red-200 bg-red-50 px-3 text-sm font-semibold text-red-700 shadow-none hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-300"
            disabled={isDisabled}
            onClick={onDeleteSelected}
          >
            <Trash2 className="h-4 w-4" />
            Eliminar
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-9 rounded-xl border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 shadow-none hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            disabled={isDisabled}
            onClick={onClearSelection}
          >
            <X className="h-4 w-4" />
            Cancelar
          </Button>
        </div>
      </div>
    </section>
  );
}

function BulkSelect({
  disabled,
  label,
  onChange,
  options,
}: {
  disabled?: boolean;
  label: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <select
      aria-label={label}
      className={bulkSelectClass}
      disabled={disabled}
      value={bulkPlaceholderValue}
      onChange={(event) => {
        onChange(event.target.value === bulkEmptyValue ? '' : event.target.value);
      }}
    >
      <option value={bulkPlaceholderValue} disabled>{label}</option>
      {options.map(option => (
        <option key={`${label}-${option.value}-${option.label}`} value={option.value || bulkEmptyValue}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
