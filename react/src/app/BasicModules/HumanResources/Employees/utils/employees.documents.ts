import { humanResourcesApi } from '../../../../api/humanResources';
import type {
  EmployeeDocumentType,
  EmployeeFormData,
} from '../components/CreateEmployeeModal';
import {
  MAX_DOCUMENT_SIZE_BYTES,
  SUPPORTED_DOCUMENT_TYPES,
} from '../components/CreateEmployeeModal/model';
import { documentTypeOrder } from '../constants/employees.constants';
import type { EmployeesTranslations } from '../translations';
import { normalizeErrorMessage } from './employees.utils';

export async function uploadEmployeeDocument({
  copy,
  documentType,
  employeeId,
  file,
}: {
  copy: EmployeesTranslations;
  documentType: EmployeeDocumentType;
  employeeId: number;
  file: File;
}) {
  if (!SUPPORTED_DOCUMENT_TYPES.has(file.type)) {
    throw new Error(copy.modal.validation.documentType);
  }

  if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
    throw new Error(copy.modal.validation.documentSize);
  }

  const presign = await humanResourcesApi.presignHrUserDocumentUpload(employeeId, {
    document_type: documentType,
    file_name: file.name,
    content_type: file.type,
    size_bytes: file.size,
  });

  await humanResourcesApi.uploadHrUserDocument(
    presign.upload_url,
    file,
    file.type,
    presign.upload_headers,
  );

  await humanResourcesApi.registerHrUserDocument(employeeId, {
    document_type: documentType,
    original_filename: file.name,
    mime_type: file.type,
    size_bytes: file.size,
    object_key: presign.object_key,
  });
}

export async function syncEmployeeDocuments({
  copy,
  data,
  employeeId,
}: {
  copy: EmployeesTranslations;
  data: EmployeeFormData;
  employeeId: number;
}) {
  const documentErrors: string[] = [];

  for (const documentType of documentTypeOrder) {
    const slot = data.documents[documentType];

    if (slot.removeExisting && slot.existingId && !slot.file) {
      try {
        await humanResourcesApi.deleteHrUserDocument(employeeId, slot.existingId);
      } catch (error) {
        documentErrors.push(normalizeErrorMessage(error, copy.errorMessages.save));
      }
    }

    if (!slot.file) {
      continue;
    }

    try {
      const presign = await humanResourcesApi.presignHrUserDocumentUpload(employeeId, {
        document_type: documentType,
        file_name: slot.file.name,
        content_type: slot.file.type,
        size_bytes: slot.file.size,
      });

      await humanResourcesApi.uploadHrUserDocument(
        presign.upload_url,
        slot.file,
        slot.file.type,
        presign.upload_headers,
      );

      await humanResourcesApi.registerHrUserDocument(employeeId, {
        document_type: documentType,
        original_filename: slot.file.name,
        mime_type: slot.file.type,
        size_bytes: slot.file.size,
        object_key: presign.object_key,
      });
    } catch (error) {
      documentErrors.push(normalizeErrorMessage(error, copy.errorMessages.save));
    }
  }

  return documentErrors;
}
