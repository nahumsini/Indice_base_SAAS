import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { StandardDocumentDefinition } from './standardDocumentPdf';
import { buildStandardDocumentHtml } from './standardDocumentHtml';
import { escapeDocumentPrintHtml } from './documentHtmlPrintEngine';
import { quotationPrintTheme } from './quotationPrintTheme';
import { prepareDocumentPrintLayout } from './documentPrintLayout';

/** Isolated styles: a print preview cannot restyle the application or protected IME. */
export function StandardDocumentPreview({ definition, className, paperPreview = false, zoom }: {
  definition: StandardDocumentDefinition;
  className?: string;
  /** Opt-in to the same measured paper width/density used by browser output. No scripts are allowed. */
  paperPreview?: boolean;
  /** Undefined fits the paper to the available width. */
  zoom?: number;
}) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const html = useMemo(() => `<!doctype html><html lang="${escapeDocumentPrintHtml(definition.locale ?? 'es-MX')}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeDocumentPrintHtml(definition.title)}</title><style>*{box-sizing:border-box}body{margin:0;padding:24px;background:white}${quotationPrintTheme}</style></head><body><div data-document-content>${buildStandardDocumentHtml(definition)}</div></body></html>`, [definition]);
  const fit = useCallback(() => {
    const frame = frameRef.current;
    const doc = frame?.contentDocument;
    if (!paperPreview || !frame || !doc?.body.dataset.printOrientation) return;
    const paperWidth = parseFloat(doc.body.style.width) + 20 * 96 / 25.4;
    const scale = zoom ?? Math.min(1, Math.max(0.25, (frame.clientWidth - 24) / paperWidth));
    doc.documentElement.style.zoom = String(scale);
  }, [paperPreview, zoom]);
  useEffect(() => {
    if (!paperPreview || !frameRef.current) return;
    const observer = new ResizeObserver(fit);
    observer.observe(frameRef.current);
    fit();
    return () => observer.disconnect();
  }, [fit, paperPreview]);
  const prepare = async () => {
    const doc = frameRef.current?.contentDocument;
    if (!paperPreview || !doc) return;
    await Promise.race([Promise.all([doc.fonts?.ready, ...Array.from(doc.images).map(image => image.complete ? Promise.resolve() : new Promise<void>(resolve => {
      image.addEventListener('load', () => resolve(), { once: true });
      image.addEventListener('error', () => resolve(), { once: true });
    }))]), new Promise(resolve => setTimeout(resolve, 5000))]);
    if (doc !== frameRef.current?.contentDocument) return;
    // Match browser output: failed logos leave the issuer text, never a broken-image icon.
    Array.from(doc.images).filter(image => image.complete && image.naturalWidth === 0)
      .forEach(image => { image.style.display = 'none'; });
    prepareDocumentPrintLayout(doc, definition.contract.pageSize);
    doc.body.style.margin = '10mm auto';
    doc.body.style.padding = '10mm';
    doc.body.style.boxSizing = 'content-box';
    doc.body.style.boxShadow = '0 2px 12px #00000012';
    doc.documentElement.style.background = '#eeeeee';
    fit();
  };
  return <iframe ref={frameRef} sandbox={paperPreview ? 'allow-same-origin' : ''} title={definition.title} srcDoc={html}
    onLoad={prepare} className={className ?? 'h-[70dvh] min-h-[520px] w-full rounded-xl border border-slate-200 bg-white'} />;
}
