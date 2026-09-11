import { useMemo, useRef, useState } from 'react';
import { Download, Printer } from 'lucide-react';
import { IndiceModalFrame, IndiceModalValidation } from '../../../../components/indice-modal';
import { useCompanyPrintIdentity } from '../../../shared/print/useCompanyPrintIdentity';
import { downloadStandardDocumentPdf, printStandardDocumentPdf } from '../../../shared/print/standardDocumentPdf';
import { documentPrintAttribution, formatDocumentPrintDateTime, getDocumentPrintLabels } from '../../../shared/print/documentPrintContract';
import { useExpensesResolvedLocale, useExpensesTranslations } from '../../Expenses/hooks/useExpensesTranslations';
import type { ColumnConfig } from '../../types/expenseView.types';
import { buildExpenseTableDocument, type ExpensePrintSnapshot, type ExpensePrintReferences } from '../../utils/expenseTablePrint';
import { getExpenseTablePrintCopy } from '../../utils/expenseTablePrint.copy';
import { financeModalPrimaryButtonClass, financeModalSecondaryButtonClass } from './FinanceModalPrimitives';

type Props = { snapshot: ExpensePrintSnapshot; columns: ColumnConfig[]; filters: string; references: ExpensePrintReferences; onClose: () => void };

export function ExpenseTablePrintModal({ snapshot, columns, filters, references, onClose }: Props) {
  const locale = useExpensesResolvedLocale();
  const t = useExpensesTranslations();
  const copy = getExpenseTablePrintCopy(locale);
  const { identity, isReady } = useCompanyPrintIdentity();
  const [scope, setScope] = useState<'selected' | 'all'>(snapshot.selected.length ? 'selected' : 'all');
  const [generatedAt] = useState(() => new Date());
  const [failed, setFailed] = useState(false);
  const busy = useRef(false);
  const rows = snapshot[scope];
  const definition = useMemo(() => buildExpenseTableDocument({ expenses: rows, columns, companyName: identity.name,
    locale, filters, scope: scope === 'selected' ? copy.selection : copy.filtered, t, references, generatedAt }),
  [rows, columns, identity.name, locale, filters, scope, copy.selection, copy.filtered, t, references, generatedAt]);
  const ready = isReady && rows.length > 0 && columns.some(column => column.visible && column.key !== 'actions');
  const output = (kind: 'download' | 'print') => {
    if (!ready || busy.current) return;
    busy.current = true; setFailed(false);
    try {
      const result = kind === 'download' ? downloadStandardDocumentPdf(definition) : printStandardDocumentPdf(definition);
      if (!result) setFailed(true);
    } catch { setFailed(true); }
    finally { busy.current = false; }
  };
  return <IndiceModalFrame open modalType="operational-workspace" title={copy.title} description={copy.description}
    icon={<Printer className="h-5 w-5" />} tone="green" closeLabel={copy.close} onOpenChange={open => !open && onClose()}
    footerSummary={`${rows.length} ${copy.rows}`}
    footer={<>
      <button type="button" onClick={onClose} className={financeModalSecondaryButtonClass}>{copy.close}</button>
      <button type="button" disabled={!ready} onClick={() => output('download')} className={financeModalSecondaryButtonClass}><Download className="h-4 w-4" />{copy.download}</button>
      <button type="button" disabled={!ready} onClick={() => output('print')} className={financeModalPrimaryButtonClass}><Printer className="h-4 w-4" />{copy.print}</button>
    </>}>
    <div className="space-y-4">
      <label className="flex flex-wrap items-center gap-3 text-sm font-medium">{copy.scope}
        <select aria-label={copy.scope} value={scope} onChange={event => { setScope(event.target.value as 'selected' | 'all'); setFailed(false); }} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 dark:bg-slate-900">
          <option value="selected" disabled={!snapshot.selected.length}>{copy.selection} ({snapshot.selected.length})</option>
          <option value="all">{copy.filtered} ({snapshot.all.length})</option>
        </select>
      </label>
      <IndiceModalValidation messages={failed ? [copy.failed] : []} />
      {!isReady && <p role="status">{copy.preparing}</p>}
      {!rows.length ? <p>{copy.empty}</p> : <article className="space-y-6 rounded-xl border border-slate-200 bg-white p-5 text-slate-900 shadow-sm sm:p-8">
        <header className="border-b border-slate-200 pb-5">
          <p className="text-lg font-medium">{identity.name}</p>
          <h2 className="mt-2 text-2xl font-medium text-[#147514]">{definition.title}</h2>
          <p className="mt-2 text-sm text-slate-600">{definition.subtitle}</p>
        </header>
        <section><h3 className="text-sm font-medium">{copy.filters}</h3><p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{filters || copy.all}</p><p className="mt-2 text-xs text-slate-500">{copy.notice}</p></section>
        {definition.tables?.map((table, index) => <section key={index} className="space-y-3">
          {table.title && <h3 className="text-base font-medium">{table.title}</h3>}
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="bg-slate-50"><tr>{table.columns.map((column, position) => <th key={position} className={`px-3 py-3 font-medium ${table.numericColumnIndices?.includes(position) ? 'text-right' : ''}`}>{column}</th>)}</tr></thead>
              <tbody>{table.rows.map((row, rowIndex) => <tr key={rowIndex} className="border-t border-slate-200 even:bg-slate-50">{row.map((value, position) => <td key={position} className={`min-w-24 whitespace-pre-wrap break-words px-3 py-3 ${table.numericColumnIndices?.includes(position) ? 'text-right tabular-nums' : ''}`}>{value ?? '—'}</td>)}</tr>)}</tbody>
            </table>
          </div>
        </section>)}
        <footer className="border-t border-slate-200 pt-4 text-xs text-slate-500">{documentPrintAttribution} · {getDocumentPrintLabels(locale).updated}: {formatDocumentPrintDateTime(generatedAt, locale)}</footer>
      </article>}
    </div>
  </IndiceModalFrame>;
}
