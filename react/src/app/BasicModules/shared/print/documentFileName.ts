const formatDateStamp = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
export const sanitizeDocumentFileNameSegment = (value: string) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[\\/:*?"<>|]+/g, ' ')
  .replace(/[^a-zA-Z0-9-]+/g, '_')
  .replace(/^_+|_+$/g, '');

export const buildDocumentFileName = ({
  companyName = '',
  documentType,
  extension = 'pdf',
  identifier = '',
  period = '',
  printedAt = new Date(),
}: {
  companyName?: string;
  documentType: string;
  extension?: string;
  identifier?: string;
  period?: string;
  printedAt?: Date;
}) => {
  const stableReference = identifier || period || formatDateStamp(printedAt);
  const parts = identifier
    ? [documentType, identifier, period]
    : [documentType, companyName, stableReference];
  const baseName = parts
    .map(sanitizeDocumentFileNameSegment)
    .filter(Boolean)
    .join('_') || 'document';
  const safeExtension = sanitizeDocumentFileNameSegment(extension.replace(/^\./, '')) || 'pdf';
  return `${baseName}.${safeExtension.toLowerCase()}`;
};
