import { Trash2, Upload } from 'lucide-react';
import { Button } from '../../../../../../components/ui/button';
import { cn } from '../../../../../../components/ui/utils';
import type { EmployeeModalTranslations } from '../../../translations/types';
import { HelperText } from '../components/HelperText';
import { DOCUMENT_TYPES } from '../model';
import type { EmployeeDocumentType, EmployeeFormData } from '../model';

interface DocumentUploadListProps {
  copy: EmployeeModalTranslations;
  documentErrors: Partial<Record<EmployeeDocumentType, string>>;
  documents: EmployeeFormData['documents'];
  onDocumentSelection: (documentType: EmployeeDocumentType, file: File | null) => void;
  onToggleDocumentRemoval: (documentType: EmployeeDocumentType) => void;
}

export function DocumentUploadList({
  copy,
  documentErrors,
  documents,
  onDocumentSelection,
  onToggleDocumentRemoval,
}: DocumentUploadListProps) {
  return (
    <>
      {DOCUMENT_TYPES.map((documentType) => {
        const slot = documents[documentType];
        const hasCurrentDocument = Boolean(slot.existingId && !slot.removeExisting);
        const isUploaded = Boolean(slot.file || hasCurrentDocument);
        const fileLabel = slot.file?.name ?? slot.existingFileName ?? copy.placeholders.noFile;

        return (
          <div
            key={documentType}
            className="rounded-[22px] border border-slate-200 bg-slate-50/60 p-4 transition-colors hover:border-[#59C3A5]/25 hover:bg-white dark:border-slate-700 dark:bg-slate-900/50 dark:hover:border-blue-500/30 dark:hover:bg-slate-900"
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {copy.documents[documentType]}
                  </p>
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-xs font-medium',
                      isUploaded
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
                    )}
                  >
                    {isUploaded ? copy.placeholders.fileUploaded : copy.placeholders.noFile}
                  </span>
                </div>
                <HelperText>{fileLabel}</HelperText>
                {slot.removeExisting && !slot.file ? (
                  <HelperText tone="warning">{copy.helpers.documentRemoved}</HelperText>
                ) : null}
                {documentErrors[documentType] ? (
                  <HelperText tone="error">{documentErrors[documentType]}</HelperText>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {hasCurrentDocument && slot.existingDownloadUrl ? (
                  <a
                    href={slot.existingDownloadUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-[#59C3A5] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    {copy.buttons.viewCurrent}
                  </a>
                ) : null}
                {slot.existingId ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 rounded-xl border-slate-200 bg-white text-slate-700 shadow-none hover:bg-red-50 hover:text-red-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-red-950/30 dark:hover:text-red-300"
                    onClick={() => onToggleDocumentRemoval(documentType)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {slot.removeExisting ? copy.buttons.undoRemove : copy.buttons.removeCurrent}
                  </Button>
                ) : null}
                <label className="inline-flex h-10 cursor-pointer items-center rounded-xl bg-[#59C3A5] px-3 text-sm font-medium text-slate-950 shadow-sm transition-colors hover:bg-[#3AAE90] dark:bg-blue-600 dark:text-white dark:hover:bg-blue-500">
                  <Upload className="mr-2 h-4 w-4" />
                  {slot.existingId || slot.file ? copy.buttons.replaceFile : copy.buttons.chooseFile}
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,image/jpeg,image/png,image/webp"
                    onChange={(event) => onDocumentSelection(documentType, event.target.files?.[0] ?? null)}
                  />
                </label>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}
