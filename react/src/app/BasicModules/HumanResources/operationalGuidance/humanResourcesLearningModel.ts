import type {
  AttendanceAccessProfile,
  AttendanceControlAssignment,
} from '../../../api/humanResources';
import type { EmployeeViewModel } from '../Employees/types/employees.types';
import type { HumanResourcesGuidanceTabId } from './types';

const requiredEmployeeDocumentTypes = [
  'birth_certificate',
  'government_id',
  'proof_of_address',
  'resume',
  'profile_photo',
] as const;

export const humanResourcesLearningJourneyOrder: readonly HumanResourcesGuidanceTabId[] = [
  'collaborators',
  'control',
  'attendance',
  'permissions',
  'payroll',
  'announcements',
  'assets',
  'records',
  'incentives',
  'kpis',
] as const;

export type EmployeeLearningRequirementId =
  | 'identity'
  | 'contact'
  | 'organization'
  | 'compensation'
  | 'contract'
  | 'schedule'
  | 'location'
  | 'documents'
  | 'access';

export type EmployeeLearningExemptibleRequirementId = Extract<
  EmployeeLearningRequirementId,
  'schedule' | 'location' | 'documents' | 'access'
>;

export interface EmployeeLearningException {
  reason: string;
  updatedAt: string;
}

export type EmployeeLearningExceptions = Partial<
  Record<EmployeeLearningExemptibleRequirementId, EmployeeLearningException>
>;

export interface EmployeeLearningCandidate {
  id: number;
  name: string;
  status: EmployeeViewModel['status'];
  completedRequirementIds: EmployeeLearningRequirementId[];
  missingRequirementIds: EmployeeLearningRequirementId[];
}

export interface HumanResourcesLearningSignals {
  activeEmployeeCount: number;
  candidates: EmployeeLearningCandidate[];
  missingAccessCount: number;
  missingCompensationCount: number;
  missingContactCount: number;
  missingContractCount: number;
  missingDocumentsCount: number;
  missingLocationCount: number;
  missingOrganizationCount: number;
  missingScheduleCount: number;
  totalEmployeeCount: number;
}

export const emptyHumanResourcesLearningSignals: HumanResourcesLearningSignals = {
  activeEmployeeCount: 0,
  candidates: [],
  missingAccessCount: 0,
  missingCompensationCount: 0,
  missingContactCount: 0,
  missingContractCount: 0,
  missingDocumentsCount: 0,
  missingLocationCount: 0,
  missingOrganizationCount: 0,
  missingScheduleCount: 0,
  totalEmployeeCount: 0,
};

const hasText = (value: string | null | undefined) => Boolean(value?.trim());

const isRequirementComplete = (
  employee: EmployeeViewModel,
  accessProfile: AttendanceAccessProfile | undefined,
  attendanceAssignment: AttendanceControlAssignment | undefined,
  requirementId: EmployeeLearningRequirementId,
) => {
  switch (requirementId) {
    case 'identity':
      return hasText(employee.firstName)
        && hasText(employee.lastName)
        && hasText(employee.dateOfBirth)
        && hasText(employee.nationalId);
    case 'contact':
      return hasText(employee.email) && hasText(employee.phone) && hasText(employee.address);
    case 'organization':
      return hasText(employee.position)
        && hasText(employee.department)
        && hasText(employee.unitId)
        && hasText(employee.businessId);
    case 'compensation':
      return employee.salaryType === 'hourly'
        ? employee.hourlyRate > 0
        : employee.salary > 0;
    case 'contract':
      return hasText(employee.contractType)
        && hasText(employee.contractStartDate)
        && hasText(employee.joinDate);
    case 'schedule':
      return Boolean(attendanceAssignment?.schedule_template_id || attendanceAssignment?.today_rule)
        || (hasText(employee.scheduleStartTime) && hasText(employee.scheduleEndTime));
    case 'location':
      return Boolean(
        attendanceAssignment?.active_work_site
        || attendanceAssignment?.allowed_locations?.length
        || attendanceAssignment?.business_locations?.length,
      ) || (employee.scheduleLocationRule === 'business'
        ? hasText(employee.businessId)
        : employee.scheduleLocationRule === 'exact' && hasText(employee.scheduleLocationId));
    case 'documents':
      return requiredEmployeeDocumentTypes.every(
        (documentType) => Boolean(employee.documents[documentType]),
      );
    case 'access':
      return accessProfile?.status === 'active'
        && accessProfile.methods.some((method) => method.status === 'active');
    default:
      return false;
  }
};

export const employeeLearningRequirementIds: readonly EmployeeLearningRequirementId[] = [
  'identity',
  'contact',
  'organization',
  'compensation',
  'contract',
  'schedule',
  'location',
  'documents',
  'access',
] as const;

export function buildHumanResourcesLearningSignals(
  employees: readonly EmployeeViewModel[],
  accessProfiles: readonly AttendanceAccessProfile[],
  attendanceAssignments: readonly AttendanceControlAssignment[] = [],
): HumanResourcesLearningSignals {
  const accessProfilesByEmployeeId = new Map(
    accessProfiles.map((profile) => [profile.user_company_id, profile]),
  );
  const attendanceAssignmentsByEmployeeId = new Map(
    attendanceAssignments.map((assignment) => [assignment.user_company_id, assignment]),
  );
  const candidates = employees.map<EmployeeLearningCandidate>((employee) => {
    const accessProfile = accessProfilesByEmployeeId.get(employee.id);
    const attendanceAssignment = attendanceAssignmentsByEmployeeId.get(employee.id);
    const completedRequirementIds = employeeLearningRequirementIds.filter((requirementId) =>
      isRequirementComplete(employee, accessProfile, attendanceAssignment, requirementId),
    );

    return {
      id: employee.id,
      name: employee.fullName || `${employee.firstName} ${employee.lastName}`.trim(),
      status: employee.status,
      completedRequirementIds,
      missingRequirementIds: employeeLearningRequirementIds.filter(
        (requirementId) => !completedRequirementIds.includes(requirementId),
      ),
    };
  });
  const activeCandidates = candidates.filter((candidate) => candidate.status === 'active');
  const countMissing = (requirementId: EmployeeLearningRequirementId) =>
    activeCandidates.filter((candidate) => candidate.missingRequirementIds.includes(requirementId)).length;

  return {
    activeEmployeeCount: activeCandidates.length,
    candidates,
    missingAccessCount: countMissing('access'),
    missingCompensationCount: countMissing('compensation'),
    missingContactCount: countMissing('contact'),
    missingContractCount: countMissing('contract'),
    missingDocumentsCount: countMissing('documents'),
    missingLocationCount: countMissing('location'),
    missingOrganizationCount: countMissing('organization'),
    missingScheduleCount: countMissing('schedule'),
    totalEmployeeCount: candidates.length,
  };
}

export function isEmployeeLearningRequirementSatisfied(
  candidate: EmployeeLearningCandidate,
  requirementId: EmployeeLearningRequirementId,
  exceptions: EmployeeLearningExceptions | undefined,
) {
  return candidate.completedRequirementIds.includes(requirementId)
    || Boolean(exceptions?.[requirementId as EmployeeLearningExemptibleRequirementId]?.reason.trim());
}
