import { useEffect, useMemo, useState, type ClipboardEvent } from 'react';
import { ChevronLeft, ChevronRight, ClipboardPaste, Info, PencilLine, Plus, Rows3, Search, Trash2, Upload } from 'lucide-react';
import { IndiceModalFrame, IndiceModalValidation } from '../../../../components/indice-modal';
import { Button } from '../../../../components/ui/button';
import type { Expense, Provider } from '../../types/expenses.types';

export type ExpenseBulkDraft = {
  concept: string;
  date: string;
  providerId?: string;
  total: number;
};

export type ExpenseBulkEditDraft = ExpenseBulkDraft & { id: string };

type BulkMode = 'create' | 'edit';
type EditableField = 'date' | 'provider' | 'concept' | 'total';
type EditableRow = Record<EditableField, string> & {
  id: string;
  expenseId?: string;
  original: Record<EditableField, string>;
};

const initialRowCount = 15;
const editPageSize = 100;
const currentMonth = () => toDateInput(new Date()).slice(0, 7);
const emptyValues = (): Record<EditableField, string> => ({
  concept: '', date: toDateInput(new Date()), provider: '', total: '',
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

function parseMoney(input: string, currency: string) {
  let value = input.trim();
  if (value.toUpperCase().startsWith(currency.toUpperCase())) value = value.slice(currency.length).trim();
  value = value.replace(/^\$\s*/, '').replace(/\s/g, '');
  if (!value || /[^\d,.-]/.test(value) || value.includes('-')) return Number.NaN;
  if (/^\d{1,3}(,\d{3})+(\.\d{1,2})?$/.test(value)) return Number(value.replace(/,/g, ''));
  if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(value)) return Number(value.replace(/\./g, '').replace(',', '.'));
  if (/^\d+(\.\d{1,2})?$/.test(value)) return Number(value);
  if (/^\d+(,\d{1,2})$/.test(value)) return Number(value.replace(',', '.'));
  return Number.NaN;
}

function parseDate(input: string) {
  const value = input.trim();
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const localMatch = /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/.exec(value);
  const compactMatch = /^(\d{4})(\d{2})(\d{2})$/.exec(value);
  const parts = isoMatch
    ? [isoMatch[1], isoMatch[2], isoMatch[3]]
    : localMatch
      ? [localMatch[3], localMatch[2].padStart(2, '0'), localMatch[1].padStart(2, '0')]
      : compactMatch
        ? [compactMatch[1], compactMatch[2], compactMatch[3]]
        : null;
  if (!parts && /^\d{5}$/.test(value)) {
    const serial = Number(value);
    const excelDate = new Date(Date.UTC(1899, 11, 30 + serial));
    return excelDate.toISOString().slice(0, 10);
  }
  if (!parts) return '';
  const result = `${parts[0]}-${parts[1]}-${parts[2]}`;
  const date = new Date(`${result}T00:00:00`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== result ? '' : result;
}

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
      date: toDateInput(expense.date),
      provider: providerLabel(providers, expense.providerId),
      total: String(expense.total),
    };
    return { id: `bulk-expense-edit-${expense.id}`, expenseId: expense.id, ...values, original: { ...values } };
  });
}

export function ExpenseBulkIntegrationModal({
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
  editableExpenses: Expense[];
  isSaving: boolean;
  lockedExpenseCount: number;
  onCreate: (drafts: ExpenseBulkDraft[]) => Promise<void>;
  onOpenChange: (open: boolean) => void;
  onUpdate: (drafts: ExpenseBulkEditDraft[]) => Promise<void>;
  open: boolean;
  preferredCurrency: string;
  providers: Provider[];
}) {
  const [mode, setMode] = useState<BulkMode>('create');
  const [rows, setRows] = useState<EditableRow[]>(() => emptyRows());
  const [message, setMessage] = useState('');
  const [editMonth, setEditMonth] = useState(currentMonth);
  const [editPage, setEditPage] = useState(1);
  const [editSearch, setEditSearch] = useState('');

  useEffect(() => {
    if (!open) return;
    setMode('create');
    setRows(emptyRows());
    setMessage('');
    setEditMonth(currentMonth());
    setEditPage(1);
    setEditSearch('');
  }, [open]);

  const changeMode = (nextMode: BulkMode) => {
    setMode(nextMode);
    setMessage('');
    setEditMonth(currentMonth());
    setEditPage(1);
    setEditSearch('');
    setRows(nextMode === 'create' ? emptyRows() : expenseRows(editableExpenses, providers));
  };

  const evaluations = useMemo(() => rows.map((row, rowIndex) => {
    const used = mode === 'edit' ? rowChanged(row) : Boolean(row.concept.trim() || row.total.trim());
    const provider = providerId(providers, row.provider);
    const total = parseMoney(row.total, preferredCurrency);
    const date = parseDate(row.date) || (mode === 'create' && !row.date.trim() ? toDateInput(new Date()) : '');
    const errors = {
      concept: !row.concept.trim() ? 'Escribe el concepto del gasto.' : '',
      date: !date ? 'Usa una fecha válida: AAAA-MM-DD, DD/MM/AAAA o AAAAMMDD.' : '',
      provider: mode === 'edit' && row.provider.trim() && !provider ? 'Selecciona un proveedor existente.' : '',
      total: !Number.isFinite(total) || total <= 0 ? 'Escribe un monto mayor a cero, con máximo dos decimales.' : '',
    };
    const valid = used && !Object.values(errors).some(Boolean);
    return { date, errors, provider, row, rowIndex, total, used, valid };
  }), [mode, preferredCurrency, providers, rows]);

  const ready = evaluations.filter(result => result.valid);
  const invalid = evaluations.filter(result => result.used && !result.valid);
  const monthEvaluations = useMemo(() => mode === 'edit'
    ? evaluations.filter(({ row }) => row.date.slice(0, 7) === editMonth)
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
      return parsed ? { ...row, date: parsed } : row;
    }));
  };

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>, startRow: number, startColumn: number) => {
    const text = event.clipboardData.getData('text/plain');
    if (!text.includes('\t') && !text.includes('\n')) return;
    event.preventDefault();
    const pasted = text.replace(/\r/g, '').split('\n').filter(line => line.trim()).map(line => line.split('\t'));
    const first = pasted[0]?.map(cell => normalized(cell)) ?? [];
    const hasHeader = first.some(cell => cell.includes('concepto')) && first.some(cell => cell.includes('monto'));
    const data = hasHeader ? pasted.slice(1) : pasted;
    const fields: EditableField[] = mode === 'create' ? ['date', 'concept', 'total'] : ['date', 'provider', 'concept', 'total'];
    setRows(current => {
      const next = [...current];
      while (next.length < startRow + data.length) next.push(emptyRow(next.length));
      data.forEach((cells, rowOffset) => {
        const target = { ...next[startRow + rowOffset] };
        cells.forEach((cell, columnOffset) => {
          const field = fields[startColumn + columnOffset];
          if (field) target[field] = cell.trim();
        });
        next[startRow + rowOffset] = target;
      });
      return next;
    });
  };

  const submit = async () => {
    if (!ready.length || invalid.length) return;
    setMessage('');
    try {
      const drafts = ready.map(result => ({
        concept: result.row.concept.trim(), date: result.date, providerId: result.provider, total: result.total,
      }));
      if (mode === 'create') await onCreate(drafts);
      else await onUpdate(drafts.map((draft, index) => ({ ...draft, id: ready[index].row.expenseId! })));
      onOpenChange(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo completar la integración masiva.');
    }
  };

  const columns: Array<{ field: EditableField; label: string; width: string; placeholder: string; list?: string }> = mode === 'create'
    ? [
        { field: 'date', label: 'Fecha', width: 'w-[220px]', placeholder: 'Hoy' },
        { field: 'concept', label: 'Concepto', width: 'w-[620px]', placeholder: 'Ej. Compra de abarrotes' },
        { field: 'total', label: `Monto (${preferredCurrency})`, width: 'w-[260px]', placeholder: '0.00' },
      ]
    : [
        { field: 'date', label: 'Fecha', width: 'w-[210px]', placeholder: 'AAAA-MM-DD' },
        { field: 'provider', label: 'Proveedor', width: 'w-[280px]', placeholder: 'Proveedor opcional', list: 'bulk-expense-providers' },
        { field: 'concept', label: 'Concepto', width: 'w-[440px]', placeholder: 'Ej. Compra de abarrotes' },
        { field: 'total', label: `Monto (${preferredCurrency})`, width: 'w-[220px]', placeholder: '0.00' },
      ];

  return (
    <IndiceModalFrame
      busy={isSaving}
      bodyClassName="overflow-hidden p-0"
      contentClassName="sm:max-w-[96rem]"
      description="Registra gastos rápidos con fecha, concepto y monto, o edita registros abiertos en una tabla compatible con Excel."
      footer={(
        <div className="flex gap-2">
          <Button variant="outline" className="border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white" disabled={isSaving} onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button className="bg-white text-[#147514] hover:bg-slate-100" disabled={isSaving || ready.length === 0 || invalid.length > 0} onClick={() => void submit()}>
            {mode === 'create' ? <Upload className="h-4 w-4" /> : <PencilLine className="h-4 w-4" />}
            {isSaving ? 'Guardando…' : mode === 'create' ? `Importar ${ready.length} gastos` : `Guardar ${ready.length} cambios`}
          </Button>
        </div>
      )}
      footerLeading={<span className="text-xs font-medium text-white/90">{ready.length} {mode === 'create' ? 'gastos listos' : 'cambios listos'}</span>}
      icon={<Rows3 className="h-5 w-5" />}
      modalType="operational-workspace"
      onOpenChange={onOpenChange}
      open={open}
      title="Integración masiva de gastos"
      tone="green"
    >
      <div className="flex h-full min-h-0 flex-col gap-3 p-4 sm:p-5">
        <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-white p-1.5">
          <Button variant={mode === 'create' ? 'default' : 'ghost'} className={mode === 'create' ? 'bg-[#147514] hover:bg-[#105010]' : ''} onClick={() => changeMode('create')}><Plus className="h-4 w-4" />Importar gastos</Button>
          <Button variant={mode === 'edit' ? 'default' : 'ghost'} className={mode === 'edit' ? 'bg-[#147514] hover:bg-[#105010]' : ''} onClick={() => changeMode('edit')}><PencilLine className="h-4 w-4" />Editar gastos existentes</Button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm text-blue-950">
          <span className="flex items-center gap-2 font-medium"><ClipboardPaste className="h-4 w-4" />{mode === 'create' ? 'Pega desde Excel: fecha | concepto | monto' : 'Filtra por mes y busca los gastos que deseas modificar'}</span>
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
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-950">
          {mode === 'create'
            ? <>Se usará la divisa preferida <strong>{preferredCurrency}</strong>. La fecha de hoy viene precargada; también puedes pegar desde Excel o escribir AAAA-MM-DD, DD/MM/AAAA o AAAAMMDD. Los gastos se crearán pendientes para que cada abono registre su cuenta y trazabilidad. No se importará nada mientras exista una celda con errores.</>
            : <>Solo se muestran gastos abiertos del mes seleccionado. Puedes modificar fecha, proveedor, concepto y monto. Los cambios se guardarán juntos únicamente cuando todas las celdas modificadas sean válidas.</>}
        </div>
        <datalist id="bulk-expense-providers">{providers.filter(provider => provider.status === 'active').map(provider => <option key={provider.id} value={provider.name} />)}</datalist>
        <IndiceModalValidation messages={message ? [message] : invalid.length ? [`Corrige ${invalid.length} fila${invalid.length === 1 ? '' : 's'} antes de guardar.`] : []} />
        <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-slate-300 bg-white shadow-sm">
          <table className={`w-full ${mode === 'create' ? 'min-w-[760px]' : 'min-w-[1100px]'} border-collapse text-sm`}>
            <thead className="sticky top-0 z-10 bg-slate-100"><tr><th className="w-12 border-b border-r border-slate-300 px-2 py-3 text-xs font-medium text-slate-500">#</th>{columns.map(column => <th key={column.field} className={`${column.width} border-b border-r border-slate-300 px-3 py-3 text-left font-medium text-slate-800`}>{column.label}</th>)}</tr></thead>
            <tbody>{visibleEvaluations.map(({ errors, row, rowIndex, used, valid }) => (
              <tr key={row.id} className={used && !valid ? 'bg-red-50' : mode === 'edit' && rowChanged(row) ? 'bg-amber-50' : 'bg-emerald-50/25'}>
                <td className="border-b border-r border-slate-200 px-2 py-2 text-center text-xs text-slate-400">{rowIndex + 1}</td>
                    {columns.map((column, columnIndex) => <td key={column.field} className="border-b border-r border-slate-200 p-0"><input list={column.list} aria-invalid={used && Boolean(errors[column.field])} title={used ? errors[column.field] : ''} value={row[column.field]} inputMode={column.field === 'total' ? 'decimal' : 'text'} onBlur={() => column.field === 'date' && normalizeDateCell(rowIndex)} onPaste={event => handlePaste(event, rowIndex, columnIndex)} onChange={event => updateCell(rowIndex, column.field, event.target.value)} placeholder={column.placeholder} className="h-11 w-full bg-transparent px-3 outline-none focus:bg-white focus:ring-2 focus:ring-inset focus:ring-emerald-600 aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-inset aria-[invalid=true]:ring-red-500" /></td>)}
              </tr>
            ))}{mode === 'edit' && visibleEvaluations.length === 0 ? <tr><td colSpan={columns.length + 1} className="px-6 py-10 text-center text-sm text-slate-500">No hay gastos abiertos que coincidan con el mes y la búsqueda seleccionados.</td></tr> : null}</tbody>
          </table>
        </div>
        {mode === 'create' ? <div className="flex justify-between gap-3"><Button variant="outline" onClick={() => setRows(current => [...current, ...emptyRows(10)])}><Plus className="h-4 w-4" />Agregar 10 filas</Button><Button variant="ghost" disabled={isSaving} onClick={() => { setRows(emptyRows()); setMessage(''); }}><Trash2 className="h-4 w-4" />Limpiar tabla</Button></div> : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-start gap-2 text-xs text-slate-500"><Info className="mt-0.5 h-4 w-4 shrink-0" />Las filas amarillas tienen cambios. Los gastos pagados, auditados, presupuestales o ligados a órdenes de compra están protegidos para conservar su trazabilidad.</p>
            {editPageCount > 1 ? <div className="flex shrink-0 items-center gap-2 text-xs font-medium text-slate-600"><span>Página {editPage} de {editPageCount}</span><Button type="button" variant="outline" size="icon" aria-label="Página anterior" disabled={editPage === 1} onClick={() => setEditPage(page => Math.max(1, page - 1))}><ChevronLeft className="h-4 w-4" /></Button><Button type="button" variant="outline" size="icon" aria-label="Página siguiente" disabled={editPage === editPageCount} onClick={() => setEditPage(page => Math.min(editPageCount, page + 1))}><ChevronRight className="h-4 w-4" /></Button></div> : null}
          </div>
        )}
      </div>
    </IndiceModalFrame>
  );
}
