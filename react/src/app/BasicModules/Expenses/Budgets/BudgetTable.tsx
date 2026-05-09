import { useMemo, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react';
import { Plus, Search, SlidersHorizontal, X } from 'lucide-react';
import { mockProviders } from '../data/expenses.mock';
import type { Expense, ExpenseFrequency, ExpenseStatus } from '../types/expenses.types';
import { ExpenseTable, type ColumnConfig } from '../Expenses/components/ExpenseTable';
import { AttachmentsModal } from '../Expenses/components/AttachmentsModal';
import { useBudgetLogic, type BudgetFutureFilter } from './useBudgetLogic';
import type { BudgetDraft } from './budgetUtils';

interface BudgetTableProps {
  columns: ColumnConfig[];
  expenses: Expense[];
  onExpensesChange: Dispatch<SetStateAction<Expense[]>>;
}

const frequencyOptions: Array<{ value: ExpenseFrequency; label: string }> = [
  { value: 'once', label: 'Una vez' },
  { value: 'monthly', label: 'Mensual' },
  { value: 'quarterly', label: 'Trimestral' },
  { value: 'annual', label: 'Anual' },
];

const initialDraftState = {
  businessUnit: '',
  business: '',
  concept: '',
  description: '',
  duration: 1,
  frequency: 'once' as ExpenseFrequency,
  providerId: '',
  startDate: '',
};

export default function BudgetTable({ columns, expenses, onExpensesChange }: BudgetTableProps) {
  const [attachmentsByExpenseId, setAttachmentsByExpenseId] = useState<Record<string, string[]>>({});
  const [attachmentsExpense, setAttachmentsExpense] = useState<Expense | null>(null);
  const [draft, setDraft] = useState(initialDraftState);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const {
    addBudgetEntries,
    businessFilter,
    businessUnitFilter,
    customEndDate,
    customStartDate,
    filteredBudgetExpenses,
    futureFilter,
    providerFilter,
    searchTerm,
    setBusinessFilter,
    setBusinessUnitFilter,
    setCustomEndDate,
    setCustomStartDate,
    setFutureFilter,
    setProviderFilter,
    setSearchTerm,
    setStatusFilter,
    statusFilter,
  } = useBudgetLogic({ expenses, onExpensesChange });

  const businessUnits = useMemo(() => {
    return Array.from(new Set(expenses.map(expense => expense.businessUnit)));
  }, [expenses]);

  const businesses = useMemo(() => {
    return Array.from(new Set(expenses.map(expense => expense.business)));
  }, [expenses]);

  const getExpenseAttachments = (expense: Expense) => {
    return attachmentsByExpenseId[expense.id] ?? expense.attachments ?? [];
  };

  const closeAttachmentsModal = () => {
    setAttachmentsExpense(null);
  };

  const saveExpenseAttachments = (attachments: string[]) => {
    if (!attachmentsExpense) return;

    setAttachmentsByExpenseId(prev => ({
      ...prev,
      [attachmentsExpense.id]: attachments,
    }));
  };

  const closeCreateModal = () => {
    setDraft(initialDraftState);
    setIsCreateModalOpen(false);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const provider = mockProviders.find(item => item.id === draft.providerId);
    const budgetDraft: BudgetDraft = {
      businessUnit: draft.businessUnit,
      business: draft.business,
      concept: draft.concept,
      description: draft.description,
      duration: Number(draft.duration),
      frequency: draft.frequency,
      providerId: draft.providerId || undefined,
      providerName: provider?.name,
      startDate: draft.startDate ? new Date(`${draft.startDate}T00:00:00`) : new Date(),
    };

    addBudgetEntries(budgetDraft);
    setDraft(initialDraftState);
    setIsCreateModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#147514] dark:bg-[#0b3f1b] rounded-2xl shadow-sm dark:shadow-black/30 p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <span className="text-4xl">📋</span>
            <div>
              <h2 className="text-2xl font-bold text-white">Presupuestos</h2>
              <p className="text-sm text-white/90 mt-1">
                Planea gastos futuros usando la misma tabla operativa de Gastos.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex h-11 items-center rounded-xl border border-white/20 bg-white/15 px-4 text-sm font-semibold text-white dark:bg-white/10">
              {filteredBudgetExpenses.length} registros futuros
            </span>
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-[#147514] shadow-md transition-colors hover:bg-gray-50 dark:text-[#0b3f1b] dark:hover:bg-gray-100"
            >
              <Plus className="h-4 w-4" />
              Agregar gasto al presupuesto
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#147514]/10 text-[#147514] dark:bg-emerald-400/10 dark:text-emerald-300">
              <SlidersHorizontal className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Filtros de presupuesto</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Por defecto se muestran presupuestos desde el próximo mes.
              </p>
            </div>
          </div>

          <span className="inline-flex w-fit items-center rounded-full bg-[#147514]/10 px-3 py-1 text-xs font-bold text-[#147514] dark:bg-emerald-400/10 dark:text-emerald-300">
            {filteredBudgetExpenses.length} resultados
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-7">
          <div className="xl:col-span-2">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Buscar
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Folio, concepto o proveedor..."
                className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-10 text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-transparent focus:ring-2 focus:ring-[#147514] dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Periodo futuro
            </label>
            <select
              value={futureFilter}
              onChange={(event) => setFutureFilter(event.target.value as BudgetFutureFilter)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-[#147514] dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            >
              <option value="next_month">Próximo mes</option>
              <option value="next_quarter">Próximo trimestre</option>
              <option value="custom">Rango futuro personalizado</option>
            </select>
          </div>

          {futureFilter === 'custom' && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Desde
                </label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(event) => setCustomStartDate(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-[#147514] dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Hasta
                </label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(event) => setCustomEndDate(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-[#147514] dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Unidad
            </label>
            <select
              value={businessUnitFilter}
              onChange={(event) => setBusinessUnitFilter(event.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-[#147514] dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            >
              <option value="all">Todas</option>
              {businessUnits.map(unit => (
                <option key={unit} value={unit}>{unit}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Negocio
            </label>
            <select
              value={businessFilter}
              onChange={(event) => setBusinessFilter(event.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-[#147514] dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            >
              <option value="all">Todos</option>
              {businesses.map(business => (
                <option key={business} value={business}>{business}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Proveedor
            </label>
            <select
              value={providerFilter}
              onChange={(event) => setProviderFilter(event.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-[#147514] dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            >
              <option value="all">Todos</option>
              {mockProviders.map(provider => (
                <option key={provider.id} value={provider.id}>{provider.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Estado
            </label>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as ExpenseStatus | 'all')}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-[#147514] dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            >
              <option value="all">Todos</option>
              <option value="paid">Pagado</option>
              <option value="pending">Pendiente</option>
              <option value="partial">Pago Parcial</option>
              <option value="overdue">Vencido</option>
              <option value="audited">Auditado</option>
            </select>
          </div>
        </div>
      </div>

      {isCreateModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={closeCreateModal}
        >
          <form
            onSubmit={handleSubmit}
            onClick={(event) => event.stopPropagation()}
            className="flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-800"
          >
            <div className="flex flex-shrink-0 items-center justify-between bg-[#147514] px-6 py-4 dark:bg-[#0b3f1b]">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20">
                  <Plus className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">
                    Agregar gasto al presupuesto
                  </h3>
                  <p className="text-sm text-white/90">
                    Define la recurrencia para generar entradas futuras.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeCreateModal}
                className="rounded-lg p-1 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Cerrar modal de presupuesto"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <BudgetSelect label="Unidad" required value={draft.businessUnit} onChange={(value) => setDraft(current => ({ ...current, businessUnit: value }))} options={businessUnits} />
                <BudgetSelect label="Negocio" required value={draft.business} onChange={(value) => setDraft(current => ({ ...current, business: value }))} options={businesses} />
                <BudgetSelect label="Proveedor" value={draft.providerId} onChange={(value) => setDraft(current => ({ ...current, providerId: value }))} options={mockProviders.map(provider => ({ value: provider.id, label: provider.name }))} includeEmpty />
                <BudgetTextInput label="Concepto" required value={draft.concept} onChange={(value) => setDraft(current => ({ ...current, concept: value }))} />
                <BudgetTextInput label="Descripción" value={draft.description} onChange={(value) => setDraft(current => ({ ...current, description: value }))} />
                <BudgetSelect label="Frecuencia" required value={draft.frequency} onChange={(value) => setDraft(current => ({ ...current, frequency: value as ExpenseFrequency }))} options={frequencyOptions} />
                <BudgetNumberInput label="Duración" min={1} value={draft.duration} onChange={(value) => setDraft(current => ({ ...current, duration: value }))} />
                <BudgetDateInput label="Fecha de inicio" required value={draft.startDate} onChange={(value) => setDraft(current => ({ ...current, startDate: value }))} />
              </div>
            </div>

            <div className="flex flex-shrink-0 justify-end gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4 dark:border-gray-700 dark:bg-gray-900/60">
              <button
                type="submit"
                className="rounded-xl bg-[#147514] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#105010]"
              >
                Generar presupuesto
              </button>
              <button
                type="button"
                onClick={closeCreateModal}
                className="rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <ExpenseTable
        columns={columns}
        emptyTitle="No hay presupuestos para el rango seleccionado"
        emptyMessage="Agrega un gasto al presupuesto o cambia el filtro futuro."
        expenses={filteredBudgetExpenses}
        getAttachments={getExpenseAttachments}
        onExpensesChange={onExpensesChange}
        onOpenAttachments={setAttachmentsExpense}
      />

      {attachmentsExpense && (
        <AttachmentsModal
          isOpen={true}
          onClose={closeAttachmentsModal}
          expenseFolio={attachmentsExpense.folio}
          expenseConcept={attachmentsExpense.concept}
          attachments={getExpenseAttachments(attachmentsExpense)}
          onSave={saveExpenseAttachments}
        />
      )}
    </div>
  );
}

function BudgetTextInput({
  label,
  onChange,
  required,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  required?: boolean;
  value: string;
}) {
  return (
    <label className="space-y-1.5 text-sm font-semibold text-gray-700 dark:text-gray-300">
      <span>{label}{required ? ' *' : ''}</span>
      <input
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-gray-900 outline-none focus:border-[#147514] focus:ring-2 focus:ring-[#147514]/20 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
      />
    </label>
  );
}

function BudgetNumberInput({
  label,
  min,
  onChange,
  value,
}: {
  label: string;
  min: number;
  onChange: (value: number) => void;
  value: number;
}) {
  return (
    <label className="space-y-1.5 text-sm font-semibold text-gray-700 dark:text-gray-300">
      <span>{label} *</span>
      <input
        min={min}
        required
        type="number"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-gray-900 outline-none focus:border-[#147514] focus:ring-2 focus:ring-[#147514]/20 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
      />
    </label>
  );
}

function BudgetDateInput({
  label,
  onChange,
  required,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  required?: boolean;
  value: string;
}) {
  return (
    <label className="space-y-1.5 text-sm font-semibold text-gray-700 dark:text-gray-300">
      <span>{label}{required ? ' *' : ''}</span>
      <input
        required={required}
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-gray-900 outline-none focus:border-[#147514] focus:ring-2 focus:ring-[#147514]/20 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
      />
    </label>
  );
}

function BudgetSelect({
  includeEmpty,
  label,
  onChange,
  options,
  required,
  value,
}: {
  includeEmpty?: boolean;
  label: string;
  onChange: (value: string) => void;
  options: Array<string | { value: string; label: string }>;
  required?: boolean;
  value: string;
}) {
  return (
    <label className="space-y-1.5 text-sm font-semibold text-gray-700 dark:text-gray-300">
      <span>{label}{required ? ' *' : ''}</span>
      <select
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-gray-900 outline-none focus:border-[#147514] focus:ring-2 focus:ring-[#147514]/20 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
      >
        {(includeEmpty || !required) && <option value="">Seleccionar</option>}
        {options.map(option => {
          const value = typeof option === 'string' ? option : option.value;
          const label = typeof option === 'string' ? option : option.label;
          return (
            <option key={value} value={value}>{label}</option>
          );
        })}
      </select>
    </label>
  );
}
