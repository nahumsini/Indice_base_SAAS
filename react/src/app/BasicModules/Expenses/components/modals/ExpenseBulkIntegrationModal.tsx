import { useEffect, useMemo, useRef, useState, type ClipboardEvent } from 'react';
import { ChevronLeft, ChevronRight, ClipboardPaste, Info, PencilLine, Plus, Rows3, Search, Trash2, Upload } from 'lucide-react';
import { IndiceModalFrame, IndiceModalValidation } from '../../../../components/indice-modal';
import { Button } from '../../../../components/ui/button';
import { ExpenseAccountSelect } from '../table/ExpenseAccountSelect';
import type { SelectOption } from '../table/ExpenseInlineControls';
import { parseMoney, parseDate, displayDate } from '../../utils/expenseBulkInput';
import { getDefaultBudgetTaxProfile, getBudgetTaxProfiles, inferTaxCountryFromCurrency } from '../../Budgets/budgetTaxCatalog';
import { useExpensesResolvedLocale } from '../../Expenses/hooks/useExpensesTranslations';
import { getExpenseWorkflowCopy } from '../../utils/expenseWorkflow.copy';
import type { Expense, Provider } from '../../types/expenses.types';

export type ExpenseBulkDraft = {
  concept: string;
  date: string;
  providerId?: string;
  paymentAccountId?: string;
  accountingAccountId?: string;
  currency: string;
  total: number;
  paid?: boolean;
  dueDate?: string;
  taxIncluded?: boolean;
  taxRate?: number;
  taxName?: string;
  taxCountry?: string;
  taxProfileId?: string;
};

export type ExpenseBulkEditDraft = ExpenseBulkDraft & { id: string };

type BulkMode = 'create' | 'edit';
type EditableField = 'date' | 'provider' | 'concept' | 'total' | 'paymentAccount' | 'accountingAccount';
type EditableRow = Record<EditableField, string> & {
  id: string;
  expenseId?: string;
  taxIncluded?: boolean;
  original: Record<EditableField, string>;
};

const initialRowCount = 15;
const editPageSize = 100;
const currentMonth = () => toDateInput(new Date()).slice(0, 7);
const emptyValues = (): Record<EditableField, string> => ({
  concept: '', date: displayDate(toDateInput(new Date())), provider: '', total: '', paymentAccount: '', accountingAccount: '',
});
const emptyRow = (index: number): EditableRow => {
  const values = emptyValues();
  return { id: `bulk-expense-${Date.now()}-${index}`, ...values, original: { ...values } };
};
const emptyRows = (count = initialRowCount) => Array.from({ length: count }, (_, index) => emptyRow(index));

const normalized = (value: string) => value.trim().toLocaleLowerCase();
const providerId = (providers: Provider[], input: string) => {
  const key = normalized(input);
  return providers.find(provider => normalized(provider.id) === key || normalized(provider.name) === key)?.id;
};
const providerLabel = (providers: Provider[], value?: string) => providers.find(provider => provider.id === value)?.name ?? value ?? '';


const toDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const rowChanged = (row: EditableRow) => (Object.keys(row.original) as EditableField[]).some(field => row[field] !== row.original[field]);

function expenseRows(
  expenses: Expense[],
  providers: Provider[],
): EditableRow[] {
  return expenses.map(expense => {
    const values: Record<EditableField, string> = {
      concept: expense.concept,
      date: displayDate(toDateInput(expense.date)),
      paymentAccount: expense.paymentAccountId ?? '',
      accountingAccount: expense.accountingAccount ?? '',
      provider: providerLabel(providers, expense.providerId),
      total: String(expense.total),
    };
    return { id: `bulk-expense-edit-${expense.id}`, expenseId: expense.id, ...values, original: { ...values } };
  });
}

export function ExpenseBulkIntegrationModal({
  accountingAccounts,
  paymentAccounts,
  editableExpenses,
  isSaving,
  lockedExpenseCount,
  onCreate,
  onOpenChange,
  onUpdate,
  open,
  preferredCurrency,
  providers,
}: {
  accountingAccounts: SelectOption[];
  paymentAccounts: Array<SelectOption & { currency: string }>;
  editableExpenses: Expense[];
  isSaving: boolean;
  lockedExpenseCount: number;
  onCreate: (drafts: ExpenseBulkDraft[], requestKey: string) => Promise<void>;
  onOpenChange: (open: boolean) => void;
  onUpdate: (drafts: ExpenseBulkEditDraft[]) => Promise<void>;
  open: boolean;
  preferredCurrency: string;
  providers: Provider[];
}) {
  const copy = getExpenseWorkflowCopy(useExpensesResolvedLocale());
  const [importStatus, setImportStatus] = useState<'paid' | 'pending'>('paid');
  const [dueDate, setDueDate] = useState(() => toDateInput(new Date()));
  const [taxProfileId, setTaxProfileId] = useState('');
  const [manualTaxRate, setManualTaxRate] = useState('');
  const submitInFlight = useRef(false);
  const requestKey = useRef('');
  const [batchCurrency, setBatchCurrency] = useState(preferredCurrency);
  const [mode, setMode] = useState<BulkMode>('create');
  const [rows, setRows] = useState<EditableRow[]>(() => emptyRows());
  const [message, setMessage] = useState('');
  const [editMonth, setEditMonth] = useState(currentMonth);
  const [editPage, setEditPage] = useState(1);
  const [editSearch, setEditSearch] = useState('');

  useEffect(() => {
    if (!open) return;
    requestKey.current = crypto.randomUUID();
    setBatchCurrency(preferredCurrency);
    setImportStatus('paid');
    setDueDate(toDateInput(new Date()));
    setTaxProfileId(getDefaultBudgetTaxProfile(inferTaxCountryFromCurrency(preferredCurrency))?.id ?? '');
    setManualTaxRate('');
    setMode('create');
    setRows(emptyRows());
    setMessage('');
    setEditMonth(currentMonth());
    setEditPage(1);
    setEditSearch('');
  }, [open]);

  const taxCountry = inferTaxCountryFromCurrency(batchCurrency);
  const taxProfiles = getBudgetTaxProfiles(taxCountry);
  const taxProfile = taxProfiles.find(profile => profile.id === taxProfileId) ?? getDefaultBudgetTaxProfile(taxCountry);
  const taxRate = taxProfile?.manualRate ? Number(manualTaxRate.replace(',', '.')) / 100 : taxProfile?.rate ?? 0;
  const taxValid = Number.isFinite(taxRate) && taxRate > 0 && taxRate <= 1;

  const changeMode = (nextMode: BulkMode) => {
    setMode(nextMode);
    setMessage('');
    setEditMonth(currentMonth());
    setEditPage(1);
    setEditSearch('');
    setRows(nextMode === 'create' ? emptyRows() : expenseRows(editableExpenses, providers));
  };

  const resolveAccount = (options: SelectOption[], input: string) => {
    const key = normalized(input);
    const matches = options.filter(option => normalized(option.value) === key || normalized(option.label) === key
      || normalized(option.label.split(' - ')[0]) === key);
    return matches.length === 1 ? matches[0].value : undefined;
  };

  const evaluations = useMemo(() => rows.map((row, rowIndex) => {
    const used = mode === 'edit' ? rowChanged(row) : Boolean(row.concept.trim() || row.total.trim());
    const provider = providerId(providers, row.provider);
    const currency = mode === 'edit' ? editableExpenses.find(expense => expense.id === row.expenseId)?.currency ?? batchCurrency : batchCurrency;
    const paymentOptions = paymentAccounts.filter(account => account.currency === currency);
    const paymentAccountId = resolveAccount(paymentOptions, row.paymentAccount);
    const accountingAccountId = resolveAccount(accountingAccounts, row.accountingAccount);
    const total = parseMoney(row.total, currency);
    const date = parseDate(row.date) || (mode === 'create' && !row.date.trim() ? toDateInput(new Date()) : '');
    const errors = {
      taxIncluded: mode === 'create' && row.taxIncluded && !taxValid ? copy.taxRequired : '',
      dueDate: mode === 'create' && importStatus === 'pending' && !parseDate(dueDate) ? copy.dateRequired : '',
      concept: !row.concept.trim() ? 'Escribe el concepto del gasto.' : row.concept.trim().length > 220 ? 'El concepto admite hasta 220 caracteres.' : '',
      date: !date ? 'Escribe una fecha válida en DD/MM/AAAA.' : mode === 'create' && importStatus === 'paid' && date > toDateInput(new Date()) ? copy.importDateInvalid : '',
      paymentAccount: ((mode === 'create' && importStatus === 'paid') || row.paymentAccount.trim()) && !paymentAccountId ? 'Selecciona una cuenta de pago activa en la moneda de la fila.' : '',
      accountingAccount: row.accountingAccount.trim() && !accountingAccountId ? 'Selecciona una cuenta contable existente.' : '',
      provider: mode === 'edit' && row.provider.trim() && !provider ? 'Selecciona un proveedor existente.' : '',
      total: !Number.isFinite(total) || total <= 0 ? 'Escribe un monto mayor a cero, con máximo dos decimales.' : '',
    };
    const valid = used && !Object.values(errors).some(Boolean);
    return { date, errors, provider, row, rowIndex, total, used, valid, currency, paymentOptions, paymentAccountId, accountingAccountId };
  }), [mode, batchCurrency, providers, rows, accountingAccounts, paymentAccounts, editableExpenses, importStatus, dueDate, taxValid, copy.taxRequired, copy.dateRequired, copy.importDateInvalid]);

  const ready = evaluations.filter(result => result.valid);
  const invalid = evaluations.filter(result => result.used && !result.valid);
  const monthEvaluations = useMemo(() => mode === 'edit'
    ? evaluations.filter(({ row }) => parseDate(row.original.date).slice(0, 7) === editMonth)
    : evaluations, [editMonth, evaluations, mode]);
  const filteredEditEvaluations = useMemo(() => {
    if (mode !== 'edit') return evaluations;
    const query = normalized(editSearch);
    return monthEvaluations.filter(({ row }) => !query || normalized(`${row.provider} ${row.concept}`).includes(query));
  }, [editSearch, evaluations, mode, monthEvaluations]);
  const editPageCount = Math.max(1, Math.ceil(filteredEditEvaluations.length / editPageSize));
  const visibleEvaluations = useMemo(() => mode === 'edit'
    ? filteredEditEvaluations.slice((editPage - 1) * editPageSize, editPage * editPageSize)
    : evaluations, [editPage, evaluations, filteredEditEvaluations, mode]);

  useEffect(() => {
    if (editPage > editPageCount) setEditPage(editPageCount);
  }, [editPage, editPageCount]);

  const updateCell = (index: number, field: EditableField, value: string) => {
    setMessage('');
    setRows(current => current.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: value } : row));
  };

  const normalizeDateCell = (index: number) => {
    setRows(current => current.map((row, rowIndex) => {
      if (rowIndex !== index) return row;
      const parsed = parseDate(row.date);
      return parsed ? { ...row, date: displayDate(parsed) } : row;
    }));
  };

  const handlePaste = (event: ClipboardEvent<HTMLElement>, startRow: number, startColumn: number) => {
    if (isSaving || submitInFlight.current) return;
    const text = event.clipboardData.getData('text/plain');
    if (!text.includes('\t') && !text.includes('\n')) return;
    event.preventDefault();
    const pasted = text.replace(/\r/g, '').split('\n').filter(line => line.trim()).map(line => line.split('\t'));
    const first = pasted[0]?.map(cell => normalized(cell)) ?? [];
    const hasHeader = first.some(cell => cell.includes('concepto')) && first.some(cell => cell.includes('monto'));
    const data = hasHeader ? pasted.slice(1) : pasted;
    const fields: EditableField[] = mode === 'create' ? ['date', 'concept', 'total', 'paymentAccount', 'accountingAccount'] : ['date', 'provider', 'concept', 'total', 'paymentAccount', 'accountingAccount'];
    setRows(current => {
      const next = [...current];
      const visibleStart = visibleEvaluations.findIndex(result => result.rowIndex === startRow);
      if (mode === 'create') while (next.length < startRow + data.length) next.push(emptyRow(next.length));
      data.forEach((cells, rowOffset) => {
        const targetIndex = mode === 'edit' ? visibleEvaluations[visibleStart + rowOffset]?.rowIndex : startRow + rowOffset;
        if (targetIndex === undefined) return;
        const target = { ...next[targetIndex] };
        cells.forEach((cell, columnOffset) => {
          const field = fields[startColumn + columnOffset];
          if (mode === 'create' && startColumn + columnOffset === fields.length) target.taxIncluded = /^(true|1|sí|si|yes|x|✓)$/i.test(cell.trim());
          if (field) target[field] = field === 'date' && parseDate(cell) ? displayDate(parseDate(cell)) : cell.trim();
        });
        next[targetIndex] = target;
      });
      return next;
    });
  };

  const submit = async () => {
    if (isSaving || submitInFlight.current || !ready.length || invalid.length || ready.length > 200) return;
    submitInFlight.current = true;
    setMessage('');
    try {
      const drafts = ready.map(result => ({
        concept: result.row.concept.trim(), date: result.date, providerId: result.provider, total: result.total, currency: result.currency,
        paymentAccountId: result.paymentAccountId, accountingAccountId: result.accountingAccountId,
        ...(mode === 'create' ? { paid: importStatus === 'paid', dueDate, taxIncluded: Boolean(result.row.taxIncluded),
          taxRate: result.row.taxIncluded ? taxRate : 0, taxName: result.row.taxIncluded ? taxProfile?.shortName : undefined,
          taxCountry, taxProfileId: result.row.taxIncluded ? taxProfile?.id : undefined } : {}),
      }));
      if (mode === 'create') await onCreate(drafts, requestKey.current);
      else await onUpdate(drafts.map((draft, index) => ({ ...draft, id: ready[index].row.expenseId! })));
      onOpenChange(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo completar la integración masiva.');
    } finally {
      submitInFlight.current = false;
    }
  };

  const columns: Array<{ field: EditableField; label: string; width: string; placeholder: string; list?: string }> = mode === 'create'
    ? [
        { field: 'date', label: 'Fecha', width: 'w-[150px]', placeholder: 'DD/MM/AAAA' },
        { field: 'concept', label: 'Concepto', width: 'w-[330px]', placeholder: 'Ej. Compra de abarrotes' },
        { field: 'total', label: `Monto (${batchCurrency})`, width: 'w-[150px]', placeholder: '0.00' },
      ]
    : [
        { field: 'date', label: 'Fecha', width: 'w-[210px]', placeholder: 'DD/MM/AAAA' },
        { field: 'provider', label: 'Proveedor', width: 'w-[280px]', placeholder: 'Proveedor opcional', list: 'bulk-expense-providers' },
        { field: 'concept', label: 'Concepto', width: 'w-[330px]', placeholder: 'Ej. Compra de abarrotes' },
        { field: 'total', label: 'Monto / moneda', width: 'w-[150px]', placeholder: '0.00' },
      ];
  columns.push(
    { field: 'paymentAccount', label: 'Cuenta de pago', width: 'w-[250px]', placeholder: 'Sin asignar' },
    { field: 'accountingAccount', label: 'Cuenta contable', width: 'w-[250px]', placeholder: 'Sin asignar' },
  );

  return (
    <IndiceModalFrame
      busy={isSaving}
      bodyClassName="flex overflow-hidden p-0"
      contentClassName="h-[calc(100dvh-2rem)] sm:max-w-[96rem]"
      description={<><span className="sm:hidden">Captura gastos y asigna sus cuentas.</span><span className="hidden sm:inline">Registra gastos rápidos con fecha, concepto y monto, o edita registros abiertos en una tabla compatible con Excel.</span></>}
      footer={(
        <div className="flex gap-2">
          <Button variant="outline" className="border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white" disabled={isSaving} onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button className="bg-white text-[#147514] hover:bg-slate-100" disabled={isSaving || ready.length === 0 || invalid.length > 0 || ready.length > 200} onClick={() => void submit()}>
            {mode === 'create' ? <Upload className="h-4 w-4" /> : <PencilLine className="h-4 w-4" />}
            {isSaving ? 'Guardando…' : mode === 'create' ? `Importar ${ready.length} gastos` : `Guardar ${ready.length} cambios`}
          </Button>
        </div>
      )}
      footerLeading={<span className="text-xs font-medium text-white/90">{ready.length} {mode === 'create' ? 'gastos listos' : 'cambios listos'}</span>}
      icon={<Rows3 className="h-5 w-5" />}
      modalType="operational-workspace"
      onOpenChange={next => { if (!isSaving && !submitInFlight.current) onOpenChange(next); }}
      open={open}
      title="Integración masiva de gastos"
      tone="green"
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 p-4 sm:p-5">
        <div className="grid shrink-0 grid-cols-1 gap-2 rounded-xl sm:grid-cols-2 border border-slate-200 bg-white p-1.5">
          <Button variant={mode === 'create' ? 'default' : 'ghost'} className={mode === 'create' ? 'bg-[#147514] hover:bg-[#105010]' : ''} disabled={isSaving} onClick={() => changeMode('create')}><Plus className="h-4 w-4" />Importar gastos</Button>
          <Button variant={mode === 'edit' ? 'default' : 'ghost'} className={mode === 'edit' ? 'bg-[#147514] hover:bg-[#105010]' : ''} disabled={isSaving} onClick={() => changeMode('edit')}><PencilLine className="h-4 w-4" />Editar gastos existentes</Button>
        </div>
        <div className="hidden shrink-0 flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 sm:flex bg-blue-50 px-4 py-2.5 text-sm text-blue-950">
          <span className="flex items-center gap-2 font-medium"><ClipboardPaste className="h-4 w-4" />{mode === 'create' ? 'Pega desde Excel: fecha | concepto | monto | cuenta de pago | cuenta contable' : 'Filtra por mes y busca los gastos que deseas modificar'}</span>
          <span>{mode === 'create' ? 'Las filas vacías no se importan.' : `${monthEvaluations.length} editables este mes · ${lockedExpenseCount} protegidos · ${filteredEditEvaluations.length} coinciden con la búsqueda`}</span>
        </div>
        {mode === 'edit' ? (
          <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:grid-cols-[220px_minmax(0,1fr)]">
            <label className="grid gap-1 text-xs font-medium text-slate-600">
              <span>Mes a consultar</span>
              <input aria-label="Filtrar gastos abiertos por mes" required type="month" value={editMonth} onChange={event => { setEditMonth(event.target.value || currentMonth()); setEditPage(1); }} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" />
            </label>
            <label className="relative block">
              <span className="mb-1 block text-xs font-medium text-slate-600">Buscar dentro del mes</span>
              <span className="relative block"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input aria-label="Buscar gastos abiertos" value={editSearch} onChange={event => { setEditSearch(event.target.value); setEditPage(1); }} placeholder="Proveedor o concepto" className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" /></span>
            </label>
          </div>
        ) : null}
        <div className="shrink-0 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-950">
          {mode === 'create'
            ? <>{importStatus === 'paid' ? copy.importPaidHint : copy.importPendingHint} {copy.taxHint} {batchCurrency}.</>
            : <>Solo se muestran gastos abiertos del mes seleccionado. Puedes modificar fecha, proveedor, concepto, monto y cuentas. Los cambios se guardarán juntos únicamente cuando todas las celdas modificadas sean válidas.</>}
        </div>
        {mode === 'create' && <div className="grid shrink-0 gap-3 sm:grid-cols-3">
          <label className="grid gap-1 text-sm">{copy.importStatus}<select aria-label={copy.importStatus} disabled={isSaving} className="h-11 rounded-xl border bg-transparent px-3" value={importStatus} onChange={event => setImportStatus(event.target.value as 'paid' | 'pending')}><option value="paid">{copy.paid}</option><option value="pending">{copy.pending}</option></select></label>
          {importStatus === 'pending' && <label className="grid gap-1 text-sm">{copy.dueDate}<input aria-label={copy.dueDate} type="date" disabled={isSaving} className="h-11 rounded-xl border bg-transparent px-3" value={dueDate} onChange={event => setDueDate(event.target.value)} /></label>}
          <label className="grid gap-1 text-sm">{copy.tax}<select aria-label={copy.tax} disabled={isSaving} className="h-11 rounded-xl border bg-transparent px-3" value={taxProfile?.id} onChange={event => setTaxProfileId(event.target.value)}>{taxProfiles.map(profile => <option key={profile.id} value={profile.id}>{profile.label}</option>)}</select></label>
          {taxProfile?.manualRate && <label className="grid gap-1 text-sm">{copy.taxRate}<input aria-label={copy.taxRate} inputMode="decimal" disabled={isSaving} className="h-11 rounded-xl border bg-transparent px-3" value={manualTaxRate} onChange={event => setManualTaxRate(event.target.value)} /></label>}
        </div>}
        <datalist id="bulk-expense-providers">{providers.filter(provider => provider.status === 'active').map(provider => <option key={provider.id} value={provider.name} />)}</datalist>
        <IndiceModalValidation messages={message ? [message] : ready.length > 200 ? ['Importa hasta 200 gastos por lote.'] : invalid.length ? [`Corrige ${invalid.length} fila${invalid.length === 1 ? '' : 's'} antes de guardar.`] : []} />
        <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-slate-300 bg-white shadow-sm">
          <table className={`w-full ${mode === 'create' ? 'min-w-[1160px]' : 'min-w-[1360px]'} border-collapse text-sm`}>
            <thead className="sticky top-0 z-10 bg-slate-100"><tr><th className="w-12 border-b border-r border-slate-300 px-2 py-3 text-xs font-medium text-slate-500">#</th>{columns.map(column => <th key={column.field} className={`${column.width} border-b border-r border-slate-300 px-3 py-3 text-left font-medium text-slate-800`}>{column.label}</th>)}{mode === 'create' && <th className="w-36 border-b px-3 py-3 font-medium">{copy.includesTax}</th>}</tr></thead>
            <tbody>{visibleEvaluations.map(({ errors, row, rowIndex, used, valid, currency, paymentOptions, paymentAccountId, accountingAccountId }) => (
              <tr key={row.id} className={used && !valid ? 'bg-red-50' : mode === 'edit' && rowChanged(row) ? 'bg-amber-50' : 'bg-emerald-50/25'}>
                <td className="border-b border-r border-slate-200 px-2 py-2 text-center text-xs text-slate-400">{rowIndex + 1}</td>
                    {columns.map((column, columnIndex) => <td key={column.field} className="border-b border-r border-slate-200 p-0" onPaste={event => handlePaste(event, rowIndex, columnIndex)}>
                    {column.field === 'paymentAccount' || column.field === 'accountingAccount' ? <div className="p-1" title={used ? errors[column.field] : ''}>
                      <ExpenseAccountSelect label={`${column.label}, fila ${rowIndex + 1}`} disabled={isSaving}
                        value={(column.field === 'paymentAccount' ? paymentAccountId : accountingAccountId) ?? row[column.field]}
                        options={column.field === 'paymentAccount' ? paymentOptions : accountingAccounts}
                        onChange={value => updateCell(rowIndex, column.field, value)} />
                      {used && errors[column.field] ? <span className="px-2 text-xs text-red-700">{errors[column.field]}</span> : null}
                    </div> : <div className="flex items-center"><input disabled={isSaving} aria-label={`${column.label}, fila ${rowIndex + 1}`} list={column.list} aria-invalid={used && Boolean(errors[column.field])} title={used ? errors[column.field] : ''} value={row[column.field]} inputMode={column.field === 'total' ? 'decimal' : 'text'} onBlur={() => column.field === 'date' && normalizeDateCell(rowIndex)} onChange={event => updateCell(rowIndex, column.field, event.target.value)} placeholder={column.placeholder} className="h-11 w-full bg-transparent px-3 outline-none focus:bg-white focus:ring-2 focus:ring-inset focus:ring-emerald-600 aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-inset aria-[invalid=true]:ring-red-500" />{mode === 'edit' && column.field === 'total' ? <span className="pr-2 text-xs text-slate-500">{currency}</span> : null}</div>}</td>)}
                {mode === 'create' && <td className="border-b p-2 text-center"><input type="checkbox" aria-label={`${copy.includesTax}, ${rowIndex + 1}`} checked={Boolean(row.taxIncluded)} disabled={isSaving} onChange={event => setRows(current => current.map((item, index) => index === rowIndex ? { ...item, taxIncluded: event.target.checked } : item))} className="h-5 w-5 accent-green-700" />{used && errors.taxIncluded && <span role="alert" className="block text-xs text-red-700">{errors.taxIncluded}</span>}</td>}
              </tr>
            ))}{mode === 'edit' && visibleEvaluations.length === 0 ? <tr><td colSpan={columns.length + 1} className="px-6 py-10 text-center text-sm text-slate-500">No hay gastos abiertos que coincidan con el mes y la búsqueda seleccionados.</td></tr> : null}</tbody>
          </table>
        </div>
        {mode === 'create' ? <div className="flex shrink-0 justify-between gap-3"><Button variant="outline" disabled={isSaving} onClick={() => setRows(current => [...current, ...emptyRows(10)])}><Plus className="h-4 w-4" />Agregar 10 filas</Button><Button variant="ghost" disabled={isSaving} onClick={() => { setRows(emptyRows()); setMessage(''); }}><Trash2 className="h-4 w-4" />Limpiar tabla</Button></div> : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-start gap-2 text-xs text-slate-500"><Info className="mt-0.5 h-4 w-4 shrink-0" />Las filas amarillas tienen cambios. Los gastos pagados, auditados, presupuestales o ligados a órdenes de compra están protegidos para conservar su trazabilidad.</p>
            {editPageCount > 1 ? <div className="flex shrink-0 items-center gap-2 text-xs font-medium text-slate-600"><span>Página {editPage} de {editPageCount}</span><Button type="button" variant="outline" size="icon" aria-label="Página anterior" disabled={editPage === 1} onClick={() => setEditPage(page => Math.max(1, page - 1))}><ChevronLeft className="h-4 w-4" /></Button><Button type="button" variant="outline" size="icon" aria-label="Página siguiente" disabled={editPage === editPageCount} onClick={() => setEditPage(page => Math.min(editPageCount, page + 1))}><ChevronRight className="h-4 w-4" /></Button></div> : null}
          </div>
        )}
      </div>
    </IndiceModalFrame>
  );
}
