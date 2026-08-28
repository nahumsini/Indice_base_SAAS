import { apiClient } from '../../../lib/apiClient';
import type { ProcessCollaboratorOption } from '../Processes/types';

interface AssignmentCatalogItem {
  userCompanyId: number;
  userId: number;
  name: string;
  unitId: number | null;
  unitName: string | null;
  businessId: number | null;
  businessName: string | null;
}

interface AssignmentCatalogResponse {
  items: AssignmentCatalogItem[];
  count: number;
}

function normalizeAssignmentOption(item: AssignmentCatalogItem): ProcessCollaboratorOption | null {
  const userCompanyId = Number(item.userCompanyId);
  const userId = Number(item.userId);
  const name = item.name?.trim() ?? '';

  if (!Number.isInteger(userCompanyId) || userCompanyId <= 0 || !Number.isInteger(userId) || userId <= 0 || !name) {
    return null;
  }

  return {
    userCompanyId,
    userId,
    name,
    email: null,
    unitId: item.unitId ?? null,
    unitName: item.unitName?.trim() || null,
    businessId: item.businessId ?? null,
    businessName: item.businessName?.trim() || null,
  };
}

export async function listProcessTaskAssignmentOptions() {
  const response = await apiClient<AssignmentCatalogResponse>('/api/v1/process-tasks/assignment-catalog');
  return response.items
    .map(normalizeAssignmentOption)
    .filter((option): option is ProcessCollaboratorOption => option !== null);
}
