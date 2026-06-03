import type { EmployeeModalTranslations } from '../../../translations/types';
import type { EmployeeDocumentSlot, EmployeeDocumentType } from '../types';
import { DocumentUploadList } from './DocumentUploadList';
import { DocumentsStep } from './DocumentsStep';

interface DocumentsStepFieldsProps {
  copy: EmployeeModalTranslations;
  documentErrors: Partial<Record<EmployeeDocumentType, string>>;
  documents: Record<EmployeeDocumentType, EmployeeDocumentSlot>;
  onDocumentSelection: (documentType: EmployeeDocumentType, file: File | null) => void;
  onToggleDocumentRemoval: (documentType: EmployeeDocumentType) => void;
}

export function DocumentsStepFields({
  copy,
  documentErrors,
  documents,
  onDocumentSelection,
  onToggleDocumentRemoval,
}: DocumentsStepFieldsProps) {
  return (
    <DocumentsStep
      title={copy.sections.documents}
      description={copy.helpers.documents}
      documents={(
        <DocumentUploadList
          copy={copy}
          documentErrors={documentErrors}
          documents={documents}
          onDocumentSelection={onDocumentSelection}
          onToggleDocumentRemoval={onToggleDocumentRemoval}
        />
      )}
    />
  );
}
