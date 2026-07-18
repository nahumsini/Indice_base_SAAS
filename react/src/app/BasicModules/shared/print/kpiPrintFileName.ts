const formatPrintDateStamp = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const sanitizePrintFileNameSegment = (value: string) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[\\/:*?"<>|]+/g, ' ')
  .replace(/[^a-zA-Z0-9-]+/g, '_')
  .replace(/^_+|_+$/g, '');

export const buildKpiPrintDocumentTitle = ({
  companyName,
  documentName,
  printedAt = new Date(),
}: {
  companyName: string;
  documentName: string;
  printedAt?: Date;
}) => (
  [documentName, companyName, formatPrintDateStamp(printedAt)]
    .map(sanitizePrintFileNameSegment)
    .filter(Boolean)
    .join('_')
);
