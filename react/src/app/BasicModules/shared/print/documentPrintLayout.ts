import type { DocumentPageSize } from './documentPrintContract';
import { applyDocumentGrayscale } from './documentGrayscale';

/** Applies only to the isolated output document, never the application or IME. */
export function prepareDocumentPrintLayout(document: Document, pageSize: DocumentPageSize = 'a4') {
  const body = document.body;
  if (!body) return;
  applyDocumentGrayscale(body);
  if (pageSize === '58mm' || pageSize === '80mm') return;

  const mm = 96 / 25.4;
  const paper = pageSize === 'letter' ? [215.9, 279.4] : [210, 297];
  const margin = 10;
  const portraitWidth = (paper[0] - margin * 2) * mm;
  body.style.width = `${portraitWidth}px`;
  body.style.maxWidth = 'none';
  body.style.margin = '0';
  body.style.padding = '0';

  // Measure the real table headers and cells at readable size before choosing landscape.
  // Content may wrap; only a table's minimum readable width can trigger rotation.
  const tables = Array.from(body.querySelectorAll('table'));
  let widestTable = 0;
  for (const table of tables) {
    const probe = table.cloneNode(true) as HTMLTableElement;
    probe.style.cssText = 'position:absolute;visibility:hidden;table-layout:auto!important;width:min-content!important;min-width:0!important;max-width:none!important';
    probe.querySelectorAll<HTMLElement>('th,td').forEach(cell => {
      cell.style.setProperty('white-space', 'normal', 'important');
      cell.style.setProperty('overflow-wrap', 'normal', 'important');
      cell.style.setProperty('word-break', 'normal', 'important');
      cell.style.setProperty('width', 'auto', 'important');
    });
    table.parentElement?.appendChild(probe);
    widestTable = Math.max(widestTable, probe.getBoundingClientRect().width);
    probe.remove();
  }
  const orientation = widestTable > portraitWidth + 1 ? 'landscape' : 'portrait';
  const width = (paper[orientation === 'portrait' ? 0 : 1] - margin * 2) * mm;
  const height = (paper[orientation === 'portrait' ? 1 : 0] - margin * 2) * mm;
  body.style.width = `${width}px`;
  body.dataset.printOrientation = orientation;
  const rules = document.createElement('style');
  rules.dataset.documentPageRules = 'true';
  rules.textContent = `@page { size: ${pageSize} ${orientation}; margin: ${margin}mm; } @media print { html,body { width:auto!important; max-width:none!important; padding:0!important; margin:0!important; } }`;
  document.head.appendChild(rules);

  // Reduce spacing, never font size or content, when that can save a second sheet.
  const content = body.querySelector<HTMLElement>('[data-document-content]') ?? body;
  if (content.getBoundingClientRect().height > height) {
    body.dataset.printDensity = 'compact';
    if (content.getBoundingClientRect().height > height) delete body.dataset.printDensity;
  }

  // An individually oversized paragraph/row has to flow across sheets; never clip it.
  body.querySelectorAll<HTMLElement>('p, li, tr, .document-field, .document-signature, .document-totals').forEach(block => {
    if (block.getBoundingClientRect().height > height) block.dataset.printOversized = 'true';
  });
}
