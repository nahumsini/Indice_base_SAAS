import type { jsPDF, TextOptionsLight } from 'jspdf';

/** jsPDF's built-in Latin fonts lack CJK glyphs; use the approved system font stack for those lines. */
export function certificateText(doc: jsPDF, text: string, x: number, y: number, options: TextOptionsLight = {}) {
  if (!/[\u2e80-\ua4cf\uac00-\ud7af\uf900-\ufaff]/u.test(text)) {
    doc.text(text, x, y, options);
    return;
  }
  const pixelsPerMm = 300 / 25.4;
  const fontPixels = doc.getFontSize() * 300 / 72;
  const maxWidth = Number(options.maxWidth) || doc.internal.pageSize.getWidth() - 40;
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Certificate rendering unavailable');
  const font = `${doc.getFont().fontStyle.includes('bold') ? '600' : '400'} ${fontPixels}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  context.font = font;
  const lines: string[] = [];
  let line = '';
  for (const character of text) {
    if (line && context.measureText(line + character).width > maxWidth * pixelsPerMm) {
      lines.push(line);
      line = '';
    }
    line += character;
  }
  if (line) lines.push(line);
  canvas.width = Math.ceil(Math.max(...lines.map(value => context.measureText(value).width)) + 4);
  canvas.height = Math.ceil(fontPixels * 1.4 * lines.length);
  context.font = font;
  context.fillStyle = doc.getTextColor();
  context.textBaseline = 'alphabetic';
  lines.forEach((value, index) => context.fillText(value, 2, fontPixels + index * fontPixels * 1.4));
  const width = canvas.width / pixelsPerMm;
  const left = options.align === 'center' ? x - width / 2 : options.align === 'right' ? x - width : x;
  doc.addImage(canvas.toDataURL('image/png'), 'PNG', left, y - fontPixels / pixelsPerMm, width, canvas.height / pixelsPerMm);
}
