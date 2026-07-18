export const taskKioskMaxEvidenceSizeBytes = 10 * 1024 * 1024;
export const taskKioskMaxEvidenceFiles = 5;

export const taskKioskAcceptedEvidenceTypes = new Set([
  'application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp',
  'image/heic', 'image/heif', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv', 'text/plain',
]);

function contentTypeFromName(fileName: string) {
  const lowerName = fileName.toLowerCase();
  if (lowerName.endsWith('.pdf')) return 'application/pdf';
  if (lowerName.endsWith('.png')) return 'image/png';
  if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg') || lowerName.endsWith('.jfif')) return 'image/jpeg';
  if (lowerName.endsWith('.gif')) return 'image/gif';
  if (lowerName.endsWith('.webp')) return 'image/webp';
  if (lowerName.endsWith('.heic')) return 'image/heic';
  if (lowerName.endsWith('.heif')) return 'image/heif';
  if (lowerName.endsWith('.doc')) return 'application/msword';
  if (lowerName.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (lowerName.endsWith('.xls')) return 'application/vnd.ms-excel';
  if (lowerName.endsWith('.xlsx')) return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  if (lowerName.endsWith('.csv')) return 'text/csv';
  if (lowerName.endsWith('.txt')) return 'text/plain';
  return '';
}

export function normalizedTaskKioskEvidenceContentType(file: File) {
  const browserType = file.type.trim().toLowerCase();
  const normalizedBrowserType = browserType === 'image/jpg' || browserType === 'image/pjpeg'
    ? 'image/jpeg'
    : browserType;
  return taskKioskAcceptedEvidenceTypes.has(normalizedBrowserType)
    ? normalizedBrowserType
    : contentTypeFromName(file.name);
}

export function taskKioskFilesFromInput(files: FileList | null) {
  return Array.from(files ?? []).slice(0, taskKioskMaxEvidenceFiles);
}
