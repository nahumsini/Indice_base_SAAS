import { useEffect, useMemo, useState, type ClipboardEvent } from 'react';
import { ClipboardPaste, Plus, TableProperties, Trash2, Upload } from 'lucide-react';
import { billingApi, type BillingSubscriptionResponse } from '../../../../api/billing';
import { Button } from '../../../../components/ui/button';
import { IndiceModalFrame, IndiceModalValidation } from '../../../../components/indice-modal';
import type { EmployeeBusinessOption, EmployeeUnitOption } from '../types/employees.types';

type BulkEmployeeRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  compensation: string;
  hireDate: string;
};

export type BulkEmployeePayload = Record<string, unknown>;

const initialRows = 12;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function createRow(index: number): BulkEmployeeRow {
  return {
    id: `bulk-employee-${Date.now()}-${index}`,
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    compensation: '',
    hireDate: '',
  };
}

function createRows(count = initialRows) {
  return Array.from({ length: count }, (_, index) => createRow(index));
}

function normalizeEmail(value: string) {
  return value.trim().toLocaleLowerCase();
}

function parseCompensation(value: string) {
  const normalized = value.trim().replace(/^\$\s*/, '').replace(/\s/g, '');
  if (!normalized || /[^\d,.-]/.test(normalized) || normalized.includes('-')) return Number.NaN;
  if (/^\d{1,3}(,\d{3})+(\.\d{1,2})?$/.test(normalized)) return Number(normalized.replace(/,/g, ''));
  if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(normalized)) return Number(normalized.replace(/\./g, '').replace(',', '.'));
  if (/^\d+(?:[.,]\d{1,2})?$/.test(normalized)) return Number(normalized.replace(',', '.'));
  return Number.NaN;
}

function normalizeDate(value: string) {
  const normalized = value.trim();
  if (!normalized) return '';
  let year = '';
  let month = '';
  let day = '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    [year, month, day] = normalized.split('-');
  } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(normalized)) {
    [day, month, year] = normalized.split('/');
  } else if (/^\d{8}$/.test(normalized)) {
    year = normalized.slice(0, 4);
    month = normalized.slice(4, 6);
    day = normalized.slice(6, 8);
  } else {
    return '';
  }
  const date = new Date(`${year}-${month}-${day}T00:00:00`);
  if (Number.isNaN(date.getTime()) || date.getFullYear() !== Number(year) || date.getMonth() + 1 !== Number(month) || date.getDate() !== Number(day)) return '';
  return `${year}-${month}-${day}`;
}

function todayIsoDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function clipboardRows(text: string) {
  const rows = text.replace(/\r/g, '').split('\n').filter((row) => row.trim()).map((row) => row.split('\t'));
  const headers = rows[0]?.map((cell) => cell.trim().toLocaleLowerCase()) ?? [];
  const hasHeader = headers.some((cell) => cell.includes('nombre')) && headers.some((cell) => cell.includes('correo'));
  return hasHeader ? rows.slice(1) : rows;
}

const inputClassName = 'h-10 w-full min-w-[140px] border-0 bg-transparent px-3 text-sm text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-inset focus:ring-[#59C3A5] dark:text-slate-100 dark:focus:bg-slate-900';
const selectClassName = 'h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-[#59C3A5] focus:ring-2 focus:ring-[#59C3A5]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100';

export function EmployeeBulkIntegrationModal({
  businessOptions,
  existingEmails,
  open,
  unitOptions,
  onOpenChange,
  onSubmit,
}: {
  businessOptions: EmployeeBusinessOption[];
  existingEmails: string[];
  open: boolean;
  unitOptions: EmployeeUnitOption[];
  onOpenChange: (open: boolean) => void;
  onSubmit: (items: BulkEmployeePayload[]) => Promise<void>;
}) {
  const [rows, setRows] = useState<BulkEmployeeRow[]>(() => createRows());
  const [unitId, setUnitId] = useState('');
  const [businessId, setBusinessId] = useState('');
  const [salaryType, setSalaryType] = useState<'daily' | 'hourly'>('daily');
  const [payPeriod, setPayPeriod] = useState<'weekly' | 'biweekly' | 'semimonthly' | 'monthly'>('weekly');
  const [subscription, setSubscription] = useState<BillingSubscriptionResponse | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!open) return;
    setRows(createRows());
    setUnitId('');
    setBusinessId('');
    setSalaryType('daily');
    setPayPeriod('weekly');
    setMessage('');
    void billingApi.subscriptionOptional().then(setSubscription).catch(() => setSubscription(null));
  }, [open]);

  const availableBusinesses = useMemo(
    () => businessOptions.filter((option) => !unitId || String(option.unitId ?? option.unit_id ?? '') === unitId),
    [businessOptions, unitId],
  );
  const existingEmailSet = useMemo(() => new Set(existingEmails.map(normalizeEmail)), [existingEmails]);

  const evaluatedRows = useMemo(() => {
    const emailCounts = new Map<string, number>();
    rows.forEach((row) => {
      const email = normalizeEmail(row.email);
      if (email) emailCounts.set(email, (emailCounts.get(email) ?? 0) + 1);
    });
    return rows.map((row) => {
      const used = Boolean(row.firstName.trim() || row.lastName.trim() || row.email.trim() || row.phone.trim() || row.compensation.trim() || row.hireDate.trim());
      const email = normalizeEmail(row.email);
      const compensation = parseCompensation(row.compensation);
      const normalizedHireDate = normalizeDate(row.hireDate);
      const errors = {
        firstName: used && !row.firstName.trim() ? 'Nombre obligatorio.' : '',
        lastName: used && !row.lastName.trim() ? 'Apellidos obligatorios.' : '',
        email: used && (!emailPattern.test(email) || (emailCounts.get(email) ?? 0) > 1 || existingEmailSet.has(email))
          ? existingEmailSet.has(email) ? 'El correo ya pertenece a un colaborador.' : (emailCounts.get(email) ?? 0) > 1 ? 'Correo repetido en la tabla.' : 'Correo inválido.'
          : '',
        phone: '',
        compensation: used && (!Number.isFinite(compensation) || compensation <= 0) ? 'Ingresa un monto mayor a cero.' : '',
        hireDate: used && row.hireDate.trim() && !normalizedHireDate ? 'Usa AAAA-MM-DD, DD/MM/AAAA o AAAAMMDD.' : '',
      };
      const valid = used && !Object.values(errors).some(Boolean);
      return { row, used, valid, errors, email, compensation, normalizedHireDate };
    });
  }, [existingEmailSet, rows]);

  const usedRows = evaluatedRows.filter(({ used }) => used);
  const invalidRows = usedRows.filter(({ valid }) => !valid);
  const visibleErrorMessages = invalidRows.slice(0, 5).flatMap(({ row, errors }) => {
    const rowNumber = rows.findIndex((candidate) => candidate.id === row.id) + 1;
    const labels: Record<keyof typeof errors, string> = {
      firstName: 'Nombre',
      lastName: 'Apellidos',
      email: 'Correo',
      phone: 'Teléfono',
      compensation: 'Sueldo / tarifa',
      hireDate: 'Fecha de ingreso',
    };
    return Object.entries(errors)
      .filter(([, error]) => Boolean(error))
      .map(([field, error]) => `Fila ${rowNumber} · ${labels[field as keyof typeof errors]}: ${error}`);
  });
  if (invalidRows.length > 5) {
    visibleErrorMessages.push(`Hay ${invalidRows.length - 5} filas adicionales con errores.`);
  }
  const assignmentReady = Boolean(unitId && businessId);
  const remainingSeats = subscription?.seat_limit_enforced ? subscription.remaining_seats : null;
  const lacksSeats = remainingSeats !== null && usedRows.length > remainingSeats;
  const canSubmit = assignmentReady && usedRows.length > 0 && invalidRows.length === 0 && !lacksSeats && !isSaving;

  const updateCell = (index: number, field: keyof Omit<BulkEmployeeRow, 'id'>, value: string) => {
    setRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: value } : row));
    setMessage('');
  };

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>, startRow: number, startColumn: number) => {
    const pastedRows = clipboardRows(event.clipboardData.getData('text'));
    if (pastedRows.length === 0) return;
    event.preventDefault();
    setRows((current) => {
      const fields: Array<keyof Omit<BulkEmployeeRow, 'id'>> = ['firstName', 'lastName', 'email', 'phone', 'compensation', 'hireDate'];
      const next = [...current, ...createRows(Math.max(0, startRow + pastedRows.length - current.length))];
      pastedRows.forEach((cells, rowOffset) => {
        const targetIndex = startRow + rowOffset;
        const target = { ...next[targetIndex] };
        cells.forEach((cell, columnOffset) => {
          const field = fields[startColumn + columnOffset];
          if (field) target[field] = cell.trim();
        });
        next[targetIndex] = target;
      });
      return next;
    });
    setMessage(`${pastedRows.length} filas pegadas. Revisa las celdas antes de crear.`);
  };

  const submit = async () => {
    if (!canSubmit) {
      setMessage(lacksSeats ? 'No hay suficientes espacios disponibles para este lote.' : 'Completa la asignación común y corrige todas las filas marcadas.');
      return;
    }
    const items = evaluatedRows.filter(({ valid }) => valid).map(({ row, email, compensation, normalizedHireDate }) => ({
      first_name: row.firstName.trim(),
      last_name: row.lastName.trim(),
      email,
      phone: row.phone.trim(),
      unit_id: Number(unitId),
      business_id: Number(businessId),
      hire_date: normalizedHireDate || todayIsoDate(),
      salary_type: salaryType,
      salary: salaryType === 'daily' ? compensation : 0,
      hourly_rate: salaryType === 'hourly' ? compensation : 0,
      pay_period: payPeriod,
      contract_type: 'permanent',
      status: 'active',
    }));
    setIsSaving(true);
    setMessage('');
    try {
      await onSubmit(items);
      onOpenChange(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo completar la integración masiva.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <IndiceModalFrame
      bodyClassName="space-y-4"
      busy={isSaving}
      contentClassName="sm:max-w-[96rem]"
      description="Crea colaboradores y sus accesos en una tabla compatible con Excel. El lote se guarda completo o no se guarda."
      footer={<>
        <Button type="button" variant="outline" disabled={isSaving} onClick={() => onOpenChange(false)}>Cancelar</Button>
        <Button type="button" disabled={!canSubmit} onClick={() => void submit()} className="bg-[#269C82] text-white hover:bg-[#177d66]">
          <Upload className="h-4 w-4" /> {invalidRows.length > 0 ? `Corrige ${invalidRows.length} ${invalidRows.length === 1 ? 'error' : 'errores'}` : `Crear ${usedRows.length} colaboradores`}
        </Button>
      </>}
      footerLeading={<span className="text-sm text-white">{usedRows.length} filas capturadas · {invalidRows.length} con errores</span>}
      icon={<TableProperties className="h-5 w-5" />}
      modalType="operational-workspace"
      onOpenChange={onOpenChange}
      open={open}
      title="Integración masiva de colaboradores"
      tone="aqua"
    >
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-3">
          <h3 className="text-sm font-medium text-slate-900 dark:text-white">Asignación común del lote</h3>
          <p className="text-xs text-slate-500">Estos datos se aplicarán a todos los colaboradores de la tabla.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-1 text-xs text-slate-600"><span>Unidad *</span><select className={selectClassName} value={unitId} onChange={(event) => { setUnitId(event.target.value); setBusinessId(''); }}><option value="">Seleccionar</option>{unitOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <label className="space-y-1 text-xs text-slate-600"><span>Negocio *</span><select className={selectClassName} value={businessId} disabled={!unitId} onChange={(event) => setBusinessId(event.target.value)}><option value="">Seleccionar</option>{availableBusinesses.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <label className="space-y-1 text-xs text-slate-600"><span>Tipo de pago *</span><select className={selectClassName} value={salaryType} onChange={(event) => setSalaryType(event.target.value as 'daily' | 'hourly')}><option value="daily">Sueldo diario</option><option value="hourly">Pago por hora</option></select></label>
          <label className="space-y-1 text-xs text-slate-600"><span>Periodicidad *</span><select className={selectClassName} value={payPeriod} onChange={(event) => setPayPeriod(event.target.value as typeof payPeriod)}><option value="weekly">Semanal</option><option value="biweekly">Cada 2 semanas</option><option value="semimonthly">Quincenal</option><option value="monthly">Mensual</option></select></label>
        </div>
      </section>

      <IndiceModalValidation
        tone={lacksSeats ? 'error' : 'info'}
        title={remainingSeats === null ? 'El servidor validará la capacidad antes de guardar.' : `${remainingSeats} espacios disponibles; este lote utilizará ${usedRows.length}.`}
        messages={['Cada colaborador tendrá identidad de acceso y perfil PIN. Ninguna fila se guardará si existe un error.']}
      />
      {invalidRows.length > 0 ? (
        <IndiceModalValidation
          tone="error"
          title={`Corrige ${invalidRows.length} ${invalidRows.length === 1 ? 'fila' : 'filas'} antes de crear el lote.`}
          messages={visibleErrorMessages}
        />
      ) : null}
      {message ? <IndiceModalValidation tone={invalidRows.length > 0 || lacksSeats ? 'error' : 'info'} messages={[message]} /> : null}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 bg-blue-50 px-4 py-3 text-sm text-blue-950 dark:border-slate-700 dark:bg-blue-950/30 dark:text-blue-100">
          <span className="flex items-center gap-2"><ClipboardPaste className="h-4 w-4" /> Pega desde Excel: nombres | apellidos | correo | teléfono | sueldo/tarifa | fecha de ingreso (opcional; vacío = hoy)</span>
          <span>Máximo 500 filas</span>
        </div>
        <div className="max-h-[42vh] overflow-auto">
          <table className="w-full min-w-[1180px] border-collapse text-left">
            <thead className="sticky top-0 z-10 bg-slate-100 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300"><tr><th className="w-12 px-3 py-3">#</th><th className="px-3 py-3">Nombre(s) *</th><th className="px-3 py-3">Apellidos *</th><th className="px-3 py-3">Correo *</th><th className="px-3 py-3">Teléfono</th><th className="px-3 py-3">Sueldo / tarifa *</th><th className="px-3 py-3">Fecha de ingreso</th></tr></thead>
            <tbody>{evaluatedRows.map(({ row, errors }, index) => {
              const rowHasError = Object.values(errors).some(Boolean);
              const fields: Array<keyof Omit<BulkEmployeeRow, 'id'>> = ['firstName', 'lastName', 'email', 'phone', 'compensation', 'hireDate'];
              return <tr key={row.id} className={rowHasError ? 'bg-red-50 dark:bg-red-950/20' : 'border-t border-slate-100 dark:border-slate-800'}><td className="px-3 text-xs text-slate-400">{index + 1}</td>{fields.map((field, columnIndex) => <td key={field} className={errors[field as keyof typeof errors] ? 'outline outline-1 outline-red-400' : ''}><input className={inputClassName} value={row[field]} title={errors[field as keyof typeof errors] || undefined} placeholder={field === 'firstName' ? 'Ej. Andrea' : field === 'lastName' ? 'Ej. López Pérez' : field === 'email' ? 'correo@empresa.com' : field === 'phone' ? '+52 998...' : field === 'compensation' ? '0.00' : 'Hoy (automático)'} onPaste={(event) => handlePaste(event, index, columnIndex)} onChange={(event) => updateCell(index, field, event.target.value)} /></td>)}</tr>;
            })}</tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 dark:border-slate-700">
          <Button type="button" variant="outline" disabled={rows.length >= 500} onClick={() => setRows((current) => [...current, ...createRows(Math.min(10, 500 - current.length))])}><Plus className="h-4 w-4" /> Agregar 10 filas</Button>
          <Button type="button" variant="ghost" onClick={() => setRows(createRows())}><Trash2 className="h-4 w-4" /> Limpiar tabla</Button>
        </div>
      </section>
    </IndiceModalFrame>
  );
}
