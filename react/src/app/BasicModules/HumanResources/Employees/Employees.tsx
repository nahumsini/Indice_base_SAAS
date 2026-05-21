import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ArrowUpDown,
  Calendar,
  Columns3,
  Edit,
  Mail,
  Phone,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import {
  EmployeeModal,
  createEmptyEmployeeFormData,
  type EmployeeDocumentType,
  type EmployeeFormData,
} from './components/CreateEmployeeModal';
import { EmployeeKpiStrip } from './components/EmployeeKpiStrip';
import { FailureToast } from '../../../components/FailureToast';
import { LoadingBarOverlay, runWithMinimumDuration } from '../../../components/LoadingBarOverlay';
import { SuccessToast } from '../../../components/SuccessToast';
import { TerminarContratoModal, type ContractTerminationFormData } from '../../../components/TerminarContratoModal';
import {
  ColumnasConfigModal,
  type ColumnConfig,
} from '../../../components/rh/ColumnasConfigModal';
import { Button } from '../../../components/ui/button';
import { Checkbox } from '../../../components/ui/checkbox';
import { Input } from '../../../components/ui/input';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '../../../components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { Skeleton } from '../../../components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../components/ui/table';
import { cn } from '../../../components/ui/utils';
import { useLanguage } from '../../../shared/context';
import { dashboardApi } from '../../../api/dashboard';
import {
  humanResourcesApi,
  type AttendanceControlLocation,
  type AttendanceControlTemplate,
  type AttendanceControlTemplatePayload,
  type BackendHrUser,
  type BackendHrUserDocument,
  type BackendHrUserProfile,
  type HrUserDetailsResponse,
} from '../../../api/humanResources';
import { getDepartmentOptionLabels } from './data/departmentOptions';
import { getSuggestedPositionsByDepartment } from './data/departmentPositionMap';
import { useEmployeesTranslations } from './hooks/useEmployeesTranslations';
import type { EmployeesTranslations } from './translations';

type EmployeeStatus = 'active' | 'inactive' | 'terminated';
type EmployeePayPeriod = 'weekly' | 'biweekly' | 'monthly';
type EmployeeColumnId =
  | 'employee'
  | 'employeeNumber'
  | 'firstName'
  | 'lastName'
  | 'email'
  | 'phone'
  | 'dateOfBirth'
  | 'address'
  | 'nationalId'
  | 'taxId'
  | 'socialSecurityNumber'
  | 'registrationCountry'
  | 'stateProvince'
  | 'city'
  | 'postalCode'
  | 'alternatePhone'
  | 'emergencyContactName'
  | 'emergencyContactRelationship'
  | 'emergencyContactPhone'
  | 'position'
  | 'department'
  | 'unit'
  | 'business'
  | 'status'
  | 'scheduleOnHire'
  | 'scheduleStartDate'
  | 'scheduleEndDate'
  | 'scheduleStartTime'
  | 'scheduleEndTime'
  | 'scheduleMealMinutes'
  | 'scheduleRestMinutes'
  | 'scheduleLateAfterMinutes'
  | 'scheduleLocationRule'
  | 'scheduleLocationId'
  | 'salaryType'
  | 'workdayHours'
  | 'salary'
  | 'hourlyRate'
  | 'payPeriod'
  | 'contractType'
  | 'contractStartDate'
  | 'contractEndDate'
  | 'joinDate'
  | 'birthCertificate'
  | 'governmentId'
  | 'proofOfAddress'
  | 'resume'
  | 'profilePhoto';
type EmployeeSortDirection = 'asc' | 'desc';

interface EmployeeSortState {
  columnId: EmployeeColumnId;
  direction: EmployeeSortDirection;
}

interface Option<T extends string> {
  value: T;
  label: string;
}

interface EmployeeViewModel {
  id: number;
  code: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  address: string;
  nationalId: string;
  taxId: string;
  socialSecurityNumber: string;
  registrationCountry: string;
  stateProvince: string;
  city: string;
  postalCode: string;
  alternatePhone: string;
  emergencyContactName: string;
  emergencyContactRelationship: string;
  emergencyContactPhone: string;
  position: string;
  department: string;
  unitId: string;
  unitLabel: string;
  businessId: string;
  businessLabel: string;
  joinDate: string;
  scheduleOnHire: boolean | null;
  scheduleStartDate: string;
  scheduleEndDate: string;
  scheduleStartTime: string;
  scheduleEndTime: string;
  scheduleMealMinutes: number | null;
  scheduleRestMinutes: number | null;
  scheduleLateAfterMinutes: number | null;
  scheduleLocationRule: 'business' | 'exact' | '';
  scheduleLocationId: string;
  salary: number;
  payPeriod: EmployeePayPeriod;
  salaryType: 'daily' | 'hourly';
  workdayHours: number | null;
  hourlyRate: number;
  contractType: 'permanent' | 'temporary';
  contractStartDate: string;
  contractEndDate: string;
  status: EmployeeStatus;
  documents: Record<EmployeeDocumentType, string>;
}

interface EmployeeSummary {
  total_count: number;
  active_count: number;
  inactive_count: number;
  terminated_count: number;
  total_payroll_amount_monthly: number;
}

type InlineEditableEmployeeField = 'department' | 'position' | 'unit' | 'business';

interface InlineEmployeeUpdateOverrides {
  department?: string;
  position?: string;
  unitId?: string;
  businessId?: string;
}

type OrganizationOptionTone = 'corporate' | 'unit' | 'business' | 'default';

interface OrganizationSelectOption {
  value: string;
  label: string;
  unitId?: string;
  unit_id?: string;
  badge?: string;
  description?: string;
  tone?: OrganizationOptionTone;
  disabled?: boolean;
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const columnsStorageKey = 'rh-colaboradores-columns-v5';
const allFilterValue = 'all';
const inlineUnassignedValue = '__unassigned__';
const employeesPerPage = 10;

const normalizeOptionLabel = (value: string) => value.trim().replace(/\s+/g, ' ');

const mergeTextOptions = (...optionGroups: ReadonlyArray<ReadonlyArray<string>>) => {
  const optionMap = new Map<string, string>();

  optionGroups.flat().forEach((option) => {
    const normalized = normalizeOptionLabel(option);
    if (!normalized) {
      return;
    }

    const key = normalized.toLocaleLowerCase();
    if (!optionMap.has(key)) {
      optionMap.set(key, normalized);
    }
  });

  return Array.from(optionMap.values());
};

const normalizeOrganizationLabel = (value?: string | null) => normalizeOptionLabel(value ?? '').toLocaleLowerCase();

const isCorporateHeadquartersLabel = (label?: string | null) => {
  const normalized = normalizeOrganizationLabel(label);
  return normalized === 'corporate office'
    || normalized === 'headquarter'
    || normalized === 'headquarters'
    || normalized === 'oficina corporativa'
    || normalized === 'sede corporativa';
};

const isCorporateOfficeUnitLabel = (label?: string | null) => isCorporateHeadquartersLabel(label);

const getUnitHeadquartersLabel = (unitLabel?: string | null) => (
  `${normalizeOptionLabel(unitLabel ?? '') || 'Unit'} headquarters`
);

const isUnitHeadquartersLabel = (businessLabel?: string | null, unitLabel?: string | null) => {
  const normalizedBusiness = normalizeOrganizationLabel(businessLabel);
  const normalizedUnit = normalizeOptionLabel(unitLabel ?? '');
  if (!normalizedBusiness || !normalizedUnit) {
    return false;
  }

  return normalizedBusiness === normalizeOrganizationLabel(getUnitHeadquartersLabel(normalizedUnit))
    || normalizedBusiness === normalizeOrganizationLabel(`${normalizedUnit} headquarter`)
    || normalizedBusiness === normalizeOrganizationLabel(`${normalizedUnit} sede`)
    || normalizedBusiness === normalizeOrganizationLabel(`sede ${normalizedUnit}`);
};

const getInlineOrganizationCopy = (locale: string) => {
  if (locale.toLocaleLowerCase().startsWith('es')) {
    return {
      corporateUnitBadge: 'Corporativo',
      businessUnitBadge: 'Unidad',
      corporateBusinessBadge: 'Oficina corporativa',
      unitHeadquartersBadge: 'Headquarters',
      operatingBusinessBadge: 'Negocio',
      corporateUnitDescription: 'Base física del equipo corporativo.',
      businessUnitDescription: 'Unidad física donde operan negocios y oficinas.',
      corporateBusinessDescription: 'Para CEO, dirección general o equipo corporativo.',
      unitHeadquartersDescription: (unit: string) => `Para dirección o administración de ${unit}.`,
      operatingBusinessDescription: 'Para gerentes y colaboradores asignados al negocio.',
    };
  }

  return {
    corporateUnitBadge: 'Corporate',
    businessUnitBadge: 'Unit',
    corporateBusinessBadge: 'Corporate office',
    unitHeadquartersBadge: 'Headquarters',
    operatingBusinessBadge: 'Business',
    corporateUnitDescription: 'Physical base for the corporate team.',
    businessUnitDescription: 'Physical unit where businesses and unit offices operate.',
    corporateBusinessDescription: 'For CEO, general management, or corporate staff.',
    unitHeadquartersDescription: (unit: string) => `For directors or admin staff assigned to ${unit}.`,
    operatingBusinessDescription: 'For managers and collaborators assigned to the business.',
  };
};

const organizationToneOrder: Record<OrganizationOptionTone, number> = {
  corporate: 1,
  unit: 2,
  business: 3,
  default: 4,
};

const createDefaultColumns = (copy: EmployeesTranslations): ColumnConfig[] => [
  {
    id: 'employee',
    label: copy.columns.employee,
    visible: true,
    locked: true,
    description: copy.columnDescriptions.employee,
  },
  {
    id: 'employeeNumber',
    label: copy.columns.employeeNumber,
    visible: false,
    description: copy.columnDescriptions.employeeNumber,
  },
  { id: 'firstName', label: copy.columns.firstName, visible: false, description: copy.columnDescriptions.firstName },
  { id: 'lastName', label: copy.columns.lastName, visible: false, description: copy.columnDescriptions.lastName },
  { id: 'email', label: copy.columns.email, visible: true, description: copy.columnDescriptions.email },
  { id: 'phone', label: copy.columns.phone, visible: false, description: copy.columnDescriptions.phone },
  { id: 'dateOfBirth', label: copy.columns.dateOfBirth, visible: false, description: copy.columnDescriptions.dateOfBirth },
  { id: 'address', label: copy.columns.address, visible: false, description: copy.columnDescriptions.address },
  { id: 'nationalId', label: copy.columns.nationalId, visible: false, description: copy.columnDescriptions.nationalId },
  { id: 'taxId', label: copy.columns.taxId, visible: false, description: copy.columnDescriptions.taxId },
  {
    id: 'socialSecurityNumber',
    label: copy.columns.socialSecurityNumber,
    visible: false,
    description: copy.columnDescriptions.socialSecurityNumber,
  },
  {
    id: 'registrationCountry',
    label: copy.columns.registrationCountry,
    visible: false,
    description: copy.columnDescriptions.registrationCountry,
  },
  { id: 'stateProvince', label: copy.columns.stateProvince, visible: false, description: copy.columnDescriptions.stateProvince },
  { id: 'city', label: copy.columns.city, visible: false, description: copy.columnDescriptions.city },
  { id: 'postalCode', label: copy.columns.postalCode, visible: false, description: copy.columnDescriptions.postalCode },
  { id: 'alternatePhone', label: copy.columns.alternatePhone, visible: false, description: copy.columnDescriptions.alternatePhone },
  {
    id: 'emergencyContactName',
    label: copy.columns.emergencyContactName,
    visible: false,
    description: copy.columnDescriptions.emergencyContactName,
  },
  {
    id: 'emergencyContactRelationship',
    label: copy.columns.emergencyContactRelationship,
    visible: false,
    description: copy.columnDescriptions.emergencyContactRelationship,
  },
  {
    id: 'emergencyContactPhone',
    label: copy.columns.emergencyContactPhone,
    visible: false,
    description: copy.columnDescriptions.emergencyContactPhone,
  },
  { id: 'position', label: copy.columns.position, visible: true, description: copy.columnDescriptions.position },
  { id: 'department', label: copy.columns.department, visible: true, description: copy.columnDescriptions.department },
  { id: 'unit', label: copy.columns.unit, visible: true, description: copy.columnDescriptions.unit },
  { id: 'business', label: copy.columns.business, visible: false, description: copy.columnDescriptions.business },
  { id: 'status', label: copy.columns.status, visible: true, description: copy.columnDescriptions.status },
  { id: 'salaryType', label: copy.columns.salaryType, visible: false, description: copy.columnDescriptions.salaryType },
  { id: 'workdayHours', label: copy.columns.workdayHours, visible: false, description: copy.columnDescriptions.workdayHours },
  { id: 'salary', label: copy.columns.salary, visible: true, description: copy.columnDescriptions.salary },
  { id: 'hourlyRate', label: copy.columns.hourlyRate, visible: false, description: copy.columnDescriptions.hourlyRate },
  { id: 'payPeriod', label: copy.columns.payPeriod, visible: true, description: copy.columnDescriptions.payPeriod },
  { id: 'contractType', label: copy.columns.contractType, visible: false, description: copy.columnDescriptions.contractType },
  {
    id: 'contractStartDate',
    label: copy.columns.contractStartDate,
    visible: false,
    description: copy.columnDescriptions.contractStartDate,
  },
  {
    id: 'contractEndDate',
    label: copy.columns.contractEndDate,
    visible: false,
    description: copy.columnDescriptions.contractEndDate,
  },
  { id: 'joinDate', label: copy.columns.joinDate, visible: false, description: copy.columnDescriptions.joinDate },
  {
    id: 'birthCertificate',
    label: copy.columns.birthCertificate,
    visible: false,
    description: copy.columnDescriptions.birthCertificate,
  },
  {
    id: 'governmentId',
    label: copy.columns.governmentId,
    visible: false,
    description: copy.columnDescriptions.governmentId,
  },
  {
    id: 'proofOfAddress',
    label: copy.columns.proofOfAddress,
    visible: false,
    description: copy.columnDescriptions.proofOfAddress,
  },
  { id: 'resume', label: copy.columns.resume, visible: false, description: copy.columnDescriptions.resume },
  { id: 'profilePhoto', label: copy.columns.profilePhoto, visible: false, description: copy.columnDescriptions.profilePhoto },
];

const getInitialColumns = (defaultColumns: ColumnConfig[]) => {
  if (typeof window === 'undefined') {
    return defaultColumns;
  }

  try {
    const rawColumns = window.localStorage.getItem(columnsStorageKey);
    if (!rawColumns) {
      return defaultColumns;
    }

    const parsedColumns = JSON.parse(rawColumns) as Array<Partial<ColumnConfig>>;
    const defaultColumnMap = new Map(defaultColumns.map((column) => [column.id, column]));

    const restoredColumns = parsedColumns
      .map((column) => {
        if (!column?.id || !defaultColumnMap.has(column.id)) {
          return null;
        }

        const baseColumn = defaultColumnMap.get(column.id)!;
        return {
          ...baseColumn,
          visible: typeof column.visible === 'boolean' ? column.visible : baseColumn.visible,
        };
      })
      .filter((column): column is ColumnConfig => column !== null);

    const missingColumns = defaultColumns.filter(
      (column) => !restoredColumns.some((restored) => restored.id === column.id),
    );

    return restoredColumns.length > 0 ? [...restoredColumns, ...missingColumns] : defaultColumns;
  } catch {
    return defaultColumns;
  }
};

const formatDate = (value: string, locale: string, fallback: string) => {
  if (!value) {
    return fallback;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parsed);
};

const normalizeErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (typeof error === 'string' && error.trim()) {
    return error;
  }

  return fallback;
};

const weekdayConfig = [1, 2, 3, 4, 5, 6, 7] as const;

const normalizeScheduleTemplatePayload = (payload: AttendanceControlTemplatePayload) =>
  JSON.stringify({
    schedule_mode: payload.schedule_mode ?? 'strict',
    block_after_grace_period: false,
    enforce_location: Boolean(payload.enforce_location),
    location_id: payload.location_id ?? null,
    days: payload.days.map((day) => ({
      day_of_week: day.day_of_week,
      start_time: day.start_time ?? null,
      end_time: day.end_time ?? null,
      meal_minutes: day.meal_minutes,
      rest_minutes: day.rest_minutes,
      late_after_minutes: day.late_after_minutes,
      is_rest_day: day.is_rest_day,
    })),
  });

const hrAccentButtonClass = 'bg-[#59C3A5] text-white hover:bg-[#3AAE90]';

const employeeStatusOrder: Record<EmployeeStatus, number> = {
  active: 1,
  inactive: 2,
  terminated: 3,
};

const employeePayPeriodOrder: Record<EmployeePayPeriod, number> = {
  weekly: 1,
  biweekly: 2,
  monthly: 3,
};

const payloadFromAttendanceTemplate = (template: AttendanceControlTemplate): AttendanceControlTemplatePayload => ({
  name: template.name,
  status: template.status === 'inactive' ? 'inactive' : 'active',
  schedule_mode: template.schedule_mode === 'open' ? 'open' : 'strict',
  block_after_grace_period: false,
  enforce_location: Boolean(template.enforce_location),
  location_id: template.location_id ?? null,
  days: template.days.map((day) => ({
    day_of_week: day.day_of_week,
    start_time: day.start_time ?? null,
    end_time: day.end_time ?? null,
    meal_minutes: day.meal_minutes ?? 0,
    rest_minutes: day.rest_minutes ?? 0,
    late_after_minutes: day.late_after_minutes,
    is_rest_day: day.is_rest_day,
  })),
});

const buildHireScheduleTemplatePayload = (data: EmployeeFormData): AttendanceControlTemplatePayload => {
  const startTime = `${data.scheduleStartTime}:00`;
  const endTime = `${data.scheduleEndTime}:00`;
  const mealMinutes = Math.max(0, Number(data.scheduleMealMinutes) || 0);
  const restMinutes = Math.max(0, Number(data.scheduleRestMinutes) || 0);
  const lateAfterMinutes = Math.max(0, Number(data.scheduleLateAfterMinutes) || 0);
  const enforceLocation = data.scheduleLocationRule === 'exact' && Boolean(data.scheduleLocationId);
  const locationId = enforceLocation ? Number(data.scheduleLocationId) : null;
  const templateScope = enforceLocation ? `Location ${locationId}` : 'Employee business location';

  return {
    name: `Hire schedule ${data.scheduleStartTime}-${data.scheduleEndTime} ${templateScope}`,
    status: 'active',
    schedule_mode: 'strict',
    block_after_grace_period: false,
    enforce_location: enforceLocation,
    location_id: locationId,
    days: weekdayConfig.map((dayOfWeek) => {
      const isRestDay = dayOfWeek > 5;
      return {
        day_of_week: dayOfWeek,
        start_time: isRestDay ? null : startTime,
        end_time: isRestDay ? null : endTime,
        meal_minutes: isRestDay ? 0 : mealMinutes,
        rest_minutes: isRestDay ? 0 : restMinutes,
        late_after_minutes: isRestDay ? 0 : lateAfterMinutes,
        is_rest_day: isRestDay,
      };
    }),
  };
};

const getStatusClasses = (status: EmployeeStatus) => {
  switch (status) {
    case 'active':
      return 'border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/60 dark:text-emerald-300';
    case 'inactive':
      return 'border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/60 dark:text-amber-300';
    case 'terminated':
      return 'border-red-200 bg-red-100 text-red-800 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-300';
    default:
      return 'border-gray-200 bg-gray-100 text-gray-700 dark:border-gray-700 dark:bg-gray-700 dark:text-gray-300';
  }
};

function getEmployeeInitials(employee: EmployeeViewModel) {
  const firstInitial = employee.firstName.trim().charAt(0);
  const lastInitial = employee.lastName.trim().charAt(0);
  const initials = `${firstInitial}${lastInitial}`.trim();

  if (initials) {
    return initials.toUpperCase();
  }

  return employee.fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase() || 'HR';
}

function compareEmployeeSortValues(leftValue: unknown, rightValue: unknown, direction: EmployeeSortDirection) {
  const multiplier = direction === 'asc' ? 1 : -1;

  if (typeof leftValue === 'number' && typeof rightValue === 'number') {
    return (leftValue - rightValue) * multiplier;
  }

  return String(leftValue ?? '').localeCompare(String(rightValue ?? ''), undefined, {
    numeric: true,
    sensitivity: 'base',
  }) * multiplier;
}

function FilterSelect<T extends string>({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: T) => void;
  options: Option<T>[];
  value: T;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</label>
      <Select value={value} onValueChange={(nextValue) => onChange(nextValue as T)}>
        <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function InlineTableSelect({
  disabled = false,
  onChange,
  options,
  placeholder,
  value,
}: {
  disabled?: boolean;
  onChange: (value: string) => void;
  options: OrganizationSelectOption[];
  placeholder: string;
  value: string;
}) {
  const selectedOption = options.find((option) => option.value === value);

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="h-10 min-w-[190px] max-w-[320px] rounded-full border-slate-200 bg-white px-3 text-left text-sm font-semibold text-slate-800 shadow-none transition hover:border-[#59C3A5]/40 hover:bg-[#59C3A5]/5 dark:border-slate-600 dark:bg-slate-900/70 dark:text-slate-100 dark:hover:border-blue-300/50 dark:hover:bg-blue-950/30">
        <span className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
          <span className="min-w-0 truncate">
            {selectedOption?.label ?? placeholder}
          </span>
          {selectedOption?.badge ? (
            <span className="shrink-0 rounded-full bg-[#59C3A5]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#59C3A5] dark:bg-blue-300/10 dark:text-blue-200">
              {selectedOption.badge}
            </span>
          ) : null}
        </span>
      </SelectTrigger>
      <SelectContent className="max-h-80 min-w-[260px]">
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value} disabled={option.disabled}>
            <div className="flex min-w-0 flex-col gap-1 py-1">
              <div className="flex min-w-0 items-center gap-2">
                <span className="truncate font-semibold">{option.label}</span>
                {option.badge ? (
                  <span className="shrink-0 rounded-full bg-[#59C3A5]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#59C3A5] dark:bg-blue-300/10 dark:text-blue-200">
                    {option.badge}
                  </span>
                ) : null}
              </div>
              {option.description ? (
                <span className="max-w-[240px] whitespace-normal text-xs leading-snug text-slate-500 dark:text-slate-400">
                  {option.description}
                </span>
              ) : null}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function EmployeeTableActionButton({
  icon,
  label,
  onClick,
  toneClassName,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  toneClassName: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-xl border transition-all hover:-translate-y-0.5 hover:shadow-sm dark:border-slate-600 dark:bg-slate-800/80',
        toneClassName,
      )}
    >
      {icon}
    </button>
  );
}

const documentTypeOrder: EmployeeDocumentType[] = [
  'birth_certificate',
  'government_id',
  'proof_of_address',
  'resume',
  'profile_photo',
];

const createEmptyDocumentRecord = (): Record<EmployeeDocumentType, string> => ({
  birth_certificate: '',
  government_id: '',
  proof_of_address: '',
  resume: '',
  profile_photo: '',
});

const employeeColumnDocumentTypeMap: Partial<Record<EmployeeColumnId, EmployeeDocumentType>> = {
  birthCertificate: 'birth_certificate',
  governmentId: 'government_id',
  proofOfAddress: 'proof_of_address',
  resume: 'resume',
  profilePhoto: 'profile_photo',
};

type BackendHrUserWithOptionalProfile = BackendHrUser & {
  profile?: BackendHrUserProfile | null;
  documents?: BackendHrUserDocument[];
  date_of_birth?: string | null;
  address?: string;
  national_id?: string;
  tax_id?: string;
  social_security_number?: string;
  registration_country?: string;
  state_province?: string;
  city?: string;
  postal_code?: string;
  alternate_phone?: string;
  emergency_contact_name?: string;
  emergency_contact_relationship?: string;
  emergency_contact_phone?: string;
  workday_hours?: number | null;
};

const mapEmployee = (
  employee: BackendHrUser,
  fallbackUnitLabel: string,
  fallbackBusinessLabel: string,
): EmployeeViewModel => {
  const employeeWithProfile = employee as BackendHrUserWithOptionalProfile;
  const profile: BackendHrUserProfile = employeeWithProfile.profile ?? {};
  const documents = createEmptyDocumentRecord();
  employeeWithProfile.documents?.forEach((document) => {
    documents[document.document_type] = document.original_filename || document.status || 'uploaded';
  });

  return {
    id: employee.id,
    code: employee.user_code?.trim() || `RH-${String(employee.id).padStart(3, '0')}`,
    firstName: employee.first_name || '',
    lastName: employee.last_name || '',
    fullName: employee.full_name || `${employee.first_name} ${employee.last_name}`.trim(),
    email: employee.email || '',
    phone: employee.phone || '',
    dateOfBirth: profile.date_of_birth ? String(profile.date_of_birth) : employeeWithProfile.date_of_birth ? String(employeeWithProfile.date_of_birth) : '',
    address: profile.address ?? employeeWithProfile.address ?? '',
    nationalId: profile.national_id ?? employeeWithProfile.national_id ?? '',
    taxId: profile.tax_id ?? employeeWithProfile.tax_id ?? '',
    socialSecurityNumber: profile.social_security_number ?? employeeWithProfile.social_security_number ?? '',
    registrationCountry: profile.registration_country ?? employeeWithProfile.registration_country ?? '',
    stateProvince: profile.state_province ?? employeeWithProfile.state_province ?? '',
    city: profile.city ?? employeeWithProfile.city ?? '',
    postalCode: profile.postal_code ?? employeeWithProfile.postal_code ?? '',
    alternatePhone: profile.alternate_phone ?? employeeWithProfile.alternate_phone ?? '',
    emergencyContactName: profile.emergency_contact_name ?? employeeWithProfile.emergency_contact_name ?? '',
    emergencyContactRelationship:
      profile.emergency_contact_relationship ?? employeeWithProfile.emergency_contact_relationship ?? '',
    emergencyContactPhone: profile.emergency_contact_phone ?? employeeWithProfile.emergency_contact_phone ?? '',
    position: employee.position_title || employee.position || '',
    department: employee.department || '',
    unitId: employee.unit_id ? String(employee.unit_id) : allFilterValue,
    unitLabel: employee.unit_name || fallbackUnitLabel,
    businessId: employee.business_id ? String(employee.business_id) : allFilterValue,
    businessLabel: employee.business_name || fallbackBusinessLabel,
    joinDate: employee.hire_date ? String(employee.hire_date) : '',
    scheduleOnHire: null,
    scheduleStartDate: '',
    scheduleEndDate: '',
    scheduleStartTime: '',
    scheduleEndTime: '',
    scheduleMealMinutes: null,
    scheduleRestMinutes: null,
    scheduleLateAfterMinutes: null,
    scheduleLocationRule: '',
    scheduleLocationId: '',
    salary: Number(employee.salary ?? 0),
    payPeriod: employee.pay_period,
    salaryType: employee.salary_type,
    workdayHours:
      profile.workday_hours !== null && profile.workday_hours !== undefined
        ? Number(profile.workday_hours)
        : employeeWithProfile.workday_hours !== null && employeeWithProfile.workday_hours !== undefined
          ? Number(employeeWithProfile.workday_hours)
          : null,
    hourlyRate: Number(employee.hourly_rate ?? 0),
    contractType: employee.contract_type,
    contractStartDate: employee.contract_start_date ? String(employee.contract_start_date) : '',
    contractEndDate: employee.contract_end_date ? String(employee.contract_end_date) : '',
    status: employee.status,
    documents,
  };
};

const toEmployeeFormData = (details?: HrUserDetailsResponse | null): EmployeeFormData => {
  const base = createEmptyEmployeeFormData();
  if (!details) {
    return base;
  }

  const next = {
    ...base,
    employeeId: details.user.id,
    employeeNumber: details.user.user_code ?? '',
    firstName: details.user.first_name ?? '',
    lastName: details.user.last_name ?? '',
    email: details.user.email ?? '',
    mobilePhone: details.user.phone ?? '',
    dateOfBirth: details.profile.date_of_birth ? String(details.profile.date_of_birth) : '',
    address: details.profile.address ?? '',
    nationalId: details.profile.national_id ?? '',
    taxId: details.profile.tax_id ?? '',
    socialSecurityNumber: details.profile.social_security_number ?? '',
    registrationCountry: details.profile.registration_country ?? '',
    stateProvince: details.profile.state_province ?? '',
    city: details.profile.city ?? '',
    postalCode: details.profile.postal_code ?? '',
    alternatePhone: details.profile.alternate_phone ?? '',
    emergencyContactName: details.profile.emergency_contact_name ?? '',
    emergencyContactRelationship: details.profile.emergency_contact_relationship ?? '',
    emergencyContactPhone: details.profile.emergency_contact_phone ?? '',
    department: details.user.department ?? '',
    position: details.user.position_title || details.user.position || '',
    businessUnitId: details.user.unit_id ? String(details.user.unit_id) : '',
    businessId: details.user.business_id ? String(details.user.business_id) : '',
    hireDate: details.user.hire_date ? String(details.user.hire_date) : '',
    salaryType: details.user.salary_type ?? 'daily',
    workdayHours:
      details.profile.workday_hours !== null && details.profile.workday_hours !== undefined
        ? String(details.profile.workday_hours)
        : '8',
    salary:
      details.user.salary !== null && details.user.salary !== undefined
        ? String(details.user.salary)
        : '',
    hourlyRate:
      details.user.hourly_rate !== null && details.user.hourly_rate !== undefined
        ? String(details.user.hourly_rate)
        : '',
    payPeriod: details.user.pay_period ?? 'weekly',
    contractType: details.user.contract_type ?? 'permanent',
    contractStartDate: details.user.contract_start_date ? String(details.user.contract_start_date) : '',
    contractEndDate: details.user.contract_end_date ? String(details.user.contract_end_date) : '',
  } satisfies EmployeeFormData;

  documentTypeOrder.forEach((documentType) => {
    const existingDocument = details.documents.find((document) => document.document_type === documentType);
    if (!existingDocument) {
      return;
    }

    next.documents[documentType] = {
      documentType,
      existingId: existingDocument.id,
      existingFileName: existingDocument.original_filename,
      existingDownloadUrl: existingDocument.download_url ?? undefined,
      file: null,
      removeExisting: false,
    };
  });

  return next;
};

const mapEmployeeDetails = (
  details: HrUserDetailsResponse,
  fallbackUnitLabel: string,
  fallbackBusinessLabel: string,
): EmployeeViewModel => {
  const baseEmployee = mapEmployee(details.user, fallbackUnitLabel, fallbackBusinessLabel);
  const documents = createEmptyDocumentRecord();
  details.documents.forEach((document) => {
    documents[document.document_type] = document.original_filename || document.status || 'uploaded';
  });

  return {
    ...baseEmployee,
    dateOfBirth: details.profile.date_of_birth ? String(details.profile.date_of_birth) : '',
    address: details.profile.address ?? '',
    nationalId: details.profile.national_id ?? '',
    taxId: details.profile.tax_id ?? '',
    socialSecurityNumber: details.profile.social_security_number ?? '',
    registrationCountry: details.profile.registration_country ?? '',
    stateProvince: details.profile.state_province ?? '',
    city: details.profile.city ?? '',
    postalCode: details.profile.postal_code ?? '',
    alternatePhone: details.profile.alternate_phone ?? '',
    emergencyContactName: details.profile.emergency_contact_name ?? '',
    emergencyContactRelationship: details.profile.emergency_contact_relationship ?? '',
    emergencyContactPhone: details.profile.emergency_contact_phone ?? '',
    workdayHours:
      details.profile.workday_hours !== null && details.profile.workday_hours !== undefined
        ? Number(details.profile.workday_hours)
        : null,
    documents,
  };
};

export default function Employees() {
  const { currentLanguage } = useLanguage();
  const copy = useEmployeesTranslations();

  const defaultColumns = useMemo(() => createDefaultColumns(copy), [copy]);
  const fixedColumns: ColumnConfig[] = [
    { id: 'selection', label: copy.columns.selection, visible: true, locked: true },
    { id: 'actions', label: copy.columns.actions, visible: true, locked: true },
  ];

  const [employees, setEmployees] = useState<EmployeeViewModel[]>([]);
  const [summary, setSummary] = useState<EmployeeSummary>({
    total_count: 0,
    active_count: 0,
    inactive_count: 0,
    terminated_count: 0,
    total_payroll_amount_monthly: 0,
  });
  const [unitOptions, setUnitOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [businessOptions, setBusinessOptions] = useState<Array<{ value: string; label: string; unitId?: string; unit_id?: string }>>([]);
  const [attendanceLocations, setAttendanceLocations] = useState<AttendanceControlLocation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [unitFilter, setUnitFilter] = useState(allFilterValue);
  const [businessFilter, setBusinessFilter] = useState(allFilterValue);
  const [departmentFilter, setDepartmentFilter] = useState(allFilterValue);
  const [statusFilter, setStatusFilter] = useState(allFilterValue);
  const [sortState, setSortState] = useState<EmployeeSortState>({
    columnId: 'employee',
    direction: 'asc',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [columns, setColumns] = useState<ColumnConfig[]>(() => getInitialColumns(defaultColumns));
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<number[]>([]);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeViewModel | null>(null);
  const [modalInitialData, setModalInitialData] = useState<EmployeeFormData>(createEmptyEmployeeFormData());
  const [terminatingEmployee, setTerminatingEmployee] = useState<EmployeeViewModel | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isColumnsModalOpen, setIsColumnsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPreparingModal, setIsPreparingModal] = useState(false);
  const [inlineSavingKey, setInlineSavingKey] = useState<string | null>(null);
  const [inlineDrafts, setInlineDrafts] = useState<Record<number, InlineEmployeeUpdateOverrides>>({});
  const [loadingOverlayTitle, setLoadingOverlayTitle] = useState<string>(copy.loadingTitle);
  const [loadingOverlayDescription, setLoadingOverlayDescription] = useState<string>(copy.loadingDescription);
  const [loadError, setLoadError] = useState('');
  const [successToastMessage, setSuccessToastMessage] = useState('');
  const [failureToastMessage, setFailureToastMessage] = useState('');

  const visibleColumns = columns.filter((column) => column.visible);
  const departmentOptions = useMemo(
    () =>
      Array.from(new Set(employees.map((employee) => employee.department).filter(Boolean))).sort((left, right) =>
        left.localeCompare(right),
      ),
    [employees],
  );
  const employeePositionOptions = useMemo(
    () =>
      Array.from(new Set(employees.map((employee) => employee.position).filter(Boolean))).sort((left, right) =>
        left.localeCompare(right),
      ),
    [employees],
  );
  const inlineDepartmentOptions = useMemo(
    () => mergeTextOptions(getDepartmentOptionLabels(currentLanguage.code), departmentOptions),
    [currentLanguage.code, departmentOptions],
  );
  const modalUnitOptions = useMemo(
    () => unitOptions.filter((option) => option.value !== allFilterValue && option.value !== 'all-units'),
    [unitOptions],
  );
  const modalBusinessOptions = useMemo(
    () => businessOptions.filter((option) => option.value !== allFilterValue && option.value !== 'all-businesses'),
    [businessOptions],
  );
  const inlineOrganizationCopy = useMemo(
    () => getInlineOrganizationCopy(currentLanguage.code),
    [currentLanguage.code],
  );
  const inlineUnitOptions = useMemo<OrganizationSelectOption[]>(
    () =>
      modalUnitOptions.map((option) => {
        const isCorporateUnit = isCorporateOfficeUnitLabel(option.label);

        return {
          ...option,
          label: isCorporateUnit ? inlineOrganizationCopy.corporateBusinessBadge : option.label,
          badge: isCorporateUnit ? inlineOrganizationCopy.corporateUnitBadge : inlineOrganizationCopy.businessUnitBadge,
          description: isCorporateUnit
            ? inlineOrganizationCopy.corporateUnitDescription
            : inlineOrganizationCopy.businessUnitDescription,
          tone: isCorporateUnit ? 'corporate' : 'unit',
        };
      }),
    [inlineOrganizationCopy, modalUnitOptions],
  );
  const departmentFilterOptions: Option<string>[] = [
    { value: allFilterValue, label: copy.filters.all },
    ...departmentOptions.map((department) => ({ value: department, label: department })),
  ];
  const unitFilterOptions: Option<string>[] =
    unitOptions.length > 0 ? unitOptions : [{ value: allFilterValue, label: copy.filters.all }];
  const businessFilterOptions: Option<string>[] =
    businessOptions.length > 0 ? businessOptions : [{ value: allFilterValue, label: copy.filters.all }];
  const statusFilterOptions: Option<string>[] = [
    { value: allFilterValue, label: copy.filters.all },
    { value: 'active', label: copy.statusLabels.active },
    { value: 'inactive', label: copy.statusLabels.inactive },
    { value: 'terminated', label: copy.statusLabels.terminated },
  ];

  const hydrateEmployeeDetails = async (employeeIds: number[]) => {
    if (employeeIds.length === 0) {
      return;
    }

    const detailResults = await Promise.allSettled(
      employeeIds.map((employeeId) => humanResourcesApi.getHrUserDetails(employeeId)),
    );
    const employeesById = new Map<number, EmployeeViewModel>();

    detailResults.forEach((result) => {
      if (result.status !== 'fulfilled') {
        return;
      }

      const hydratedEmployee = mapEmployeeDetails(result.value, copy.unitFallback, copy.businessFallback);
      employeesById.set(hydratedEmployee.id, hydratedEmployee);
    });

    if (employeesById.size === 0) {
      return;
    }

    setEmployees((currentEmployees) =>
      currentEmployees.map((employee) => employeesById.get(employee.id) ?? employee),
    );
  };

  useEffect(() => {
    setColumns((currentColumns) => {
      const translated = getInitialColumns(defaultColumns);
      const supportedColumnIds = new Set(translated.map((column) => column.id));
      const hasUnsupportedColumns = currentColumns.some((column) => !supportedColumnIds.has(column.id));
      const needsLabelRefresh = translated.some((nextColumn) => {
        const currentColumn = currentColumns.find((column) => column.id === nextColumn.id);
        return currentColumn?.label !== nextColumn.label;
      });

      return hasUnsupportedColumns || needsLabelRefresh ? translated : currentColumns;
    });
  }, [defaultColumns]);

  useEffect(() => {
    window.localStorage.setItem(columnsStorageKey, JSON.stringify(columns));
  }, [columns]);

  const loadEmployees = async () => {
    setIsLoading(true);
    setLoadError('');

    try {
      const [employeesResponse, unitsResponse, businessesResponse, locationsResponse] = await runWithMinimumDuration(
        Promise.all([
          humanResourcesApi.listHrUsers(),
          dashboardApi.listUnits().catch(() => []),
          dashboardApi.listBusinesses().catch(() => []),
          humanResourcesApi.listAttendanceControlLocations().catch(() => ({ items: [] })),
        ]),
      );

      const mappedEmployees = employeesResponse.items.map((employee) =>
        mapEmployee(employee, copy.unitFallback, copy.businessFallback),
      );
      setEmployees(mappedEmployees);
      setSummary(employeesResponse.summary);
      setUnitOptions([
        { value: allFilterValue, label: copy.filters.all },
        ...unitsResponse.map((unit) => ({ value: String(unit.id), label: unit.name })),
      ]);
      setBusinessOptions([
        { value: allFilterValue, label: copy.filters.all },
        ...businessesResponse.map((business) => ({
          value: String(business.id),
          label: business.name,
          unitId: business.unitId ? String(business.unitId) : business.unit_id ? String(business.unit_id) : undefined,
          unit_id: business.unit_id ? String(business.unit_id) : business.unitId ? String(business.unitId) : undefined,
        })),
      ]);
      setAttendanceLocations(locationsResponse.items);
      void hydrateEmployeeDetails(mappedEmployees.map((employee) => employee.id));
    } catch (error) {
      setLoadError(normalizeErrorMessage(error, copy.errorMessages.load));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadEmployees();
  }, [copy.businessFallback, copy.filters.all, copy.unitFallback]);

  useEffect(() => {
    setSelectedEmployeeIds((currentIds) =>
      currentIds.filter((id) => employees.some((employee) => employee.id === id)),
    );
  }, [employees]);

  useEffect(() => {
    setInlineDrafts((currentDrafts) => {
      const employeeIds = new Set(employees.map((employee) => employee.id));
      const nextDrafts = Object.fromEntries(
        Object.entries(currentDrafts).filter(([employeeId]) => employeeIds.has(Number(employeeId))),
      );

      return Object.keys(nextDrafts).length === Object.keys(currentDrafts).length ? currentDrafts : nextDrafts;
    });
  }, [employees]);

  const filteredEmployees = employees.filter((employee) => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    const matchesSearch =
      normalizedSearch.length === 0 ||
      employee.fullName.toLowerCase().includes(normalizedSearch) ||
      employee.code.toLowerCase().includes(normalizedSearch) ||
      employee.position.toLowerCase().includes(normalizedSearch) ||
      employee.email.toLowerCase().includes(normalizedSearch) ||
      employee.phone.toLowerCase().includes(normalizedSearch) ||
      employee.address.toLowerCase().includes(normalizedSearch) ||
      employee.nationalId.toLowerCase().includes(normalizedSearch) ||
      employee.taxId.toLowerCase().includes(normalizedSearch) ||
      employee.socialSecurityNumber.toLowerCase().includes(normalizedSearch) ||
      employee.registrationCountry.toLowerCase().includes(normalizedSearch) ||
      employee.stateProvince.toLowerCase().includes(normalizedSearch) ||
      employee.city.toLowerCase().includes(normalizedSearch) ||
      employee.postalCode.toLowerCase().includes(normalizedSearch) ||
      employee.alternatePhone.toLowerCase().includes(normalizedSearch) ||
      employee.emergencyContactName.toLowerCase().includes(normalizedSearch) ||
      employee.emergencyContactRelationship.toLowerCase().includes(normalizedSearch) ||
      employee.emergencyContactPhone.toLowerCase().includes(normalizedSearch);
    const matchesUnit = unitFilter === allFilterValue || employee.unitId === unitFilter;
    const matchesBusiness = businessFilter === allFilterValue || employee.businessId === businessFilter;
    const matchesDepartment = departmentFilter === allFilterValue || employee.department === departmentFilter;
    const matchesStatus = statusFilter === allFilterValue || employee.status === statusFilter;

    return matchesSearch && matchesUnit && matchesBusiness && matchesDepartment && matchesStatus;
  });

  const getSortValue = (employee: EmployeeViewModel, columnId: EmployeeColumnId) => {
    switch (columnId) {
      case 'employee':
        return employee.fullName;
      case 'employeeNumber':
        return employee.code;
      case 'firstName':
        return employee.firstName;
      case 'lastName':
        return employee.lastName;
      case 'email':
        return employee.email;
      case 'phone':
        return employee.phone;
      case 'dateOfBirth':
        return employee.dateOfBirth;
      case 'address':
        return employee.address;
      case 'nationalId':
        return employee.nationalId;
      case 'taxId':
        return employee.taxId;
      case 'socialSecurityNumber':
        return employee.socialSecurityNumber;
      case 'registrationCountry':
        return employee.registrationCountry;
      case 'stateProvince':
        return employee.stateProvince;
      case 'city':
        return employee.city;
      case 'postalCode':
        return employee.postalCode;
      case 'alternatePhone':
        return employee.alternatePhone;
      case 'emergencyContactName':
        return employee.emergencyContactName;
      case 'emergencyContactRelationship':
        return employee.emergencyContactRelationship;
      case 'emergencyContactPhone':
        return employee.emergencyContactPhone;
      case 'position':
        return employee.position;
      case 'department':
        return employee.department;
      case 'unit':
        return employee.unitLabel;
      case 'business':
        return employee.businessLabel;
      case 'status':
        return employeeStatusOrder[employee.status];
      case 'scheduleOnHire':
        return employee.scheduleOnHire === null ? '' : Number(employee.scheduleOnHire);
      case 'scheduleStartDate':
        return employee.scheduleStartDate;
      case 'scheduleEndDate':
        return employee.scheduleEndDate;
      case 'scheduleStartTime':
        return employee.scheduleStartTime;
      case 'scheduleEndTime':
        return employee.scheduleEndTime;
      case 'scheduleMealMinutes':
        return employee.scheduleMealMinutes ?? 0;
      case 'scheduleRestMinutes':
        return employee.scheduleRestMinutes ?? 0;
      case 'scheduleLateAfterMinutes':
        return employee.scheduleLateAfterMinutes ?? 0;
      case 'scheduleLocationRule':
        return employee.scheduleLocationRule;
      case 'scheduleLocationId':
        return employee.scheduleLocationId;
      case 'salaryType':
        return employee.salaryType;
      case 'workdayHours':
        return employee.workdayHours ?? 0;
      case 'salary':
        return employee.salaryType === 'hourly' ? employee.hourlyRate : employee.salary;
      case 'hourlyRate':
        return employee.hourlyRate;
      case 'payPeriod':
        return employeePayPeriodOrder[employee.payPeriod];
      case 'contractType':
        return employee.contractType;
      case 'contractStartDate':
        return employee.contractStartDate;
      case 'contractEndDate':
        return employee.contractEndDate;
      case 'joinDate':
        return employee.joinDate;
      case 'birthCertificate':
      case 'governmentId':
      case 'proofOfAddress':
      case 'resume':
      case 'profilePhoto': {
        const documentType = employeeColumnDocumentTypeMap[columnId];
        return documentType ? employee.documents[documentType] : '';
      }
      default:
        return '';
    }
  };

  const sortedEmployees = [...filteredEmployees].sort((leftEmployee, rightEmployee) =>
    compareEmployeeSortValues(
      getSortValue(leftEmployee, sortState.columnId),
      getSortValue(rightEmployee, sortState.columnId),
      sortState.direction,
    ),
  );

  const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / employeesPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (safeCurrentPage - 1) * employeesPerPage;
  const pageEndIndex = pageStartIndex + employeesPerPage;
  const paginatedEmployees = sortedEmployees.slice(pageStartIndex, pageEndIndex);
  const visibleEmployeeIds = paginatedEmployees.map((employee) => employee.id);
  const allVisibleSelected =
    visibleEmployeeIds.length > 0 &&
    visibleEmployeeIds.every((employeeId) => selectedEmployeeIds.includes(employeeId));
  const someVisibleSelected =
    !allVisibleSelected && visibleEmployeeIds.some((employeeId) => selectedEmployeeIds.includes(employeeId));
  const paginationStart = filteredEmployees.length === 0 ? 0 : pageStartIndex + 1;
  const paginationEnd = filteredEmployees.length === 0 ? 0 : Math.min(pageEndIndex, filteredEmployees.length);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, unitFilter, businessFilter, departmentFilter, statusFilter]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const toggleSelection = (employeeId: number) => {
    setSelectedEmployeeIds((currentIds) =>
      currentIds.includes(employeeId)
        ? currentIds.filter((id) => id !== employeeId)
        : [...currentIds, employeeId],
    );
  };

  const toggleAllVisibleSelections = () => {
    setSelectedEmployeeIds((currentIds) => {
      if (allVisibleSelected) {
        return currentIds.filter((id) => !visibleEmployeeIds.includes(id));
      }

      return Array.from(new Set([...currentIds, ...visibleEmployeeIds]));
    });
  };

  const handleSort = (columnId: EmployeeColumnId) => {
    setSortState((currentState) =>
      currentState.columnId === columnId
        ? {
            columnId,
            direction: currentState.direction === 'asc' ? 'desc' : 'asc',
          }
        : {
            columnId,
            direction: 'asc',
          },
    );
  };

  const runMutation = async ({
    title,
    description,
    task,
  }: {
    title: string;
    description: string;
    task: () => Promise<void>;
  }) => {
    setLoadingOverlayTitle(title);
    setLoadingOverlayDescription(description);
    setFailureToastMessage('');
    setIsSubmitting(true);

    try {
      await runWithMinimumDuration(task(), 900);
    } finally {
      setIsSubmitting(false);
    }
  };

  const refreshEmployees = async () => {
    const response = await humanResourcesApi.listHrUsers();
    const mappedEmployees = response.items.map((employee) => mapEmployee(employee, copy.unitFallback, copy.businessFallback));
    setEmployees(mappedEmployees);
    setSummary(response.summary);
    void hydrateEmployeeDetails(mappedEmployees.map((employee) => employee.id));
  };

  const openCreateEmployeeModal = () => {
    setEditingEmployee(null);
    setModalInitialData(createEmptyEmployeeFormData());
    setIsModalOpen(true);
  };

  const openEditEmployeeModal = async (employee: EmployeeViewModel) => {
    setLoadingOverlayTitle(copy.detailLoadingTitle);
    setLoadingOverlayDescription(copy.detailLoadingDescription);
    setFailureToastMessage('');
    setIsPreparingModal(true);

    try {
      const details = await runWithMinimumDuration(
        humanResourcesApi.getHrUserDetails(employee.id),
        500,
      );
      setEditingEmployee(employee);
      setModalInitialData(toEmployeeFormData(details));
      setIsModalOpen(true);
    } catch (error) {
      setFailureToastMessage(normalizeErrorMessage(error, copy.errorMessages.detail));
    } finally {
      setIsPreparingModal(false);
    }
  };

  const parseForeignKeyValue = (value: string | undefined) => {
    const normalized = String(value ?? '').trim();
    return /^\d+$/.test(normalized) ? Number(normalized) : null;
  };

  const getInlineBusinessOptionsForUnit = (unitId: string): OrganizationSelectOption[] => {
    if (!unitId || unitId === inlineUnassignedValue || unitId === allFilterValue) {
      return [];
    }

    const selectedUnitOption = modalUnitOptions.find((option) => option.value === unitId) ?? null;
    const selectedUnitLabel = selectedUnitOption?.label ?? '';
    const selectedUnitIsCorporateOffice = Boolean(
      selectedUnitOption && isCorporateOfficeUnitLabel(selectedUnitOption.label),
    );

    return modalBusinessOptions
      .filter((option) => (
        (option.unitId === unitId || option.unit_id === unitId)
        && (selectedUnitIsCorporateOffice || !isCorporateHeadquartersLabel(option.label))
      ))
      .map((option) => {
        const isCorporateBusiness = isCorporateHeadquartersLabel(option.label);
        const isHeadquartersBusiness = !isCorporateBusiness && isUnitHeadquartersLabel(option.label, selectedUnitLabel);
        const tone: OrganizationOptionTone = isCorporateBusiness
          ? 'corporate'
          : isHeadquartersBusiness
            ? 'unit'
            : 'business';

        return {
          ...option,
          label: isCorporateBusiness ? inlineOrganizationCopy.corporateBusinessBadge : option.label,
          badge: isCorporateBusiness
            ? inlineOrganizationCopy.corporateBusinessBadge
            : isHeadquartersBusiness
              ? inlineOrganizationCopy.unitHeadquartersBadge
              : inlineOrganizationCopy.operatingBusinessBadge,
          description: isCorporateBusiness
            ? inlineOrganizationCopy.corporateBusinessDescription
            : isHeadquartersBusiness
              ? inlineOrganizationCopy.unitHeadquartersDescription(selectedUnitLabel || option.label)
              : inlineOrganizationCopy.operatingBusinessDescription,
          tone,
        };
      })
      .sort((first, second) => {
        const firstOrder = organizationToneOrder[first.tone ?? 'default'];
        const secondOrder = organizationToneOrder[second.tone ?? 'default'];
        if (firstOrder !== secondOrder) {
          return firstOrder - secondOrder;
        }
        return first.label.localeCompare(second.label, currentLanguage.code);
      });
  };

  const resolveDefaultBusinessIdForUnit = (unitId: string, currentBusinessId: string) => {
    const nextBusinessOptions = getInlineBusinessOptionsForUnit(unitId);
    const currentBusinessOption = nextBusinessOptions.find((option) => option.value === currentBusinessId);
    if (currentBusinessOption) {
      return currentBusinessOption.value;
    }

    const headquartersOption = nextBusinessOptions.find(
      (option) => option.tone === 'corporate' || option.tone === 'unit',
    );

    return headquartersOption?.value ?? nextBusinessOptions[0]?.value ?? '';
  };

  const buildInlineEmployeePayload = (
    employee: EmployeeViewModel,
    overrides: InlineEmployeeUpdateOverrides,
  ) => {
    const nextPosition = (overrides.position ?? employee.position).trim();
    const nextDepartment = (overrides.department ?? employee.department).trim();
    const nextUnitId = overrides.unitId ?? employee.unitId;
    const nextBusinessId = overrides.businessId ?? employee.businessId;
    const parsedUnitId = parseForeignKeyValue(nextUnitId);
    const parsedBusinessId = parseForeignKeyValue(nextBusinessId);
    const salary = String(employee.salary ?? 0);
    const hourlyRate = String(employee.hourlyRate ?? 0);
    const workdayHours = String(employee.workdayHours ?? 8);

    if (!nextPosition || !nextDepartment || !parsedUnitId || !parsedBusinessId) {
      return null;
    }

    return {
      first_name: employee.firstName.trim(),
      last_name: employee.lastName.trim(),
      email: employee.email.trim(),
      phone: employee.phone.trim(),
      position: nextPosition,
      department: nextDepartment,
      unit_id: parsedUnitId,
      business_id: parsedBusinessId,
      hire_date: employee.joinDate,
      salary,
      pay_period: employee.payPeriod,
      salary_type: employee.salaryType,
      hourly_rate: hourlyRate,
      contract_type: employee.contractType,
      contract_start_date: employee.contractStartDate,
      contract_end_date: employee.contractEndDate,
      user_code: employee.code.trim(),
      employee: {
        user_code: employee.code.trim(),
        first_name: employee.firstName.trim(),
        last_name: employee.lastName.trim(),
        email: employee.email.trim(),
        phone: employee.phone.trim(),
        position: nextPosition,
        department: nextDepartment,
        unit_id: parsedUnitId,
        business_id: parsedBusinessId,
        hire_date: employee.joinDate,
        salary,
        pay_period: employee.payPeriod,
        salary_type: employee.salaryType,
        hourly_rate: hourlyRate,
        contract_type: employee.contractType,
        contract_start_date: employee.contractStartDate,
        contract_end_date: employee.contractEndDate,
      },
      date_of_birth: employee.dateOfBirth,
      address: employee.address.trim(),
      national_id: employee.nationalId.trim(),
      tax_id: employee.taxId.trim(),
      social_security_number: employee.socialSecurityNumber.trim(),
      registration_country: employee.registrationCountry,
      state_province: employee.stateProvince.trim(),
      city: employee.city.trim(),
      postal_code: employee.postalCode.trim(),
      alternate_phone: employee.alternatePhone.trim(),
      emergency_contact_name: employee.emergencyContactName.trim(),
      emergency_contact_relationship: employee.emergencyContactRelationship.trim(),
      emergency_contact_phone: employee.emergencyContactPhone.trim(),
      workday_hours: workdayHours,
      profile: {
        date_of_birth: employee.dateOfBirth,
        address: employee.address.trim(),
        national_id: employee.nationalId.trim(),
        tax_id: employee.taxId.trim(),
        social_security_number: employee.socialSecurityNumber.trim(),
        registration_country: employee.registrationCountry,
        state_province: employee.stateProvince.trim(),
        city: employee.city.trim(),
        postal_code: employee.postalCode.trim(),
        alternate_phone: employee.alternatePhone.trim(),
        emergency_contact_name: employee.emergencyContactName.trim(),
        emergency_contact_relationship: employee.emergencyContactRelationship.trim(),
        emergency_contact_phone: employee.emergencyContactPhone.trim(),
        workday_hours: workdayHours,
      },
      status: employee.status,
    };
  };

  const handleInlineEmployeeUpdate = async (
    employee: EmployeeViewModel,
    field: InlineEditableEmployeeField,
    overrides: InlineEmployeeUpdateOverrides,
  ) => {
    const nextDraft = {
      ...(inlineDrafts[employee.id] ?? {}),
      ...overrides,
    };

    setInlineDrafts((currentDrafts) => ({
      ...currentDrafts,
      [employee.id]: nextDraft,
    }));
    setFailureToastMessage('');

    const payload = buildInlineEmployeePayload(employee, nextDraft);
    if (!payload) {
      return;
    }

    const nextUnitId = nextDraft.unitId ?? employee.unitId;
    const nextBusinessId = nextDraft.businessId ?? employee.businessId;
    const nextDepartment = nextDraft.department ?? employee.department;
    const nextPosition = nextDraft.position ?? employee.position;
    const hasChanged =
      nextUnitId !== employee.unitId
      || nextBusinessId !== employee.businessId
      || nextDepartment !== employee.department
      || nextPosition !== employee.position;

    if (!hasChanged) {
      return;
    }

    const savingKey = `${employee.id}:${field}`;
    setInlineSavingKey(savingKey);
    setFailureToastMessage('');

    try {
      const savedEmployee = await humanResourcesApi.updateHrUser(employee.id, payload);
      const mappedEmployee = mapEmployee(savedEmployee, copy.unitFallback, copy.businessFallback);
      setEmployees((currentEmployees) =>
        currentEmployees.map((currentEmployee) =>
          currentEmployee.id === employee.id
            ? {
                ...currentEmployee,
                ...mappedEmployee,
              }
            : currentEmployee,
        ),
      );
      setSuccessToastMessage(copy.successMessages.updated);
      setInlineDrafts((currentDrafts) => {
        const nextDrafts = { ...currentDrafts };
        delete nextDrafts[employee.id];
        return nextDrafts;
      });
      await refreshEmployees();
    } catch (error) {
      setFailureToastMessage(normalizeErrorMessage(error, copy.errorMessages.save));
    } finally {
      setInlineSavingKey(null);
    }
  };

  const syncEmployeeDocuments = async (employeeId: number, data: EmployeeFormData) => {
    const documentErrors: string[] = [];

    for (const documentType of documentTypeOrder) {
      const slot = data.documents[documentType];

      if (slot.removeExisting && slot.existingId && !slot.file) {
        try {
          await humanResourcesApi.deleteHrUserDocument(employeeId, slot.existingId);
        } catch (error) {
          documentErrors.push(normalizeErrorMessage(error, `Unable to delete ${documentType}.`));
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
        documentErrors.push(normalizeErrorMessage(error, `Unable to save ${documentType}.`));
      }
    }

    return documentErrors;
  };

  const assignHireSchedule = async (employeeId: number, data: EmployeeFormData) => {
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
  };

  const handleSaveEmployee = async (data: EmployeeFormData) => {
    const trimmedFirstName = data.firstName.trim();
    const trimmedLastName = data.lastName.trim();
    const trimmedEmail = data.email.trim();
    const trimmedMobilePhone = data.mobilePhone.trim();
    const trimmedPosition = data.position.trim();
    const trimmedDepartment = data.department.trim();
    const parsedUnitId = parseForeignKeyValue(data.businessUnitId);
    const parsedBusinessId = parseForeignKeyValue(data.businessId);
    const trimmedSalary = data.salary.trim();
    const trimmedHourlyRate = data.hourlyRate.trim();
    const trimmedAddress = data.address.trim();
    const trimmedNationalId = data.nationalId.trim();
    const trimmedTaxId = data.taxId.trim();
    const trimmedSocialSecurityNumber = data.socialSecurityNumber.trim();
    const trimmedStateProvince = data.stateProvince.trim();
    const trimmedCity = data.city.trim();
    const trimmedPostalCode = data.postalCode.trim();
    const trimmedAlternatePhone = data.alternatePhone.trim();
    const trimmedEmergencyContactName = data.emergencyContactName.trim();
    const trimmedEmergencyContactRelationship = data.emergencyContactRelationship.trim();
    const trimmedEmergencyContactPhone = data.emergencyContactPhone.trim();
    const trimmedWorkdayHours = data.workdayHours.trim();

    const payload = {
      first_name: trimmedFirstName,
      last_name: trimmedLastName,
      email: trimmedEmail,
      phone: trimmedMobilePhone,
      position: trimmedPosition,
      department: trimmedDepartment,
      unit_id: parsedUnitId,
      business_id: parsedBusinessId,
      hire_date: data.hireDate,
      salary: trimmedSalary,
      pay_period: data.payPeriod,
      salary_type: data.salaryType,
      hourly_rate: trimmedHourlyRate,
      contract_type: data.contractType,
      contract_start_date: data.contractStartDate,
      contract_end_date: data.contractEndDate,
      user_code: data.employeeNumber.trim(),
      employee: {
        user_code: data.employeeNumber.trim(),
        first_name: trimmedFirstName,
        last_name: trimmedLastName,
        email: trimmedEmail,
        phone: trimmedMobilePhone,
        position: trimmedPosition,
        department: trimmedDepartment,
        unit_id: parsedUnitId,
        business_id: parsedBusinessId,
        hire_date: data.hireDate,
        salary: trimmedSalary,
        pay_period: data.payPeriod,
        salary_type: data.salaryType,
        hourly_rate: trimmedHourlyRate,
        contract_type: data.contractType,
        contract_start_date: data.contractStartDate,
        contract_end_date: data.contractEndDate,
      },
      date_of_birth: data.dateOfBirth,
      address: trimmedAddress,
      national_id: trimmedNationalId,
      tax_id: trimmedTaxId,
      social_security_number: trimmedSocialSecurityNumber,
      registration_country: data.registrationCountry,
      state_province: trimmedStateProvince,
      city: trimmedCity,
      postal_code: trimmedPostalCode,
      alternate_phone: trimmedAlternatePhone,
      emergency_contact_name: trimmedEmergencyContactName,
      emergency_contact_relationship: trimmedEmergencyContactRelationship,
      emergency_contact_phone: trimmedEmergencyContactPhone,
      workday_hours: trimmedWorkdayHours,
      profile: {
        date_of_birth: data.dateOfBirth,
        address: trimmedAddress,
        national_id: trimmedNationalId,
        tax_id: trimmedTaxId,
        social_security_number: trimmedSocialSecurityNumber,
        registration_country: data.registrationCountry,
        state_province: trimmedStateProvince,
        city: trimmedCity,
        postal_code: trimmedPostalCode,
        alternate_phone: trimmedAlternatePhone,
        emergency_contact_name: trimmedEmergencyContactName,
        emergency_contact_relationship: trimmedEmergencyContactRelationship,
        emergency_contact_phone: trimmedEmergencyContactPhone,
        workday_hours: trimmedWorkdayHours,
      },
      status: editingEmployee?.status ?? 'active',
    };

    try {
      let savedEmployeeId = editingEmployee?.id ?? 0;
      let documentErrors: string[] = [];
      let scheduleAssignmentError = '';

      await runMutation({
        title: copy.loadingTitle,
        description: copy.loadingDescription,
        task: async () => {
          const savedEmployee = editingEmployee
            ? await humanResourcesApi.updateHrUser(editingEmployee.id, payload)
            : await humanResourcesApi.createHrUser(payload);

          savedEmployeeId = savedEmployee.id;
          documentErrors = await syncEmployeeDocuments(savedEmployeeId, data);
          if (!editingEmployee && data.scheduleOnHire) {
            try {
              await assignHireSchedule(savedEmployeeId, data);
            } catch (error) {
              scheduleAssignmentError = normalizeErrorMessage(error, copy.errorMessages.scheduleAssign);
            }
          }
          if (editingEmployee) {
            setEditingEmployee((current) => (current ? { ...current, id: savedEmployeeId } : current));
          } else {
            setEditingEmployee(null);
          }
          await refreshEmployees();
        },
      });

      if (documentErrors.length > 0) {
        setFailureToastMessage(
          `${editingEmployee ? copy.successMessages.updated : copy.successMessages.created} ${documentErrors[0]}`,
        );
      } else if (scheduleAssignmentError) {
        setFailureToastMessage(`${copy.successMessages.created} ${scheduleAssignmentError}`);
      } else {
        setSuccessToastMessage(
          editingEmployee
            ? copy.successMessages.updated
            : data.scheduleOnHire
              ? copy.successMessages.createdWithSchedule
              : copy.successMessages.created,
        );
      }
      setEditingEmployee(null);
      setModalInitialData(createEmptyEmployeeFormData());
    } catch (error) {
      setFailureToastMessage(normalizeErrorMessage(error, copy.errorMessages.save));
      throw error;
    }
  };

  const handleDeleteEmployee = async (employee: EmployeeViewModel) => {
    if (employee.status !== 'terminated') {
      setTerminatingEmployee(employee);
      return;
    }

    if (!window.confirm(copy.table.deleteConfirm)) {
      return;
    }

    try {
      await runMutation({
        title: copy.deleteLoadingTitle,
        description: copy.deleteLoadingDescription,
        task: async () => {
          await humanResourcesApi.deleteHrUser(employee.id);
          await refreshEmployees();
        },
      });
      setSuccessToastMessage(copy.successMessages.deleted);
    } catch (error) {
      setFailureToastMessage(normalizeErrorMessage(error, copy.errorMessages.delete));
    }
  };

  const handleConfirmTermination = async (data: ContractTerminationFormData) => {
    if (!terminatingEmployee) {
      return;
    }

    try {
      await runMutation({
        title: copy.terminateLoadingTitle,
        description: copy.terminateLoadingDescription,
        task: async () => {
          await humanResourcesApi.terminateHrUser(terminatingEmployee.id, {
            exit_date: data.exitDate,
            last_working_day: data.lastWorkingDay,
            reason_type: data.reasonType || 'other',
            specific_reason: data.specificReason,
            summary: data.summary,
          });
          await refreshEmployees();
        },
      });

      setTerminatingEmployee(null);
      setSuccessToastMessage(copy.successMessages.terminated);
    } catch (error) {
      setFailureToastMessage(normalizeErrorMessage(error, copy.errorMessages.terminate));
    }
  };

  const renderSalaryValue = (employee: EmployeeViewModel) => {
    if (employee.salaryType === 'hourly') {
      return `${currencyFormatter.format(employee.hourlyRate)} / hr`;
    }

    return currencyFormatter.format(employee.salary);
  };

  const renderTextValue = (value: string | number | null | undefined, className = '') => (
    <span className={cn('inline-flex min-w-[140px] whitespace-normal text-base text-slate-700 dark:text-slate-200', className)}>
      {value !== null && value !== undefined && String(value).trim() ? value : copy.fieldFallback}
    </span>
  );

  const renderDateValue = (value: string) => (
    <span className="inline-flex min-w-[160px] items-center gap-2 text-base text-slate-700 dark:text-slate-200">
      <Calendar className="h-4 w-4 shrink-0 text-slate-400" />
      {formatDate(value, currentLanguage.code, copy.dateFallback)}
    </span>
  );

  const renderBooleanValue = (value: boolean | null) => {
    if (value === null) {
      return renderTextValue('');
    }

    return (
      <span
        className={cn(
          'inline-flex rounded-full border px-3 py-1 text-sm font-semibold',
          value
            ? 'border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/60 dark:text-emerald-300'
            : 'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-700 dark:text-slate-300',
        )}
      >
        {value ? copy.binaryLabels.yes : copy.binaryLabels.no}
      </span>
    );
  };

  const renderDocumentValue = (employee: EmployeeViewModel, documentType: EmployeeDocumentType) => {
    const documentLabel = employee.documents[documentType];
    const isUploaded = Boolean(documentLabel);

    return (
      <div className="min-w-[180px]">
        <span
          className={cn(
            'inline-flex rounded-full border px-3 py-1 text-sm font-semibold',
            isUploaded
              ? 'border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/60 dark:text-emerald-300'
              : 'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-700 dark:text-slate-300',
          )}
        >
          {isUploaded ? copy.documentStatusLabels.uploaded : copy.documentStatusLabels.missing}
        </span>
        {isUploaded ? (
          <p className="mt-1 max-w-[220px] truncate text-sm text-slate-500 dark:text-slate-400">
            {documentLabel}
          </p>
        ) : null}
      </div>
    );
  };

  const toInlineSelectValue = (value: string | null | undefined) => {
    const normalized = String(value ?? '').trim();
    return normalized && normalized !== allFilterValue ? normalized : inlineUnassignedValue;
  };

  const withCurrentTextOption = (options: string[], currentValue: string) =>
    mergeTextOptions(options, currentValue ? [currentValue] : []);

  const ensureSelectedOrganizationOption = (
    options: OrganizationSelectOption[],
    value: string,
    fallbackLabel: string,
  ): OrganizationSelectOption[] => {
    if (value !== inlineUnassignedValue && options.some((option) => option.value === value)) {
      return options;
    }

    return [
      {
        value,
        label: value === inlineUnassignedValue ? fallbackLabel : fallbackLabel,
        description:
          value === inlineUnassignedValue
            ? (
              currentLanguage.code.toLocaleLowerCase().startsWith('es')
                ? 'Selecciona una opción para asignar este dato.'
                : 'Select an option to assign this value.'
            )
            : undefined,
        disabled: value === inlineUnassignedValue,
      },
      ...options,
    ];
  };

  const renderInlineDepartmentSelect = (employee: EmployeeViewModel) => {
    const draft = inlineDrafts[employee.id] ?? {};
    const effectiveDepartment = draft.department ?? employee.department;
    const value = toInlineSelectValue(effectiveDepartment);
    const options = ensureSelectedOrganizationOption(
      withCurrentTextOption(inlineDepartmentOptions, effectiveDepartment).map((department) => ({
        value: department,
        label: department,
      })),
      value,
      copy.fieldFallback,
    );

    return (
      <InlineTableSelect
        value={value}
        options={options}
        placeholder={copy.fieldFallback}
        disabled={inlineSavingKey === `${employee.id}:department`}
        onChange={(nextDepartment) => {
          if (nextDepartment === inlineUnassignedValue) {
            return;
          }
          void handleInlineEmployeeUpdate(employee, 'department', { department: nextDepartment });
        }}
      />
    );
  };

  const renderInlinePositionSelect = (employee: EmployeeViewModel) => {
    const draft = inlineDrafts[employee.id] ?? {};
    const effectiveDepartment = draft.department ?? employee.department;
    const effectivePosition = draft.position ?? employee.position;
    const value = toInlineSelectValue(effectivePosition);
    const positionOptions = mergeTextOptions(
      getSuggestedPositionsByDepartment(effectiveDepartment, currentLanguage.code),
      employeePositionOptions,
      effectivePosition ? [effectivePosition] : [],
    );
    const options = ensureSelectedOrganizationOption(
      positionOptions.map((position) => ({
        value: position,
        label: position,
      })),
      value,
      copy.fieldFallback,
    );

    return (
      <InlineTableSelect
        value={value}
        options={options}
        placeholder={copy.fieldFallback}
        disabled={inlineSavingKey === `${employee.id}:position`}
        onChange={(nextPosition) => {
          if (nextPosition === inlineUnassignedValue) {
            return;
          }
          void handleInlineEmployeeUpdate(employee, 'position', { position: nextPosition });
        }}
      />
    );
  };

  const renderInlineUnitSelect = (employee: EmployeeViewModel) => {
    const draft = inlineDrafts[employee.id] ?? {};
    const effectiveUnitId = draft.unitId ?? employee.unitId;
    const value = toInlineSelectValue(effectiveUnitId);
    const options = ensureSelectedOrganizationOption(
      inlineUnitOptions,
      value,
      employee.unitLabel || copy.unitFallback,
    );

    return (
      <InlineTableSelect
        value={value}
        options={options}
        placeholder={copy.unitFallback}
        disabled={inlineSavingKey === `${employee.id}:unit`}
        onChange={(nextUnitId) => {
          if (nextUnitId === inlineUnassignedValue) {
            return;
          }

          const nextBusinessId = resolveDefaultBusinessIdForUnit(nextUnitId, draft.businessId ?? employee.businessId);
          void handleInlineEmployeeUpdate(employee, 'unit', {
            unitId: nextUnitId,
            businessId: nextBusinessId,
          });
        }}
      />
    );
  };

  const renderInlineBusinessSelect = (employee: EmployeeViewModel) => {
    const draft = inlineDrafts[employee.id] ?? {};
    const unitValue = toInlineSelectValue(draft.unitId ?? employee.unitId);
    const value = toInlineSelectValue(draft.businessId ?? employee.businessId);
    const businessOptionsForUnit = unitValue === inlineUnassignedValue ? [] : getInlineBusinessOptionsForUnit(unitValue);
    const options = ensureSelectedOrganizationOption(
      businessOptionsForUnit,
      value,
      employee.businessLabel || copy.businessFallback,
    );

    return (
      <InlineTableSelect
        value={value}
        options={options}
        placeholder={copy.businessFallback}
        disabled={inlineSavingKey === `${employee.id}:business` || unitValue === inlineUnassignedValue}
        onChange={(nextBusinessId) => {
          if (nextBusinessId === inlineUnassignedValue) {
            return;
          }
          void handleInlineEmployeeUpdate(employee, 'business', { businessId: nextBusinessId });
        }}
      />
    );
  };

  const renderColumnCell = (employee: EmployeeViewModel, columnId: string): ReactNode => {
    switch (columnId) {
      case 'employee':
        return (
          <div className="flex min-w-[250px] items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#59C3A5]/10 text-sm font-bold text-[#59C3A5] dark:bg-[#59C3A5]/30 dark:text-blue-200">
              {getEmployeeInitials(employee)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-slate-900 dark:text-white">{employee.fullName}</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{employee.code}</p>
            </div>
          </div>
        );
      case 'employeeNumber':
        return <span className="text-base font-semibold text-slate-900 dark:text-white">{employee.code || '-'}</span>;
      case 'firstName':
        return renderTextValue(employee.firstName);
      case 'lastName':
        return renderTextValue(employee.lastName);
      case 'email':
        return (
          <div className="inline-flex min-w-[240px] items-center gap-2 break-all text-base text-slate-600 dark:text-slate-300">
            <Mail className="h-4 w-4 shrink-0 text-slate-400" />
            {employee.email || '-'}
          </div>
        );
      case 'phone':
        return (
          <div className="inline-flex min-w-[160px] items-center gap-2 text-base text-slate-600 dark:text-slate-300">
            <Phone className="h-4 w-4 shrink-0 text-slate-400" />
            {employee.phone || '-'}
          </div>
        );
      case 'dateOfBirth':
        return renderDateValue(employee.dateOfBirth);
      case 'address':
        return renderTextValue(employee.address, 'min-w-[260px]');
      case 'nationalId':
        return renderTextValue(employee.nationalId);
      case 'taxId':
        return renderTextValue(employee.taxId);
      case 'socialSecurityNumber':
        return renderTextValue(employee.socialSecurityNumber);
      case 'registrationCountry':
        return renderTextValue(employee.registrationCountry);
      case 'stateProvince':
        return renderTextValue(employee.stateProvince);
      case 'city':
        return renderTextValue(employee.city);
      case 'postalCode':
        return renderTextValue(employee.postalCode);
      case 'alternatePhone':
        return (
          <div className="inline-flex min-w-[160px] items-center gap-2 text-base text-slate-600 dark:text-slate-300">
            <Phone className="h-4 w-4 shrink-0 text-slate-400" />
            {employee.alternatePhone || copy.fieldFallback}
          </div>
        );
      case 'emergencyContactName':
        return renderTextValue(employee.emergencyContactName);
      case 'emergencyContactRelationship':
        return renderTextValue(employee.emergencyContactRelationship);
      case 'emergencyContactPhone':
        return (
          <div className="inline-flex min-w-[160px] items-center gap-2 text-base text-slate-600 dark:text-slate-300">
            <Phone className="h-4 w-4 shrink-0 text-slate-400" />
            {employee.emergencyContactPhone || copy.fieldFallback}
          </div>
        );
      case 'position':
        return renderInlinePositionSelect(employee);
      case 'department':
        return renderInlineDepartmentSelect(employee);
      case 'unit':
        return renderInlineUnitSelect(employee);
      case 'business':
        return renderInlineBusinessSelect(employee);
      case 'status':
        return (
          <span className={cn('inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold', getStatusClasses(employee.status))}>
            {copy.statusLabels[employee.status]}
          </span>
        );
      case 'scheduleOnHire':
        return renderBooleanValue(employee.scheduleOnHire);
      case 'scheduleStartDate':
        return renderDateValue(employee.scheduleStartDate);
      case 'scheduleEndDate':
        return renderDateValue(employee.scheduleEndDate);
      case 'scheduleStartTime':
        return renderTextValue(employee.scheduleStartTime);
      case 'scheduleEndTime':
        return renderTextValue(employee.scheduleEndTime);
      case 'scheduleMealMinutes':
        return renderTextValue(employee.scheduleMealMinutes);
      case 'scheduleRestMinutes':
        return renderTextValue(employee.scheduleRestMinutes);
      case 'scheduleLateAfterMinutes':
        return renderTextValue(employee.scheduleLateAfterMinutes);
      case 'scheduleLocationRule':
        return renderTextValue(
          employee.scheduleLocationRule ? copy.scheduleLocationRuleLabels[employee.scheduleLocationRule] : '',
        );
      case 'scheduleLocationId':
        return renderTextValue(employee.scheduleLocationId);
      case 'salaryType':
        return renderTextValue(copy.salaryTypeLabels[employee.salaryType]);
      case 'workdayHours':
        return renderTextValue(employee.workdayHours !== null ? employee.workdayHours : null);
      case 'salary':
        return <span className="text-base font-semibold text-slate-900 dark:text-white">{renderSalaryValue(employee)}</span>;
      case 'hourlyRate':
        return <span className="text-base font-semibold text-slate-900 dark:text-white">{currencyFormatter.format(employee.hourlyRate)}</span>;
      case 'payPeriod':
        return (
          <span className="inline-flex min-w-[112px] rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100">
            {copy.payPeriodLabels[employee.payPeriod]}
          </span>
        );
      case 'contractType':
        return renderTextValue(copy.contractTypeLabels[employee.contractType]);
      case 'contractStartDate':
        return renderDateValue(employee.contractStartDate);
      case 'contractEndDate':
        return renderDateValue(employee.contractEndDate);
      case 'joinDate':
        return renderDateValue(employee.joinDate);
      case 'birthCertificate':
        return renderDocumentValue(employee, 'birth_certificate');
      case 'governmentId':
        return renderDocumentValue(employee, 'government_id');
      case 'proofOfAddress':
        return renderDocumentValue(employee, 'proof_of_address');
      case 'resume':
        return renderDocumentValue(employee, 'resume');
      case 'profilePhoto':
        return renderDocumentValue(employee, 'profile_photo');
      default:
        return null;
    }
  };

  const changePage = (page: number) => {
    if (page < 1 || page > totalPages || page === safeCurrentPage) {
      return;
    }

    setCurrentPage(page);
  };

  const paginationItems = useMemo(() => {
    if (totalPages <= 1) {
      return [1];
    }

    const pages = new Set<number>([1, totalPages, safeCurrentPage]);
    if (safeCurrentPage - 1 > 1) {
      pages.add(safeCurrentPage - 1);
    }
    if (safeCurrentPage + 1 < totalPages) {
      pages.add(safeCurrentPage + 1);
    }

    const sortedPages = Array.from(pages).sort((left, right) => left - right);
    const items: Array<number | 'ellipsis'> = [];

    sortedPages.forEach((page, index) => {
      const previousPage = sortedPages[index - 1];
      if (previousPage && page - previousPage > 1) {
        items.push('ellipsis');
      }
      items.push(page);
    });

    return items;
  }, [safeCurrentPage, totalPages]);

  return (
    <>
      <LoadingBarOverlay
        isVisible={isSubmitting || isPreparingModal}
        title={loadingOverlayTitle}
        description={loadingOverlayDescription}
      />

      <SuccessToast
        isVisible={Boolean(successToastMessage)}
        message={successToastMessage}
        onClose={() => setSuccessToastMessage('')}
      />

      <FailureToast
        isVisible={Boolean(failureToastMessage)}
        message={failureToastMessage}
        onClose={() => setFailureToastMessage('')}
      />

      {loadError ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-700/30 dark:bg-red-900/20 dark:text-red-300">
          <div className="flex items-center justify-between gap-3">
            <span>{loadError}</span>
            <Button variant="outline" size="sm" onClick={() => void loadEmployees()}>
              Retry
            </Button>
          </div>
        </div>
      ) : null}

      <section className="mb-5 rounded-lg border border-[#59C3A5]/30 bg-[#59C3A5]/10 p-6 shadow-sm dark:border-[#59C3A5]/40 dark:bg-[#59C3A5]/15">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="mb-1 flex items-center gap-2 text-2xl font-semibold text-slate-900 dark:text-white">
              <span className="text-2xl">👥</span>
              {copy.title}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">{copy.subtitle}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setIsColumnsModalOpen(true)}
              className="h-11 gap-2 rounded-xl border-slate-200 bg-white px-4 text-[#59C3A5] shadow-none hover:bg-[#59C3A5] hover:text-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <Columns3 className="h-4 w-4" />
              {copy.configureColumns}
            </Button>
            <Button
              onClick={() => {
                openCreateEmployeeModal();
              }}
              className={cn('h-11 gap-2 rounded-xl px-4', hrAccentButtonClass)}
            >
              <Plus className="h-4 w-4" />
              {copy.addEmployee}
            </Button>
          </div>
        </div>
      </section>

      <section className="mb-6 rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h3 className="mb-4 text-base font-bold text-slate-800 dark:text-white">{copy.filters.title}</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {copy.filters.searchLabel}
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={copy.filters.searchPlaceholder}
                className="h-11 rounded-xl border-slate-200 bg-white pl-10 text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-400"
              />
            </div>
          </div>
          <FilterSelect
            label={copy.filters.unit}
            value={unitFilter}
            onChange={(value) => setUnitFilter(value)}
            options={unitFilterOptions}
          />
          <FilterSelect
            label={copy.filters.business}
            value={businessFilter}
            onChange={(value) => setBusinessFilter(value)}
            options={businessFilterOptions}
          />
          <FilterSelect
            label={copy.filters.department}
            value={departmentFilter}
            onChange={(value) => setDepartmentFilter(value)}
            options={departmentFilterOptions}
          />
          <FilterSelect
            label={copy.filters.status}
            value={statusFilter}
            onChange={(value) => setStatusFilter(value)}
            options={statusFilterOptions}
          />
        </div>
      </section>

      <EmployeeKpiStrip
        isLoading={isLoading}
        totalCount={summary.total_count}
        activeCount={summary.active_count}
        inactiveCount={summary.inactive_count}
        terminatedCount={summary.terminated_count}
        visibleCount={filteredEmployees.length}
        selectedCount={selectedEmployeeIds.length}
        monthlyPayroll={currencyFormatter.format(summary.total_payroll_amount_monthly)}
        labels={copy.summary}
      />

      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <Table style={{ minWidth: Math.max(1420, visibleColumns.length * 190 + 180) }}>
          <TableHeader>
            <TableRow className="border-slate-200 dark:border-slate-700">
              <TableHead className="w-14 px-5 py-6">
                <Checkbox
                  checked={allVisibleSelected ? true : someVisibleSelected ? 'indeterminate' : false}
                  onCheckedChange={toggleAllVisibleSelections}
                  aria-label={copy.table.selectAllVisible}
                />
              </TableHead>
              {visibleColumns.map((column) => (
                <TableHead key={column.id} className="px-5 py-6">
                  <button
                    type="button"
                    onClick={() => handleSort(column.id as EmployeeColumnId)}
                    className="flex items-center gap-2 text-left text-sm font-semibold tracking-tight text-slate-500 dark:text-slate-400"
                  >
                    <span>{column.label}</span>
                    <ArrowUpDown
                      className={cn(
                        'h-4 w-4',
                        sortState.columnId === column.id ? 'text-[#59C3A5] dark:text-blue-300' : 'text-slate-400',
                      )}
                    />
                  </button>
                </TableHead>
              ))}
              <TableHead className="px-5 py-6 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {copy.columns.actions}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, rowIndex) => (
                <TableRow key={rowIndex} className="border-slate-200 dark:border-slate-700">
                  <TableCell className="px-5 py-6">
                    <Skeleton className="h-4 w-4" />
                  </TableCell>
                  {visibleColumns.map((column) => (
                    <TableCell key={column.id} className="px-5 py-6">
                      <Skeleton className="h-4 w-full max-w-[180px]" />
                    </TableCell>
                  ))}
                  <TableCell className="px-5 py-6">
                    <Skeleton className="h-9 w-24 rounded-2xl" />
                  </TableCell>
                </TableRow>
              ))
            ) : filteredEmployees.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={visibleColumns.length + 2}
                  className="px-6 py-16 text-center text-base text-slate-500 dark:text-slate-400"
                >
                  {copy.table.emptyState}
                </TableCell>
              </TableRow>
            ) : (
              paginatedEmployees.map((employee) => (
                <TableRow
                  key={employee.id}
                  data-state={selectedEmployeeIds.includes(employee.id) ? 'selected' : undefined}
                  className="border-slate-200 dark:border-slate-700"
                >
                  <TableCell className="px-5 py-6">
                    <Checkbox
                      checked={selectedEmployeeIds.includes(employee.id)}
                      onCheckedChange={() => toggleSelection(employee.id)}
                      aria-label={copy.table.selectEmployee(employee.fullName)}
                    />
                  </TableCell>
                  {visibleColumns.map((column) => (
                    <TableCell
                      key={`${employee.id}-${column.id}`}
                      className={cn(
                        'px-5 py-6 align-middle',
                        column.id === 'employee' ||
                          column.id === 'email' ||
                          column.id === 'address' ||
                          column.id === 'unit' ||
                          column.id === 'business' ||
                          column.id === 'emergencyContactName' ||
                          column.id === 'emergencyContactRelationship'
                          ? 'whitespace-normal'
                          : '',
                      )}
                    >
                      {renderColumnCell(employee, column.id)}
                    </TableCell>
                  ))}
                  <TableCell className="px-5 py-6">
                    <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/70">
                      <EmployeeTableActionButton
                        icon={<Edit className="h-4 w-4 text-blue-600" />}
                        label={copy.table.editHrUserLabel}
                        onClick={() => {
                          void openEditEmployeeModal(employee);
                        }}
                        toneClassName="border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-900/60 dark:bg-blue-950/60 dark:text-blue-300 dark:hover:bg-blue-900/60"
                      />
                      <EmployeeTableActionButton
                        icon={<Trash2 className="h-4 w-4 text-red-600" />}
                        label={
                          employee.status === 'terminated'
                            ? copy.table.deleteHrUserLabel
                            : copy.table.terminateHrUserLabel
                        }
                        onClick={() => {
                          void handleDeleteEmployee(employee);
                        }}
                        toneClassName="border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-300 dark:hover:bg-red-900/60"
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {filteredEmployees.length > 0 ? (
          <div className="flex flex-col gap-4 border-t border-slate-200 px-6 py-4 dark:border-slate-700 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {copy.pagination.showing(paginationStart, paginationEnd, filteredEmployees.length)}
            </p>
            <div className="flex flex-col items-start gap-3 md:items-end">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {copy.pagination.page(safeCurrentPage, totalPages)}
              </p>
              <Pagination className="mx-0 w-auto justify-start md:justify-end">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(event) => {
                        event.preventDefault();
                        changePage(safeCurrentPage - 1);
                      }}
                      aria-disabled={safeCurrentPage === 1}
                      className={safeCurrentPage === 1 ? 'pointer-events-none opacity-50' : undefined}
                    />
                  </PaginationItem>
                  {paginationItems.map((item, index) => (
                    item === 'ellipsis' ? (
                      <PaginationItem key={`ellipsis-${index}`}>
                        <PaginationEllipsis />
                      </PaginationItem>
                    ) : (
                      <PaginationItem key={item}>
                        <PaginationLink
                          href="#"
                          isActive={item === safeCurrentPage}
                          onClick={(event) => {
                            event.preventDefault();
                            changePage(item);
                          }}
                        >
                          {item}
                        </PaginationLink>
                      </PaginationItem>
                    )
                  ))}
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(event) => {
                        event.preventDefault();
                        changePage(safeCurrentPage + 1);
                      }}
                      aria-disabled={safeCurrentPage === totalPages}
                      className={safeCurrentPage === totalPages ? 'pointer-events-none opacity-50' : undefined}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </div>
        ) : null}
      </section>

      <ColumnasConfigModal
        isOpen={isColumnsModalOpen}
        onClose={() => setIsColumnsModalOpen(false)}
        columns={columns}
        fixedColumns={fixedColumns}
        onSave={setColumns}
      />

      <EmployeeModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingEmployee(null);
          setModalInitialData(createEmptyEmployeeFormData());
        }}
        onSave={handleSaveEmployee}
        initialData={modalInitialData}
        mode={editingEmployee ? 'edit' : 'create'}
        unitOptions={unitOptions}
        businessOptions={businessOptions}
        attendanceLocations={attendanceLocations}
      />

      <TerminarContratoModal
        isOpen={terminatingEmployee !== null}
        onClose={() => setTerminatingEmployee(null)}
        onConfirm={(data) => {
          void handleConfirmTermination(data);
        }}
        employeeName={terminatingEmployee?.fullName ?? ''}
      />
    </>
  );
}
