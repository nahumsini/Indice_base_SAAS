import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import {
  Briefcase,
  Check,
  ChevronDown,
  FileText,
  Phone,
  Plus,
  Trash2,
  Upload,
  User,
  X,
} from 'lucide-react';
import { Button } from '../../../../../components/ui/button';
import { cn } from '../../../../../components/ui/utils';
import { useLanguage } from '../../../../../shared/context';
import { flushSync } from 'react-dom';
import {
  PROFILE_COUNTRY_OPTIONS,
  getProfileCountryLabel,
  resolveProfileCountry,
} from '../../../../../shared/profileCountries';
import { validateEmail } from '../../../../../shared/validation/email';
import {
  normalizePhoneInputForCountry,
  validatePhoneForProfileCountry,
} from '../../../../../shared/validation/phone';
import {
  ManualLocationFields,
  validatePostalCodeForCountry,
} from '../../../../../components/ManualLocationFields';
import type { AttendanceControlLocation } from '../../../../../api/humanResources';
import { getDepartmentOptionLabels } from '../../data/departmentOptions';
import { getSuggestedPositionsByDepartment } from '../../data/departmentPositionMap';
import { getAllPositionLabels } from '../../data/positionOptions';
import { useEmployeesTranslations } from '../../hooks/useEmployeesTranslations';
import { HelperText } from './components/HelperText';
import { StepProgress, type WizardStep } from './components/StepProgress';
import { BasicInfoStep } from './steps/BasicInfoStep';
import { ContactStep } from './steps/ContactStep';
import { DocumentsStep } from './steps/DocumentsStep';
import { JobStep } from './steps/JobStep';

export type EmployeeDocumentType =
  | 'birth_certificate'
  | 'government_id'
  | 'proof_of_address'
  | 'resume'
  | 'profile_photo';

export interface EmployeeDocumentSlot {
  documentType: EmployeeDocumentType;
  existingId?: number;
  existingFileName?: string;
  existingDownloadUrl?: string;
  file: File | null;
  removeExisting: boolean;
}

export interface EmployeeFormData {
  employeeId?: number;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  mobilePhone: string;
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
  department: string;
  position: string;
  businessUnitId: string;
  businessId: string;
  hireDate: string;
  scheduleOnHire: boolean;
  scheduleStartDate: string;
  scheduleEndDate: string;
  scheduleStartTime: string;
  scheduleEndTime: string;
  scheduleMealMinutes: string;
  scheduleRestMinutes: string;
  scheduleLateAfterMinutes: string;
  scheduleBlockAfterGracePeriod: boolean;
  scheduleLocationRule: 'business' | 'exact';
  scheduleLocationId: string;
  salaryType: 'daily' | 'hourly';
  workdayHours: string;
  salary: string;
  hourlyRate: string;
  payPeriod: 'weekly' | 'biweekly' | 'monthly';
  contractType: 'permanent' | 'temporary';
  contractStartDate: string;
  contractEndDate: string;
  documents: Record<EmployeeDocumentType, EmployeeDocumentSlot>;
}

interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: EmployeeFormData) => void | Promise<void>;
  initialData?: EmployeeFormData | null;
  mode?: 'create' | 'edit';
  unitOptions?: Array<{ value: string; label: string }>;
  businessOptions?: Array<{ value: string; label: string; unitId?: string; unit_id?: string }>;
  attendanceLocations?: AttendanceControlLocation[];
}

type EmployeeFieldKey =
  | 'firstName'
  | 'lastName'
  | 'email'
  | 'mobilePhone'
  | 'registrationCountry'
  | 'postalCode'
  | 'alternatePhone'
  | 'emergencyContactPhone'
  | 'department'
  | 'position'
  | 'businessUnitId'
  | 'businessId'
  | 'scheduleStartDate'
  | 'scheduleEndDate'
  | 'scheduleStartTime'
  | 'scheduleEndTime'
  | 'scheduleMealMinutes'
  | 'scheduleRestMinutes'
  | 'scheduleLateAfterMinutes'
  | 'scheduleLocationId'
  | 'workdayHours'
  | 'salary'
  | 'hourlyRate'
  | 'contractStartDate'
  | 'contractEndDate';

const DOCUMENT_TYPES: EmployeeDocumentType[] = [
  'birth_certificate',
  'government_id',
  'proof_of_address',
  'resume',
  'profile_photo',
];

const dateInputValue = (date = new Date()) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const SUPPORTED_DOCUMENT_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]);
const MAX_DOCUMENT_SIZE_BYTES = 5 * 1024 * 1024;
const modalStepIcons = [User, Phone, Briefcase, FileText] as const;
const customJobOptionsStorageKey = 'rh-employee-custom-job-options-v1';

type CustomJobOptionKind = 'departments' | 'positions';

type CustomJobOptions = Record<CustomJobOptionKind, string[]>;

type OrganizationOptionTone = 'default' | 'corporate' | 'unit' | 'business';

type OrganizationOption = {
  value: string;
  label: string;
  description?: string;
  badge?: string;
  tone?: OrganizationOptionTone;
  unitId?: string;
  unit_id?: string;
};

const createDocumentSlot = (documentType: EmployeeDocumentType): EmployeeDocumentSlot => ({
  documentType,
  file: null,
  removeExisting: false,
});

const createEmptyCustomJobOptions = (): CustomJobOptions => ({
  departments: [],
  positions: [],
});

export const createEmptyEmployeeFormData = (): EmployeeFormData => ({
  employeeNumber: '',
  firstName: '',
  lastName: '',
  email: '',
  mobilePhone: '',
  dateOfBirth: '',
  address: '',
  nationalId: '',
  taxId: '',
  socialSecurityNumber: '',
  registrationCountry: '',
  stateProvince: '',
  city: '',
  postalCode: '',
  alternatePhone: '',
  emergencyContactName: '',
  emergencyContactRelationship: '',
  emergencyContactPhone: '',
  department: '',
  position: '',
  businessUnitId: '',
  businessId: '',
  hireDate: '',
  scheduleOnHire: false,
  scheduleStartDate: '',
  scheduleEndDate: '',
  scheduleStartTime: '08:00',
  scheduleEndTime: '16:00',
  scheduleMealMinutes: '0',
  scheduleRestMinutes: '0',
  scheduleLateAfterMinutes: '10',
  scheduleBlockAfterGracePeriod: false,
  scheduleLocationRule: 'business',
  scheduleLocationId: '',
  salaryType: 'daily',
  workdayHours: '8',
  salary: '',
  hourlyRate: '',
  payPeriod: 'weekly',
  contractType: 'permanent',
  contractStartDate: '',
  contractEndDate: '',
  documents: {
    birth_certificate: createDocumentSlot('birth_certificate'),
    government_id: createDocumentSlot('government_id'),
    proof_of_address: createDocumentSlot('proof_of_address'),
    resume: createDocumentSlot('resume'),
    profile_photo: createDocumentSlot('profile_photo'),
  },
});

const modalLabelClassName = 'mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200';
const modalControlClassName =
  'h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 shadow-none placeholder:text-slate-400 transition-colors focus:border-[#59C3A5] focus:outline-none focus:ring-2 focus:ring-[#59C3A5]/15 dark:border-slate-600 dark:bg-slate-900/70 dark:text-slate-100 dark:placeholder:text-slate-500';
const modalOutlineButtonClassName =
  'h-10 rounded-xl border-white/30 bg-white/10 px-5 text-white shadow-none hover:bg-white/20 hover:text-white disabled:border-white/20 disabled:bg-white/5 disabled:text-white/50 dark:border-white/25 dark:bg-white/10 dark:text-white dark:hover:bg-white/20';
const modalPrimaryButtonClassName =
  'h-10 rounded-xl bg-white px-5 text-[#59C3A5] shadow-sm hover:bg-slate-100 hover:text-[#59C3A5] focus-visible:ring-white/40 dark:bg-white dark:text-[#59C3A5] dark:hover:bg-slate-100';

const formatAttendanceLocationOption = (location: AttendanceControlLocation) => {
  const scope = location.business_name || location.unit_name || '';
  return scope ? `${location.name} - ${scope}` : location.name;
};

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

const isCorporateOfficeUnitLabel = (label?: string | null) => (
  isCorporateHeadquartersLabel(label)
);

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

const getBelongingCopy = (locale: string) => {
  if (locale.toLocaleLowerCase().startsWith('es')) {
    return {
      businessUnitHelper: 'Elige la unidad física o corporativa a la que pertenece el colaborador.',
      businessHelper: 'Selecciona una oficina corporativa, headquarters de unidad o negocio operativo con ID real.',
      selectUnitFirst: 'Selecciona primero una unidad para ver las opciones de pertenencia.',
      noHeadquartersOption: 'Esta unidad todavía no muestra una opción de headquarters. Guarda Estructura empresarial para crearla.',
      corporateUnitBadge: 'Corporativo',
      businessUnitBadge: 'Unidad',
      corporateBusinessBadge: 'Oficina corporativa',
      unitHeadquartersBadge: 'Headquarters de unidad',
      operatingBusinessBadge: 'Negocio operativo',
      autoAssignedBadge: 'Asignado automáticamente',
      corporateUnitDescription: 'Base física del equipo corporativo.',
      businessUnitDescription: 'Unidad física donde operan negocios y oficinas de unidad.',
      corporateBusinessDescription: 'Para CEO, dirección general o equipo corporativo.',
      unitHeadquartersDescription: (unit: string) => `Para dirección o administración de ${unit}.`,
      operatingBusinessDescription: 'Para gerentes y colaboradores asignados al negocio.',
      belongingSummary: (unit: string, business: string, kind: string) => `Pertenencia: ${unit} / ${business} · ${kind}.`,
      corporateAutoSummary: 'La oficina corporativa se asigna desde la unidad seleccionada.',
    };
  }

  return {
    businessUnitHelper: 'Choose the physical or corporate unit where this HR user belongs.',
    businessHelper: 'Select a corporate office, unit headquarters, or operating business with a real ID.',
    selectUnitFirst: 'Select a unit first to see belonging options.',
    noHeadquartersOption: 'This unit does not show a headquarters option yet. Save Business Structure to create it.',
    corporateUnitBadge: 'Corporate',
    businessUnitBadge: 'Unit',
    corporateBusinessBadge: 'Corporate office',
    unitHeadquartersBadge: 'Unit headquarters',
    operatingBusinessBadge: 'Operating business',
    autoAssignedBadge: 'Auto-assigned',
    corporateUnitDescription: 'Physical base for the corporate team.',
    businessUnitDescription: 'Physical unit where businesses and unit offices operate.',
    corporateBusinessDescription: 'For CEO, general management, or corporate staff.',
    unitHeadquartersDescription: (unit: string) => `For directors or admin staff assigned to ${unit}.`,
    operatingBusinessDescription: 'For managers and collaborators assigned to the business.',
    belongingSummary: (unit: string, business: string, kind: string) => `Belonging: ${unit} / ${business} · ${kind}.`,
    corporateAutoSummary: 'The corporate office is assigned from the selected unit.',
  };
};

const loadCustomJobOptions = (): CustomJobOptions => {
  if (typeof window === 'undefined') {
    return createEmptyCustomJobOptions();
  }

  try {
    const rawValue = window.localStorage.getItem(customJobOptionsStorageKey);
    if (!rawValue) {
      return createEmptyCustomJobOptions();
    }

    const parsedValue = JSON.parse(rawValue) as Partial<CustomJobOptions>;
    return {
      departments: Array.isArray(parsedValue.departments)
        ? mergeTextOptions(parsedValue.departments)
        : [],
      positions: Array.isArray(parsedValue.positions)
        ? mergeTextOptions(parsedValue.positions)
        : [],
    };
  } catch {
    return createEmptyCustomJobOptions();
  }
};

const saveCustomJobOptions = (options: CustomJobOptions) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(customJobOptionsStorageKey, JSON.stringify(options));
};

function TextField({
  name,
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  required = false,
  error,
  helperText,
  autoComplete,
  readOnly = false,
}: {
  name?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  error?: string;
  helperText?: string;
  autoComplete?: string;
  readOnly?: boolean;
}) {
  return (
    <div>
      <label className={modalLabelClassName}>
        {label} {required ? <span className="text-red-500">*</span> : null}
      </label>
      <input
        name={name}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        readOnly={readOnly}
        aria-invalid={Boolean(error)}
        className={cn(
          modalControlClassName,
          readOnly && 'bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-300',
          error && 'border-red-400 focus:border-red-500 focus:ring-red-500/15 dark:border-red-500',
        )}
      />
      {error ? (
        <HelperText tone="error">{error}</HelperText>
      ) : helperText ? (
        <HelperText>{helperText}</HelperText>
      ) : null}
    </div>
  );
}

export const EmployeeModal = CreateEmployeeModal;

function SelectField({
  name,
  label,
  value,
  onChange,
  options,
  placeholder,
  required = false,
  error,
}: {
  name?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<{ value: string; label: string }>;
  placeholder?: string;
  required?: boolean;
  error?: string;
}) {
  return (
    <div>
      <label className={modalLabelClassName}>
        {label} {required ? <span className="text-red-500">*</span> : null}
      </label>
      <select
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        className={cn(
          modalControlClassName,
          'cursor-pointer appearance-none',
          error && 'border-red-400 focus:border-red-500 focus:ring-red-500/15 dark:border-red-500',
        )}
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? <HelperText tone="error">{error}</HelperText> : null}
    </div>
  );
}

const organizationToneOrder: Record<OrganizationOptionTone, number> = {
  corporate: 0,
  unit: 1,
  business: 2,
  default: 3,
};

const getOrganizationToneClassNames = (tone: OrganizationOptionTone = 'default', isSelected = false) => {
  if (tone === 'corporate') {
    return {
      option: isSelected
        ? 'border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100'
        : 'border-transparent text-slate-700 hover:bg-emerald-50 dark:text-slate-200 dark:hover:bg-emerald-500/10',
      badge: 'bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-200 dark:ring-emerald-400/20',
    };
  }

  if (tone === 'unit') {
    return {
      option: isSelected
        ? 'border-[#59C3A5]/20 bg-[#59C3A5]/10 text-[#59C3A5] dark:border-blue-400/30 dark:bg-blue-400/10 dark:text-blue-100'
        : 'border-transparent text-slate-700 hover:bg-[#59C3A5]/5 dark:text-slate-200 dark:hover:bg-blue-400/10',
      badge: 'bg-[#59C3A5]/10 text-[#59C3A5] ring-[#59C3A5]/15 dark:bg-blue-400/15 dark:text-blue-200 dark:ring-blue-300/20',
    };
  }

  if (tone === 'business') {
    return {
      option: isSelected
        ? 'border-slate-200 bg-slate-50 text-slate-950 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100'
        : 'border-transparent text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800',
      badge: 'bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700',
    };
  }

  return {
    option: isSelected
      ? 'border-slate-200 bg-slate-50 text-slate-950 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100'
      : 'border-transparent text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800',
    badge: 'bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700',
  };
};

function OrganizationSelectField({
  name,
  label,
  value,
  onChange,
  options,
  placeholder,
  required = false,
  error,
  helperText,
  helperTone = 'default',
  disabled = false,
}: {
  name?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<OrganizationOption>;
  placeholder?: string;
  required?: boolean;
  error?: string;
  helperText?: string;
  helperTone?: 'default' | 'warning';
  disabled?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const selectedOption = options.find((option) => option.value === value);
  const canOpen = !disabled && options.length > 0;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [isOpen]);

  useEffect(() => {
    const selectedIndex = options.findIndex((option) => option.value === value);
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
  }, [isOpen, options, value]);

  const selectOption = (option: OrganizationOption) => {
    onChange(option.value);
    setIsOpen(false);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Escape') {
      setIsOpen(false);
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!canOpen) {
        return;
      }
      setIsOpen(true);
      setActiveIndex((current) => (current + 1) % options.length);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!canOpen) {
        return;
      }
      setIsOpen(true);
      setActiveIndex((current) => (current - 1 + options.length) % options.length);
      return;
    }

    if ((event.key === 'Enter' || event.key === ' ') && isOpen && canOpen) {
      event.preventDefault();
      selectOption(options[activeIndex] ?? options[0]);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <label className={modalLabelClassName}>
        {label} {required ? <span className="text-red-500">*</span> : null}
      </label>
      <input type="hidden" name={name} value={value} />
      <button
        type="button"
        onClick={() => {
          if (canOpen) {
            setIsOpen((current) => !current);
          }
        }}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-expanded={isOpen}
        aria-invalid={Boolean(error)}
        className={cn(
          modalControlClassName,
          'flex h-auto min-h-11 items-center justify-between gap-3 text-left',
          !selectedOption && 'text-slate-400',
          disabled && 'cursor-not-allowed bg-slate-50 text-slate-400 dark:bg-slate-800 dark:text-slate-500',
          error && 'border-red-400 focus:border-red-500 focus:ring-red-500/15 dark:border-red-500',
        )}
      >
        <span className="min-w-0">
          <span className="block truncate">
            {selectedOption?.label || placeholder}
          </span>
          {selectedOption?.description ? (
            <span className="mt-0.5 block truncate text-xs font-medium text-slate-500 dark:text-slate-400">
              {selectedOption.description}
            </span>
          ) : null}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {selectedOption?.badge ? (
            <span className={cn(
              'hidden rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] ring-1 sm:inline-flex',
              getOrganizationToneClassNames(selectedOption.tone).badge,
            )}>
              {selectedOption.badge}
            </span>
          ) : null}
          <ChevronDown className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
        </span>
      </button>

      {isOpen && canOpen ? (
        <div className="absolute left-0 right-0 z-[70] mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-900">
          <div className="max-h-72 overflow-y-auto">
            {placeholder ? (
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange('');
                  setIsOpen(false);
                }}
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-transparent px-3 py-2.5 text-left text-sm font-semibold text-slate-500 transition-colors hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <span>{placeholder}</span>
                {!value ? <Check className="h-4 w-4 shrink-0" /> : null}
              </button>
            ) : null}

            {options.map((option, index) => {
              const isSelected = option.value === value;
              const isActive = activeIndex === index;
              const toneClassNames = getOrganizationToneClassNames(option.tone, isSelected);

              return (
                <button
                  key={option.value}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => selectOption(option)}
                  className={cn(
                    'mt-1 flex w-full items-start justify-between gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors first:mt-0',
                    toneClassNames.option,
                    isActive && !isSelected && 'bg-slate-50 dark:bg-slate-800',
                  )}
                >
                  <span className="min-w-0">
                    <span className="block font-semibold">{option.label}</span>
                    {option.description ? (
                      <span className="mt-0.5 block text-xs font-medium leading-5 text-slate-500 dark:text-slate-400">
                        {option.description}
                      </span>
                    ) : null}
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    {option.badge ? (
                      <span className={cn(
                        'rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] ring-1',
                        toneClassNames.badge,
                      )}>
                        {option.badge}
                      </span>
                    ) : null}
                    {isSelected ? <Check className="h-4 w-4 shrink-0" /> : null}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {error ? (
        <HelperText tone="error">{error}</HelperText>
      ) : helperText ? (
        <HelperText tone={helperTone}>{helperText}</HelperText>
      ) : null}
    </div>
  );
}

function AutoAssignedOrganizationField({
  name,
  label,
  value,
  displayValue,
  badge,
  helperText,
}: {
  name: string;
  label: string;
  value: string;
  displayValue: string;
  badge: string;
  helperText: string;
}) {
  return (
    <div>
      <label className={modalLabelClassName}>{label}</label>
      <input type="hidden" name={name} value={value} />
      <div
        className={cn(
          modalControlClassName,
          'flex h-auto min-h-11 items-center justify-between gap-3 bg-[#59C3A5]/5 text-left text-[#59C3A5] dark:bg-blue-400/10 dark:text-blue-100',
        )}
      >
        <span className="min-w-0">
          <span className="block truncate">{displayValue}</span>
          <span className="mt-0.5 block truncate text-xs font-medium text-slate-500 dark:text-slate-400">
            {helperText}
          </span>
        </span>
        <span className="shrink-0 rounded-full bg-[#59C3A5]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#59C3A5] ring-1 ring-[#59C3A5]/15 dark:bg-blue-400/15 dark:text-blue-200 dark:ring-blue-300/20">
          {badge}
        </span>
      </div>
      <HelperText>{helperText}</HelperText>
    </div>
  );
}

function getCreatableOptionCopy(locale: string) {
  if (locale.toLowerCase().startsWith('es')) {
    return {
      add: 'Agregar opción',
      helper: 'Puedes seleccionar una opción o escribir una nueva. Las opciones personalizadas se guardan en este navegador.',
      saved: 'Opción personalizada guardada para futuros colaboradores.',
      suggestedForDepartment: (department: string) =>
        `Puestos sugeridos para ${department}. También puedes escribir uno propio.`,
    };
  }

  return {
    add: 'Add option',
    helper: 'Choose an option or type a new one. Custom options are saved in this browser.',
    saved: 'Custom option saved for future HR users.',
    suggestedForDepartment: (department: string) =>
      `Suggested roles for ${department}. You can still type a custom role.`,
  };
}

function CreatableOptionField({
  name,
  label,
  value,
  onChange,
  options,
  placeholder,
  required = false,
  error,
  helperText,
  onAddOption,
  locale,
}: {
  name?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<string>;
  placeholder?: string;
  required?: boolean;
  error?: string;
  helperText?: string;
  onAddOption: (value: string) => boolean;
  locale: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [feedback, setFeedback] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const copy = getCreatableOptionCopy(locale);
  const normalizedValue = normalizeOptionLabel(value);
  const hasMatchingOption = options.some(
    (option) => option.toLocaleLowerCase() === normalizedValue.toLocaleLowerCase(),
  );
  const canAddCurrentValue = Boolean(normalizedValue) && !hasMatchingOption;
  const filteredOptions = useMemo(() => {
    const searchValue = normalizedValue.toLocaleLowerCase();
    if (!searchValue) {
      return options;
    }

    return options.filter((option) => option.toLocaleLowerCase().includes(searchValue));
  }, [normalizedValue, options]);
  const visibleOptions = filteredOptions.slice(0, 8);
  const actionCount = visibleOptions.length + (canAddCurrentValue ? 1 : 0);

  useEffect(() => {
    if (!feedback) {
      return;
    }

    const timeoutId = window.setTimeout(() => setFeedback(''), 2200);
    return () => window.clearTimeout(timeoutId);
  }, [feedback]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [isOpen]);

  useEffect(() => {
    setActiveIndex(0);
  }, [normalizedValue, isOpen]);

  const commitCustomOption = () => {
    if (!canAddCurrentValue) {
      return;
    }

    if (onAddOption(normalizedValue)) {
      setFeedback(copy.saved);
    }
    onChange(normalizedValue);
    setIsOpen(false);
  };

  const selectOption = (option: string) => {
    onChange(option);
    setIsOpen(false);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setIsOpen(false);
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((current) => (actionCount > 0 ? (current + 1) % actionCount : 0));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((current) => (actionCount > 0 ? (current - 1 + actionCount) % actionCount : 0));
      return;
    }

    if (event.key === 'Enter' && isOpen && actionCount > 0) {
      event.preventDefault();
      if (activeIndex < visibleOptions.length) {
        selectOption(visibleOptions[activeIndex]);
        return;
      }
      commitCustomOption();
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <label className={modalLabelClassName}>
        {label} {required ? <span className="text-red-500">*</span> : null}
      </label>
      <div className="relative">
        <input
          name={name}
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={commitCustomOption}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-expanded={isOpen}
          aria-invalid={Boolean(error)}
          autoComplete="off"
          className={cn(
            modalControlClassName,
            'pr-11',
            error && 'border-red-400 focus:border-red-500 focus:ring-red-500/15 dark:border-red-500',
          )}
        />
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => setIsOpen((current) => !current)}
          className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-[#59C3A5]/10 hover:text-[#59C3A5] dark:text-slate-300 dark:hover:bg-blue-400/10 dark:hover:text-blue-200"
          aria-label={label}
        >
          <ChevronDown className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
        </button>
      </div>

      {isOpen && actionCount > 0 ? (
        <div className="absolute left-0 right-0 z-[70] mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-900">
          <div className="max-h-64 overflow-y-auto">
            {visibleOptions.map((option, index) => {
              const isSelected = option.toLocaleLowerCase() === normalizedValue.toLocaleLowerCase();
              const isActive = activeIndex === index;

              return (
                <button
                  key={option}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectOption(option)}
                  className={cn(
                    'flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors',
                    isActive
                      ? 'bg-[#59C3A5]/10 text-[#59C3A5] dark:bg-blue-400/10 dark:text-blue-200'
                      : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800',
                  )}
                >
                  <span>{option}</span>
                  {isSelected ? <Check className="h-4 w-4 shrink-0" /> : null}
                </button>
              );
            })}

            {canAddCurrentValue ? (
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={commitCustomOption}
                className={cn(
                  'mt-1 flex w-full items-center gap-2 rounded-xl border border-dashed px-3 py-2.5 text-left text-sm font-semibold transition-colors',
                  activeIndex === visibleOptions.length
                    ? 'border-[#59C3A5]/40 bg-[#59C3A5]/10 text-[#59C3A5] dark:border-blue-400/30 dark:bg-blue-400/10 dark:text-blue-200'
                    : 'border-[#59C3A5]/20 bg-[#59C3A5]/5 text-[#59C3A5] hover:bg-[#59C3A5]/10 dark:border-blue-400/20 dark:bg-blue-400/10 dark:text-blue-200',
                )}
              >
                <Plus className="h-4 w-4 shrink-0" />
                <span>{copy.add} "{normalizedValue}"</span>
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {error ? (
        <HelperText tone="error">{error}</HelperText>
      ) : feedback ? (
        <HelperText tone="success">{feedback}</HelperText>
      ) : helperText ? (
        <HelperText>{helperText}</HelperText>
      ) : (
        <HelperText>{copy.helper}</HelperText>
      )}
    </div>
  );
}

function toggleDocumentSlotRemoval(slot: EmployeeDocumentSlot): EmployeeDocumentSlot {
  if (!slot.existingId) {
    return slot;
  }

  return {
    ...slot,
    removeExisting: !slot.removeExisting,
  };
}

export function CreateEmployeeModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  mode = 'create',
  unitOptions,
  businessOptions,
  attendanceLocations = [],
}: EmployeeModalProps) {
  const { currentLanguage } = useLanguage();
  const copy = useEmployeesTranslations().modal;

  const formRef = useRef<HTMLFormElement | null>(null);
  const formDataRef = useRef<EmployeeFormData>(createEmptyEmployeeFormData());
  const localDraftDataRef = useRef<EmployeeFormData | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<EmployeeFormData>(createEmptyEmployeeFormData());
  const [touchedFields, setTouchedFields] = useState<Partial<Record<EmployeeFieldKey, boolean>>>({});
  const [documentErrors, setDocumentErrors] = useState<Partial<Record<EmployeeDocumentType, string>>>({});
  const [statusFeedback, setStatusFeedback] = useState('');
  const [customJobOptions, setCustomJobOptions] = useState<CustomJobOptions>(() => loadCustomJobOptions());
  const modalSteps = useMemo<readonly WizardStep[]>(
    () => copy.steps.map((step, index) => ({
      ...step,
      icon: modalStepIcons[index] ?? User,
    })),
    [copy.steps],
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const nextInitialData = initialData
      ? structuredClone(initialData)
      : localDraftDataRef.current && mode === 'create'
        ? structuredClone(localDraftDataRef.current)
        : createEmptyEmployeeFormData();
    setCurrentStep(1);
    formDataRef.current = nextInitialData;
    setFormData(nextInitialData);
    setTouchedFields({});
    setDocumentErrors({});
    setStatusFeedback('');
  }, [initialData, isOpen, mode]);

  useEffect(() => {
    if (!statusFeedback) {
      return;
    }

    const timeoutId = window.setTimeout(() => setStatusFeedback(''), 2600);
    return () => window.clearTimeout(timeoutId);
  }, [statusFeedback]);

  const jobOptionCopy = useMemo(
    () => getCreatableOptionCopy(currentLanguage.code),
    [currentLanguage.code],
  );
  const departmentOptions = useMemo(
    () => mergeTextOptions(getDepartmentOptionLabels(currentLanguage.code), customJobOptions.departments),
    [currentLanguage.code, customJobOptions.departments],
  );
  const allPositionOptions = useMemo(
    () => getAllPositionLabels(currentLanguage.code),
    [currentLanguage.code],
  );
  const suggestedPositionOptions = useMemo(
    () => getSuggestedPositionsByDepartment(formData.department, currentLanguage.code),
    [currentLanguage.code, formData.department],
  );
  const positionOptions = useMemo(
    () => mergeTextOptions(
      suggestedPositionOptions,
      customJobOptions.positions,
      formData.position ? [formData.position] : [],
    ),
    [customJobOptions.positions, formData.position, suggestedPositionOptions],
  );
  const modalUnitOptions = useMemo(
    () => (unitOptions ?? []).filter((option) => option.value !== 'all' && option.value !== 'all-units'),
    [unitOptions],
  );
  const modalBusinessOptions = useMemo(
    () => (businessOptions ?? []).filter((option) => option.value !== 'all' && option.value !== 'all-businesses'),
    [businessOptions],
  );
  const belongingCopy = useMemo(
    () => getBelongingCopy(currentLanguage.code),
    [currentLanguage.code],
  );
  const selectedUnitOption = useMemo(
    () => modalUnitOptions.find((option) => option.value === formData.businessUnitId) ?? null,
    [formData.businessUnitId, modalUnitOptions],
  );
  const selectedUnitIsCorporateOffice = Boolean(selectedUnitOption && isCorporateOfficeUnitLabel(selectedUnitOption.label));
  const unitOptionsWithBelonging = useMemo<OrganizationOption[]>(() => (
    modalUnitOptions.map((option) => {
      const isCorporateUnit = isCorporateOfficeUnitLabel(option.label);

      return {
        ...option,
        label: isCorporateUnit ? belongingCopy.corporateBusinessBadge : option.label,
        badge: isCorporateUnit ? belongingCopy.corporateUnitBadge : belongingCopy.businessUnitBadge,
        description: isCorporateUnit
          ? belongingCopy.corporateUnitDescription
          : belongingCopy.businessUnitDescription,
        tone: isCorporateUnit ? 'corporate' : 'unit',
      };
    })
  ), [belongingCopy, modalUnitOptions]);
  const filteredBusinessOptions = useMemo<OrganizationOption[]>(() => {
    if (!formData.businessUnitId) {
      return [];
    }

    const selectedUnitLabel = selectedUnitOption?.label ?? '';

    return modalBusinessOptions
      .filter((option) => (
        (option.unitId === formData.businessUnitId || option.unit_id === formData.businessUnitId)
        && (selectedUnitIsCorporateOffice || !isCorporateHeadquartersLabel(option.label))
      ))
      .map((option) => {
        const isCorporateBusiness = isCorporateHeadquartersLabel(option.label);
        const isHeadquartersBusiness = !isCorporateBusiness
          && isUnitHeadquartersLabel(option.label, selectedUnitLabel);
        const tone: OrganizationOptionTone = isCorporateBusiness
          ? 'corporate'
          : isHeadquartersBusiness
            ? 'unit'
            : 'business';

        return {
          ...option,
          badge: isCorporateBusiness
            ? belongingCopy.corporateBusinessBadge
            : isHeadquartersBusiness
              ? belongingCopy.unitHeadquartersBadge
              : belongingCopy.operatingBusinessBadge,
          description: isCorporateBusiness
            ? belongingCopy.corporateBusinessDescription
            : isHeadquartersBusiness
              ? belongingCopy.unitHeadquartersDescription(selectedUnitLabel || option.label)
              : belongingCopy.operatingBusinessDescription,
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
  }, [
    belongingCopy,
    currentLanguage.code,
    formData.businessUnitId,
    modalBusinessOptions,
    selectedUnitIsCorporateOffice,
    selectedUnitOption,
  ]);
  const selectedBusinessOption = useMemo(
    () => filteredBusinessOptions.find((option) => option.value === formData.businessId) ?? null,
    [filteredBusinessOptions, formData.businessId],
  );
  const hasHeadquartersBusinessOption = useMemo(
    () => filteredBusinessOptions.some((option) => option.tone === 'corporate' || option.tone === 'unit'),
    [filteredBusinessOptions],
  );
  const businessBelongingHelper = useMemo(() => {
    if (!formData.businessUnitId) {
      return belongingCopy.selectUnitFirst;
    }

    if (selectedUnitIsCorporateOffice) {
      return belongingCopy.corporateAutoSummary;
    }

    if (selectedUnitOption && selectedBusinessOption) {
      return belongingCopy.belongingSummary(
        selectedUnitOption.label,
        selectedBusinessOption.label,
        selectedBusinessOption.badge ?? '',
      );
    }

    return hasHeadquartersBusinessOption
      ? belongingCopy.businessHelper
      : belongingCopy.noHeadquartersOption;
  }, [
    belongingCopy,
    formData.businessUnitId,
    hasHeadquartersBusinessOption,
    selectedUnitIsCorporateOffice,
    selectedBusinessOption,
    selectedUnitOption,
  ]);
  const businessBelongingHelperTone: 'default' | 'warning' = formData.businessUnitId && !hasHeadquartersBusinessOption
    ? 'warning'
    : 'default';
  const activeAttendanceLocations = useMemo(
    () => attendanceLocations.filter((location) => location.status !== 'inactive'),
    [attendanceLocations],
  );
  const scheduleLocationOptions = useMemo(() => {
    const matchingLocations = activeAttendanceLocations.filter((location) => {
      if (formData.businessId) {
        return String(location.business_id ?? '') === formData.businessId;
      }
      if (formData.businessUnitId) {
        return String(location.unit_id ?? '') === formData.businessUnitId;
      }
      return true;
    });

    return matchingLocations.map((location) => ({
      value: String(location.id),
      label: formatAttendanceLocationOption(location),
    }));
  }, [activeAttendanceLocations, formData.businessId, formData.businessUnitId]);
  const countryOptions = useMemo(
    () => PROFILE_COUNTRY_OPTIONS.map((country) => ({
      value: country.code,
      label: getProfileCountryLabel(country, currentLanguage.code),
    })),
    [currentLanguage.code],
  );

  const resolvedCountry = resolveProfileCountry(formData.registrationCountry);
  const isCreateMode = mode === 'create';

  const addCustomJobOption = (kind: CustomJobOptionKind, value: string) => {
    const normalizedValue = normalizeOptionLabel(value);
    if (!normalizedValue) {
      return false;
    }

    const baseOptions = kind === 'departments' ? departmentOptions : allPositionOptions;
    const existingOptions = mergeTextOptions(baseOptions, customJobOptions[kind]);
    const optionAlreadyExists = existingOptions.some(
      (option) => option.toLocaleLowerCase() === normalizedValue.toLocaleLowerCase(),
    );

    if (optionAlreadyExists) {
      return false;
    }

    let didAddOption = false;
    setCustomJobOptions((current) => {
      const nextOptions = mergeTextOptions(current[kind], [normalizedValue]);
      didAddOption = nextOptions.length !== current[kind].length;
      const next = {
        ...current,
        [kind]: nextOptions,
      };
      saveCustomJobOptions(next);
      return next;
    });

    return didAddOption;
  };

  const persistCurrentJobOptions = (data: EmployeeFormData) => {
    addCustomJobOption('departments', data.department);
    addCustomJobOption('positions', data.position);
  };

  const readDomValue = (nativeFormData: FormData, field: keyof EmployeeFormData) => {
    const value = nativeFormData.get(String(field));
    return typeof value === 'string' ? value : '';
  };

  const hasDomField = (field: keyof EmployeeFormData) =>
    Boolean(formRef.current?.elements.namedItem(String(field)));

  const syncFormDataFromDom = () => {
    const formElement = formRef.current;
    if (!formElement) {
      return formDataRef.current;
    }

    const nativeFormData = new FormData(formElement);
    const currentFormData = formDataRef.current;
    const nextCountryValue = readDomValue(nativeFormData, 'registrationCountry') || currentFormData.registrationCountry;
    const nextCountry = resolveProfileCountry(nextCountryValue);
    const normalizePhone = (value: string) => (
      nextCountry ? normalizePhoneInputForCountry(value, nextCountry) : value
    );

    const nextFormData: EmployeeFormData = {
      ...currentFormData,
      employeeNumber: readDomValue(nativeFormData, 'employeeNumber') || currentFormData.employeeNumber,
      firstName: readDomValue(nativeFormData, 'firstName') || currentFormData.firstName,
      lastName: readDomValue(nativeFormData, 'lastName') || currentFormData.lastName,
      email: readDomValue(nativeFormData, 'email') || currentFormData.email,
      mobilePhone: normalizePhone(readDomValue(nativeFormData, 'mobilePhone') || currentFormData.mobilePhone),
      dateOfBirth: readDomValue(nativeFormData, 'dateOfBirth') || currentFormData.dateOfBirth,
      address: readDomValue(nativeFormData, 'address') || currentFormData.address,
      nationalId: readDomValue(nativeFormData, 'nationalId') || currentFormData.nationalId,
      taxId: readDomValue(nativeFormData, 'taxId') || currentFormData.taxId,
      socialSecurityNumber: readDomValue(nativeFormData, 'socialSecurityNumber') || currentFormData.socialSecurityNumber,
      registrationCountry: nextCountryValue,
      stateProvince: readDomValue(nativeFormData, 'stateProvince') || currentFormData.stateProvince,
      city: readDomValue(nativeFormData, 'city') || currentFormData.city,
      postalCode: readDomValue(nativeFormData, 'postalCode') || currentFormData.postalCode,
      alternatePhone: normalizePhone(readDomValue(nativeFormData, 'alternatePhone') || currentFormData.alternatePhone),
      emergencyContactName:
        readDomValue(nativeFormData, 'emergencyContactName') || currentFormData.emergencyContactName,
      emergencyContactRelationship:
        readDomValue(nativeFormData, 'emergencyContactRelationship') || currentFormData.emergencyContactRelationship,
      emergencyContactPhone:
        normalizePhone(readDomValue(nativeFormData, 'emergencyContactPhone') || currentFormData.emergencyContactPhone),
      department: readDomValue(nativeFormData, 'department') || currentFormData.department,
      position: readDomValue(nativeFormData, 'position') || currentFormData.position,
      businessUnitId: readDomValue(nativeFormData, 'businessUnitId') || currentFormData.businessUnitId,
      businessId: readDomValue(nativeFormData, 'businessId') || currentFormData.businessId,
      hireDate: readDomValue(nativeFormData, 'hireDate') || currentFormData.hireDate,
      scheduleOnHire: hasDomField('scheduleOnHire')
        ? nativeFormData.has('scheduleOnHire')
        : currentFormData.scheduleOnHire,
      scheduleStartDate: readDomValue(nativeFormData, 'scheduleStartDate') || currentFormData.scheduleStartDate,
      scheduleEndDate: readDomValue(nativeFormData, 'scheduleEndDate') || currentFormData.scheduleEndDate,
      scheduleStartTime: readDomValue(nativeFormData, 'scheduleStartTime') || currentFormData.scheduleStartTime,
      scheduleEndTime: readDomValue(nativeFormData, 'scheduleEndTime') || currentFormData.scheduleEndTime,
      scheduleMealMinutes: readDomValue(nativeFormData, 'scheduleMealMinutes') || currentFormData.scheduleMealMinutes,
      scheduleRestMinutes: readDomValue(nativeFormData, 'scheduleRestMinutes') || currentFormData.scheduleRestMinutes,
      scheduleLateAfterMinutes:
        readDomValue(nativeFormData, 'scheduleLateAfterMinutes') || currentFormData.scheduleLateAfterMinutes,
      scheduleBlockAfterGracePeriod: hasDomField('scheduleBlockAfterGracePeriod')
        ? nativeFormData.has('scheduleBlockAfterGracePeriod')
        : currentFormData.scheduleBlockAfterGracePeriod,
      scheduleLocationRule:
        (readDomValue(nativeFormData, 'scheduleLocationRule') as EmployeeFormData['scheduleLocationRule']) || currentFormData.scheduleLocationRule,
      scheduleLocationId: readDomValue(nativeFormData, 'scheduleLocationId') || currentFormData.scheduleLocationId,
      salaryType:
        (readDomValue(nativeFormData, 'salaryType') as EmployeeFormData['salaryType']) || currentFormData.salaryType,
      workdayHours: readDomValue(nativeFormData, 'workdayHours') || currentFormData.workdayHours,
      salary: readDomValue(nativeFormData, 'salary') || currentFormData.salary,
      hourlyRate: readDomValue(nativeFormData, 'hourlyRate') || currentFormData.hourlyRate,
      payPeriod:
        (readDomValue(nativeFormData, 'payPeriod') as EmployeeFormData['payPeriod']) || currentFormData.payPeriod,
      contractType:
        (readDomValue(nativeFormData, 'contractType') as EmployeeFormData['contractType']) || currentFormData.contractType,
      contractStartDate: readDomValue(nativeFormData, 'contractStartDate') || currentFormData.contractStartDate,
      contractEndDate: readDomValue(nativeFormData, 'contractEndDate') || currentFormData.contractEndDate,
    };

    formDataRef.current = nextFormData;
    flushSync(() => {
      setFormData(nextFormData);
    });
    return nextFormData;
  };

  const updateField = <T extends keyof EmployeeFormData>(field: T, value: EmployeeFormData[T]) => {
    setFormData((current) => {
      if (field === 'registrationCountry') {
        const nextCountry = resolveProfileCountry(String(value ?? ''));
        const next = {
          ...current,
          registrationCountry: String(value ?? ''),
          stateProvince: '',
          city: '',
          postalCode: '',
          mobilePhone: nextCountry ? normalizePhoneInputForCountry(current.mobilePhone, nextCountry) : current.mobilePhone,
          alternatePhone: nextCountry ? normalizePhoneInputForCountry(current.alternatePhone, nextCountry) : current.alternatePhone,
          emergencyContactPhone: nextCountry ? normalizePhoneInputForCountry(current.emergencyContactPhone, nextCountry) : current.emergencyContactPhone,
        };
        formDataRef.current = next;
        return next;
      }

      if (field === 'mobilePhone' || field === 'alternatePhone' || field === 'emergencyContactPhone') {
        const next = {
          ...current,
          [field]: resolvedCountry
            ? normalizePhoneInputForCountry(String(value ?? ''), resolvedCountry)
            : String(value ?? ''),
        };
        formDataRef.current = next;
        return next;
      }

      const next = {
        ...current,
        [field]: value,
      };

      if (field === 'businessUnitId') {
        const nextUnitId = String(value ?? '').trim();
        const nextUnit = modalUnitOptions.find((option) => option.value === nextUnitId);
        const corporateOfficeBusiness = modalBusinessOptions.find((option) => (
          (option.unitId === nextUnitId || option.unit_id === nextUnitId)
          && isCorporateHeadquartersLabel(option.label)
        ));
        const currentBusinessMatchesUnit = modalBusinessOptions.some(
          (option) => (
            option.value === current.businessId
            && (option.unitId === nextUnitId || option.unit_id === nextUnitId)
            && !isCorporateHeadquartersLabel(option.label)
          ),
        );

        next.businessId = nextUnit && isCorporateOfficeUnitLabel(nextUnit.label)
          ? corporateOfficeBusiness?.value ?? ''
          : currentBusinessMatchesUnit
            ? current.businessId
            : '';
        next.scheduleLocationId = '';
      }

      if (field === 'businessId') {
        next.scheduleLocationId = '';
      }

      if (field === 'hireDate') {
        const nextHireDate = String(value ?? '').trim();
        if (!current.scheduleStartDate || current.scheduleStartDate === current.hireDate) {
          next.scheduleStartDate = nextHireDate;
        }
        if (!current.scheduleEndDate || current.scheduleEndDate === current.hireDate || current.scheduleEndDate < nextHireDate) {
          next.scheduleEndDate = nextHireDate;
        }
      }

      if (field === 'scheduleOnHire' && value === true && !current.scheduleStartDate) {
        const nextScheduleDate = current.hireDate || dateInputValue();
        next.scheduleStartDate = nextScheduleDate;
        next.scheduleEndDate = current.scheduleEndDate || nextScheduleDate;
      }
      if (field === 'scheduleOnHire' && value === true && current.scheduleStartDate && !current.scheduleEndDate) {
        next.scheduleEndDate = current.scheduleStartDate;
      }

      if (field === 'scheduleStartDate') {
        const nextStartDate = String(value ?? '').trim();
        if (!current.scheduleEndDate || current.scheduleEndDate < nextStartDate) {
          next.scheduleEndDate = nextStartDate;
        }
      }

      if (field === 'scheduleLocationRule' && value !== 'exact') {
        next.scheduleLocationId = '';
      }

      formDataRef.current = next;
      return next;
    });

    if (field in touchedFields) {
      setTouchedFields((current) => ({
        ...current,
        [field as EmployeeFieldKey]: true,
      }));
    }
  };

  useEffect(() => {
    if (!selectedUnitIsCorporateOffice || formData.businessId) {
      return;
    }

    const corporateOfficeBusiness = filteredBusinessOptions.find((option) => option.tone === 'corporate');
    if (corporateOfficeBusiness) {
      updateField('businessId', corporateOfficeBusiness.value);
    }
  }, [filteredBusinessOptions, formData.businessId, selectedUnitIsCorporateOffice]);

  const updateDocumentSlot = (documentType: EmployeeDocumentType, updater: (slot: EmployeeDocumentSlot) => EmployeeDocumentSlot) => {
    setFormData((current) => ({
      ...current,
      documents: {
        ...current.documents,
        [documentType]: updater(current.documents[documentType]),
      },
    }));
  };

  useEffect(() => {
    if (formData.scheduleLocationRule !== 'exact' || !formData.scheduleLocationId) {
      return;
    }

    const locationStillAvailable = scheduleLocationOptions.some((option) => option.value === formData.scheduleLocationId);
    if (!locationStillAvailable) {
      updateField('scheduleLocationId', '');
    }
  }, [formData.scheduleLocationId, formData.scheduleLocationRule, scheduleLocationOptions]);

  const validatePhoneField = (value: string) => {
    if (!value.trim()) {
      return true;
    }

    return resolvedCountry
      ? validatePhoneForProfileCountry(value, resolvedCountry).ok
      : false;
  };

  const populateScheduleValidationErrors = (
    errors: Partial<Record<EmployeeFieldKey, string>>,
    data: EmployeeFormData,
  ) => {
    if (!isCreateMode || !data.scheduleOnHire) {
      return;
    }

    if (!data.scheduleStartDate) {
      errors.scheduleStartDate = copy.validation.required;
    } else if (data.scheduleStartDate < dateInputValue()) {
      errors.scheduleStartDate = copy.validation.scheduleStartPast;
    }
    if (!data.scheduleEndDate) {
      errors.scheduleEndDate = copy.validation.required;
    } else if (data.scheduleStartDate && data.scheduleEndDate < data.scheduleStartDate) {
      errors.scheduleEndDate = copy.validation.scheduleEndBeforeStart;
    }
    if (!data.scheduleStartTime) {
      errors.scheduleStartTime = copy.validation.required;
    }
    if (!data.scheduleEndTime) {
      errors.scheduleEndTime = copy.validation.required;
    } else if (data.scheduleStartTime && data.scheduleEndTime === data.scheduleStartTime) {
      errors.scheduleEndTime = copy.validation.invalidScheduleTime;
    }

    ([
      ['scheduleMealMinutes', data.scheduleMealMinutes],
      ['scheduleRestMinutes', data.scheduleRestMinutes],
      ['scheduleLateAfterMinutes', data.scheduleLateAfterMinutes],
    ] as const).forEach(([field, value]) => {
      const parsed = Number(value);
      if (!String(value).trim() || Number.isNaN(parsed) || parsed < 0) {
        errors[field] = copy.validation.invalidMinutes;
      }
    });

    if (data.scheduleLocationRule === 'exact' && !data.scheduleLocationId) {
      errors.scheduleLocationId = copy.validation.required;
    }
  };

  const validationErrors = useMemo(() => {
    const errors: Partial<Record<EmployeeFieldKey, string>> = {};

    if (!formData.firstName.trim()) {
      errors.firstName = copy.validation.required;
    }
    if (!formData.lastName.trim()) {
      errors.lastName = copy.validation.required;
    }
    if (!formData.email.trim()) {
      errors.email = copy.validation.required;
    } else if (!validateEmail(formData.email).ok) {
      errors.email = copy.validation.invalidEmail;
    }

    if (!formData.mobilePhone.trim()) {
      errors.mobilePhone = copy.validation.required;
    } else if (!validatePhoneField(formData.mobilePhone)) {
      errors.mobilePhone = copy.validation.invalidPhone;
    }

    if (formData.alternatePhone.trim() && !validatePhoneField(formData.alternatePhone)) {
      errors.alternatePhone = copy.validation.invalidPhone;
    }

    if (formData.emergencyContactPhone.trim() && !validatePhoneField(formData.emergencyContactPhone)) {
      errors.emergencyContactPhone = copy.validation.invalidPhone;
    }

    if (!formData.registrationCountry.trim()) {
      errors.registrationCountry = copy.validation.required;
    }
    const postalValidation = validatePostalCodeForCountry(formData.registrationCountry, formData.postalCode);
    if ('message' in postalValidation) {
      errors.postalCode = postalValidation.message;
    }

    if (!formData.department.trim()) {
      errors.department = copy.validation.required;
    }
    if (!formData.position.trim()) {
      errors.position = copy.validation.required;
    }
    if (!formData.businessUnitId.trim()) {
      errors.businessUnitId = copy.validation.required;
    }
    if (!formData.businessId.trim()) {
      errors.businessId = copy.validation.required;
    }

    const parsedHours = Number(formData.workdayHours);
    if (!formData.workdayHours.trim() || Number.isNaN(parsedHours) || parsedHours < 1 || parsedHours > 24) {
      errors.workdayHours = copy.validation.invalidHours;
    }

    if (formData.salaryType === 'daily') {
      const parsedSalary = Number(formData.salary);
      if (!formData.salary.trim() || Number.isNaN(parsedSalary) || parsedSalary <= 0) {
        errors.salary = copy.validation.invalidAmount;
      }
    }

    if (formData.salaryType === 'hourly') {
      const parsedHourlyRate = Number(formData.hourlyRate);
      if (!formData.hourlyRate.trim() || Number.isNaN(parsedHourlyRate) || parsedHourlyRate <= 0) {
        errors.hourlyRate = copy.validation.invalidAmount;
      }
    }

    if (formData.contractType === 'temporary') {
      if (!formData.contractStartDate) {
        errors.contractStartDate = copy.validation.required;
      }
      if (!formData.contractEndDate) {
        errors.contractEndDate = copy.validation.required;
      } else if (
        formData.contractStartDate &&
        new Date(formData.contractEndDate).getTime() < new Date(formData.contractStartDate).getTime()
      ) {
        errors.contractEndDate = copy.validation.contractDates;
      }
    }

    populateScheduleValidationErrors(errors, formData);

    return errors;
  }, [copy.validation, formData, isCreateMode, resolvedCountry]);

  const contractStepFields: EmployeeFieldKey[] =
    formData.contractType === 'temporary'
      ? ['contractStartDate', 'contractEndDate']
      : [];
  const compensationStepFields: EmployeeFieldKey[] =
    formData.salaryType === 'hourly'
      ? ['hourlyRate']
      : ['salary'];
  const scheduleStepFields: EmployeeFieldKey[] =
    isCreateMode && formData.scheduleOnHire
      ? [
        'scheduleStartDate',
        'scheduleEndDate',
        'scheduleStartTime',
        'scheduleEndTime',
        'scheduleMealMinutes',
        'scheduleRestMinutes',
        'scheduleLateAfterMinutes',
        ...(formData.scheduleLocationRule === 'exact' ? ['scheduleLocationId' as const] : []),
      ]
      : [];

  const stepFields: Record<number, EmployeeFieldKey[]> = {
    1: ['firstName', 'lastName', 'email'],
    2: ['registrationCountry', 'postalCode', 'mobilePhone', 'alternatePhone', 'emergencyContactPhone'],
    3: ['department', 'position', 'businessUnitId', 'businessId', 'workdayHours', ...scheduleStepFields, ...compensationStepFields, ...contractStepFields],
    4: [],
  };

  const currentStepFields = stepFields[currentStep] ?? [];

  const markCurrentStepTouched = () => {
    setTouchedFields((current) => {
      const next = { ...current };
      currentStepFields.forEach((field) => {
        next[field] = true;
      });
      return next;
    });
  };

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

  const handleClose = ({ clearDraft = true }: { clearDraft?: boolean } = {}) => {
    if (clearDraft) {
      localDraftDataRef.current = null;
    }
    setCurrentStep(1);
    setTouchedFields({});
    setDocumentErrors({});
    setStatusFeedback('');
    formDataRef.current = createEmptyEmployeeFormData();
    onClose();
  };

  const handleSaveDraft = () => {
    const nextFormData = syncFormDataFromDom();
    localDraftDataRef.current = nextFormData;
    setStatusFeedback(copy.feedback.draftSaved);
    onClose();
  };

  const handleContinue = async () => {
    const nextFormData = syncFormDataFromDom();
    const nextValidationErrors = (() => {
      const errors: Partial<Record<EmployeeFieldKey, string>> = {};
      const nextResolvedCountry = resolveProfileCountry(nextFormData.registrationCountry);
      const validatePhoneValue = (value: string) => (
        !value.trim()
          ? true
          : nextResolvedCountry
            ? validatePhoneForProfileCountry(value, nextResolvedCountry).ok
            : false
      );

      if (!nextFormData.firstName.trim()) {
        errors.firstName = copy.validation.required;
      }
      if (!nextFormData.lastName.trim()) {
        errors.lastName = copy.validation.required;
      }
      if (!nextFormData.email.trim()) {
        errors.email = copy.validation.required;
      } else if (!validateEmail(nextFormData.email).ok) {
        errors.email = copy.validation.invalidEmail;
      }
      if (!nextFormData.mobilePhone.trim()) {
        errors.mobilePhone = copy.validation.required;
      } else if (!validatePhoneValue(nextFormData.mobilePhone)) {
        errors.mobilePhone = copy.validation.invalidPhone;
      }
      if (nextFormData.alternatePhone.trim() && !validatePhoneValue(nextFormData.alternatePhone)) {
        errors.alternatePhone = copy.validation.invalidPhone;
      }
      if (nextFormData.emergencyContactPhone.trim() && !validatePhoneValue(nextFormData.emergencyContactPhone)) {
        errors.emergencyContactPhone = copy.validation.invalidPhone;
      }
      if (!nextFormData.registrationCountry.trim()) {
        errors.registrationCountry = copy.validation.required;
      }
      const postalValidation = validatePostalCodeForCountry(nextFormData.registrationCountry, nextFormData.postalCode);
      if ('message' in postalValidation) {
        errors.postalCode = postalValidation.message;
      }
      if (!nextFormData.department.trim()) {
        errors.department = copy.validation.required;
      }
      if (!nextFormData.position.trim()) {
        errors.position = copy.validation.required;
      }
      if (!nextFormData.businessUnitId.trim()) {
        errors.businessUnitId = copy.validation.required;
      }
      if (!nextFormData.businessId.trim()) {
        errors.businessId = copy.validation.required;
      }

      const parsedHours = Number(nextFormData.workdayHours);
      if (
        !nextFormData.workdayHours.trim() ||
        Number.isNaN(parsedHours) ||
        parsedHours < 1 ||
        parsedHours > 24
      ) {
        errors.workdayHours = copy.validation.invalidHours;
      }

      if (nextFormData.salaryType === 'daily') {
        const parsedSalary = Number(nextFormData.salary);
        if (!nextFormData.salary.trim() || Number.isNaN(parsedSalary) || parsedSalary <= 0) {
          errors.salary = copy.validation.invalidAmount;
        }
      }

      if (nextFormData.salaryType === 'hourly') {
        const parsedHourlyRate = Number(nextFormData.hourlyRate);
        if (
          !nextFormData.hourlyRate.trim() ||
          Number.isNaN(parsedHourlyRate) ||
          parsedHourlyRate <= 0
        ) {
          errors.hourlyRate = copy.validation.invalidAmount;
        }
      }

      if (nextFormData.contractType === 'temporary') {
        if (!nextFormData.contractStartDate) {
          errors.contractStartDate = copy.validation.required;
        }
        if (!nextFormData.contractEndDate) {
          errors.contractEndDate = copy.validation.required;
        } else if (
          nextFormData.contractStartDate &&
          new Date(nextFormData.contractEndDate).getTime() <
            new Date(nextFormData.contractStartDate).getTime()
        ) {
          errors.contractEndDate = copy.validation.contractDates;
        }
      }

      populateScheduleValidationErrors(errors, nextFormData);

      return errors;
    })();

    if (currentStepFields.some((field) => nextValidationErrors[field])) {
      markCurrentStepTouched();
      return;
    }

    persistCurrentJobOptions(nextFormData);

    if (currentStep < modalSteps.length) {
      if (currentStep === 1 && isCreateMode) {
        localDraftDataRef.current = nextFormData;
        setStatusFeedback(copy.feedback.profileStarted);
      }
      setCurrentStep((step) => step + 1);
      return;
    }

    await Promise.resolve(onSave(nextFormData));
    handleClose();
  };

  if (!isOpen) {
    return null;
  }

  const currentStepValid = currentStepFields.every((field) => !validationErrors[field]);
  const progressPercentage = `${(currentStep / modalSteps.length) * 100}%`;
  const primaryButtonLabel = currentStep === 1
    ? copy.buttons.continue
    : currentStep === modalSteps.length
      ? isCreateMode
        ? copy.buttons.createEmployee
        : copy.buttons.save
      : copy.buttons.next;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm">
      <form
        ref={formRef}
        onSubmit={(event) => {
          event.preventDefault();
          void handleContinue();
        }}
        className="flex max-h-[calc(100vh-3rem)] w-full max-w-[900px] flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
      >
        <div className="flex items-start justify-between gap-4 bg-[#59C3A5] px-6 py-4 text-white dark:bg-[#59C3A5]">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white shadow-sm">
              <User className="h-5 w-5" />
            </div>
            <div>
              <div className="mb-1 inline-flex items-center rounded-full border border-white/25 bg-white px-3 py-1 text-xs font-semibold text-[#59C3A5] shadow-sm">
                {copy.stepOf(currentStep, modalSteps.length)}
              </div>
              <h2 className="text-xl font-semibold tracking-tight text-white">
                {mode === 'edit' ? copy.titleEdit : copy.titleCreate}
              </h2>
              <p className="mt-1 max-w-2xl text-sm leading-5 text-white/80">
                {copy.subtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleClose()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white transition-colors hover:bg-white/20"
            aria-label={copy.buttons.closeModal}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <StepProgress
          steps={modalSteps}
          currentStep={currentStep}
          progressLabel={copy.stepOf(currentStep, modalSteps.length)}
          progressPercentage={progressPercentage}
          onStepSelect={(stepId) => {
            if (stepId > currentStep && !currentStepValid) {
              markCurrentStepTouched();
              return;
            }
            setCurrentStep(stepId);
          }}
        />

        <div className="flex-1 overflow-y-auto bg-slate-50/70 px-6 py-6 dark:bg-slate-950/40">
          {statusFeedback ? (
            <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 shadow-sm dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
              {statusFeedback}
            </div>
          ) : null}
          {currentStep === 1 ? (
            <BasicInfoStep
              title={copy.sections.employee}
              description={copy.sections.employeeDescription}
              groups={{
                identity: copy.groups.identity,
                account: copy.groups.account,
              }}
              fields={{
                firstName: (
                  <TextField
                    name="firstName"
                    label={copy.labels.firstName}
                    value={formData.firstName}
                    onChange={(value) => updateField('firstName', value)}
                    placeholder={copy.placeholders.firstName}
                    autoComplete="given-name"
                    required
                    error={touchedFields.firstName ? validationErrors.firstName : undefined}
                  />
                ),
                lastName: (
                  <TextField
                    name="lastName"
                    label={copy.labels.lastName}
                    value={formData.lastName}
                    onChange={(value) => updateField('lastName', value)}
                    placeholder={copy.placeholders.lastName}
                    autoComplete="family-name"
                    required
                    error={touchedFields.lastName ? validationErrors.lastName : undefined}
                  />
                ),
                email: (
                  <TextField
                    name="email"
                    label={copy.labels.email}
                    value={formData.email}
                    onChange={(value) => updateField('email', value)}
                    placeholder={copy.placeholders.email}
                    type="email"
                    autoComplete="email"
                    required
                    error={touchedFields.email ? validationErrors.email : undefined}
                    helperText={copy.helpers.email}
                  />
                ),
              }}
            />
          ) : null}

          {currentStep === 2 ? (
            <ContactStep
              title={copy.sections.contact}
              description={copy.sections.contactDescription}
              groups={{
                location: copy.groups.location,
                phones: copy.groups.phones,
                identifiers: copy.groups.identifiers,
              }}
              fields={{
                location: (
                  <>
                    <ManualLocationFields
                      values={{
                        pais: formData.registrationCountry,
                        estado: formData.stateProvince,
                        ciudad: formData.city,
                        cp: formData.postalCode,
                      }}
                      countries={countryOptions}
                      labels={{
                        country: copy.labels.registrationCountry,
                        selectCountry: copy.placeholders.select,
                        state: copy.labels.stateProvince,
                        city: copy.labels.city,
                        postalCode: copy.labels.postalCode,
                      }}
                      placeholders={{
                        state: copy.placeholders.stateProvince,
                        city: copy.placeholders.city,
                        postalCode: copy.placeholders.postalCode,
                      }}
                      fieldNames={{
                        pais: 'registrationCountry',
                        estado: 'stateProvince',
                        ciudad: 'city',
                        cp: 'postalCode',
                      }}
                      countryError={touchedFields.registrationCountry ? validationErrors.registrationCountry : undefined}
                      controlClassName={modalControlClassName}
                      labelClassName={modalLabelClassName}
                      onChange={(updates) => {
                        const next = {
                          ...formDataRef.current,
                          registrationCountry: updates.pais ?? formDataRef.current.registrationCountry,
                          stateProvince: updates.estado ?? formDataRef.current.stateProvince,
                          city: updates.ciudad ?? formDataRef.current.city,
                          postalCode: updates.cp ?? formDataRef.current.postalCode,
                        };
                        if (updates.pais !== undefined) {
                          const nextCountry = resolveProfileCountry(updates.pais);
                          next.mobilePhone = nextCountry
                            ? normalizePhoneInputForCountry(formDataRef.current.mobilePhone, nextCountry)
                            : formDataRef.current.mobilePhone;
                          next.alternatePhone = nextCountry
                            ? normalizePhoneInputForCountry(formDataRef.current.alternatePhone, nextCountry)
                            : formDataRef.current.alternatePhone;
                          next.emergencyContactPhone = nextCountry
                            ? normalizePhoneInputForCountry(formDataRef.current.emergencyContactPhone, nextCountry)
                            : formDataRef.current.emergencyContactPhone;
                        }
                        formDataRef.current = next;
                        setFormData(next);
                      }}
                    />
                    {touchedFields.postalCode && validationErrors.postalCode ? (
                      <HelperText tone="error">{validationErrors.postalCode}</HelperText>
                    ) : null}
                  </>
                ),
                address: (
                  <TextField
                    name="address"
                    label={copy.labels.address}
                    value={formData.address}
                    onChange={(value) => updateField('address', value)}
                    placeholder={copy.placeholders.address}
                    autoComplete="street-address"
                  />
                ),
                dateOfBirth: (
                  <TextField
                    name="dateOfBirth"
                    label={copy.labels.dateOfBirth}
                    value={formData.dateOfBirth}
                    onChange={(value) => updateField('dateOfBirth', value)}
                    type="date"
                  />
                ),
                mobilePhone: (
                  <TextField
                    name="mobilePhone"
                    label={copy.labels.mobilePhone}
                    value={formData.mobilePhone}
                    onChange={(value) => updateField('mobilePhone', value)}
                    placeholder={copy.placeholders.phone}
                    autoComplete="tel"
                    required
                    error={touchedFields.mobilePhone ? validationErrors.mobilePhone : undefined}
                  />
                ),
                alternatePhone: (
                  <TextField
                    name="alternatePhone"
                    label={copy.labels.alternatePhone}
                    value={formData.alternatePhone}
                    onChange={(value) => updateField('alternatePhone', value)}
                    placeholder={copy.placeholders.phone}
                    error={touchedFields.alternatePhone ? validationErrors.alternatePhone : undefined}
                    helperText={copy.helpers.alternatePhone}
                  />
                ),
                emergencyContactName: (
                  <TextField
                    name="emergencyContactName"
                    label={copy.labels.emergencyContactName}
                    value={formData.emergencyContactName}
                    onChange={(value) => updateField('emergencyContactName', value)}
                    placeholder={copy.placeholders.emergencyContactName}
                  />
                ),
                emergencyContactRelationship: (
                  <TextField
                    name="emergencyContactRelationship"
                    label={copy.labels.emergencyContactRelationship}
                    value={formData.emergencyContactRelationship}
                    onChange={(value) => updateField('emergencyContactRelationship', value)}
                    placeholder={copy.placeholders.emergencyContactRelationship}
                  />
                ),
                emergencyContactPhone: (
                  <TextField
                    name="emergencyContactPhone"
                    label={copy.labels.emergencyContactPhone}
                    value={formData.emergencyContactPhone}
                    onChange={(value) => updateField('emergencyContactPhone', value)}
                    placeholder={copy.placeholders.phone}
                    error={touchedFields.emergencyContactPhone ? validationErrors.emergencyContactPhone : undefined}
                  />
                ),
                nationalId: (
                  <TextField
                    name="nationalId"
                    label={copy.labels.nationalId}
                    value={formData.nationalId}
                    onChange={(value) => updateField('nationalId', value)}
                    placeholder={copy.placeholders.nationalId}
                  />
                ),
                taxId: (
                  <TextField
                    name="taxId"
                    label={copy.labels.taxId}
                    value={formData.taxId}
                    onChange={(value) => updateField('taxId', value)}
                    placeholder={copy.placeholders.taxId}
                    helperText={copy.helpers.taxId}
                  />
                ),
                socialSecurityNumber: (
                  <TextField
                    name="socialSecurityNumber"
                    label={copy.labels.socialSecurityNumber}
                    value={formData.socialSecurityNumber}
                    onChange={(value) => updateField('socialSecurityNumber', value)}
                    placeholder={copy.placeholders.socialSecurityNumber}
                    helperText={copy.helpers.socialSecurityNumber}
                  />
                ),
              }}
            />
          ) : null}

          {currentStep === 3 ? (
            <JobStep
              title={copy.sections.role}
              description={copy.sections.roleDescription}
              groups={{
                role: copy.groups.role,
                organization: copy.groups.organization,
                schedule: copy.groups.schedule,
                compensation: copy.groups.compensation,
                contract: copy.groups.contract,
              }}
              fields={{
                department: (
                  <CreatableOptionField
                    name="department"
                    label={copy.labels.department}
                    value={formData.department}
                    onChange={(value) => updateField('department', value)}
                    options={departmentOptions}
                    placeholder={copy.placeholders.select}
                    required
                    error={touchedFields.department ? validationErrors.department : undefined}
                    onAddOption={(value) => addCustomJobOption('departments', value)}
                    locale={currentLanguage.code}
                  />
                ),
                position: (
                  <CreatableOptionField
                    name="position"
                    label={copy.labels.position}
                    value={formData.position}
                    onChange={(value) => updateField('position', value)}
                    options={positionOptions}
                    placeholder={copy.placeholders.select}
                    required
                    error={touchedFields.position ? validationErrors.position : undefined}
                    helperText={
                      formData.department.trim()
                        ? jobOptionCopy.suggestedForDepartment(formData.department)
                        : undefined
                    }
                    onAddOption={(value) => addCustomJobOption('positions', value)}
                    locale={currentLanguage.code}
                  />
                ),
                businessUnit: (
                  <OrganizationSelectField
                    name="businessUnitId"
                    label={copy.labels.businessUnitId}
                    value={formData.businessUnitId}
                    onChange={(value) => updateField('businessUnitId', value)}
                    options={unitOptionsWithBelonging}
                    placeholder={copy.placeholders.select}
                    required
                    error={touchedFields.businessUnitId ? validationErrors.businessUnitId : undefined}
                    helperText={belongingCopy.businessUnitHelper}
                  />
                ),
                business: (
                  selectedUnitIsCorporateOffice ? (
                    <AutoAssignedOrganizationField
                      name="businessId"
                      label={copy.labels.businessId}
                      value={formData.businessId}
                      displayValue={selectedBusinessOption?.label ?? belongingCopy.corporateBusinessBadge}
                      badge={belongingCopy.autoAssignedBadge}
                      helperText={businessBelongingHelper}
                    />
                  ) : (
                    <OrganizationSelectField
                      name="businessId"
                      label={copy.labels.businessId}
                      value={formData.businessId}
                      onChange={(value) => updateField('businessId', value)}
                      options={filteredBusinessOptions}
                      placeholder={copy.placeholders.select}
                      required
                      error={touchedFields.businessId ? validationErrors.businessId : undefined}
                      helperText={businessBelongingHelper}
                      helperTone={businessBelongingHelperTone}
                      disabled={!formData.businessUnitId}
                    />
                  )
                ),
                hireDate: (
                  <>
                    <TextField
                      name="employeeNumber"
                      label={copy.labels.employeeNumber}
                      value={formData.employeeNumber}
                      onChange={(value) => updateField('employeeNumber', value)}
                      placeholder={copy.placeholders.employeeNumber}
                      helperText={copy.helpers.employeeNumberAuto}
                      readOnly
                    />
                    <TextField
                      name="hireDate"
                      label={copy.labels.hireDate}
                      value={formData.hireDate}
                      onChange={(value) => updateField('hireDate', value)}
                      type="date"
                    />
                  </>
                ),
                schedule: isCreateMode ? (
                  <div className="rounded-[22px] border border-[#59C3A5]/15 bg-[#59C3A5]/5 p-5 dark:border-blue-500/20 dark:bg-blue-500/10">
                    <label className="flex items-start gap-3">
                      <input
                        name="scheduleOnHire"
                        type="checkbox"
                        checked={formData.scheduleOnHire}
                        onChange={(event) => updateField('scheduleOnHire', event.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-[#59C3A5] focus:ring-[#59C3A5]/30 dark:border-slate-600"
                      />
                      <span>
                        <span className="block text-sm font-bold text-slate-900 dark:text-white">
                          {copy.labels.scheduleOnHire}
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-slate-600 dark:text-slate-300">
                          {copy.helpers.scheduleOnHire}
                        </span>
                      </span>
                    </label>

                    {formData.scheduleOnHire ? (
                      <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
                        <TextField
                          name="scheduleStartDate"
                          label={copy.labels.scheduleStartDate}
                          value={formData.scheduleStartDate}
                          onChange={(value) => updateField('scheduleStartDate', value)}
                          type="date"
                          required
                          error={touchedFields.scheduleStartDate ? validationErrors.scheduleStartDate : undefined}
                        />
                        <TextField
                          name="scheduleEndDate"
                          label={copy.labels.scheduleEndDate}
                          value={formData.scheduleEndDate}
                          onChange={(value) => updateField('scheduleEndDate', value)}
                          type="date"
                          required
                          error={touchedFields.scheduleEndDate ? validationErrors.scheduleEndDate : undefined}
                        />
                        <TextField
                          name="scheduleLateAfterMinutes"
                          label={copy.labels.scheduleLateAfterMinutes}
                          value={formData.scheduleLateAfterMinutes}
                          onChange={(value) => updateField('scheduleLateAfterMinutes', value)}
                          placeholder={copy.placeholders.scheduleLateAfterMinutes}
                          type="number"
                          required
                          error={touchedFields.scheduleLateAfterMinutes ? validationErrors.scheduleLateAfterMinutes : undefined}
                        />
                        <TextField
                          name="scheduleStartTime"
                          label={copy.labels.scheduleStartTime}
                          value={formData.scheduleStartTime}
                          onChange={(value) => updateField('scheduleStartTime', value)}
                          type="time"
                          required
                          error={touchedFields.scheduleStartTime ? validationErrors.scheduleStartTime : undefined}
                        />
                        <TextField
                          name="scheduleEndTime"
                          label={copy.labels.scheduleEndTime}
                          value={formData.scheduleEndTime}
                          onChange={(value) => updateField('scheduleEndTime', value)}
                          type="time"
                          required
                          error={touchedFields.scheduleEndTime ? validationErrors.scheduleEndTime : undefined}
                        />
                        <TextField
                          name="scheduleMealMinutes"
                          label={copy.labels.scheduleMealMinutes}
                          value={formData.scheduleMealMinutes}
                          onChange={(value) => updateField('scheduleMealMinutes', value)}
                          placeholder={copy.placeholders.scheduleMealMinutes}
                          type="number"
                          required
                          error={touchedFields.scheduleMealMinutes ? validationErrors.scheduleMealMinutes : undefined}
                        />
                        <TextField
                          name="scheduleRestMinutes"
                          label={copy.labels.scheduleRestMinutes}
                          value={formData.scheduleRestMinutes}
                          onChange={(value) => updateField('scheduleRestMinutes', value)}
                          placeholder={copy.placeholders.scheduleRestMinutes}
                          type="number"
                          required
                          error={touchedFields.scheduleRestMinutes ? validationErrors.scheduleRestMinutes : undefined}
                        />
                        <SelectField
                          name="scheduleLocationRule"
                          label={copy.labels.scheduleLocationRule}
                          value={formData.scheduleLocationRule}
                          onChange={(value) => updateField('scheduleLocationRule', value as EmployeeFormData['scheduleLocationRule'])}
                          options={copy.options.scheduleLocationRules}
                        />
                        {formData.scheduleLocationRule === 'exact' ? (
                          <div>
                            <SelectField
                              name="scheduleLocationId"
                              label={copy.labels.scheduleLocationId}
                              value={formData.scheduleLocationId}
                              onChange={(value) => updateField('scheduleLocationId', value)}
                              options={scheduleLocationOptions}
                              placeholder={copy.placeholders.select}
                              required
                              error={touchedFields.scheduleLocationId ? validationErrors.scheduleLocationId : undefined}
                            />
                            {scheduleLocationOptions.length === 0 ? (
                              <HelperText tone="warning">{copy.helpers.noScheduleLocations}</HelperText>
                            ) : (
                              <HelperText>{copy.helpers.scheduleExactLocation}</HelperText>
                            )}
                          </div>
                        ) : (
                          <p className="self-end rounded-2xl border border-[#59C3A5]/15 bg-white p-3 text-xs leading-5 text-[#59C3A5] dark:border-blue-500/20 dark:bg-slate-900/70 dark:text-blue-200">
                            {copy.helpers.scheduleBusinessLocation}
                          </p>
                        )}
                      </div>
                    ) : null}
                  </div>
                ) : undefined,
                salaryType: (
                  <SelectField
                    name="salaryType"
                    label={copy.labels.salaryType}
                    value={formData.salaryType}
                    onChange={(value) => updateField('salaryType', value as EmployeeFormData['salaryType'])}
                    options={copy.options.salaryTypes}
                  />
                ),
                workdayHours: (
                  <TextField
                    name="workdayHours"
                    label={copy.labels.workdayHours}
                    value={formData.workdayHours}
                    onChange={(value) => updateField('workdayHours', value)}
                    placeholder={copy.placeholders.workdayHours}
                    type="number"
                    required
                    error={touchedFields.workdayHours ? validationErrors.workdayHours : undefined}
                  />
                ),
                compensationAmount: formData.salaryType === 'daily' ? (
                  <TextField
                    name="salary"
                    label={copy.labels.salary}
                    value={formData.salary}
                    onChange={(value) => updateField('salary', value)}
                    placeholder={copy.placeholders.salary}
                    type="number"
                    required
                    error={touchedFields.salary ? validationErrors.salary : undefined}
                  />
                ) : (
                  <TextField
                    name="hourlyRate"
                    label={copy.labels.hourlyRate}
                    value={formData.hourlyRate}
                    onChange={(value) => updateField('hourlyRate', value)}
                    placeholder={copy.placeholders.hourlyRate}
                    type="number"
                    required
                    error={touchedFields.hourlyRate ? validationErrors.hourlyRate : undefined}
                  />
                ),
                payPeriod: (
                  <SelectField
                    name="payPeriod"
                    label={copy.labels.payPeriod}
                    value={formData.payPeriod}
                    onChange={(value) => updateField('payPeriod', value as EmployeeFormData['payPeriod'])}
                    options={copy.options.payPeriods}
                  />
                ),
                contractType: (
                  <SelectField
                    name="contractType"
                    label={copy.labels.contractType}
                    value={formData.contractType}
                    onChange={(value) => updateField('contractType', value as EmployeeFormData['contractType'])}
                    options={copy.options.contractTypes}
                  />
                ),
                contractDates: formData.contractType === 'temporary' ? (
                  <>
                    <TextField
                      name="contractStartDate"
                      label={copy.labels.contractStartDate}
                      value={formData.contractStartDate}
                      onChange={(value) => updateField('contractStartDate', value)}
                      type="date"
                      required
                      error={touchedFields.contractStartDate ? validationErrors.contractStartDate : undefined}
                    />
                    <TextField
                      name="contractEndDate"
                      label={copy.labels.contractEndDate}
                      value={formData.contractEndDate}
                      onChange={(value) => updateField('contractEndDate', value)}
                      type="date"
                      required
                      error={touchedFields.contractEndDate ? validationErrors.contractEndDate : undefined}
                    />
                  </>
                ) : undefined,
              }}
            />
          ) : null}

          {currentStep === 4 ? (
            <DocumentsStep
              title={copy.sections.documents}
              description={copy.helpers.documents}
              documents={DOCUMENT_TYPES.map((documentType) => {
                const slot = formData.documents[documentType];
                const hasCurrentDocument = Boolean(slot.existingId && !slot.removeExisting);
                const isUploaded = Boolean(slot.file || hasCurrentDocument);
                const fileLabel = slot.file?.name ?? slot.existingFileName ?? copy.placeholders.noFile;

                return (
                  <div
                    key={documentType}
                    className="rounded-[22px] border border-slate-200 bg-slate-50/60 p-4 transition-colors hover:border-[#59C3A5]/25 hover:bg-white dark:border-slate-700 dark:bg-slate-900/50 dark:hover:border-blue-500/30 dark:hover:bg-slate-900"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-bold text-slate-900 dark:text-white">
                            {copy.documents[documentType]}
                          </p>
                          <span
                            className={cn(
                              'rounded-full px-2 py-0.5 text-xs font-semibold',
                              isUploaded
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                                : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
                            )}
                          >
                            {isUploaded ? copy.placeholders.fileUploaded : copy.placeholders.noFile}
                          </span>
                        </div>
                        <HelperText>{fileLabel}</HelperText>
                        {slot.removeExisting && !slot.file ? (
                          <HelperText tone="warning">{copy.helpers.documentRemoved}</HelperText>
                        ) : null}
                        {documentErrors[documentType] ? (
                          <HelperText tone="error">{documentErrors[documentType]}</HelperText>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {hasCurrentDocument && slot.existingDownloadUrl ? (
                          <a
                            href={slot.existingDownloadUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-[#59C3A5] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                          >
                            {copy.buttons.viewCurrent}
                          </a>
                        ) : null}
                        {slot.existingId ? (
                          <Button
                            type="button"
                            variant="outline"
                            className="h-10 rounded-xl border-slate-200 bg-white text-slate-700 shadow-none hover:bg-red-50 hover:text-red-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-red-950/30 dark:hover:text-red-300"
                            onClick={() => updateDocumentSlot(documentType, toggleDocumentSlotRemoval)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {slot.removeExisting ? copy.buttons.undoRemove : copy.buttons.removeCurrent}
                          </Button>
                        ) : null}
                        <label className="inline-flex h-10 cursor-pointer items-center rounded-xl bg-[#59C3A5] px-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#3AAE90] dark:bg-blue-600 dark:hover:bg-blue-500">
                          <Upload className="mr-2 h-4 w-4" />
                          {slot.existingId || slot.file ? copy.buttons.replaceFile : copy.buttons.chooseFile}
                          <input
                            type="file"
                            className="hidden"
                            accept=".pdf,image/jpeg,image/png,image/webp"
                            onChange={(event) => handleDocumentSelection(documentType, event.target.files?.[0] ?? null)}
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                );
              })}
            />
          ) : null}

        </div>

        <div className="flex flex-col gap-3 bg-[#59C3A5] px-6 py-3 dark:bg-[#59C3A5] sm:flex-row sm:items-center sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleClose()}
            className={modalOutlineButtonClassName}
          >
            {copy.buttons.cancel}
          </Button>

          <div className="flex flex-wrap items-center gap-3 sm:justify-end">
            {isCreateMode ? (
              <Button
                type="button"
                variant="outline"
                onClick={handleSaveDraft}
                className={modalOutlineButtonClassName}
              >
                {copy.buttons.saveCompleteLater}
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              onClick={() => setCurrentStep((step) => Math.max(1, step - 1))}
              disabled={currentStep === 1}
              className={modalOutlineButtonClassName}
            >
              {copy.buttons.back}
            </Button>
            <Button type="submit" className={modalPrimaryButtonClassName}>
              {primaryButtonLabel}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
