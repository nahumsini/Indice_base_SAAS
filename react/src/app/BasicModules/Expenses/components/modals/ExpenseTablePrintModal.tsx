import { StandardDocumentPreview } from '../../../shared/print/StandardDocumentPreview';
import { getWebPrintCopy } from '../../../shared/print/webPrintCopy';
import { useMemo, useRef, useState } from 'react';
import { Printer } from 'lucide-react';
import { IndiceModalFrame, IndiceModalValidation } from '../../../../components/indice-modal';
import { useCompanyPrintIdentity } from '../../../shared/print/useCompanyPrintIdentity';
import { printStandardDocumentPdf } from '../../../shared/print/standardDocumentPdf';
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
  const output = () => {
    if (!ready || busy.current) return;
    busy.current = true; setFailed(false);
    try {
      const result = printStandardDocumentPdf(definition);
      if (!result) setFailed(true);
    } catch { setFailed(true); }
    finally { busy.current = false; }
  };
  return <IndiceModalFrame open modalType="operational-workspace" title={copy.title} description={copy.description}
    icon={<Printer className="h-5 w-5" />} tone="green" closeLabel={copy.close} onOpenChange={open => !open && onClose()}
    footerSummary={`${rows.length} ${copy.rows}`}
    footer={<>
      <button type="button" onClick={onClose} className={financeModalSecondaryButtonClass}>{copy.close}</button>
      <button type="button" disabled={!ready} onClick={output} className={financeModalPrimaryButtonClass}><Printer className="h-4 w-4" />{getWebPrintCopy(locale).action}</button>
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
      {!rows.length ? <p>{copy.empty}</p> : <StandardDocumentPreview definition={definition} />}
    </div>
  </IndiceModalFrame>;
}
