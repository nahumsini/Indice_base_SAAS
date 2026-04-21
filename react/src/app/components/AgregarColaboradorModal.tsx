import { useEffect, useMemo, useState } from 'react';
import {
  X,
  Phone,
  Briefcase,
  FileText,
  Shield,
  User,
} from 'lucide-react';
import { useLanguage } from '../shared/context';
import {
  getDefaultProfileCountry,
  type ProfileCountry,
  resolveProfileCountry,
} from '../shared/profileCountries';
import { validateEmail } from '../shared/validation/email';
import {
  normalizePhoneInputForCountry,
  validatePhoneForProfileCountry,
} from '../shared/validation/phone';
import { Button } from './ui/button';

interface AgregarColaboradorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ColaboradorData) => void | Promise<void>;
  colaboradorData?: ColaboradorData | null;
  mode?: 'create' | 'edit';
  unitOptions?: Array<{ value: string; label: string }>;
  businessOptions?: Array<{ value: string; label: string }>;
}

export interface ColaboradorData {
  nombre: string;
  apellidos: string;
  correo: string;
  fechaNacimiento: string;
  direccion: string;
  curp: string;
  rfc: string;
  nss: string;
  telefonoMovil: string;
  telefonoAlterno: string;
  nombreContactoEmergencia: string;
  relacionContacto: string;
  telefonoEmergencia: string;
  departamento: string;
  puesto: string;
  unidadNegocio: string;
  negocio: string;
  paisRegistro: string;
  provinciaEstado: string;
  fechaIngreso: string;
  tipoSalario: string;
  horasJornada: number;
  salario: string;
  sueldoPorHora: string;
  periodoPago: string;
  tipoContrato: string;
  fechaInicioContrato: string;
  fechaFinContrato: string;
  actaNacimiento: File | null;
  identificacion: File | null;
  comprobanteDomicilio: File | null;
  cv: File | null;
  fotoPerfil: File | null;
  rol: string;
  accesos: string[];
}

type ValidatedField =
  | 'nombre'
  | 'apellidos'
  | 'correo'
  | 'telefonoMovil'
  | 'telefonoAlterno'
  | 'departamento'
  | 'puesto'
  | 'unidadNegocio'
  | 'negocio'
  | 'horasJornada'
  | 'salario'
  | 'sueldoPorHora'
  | 'fechaInicioContrato'
  | 'fechaFinContrato';

const initialFormState: ColaboradorData = {
  nombre: '',
  apellidos: '',
  correo: '',
  fechaNacimiento: '',
  direccion: '',
  curp: '',
  rfc: '',
  nss: '',
  telefonoMovil: '',
  telefonoAlterno: '',
  nombreContactoEmergencia: '',
  relacionContacto: '',
  telefonoEmergencia: '',
  departamento: '',
  puesto: '',
  unidadNegocio: '',
  negocio: '',
  paisRegistro: '',
  provinciaEstado: '',
  fechaIngreso: '',
  tipoSalario: 'daily',
  horasJornada: 8,
  salario: '',
  sueldoPorHora: '',
  periodoPago: 'weekly',
  tipoContrato: 'permanent',
  fechaInicioContrato: '',
  fechaFinContrato: '',
  actaNacimiento: null,
  identificacion: null,
  comprobanteDomicilio: null,
  cv: null,
  fotoPerfil: null,
  rol: 'employee',
  accesos: [],
};

const modalTranslations = {
  en: {
    titleCreate: 'Add employee',
    titleEdit: 'Edit employee',
    infoBanner:
      'First name, last name, and email are required. This first release persists the core HR profile, assignment, salary, and contract data.',
    stepOf: (current: number, total: number) => `Step ${current} of ${total}`,
    buttons: {
      cancel: 'Cancel',
      back: 'Back',
      next: 'Next',
      save: 'Save',
      addInline: 'Add...',
      createInline: 'Create',
      chooseFile: 'Choose file',
    },
    steps: [
      { id: 1, label: 'Employee', icon: User },
      { id: 2, label: 'Contact', icon: Phone },
      { id: 3, label: 'Role', icon: Briefcase },
      { id: 4, label: 'Documents', icon: FileText },
      { id: 5, label: 'Permissions', icon: Shield },
    ],
    sections: {
      employeeInfo: 'Employee information',
      contactInfo: 'Contact details',
      emergencyContact: 'Emergency contact',
      jobAssignment: 'Position and assignment',
      salaryContract: 'Salary and contract details',
      salaryCalculator: 'Salary calculator',
      documents: 'Employee documents',
      permissions: 'Permissions and access',
    },
    fields: {
      nombre: 'Name',
      apellidos: 'Last name',
      correo: 'Email address',
      correoHint: 'If no account exists, we will send an invitation to connect the employee.',
      fechaNacimiento: 'Date of birth',
      direccion: 'Address',
      curp: 'National ID',
      rfc: 'Tax ID',
      nss: 'Social security number',
      telefonoMovil: 'Mobile phone',
      telefonoAlterno: 'Alternate phone',
      telefonoAlternoHint: 'Optional: useful if the mobile phone is unavailable.',
      nombreContactoEmergencia: 'Emergency contact name',
      relacionContacto: 'Relationship',
      telefonoEmergencia: 'Emergency phone',
      departamento: 'Department',
      puesto: 'Position',
      unidadNegocio: 'Business unit',
      negocio: 'Business',
      paisRegistro: 'Registration country',
      provinciaEstado: 'Province / State',
      fechaIngreso: 'Start date',
      tipoSalario: 'Salary type',
      horasJornada: 'Workday hours',
      salario: 'Salary',
      sueldoPorHora: 'Hourly wage',
      periodoPago: 'Pay period',
      periodoPagoHint:
        'The system uses this frequency to automate payroll for the employee. If they work by the hour, hours will be grouped under this period.',
      tipoContrato: 'Contract type',
      tipoContratoHint: 'If you choose Temporary, specify the contract period.',
      fechaInicioContrato: 'Contract start date',
      fechaFinContrato: 'Contract end date',
      rol: 'Employee role',
      permisos: 'Modules and permissions',
      permisosHint: 'Permissions are assigned automatically based on the selected role.',
    },
    validation: {
      required: 'This field is required.',
      invalidEmail: 'Enter a valid email address.',
      invalidPhone: 'Enter a valid phone number.',
      invalidNumber: 'Enter a valid numeric value.',
      positiveHours: 'Workday hours must be between 1 and 24.',
      positiveAmount: 'Enter an amount greater than zero.',
      hourlyRateRequired: 'Hourly wage is required when salary type is hourly.',
      contractStartRequired: 'Contract start date is required for temporary contracts.',
      contractEndRequired: 'Contract end date is required for temporary contracts.',
      contractEndAfterStart: 'Contract end date must be the same as or after the start date.',
    },
    placeholders: {
      nombre: 'e.g. John',
      apellidos: 'e.g. Perez Ramirez',
      correo: 'name@email.com',
      direccion: 'Street, number, neighborhood, city, state, ZIP code',
      curp: 'e.g. GARC800101HDFRNN09',
      rfc: 'e.g. GARR800101ABC',
      nss: 'e.g. 12345678901',
      telefono: 'e.g. 5512345678',
      nombreContacto: 'e.g. Maria Perez',
      relacion: 'e.g. Spouse',
      provinciaEstado: 'e.g. Mexico City',
      horasJornada: 'e.g. 8',
      salario: 'e.g. 12000.00',
      sueldoPorHora: 'e.g. 75.00',
      select: 'Select...',
      noFile: 'No file selected',
      uploadFormats: 'Formats: JPG, PNG, or PDF. Maximum 5MB.',
      calculatorEmpty: 'Enter a salary amount to view the calculations',
      calculatorDaily: 'Daily salary:',
      calculatorMonthly: 'Monthly salary (30 days):',
      calculatorFormula: 'Calculation based on daily salary × 30 days',
    },
    options: {
      departamentos: ['Operations', 'Administration', 'Sales', 'Human Resources'],
      puestos: ['Room attendant', 'Coordinator', 'Maintenance', 'Laundry'],
      unidades: [
        { value: 'all-units', label: 'All units' },
        { value: 'Unidad 7', label: 'Unit 7' },
        { value: 'Unidad 8', label: 'Unit 8' },
        { value: 'Unidad 9', label: 'Unit 9' },
        { value: 'Unidad 10', label: 'Unit 10' },
      ],
      negocios: [
        { value: 'all-businesses', label: 'All businesses' },
        { value: 'Negocio A', label: 'Business A' },
        { value: 'Negocio B', label: 'Business B' },
      ],
      paises: ['Mexico', 'United States', 'Canada', 'Colombia', 'Brazil', 'Argentina', 'Chile', 'Peru'],
      tiposSalario: [
        { value: 'daily', label: 'Daily salary' },
        { value: 'hourly', label: 'Hourly salary' },
      ],
      periodosPago: [
        { value: 'weekly', label: 'Weekly' },
        { value: 'biweekly', label: 'Biweekly' },
        { value: 'monthly', label: 'Monthly' },
      ],
      tiposContrato: [
        { value: 'permanent', label: 'Permanent' },
        { value: 'temporary', label: 'Temporary' },
      ],
      roles: [
        { value: 'employee', label: 'Employee' },
        { value: 'coordinator', label: 'Coordinator' },
        { value: 'manager', label: 'Manager' },
        { value: 'administrator', label: 'Administrator' },
      ],
      permisosResumen: [
        'View attendance',
        'Register clock in / out',
        'View personal payroll',
        'Update profile',
      ],
    },
    documents: {
      actaNacimiento: 'Birth certificate',
      identificacion: 'Government ID',
      comprobanteDomicilio: 'Proof of address',
      cv: 'Resume',
      fotoPerfil: 'Profile photo (optional)',
    },
  },
  es: {
    titleCreate: 'Agregar colaborador',
    titleEdit: 'Editar colaborador',
    infoBanner:
      'Nombre, apellidos y correo son obligatorios. Esta primera entrega guarda el perfil base de RH, la asignación, el salario y el contrato.',
    stepOf: (current: number, total: number) => `Paso ${current} de ${total}`,
    buttons: {
      cancel: 'Cancelar',
      back: 'Atrás',
      next: 'Siguiente',
      save: 'Guardar',
      addInline: 'Agregar...',
      createInline: 'Crear',
      chooseFile: 'Seleccionar archivo',
    },
    steps: [
      { id: 1, label: 'Colaborador', icon: User },
      { id: 2, label: 'Contacto', icon: Phone },
      { id: 3, label: 'Puesto', icon: Briefcase },
      { id: 4, label: 'Documentos', icon: FileText },
      { id: 5, label: 'Permisos', icon: Shield },
    ],
    sections: {
      employeeInfo: 'Información del colaborador',
      contactInfo: 'Datos de contacto',
      emergencyContact: 'Contacto de emergencia',
      jobAssignment: 'Puesto y asignación',
      salaryContract: 'Condiciones salariales y contrato',
      salaryCalculator: 'Calculadora de sueldo',
      documents: 'Documentos del colaborador',
      permissions: 'Permisos y accesos',
    },
    fields: {
      nombre: 'Nombre',
      apellidos: 'Apellidos',
      correo: 'Correo electrónico',
      correoHint: 'Si no existe cuenta, enviaremos invitación para vincular al colaborador.',
      fechaNacimiento: 'Fecha de nacimiento',
      direccion: 'Dirección',
      curp: 'CURP',
      rfc: 'RFC',
      nss: 'NSS',
      telefonoMovil: 'Teléfono móvil',
      telefonoAlterno: 'Teléfono alterno',
      telefonoAlternoHint: 'Opcional: útil si el móvil no está disponible.',
      nombreContactoEmergencia: 'Nombre del contacto',
      relacionContacto: 'Relación',
      telefonoEmergencia: 'Teléfono',
      departamento: 'Departamento',
      puesto: 'Puesto',
      unidadNegocio: 'Unidad de negocio',
      negocio: 'Negocio',
      paisRegistro: 'País de registro',
      provinciaEstado: 'Provincia / Estado',
      fechaIngreso: 'Fecha de ingreso',
      tipoSalario: 'Tipo de salario',
      horasJornada: 'Horas de jornada',
      salario: 'Salario',
      sueldoPorHora: 'Sueldo por hora',
      periodoPago: 'Periodo de pago',
      periodoPagoHint:
        'El sistema usará esta frecuencia para automatizar la nómina del colaborador. Si trabaja por hora, las horas se contarán según este periodo.',
      tipoContrato: 'Tipo de contrato',
      tipoContratoHint: 'Si eliges Temporal, especifica el periodo del contrato.',
      fechaInicioContrato: 'Fecha de inicio de contrato',
      fechaFinContrato: 'Fecha de fin de contrato',
      rol: 'Rol del colaborador',
      permisos: 'Módulos y permisos',
      permisosHint: 'Los permisos se asignarán automáticamente según el rol seleccionado.',
    },
    validation: {
      required: 'Este campo es obligatorio.',
      invalidEmail: 'Ingresa un correo electrónico válido.',
      invalidPhone: 'Ingresa un teléfono válido.',
      invalidNumber: 'Ingresa un valor numérico válido.',
      positiveHours: 'Las horas de jornada deben estar entre 1 y 24.',
      positiveAmount: 'Ingresa un monto mayor a cero.',
      hourlyRateRequired: 'El sueldo por hora es obligatorio cuando el salario es por hora.',
      contractStartRequired: 'La fecha de inicio es obligatoria para contratos temporales.',
      contractEndRequired: 'La fecha de fin es obligatoria para contratos temporales.',
      contractEndAfterStart: 'La fecha de fin debe ser igual o posterior a la de inicio.',
    },
    placeholders: {
      nombre: 'Ej. Juan',
      apellidos: 'Ej. Pérez Ramírez',
      correo: 'nombre@correo.com',
      direccion: 'Calle, número, colonia, ciudad, estado, CP',
      curp: 'Ej. GARC800101HDFRNN09',
      rfc: 'Ej. GARR800101ABC',
      nss: 'Ej. 12345678901',
      telefono: 'Ej. 5512345678',
      nombreContacto: 'Ej. María Pérez',
      relacion: 'Ej. Esposa',
      provinciaEstado: 'Ej. Ciudad de México',
      horasJornada: 'Ej. 8',
      salario: 'Ej. 12000.00',
      sueldoPorHora: 'Ej. 75.00',
      select: 'Selecciona...',
      noFile: 'Ningún archivo seleccionado',
      uploadFormats: 'Formatos: JPG, PNG o PDF. Máximo 5MB.',
      calculatorEmpty: 'Ingresa el salario para ver los cálculos',
      calculatorDaily: 'Sueldo diario:',
      calculatorMonthly: 'Sueldo mensual (30 días):',
      calculatorFormula: 'Cálculo basado en salario diario × 30 días',
    },
    options: {
      departamentos: ['Operaciones', 'Administración', 'Ventas', 'Recursos Humanos'],
      puestos: ['Camarista', 'Coordinador', 'Mantenimiento', 'Lavandería'],
      unidades: [
        { value: 'all-units', label: 'Todas las unidades' },
        { value: 'Unidad 7', label: 'Unidad 7' },
        { value: 'Unidad 8', label: 'Unidad 8' },
        { value: 'Unidad 9', label: 'Unidad 9' },
        { value: 'Unidad 10', label: 'Unidad 10' },
      ],
      negocios: [
        { value: 'all-businesses', label: 'Todos los negocios' },
        { value: 'Negocio A', label: 'Negocio A' },
        { value: 'Negocio B', label: 'Negocio B' },
      ],
      paises: ['México', 'Estados Unidos', 'Canadá', 'Colombia', 'Brasil', 'Argentina', 'Chile', 'Perú'],
      tiposSalario: [
        { value: 'daily', label: 'Salario por día' },
        { value: 'hourly', label: 'Salario por hora' },
      ],
      periodosPago: [
        { value: 'weekly', label: 'Semanal' },
        { value: 'biweekly', label: 'Quincenal' },
        { value: 'monthly', label: 'Mensual' },
      ],
      tiposContrato: [
        { value: 'permanent', label: 'Permanente' },
        { value: 'temporary', label: 'Temporal' },
      ],
      roles: [
        { value: 'employee', label: 'Colaborador' },
        { value: 'coordinator', label: 'Coordinador' },
        { value: 'manager', label: 'Gerente' },
        { value: 'administrator', label: 'Administrador' },
      ],
      permisosResumen: [
        'Ver asistencia',
        'Registrar entrada / salida',
        'Ver nómina personal',
        'Actualizar perfil',
      ],
    },
    documents: {
      actaNacimiento: 'Acta de nacimiento',
      identificacion: 'Identificación oficial',
      comprobanteDomicilio: 'Comprobante de domicilio',
      cv: 'CV',
      fotoPerfil: 'Foto de perfil (opcional)',
    },
  },
} as const;

const documentFieldKeys: Array<keyof Pick<
  ColaboradorData,
  'actaNacimiento' | 'identificacion' | 'comprobanteDomicilio' | 'cv' | 'fotoPerfil'
>> = ['actaNacimiento', 'identificacion', 'comprobanteDomicilio', 'cv', 'fotoPerfil'];

const requiredFieldClassName =
  'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white';

function InputField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  required = false,
  error,
  helperText,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  error?: string;
  helperText?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        className={`${requiredFieldClassName} ${error ? 'border-red-400 focus:ring-red-500 dark:border-red-500' : ''}`}
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
  label,
  value,
  onChange,
  options,
  placeholder,
  required = false,
  error,
  helperText,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<{ value: string; label: string }>;
  placeholder?: string;
  required?: boolean;
  error?: string;
  helperText?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        className={`${requiredFieldClassName} ${error ? 'border-red-400 focus:ring-red-500 dark:border-red-500' : ''}`}
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>
      ) : helperText ? (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{helperText}</p>
      ) : null}
    </div>
  );
}

function FileUploadField({
  label,
  file,
  onChange,
  chooseFileLabel,
  noFileLabel,
  helperText,
}: {
  label: string;
  file: File | null;
  onChange: (file: File | null) => void;
  chooseFileLabel: string;
  noFileLabel: string;
  helperText?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
      <div className="flex items-center gap-3">
        <label className="cursor-pointer rounded-md border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600">
          {chooseFileLabel}
          <input type="file" onChange={(event) => onChange(event.target.files?.[0] ?? null)} className="hidden" />
        </label>
        <span className="text-sm text-gray-600 dark:text-gray-400">{file ? file.name : noFileLabel}</span>
      </div>
      {helperText ? <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{helperText}</p> : null}
    </div>
  );
}

export function AgregarColaboradorModal({
  isOpen,
  onClose,
  onSave,
  colaboradorData,
  mode = 'create',
  unitOptions,
  businessOptions,
}: AgregarColaboradorModalProps) {
  const { currentLanguage } = useLanguage();
  const copy = currentLanguage.code.startsWith('es')
    ? modalTranslations.es
    : modalTranslations.en;
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<ColaboradorData>(initialFormState);
  const [touchedFields, setTouchedFields] = useState<Partial<Record<ValidatedField, boolean>>>({});

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setCurrentStep(1);
    setFormData(colaboradorData ? { ...initialFormState, ...colaboradorData } : initialFormState);
    setTouchedFields({});
  }, [colaboradorData, isOpen]);

  const steps = copy.steps.filter((step) => step.id <= 3);
  const departmentOptions = useMemo(
    () => copy.options.departamentos.map((label) => ({ value: label, label })),
    [copy.options.departamentos],
  );
  const positionOptions = useMemo(
    () => copy.options.puestos.map((label) => ({ value: label, label })),
    [copy.options.puestos],
  );
  const modalUnitOptions = useMemo(
    () => (unitOptions ?? copy.options.unidades).filter((option) => option.value !== 'all' && option.value !== 'all-units'),
    [copy.options.unidades, unitOptions],
  );
  const modalBusinessOptions = useMemo(
    () => (businessOptions ?? copy.options.negocios).filter((option) => option.value !== 'all' && option.value !== 'all-businesses'),
    [businessOptions, copy.options.negocios],
  );

  const getSelectedPhoneCountry = (countryValue: string): ProfileCountry | undefined => (
    resolveProfileCountry(countryValue)
  );

  const handleInputChange = <T extends keyof ColaboradorData>(field: T, value: ColaboradorData[T]) => {
    setFormData((previousState) => {
      if (field === 'paisRegistro') {
        const nextCountry = getSelectedPhoneCountry(String(value ?? ''));
        return {
          ...previousState,
          paisRegistro: String(value ?? ''),
          telefonoMovil: nextCountry
            ? normalizePhoneInputForCountry(previousState.telefonoMovil, nextCountry)
            : previousState.telefonoMovil,
          telefonoAlterno: nextCountry
            ? normalizePhoneInputForCountry(previousState.telefonoAlterno, nextCountry)
            : previousState.telefonoAlterno,
          telefonoEmergencia: nextCountry
            ? normalizePhoneInputForCountry(previousState.telefonoEmergencia, nextCountry)
            : previousState.telefonoEmergencia,
        };
      }

      if (field === 'telefonoMovil' || field === 'telefonoAlterno' || field === 'telefonoEmergencia') {
        const country = getSelectedPhoneCountry(previousState.paisRegistro);
        return {
          ...previousState,
          [field]: country
            ? normalizePhoneInputForCountry(String(value ?? ''), country)
            : String(value ?? ''),
        };
      }

      return {
        ...previousState,
        [field]: field === 'horasJornada' ? Number(value) || 0 : value,
      };
    });

    if (field in touchedFields) {
      setTouchedFields((previous) => ({
        ...previous,
        [field as ValidatedField]: true,
      }));
    }
  };

  const handleClose = () => {
    setCurrentStep(1);
    setFormData(initialFormState);
    setTouchedFields({});
    onClose();
  };

  const markFieldsTouched = (fields: ValidatedField[]) => {
    setTouchedFields((previous) => {
      const next = { ...previous };
      fields.forEach((field) => {
        next[field] = true;
      });
      return next;
    });
  };

  const selectedSalaryType = formData.tipoSalario || 'daily';
  const selectedContractType = formData.tipoContrato || 'permanent';

  const validationErrors = useMemo(() => {
    const errors: Partial<Record<ValidatedField, string>> = {};
    const normalizedEmail = formData.correo.trim();
    const normalizedMobile = formData.telefonoMovil.trim();
    const normalizedAlternate = formData.telefonoAlterno.trim();
    const resolvedPhoneCountry = getSelectedPhoneCountry(formData.paisRegistro);
    const phoneCountry = resolvedPhoneCountry ?? getDefaultProfileCountry();

    if (!formData.nombre.trim()) {
      errors.nombre = copy.validation.required;
    }

    if (!formData.apellidos.trim()) {
      errors.apellidos = copy.validation.required;
    }

    if (!normalizedEmail) {
      errors.correo = copy.validation.required;
    } else if (!validateEmail(normalizedEmail).ok) {
      errors.correo = copy.validation.invalidEmail;
    }

    const phoneIsValid = (value: string) => {
      if (!value) {
        return true;
      }

      if (resolvedPhoneCountry) {
        return validatePhoneForProfileCountry(value, phoneCountry).ok;
      }

      if (!/^[\d\s()+-]+$/.test(value)) {
        return false;
      }

      const digits = value.replace(/\D/g, '');
      return digits.length >= 7 && digits.length <= 15;
    };

    if (!phoneIsValid(normalizedMobile)) {
      errors.telefonoMovil = copy.validation.invalidPhone;
    }

    if (!phoneIsValid(normalizedAlternate)) {
      errors.telefonoAlterno = copy.validation.invalidPhone;
    }

    if (!formData.departamento.trim()) {
      errors.departamento = copy.validation.required;
    }

    if (!formData.puesto.trim()) {
      errors.puesto = copy.validation.required;
    }

    if (!formData.unidadNegocio.trim()) {
      errors.unidadNegocio = copy.validation.required;
    }

    if (!formData.negocio.trim()) {
      errors.negocio = copy.validation.required;
    }

    if (selectedSalaryType === 'daily') {
      if (!formData.salario.trim()) {
        errors.salario = copy.validation.required;
      }

      if (Number.isNaN(Number(formData.horasJornada)) || formData.horasJornada < 1 || formData.horasJornada > 24) {
        errors.horasJornada = copy.validation.positiveHours;
      }

      if (formData.salario.trim()) {
        const parsedSalary = Number(formData.salario);
        if (Number.isNaN(parsedSalary)) {
          errors.salario = copy.validation.invalidNumber;
        } else if (parsedSalary <= 0) {
          errors.salario = copy.validation.positiveAmount;
        }
      }
    }

    if (selectedSalaryType === 'hourly') {
      if (!formData.sueldoPorHora.trim()) {
        errors.sueldoPorHora = copy.validation.hourlyRateRequired;
      } else {
        const parsedHourlyRate = Number(formData.sueldoPorHora);
        if (Number.isNaN(parsedHourlyRate)) {
          errors.sueldoPorHora = copy.validation.invalidNumber;
        } else if (parsedHourlyRate <= 0) {
          errors.sueldoPorHora = copy.validation.positiveAmount;
        }
      }
    }

    if (selectedContractType === 'temporary') {
      if (!formData.fechaInicioContrato) {
        errors.fechaInicioContrato = copy.validation.contractStartRequired;
      }

      if (!formData.fechaFinContrato) {
        errors.fechaFinContrato = copy.validation.contractEndRequired;
      } else if (
        formData.fechaInicioContrato &&
        new Date(formData.fechaFinContrato).getTime() < new Date(formData.fechaInicioContrato).getTime()
      ) {
        errors.fechaFinContrato = copy.validation.contractEndAfterStart;
      }
    }

    return errors;
  }, [
    copy.validation.contractEndAfterStart,
    copy.validation.contractEndRequired,
    copy.validation.contractStartRequired,
    copy.validation.hourlyRateRequired,
    copy.validation.invalidEmail,
    copy.validation.invalidNumber,
    copy.validation.invalidPhone,
    copy.validation.positiveAmount,
    copy.validation.positiveHours,
    copy.validation.required,
    formData.apellidos,
    formData.correo,
    formData.departamento,
    formData.fechaFinContrato,
    formData.fechaInicioContrato,
    formData.horasJornada,
    formData.negocio,
    formData.nombre,
    formData.paisRegistro,
    formData.puesto,
    formData.salario,
    formData.sueldoPorHora,
    formData.telefonoAlterno,
    formData.telefonoMovil,
    formData.unidadNegocio,
    selectedContractType,
    selectedSalaryType,
  ]);

  const contractValidationFields: ValidatedField[] =
    selectedContractType === 'temporary' ? ['fechaInicioContrato', 'fechaFinContrato'] : [];

  const compensationValidationFields: ValidatedField[] =
    selectedSalaryType === 'hourly'
      ? ['sueldoPorHora']
      : ['horasJornada', 'salario'];

  const stepFields: Record<number, ValidatedField[]> = {
    1: ['nombre', 'apellidos', 'correo'],
    2: ['telefonoMovil', 'telefonoAlterno'],
    3: ['departamento', 'puesto', 'unidadNegocio', 'negocio', ...compensationValidationFields, ...contractValidationFields],
  };

  const currentStepFields = stepFields[currentStep] ?? [];
  const isCurrentStepValid = currentStepFields.every((field) => !validationErrors[field]);

  const handleNext = async () => {
    if (!isCurrentStepValid) {
      markFieldsTouched(currentStepFields);
      return;
    }

    if (currentStep < steps.length) {
      setCurrentStep((previousStep) => previousStep + 1);
      return;
    }

    await Promise.resolve(onSave(formData));
    handleClose();
  };

  const handleBack = () => {
    setCurrentStep((previousStep) => Math.max(1, previousStep - 1));
  };

  if (!isOpen) {
    return null;
  }
  const documentsMap = {
    actaNacimiento: copy.documents.actaNacimiento,
    identificacion: copy.documents.identificacion,
    comprobanteDomicilio: copy.documents.comprobanteDomicilio,
    cv: copy.documents.cv,
    fotoPerfil: copy.documents.fotoPerfil,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-gray-800">
        <div className="flex items-center justify-between bg-[#143675] px-6 py-4 dark:bg-[#0f2855]">
          <h2 className="text-xl font-semibold text-white">
            {mode === 'edit' ? copy.titleEdit : copy.titleCreate}
          </h2>
          <button onClick={handleClose} className="text-white/80 transition-colors hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b border-blue-100 bg-blue-50 px-6 py-3 dark:border-blue-800 dark:bg-blue-900/20">
          <p className="text-sm text-gray-700 dark:text-gray-300">{copy.infoBanner}</p>
        </div>

        <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {steps.map((step) => {
              const StepIcon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;

              return (
                <button
                  key={step.id}
                  onClick={() => {
                    if (step.id > currentStep && !isCurrentStepValid) {
                      markFieldsTouched(currentStepFields);
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
        </div>

        <div className="bg-gray-50 px-6 py-2 dark:bg-gray-900/50">
          <p className="text-sm text-gray-600 dark:text-gray-400">{copy.stepOf(currentStep, steps.length)}</p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {currentStep === 1 ? (
            <div className="space-y-6">
              <div>
                <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
                  <User className="h-4 w-4" />
                  {copy.sections.employeeInfo}
                </h3>
                <div className="space-y-4">
                  <InputField
                    label={copy.fields.nombre}
                    value={formData.nombre}
                    onChange={(value) => handleInputChange('nombre', value)}
                    placeholder={copy.placeholders.nombre}
                    required
                    error={touchedFields.nombre ? validationErrors.nombre : undefined}
                  />
                  <InputField
                    label={copy.fields.apellidos}
                    value={formData.apellidos}
                    onChange={(value) => handleInputChange('apellidos', value)}
                    placeholder={copy.placeholders.apellidos}
                    required
                    error={touchedFields.apellidos ? validationErrors.apellidos : undefined}
                  />
                  <div>
                    <InputField
                      label={copy.fields.correo}
                      value={formData.correo}
                      onChange={(value) => handleInputChange('correo', value)}
                      placeholder={copy.placeholders.correo}
                      type="email"
                      required
                      error={touchedFields.correo ? validationErrors.correo : undefined}
                      helperText={copy.fields.correoHint}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {currentStep === 2 ? (
            <div className="space-y-6">
              <div>
                <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
                  <Phone className="h-4 w-4" />
                  {copy.sections.contactInfo}
                </h3>
                <div className="space-y-4">
                  <InputField
                    label={copy.fields.telefonoMovil}
                    value={formData.telefonoMovil}
                    onChange={(value) => handleInputChange('telefonoMovil', value)}
                    placeholder={copy.placeholders.telefono}
                    type="tel"
                    error={touchedFields.telefonoMovil ? validationErrors.telefonoMovil : undefined}
                  />
                  <div>
                    <InputField
                      label={copy.fields.telefonoAlterno}
                      value={formData.telefonoAlterno}
                      onChange={(value) => handleInputChange('telefonoAlterno', value)}
                      placeholder={copy.placeholders.telefono}
                      type="tel"
                      error={touchedFields.telefonoAlterno ? validationErrors.telefonoAlterno : undefined}
                      helperText={copy.fields.telefonoAlternoHint}
                    />
                  </div>
                </div>
              </div>

            </div>
          ) : null}

          {currentStep === 3 ? (
            <div className="space-y-6">
              <div>
                <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
                  <Briefcase className="h-4 w-4" />
                  {copy.sections.jobAssignment}
                </h3>
                <div className="space-y-4">
                  <div>
                    <SelectField
                      label={copy.fields.departamento}
                      value={formData.departamento}
                      onChange={(value) => handleInputChange('departamento', value)}
                      options={departmentOptions}
                      placeholder={copy.placeholders.select}
                      required
                      error={touchedFields.departamento ? validationErrors.departamento : undefined}
                    />
                  </div>
                  <div>
                    <SelectField
                      label={copy.fields.puesto}
                      value={formData.puesto}
                      onChange={(value) => handleInputChange('puesto', value)}
                      options={positionOptions}
                      placeholder={copy.placeholders.select}
                      required
                      error={touchedFields.puesto ? validationErrors.puesto : undefined}
                    />
                  </div>
                  <div>
                    <SelectField
                      label={copy.fields.unidadNegocio}
                      value={formData.unidadNegocio}
                      onChange={(value) => handleInputChange('unidadNegocio', value)}
                      options={modalUnitOptions}
                      placeholder={copy.placeholders.select}
                      required
                      error={touchedFields.unidadNegocio ? validationErrors.unidadNegocio : undefined}
                    />
                  </div>
                  <div>
                    <SelectField
                      label={copy.fields.negocio}
                      value={formData.negocio}
                      onChange={(value) => handleInputChange('negocio', value)}
                      options={modalBusinessOptions}
                      placeholder={copy.placeholders.select}
                      required
                      error={touchedFields.negocio ? validationErrors.negocio : undefined}
                    />
                  </div>
                  <InputField
                    label={copy.fields.fechaIngreso}
                    value={formData.fechaIngreso}
                    onChange={(value) => handleInputChange('fechaIngreso', value)}
                    type="date"
                  />
                </div>
              </div>

              <div>
                <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
                  <Briefcase className="h-4 w-4" />
                  {copy.sections.salaryContract}
                </h3>
                <div className="space-y-4">
                  <SelectField
                    label={copy.fields.tipoSalario}
                    value={selectedSalaryType}
                    onChange={(value) => handleInputChange('tipoSalario', value)}
                    options={copy.options.tiposSalario}
                  />

                  {selectedSalaryType === 'daily' ? (
                    <>
                      <InputField
                        label={copy.fields.horasJornada}
                        value={String(formData.horasJornada)}
                        onChange={(value) => handleInputChange('horasJornada', Number(value))}
                        placeholder={copy.placeholders.horasJornada}
                        type="number"
                        error={touchedFields.horasJornada ? validationErrors.horasJornada : undefined}
                      />
                      <InputField
                        label={copy.fields.salario}
                        value={formData.salario}
                        onChange={(value) => handleInputChange('salario', value)}
                        placeholder={copy.placeholders.salario}
                        type="number"
                        error={touchedFields.salario ? validationErrors.salario : undefined}
                      />
                    </>
                  ) : (
                    <InputField
                      label={copy.fields.sueldoPorHora}
                      value={formData.sueldoPorHora}
                      onChange={(value) => handleInputChange('sueldoPorHora', value)}
                      placeholder={copy.placeholders.sueldoPorHora}
                      type="number"
                      error={touchedFields.sueldoPorHora ? validationErrors.sueldoPorHora : undefined}
                    />
                  )}

                  <div>
                    <SelectField
                      label={copy.fields.periodoPago}
                      value={formData.periodoPago}
                      onChange={(value) => handleInputChange('periodoPago', value)}
                      options={copy.options.periodosPago}
                      placeholder={copy.placeholders.select}
                    />
                    <div className="mt-2 rounded-md border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
                      <p className="text-xs text-gray-700 dark:text-gray-300">{copy.fields.periodoPagoHint}</p>
                    </div>
                  </div>

                  <div>
                    <SelectField
                      label={copy.fields.tipoContrato}
                      value={selectedContractType}
                      onChange={(value) => handleInputChange('tipoContrato', value)}
                      options={copy.options.tiposContrato}
                    />
                    {selectedContractType === 'temporary' ? (
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {copy.fields.tipoContratoHint}
                      </p>
                    ) : null}
                  </div>

                  {selectedContractType === 'temporary' ? (
                    <>
                      <InputField
                        label={copy.fields.fechaInicioContrato}
                        value={formData.fechaInicioContrato}
                        onChange={(value) => handleInputChange('fechaInicioContrato', value)}
                        type="date"
                        error={touchedFields.fechaInicioContrato ? validationErrors.fechaInicioContrato : undefined}
                      />
                      <InputField
                        label={copy.fields.fechaFinContrato}
                        value={formData.fechaFinContrato}
                        onChange={(value) => handleInputChange('fechaFinContrato', value)}
                        type="date"
                        error={touchedFields.fechaFinContrato ? validationErrors.fechaFinContrato : undefined}
                      />
                    </>
                  ) : null}
                </div>

                {selectedSalaryType === 'daily' ? (
                  <div className="mt-6 rounded-lg border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-4 dark:border-blue-800 dark:from-blue-900/20 dark:to-indigo-900/20">
                    <h4 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
                      {copy.sections.salaryCalculator}
                    </h4>
                    {formData.salario ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between rounded-md border border-blue-100 bg-white p-3 dark:border-blue-900 dark:bg-gray-800">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {copy.placeholders.calculatorDaily}
                          </span>
                          <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                            ${Number(formData.salario).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between rounded-md border border-blue-100 bg-white p-3 dark:border-blue-900 dark:bg-gray-800">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {copy.placeholders.calculatorMonthly}
                          </span>
                          <span className="text-lg font-bold text-green-600 dark:text-green-400">
                            ${(Number(formData.salario) * 30).toFixed(2)}
                          </span>
                        </div>
                        <p className="text-center text-xs text-gray-500 dark:text-gray-400">
                          {copy.placeholders.calculatorFormula}
                        </p>
                      </div>
                    ) : (
                      <div className="py-4 text-center">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {copy.placeholders.calculatorEmpty}
                        </p>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {currentStep === 4 ? (
            <div className="space-y-6">
              <div>
                <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
                  <FileText className="h-4 w-4" />
                  {copy.sections.documents}
                </h3>
                <div className="space-y-4">
                  {documentFieldKeys.map((fieldKey) => (
                    <FileUploadField
                      key={fieldKey}
                      label={documentsMap[fieldKey]}
                      file={formData[fieldKey]}
                      onChange={(file) => handleInputChange(fieldKey, file)}
                      chooseFileLabel={copy.buttons.chooseFile}
                      noFileLabel={copy.placeholders.noFile}
                      helperText={fieldKey === 'actaNacimiento' ? copy.placeholders.uploadFormats : undefined}
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {currentStep === 5 ? (
            <div className="space-y-6">
              <div>
                <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
                  <Shield className="h-4 w-4" />
                  {copy.sections.permissions}
                </h3>
                <div className="space-y-4">
                  <SelectField
                    label={copy.fields.rol}
                    value={formData.rol}
                    onChange={(value) => handleInputChange('rol', value)}
                    options={copy.options.roles}
                  />
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      {copy.fields.permisos}
                    </label>
                    <div className="space-y-2 rounded-lg bg-gray-50 p-4 dark:bg-gray-900/50">
                      <p className="text-sm text-gray-600 dark:text-gray-400">{copy.fields.permisosHint}</p>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        {copy.options.permisosResumen.map((permission) => (
                          <div key={permission} className="text-sm text-gray-700 dark:text-gray-300">
                            ✓ {permission}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-6 py-4 dark:border-gray-700 dark:bg-gray-900/50">
          <Button variant="outline" onClick={handleClose} className="text-gray-700 dark:text-gray-300">
            {copy.buttons.cancel}
          </Button>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1}
              className="text-gray-700 dark:text-gray-300"
            >
              {copy.buttons.back}
            </Button>
            <Button
              onClick={handleNext}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              {currentStep === steps.length ? copy.buttons.save : copy.buttons.next}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
