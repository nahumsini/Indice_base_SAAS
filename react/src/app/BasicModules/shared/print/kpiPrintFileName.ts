import { buildDocumentFileName } from './documentFileName';

export const buildKpiPrintDocumentTitle = ({
  companyName,
  documentName,
  printedAt = new Date(),
}: {
  companyName: string;
  documentName: string;
  printedAt?: Date;
}) => (
  buildDocumentFileName({
    companyName,
    documentType: documentName,
    extension: 'pdf',
    printedAt,
  }).replace(/\.pdf$/i, '')
);
