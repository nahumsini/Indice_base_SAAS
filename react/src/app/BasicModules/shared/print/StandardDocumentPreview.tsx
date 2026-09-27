import { useMemo } from 'react';
import type { StandardDocumentDefinition } from './standardDocumentPdf';
import { buildStandardDocumentHtml } from './standardDocumentHtml';
import { escapeDocumentPrintHtml } from './documentHtmlPrintEngine';
import { quotationPrintTheme } from './quotationPrintTheme';

/** Isolated styles: a print preview cannot restyle the application or protected IME. */
export function StandardDocumentPreview({ definition }: { definition: StandardDocumentDefinition }) {
  const html = useMemo(() => `<!doctype html><html lang="${escapeDocumentPrintHtml(definition.locale ?? 'es-MX')}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeDocumentPrintHtml(definition.title)}</title><style>*{box-sizing:border-box}body{margin:0;padding:24px;background:white}${quotationPrintTheme}</style></head><body>${buildStandardDocumentHtml(definition)}</body></html>`, [definition]);
  return <iframe sandbox="" title={definition.title} srcDoc={html} className="h-[70dvh] min-h-[520px] w-full rounded-xl border border-slate-200 bg-white" />;
}
