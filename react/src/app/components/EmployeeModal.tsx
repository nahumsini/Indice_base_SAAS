import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Briefcase,
  FileText,
  Phone,
  Shield,
  Trash2,
  Upload,
  User,
  X,
} from 'lucide-react';
import { Button } from './ui/button';
import { useLanguage } from '../shared/context';
import { flushSync } from 'react-dom';
import {
  PROFILE_COUNTRY_OPTIONS,
  getProfileCountryLabel,
  resolveProfileCountry,
  type ProfileCountry,
} from '../shared/profileCountries';
import { validateEmail } from '../shared/validation/email';
import {
  normalizePhoneInputForCountry,
  validatePhoneForProfileCountry,
} from '../shared/validation/phone';

export type EmployeeDocumentType =
  | 'birth_certificate'
  | 'government_id'
  | 'proof_of_address'
  | 'resume'
  | 'profile_photo';

export type EmployeeAccessRole =
  | 'employee'
  | 'coordinator'
  | 'manager'
  | 'administrator';

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
  alternatePhone: string;
  emergencyContactName: string;
  emergencyContactRelationship: string;
  emergencyContactPhone: string;
  department: string;
  position: string;
  businessUnitId: string;
  businessId: string;
  hireDate: string;
  salaryType: 'daily' | 'hourly';
  workdayHours: string;
  salary: string;
  hourlyRate: string;
  payPeriod: 'weekly' | 'biweekly' | 'monthly';
  contractType: 'permanent' | 'temporary';
  contractStartDate: string;
  contractEndDate: string;
  accessRole: EmployeeAccessRole;
  inviteOnSave: boolean;
  invitationStatus: 'not_invited' | 'pending' | 'linked';
  linkedUserName: string;
  linkedUserEmail: string;
  documents: Record<EmployeeDocumentType, EmployeeDocumentSlot>;
}

interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: EmployeeFormData) => void | Promise<void>;
  initialData?: EmployeeFormData | null;
  mode?: 'create' | 'edit';
  unitOptions?: Array<{ value: string; label: string }>;
  businessOptions?: Array<{ value: string; label: string }>;
}

type EmployeeFieldKey =
  | 'firstName'
  | 'lastName'
  | 'email'
  | 'mobilePhone'
  | 'registrationCountry'
  | 'alternatePhone'
  | 'emergencyContactPhone'
  | 'department'
  | 'position'
  | 'businessUnitId'
  | 'businessId'
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

const SUPPORTED_DOCUMENT_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]);
const MAX_DOCUMENT_SIZE_BYTES = 5 * 1024 * 1024;

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
  alternatePhone: '',
  emergencyContactName: '',
  emergencyContactRelationship: '',
  emergencyContactPhone: '',
  department: '',
  position: '',
  businessUnitId: '',
  businessId: '',
  hireDate: '',
  salaryType: 'daily',
  workdayHours: '8',
  salary: '',
  hourlyRate: '',
  payPeriod: 'weekly',
  contractType: 'permanent',
  contractStartDate: '',
  contractEndDate: '',
  accessRole: 'employee',
  inviteOnSave: false,
  invitationStatus: 'not_invited',
  linkedUserName: '',
  linkedUserEmail: '',
  documents: {
    birth_certificate: createDocumentSlot('birth_certificate'),
    government_id: createDocumentSlot('government_id'),
    proof_of_address: createDocumentSlot('proof_of_address'),
    resume: createDocumentSlot('resume'),
    profile_photo: createDocumentSlot('profile_photo'),
  },
});

const modalCopy = {
  en: {
    titleCreate: 'Add employee',
    titleEdit: 'Edit employee',
    subtitle:
      'Create the complete HR profile, contact data, assignment, documents, and portal access in one flow.',
    steps: [
      { id: 1, label: 'Employee', icon: User },
      { id: 2, label: 'Contact', icon: Phone },
      { id: 3, label: 'Role', icon: Briefcase },
      { id: 4, label: 'Documents', icon: FileText },
      { id: 5, label: 'Permissions', icon: Shield },
    ],
    buttons: {
      cancel: 'Cancel',
      back: 'Back',
      next: 'Next',
      save: 'Save',
      chooseFile: 'Choose file',
      replaceFile: 'Replace file',
      removeCurrent: 'Remove current',
      undoRemove: 'Undo remove',
      viewCurrent: 'View current',
    },
    sections: {
      employee: 'Employee information',
      contact: 'Contact details',
      role: 'Position and compensation',
      documents: 'Employee documents',
      permissions: 'Portal access',
    },
    labels: {
      employeeNumber: 'Employee number',
      firstName: 'First name',
      lastName: 'Last name',
      email: 'Email address',
      dateOfBirth: 'Date of birth',
      address: 'Address',
      nationalId: 'National ID',
      taxId: 'Tax ID',
      socialSecurityNumber: 'Social security number',
      registrationCountry: 'Registration country',
      stateProvince: 'Province / State',
      mobilePhone: 'Mobile phone',
      alternatePhone: 'Alternate phone',
      emergencyContactName: 'Emergency contact name',
      emergencyContactRelationship: 'Relationship',
      emergencyContactPhone: 'Emergency contact phone',
      department: 'Department',
      position: 'Position',
      businessUnitId: 'Business unit',
      businessId: 'Business',
      hireDate: 'Hire date',
      salaryType: 'Salary type',
      workdayHours: 'Workday hours',
      salary: 'Salary',
      hourlyRate: 'Hourly wage',
      payPeriod: 'Pay period',
      contractType: 'Contract type',
      contractStartDate: 'Contract start date',
      contractEndDate: 'Contract end date',
      accessRole: 'Access role',
      inviteOnSave: 'Send invitation after save',
      linkedAccount: 'Linked account',
      invitationStatus: 'Invitation status',
    },
    helpers: {
      email: 'If no account exists, we can send an invitation to connect the employee later in the flow.',
      employeeNumberAuto: 'Generated automatically when the employee is saved.',
      alternatePhone: 'Optional. Useful if the primary mobile phone is unavailable.',
      documents: 'Allowed formats: PDF, JPG, PNG, WEBP. Maximum 5MB per file.',
      role:
        'Permissions are summarized below and aligned to the selected access role.',
      linked: 'Already linked to an existing user account.',
      pending: 'Invitation is pending for this employee email.',
      notInvited: 'No invitation has been sent yet.',
      documentRemoved: 'The current document will be deleted when you save.',
    },
    placeholders: {
      employeeNumber: 'Auto-generated on save',
      firstName: 'e.g. John',
      lastName: 'e.g. Perez Ramirez',
      email: 'name@email.com',
      address: 'Street, number, city, state, ZIP code',
      nationalId: 'e.g. GARC800101HDFRNN09',
      taxId: 'e.g. GARR800101ABC',
      socialSecurityNumber: 'e.g. 12345678901',
      phone: 'e.g. 4165551234',
      emergencyContactName: 'e.g. Maria Perez',
      emergencyContactRelationship: 'e.g. Spouse',
      stateProvince: 'e.g. Ontario',
      workdayHours: 'e.g. 8',
      salary: 'e.g. 12000.00',
      hourlyRate: 'e.g. 75.00',
      select: 'Select...',
      noFile: 'No file selected',
    },
    options: {
      departments: ['Operations', 'Administration', 'Sales', 'Human Resources'],
      positions: ['Room attendant', 'Coordinator', 'Maintenance', 'Laundry'],
      salaryTypes: [
        { value: 'daily', label: 'Daily salary' },
        { value: 'hourly', label: 'Hourly salary' },
      ],
      payPeriods: [
        { value: 'weekly', label: 'Weekly' },
        { value: 'biweekly', label: 'Biweekly' },
        { value: 'monthly', label: 'Monthly' },
      ],
      contractTypes: [
        { value: 'permanent', label: 'Permanent' },
        { value: 'temporary', label: 'Temporary' },
      ],
      accessRoles: [
        { value: 'employee', label: 'Employee' },
        { value: 'coordinator', label: 'Coordinator' },
        { value: 'manager', label: 'Manager' },
        { value: 'administrator', label: 'Administrator' },
      ],
    },
    permissionsByRole: {
      employee: ['View attendance', 'Register clock in / out', 'View personal payroll', 'Update own profile'],
      coordinator: ['Everything in Employee', 'Review attendance', 'View team information', 'Support schedule follow-up'],
      manager: ['Everything in Coordinator', 'Approve corrections', 'Review broader payroll context', 'Manage team assignments'],
      administrator: ['Everything in Manager', 'Full HR visibility', 'Manage employee access roles', 'Oversee documents and setup'],
    },
    documents: {
      birth_certificate: 'Birth certificate',
      government_id: 'Government ID',
      proof_of_address: 'Proof of address',
      resume: 'Resume',
      profile_photo: 'Profile photo',
    },
    validation: {
      required: 'This field is required.',
      invalidEmail: 'Enter a valid email address.',
      invalidPhone: 'Enter a valid phone number.',
      invalidHours: 'Workday hours must be between 1 and 24.',
      invalidAmount: 'Enter an amount greater than zero.',
      contractDates: 'Contract end date must be the same as or after the start date.',
      documentType: 'Only PDF, JPG, PNG, or WEBP files are allowed.',
      documentSize: 'Each file must be 5MB or smaller.',
    },
    stepOf: (current: number, total: number) => `Step ${current} of ${total}`,
  },
  es: {
    titleCreate: 'Agregar colaborador',
    titleEdit: 'Editar colaborador',
    subtitle:
      'Crea el perfil completo de RH, contacto, asignación, documentos y acceso al portal en un solo flujo.',
    steps: [
      { id: 1, label: 'Colaborador', icon: User },
      { id: 2, label: 'Contacto', icon: Phone },
      { id: 3, label: 'Puesto', icon: Briefcase },
      { id: 4, label: 'Documentos', icon: FileText },
      { id: 5, label: 'Permisos', icon: Shield },
    ],
    buttons: {
      cancel: 'Cancelar',
      back: 'Atrás',
      next: 'Siguiente',
      save: 'Guardar',
      chooseFile: 'Seleccionar archivo',
      replaceFile: 'Reemplazar archivo',
      removeCurrent: 'Eliminar actual',
      undoRemove: 'Deshacer',
      viewCurrent: 'Ver actual',
    },
    sections: {
      employee: 'Información del colaborador',
      contact: 'Datos de contacto',
      role: 'Puesto y compensación',
      documents: 'Documentos del colaborador',
      permissions: 'Acceso al portal',
    },
    labels: {
      employeeNumber: 'Número de colaborador',
      firstName: 'Nombre',
      lastName: 'Apellidos',
      email: 'Correo electrónico',
      dateOfBirth: 'Fecha de nacimiento',
      address: 'Dirección',
      nationalId: 'Identificación nacional',
      taxId: 'RFC',
      socialSecurityNumber: 'NSS',
      registrationCountry: 'País de registro',
      stateProvince: 'Provincia / Estado',
      mobilePhone: 'Teléfono móvil',
      alternatePhone: 'Teléfono alterno',
      emergencyContactName: 'Nombre del contacto',
      emergencyContactRelationship: 'Relación',
      emergencyContactPhone: 'Teléfono de emergencia',
      department: 'Departamento',
      position: 'Puesto',
      businessUnitId: 'Unidad de negocio',
      businessId: 'Negocio',
      hireDate: 'Fecha de ingreso',
      salaryType: 'Tipo de salario',
      workdayHours: 'Horas de jornada',
      salary: 'Salario',
      hourlyRate: 'Sueldo por hora',
      payPeriod: 'Periodo de pago',
      contractType: 'Tipo de contrato',
      contractStartDate: 'Inicio de contrato',
      contractEndDate: 'Fin de contrato',
      accessRole: 'Rol de acceso',
      inviteOnSave: 'Enviar invitación al guardar',
      linkedAccount: 'Cuenta vinculada',
      invitationStatus: 'Estado de la invitación',
    },
    helpers: {
      email: 'Si no existe una cuenta, podemos enviar una invitación para conectar al colaborador más adelante en el flujo.',
      employeeNumberAuto: 'Se genera automáticamente cuando se guarda el colaborador.',
      alternatePhone: 'Opcional. Útil si el teléfono principal no está disponible.',
      documents: 'Formatos permitidos: PDF, JPG, PNG, WEBP. Máximo 5MB por archivo.',
      role: 'Los permisos se resumen abajo y se alinean al rol de acceso seleccionado.',
      linked: 'Ya está vinculado a una cuenta existente.',
      pending: 'Hay una invitación pendiente para este correo.',
      notInvited: 'Aún no se ha enviado invitación.',
      documentRemoved: 'El documento actual se eliminará al guardar.',
    },
    placeholders: {
      employeeNumber: 'Se genera al guardar',
      firstName: 'Ej. Juan',
      lastName: 'Ej. Pérez Ramírez',
      email: 'nombre@correo.com',
      address: 'Calle, número, ciudad, estado, CP',
      nationalId: 'Ej. GARC800101HDFRNN09',
      taxId: 'Ej. GARR800101ABC',
      socialSecurityNumber: 'Ej. 12345678901',
      phone: 'Ej. 5512345678',
      emergencyContactName: 'Ej. María Pérez',
      emergencyContactRelationship: 'Ej. Esposa',
      stateProvince: 'Ej. Ciudad de México',
      workdayHours: 'Ej. 8',
      salary: 'Ej. 12000.00',
      hourlyRate: 'Ej. 75.00',
      select: 'Selecciona...',
      noFile: 'Ningún archivo seleccionado',
    },
    options: {
      departments: ['Operaciones', 'Administración', 'Ventas', 'Recursos Humanos'],
      positions: ['Camarista', 'Coordinador', 'Mantenimiento', 'Lavandería'],
      salaryTypes: [
        { value: 'daily', label: 'Salario por día' },
        { value: 'hourly', label: 'Salario por hora' },
      ],
      payPeriods: [
        { value: 'weekly', label: 'Semanal' },
        { value: 'biweekly', label: 'Quincenal' },
        { value: 'monthly', label: 'Mensual' },
      ],
      contractTypes: [
        { value: 'permanent', label: 'Permanente' },
        { value: 'temporary', label: 'Temporal' },
      ],
      accessRoles: [
        { value: 'employee', label: 'Colaborador' },
        { value: 'coordinator', label: 'Coordinador' },
        { value: 'manager', label: 'Gerente' },
        { value: 'administrator', label: 'Administrador' },
      ],
    },
    permissionsByRole: {
      employee: ['Ver asistencia', 'Registrar entrada / salida', 'Ver nómina personal', 'Actualizar su perfil'],
      coordinator: ['Todo lo del colaborador', 'Revisar asistencia', 'Ver información del equipo', 'Dar seguimiento a horarios'],
      manager: ['Todo lo del coordinador', 'Aprobar correcciones', 'Revisar contexto de nómina', 'Gestionar asignaciones'],
      administrator: ['Todo lo del gerente', 'Visibilidad total de RH', 'Gestionar accesos del personal', 'Supervisar documentos y configuración'],
    },
    documents: {
      birth_certificate: 'Acta de nacimiento',
      government_id: 'Identificación oficial',
      proof_of_address: 'Comprobante de domicilio',
      resume: 'CV',
      profile_photo: 'Foto de perfil',
    },
    validation: {
      required: 'Este campo es obligatorio.',
      invalidEmail: 'Ingresa un correo válido.',
      invalidPhone: 'Ingresa un teléfono válido.',
      invalidHours: 'Las horas de jornada deben estar entre 1 y 24.',
      invalidAmount: 'Ingresa un monto mayor a cero.',
      contractDates: 'La fecha de fin debe ser igual o posterior a la de inicio.',
      documentType: 'Solo se permiten archivos PDF, JPG, PNG o WEBP.',
      documentSize: 'Cada archivo debe ser de 5MB o menos.',
    },
    stepOf: (current: number, total: number) => `Paso ${current} de ${total}`,
  },
} as const;

const inputClassName =
  'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white';

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
      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
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
        className={`${inputClassName} ${readOnly ? 'bg-gray-50 text-gray-500 dark:bg-gray-800 dark:text-gray-300' : ''} ${error ? 'border-red-400 focus:ring-red-500 dark:border-red-500' : ''}`}
      />
      {error ? (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>
      ) : helperText ? (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{helperText}</p>
      ) : null}
    </div>
  );
}

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
      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label} {required ? <span className="text-red-500">*</span> : null}
      </label>
      <select
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        className={`${inputClassName} ${error ? 'border-red-400 focus:ring-red-500 dark:border-red-500' : ''}`}
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p> : null}
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

export function EmployeeModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  mode = 'create',
  unitOptions,
  businessOptions,
}: EmployeeModalProps) {
  const { currentLanguage } = useLanguage();
  const copy = currentLanguage.code.startsWith('es') ? modalCopy.es : modalCopy.en;

  const formRef = useRef<HTMLFormElement | null>(null);
  const formDataRef = useRef<EmployeeFormData>(createEmptyEmployeeFormData());
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<EmployeeFormData>(createEmptyEmployeeFormData());
  const [touchedFields, setTouchedFields] = useState<Partial<Record<EmployeeFieldKey, boolean>>>({});
  const [documentErrors, setDocumentErrors] = useState<Partial<Record<EmployeeDocumentType, string>>>({});

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const nextInitialData = initialData ? structuredClone(initialData) : createEmptyEmployeeFormData();
    setCurrentStep(1);
    formDataRef.current = nextInitialData;
    setFormData(nextInitialData);
    setTouchedFields({});
    setDocumentErrors({});
  }, [initialData, isOpen]);

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
  const countryOptions = useMemo(
    () => PROFILE_COUNTRY_OPTIONS.map((country) => ({
      value: country.code,
      label: getProfileCountryLabel(country, currentLanguage.code),
    })),
    [currentLanguage.code],
  );

  const resolvedCountry = resolveProfileCountry(formData.registrationCountry);

  const readDomValue = (nativeFormData: FormData, field: keyof EmployeeFormData) => {
    const value = nativeFormData.get(String(field));
    return typeof value === 'string' ? value : '';
  };

  const syncFormDataFromDom = () => {
    const formElement = formRef.current;
    if (!formElement) {
      return formDataRef.current;
    }

    const nativeFormData = new FormData(formElement);
    const currentFormData = formDataRef.current;
    const nextCountryValue = readDomValue(nativeFormData, 'registrationCountry') || currentFormData.registrationCountry;
    const nextCountry = resolveProfileCountry(nextCountryValue);
    const normalizePhone = (value: string) =>
      nextCountry ? normalizePhoneInputForCountry(value, nextCountry) : value;

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
      accessRole:
        (readDomValue(nativeFormData, 'accessRole') as EmployeeAccessRole) || currentFormData.accessRole,
      inviteOnSave: nativeFormData.has('inviteOnSave'),
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

  const validatePhoneField = (value: string) => {
    if (!value.trim()) {
      return true;
    }

    if (resolvedCountry) {
      return validatePhoneForProfileCountry(value, resolvedCountry).ok;
    }

    if (!/^[\d\s()+-]+$/.test(value)) {
      return false;
    }

    const digits = value.replace(/\D/g, '');
    return digits.length >= 7 && digits.length <= 15;
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

    return errors;
  }, [copy.validation, formData, resolvedCountry]);

  const contractStepFields: EmployeeFieldKey[] =
    formData.contractType === 'temporary'
      ? ['contractStartDate', 'contractEndDate']
      : [];
  const compensationStepFields: EmployeeFieldKey[] =
    formData.salaryType === 'hourly'
      ? ['hourlyRate']
      : ['salary'];

  const stepFields: Record<number, EmployeeFieldKey[]> = {
    1: ['firstName', 'lastName', 'email'],
    2: ['registrationCountry', 'mobilePhone', 'alternatePhone', 'emergencyContactPhone'],
    3: ['department', 'position', 'businessUnitId', 'businessId', 'workdayHours', ...compensationStepFields, ...contractStepFields],
    4: [],
    5: [],
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

  const handleClose = () => {
    setCurrentStep(1);
    setTouchedFields({});
    setDocumentErrors({});
    formDataRef.current = createEmptyEmployeeFormData();
    onClose();
  };

  const handleContinue = async () => {
    const nextFormData = syncFormDataFromDom();
    const nextValidationErrors = (() => {
      const errors: Partial<Record<EmployeeFieldKey, string>> = {};
      const nextResolvedCountry = resolveProfileCountry(nextFormData.registrationCountry);
      const validatePhoneValue = (value: string) => {
        if (!value.trim()) {
          return true;
        }

        if (nextResolvedCountry) {
          return validatePhoneForProfileCountry(value, nextResolvedCountry).ok;
        }

        if (!/^[\d\s()+-]+$/.test(value)) {
          return false;
        }

        const digits = value.replace(/\D/g, '');
        return digits.length >= 7 && digits.length <= 15;
      };

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

      return errors;
    })();

    if (currentStepFields.some((field) => nextValidationErrors[field])) {
      markCurrentStepTouched();
      return;
    }

    if (currentStep < copy.steps.length) {
      setCurrentStep((step) => step + 1);
      return;
    }

    await Promise.resolve(onSave(nextFormData));
    handleClose();
  };

  if (!isOpen) {
    return null;
  }

  const currentPermissions = copy.permissionsByRole[formData.accessRole];
  const currentStepValid = currentStepFields.every((field) => !validationErrors[field]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6 backdrop-blur-sm">
      <form
        ref={formRef}
        onSubmit={(event) => {
          event.preventDefault();
          void handleContinue();
        }}
        className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-gray-800"
      >
        <div className="flex items-center justify-between bg-[#143675] px-6 py-4 dark:bg-[#0f2855]">
          <div>
            <h2 className="text-xl font-semibold text-white">
              {mode === 'edit' ? copy.titleEdit : copy.titleCreate}
            </h2>
            <p className="mt-1 text-sm text-white/80">{copy.subtitle}</p>
          </div>
          <button type="button" onClick={handleClose} className="text-white/80 transition-colors hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {copy.steps.map((step) => {
              const StepIcon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;

              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => {
                    if (step.id > currentStep && !currentStepValid) {
                      markCurrentStepTouched();
                      return;
                    }
                    setCurrentStep(step.id);
                  }}
                  className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                    isActive
                      ? 'border-blue-300 bg-blue-100 text-blue-700 dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                      : isCompleted
                        ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400'
                        : 'border-gray-200 bg-gray-100 text-gray-600 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400'
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : isCompleted
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-400 text-white'
                    }`}
                  >
                    {step.id}
                  </span>
                  <StepIcon className="h-4 w-4" />
                  {step.label}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {copy.stepOf(currentStep, copy.steps.length)}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {currentStep === 1 ? (
            <div className="space-y-6">
              <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
                <User className="h-4 w-4" />
                {copy.sections.employee}
              </h3>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                  name="dateOfBirth"
                  label={copy.labels.dateOfBirth}
                  value={formData.dateOfBirth}
                  onChange={(value) => updateField('dateOfBirth', value)}
                  type="date"
                />
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
                <div className="md:col-span-2">
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
                </div>
                <div className="md:col-span-2">
                  <TextField
                    name="address"
                    label={copy.labels.address}
                    value={formData.address}
                    onChange={(value) => updateField('address', value)}
                    placeholder={copy.placeholders.address}
                    autoComplete="street-address"
                  />
                </div>
                <TextField
                  name="nationalId"
                  label={copy.labels.nationalId}
                  value={formData.nationalId}
                  onChange={(value) => updateField('nationalId', value)}
                  placeholder={copy.placeholders.nationalId}
                />
                <TextField
                  name="taxId"
                  label={copy.labels.taxId}
                  value={formData.taxId}
                  onChange={(value) => updateField('taxId', value)}
                  placeholder={copy.placeholders.taxId}
                />
                <TextField
                  name="socialSecurityNumber"
                  label={copy.labels.socialSecurityNumber}
                  value={formData.socialSecurityNumber}
                  onChange={(value) => updateField('socialSecurityNumber', value)}
                  placeholder={copy.placeholders.socialSecurityNumber}
                />
              </div>
            </div>
          ) : null}

          {currentStep === 2 ? (
            <div className="space-y-6">
              <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
                <Phone className="h-4 w-4" />
                {copy.sections.contact}
              </h3>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <SelectField
                  name="registrationCountry"
                  label={copy.labels.registrationCountry}
                  value={formData.registrationCountry}
                  onChange={(value) => updateField('registrationCountry', value)}
                  options={countryOptions}
                  placeholder={copy.placeholders.select}
                  required
                  error={touchedFields.registrationCountry ? validationErrors.registrationCountry : undefined}
                />
                <TextField
                  name="stateProvince"
                  label={copy.labels.stateProvince}
                  value={formData.stateProvince}
                  onChange={(value) => updateField('stateProvince', value)}
                  placeholder={copy.placeholders.stateProvince}
                  autoComplete="address-level1"
                />
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
                <TextField
                  name="alternatePhone"
                  label={copy.labels.alternatePhone}
                  value={formData.alternatePhone}
                  onChange={(value) => updateField('alternatePhone', value)}
                  placeholder={copy.placeholders.phone}
                  error={touchedFields.alternatePhone ? validationErrors.alternatePhone : undefined}
                  helperText={copy.helpers.alternatePhone}
                />
                <TextField
                  name="emergencyContactName"
                  label={copy.labels.emergencyContactName}
                  value={formData.emergencyContactName}
                  onChange={(value) => updateField('emergencyContactName', value)}
                  placeholder={copy.placeholders.emergencyContactName}
                />
                <TextField
                  name="emergencyContactRelationship"
                  label={copy.labels.emergencyContactRelationship}
                  value={formData.emergencyContactRelationship}
                  onChange={(value) => updateField('emergencyContactRelationship', value)}
                  placeholder={copy.placeholders.emergencyContactRelationship}
                />
                <TextField
                  name="emergencyContactPhone"
                  label={copy.labels.emergencyContactPhone}
                  value={formData.emergencyContactPhone}
                  onChange={(value) => updateField('emergencyContactPhone', value)}
                  placeholder={copy.placeholders.phone}
                  error={touchedFields.emergencyContactPhone ? validationErrors.emergencyContactPhone : undefined}
                />
              </div>
            </div>
          ) : null}

          {currentStep === 3 ? (
            <div className="space-y-6">
              <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
                <Briefcase className="h-4 w-4" />
                {copy.sections.role}
              </h3>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                <SelectField
                  name="businessId"
                  label={copy.labels.businessId}
                  value={formData.businessId}
                  onChange={(value) => updateField('businessId', value)}
                  options={modalBusinessOptions}
                  placeholder={copy.placeholders.select}
                  required
                  error={touchedFields.businessId ? validationErrors.businessId : undefined}
                />
                <TextField
                  name="hireDate"
                  label={copy.labels.hireDate}
                  value={formData.hireDate}
                  onChange={(value) => updateField('hireDate', value)}
                  type="date"
                />
                <SelectField
                  name="salaryType"
                  label={copy.labels.salaryType}
                  value={formData.salaryType}
                  onChange={(value) => updateField('salaryType', value as EmployeeFormData['salaryType'])}
                  options={copy.options.salaryTypes}
                />
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
                {formData.salaryType === 'daily' ? (
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
                )}
                <SelectField
                  name="payPeriod"
                  label={copy.labels.payPeriod}
                  value={formData.payPeriod}
                  onChange={(value) => updateField('payPeriod', value as EmployeeFormData['payPeriod'])}
                  options={copy.options.payPeriods}
                />
                <SelectField
                  name="contractType"
                  label={copy.labels.contractType}
                  value={formData.contractType}
                  onChange={(value) => updateField('contractType', value as EmployeeFormData['contractType'])}
                  options={copy.options.contractTypes}
                />
                {formData.contractType === 'temporary' ? (
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
                ) : null}
              </div>
            </div>
          ) : null}

          {currentStep === 4 ? (
            <div className="space-y-6">
              <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
                <FileText className="h-4 w-4" />
                {copy.sections.documents}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{copy.helpers.documents}</p>

              <div className="space-y-4">
                {DOCUMENT_TYPES.map((documentType) => {
                  const slot = formData.documents[documentType];
                  const hasCurrentDocument = Boolean(slot.existingId && !slot.removeExisting);
                  const fileLabel = slot.file?.name ?? slot.existingFileName ?? copy.placeholders.noFile;

                  return (
                    <div key={documentType} className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {copy.documents[documentType]}
                          </p>
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            {fileLabel}
                          </p>
                          {slot.removeExisting && !slot.file ? (
                            <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                              {copy.helpers.documentRemoved}
                            </p>
                          ) : null}
                          {documentErrors[documentType] ? (
                            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                              {documentErrors[documentType]}
                            </p>
                          ) : null}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {hasCurrentDocument && slot.existingDownloadUrl ? (
                            <a
                              href={slot.existingDownloadUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                            >
                              {copy.buttons.viewCurrent}
                            </a>
                          ) : null}
                          {slot.existingId ? (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => updateDocumentSlot(documentType, toggleDocumentSlotRemoval)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              {slot.removeExisting ? copy.buttons.undoRemove : copy.buttons.removeCurrent}
                            </Button>
                          ) : null}
                          <label className="inline-flex cursor-pointer items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700">
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
              </div>
            </div>
          ) : null}

          {currentStep === 5 ? (
            <div className="space-y-6">
              <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
                <Shield className="h-4 w-4" />
                {copy.sections.permissions}
              </h3>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <SelectField
                  name="accessRole"
                  label={copy.labels.accessRole}
                  value={formData.accessRole}
                  onChange={(value) => updateField('accessRole', value as EmployeeAccessRole)}
                  options={copy.options.accessRoles}
                />

                <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{copy.labels.invitationStatus}</p>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                    {formData.invitationStatus === 'linked'
                      ? copy.helpers.linked
                      : formData.invitationStatus === 'pending'
                        ? copy.helpers.pending
                        : copy.helpers.notInvited}
                  </p>
                  {formData.linkedUserName || formData.linkedUserEmail ? (
                    <div className="mt-3 text-sm text-gray-700 dark:text-gray-200">
                      <div>{copy.labels.linkedAccount}</div>
                      <div className="mt-1 font-medium">
                        {formData.linkedUserName || formData.linkedUserEmail}
                      </div>
                      {formData.linkedUserEmail && formData.linkedUserName ? (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {formData.linkedUserEmail}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>

              <label className="flex items-start gap-3 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                <input
                  name="inviteOnSave"
                  type="checkbox"
                  checked={formData.inviteOnSave}
                  onChange={(event) => updateField('inviteOnSave', event.target.checked)}
                  className="mt-1 h-4 w-4"
                />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{copy.labels.inviteOnSave}</p>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {copy.helpers.role}
                  </p>
                </div>
              </label>

              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{copy.labels.accessRole}</p>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  {currentPermissions.map((permission) => (
                    <div key={permission} className="text-sm text-gray-700 dark:text-gray-300">
                      ✓ {permission}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-6 py-4 dark:border-gray-700 dark:bg-gray-900/50">
          <Button type="button" variant="outline" onClick={handleClose}>
            {copy.buttons.cancel}
          </Button>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCurrentStep((step) => Math.max(1, step - 1))}
              disabled={currentStep === 1}
            >
              {copy.buttons.back}
            </Button>
            <Button type="submit" className="bg-blue-600 text-white hover:bg-blue-700">
              {currentStep === copy.steps.length ? copy.buttons.save : copy.buttons.next}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
