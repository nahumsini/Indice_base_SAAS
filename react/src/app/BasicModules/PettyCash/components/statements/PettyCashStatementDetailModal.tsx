import { Download, FileText, Printer } from 'lucide-react';
import { useState } from 'react';
import { IndiceModalFrame } from '../../../../components/indice-modal';
import type { PettyCashTranslations } from '../../translations';
import type { PettyCashFund, PettyCashMovement, PettyCashSettlementLine, PettyCashStatement } from '../../types/pettyCash.types';
import { getPettyCashAccountStatementCopy } from '../../utils/pettyCashAccountStatementCopy';
import {
  buildPettyCashStatementDocument,
  downloadPettyCashStatementPdf,
  printPettyCashStatementPdf,
} from '../../utils/pettyCashStatementPdf';
import {
  documentPrintAttribution,
  formatDocumentPrintDateTime,
  getDocumentPrintLabels,
} from '../../../shared/print/documentPrintContract';

interface PettyCashStatementDetailModalProps {
  copy: PettyCashTranslations;
  fund: PettyCashFund | null;
  movements: PettyCashMovement[];
  onClose: () => void;
  originText: string;
  receipts: PettyCashSettlementLine[];
  statement: PettyCashStatement | null;
}

const displayValue = (
  value: string | number | null | undefined,
  fallback: string,
) => value === null || value === undefined || value === '' ? fallback : value;

export function PettyCashStatementDetailModal({
  copy,
  fund,
  movements,
  onClose,
  originText,
  receipts,
  statement,
}: PettyCashStatementDetailModalProps) {
  const [generatedAt] = useState(() => new Date());
  if (!statement || !fund) return null;

  const labels = getPettyCashAccountStatementCopy(copy.locale);
  const pdfContext = {
    copy,
    fund,
    generatedAt,
    locale: copy.locale,
    movements,
    originText,
    settlementLines: receipts,
    statement,
  };
  const definition = buildPettyCashStatementDocument(pdfContext);
  const footerLabels = getDocumentPrintLabels(copy.locale);

  return (
    <IndiceModalFrame
      bodyClassName="!max-h-none min-h-0 flex-1 overflow-auto bg-slate-100 px-4 py-5 dark:bg-slate-950"
      closeLabel={labels.close}
      contentClassName="h-[92dvh] max-h-[960px] sm:max-w-6xl"
      description={`${statement.folio} · ${labels.description}`}
      footer={(
        <div className="flex flex-wrap justify-end gap-2">
          <button className="inline-flex h-10 items-center justify-center rounded-xl border border-white/30 bg-white/10 px-5 text-sm font-medium text-white transition hover:bg-white/20" onClick={onClose} type="button">{labels.close}</button>
          <button className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 px-5 text-sm font-medium text-white transition hover:bg-white/20" onClick={() => downloadPettyCashStatementPdf(pdfContext)} type="button"><Download className="h-4 w-4" />{labels.download}</button>
          <button className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-medium text-[#147514] shadow-sm transition hover:bg-slate-100" onClick={() => printPettyCashStatementPdf(pdfContext)} type="button"><Printer className="h-4 w-4" />{labels.print}</button>
        </div>
      )}
      footerSummary={statement.folio}
      icon={<FileText className="h-5 w-5" />}
      modalType="operational-workspace"
      onOpenChange={(open) => !open && onClose()}
      open
      title={labels.previewTitle}
      tone="green"
    >
      <article className="mx-auto w-full max-w-[920px] space-y-6 rounded-xl border border-slate-200 bg-white p-5 text-slate-900 shadow-sm sm:p-8">
        <header className="border-b border-slate-200 pb-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <p className="text-lg font-medium text-slate-900">{definition.issuer}</p>
              <h2 className="mt-2 text-2xl font-medium text-[#147514]">{definition.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{definition.subtitle}</p>
            </div>
            <dl className="shrink-0 text-sm md:text-right">
              <dt className="text-xs text-slate-500">{labels.statement}</dt>
              <dd className="mt-1 font-medium text-slate-900">{definition.folio}</dd>
              <dt className="mt-3 text-xs text-slate-500">{labels.status}</dt>
              <dd className="mt-1 font-medium text-slate-900">{definition.status}</dd>
            </dl>
          </div>
        </header>

        {definition.metadata?.length ? (
          <dl className="grid gap-x-8 gap-y-4 border-b border-slate-200 pb-6 sm:grid-cols-3">
            {definition.metadata.map(field => (
              <div key={field.label}>
                <dt className="text-xs text-slate-500">{field.label}</dt>
                <dd className="mt-1 text-sm font-medium text-slate-900">{displayValue(field.value, copy.common.notAvailable)}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        {definition.sections?.map(section => (
          <section className="space-y-3" key={section.title}>
            <h3 className="border-b border-slate-200 pb-2 text-base font-medium text-slate-900">{section.title}</h3>
            {section.fields?.length ? (
              <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
                {section.fields.map(field => (
                  <div className="grid gap-1 sm:grid-cols-[140px_1fr] sm:gap-3" key={field.label}>
                    <dt className="text-sm text-slate-500">{field.label}</dt>
                    <dd className="break-words text-sm font-medium text-slate-800">{displayValue(field.value, copy.common.notAvailable)}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
            {section.paragraphs?.map(paragraph => (
              <p className="text-sm leading-6 text-slate-600" key={paragraph}>{paragraph}</p>
            ))}
          </section>
        ))}

        {definition.tables?.map((table, index) => (
          <section className="space-y-3" key={`${table.title ?? 'table'}-${index}`}>
            {table.title ? <h3 className="border-b border-slate-200 pb-2 text-base font-medium text-slate-900">{table.title}</h3> : null}
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full min-w-[680px] border-collapse text-left text-xs">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>{table.columns.map((column, position) => (
                    <th className={`px-3 py-3 font-medium ${table.numericColumnIndices?.includes(position) ? 'text-right' : ''}`} key={`${column}-${position}`}>{column}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {table.rows.length ? table.rows.map((row, rowIndex) => (
                    <tr className="border-t border-slate-200 even:bg-slate-50/70" key={rowIndex}>
                      {row.map((value, position) => (
                        <td className={`min-w-24 whitespace-pre-wrap break-words px-3 py-3 text-slate-700 ${table.numericColumnIndices?.includes(position) ? 'text-right tabular-nums font-medium text-slate-900' : ''}`} key={position}>{value ?? copy.common.notAvailable}</td>
                      ))}
                    </tr>
                  )) : (
                    <tr><td className="px-4 py-8 text-center text-sm text-slate-500" colSpan={table.columns.length}>{table.emptyMessage ?? copy.common.notAvailable}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ))}

        <footer className="border-t border-slate-200 pt-4 text-xs text-slate-500">
          {documentPrintAttribution} · {footerLabels.updated}: {formatDocumentPrintDateTime(generatedAt, copy.locale)}
        </footer>
      </article>
    </IndiceModalFrame>
  );
}
