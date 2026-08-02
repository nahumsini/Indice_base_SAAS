import { CalendarDays, Gift, HandCoins, Search, Users } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import type { BackendHrUser } from '../../../../api/humanResources';
import type { CreateHrIncentivePayload } from '../../../../api/HumanResources/incentives';
import { Button } from '../../../../components/ui/button';
import { IndiceModalFrame } from '../../../../components/indice-modal';

interface IncentiveFormModalProps {
  defaultCurrency?: string;
  employees: BackendHrUser[];
  isOpen: boolean;
  isSaving: boolean;
  onClose: () => void;
  onSave: (payload: CreateHrIncentivePayload) => Promise<void>;
}

const currencyOptions = ['MXN', 'USD', 'CAD', 'COP', 'BRL'];

const todayIso = () => new Date().toISOString().slice(0, 10);

export function IncentiveFormModal({
  defaultCurrency = 'MXN',
  employees,
  isOpen,
  isSaving,
  onClose,
  onSave,
}: IncentiveFormModalProps) {
  const normalizedDefaultCurrency = currencyOptions.includes(defaultCurrency) ? defaultCurrency : 'MXN';
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState(normalizedDefaultCurrency);
  const [effectiveDate, setEffectiveDate] = useState(todayIso());
  const [status, setStatus] = useState<CreateHrIncentivePayload['status']>('active');
  const [scopeAll, setScopeAll] = useState(true);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen) {
      setCurrency(normalizedDefaultCurrency);
    }
  }, [isOpen, normalizedDefaultCurrency]);

  const activeEmployees = useMemo(
    () => employees.filter((employee) => employee.status === 'active'),
    [employees],
  );

  const filteredEmployees = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return activeEmployees;
    return activeEmployees.filter((employee) =>
      [
        employee.full_name,
        employee.user_code,
        employee.position_title,
        employee.unit_name,
        employee.business_name,
      ].filter(Boolean).join(' ').toLowerCase().includes(query),
    );
  }, [activeEmployees, searchQuery]);

  if (!isOpen) {
    return null;
  }

  const parsedAmount = Number(amount);
  const canSave = name.trim() && Number.isFinite(parsedAmount) && parsedAmount > 0 && effectiveDate
    && (scopeAll || selectedEmployeeIds.length > 0);

  const toggleEmployee = (employeeId: number) => {
    setSelectedEmployeeIds((current) =>
      current.includes(employeeId)
        ? current.filter((id) => id !== employeeId)
        : [...current, employeeId],
    );
  };

  const handleSave = async () => {
    if (!canSave || isSaving) return;
    await onSave({
      name: name.trim(),
      description: description.trim(),
      incentive_type: 'manual',
      amount: parsedAmount,
      currency_code: currency,
      effective_start_date: effectiveDate,
      status,
      scope_type: scopeAll ? 'all' : 'employees',
      target_user_company_ids: scopeAll ? [] : selectedEmployeeIds,
      application_mode: 'next_payroll',
    });
    setName('');
    setDescription('');
    setAmount('');
    setCurrency(normalizedDefaultCurrency);
    setEffectiveDate(todayIso());
    setStatus('active');
    setScopeAll(true);
    setSelectedEmployeeIds([]);
    setSearchQuery('');
  };

  return (
    <IndiceModalFrame
      busy={isSaving}
      description="Registra una percepción que se aplicará a la siguiente corrida."
      footer={(
        <Button type="button" onClick={handleSave} disabled={!canSave || isSaving}>
          {isSaving ? 'Guardando...' : 'Guardar incentivo'}
        </Button>
      )}
      footerLeading={(
        <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
          Cancelar
        </Button>
      )}
      footerSummary={scopeAll ? 'Se aplicará a todo el personal activo.' : `${selectedEmployeeIds.length} colaboradores seleccionados.`}
      icon={<Gift className="h-5 w-5" />}
      modalType="standard-form"
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
      open={isOpen}
      title="Agregar incentivo"
      tone="aqua"
    >
        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-slate-50/40 p-5">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-600">
              <HandCoins className="h-4 w-4 text-[#59C3A5]" />
              Incentivo
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Nombre del incentivo" required>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Ej. Bono por puntualidad"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 outline-none transition focus:border-[#59C3A5] focus:ring-2 focus:ring-[#59C3A5]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </Field>

              <Field label="Estado">
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value as CreateHrIncentivePayload['status'])}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 outline-none transition focus:border-[#59C3A5] focus:ring-2 focus:ring-[#59C3A5]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                  <option value="active">Activo</option>
                  <option value="scheduled">Programado</option>
                  <option value="paused">Pausado</option>
                </select>
              </Field>

              <Field label="Monto" required>
                <input
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  inputMode="decimal"
                  placeholder="Ej. 1500"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 outline-none transition focus:border-[#59C3A5] focus:ring-2 focus:ring-[#59C3A5]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </Field>

              <div className="grid grid-cols-[1fr_1.2fr] gap-3">
                <Field label="Divisa">
                  <select
                    value={currency}
                    onChange={(event) => setCurrency(event.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 outline-none transition focus:border-[#59C3A5] focus:ring-2 focus:ring-[#59C3A5]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  >
                    {currencyOptions.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Fecha de aplicación" required>
                  <div className="relative">
                    <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="date"
                      value={effectiveDate}
                      onChange={(event) => setEffectiveDate(event.target.value)}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm font-medium text-slate-900 outline-none transition focus:border-[#59C3A5] focus:ring-2 focus:ring-[#59C3A5]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>
                </Field>
              </div>

              <Field label="Concepto">
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Detalle interno del incentivo"
                  className="min-h-[88px] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#59C3A5] focus:ring-2 focus:ring-[#59C3A5]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white md:col-span-2"
                />
              </Field>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="flex items-center gap-2 text-sm font-medium text-slate-600">
                <Users className="h-4 w-4 text-[#59C3A5]" />
                Colaboradores
              </h3>
              <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={scopeAll}
                  onChange={(event) => setScopeAll(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-[#59C3A5] focus:ring-[#59C3A5]"
                />
                Todo el personal activo
              </label>
            </div>

            {!scopeAll ? (
              <>
                <div className="relative mb-3">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Buscar colaborador, puesto o unidad"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-[#59C3A5] focus:ring-2 focus:ring-[#59C3A5]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </div>
                <div className="max-h-60 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
                  {filteredEmployees.map((employee) => (
                    <label key={employee.id} className="flex cursor-pointer items-center gap-3 px-4 py-3 transition hover:bg-[#59C3A5]/5">
                      <input
                        type="checkbox"
                        checked={selectedEmployeeIds.includes(employee.id)}
                        onChange={() => toggleEmployee(employee.id)}
                        className="h-4 w-4 rounded border-slate-300 text-[#59C3A5] focus:ring-[#59C3A5]"
                      />
                      <span className="flex-1">
                        <span className="block text-sm font-medium text-slate-900">{employee.full_name}</span>
                        <span className="block text-xs font-medium text-slate-500">{employee.position_title || employee.position || 'Sin puesto'} · {employee.unit_name || 'Sin unidad'}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </>
            ) : null}
          </section>
        </div>
    </IndiceModalFrame>
  );
}

function Field({ children, label, required = false }: { children: ReactNode; label: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-600">
        {label}
        {required ? <span className="text-rose-500"> *</span> : null}
      </span>
      {children}
    </label>
  );
}
