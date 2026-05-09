import { authApi } from '../../api/auth';
import { configCenterApi, type ConfigCenterCurrentUser } from '../../api/configCenter';

export const USER_PROFILE_UPDATED_EVENT = 'indice:user-profile-updated';

export const getReportUserDisplayName = (user: ConfigCenterCurrentUser) => (
  [
    user.primer_nombre || user.nombres,
    user.apellido_paterno || user.apellidos,
  ]
    .filter(Boolean)
    .join(' ')
    .trim() || user.email || ''
);

const sanitizeFileNameSegment = (value: string) => (
  value
    .replace(/[\\/:*?"<>|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
);

export const buildReportFileName = (baseFileName: string, userName: string) => {
  const baseName = sanitizeFileNameSegment(baseFileName.replace(/\.pdf$/i, '')) || sanitizeFileNameSegment(baseFileName);
  const cleanUserName = sanitizeFileNameSegment(userName);

  return `${baseName}${cleanUserName ? ` ${cleanUserName}` : ''}.pdf`;
};

export const loadReportUserDisplayName = async () => {
  try {
    const user = await configCenterApi.getCurrentUser();
    return getReportUserDisplayName(user);
  } catch {
    try {
      const session = await authApi.getSessionOrNull();
      return session?.user?.name?.trim() ?? '';
    } catch {
      return '';
    }
  }
};
