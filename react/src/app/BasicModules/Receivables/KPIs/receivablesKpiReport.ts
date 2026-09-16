import type { StandardDocumentDefinition } from '../../shared/print/standardDocumentPdf';
import type { KpiTableModel } from './ReceivablesKpiTable';
import type { KpiCard } from './receivablesKpiPresentation';
import type { ReceivablesKpiCopy } from './workspaceCopy';

// All filtered rows, independent of the active view, follow-up focus or pagination.
export function buildReceivablesKpiReport(copy: ReceivablesKpiCopy, locale: string, scopeLabels: string[], cards: KpiCard[], tables: KpiTableModel[], notices: string[]): StandardDocumentDefinition {
  return {
    accentColor: [20, 117, 20], locale, title: copy.title, subtitle: copy.fullReport,
    contract: { category: 'operational-report', modifiers: ['internal', 'multi-currency'], pageSize: 'a4', orientation: 'landscape', version: '1.0' },
    fileName: { documentType: 'receivables-kpis' }, generatedAt: new Date(),
    notice: [copy.context, ...scopeLabels, ...notices].filter(Boolean).join('\n'),
    metrics: cards.map(card => ({ label: card.title, value: card.value })),
    tables: tables.map(table => ({ title: table.title, columns: table.columns, rows: table.rows.map(row => row.cells), emptyMessage: copy.empty, fontSize: 8 })),
    sections: [{ title: copy.fullReport, fields: cards.map(card => ({ label: card.title, value: `${card.description} ${card.helper}` })) }],
  };
}
