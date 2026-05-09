import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Briefcase,
  FileText,
  Phone,
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

const createDocumentSlot = (documentType: EmployeeDocumentType): EmployeeDocumentSlot => ({
  documentType,
  file: null,
  removeExisting: false,
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
  'h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 shadow-none placeholder:text-slate-400 transition-colors focus:border-[#143675] focus:outline-none focus:ring-2 focus:ring-[#143675]/15 dark:border-slate-600 dark:bg-slate-900/70 dark:text-slate-100 dark:placeholder:text-slate-500';
const modalOutlineButtonClassName =
  'h-10 rounded-xl border-white/30 bg-white/10 px-5 text-white shadow-none hover:bg-white/20 hover:text-white disabled:border-white/20 disabled:bg-white/5 disabled:text-white/50 dark:border-white/25 dark:bg-white/10 dark:text-white dark:hover:bg-white/20';
const modalPrimaryButtonClassName =
  'h-10 rounded-xl bg-white px-5 text-[#143675] shadow-sm hover:bg-slate-100 hover:text-[#143675] focus-visible:ring-white/40 dark:bg-white dark:text-[#143675] dark:hover:bg-slate-100';

const formatAttendanceLocationOption = (location: AttendanceControlLocation) => {
  const scope = location.business_name || location.unit_name || '';
  return scope ? `${location.name} - ${scope}` : location.name;
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

  const departmentOptions = useMemo(
    () => copy.options.departments.map((label) => ({ value: label, label })),
    [copy.options.departments],
  );
  const positionOptions = useMemo(
    () => copy.options.positions.map((label) => ({ value: label, label })),
    [copy.options.positions],
  );
  const modalUnitOptions = useMemo(
    () => (unitOptions ?? []).filter((option) => option.value !== 'all' && option.value !== 'all-units'),
    [unitOptions],
  );
  const modalBusinessOptions = useMemo(
    () => (businessOptions ?? []).filter((option) => option.value !== 'all' && option.value !== 'all-businesses'),
    [businessOptions],
  );
  const filteredBusinessOptions = useMemo(() => {
    if (!formData.businessUnitId) {
      return [];
    }

    return modalBusinessOptions.filter((option) => (
      option.unitId === formData.businessUnitId
      || option.unit_id === formData.businessUnitId
    ));
  }, [formData.businessUnitId, modalBusinessOptions]);
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
        const currentBusinessMatchesUnit = modalBusinessOptions.some(
          (option) => (
            option.value === current.businessId
            && (option.unitId === nextUnitId || option.unit_id === nextUnitId)
          ),
        );

        next.businessId = currentBusinessMatchesUnit ? current.businessId : '';
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
        <div className="flex items-start justify-between gap-4 bg-[#143675] px-6 py-4 text-white dark:bg-[#143675]">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white shadow-sm">
              <User className="h-5 w-5" />
            </div>
            <div>
              <div className="mb-1 inline-flex items-center rounded-full border border-white/25 bg-white px-3 py-1 text-xs font-semibold text-[#143675] shadow-sm">
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
                  <SelectField
                    name="department"
                    label={copy.labels.department}
                    value={formData.department}
                    onChange={(value) => updateField('department', value)}
                    options={departmentOptions}
                    placeholder={copy.placeholders.select}
                    required
                    error={touchedFields.department ? validationErrors.department : undefined}
                  />
                ),
                position: (
                  <SelectField
                    name="position"
                    label={copy.labels.position}
                    value={formData.position}
                    onChange={(value) => updateField('position', value)}
                    options={positionOptions}
                    placeholder={copy.placeholders.select}
                    required
                    error={touchedFields.position ? validationErrors.position : undefined}
                  />
                ),
                businessUnit: (
                  <SelectField
                    name="businessUnitId"
                    label={copy.labels.businessUnitId}
                    value={formData.businessUnitId}
                    onChange={(value) => updateField('businessUnitId', value)}
                    options={modalUnitOptions}
                    placeholder={copy.placeholders.select}
                    required
                    error={touchedFields.businessUnitId ? validationErrors.businessUnitId : undefined}
                  />
                ),
                business: (
                  <SelectField
                    name="businessId"
                    label={copy.labels.businessId}
                    value={formData.businessId}
                    onChange={(value) => updateField('businessId', value)}
                    options={filteredBusinessOptions}
                    placeholder={copy.placeholders.select}
                    required
                    error={touchedFields.businessId ? validationErrors.businessId : undefined}
                  />
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
                  <div className="rounded-[22px] border border-[#143675]/15 bg-[#143675]/5 p-5 dark:border-blue-500/20 dark:bg-blue-500/10">
                    <label className="flex items-start gap-3">
                      <input
                        name="scheduleOnHire"
                        type="checkbox"
                        checked={formData.scheduleOnHire}
                        onChange={(event) => updateField('scheduleOnHire', event.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-[#143675] focus:ring-[#143675]/30 dark:border-slate-600"
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
                          <p className="self-end rounded-2xl border border-[#143675]/15 bg-white p-3 text-xs leading-5 text-[#143675] dark:border-blue-500/20 dark:bg-slate-900/70 dark:text-blue-200">
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
                    className="rounded-[22px] border border-slate-200 bg-slate-50/60 p-4 transition-colors hover:border-[#143675]/25 hover:bg-white dark:border-slate-700 dark:bg-slate-900/50 dark:hover:border-blue-500/30 dark:hover:bg-slate-900"
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
                            className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-[#143675] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
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
                        <label className="inline-flex h-10 cursor-pointer items-center rounded-xl bg-[#143675] px-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#0f2b5f] dark:bg-blue-600 dark:hover:bg-blue-500">
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

        <div className="flex flex-col gap-3 bg-[#143675] px-6 py-3 dark:bg-[#143675] sm:flex-row sm:items-center sm:justify-between">
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
