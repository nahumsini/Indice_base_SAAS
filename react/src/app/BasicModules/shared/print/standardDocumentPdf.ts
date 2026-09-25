import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { buildDocumentFileName } from './documentFileName';
import { addStandardPdfFooters, applyStandardPdfMetadata } from './documentPdfEngine';
import type { DocumentPrintContract } from './documentPrintContract';
import { printStandardDocumentHtml } from './standardDocumentHtml';
import { notifyDocumentPrintFailure } from './documentPrintFeedback';
import { labelsFor, localizedConfidentiality } from './standardDocumentLabels';

export interface StandardDocumentField {
  label: string;
  value: string | number | null | undefined;
}

export interface StandardDocumentMetric extends StandardDocumentField {
  tone?: 'default' | 'positive' | 'warning' | 'negative';
}

export interface StandardDocumentSection {
  fields?: StandardDocumentField[];
  paragraphs?: string[];
  title: string;
}

export interface StandardDocumentTable {
  columns: string[];
  numericColumnIndices?: number[];
  avoidRowSplit?: boolean;
  keepTogether?: boolean;
  fontSize?: number;
  emptyMessage?: string;
  rows: Array<Array<string | number | null | undefined>>;
  title?: string;
}

export interface StandardDocumentSignature {
  caption?: string;
  label: string;
}

export interface StandardDocumentDefinition {
  accentColor?: readonly [number, number, number];
  confidentiality?: string;
  contract: DocumentPrintContract;
  fileName: {
    companyName?: string;
    documentType: string;
    identifier?: string;
    period?: string;
  };
  folio?: string;
  generatedAt?: Date;
  issuer?: string;
  logoUrl?: string;
  showIssuerMetadata?: boolean;
  continuationHeader?: string;
  locale?: string;
  metadata?: StandardDocumentField[];
  metrics?: StandardDocumentMetric[];
  notice?: string;
  recipient?: string;
  sections?: StandardDocumentSection[];
  signatures?: StandardDocumentSignature[];
  status?: string;
  subtitle?: string;
  tables?: StandardDocumentTable[];
  title: string;
}


const cleanValue = (value: string | number | null | undefined) => {
  if (value === null || value === undefined || value === '') return '-';
  return String(value);
};

const setColor = (doc: jsPDF, color: readonly [number, number, number]) => {
  doc.setTextColor(color[0], color[1], color[2]);
};

const setFillColor = (doc: jsPDF, color: readonly [number, number, number]) => {
  doc.setFillColor(color[0], color[1], color[2]);
};

const toneColor = (tone: StandardDocumentMetric['tone']): readonly [number, number, number] => {
  if (tone === 'positive') return [20, 117, 20];
  if (tone === 'warning') return [180, 83, 9];
  if (tone === 'negative') return [185, 28, 28];
  return [37, 99, 235];
};

export const buildStandardDocumentPdf = (definition: StandardDocumentDefinition) => {
  const locale = definition.locale ?? 'es-MX';
  const labels = labelsFor(locale);
  const generatedAt = definition.generatedAt ?? new Date();
  const accent = definition.accentColor ?? [37, 99, 235] as const;
  const isLandscape = definition.contract.orientation === 'landscape';
  const format = definition.contract.pageSize === 'letter' ? 'letter' : 'a4';
  const doc = new jsPDF({
    format,
    orientation: isLandscape ? 'landscape' : 'portrait',
    unit: 'mm',
  });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  const footerTop = pageHeight - 22;
  let y = 17;

  applyStandardPdfMetadata(doc, {
    author: definition.issuer,
    subject: definition.subtitle || definition.title,
    title: definition.title,
  });

  const ensureRoom = (height: number) => {
    if (y + height <= footerTop) return;
    doc.addPage();
    y = definition.continuationHeader ? 30 : 18;
  };

  const writeSectionTitle = (title: string) => {
    ensureRoom(14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    setColor(doc, [36, 39, 44]);
    doc.text(title, margin, y);
    doc.setDrawColor(217, 221, 227);
    doc.setLineWidth(0.25);
    doc.line(margin, y + 3, pageWidth - margin, y + 3);
    y += 9;
  };

  const titleX = margin + 8;
  const titleMaxWidth = contentWidth * 0.62;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  setColor(doc, [92, 100, 112]);
  if (definition.issuer) {
    doc.text(definition.issuer, titleX, y + 3.8, { maxWidth: contentWidth * 0.58 });
  }
  doc.setFontSize(18);
  const titleLines = doc.splitTextToSize(definition.title, titleMaxWidth) as string[];
  const titleLineHeight = 6.4;
  const titleStartY = y + 11;
  const titleBottom = titleStartY + Math.max(0, titleLines.length - 1) * titleLineHeight;
  const subtitleY = titleBottom + 5;
  const headerHeight = Math.max(19, (definition.subtitle ? subtitleY + 2 : titleBottom + 3) - y);
  setFillColor(doc, accent);
  doc.roundedRect(margin, y, 4, headerHeight, 1.5, 1.5, 'F');
  setColor(doc, [32, 37, 45]);
  doc.text(titleLines, titleX, titleStartY, { lineHeightFactor: 1, maxWidth: titleMaxWidth });
  if (definition.subtitle) {
    doc.setFontSize(8.5);
    setColor(doc, [92, 100, 112]);
    doc.text(definition.subtitle, titleX, subtitleY, { maxWidth: contentWidth * 0.65 });
  }
  const rightMeta = [definition.folio, definition.status].filter(Boolean).join(' · ');
  doc.setFontSize(8.5);
  setColor(doc, [74, 82, 94]);
  if (rightMeta) doc.text(rightMeta, pageWidth - margin, y + 5, { align: 'right', maxWidth: contentWidth * 0.3 });
  doc.setFontSize(7.5);
  doc.text(
    `${labels.generated}: ${new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(generatedAt)}`,
    pageWidth - margin,
    y + 12,
    { align: 'right', maxWidth: contentWidth * 0.3 },
  );
  y += headerHeight + 8;

  const primaryMetadata: StandardDocumentField[] = [
    definition.issuer && definition.showIssuerMetadata !== false ? { label: labels.issuer, value: definition.issuer } : null,
    definition.recipient ? { label: labels.recipient, value: definition.recipient } : null,
    definition.status ? { label: labels.status, value: definition.status } : null,
    ...(definition.metadata ?? []),
  ].filter((field): field is StandardDocumentField => Boolean(field));

  if (primaryMetadata.length > 0) {
    const columns = isLandscape ? 4 : 3;
    const gap = 3;
    const cellWidth = (contentWidth - gap * (columns - 1)) / columns;
    const rows = Math.ceil(primaryMetadata.length / columns);
    ensureRoom(rows * 16 + 3);
    primaryMetadata.forEach((field, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const x = margin + column * (cellWidth + gap);
      const top = y + row * 16;
      doc.setFillColor(247, 248, 250);
      doc.setDrawColor(229, 232, 236);
      doc.roundedRect(x, top, cellWidth, 13, 1.5, 1.5, 'FD');
      doc.setFontSize(6.8);
      setColor(doc, [108, 114, 122]);
      doc.text(field.label, x + 3, top + 4);
      doc.setFontSize(8.5);
      setColor(doc, [36, 39, 44]);
      doc.text(cleanValue(field.value), x + 3, top + 9.5, { maxWidth: cellWidth - 6 });
    });
    y += rows * 16 + 1;
  }

  if (definition.metrics?.length) {
    const metrics = definition.metrics.slice(0, 6);
    const gap = 3;
    const cellWidth = (contentWidth - gap * (metrics.length - 1)) / metrics.length;
    ensureRoom(21);
    metrics.forEach((metric, index) => {
      const x = margin + index * (cellWidth + gap);
      doc.setFillColor(250, 251, 252);
      doc.setDrawColor(226, 230, 235);
      doc.roundedRect(x, y, cellWidth, 18, 1.8, 1.8, 'FD');
      doc.setFontSize(6.5);
      setColor(doc, [103, 110, 121]);
      doc.text(metric.label, x + 3, y + 5, { maxWidth: cellWidth - 6 });
      doc.setFontSize(metrics.length > 4 ? 10.5 : 12);
      setColor(doc, toneColor(metric.tone));
      doc.text(cleanValue(metric.value), x + 3, y + 13, { maxWidth: cellWidth - 6 });
    });
    y += 24;
  }

  definition.sections?.forEach((section) => {
    writeSectionTitle(section.title);
    if (section.fields?.length) {
      const columns = isLandscape ? 3 : 2;
      const cellWidth = contentWidth / columns;
      section.fields.forEach((field, index) => {
        const column = index % columns;
        if (column === 0) ensureRoom(8);
        const x = margin + column * cellWidth;
        doc.setFontSize(7.2);
        setColor(doc, [105, 112, 123]);
        doc.text(field.label, x, y);
        doc.setFontSize(9);
        setColor(doc, [36, 39, 44]);
        doc.text(cleanValue(field.value), x + Math.min(34, cellWidth * 0.38), y, { maxWidth: cellWidth * 0.58 });
        if (column === columns - 1 || index === section.fields.length - 1) y += 7;
      });
      y += 2;
    }
    section.paragraphs?.filter(Boolean).forEach((paragraph) => {
      const lines = doc.splitTextToSize(paragraph, contentWidth) as string[];
      ensureRoom(lines.length * 4.5 + 3);
      doc.setFontSize(8.5);
      setColor(doc, [60, 65, 73]);
      doc.text(lines, margin, y, { lineHeightFactor: 1.35 });
      y += lines.length * 4.5 + 3;
    });
  });

  definition.tables?.forEach((table) => {
    if (table.keepTogether) ensureRoom(24 + table.rows.length * 11);
    if (table.title) writeSectionTitle(table.title);
    const rows = table.rows.length > 0
      ? table.rows.map((row) => row.map(cleanValue))
      : [[table.emptyMessage || labels.noData, ...table.columns.slice(1).map(() => '')]];
    autoTable(doc, {
      body: rows,
      head: [table.columns],
      margin: { ...(definition.continuationHeader ? { top: 26 } : {}), bottom: 24, left: margin, right: margin },
      startY: y,
      rowPageBreak: table.avoidRowSplit ? 'avoid' : 'auto',
      columnStyles: Object.fromEntries((table.numericColumnIndices ?? []).map(index => [index, { halign: 'right' as const }])),
      styles: {
        cellPadding: 2.4,
        font: 'helvetica',
        fontSize: table.fontSize ?? 7.4,
        lineColor: [228, 231, 235],
        lineWidth: 0.15,
        overflow: 'linebreak',
        textColor: [55, 61, 70],
        valign: 'middle',
      },
      headStyles: {
        fillColor: [242, 244, 247],
        fontStyle: 'normal',
        textColor: [69, 76, 87],
      },
      alternateRowStyles: { fillColor: [250, 251, 252] },
      didDrawPage: () => {
        if (!definition.continuationHeader || doc.getCurrentPageInfo().pageNumber === 1) return;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        setColor(doc, [74, 82, 94]);
        doc.text(definition.continuationHeader, margin, 16, { maxWidth: contentWidth });
      },
    });
    y = ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y) + 8;
  });

  if (definition.notice) {
    const noticeLines = doc.splitTextToSize(definition.notice, contentWidth - 8) as string[];
    ensureRoom(noticeLines.length * 4.2 + 10);
    doc.setFillColor(255, 249, 235);
    doc.setDrawColor(235, 196, 112);
    doc.roundedRect(margin, y, contentWidth, noticeLines.length * 4.2 + 7, 1.5, 1.5, 'FD');
    doc.setFontSize(7.8);
    setColor(doc, [111, 75, 20]);
    doc.text(noticeLines, margin + 4, y + 5, { lineHeightFactor: 1.25 });
    y += noticeLines.length * 4.2 + 12;
  }

  if (definition.signatures?.length) {
    ensureRoom(35);
    const signatures = definition.signatures.slice(0, 3);
    const gap = 10;
    const width = (contentWidth - gap * (signatures.length - 1)) / signatures.length;
    signatures.forEach((signature, index) => {
      const x = margin + index * (width + gap);
      doc.setDrawColor(135, 141, 150);
      doc.line(x, y + 20, x + width, y + 20);
      doc.setFontSize(8);
      setColor(doc, [46, 51, 59]);
      doc.text(signature.label, x + width / 2, y + 25, { align: 'center', maxWidth: width });
      if (signature.caption) {
        doc.setFontSize(6.8);
        setColor(doc, [103, 110, 120]);
        doc.text(signature.caption, x + width / 2, y + 29, { align: 'center', maxWidth: width });
      }
    });
  }

  addStandardPdfFooters(doc, {
    confidentiality: localizedConfidentiality(definition.confidentiality, labels),
    folio: definition.folio,
    locale,
    updatedAt: generatedAt,
    version: definition.contract.version,
  });
  return doc;
};

export const printStandardDocumentPdf = (definition: StandardDocumentDefinition) => {
  return printStandardDocumentHtml(definition);
};

export const downloadStandardDocumentPdf = (definition: StandardDocumentDefinition) => {
  try {
    const fileName = buildDocumentFileName({ ...definition.fileName, extension: 'pdf' });
    return printStandardDocumentHtml(definition) ? fileName : null;
  } catch (error) {
    console.error('Unable to download standard print document.', error);
    notifyDocumentPrintFailure(definition.locale ?? 'es-MX', 'generation');
    return null;
  }
};
