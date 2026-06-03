import { humanResourcesApi } from '../../../../api/humanResources';
import type { EmployeeFormData } from '../components/CreateEmployeeModal';
import {
  buildHireScheduleTemplatePayload,
  normalizeScheduleTemplatePayload,
  payloadFromAttendanceTemplate,
} from './employees.utils';

export async function assignHireSchedule(employeeId: number, data: EmployeeFormData) {
  const payload = buildHireScheduleTemplatePayload(data);
  const normalizedPayload = normalizeScheduleTemplatePayload(payload);
  const latestTemplatesResponse = await humanResourcesApi.listAttendanceControlTemplates();
  const latestTemplates = latestTemplatesResponse.items;
  const reusableTemplate = latestTemplates.find((template) =>
    template.status !== 'inactive' &&
    normalizedPayload === normalizeScheduleTemplatePayload(payloadFromAttendanceTemplate(template)),
  ) ?? null;

  let templateId = reusableTemplate?.id ?? null;
  if (!templateId) {
    const templateName = latestTemplates.some((template) => template.name === payload.name)
      ? `${payload.name} ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`
      : payload.name;
    const response = await humanResourcesApi.createAttendanceControlTemplate({
      ...payload,
      name: templateName,
    });
    templateId = response.template.id;
  }

  await humanResourcesApi.bulkAssignAttendanceSchedule({
    user_company_ids: [employeeId],
    template_id: templateId,
    effective_start_date: data.scheduleStartDate || data.hireDate,
    effective_end_date: data.scheduleEndDate || data.scheduleStartDate || data.hireDate,
  });
}
