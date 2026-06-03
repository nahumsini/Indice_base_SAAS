import {
  useCallback,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import type { EmployeeModalTranslations } from '../../../translations/types';
import {
  MAX_DOCUMENT_SIZE_BYTES,
  SUPPORTED_DOCUMENT_TYPES,
  toggleDocumentSlotRemoval,
} from '../model';
import type {
  EmployeeDocumentSlot,
  EmployeeDocumentType,
  EmployeeFormData,
} from '../types';

interface UseEmployeeModalDocumentsParams {
  copy: EmployeeModalTranslations;
  setFormData: Dispatch<SetStateAction<EmployeeFormData>>;
}

export function useEmployeeModalDocuments({
  copy,
  setFormData,
}: UseEmployeeModalDocumentsParams) {
  const [documentErrors, setDocumentErrors] = useState<Partial<Record<EmployeeDocumentType, string>>>({});

  const resetDocumentErrors = useCallback(() => {
    setDocumentErrors({});
  }, []);

  const updateDocumentSlot = useCallback((
    documentType: EmployeeDocumentType,
    updater: (slot: EmployeeDocumentSlot) => EmployeeDocumentSlot,
  ) => {
    setFormData((current) => ({
      ...current,
      documents: {
        ...current.documents,
        [documentType]: updater(current.documents[documentType]),
      },
    }));
  }, [setFormData]);

  const handleDocumentSelection = (documentType: EmployeeDocumentType, file: File | null) => {
    if (!file) {
      updateDocumentSlot(documentType, (slot) => ({ ...slot, file: null }));
      setDocumentErrors((current) => ({ ...current, [documentType]: undefined }));
      return;
    }

    const normalizedType = file.type.toLowerCase();
    if (!SUPPORTED_DOCUMENT_TYPES.has(normalizedType)) {
      setDocumentErrors((current) => ({ ...current, [documentType]: copy.validation.documentType }));
      return;
    }

    if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
      setDocumentErrors((current) => ({ ...current, [documentType]: copy.validation.documentSize }));
      return;
    }

    setDocumentErrors((current) => ({ ...current, [documentType]: undefined }));
    updateDocumentSlot(documentType, (slot) => ({
      ...slot,
      file,
      removeExisting: false,
    }));
  };

  const handleToggleDocumentRemoval = (documentType: EmployeeDocumentType) => {
    updateDocumentSlot(documentType, toggleDocumentSlotRemoval);
  };

  return {
    documentErrors,
    handleDocumentSelection,
    handleToggleDocumentRemoval,
    resetDocumentErrors,
  };
}
