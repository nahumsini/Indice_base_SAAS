import { humanResourcesApi } from '../../../../api/humanResources';
import type { EmployeeFormData } from '../components/CreateEmployeeModal';
import { documentTypeOrder } from '../constants/employees.constants';
import type { EmployeesTranslations } from '../translations';
import { normalizeErrorMessage } from './employees.utils';

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
