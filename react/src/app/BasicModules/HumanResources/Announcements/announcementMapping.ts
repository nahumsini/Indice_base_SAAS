import type {
  AnnouncementAudienceDepartmentOption as BackendDepartmentOption,
  AnnouncementAudienceEmployeeOption as BackendEmployeeOption,
  AnnouncementAudienceUnitOption as BackendUnitOption,
  AnnouncementListItem,
  BackendHrUser,
  CreateAnnouncementPayload,
} from '../../../api/humanResources';
import type {
  AnnouncementDepartmentOption,
  AnnouncementDisplayStatus,
  AnnouncementDisplayType,
  AnnouncementEmployeeOption,
  AnnouncementUnitOption,
  AnnouncementView,
  CreateAnnouncementFormData,
} from './announcementTypes';
import type { AnnouncementsTranslations } from './translations';

type AnnouncementViewCopy = AnnouncementsTranslations['view'];

const typeMap: Record<AnnouncementListItem['type'], AnnouncementDisplayType> = {
  celebration: 'Celebracion',
  general: 'General',
  reminder: 'Recordatorio',
  urgent: 'Urgente',
};

const statusMap: Record<AnnouncementListItem['status'], AnnouncementDisplayStatus> = {
  draft: 'Borrador',
  published: 'Publicado',
  scheduled: 'Programado',
};

export function toAnnouncementView(item: AnnouncementListItem, locale: string, copy: AnnouncementViewCopy): AnnouncementView {
  const effectiveDate = item.scheduled_for || item.published_at || item.created_at || '';
  const { date, time } = formatDateTime(effectiveDate, locale, copy);

  return {
    id: String(item.id),
    backendId: item.id,
    title: item.title,
    type: typeMap[item.type],
    status: statusMap[item.status],
    audienceType: item.audience_type,
    audienceSummary: item.audience_summary,
    publicationDate: date,
    publicationTime: time,
    authorName: item.author_name,
    content: item.content,
    preview: item.content,
    readSummary: readSummary(item, copy),
    attachments: item.attachments ?? [],
    attachmentCount: item.attachment_count ?? item.attachments?.length ?? 0,
    deliveryCount: item.delivery_count ?? 0,
    readCount: item.read_count ?? 0,
    isRead: Boolean(item.is_read),
    readAt: item.read_at,
    editData: toAnnouncementFormData(item),
  };
}

export function toAnnouncementEmployeeOption(employee: BackendHrUser): AnnouncementEmployeeOption | null {
  const id = employee.user_company_id ?? employee.id;
  if (!id || employee.status !== 'active') {
    return null;
  }

  return {
    id,
    name: employee.full_name,
    position: employee.position_title || employee.position || employee.department || 'No position',
    unit: employee.unit_id ?? 0,
    unitName: employee.unit_name || undefined,
    department: employee.department || undefined,
  };
}

export function toAnnouncementAudienceEmployeeOption(
  employee: BackendEmployeeOption,
  copy: AnnouncementViewCopy,
): AnnouncementEmployeeOption | null {
  if (!employee.id) {
    return null;
  }

  return {
    id: employee.id,
    name: employee.name || copy.unnamedUser,
    position: employee.position || employee.department || copy.noPosition,
    unit: employee.unit_id ?? 0,
    unitName: employee.unit_name || undefined,
    department: employee.department || undefined,
  };
}

export function toAnnouncementDepartmentOption(option: BackendDepartmentOption): AnnouncementDepartmentOption {
  return {
    name: option.name,
    activeUserCount: option.active_user_count,
    isAvailable: option.is_available,
  };
}

export function toAnnouncementUnitOption(
  option: BackendUnitOption,
  copy: AnnouncementViewCopy,
): AnnouncementUnitOption {
  return {
    id: String(option.id),
    name: option.name || copy.unitLabel(option.id),
    activeUserCount: option.active_user_count,
    isAvailable: option.is_available,
  };
}

export function buildCreateAnnouncementPayload(data: CreateAnnouncementFormData): CreateAnnouncementPayload {
  const scheduledFor = data.status === 'scheduled'
    ? `${data.scheduledDate}T${data.scheduledTime}:00`
    : undefined;
  const payload: CreateAnnouncementPayload = {
    title: data.title,
    type: data.type,
    content: data.content,
    audience_type: data.audienceType,
    status: data.status,
    scheduled_for: scheduledFor,
  };

  if (data.audienceType === 'units') {
    payload.unit_ids = data.unitIds;
  } else if (data.audienceType === 'departments') {
    payload.department_names = data.departmentNames;
  } else if (data.audienceType === 'employees') {
    payload.user_company_ids = data.employeeIds;
  }

  return payload;
}

export function toAnnouncementFormData(item: AnnouncementListItem): CreateAnnouncementFormData {
  return {
    title: item.title,
    type: item.type,
    audienceType: item.audience_type,
    unitIds: targetValues(item, 'unit'),
    departmentNames: targetValues(item, 'department'),
    employeeIds: targetValues(item, 'employee').map((value) => Number(value)).filter((value) => Number.isFinite(value)),
    content: item.content,
    status: item.status,
    scheduledDate: datePart(item.scheduled_for),
    scheduledTime: timePart(item.scheduled_for),
  };
}

function readSummary(item: AnnouncementListItem, copy: AnnouncementViewCopy) {
  const readCount = item.read_count ?? 0;
  const deliveryCount = item.delivery_count ?? 0;
  if (deliveryCount > 0) {
    return copy.readRatio(readCount, deliveryCount);
  }
  return item.is_read ? copy.read : copy.unread;
}

function targetValues(item: AnnouncementListItem, targetType: 'unit' | 'department' | 'employee') {
  return (item.targets ?? [])
    .filter((target) => target.target_type === targetType)
    .map((target) => target.target_value);
}

function datePart(value?: string | null) {
  return value ? value.slice(0, 10) : '';
}

function timePart(value?: string | null) {
  return value ? value.slice(11, 16) : '';
}

function formatDateTime(value: string, locale: string, copy: AnnouncementViewCopy) {
  const parsed = new Date(value);
  if (!value || Number.isNaN(parsed.getTime())) {
    return { date: copy.noDate, time: copy.noTime };
  }

  return {
    date: new Intl.DateTimeFormat(locale, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(parsed),
    time: new Intl.DateTimeFormat(locale, {
      hour: '2-digit',
      minute: '2-digit',
    }).format(parsed),
  };
}
