import { type ReactNode, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  Clock3,
  Copy,
  ExternalLink,
  Link2,
  MapPin,
  Pencil,
  Plus,
  QrCode,
  RefreshCw,
  RotateCw,
  Search,
  ShieldCheck,
  Users,
} from 'lucide-react';
import QRCode from 'qrcode';
import { Button } from '../../../components/ui/button';
import { LoadingBarOverlay, runWithMinimumDuration } from '../../../components/LoadingBarOverlay';
import { Skeleton } from '../../../components/ui/skeleton';
import { LocationRegistrationModal } from '../../../components/LocationRegistrationModal';
import { HorariosModal } from '../../../components/HorariosModal';
import { FaceEnrollmentModal } from '../../../components/FaceEnrollmentModal';
import { useLocalStorageState } from '../../../hooks/useLocalStorageState';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import { ApiClientError } from '../../../lib/apiClient';
import {
  type AttendanceAccessMethod,
  type AttendanceAccessMethodPayload,
  type AttendanceCalendarDay,
  type AttendanceAccessProfile,
  type AttendanceAccessProfilePayload,
  humanResourcesApi,
  type AttendanceControlAssignment,
  type AttendanceControlAssignmentPayload,
  type AttendanceKioskDevice,
  type AttendanceKioskDevicePayload,
  type AttendanceControlLocation,
  type AttendanceControlLocationPayload,
  type AttendanceControlOverviewResponse,
  type AttendanceControlTemplate,
  type AttendanceControlTemplatePayload,
} from '../../../api/humanResources';
import { useLanguage } from '../../../shared/context';

const padDatePart = (value: number) => `${value}`.padStart(2, '0');
const localDateString = (date: Date) =>
  `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
const todayIsoDate = () => localDateString(new Date());
const hrAttendanceSelectedEmployeeStorageKey = 'indice.hr.attendance.selectedEmployeeId';
const toMonthValue = (value: string | Date) => {
  const date = typeof value === 'string' ? new Date(`${value}T00:00:00`) : value;
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}`;
};

const controlCopy = {
  en: {
    title: 'Control',
    subtitle: 'Monitor attendance in real time and manage settings.',
    refresh: 'Refresh',
    loading: 'Loading control data',
    retry: 'Retry',
    unauthorized: 'Your session is no longer authenticated. Sign in again and reload the module.',
    notFound: 'The running backend does not expose the control API yet. Restart the Spring server on the latest branch.',
    genericError: 'Unable to load attendance control.',
    saveError: 'The requested control change could not be saved.',
    bulkAssignSuccess: 'Schedule assignment updated successfully.',
    locationSaved: 'Location saved successfully.',
    templateSaved: 'Schedule template saved successfully.',
    searchPlaceholder: 'Search employee, code, position, or schedule',
    filters: {
      all: 'All',
      assigned: 'Assigned',
      unassigned: 'Unassigned',
      late: 'Late today',
      corrected: 'Corrected',
    },
    statuses: {
      on_time: 'On time',
      late: 'Late',
      leave: 'Leave',
      rest: 'Rest',
      absence: 'No record',
      active: 'Active',
      inactive: 'Inactive',
    },
    summary: {
      employees: 'Employees in scope',
      assigned: 'Assigned schedules',
      unassigned: 'Without schedule',
      locations: 'Active locations',
      templates: 'Templates',
      late: 'Late today',
      corrections: 'Manual corrections',
      records: 'Attendance records',
      authSuccess: 'Auth success',
      authFailure: 'Auth failures',
      overrides: 'Overrides',
    },
    sections: {
      locations: 'Attendance locations',
      locationsHint: 'These are the active control points allowed for attendance events.',
      kiosks: 'Kiosk devices',
      kiosksHint: 'These devices define where employee kiosk authentication is allowed and how it aligns to the operating structure.',
      templates: 'Schedule templates',
      templatesHint: 'Review template coverage and the weekly rule definition currently backing attendance control.',
      templateDetail: 'Template detail',
      employees: 'Employee coverage',
      employeesHint: 'Use this list to verify who is covered by a schedule and how the selected day resolved operationally.',
      employeeDetail: 'Employee detail',
      access: 'Employee access',
      recentActivity: 'Recent activity',
    },
    labels: {
      controlDate: 'Control date',
      assignedEmployees: 'Assigned employees',
      noLocations: 'No attendance locations are configured yet.',
      noKiosks: 'No kiosk devices are configured yet.',
      noTemplates: 'No schedule templates are configured yet.',
      noEmployees: 'No employees match the current search.',
      noEmployeeSelected: 'Select an employee to inspect schedule coverage and the selected-day result.',
      noTemplateSelected: 'Select a schedule template to inspect its weekly rules.',
      radius: 'Radius',
      coordinates: 'Coordinates',
      start: 'Start',
      end: 'End',
      tolerance: 'Late tolerance',
      restDay: 'Rest day',
      dayOff: 'Day off',
      noSchedule: 'No schedule assigned',
      schedule: 'Schedule',
      dateRange: 'Coverage',
      effectiveStatus: 'Effective status',
      systemStatus: 'System status',
      correction: 'Manual correction',
      noCorrection: 'No manual correction',
      checkIn: 'Check-in',
      checkOut: 'Check-out',
      minutesLate: 'Minutes late',
      department: 'Department',
      unit: 'Unit',
      business: 'Business',
      noDepartment: 'No department',
      noUnit: 'No unit',
      noBusiness: 'No business',
      noTime: 'Not scheduled',
      unassignedWarning: 'This employee has no active schedule assignment for the selected date.',
      ruleForDay: 'Rule for selected day',
      noRuleForDay: 'There is no schedule rule active for the selected day.',
      dailyAttendance: 'Daily attendance',
      attendanceCalendar: 'Attendance Calendar',
      noRegistration: 'No registration',
      loadingCalendar: 'Loading calendar',
      selectEmployeeCalendar: 'Select an employee to load the attendance calendar.',
      openLocation: 'Location',
      currentDay: 'Current day',
      faceEnrollmentStatus: 'Face enrollment',
      faceNotEnrolled: 'No biometric enrollment available.',
      modifyStatusOfDay: 'Modify status of day',
      systemRegistration: 'System Registration',
      notModifiable: 'Not modifiable',
      totalTime: 'Total time',
      manuallyModifyStatus: 'Manually modify status',
      currentStatus: 'Current status',
      noEvidence: 'No photo evidence stored for this day.',
      noLocationHistory: 'No location recorded for this day.',
      markAsAttendance: 'Mark as Attendance',
      markAsAbsent: 'Mark as Absent',
      markAsDelay: 'Mark as Delay',
      markAsRest: 'Mark as Rest',
      clearManualCorrection: 'Clear manual correction',
      correctionApplied: 'Correction applied successfully.',
      correctionCleared: 'Correction cleared successfully.',
      savingDayStatus: 'Saving day status',
      savingDayStatusDescription: 'We are storing the manual correction and refreshing the attendance view.',
      searchLabel: 'Search employees',
      selectedTemplate: 'Selected template',
      selectedEmployee: 'Selected employee',
      addLocation: 'Add location',
      addTemplate: 'Add template',
      bulkAssign: 'Bulk assign',
      status: 'Status',
      locationName: 'Location name',
      latitude: 'Latitude',
      longitude: 'Longitude',
      save: 'Save',
      cancel: 'Cancel',
      code: 'Code',
      templateName: 'Template name',
      dayLabel: 'Day',
      chooseTemplate: 'Choose template',
      effectiveStart: 'Effective start',
      effectiveEnd: 'Effective end',
      employeesToAssign: 'Employees to assign',
      assignmentHint: 'Existing overlapping assignments will be closed automatically the day before the new start date.',
      addKiosk: 'Add kiosk',
      defaultMethod: 'Default method',
      methods: 'Methods',
      noAccessProfile: 'No access profile configured.',
      addAccessProfile: 'Create access profile',
      editAccessProfile: 'Edit access profile',
      addAccessMethod: 'Add access method',
      editAccessMethod: 'Edit access method',
      accessProfileStatus: 'Access profile status',
      methodType: 'Method type',
      credentialRef: 'Credential reference',
      secret: 'Secret',
      priority: 'Priority',
      noCredentialRef: 'No credential ref',
      kioskScope: 'Scope',
      linkedLocation: 'Linked location',
      noLinkedLocation: 'No linked location',
      noMethods: 'No access methods configured.',
      metadataHint: 'Manage kiosk methods and the employee biometric enrollment from here.',
      kioskDevice: 'Kiosk device',
      kioskPublicLink: 'Kiosk public link',
      copyKioskLink: 'Copy link',
      showKioskQr: 'Show QR',
      rotateKioskLink: 'Rotate link',
      kioskLinkCopied: 'Kiosk link copied.',
      kioskLinkRotated: 'Kiosk link rotated successfully.',
      kioskTokenUnavailable: 'This kiosk does not have a public device link yet.',
      kioskTabBlocked: 'Allow pop-ups for this site to open the kiosk in a new tab.',
      kioskQrTitle: 'Kiosk QR',
      selectedKioskDevice: 'Selected kiosk device',
      eventTime: 'Event time',
      eventKind: 'Event kind',
      result: 'Result',
      noRecentEvents: 'No kiosk or access activity has been recorded for the selected date.',
      authMethods: {
        pin: 'PIN',
        badge: 'Badge',
        password: 'Password',
        manual_override: 'Manual override',
        facial_recognition: 'Facial recognition',
      },
      eventKinds: {
        auth_attempt: 'Auth attempt',
        check_in: 'Check-in',
        check_out: 'Check-out',
        break_out: 'Break out',
        break_in: 'Break in',
        correction: 'Correction',
        manual_override: 'Manual override',
      },
      resultStatuses: {
        success: 'Success',
        failure: 'Failure',
        rejected: 'Rejected',
        overridden: 'Overridden',
      },
    },
  },
  es: {
    title: 'Control',
    subtitle: 'Monitorea la asistencia en tiempo real y administra la configuracion.',
    refresh: 'Actualizar',
    loading: 'Cargando control operativo',
    retry: 'Reintentar',
    unauthorized: 'Tu sesión ya no está autenticada. Inicia sesión de nuevo y vuelve a cargar el módulo.',
    notFound: 'El backend en ejecución todavía no expone la API de control. Reinicia Spring con la versión más reciente.',
    genericError: 'No se pudo cargar el control de asistencia.',
    saveError: 'No se pudo guardar el cambio solicitado.',
    bulkAssignSuccess: 'Asignación de horario actualizada correctamente.',
    locationSaved: 'Ubicación guardada correctamente.',
    templateSaved: 'Plantilla guardada correctamente.',
    searchPlaceholder: 'Buscar colaborador, código, puesto u horario',
    filters: {
      all: 'Todos',
      assigned: 'Asignados',
      unassigned: 'Sin horario',
      late: 'Retardos',
      corrected: 'Corregidos',
    },
    statuses: {
      on_time: 'A tiempo',
      late: 'Retardo',
      leave: 'Permiso',
      rest: 'Descanso',
      absence: 'Sin registro',
      active: 'Activo',
      inactive: 'Inactivo',
    },
    summary: {
      employees: 'Colaboradores en alcance',
      assigned: 'Horarios asignados',
      unassigned: 'Sin horario',
      locations: 'Ubicaciones activas',
      templates: 'Plantillas',
      late: 'Retardos del día',
      corrections: 'Correcciones manuales',
      records: 'Registros de asistencia',
      authSuccess: 'Autenticaciones válidas',
      authFailure: 'Fallos de autenticación',
      overrides: 'Anulaciones',
    },
    sections: {
      locations: 'Ubicaciones de asistencia',
      locationsHint: 'Estos son los puntos de control activos permitidos para registrar asistencia.',
      kiosks: 'Dispositivos de kiosco',
      kiosksHint: 'Estos dispositivos definen dónde se permite la autenticación del kiosco y cómo se alinea con la estructura operativa.',
      templates: 'Plantillas de horario',
      templatesHint: 'Revisa la cobertura de plantillas y la definición semanal que respalda el control de asistencia.',
      templateDetail: 'Detalle de plantilla',
      employees: 'Cobertura por colaborador',
      employeesHint: 'Usa esta lista para validar quién tiene horario asignado y cómo se resolvió operativamente la fecha seleccionada.',
      employeeDetail: 'Detalle del colaborador',
      access: 'Acceso del colaborador',
      recentActivity: 'Actividad reciente',
    },
    labels: {
      controlDate: 'Fecha de control',
      assignedEmployees: 'Colaboradores asignados',
      noLocations: 'Todavía no hay ubicaciones de asistencia configuradas.',
      noKiosks: 'Todavía no hay dispositivos de kiosco configurados.',
      noTemplates: 'Todavía no hay plantillas de horario configuradas.',
      noEmployees: 'No hay colaboradores con la búsqueda actual.',
      noEmployeeSelected: 'Selecciona un colaborador para inspeccionar la cobertura de horario y el resultado de la fecha seleccionada.',
      noTemplateSelected: 'Selecciona una plantilla para revisar sus reglas semanales.',
      radius: 'Radio',
      coordinates: 'Coordenadas',
      start: 'Inicio',
      end: 'Fin',
      tolerance: 'Tolerancia',
      restDay: 'Descanso',
      dayOff: 'Día de descanso',
      noSchedule: 'Sin horario asignado',
      schedule: 'Horario',
      dateRange: 'Cobertura',
      effectiveStatus: 'Estatus efectivo',
      systemStatus: 'Estatus del sistema',
      correction: 'Corrección manual',
      noCorrection: 'Sin corrección manual',
      checkIn: 'Entrada',
      checkOut: 'Salida',
      minutesLate: 'Minutos tarde',
      department: 'Departamento',
      unit: 'Unidad',
      business: 'Negocio',
      noDepartment: 'Sin departamento',
      noUnit: 'Sin unidad',
      noBusiness: 'Sin negocio',
      noTime: 'No programado',
      unassignedWarning: 'Este colaborador no tiene un horario activo asignado para la fecha seleccionada.',
      ruleForDay: 'Regla del día seleccionado',
      noRuleForDay: 'No existe una regla activa de horario para la fecha seleccionada.',
      dailyAttendance: 'Asistencia diaria',
      attendanceCalendar: 'Calendario de asistencia',
      noRegistration: 'Sin registro',
      loadingCalendar: 'Cargando calendario',
      selectEmployeeCalendar: 'Selecciona un colaborador para cargar el calendario de asistencia.',
      openLocation: 'Ubicacion',
      currentDay: 'Dia actual',
      faceEnrollmentStatus: 'Inscripcion facial',
      faceNotEnrolled: 'No hay inscripcion biometrica disponible.',
      modifyStatusOfDay: 'Modificar estatus del dia',
      systemRegistration: 'Registro del sistema',
      notModifiable: 'No modificable',
      totalTime: 'Tiempo total',
      manuallyModifyStatus: 'Modificar estatus manualmente',
      currentStatus: 'Estatus actual',
      noEvidence: 'No hay evidencia fotografica guardada para este dia.',
      noLocationHistory: 'No hay ubicacion registrada para este dia.',
      markAsAttendance: 'Marcar como asistencia',
      markAsAbsent: 'Marcar como ausencia',
      markAsDelay: 'Marcar como retardo',
      markAsRest: 'Marcar como descanso',
      clearManualCorrection: 'Limpiar correccion manual',
      correctionApplied: 'Correccion aplicada correctamente.',
      correctionCleared: 'Correccion eliminada correctamente.',
      savingDayStatus: 'Guardando estatus del dia',
      savingDayStatusDescription: 'Estamos guardando la correccion manual y refrescando la vista de asistencia.',
      searchLabel: 'Buscar colaboradores',
      selectedTemplate: 'Plantilla seleccionada',
      selectedEmployee: 'Colaborador seleccionado',
      addLocation: 'Agregar ubicación',
      addTemplate: 'Agregar plantilla',
      bulkAssign: 'Asignación masiva',
      status: 'Estado',
      locationName: 'Nombre de la ubicación',
      latitude: 'Latitud',
      longitude: 'Longitud',
      save: 'Guardar',
      cancel: 'Cancelar',
      code: 'Código',
      templateName: 'Nombre de la plantilla',
      dayLabel: 'Día',
      chooseTemplate: 'Elegir plantilla',
      effectiveStart: 'Inicio de vigencia',
      effectiveEnd: 'Fin de vigencia',
      employeesToAssign: 'Colaboradores a asignar',
      assignmentHint: 'Las asignaciones activas que se traslapen se cerrarán automáticamente el día anterior al nuevo inicio.',
      addKiosk: 'Agregar kiosco',
      defaultMethod: 'Método por defecto',
      methods: 'Métodos',
      noAccessProfile: 'No hay un perfil de acceso configurado.',
      addAccessProfile: 'Crear perfil de acceso',
      editAccessProfile: 'Editar perfil de acceso',
      addAccessMethod: 'Agregar método',
      editAccessMethod: 'Editar método',
      accessProfileStatus: 'Estado del perfil',
      methodType: 'Tipo de método',
      credentialRef: 'Referencia de credencial',
      secret: 'Secreto',
      priority: 'Prioridad',
      noCredentialRef: 'Sin referencia',
      kioskScope: 'Alcance',
      linkedLocation: 'Ubicación ligada',
      noLinkedLocation: 'Sin ubicación ligada',
      noMethods: 'No hay métodos de acceso configurados.',
      metadataHint: 'Administra aqui los metodos del kiosco y la inscripcion biometrica del colaborador.',
      kioskDevice: 'Dispositivo de kiosco',
      kioskPublicLink: 'Enlace público del kiosco',
      copyKioskLink: 'Copiar enlace',
      showKioskQr: 'Mostrar QR',
      rotateKioskLink: 'Rotar enlace',
      kioskLinkCopied: 'Enlace del kiosco copiado.',
      kioskLinkRotated: 'Enlace del kiosco rotado correctamente.',
      kioskTokenUnavailable: 'Este kiosco todavía no tiene un enlace público disponible.',
      kioskTabBlocked: 'Permite las ventanas emergentes de este sitio para abrir el kiosco en una nueva pestaña.',
      kioskQrTitle: 'QR del kiosco',
      selectedKioskDevice: 'Dispositivo de kiosco seleccionado',
      eventTime: 'Hora del evento',
      eventKind: 'Tipo de evento',
      result: 'Resultado',
      noRecentEvents: 'No se ha registrado actividad de kiosco o acceso en la fecha seleccionada.',
      authMethods: {
        pin: 'PIN',
        badge: 'Gafete',
        password: 'Contraseña',
        manual_override: 'Anulación manual',
        facial_recognition: 'Reconocimiento facial',
      },
      eventKinds: {
        auth_attempt: 'Intento de acceso',
        check_in: 'Ingreso',
        check_out: 'Salida',
        break_out: 'Salida a descanso',
        break_in: 'Regreso de descanso',
        correction: 'Corrección',
        manual_override: 'Anulación manual',
      },
      resultStatuses: {
        success: 'Éxito',
        failure: 'Falló',
        rejected: 'Rechazado',
        overridden: 'Anulado',
      },
    },
  },
} as const;

const weekdayNumbers = [1, 2, 3, 4, 5, 6, 7] as const;

const summaryIcons = [Users, Clock3, AlertTriangle, MapPin, ShieldCheck, AlertTriangle, ShieldCheck, CalendarDays] as const;

const statusClasses: Record<string, string> = {
  on_time: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  late: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  leave: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300',
  rest: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  absence: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
  active: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};

const createDefaultTemplateDays = () =>
  weekdayNumbers.map((day) => ({
    day_of_week: day,
    start_time: day >= 1 && day <= 5 ? '09:00:00' : null,
    end_time: day >= 1 && day <= 5 ? '18:00:00' : null,
    meal_minutes: 0,
    rest_minutes: 0,
    late_after_minutes: 10,
    is_rest_day: day >= 6,
  }));

const defaultLocationForm = (): AttendanceControlLocationPayload => ({
  name: '',
  latitude: 25.686614,
  longitude: -100.316113,
  radius_meters: 120,
  status: 'active',
});

const defaultTemplateForm = (): AttendanceControlTemplatePayload => ({
  name: '',
  status: 'active',
  schedule_mode: 'strict',
  block_after_grace_period: false,
  enforce_location: false,
  location_id: null,
  days: createDefaultTemplateDays(),
});

const defaultAssignmentForm = (): AttendanceControlAssignmentPayload => ({
  employee_ids: [],
  template_id: 0,
  effective_start_date: todayIsoDate(),
  effective_end_date: '',
});

const defaultKioskForm = (): AttendanceKioskDevicePayload => ({
  code: '',
  name: '',
  unit_id: null,
  business_id: null,
  location_id: null,
  status: 'active',
  metadata: {
    supports_face_recognition: false,
  },
});

const defaultAccessProfileForm = (): AttendanceAccessProfilePayload => ({
  employee_id: 0,
  status: 'active',
  default_method: 'manual_override',
  metadata: {
    supports_face_recognition: false,
  },
});

const defaultAccessMethodForm = (): AttendanceAccessMethodPayload => ({
  access_profile_id: 0,
  method_type: 'manual_override',
  credential_ref: '',
  secret: '',
  status: 'active',
  priority: 100,
  metadata: {},
});

const formatTime = (value: string | null | undefined, locale: string, fallback: string) => {
  if (!value) {
    return fallback;
  }

  const parsed = new Date(`2026-01-01T${value}`);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed);
};

const formatDateTime = (value: string | null | undefined, locale: string, fallback: string) => {
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
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed);
};

const formatDate = (value: string | null | undefined, locale: string, fallback: string) => {
  if (!value) {
    return fallback;
  }

  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parsed);
};

const weekdayLabel = (dayOfWeek: number, locale: string) =>
  new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(new Date(2026, 0, 4 + dayOfWeek));

const findRuleForSelectedDay = (
  template: AttendanceControlTemplate | null,
  selectedDate: string,
) => {
  if (!template) {
    return null;
  }

  const parsed = new Date(`${selectedDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  const dayOfWeek = parsed.getDay() === 0 ? 7 : parsed.getDay();
  return template.days.find((day) => day.day_of_week === dayOfWeek) ?? null;
};

const toErrorMessage = (error: unknown, copy: typeof controlCopy.en | typeof controlCopy.es) => {
  if (error instanceof ApiClientError) {
    if (error.status === 404) {
      return copy.notFound;
    }
    if (error.status === 401) {
      return copy.unauthorized;
    }
    return error.message || copy.genericError;
  }

  return error instanceof Error ? error.message : copy.genericError;
};

export default function Control() {
  const { currentLanguage } = useLanguage();
  const copy = currentLanguage.code.startsWith('es') ? controlCopy.es : controlCopy.en;
  const manageKioskLabel = currentLanguage.code.startsWith('es') ? 'Administrar kiosco' : 'Manage Kiosk';
  const openKioskLabel = currentLanguage.code.startsWith('es') ? 'Abrir kiosco' : 'Open Kiosk';

  const [controlDate, setControlDate] = useState(todayIsoDate());
  const [calendarMonth, setCalendarMonth] = useState(toMonthValue(todayIsoDate()));
  const [searchQuery, setSearchQuery] = useState('');
  const [assignmentFilter, setAssignmentFilter] = useState<'all' | 'assigned' | 'unassigned' | 'late' | 'corrected'>('all');
  const [overview, setOverview] = useState<AttendanceControlOverviewResponse | null>(null);
  const [attendanceCalendarDays, setAttendanceCalendarDays] = useState<AttendanceCalendarDay[]>([]);
  const [locations, setLocations] = useState<AttendanceControlLocation[]>([]);
  const [templates, setTemplates] = useState<AttendanceControlTemplate[]>([]);
  const [kioskDevices, setKioskDevices] = useState<AttendanceKioskDevice[]>([]);
  const [accessProfiles, setAccessProfiles] = useState<AttendanceAccessProfile[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useLocalStorageState<number | null>(
    hrAttendanceSelectedEmployeeStorageKey,
    null,
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [selectedKioskDeviceId, setSelectedKioskDeviceId] = useState<number | null>(null);
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<AttendanceCalendarDay | null>(null);
  const [pendingCalendarStatus, setPendingCalendarStatus] = useState<AttendanceCalendarDay['effective_status'] | ''>('');
  const [faceEnrollment, setFaceEnrollment] = useState<{ id: number; status: string; enrolled_at?: string | null } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(false);
  const [isUpdatingCalendarDay, setIsUpdatingCalendarDay] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isKioskQrDialogOpen, setIsKioskQrDialogOpen] = useState(false);
  const [kioskQrDataUrl, setKioskQrDataUrl] = useState('');

  const [isLocationDialogOpen, setIsLocationDialogOpen] = useState(false);
  const [isLocationRegistrationModalOpen, setIsLocationRegistrationModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<AttendanceControlLocation | null>(null);
  const [locationForm, setLocationForm] = useState<AttendanceControlLocationPayload>(defaultLocationForm());

  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [isSchedulesModalOpen, setIsSchedulesModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<AttendanceControlTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState<AttendanceControlTemplatePayload>(defaultTemplateForm());

  const [isAssignmentDialogOpen, setIsAssignmentDialogOpen] = useState(false);
  const [assignmentForm, setAssignmentForm] = useState<AttendanceControlAssignmentPayload>(defaultAssignmentForm());
  const [isKioskDialogOpen, setIsKioskDialogOpen] = useState(false);
  const [editingKiosk, setEditingKiosk] = useState<AttendanceKioskDevice | null>(null);
  const [kioskForm, setKioskForm] = useState<AttendanceKioskDevicePayload>(defaultKioskForm());
  const [isAccessProfileDialogOpen, setIsAccessProfileDialogOpen] = useState(false);
  const [editingAccessProfile, setEditingAccessProfile] = useState<AttendanceAccessProfile | null>(null);
  const [accessProfileForm, setAccessProfileForm] = useState<AttendanceAccessProfilePayload>(defaultAccessProfileForm());
  const [isAccessMethodDialogOpen, setIsAccessMethodDialogOpen] = useState(false);
  const [editingAccessMethod, setEditingAccessMethod] = useState<AttendanceAccessMethod | null>(null);
  const [accessMethodForm, setAccessMethodForm] = useState<AttendanceAccessMethodPayload>(defaultAccessMethodForm());
  const [isFaceEnrollmentModalOpen, setIsFaceEnrollmentModalOpen] = useState(false);

  const loadControl = async (date: string) => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const [overviewResponse, locationsResponse, templatesResponse, kioskDevicesResponse, accessProfilesResponse] = await Promise.all([
        humanResourcesApi.getAttendanceControlOverview(date),
        humanResourcesApi.listAttendanceControlLocations(),
        humanResourcesApi.listAttendanceControlTemplates(),
        humanResourcesApi.listAttendanceKioskDevices(),
        humanResourcesApi.listAttendanceAccessProfiles(),
      ]);

      setOverview(overviewResponse);
      setLocations(locationsResponse.items);
      setTemplates(templatesResponse.items);
      setKioskDevices(kioskDevicesResponse.items);
      setAccessProfiles(accessProfilesResponse.items);
      setSelectedEmployeeId((current) =>
        current && overviewResponse.assignments.some((assignment) => assignment.employee_id === current)
          ? current
          : overviewResponse.assignments[0]?.employee_id ?? null,
      );
      setSelectedTemplateId((current) =>
        current && templatesResponse.items.some((template) => template.id === current)
          ? current
          : overviewResponse.assignments[0]?.schedule_template_id ?? templatesResponse.items[0]?.id ?? null,
      );
      setSelectedKioskDeviceId((current) =>
        current && kioskDevicesResponse.items.some((device) => device.id === current)
          ? current
          : kioskDevicesResponse.items[0]?.id ?? null,
      );
    } catch (error) {
      setErrorMessage(toErrorMessage(error, copy));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadControl(controlDate);
  }, [controlDate]);

  useEffect(() => {
    const nextMonth = controlDate.slice(0, 7);
    setCalendarMonth((current) => (current === nextMonth ? current : nextMonth));
  }, [controlDate]);

  useEffect(() => {
    if (!successMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => setSuccessMessage(''), 2500);
    return () => window.clearTimeout(timeoutId);
  }, [successMessage]);

  useEffect(() => {
    if (!selectedEmployeeId) {
      setFaceEnrollment(null);
      return;
    }

    let active = true;
    humanResourcesApi.getFaceEnrollment(selectedEmployeeId)
      .then((response) => {
        if (active) {
          setFaceEnrollment(response.enrollment);
        }
      })
      .catch(() => {
        if (active) {
          setFaceEnrollment(null);
        }
      });

    return () => {
      active = false;
    };
  }, [selectedEmployeeId, successMessage]);

  useEffect(() => {
    if (!selectedEmployeeId) {
      setAttendanceCalendarDays([]);
      setSelectedCalendarDay(null);
      setIsLoadingCalendar(false);
      return;
    }

    let active = true;
    setIsLoadingCalendar(true);

    humanResourcesApi.getAttendanceCalendar(selectedEmployeeId, calendarMonth)
      .then((response) => {
        if (active) {
          setAttendanceCalendarDays(response.items);
        }
      })
      .catch((error) => {
        if (!active) {
          return;
        }

        setAttendanceCalendarDays([]);
        setErrorMessage(toErrorMessage(error, copy));
      })
      .finally(() => {
        if (active) {
          setIsLoadingCalendar(false);
        }
      });

    return () => {
      active = false;
    };
  }, [calendarMonth, copy, selectedEmployeeId, successMessage]);

  useEffect(() => {
    if (!selectedCalendarDay) {
      return;
    }

    const refreshedDay = attendanceCalendarDays.find((day) => day.date === selectedCalendarDay.date);
    if (!refreshedDay) {
      setSelectedCalendarDay(null);
      return;
    }

    if (refreshedDay !== selectedCalendarDay) {
      setSelectedCalendarDay(refreshedDay);
    }
  }, [attendanceCalendarDays, selectedCalendarDay]);

  useEffect(() => {
    if (!selectedCalendarDay) {
      setPendingCalendarStatus('');
      return;
    }

    setPendingCalendarStatus(selectedCalendarDay.corrected_status ?? '');
  }, [selectedCalendarDay]);

  const filteredAssignments = useMemo(() => {
    if (!overview) {
      return [];
    }

    const normalizedSearch = searchQuery.trim().toLowerCase();
    return overview.assignments.filter((assignment) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        `${assignment.employee_name} ${assignment.employee_number ?? ''} ${assignment.position_title ?? ''} ${assignment.schedule_template_name ?? ''}`
          .toLowerCase()
          .includes(normalizedSearch);

      const matchesFilter = (() => {
        switch (assignmentFilter) {
          case 'assigned':
            return Boolean(assignment.schedule_template_id);
          case 'unassigned':
            return !assignment.schedule_template_id;
          case 'late':
            return assignment.today_status === 'late';
          case 'corrected':
            return Boolean(assignment.corrected_status);
          default:
            return true;
        }
      })();

      return matchesSearch && matchesFilter;
    });
  }, [assignmentFilter, overview, searchQuery]);

  const selectedEmployee = useMemo(
    () => overview?.assignments.find((assignment) => assignment.employee_id === selectedEmployeeId) ?? null,
    [overview?.assignments, selectedEmployeeId],
  );

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateId) ?? null,
    [templates, selectedTemplateId],
  );

  const selectedKioskDevice = useMemo(
    () => kioskDevices.find((device) => device.id === selectedKioskDeviceId) ?? null,
    [kioskDevices, selectedKioskDeviceId],
  );
  const selectedKioskDeviceLink = useMemo(() => {
    if (!selectedKioskDevice?.public_access_token || typeof window === 'undefined') {
      return '';
    }

    return `${window.location.origin}/kiosk/${selectedKioskDevice.public_access_token}`;
  }, [selectedKioskDevice?.public_access_token]);

  useEffect(() => {
    if (!isKioskQrDialogOpen || !selectedKioskDeviceLink) {
      setKioskQrDataUrl('');
      return;
    }

    let active = true;
    QRCode.toDataURL(selectedKioskDeviceLink, {
      margin: 1,
      width: 320,
      color: {
        dark: '#143675',
        light: '#ffffff',
      },
    })
      .then((dataUrl) => {
        if (active) {
          setKioskQrDataUrl(dataUrl);
        }
      })
      .catch(() => {
        if (active) {
          setKioskQrDataUrl('');
        }
      });

    return () => {
      active = false;
    };
  }, [isKioskQrDialogOpen, selectedKioskDeviceLink]);

  const selectedAccessProfile = useMemo(
    () => accessProfiles.find((profile) => profile.employee_id === selectedEmployeeId) ?? null,
    [accessProfiles, selectedEmployeeId],
  );

  const attendanceCalendarMap = useMemo(
    () => new Map(attendanceCalendarDays.map((day) => [day.day, day])),
    [attendanceCalendarDays],
  );

  const calendarCells = useMemo(() => {
    const [year, month] = calendarMonth.split('-').map(Number);
    const firstDay = new Date(year, month - 1, 1);
    const startOffset = firstDay.getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    const cells: Array<number | null> = [];

    for (let index = 0; index < startOffset; index += 1) {
      cells.push(null);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push(day);
    }

    while (cells.length % 7 !== 0) {
      cells.push(null);
    }

    return cells;
  }, [calendarMonth]);

  const weekdayLabels = useMemo(
    () =>
      Array.from({ length: 7 }).map((_, index) =>
        new Intl.DateTimeFormat(currentLanguage.code, { weekday: 'short' }).format(new Date(2026, 0, 4 + index)),
      ),
    [currentLanguage.code],
  );

  const controlDateLabel = useMemo(
    () =>
      new Intl.DateTimeFormat(currentLanguage.code, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }).format(new Date(`${controlDate}T00:00:00`)),
    [controlDate, currentLanguage.code],
  );

  const calendarMonthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat(currentLanguage.code, {
        month: 'long',
        year: 'numeric',
      }).format(new Date(`${calendarMonth}-01T00:00:00`)),
    [calendarMonth, currentLanguage.code],
  );

  const selectedRuleForDate = useMemo(
    () => findRuleForSelectedDay(selectedTemplate, controlDate),
    [controlDate, selectedTemplate],
  );

  const summaryCards = overview
    ? [
        { label: copy.summary.employees, value: overview.summary.employees_count },
        { label: copy.summary.assigned, value: overview.summary.assigned_employees_count },
        { label: copy.summary.unassigned, value: overview.summary.unassigned_employees_count },
        { label: copy.summary.locations, value: overview.summary.locations_count },
        { label: copy.summary.templates, value: overview.summary.templates_count },
        { label: copy.summary.late, value: overview.summary.late_today_count },
        { label: copy.summary.corrections, value: overview.summary.manual_corrections_count },
        { label: copy.summary.records, value: overview.summary.records_today_count },
        { label: copy.summary.authSuccess, value: overview.summary.auth_success_count },
        { label: copy.summary.authFailure, value: overview.summary.auth_failure_count },
        { label: copy.summary.overrides, value: overview.summary.override_count },
      ]
    : [];

  const shiftCalendarMonth = (direction: -1 | 1) => {
    const [year, month] = calendarMonth.split('-').map(Number);
    const base = new Date(year, month - 1, 1);
    const next = new Date(base.getFullYear(), base.getMonth() + direction, 1);
    const nextMonth = toMonthValue(next);
    const currentDay = Number(controlDate.slice(8, 10));
    const lastDayOfNextMonth = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
    const nextDay = `${Math.min(currentDay, lastDayOfNextMonth)}`.padStart(2, '0');

    setCalendarMonth(nextMonth);
    setControlDate(`${nextMonth}-${nextDay}`);
  };

  const handleCalendarStatusUpdate = async (
    date: string,
    status: AttendanceCalendarDay['effective_status'] | '',
  ) => {
    if (!selectedEmployeeId) {
      return false;
    }

    try {
      setIsUpdatingCalendarDay(true);
      const result = await runWithMinimumDuration(
        humanResourcesApi.updateAttendanceDailyRecord(selectedEmployeeId, date, { status }),
        850,
      );
      setControlDate(date);

      setAttendanceCalendarDays((current) =>
        current.map((day) => (day.date === date ? applyCalendarDayUpdate(day, result) : day)),
      );
      setSelectedCalendarDay((current) =>
        current && current.date === date ? applyCalendarDayUpdate(current, result) : current,
      );

      setOverview((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          date,
          assignments: current.assignments.map((assignment) =>
            assignment.employee_id === selectedEmployeeId
              ? {
                  ...assignment,
                  today_status: result.effective_status as AttendanceControlAssignment['today_status'],
                  system_status: result.system_status as AttendanceControlAssignment['system_status'],
                  corrected_status: (result.corrected_status ?? null) as AttendanceControlAssignment['corrected_status'],
                }
              : assignment,
          ),
        };
      });

      const [calendarResponse] = await Promise.all([
        humanResourcesApi.getAttendanceCalendar(selectedEmployeeId, calendarMonth),
        loadControl(date),
      ]);

      setAttendanceCalendarDays(calendarResponse.items);
      setSelectedCalendarDay(calendarResponse.items.find((day) => day.date === date) ?? null);
      setSuccessMessage(status ? copy.labels.correctionApplied : copy.labels.correctionCleared);
      return true;
    } catch (error) {
      setErrorMessage(toErrorMessage(error, copy) || copy.saveError);
      return false;
    } finally {
      setIsUpdatingCalendarDay(false);
    }
  };

  const openNewLocationDialog = () => {
    setEditingLocation(null);
    setLocationForm(defaultLocationForm());
    setIsLocationDialogOpen(true);
  };

  const openEditLocationDialog = (location: AttendanceControlLocation) => {
    setEditingLocation(location);
    setLocationForm({
      name: location.name,
      latitude: location.latitude,
      longitude: location.longitude,
      radius_meters: location.radius_meters,
      status: location.status === 'inactive' ? 'inactive' : 'active',
    });
    setIsLocationDialogOpen(true);
  };

  const openNewTemplateDialog = () => {
    setEditingTemplate(null);
    setTemplateForm(defaultTemplateForm());
    setIsTemplateDialogOpen(true);
  };

  const openEditTemplateDialog = (template: AttendanceControlTemplate) => {
    setEditingTemplate(template);
    setTemplateForm({
      name: template.name,
      status: template.status === 'inactive' ? 'inactive' : 'active',
      schedule_mode: template.schedule_mode === 'open' ? 'open' : 'strict',
      block_after_grace_period: Boolean(template.block_after_grace_period),
      enforce_location: Boolean(template.enforce_location),
      location_id: template.location_id ?? null,
      days: weekdayNumbers.map((dayOfWeek) => {
        const rule = template.days.find((day) => day.day_of_week === dayOfWeek);
        return {
          day_of_week: dayOfWeek,
          start_time: rule?.start_time ?? null,
          end_time: rule?.end_time ?? null,
          meal_minutes: rule?.meal_minutes ?? 0,
          rest_minutes: rule?.rest_minutes ?? 0,
          late_after_minutes: rule?.late_after_minutes ?? 10,
          is_rest_day: rule?.is_rest_day ?? (dayOfWeek >= 6),
        };
      }),
    });
    setSelectedTemplateId(template.id);
    setIsTemplateDialogOpen(true);
  };

  const openAssignmentDialog = () => {
    setAssignmentForm({
      employee_ids: selectedEmployee ? [selectedEmployee.employee_id] : [],
      template_id: selectedEmployee?.schedule_template_id ?? selectedTemplate?.id ?? templates[0]?.id ?? 0,
      effective_start_date: controlDate,
      effective_end_date: '',
    });
    setIsAssignmentDialogOpen(true);
  };

  const openNewKioskDialog = () => {
    setEditingKiosk(null);
    setKioskForm(defaultKioskForm());
    setIsKioskDialogOpen(true);
  };

  const openEditKioskDialog = (device: AttendanceKioskDevice) => {
    setEditingKiosk(device);
    setKioskForm({
      code: device.code,
      name: device.name,
      unit_id: device.unit_id ?? null,
      business_id: device.business_id ?? null,
      location_id: device.location_id ?? null,
      status: device.status,
      metadata: device.metadata ?? { supports_face_recognition: false },
    });
    setSelectedKioskDeviceId(device.id);
    setIsKioskDialogOpen(true);
  };

  const openCreateAccessProfileDialog = () => {
    setEditingAccessProfile(null);
    setAccessProfileForm({
      ...defaultAccessProfileForm(),
      employee_id: selectedEmployee?.employee_id ?? 0,
    });
    setIsAccessProfileDialogOpen(true);
  };

  const openEditAccessProfileDialog = (profile: AttendanceAccessProfile) => {
    setEditingAccessProfile(profile);
    setAccessProfileForm({
      employee_id: profile.employee_id,
      status: profile.status,
      default_method: profile.default_method,
      last_enrolled_at: profile.last_enrolled_at ?? undefined,
      metadata: profile.metadata ?? { supports_face_recognition: false },
    });
    setIsAccessProfileDialogOpen(true);
  };

  const openCreateAccessMethodDialog = () => {
    if (!selectedAccessProfile) {
      return;
    }
    setEditingAccessMethod(null);
    setAccessMethodForm({
      ...defaultAccessMethodForm(),
      access_profile_id: selectedAccessProfile.id,
    });
    setIsAccessMethodDialogOpen(true);
  };

  const openEditAccessMethodDialog = (method: AttendanceAccessMethod) => {
    setEditingAccessMethod(method);
    setAccessMethodForm({
      access_profile_id: method.access_profile_id,
      method_type: method.method_type,
      credential_ref: method.credential_ref ?? '',
      secret: '',
      status: method.status,
      priority: method.priority,
      metadata: method.metadata ?? {},
    });
    setIsAccessMethodDialogOpen(true);
  };

  const handleSaveLocation = async () => {
    setIsSaving(true);
    setErrorMessage('');

    try {
      if (editingLocation) {
        await humanResourcesApi.updateAttendanceControlLocation(editingLocation.id, locationForm);
      } else {
        await humanResourcesApi.createAttendanceControlLocation(locationForm);
      }

      setIsLocationDialogOpen(false);
      setSuccessMessage(copy.locationSaved);
      await loadControl(controlDate);
    } catch (error) {
      setErrorMessage(toErrorMessage(error, copy) || copy.saveError);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveTemplate = async () => {
    setIsSaving(true);
    setErrorMessage('');

    try {
      if (editingTemplate) {
        await humanResourcesApi.updateAttendanceControlTemplate(editingTemplate.id, templateForm);
      } else {
        await humanResourcesApi.createAttendanceControlTemplate(templateForm);
      }

      setIsTemplateDialogOpen(false);
      setSuccessMessage(copy.templateSaved);
      await loadControl(controlDate);
    } catch (error) {
      setErrorMessage(toErrorMessage(error, copy) || copy.saveError);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBulkAssign = async () => {
    setIsSaving(true);
    setErrorMessage('');

    try {
      await humanResourcesApi.bulkAssignAttendanceSchedule({
        employee_ids: assignmentForm.employee_ids,
        template_id: Number(assignmentForm.template_id),
        effective_start_date: assignmentForm.effective_start_date,
        effective_end_date: assignmentForm.effective_end_date || undefined,
      });

      setIsAssignmentDialogOpen(false);
      setSuccessMessage(copy.bulkAssignSuccess);
      await loadControl(controlDate);
    } catch (error) {
      setErrorMessage(toErrorMessage(error, copy) || copy.saveError);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveKiosk = async () => {
    setIsSaving(true);
    setErrorMessage('');

    try {
      if (editingKiosk) {
        await humanResourcesApi.updateAttendanceKioskDevice(editingKiosk.id, kioskForm);
      } else {
        await humanResourcesApi.createAttendanceKioskDevice(kioskForm);
      }

      setIsKioskDialogOpen(false);
      setSuccessMessage(copy.labels.addKiosk);
      await loadControl(controlDate);
    } catch (error) {
      setErrorMessage(toErrorMessage(error, copy) || copy.saveError);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAccessProfile = async () => {
    setIsSaving(true);
    setErrorMessage('');

    try {
      if (editingAccessProfile) {
        await humanResourcesApi.updateAttendanceAccessProfile(editingAccessProfile.id, accessProfileForm);
      } else {
        await humanResourcesApi.createAttendanceAccessProfile(accessProfileForm);
      }

      setIsAccessProfileDialogOpen(false);
      setSuccessMessage(copy.labels.editAccessProfile);
      await loadControl(controlDate);
    } catch (error) {
      setErrorMessage(toErrorMessage(error, copy) || copy.saveError);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAccessMethod = async () => {
    setIsSaving(true);
    setErrorMessage('');

    try {
      if (editingAccessMethod) {
        await humanResourcesApi.updateAttendanceAccessMethod(editingAccessMethod.id, accessMethodForm);
      } else {
        await humanResourcesApi.createAttendanceAccessMethod(accessMethodForm);
      }

      setIsAccessMethodDialogOpen(false);
      setSuccessMessage(copy.labels.editAccessMethod);
      await loadControl(controlDate);
    } catch (error) {
      setErrorMessage(toErrorMessage(error, copy) || copy.saveError);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteFaceEnrollment = async () => {
    if (!selectedEmployeeId) {
      return;
    }

    setIsSaving(true);
    setErrorMessage('');

    try {
      await humanResourcesApi.deleteFaceEnrollment(selectedEmployeeId);
      setSuccessMessage('Face enrollment removed.');
      setFaceEnrollment(null);
    } catch (error) {
      setErrorMessage(toErrorMessage(error, copy) || copy.saveError);
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenKiosk = () => {
    if (!selectedKioskDeviceLink) {
      setErrorMessage(copy.labels.kioskTokenUnavailable);
      return;
    }

    const kioskLink = selectedKioskDeviceLink;
    const kioskWindow = window.open('', '_blank');
    if (kioskWindow) {
      kioskWindow.opener = null;
      kioskWindow.location.href = kioskLink;
      return;
    }

    setErrorMessage(copy.labels.kioskTabBlocked);
  };

  const handleCopyKioskLink = async () => {
    if (!selectedKioskDeviceLink) {
      setErrorMessage(copy.labels.kioskTokenUnavailable);
      return;
    }

    try {
      await navigator.clipboard.writeText(selectedKioskDeviceLink);
      setSuccessMessage(copy.labels.kioskLinkCopied);
    } catch {
      setErrorMessage(copy.saveError);
    }
  };

  const handleRotateKioskLink = async () => {
    if (!selectedKioskDevice) {
      setErrorMessage(copy.labels.kioskTokenUnavailable);
      return;
    }

    setIsSaving(true);
    setErrorMessage('');

    try {
      const response = await humanResourcesApi.rotateAttendanceKioskDevicePublicToken(selectedKioskDevice.id);
      setKioskDevices((current) => current.map((device) => (
        device.id === response.kiosk_device.id ? response.kiosk_device : device
      )));
      setSuccessMessage(copy.labels.kioskLinkRotated);
      setIsKioskQrDialogOpen(false);
    } catch (error) {
      setErrorMessage(toErrorMessage(error, copy) || copy.saveError);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <LoadingBarOverlay
        isVisible={isUpdatingCalendarDay}
        title={copy.labels.savingDayStatus}
        description={copy.labels.savingDayStatusDescription}
      />

      {errorMessage ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-700/30 dark:bg-red-900/20 dark:text-red-300">
          <div className="flex items-center justify-between gap-3">
            <span>{errorMessage}</span>
            <Button variant="outline" size="sm" onClick={() => void loadControl(controlDate)}>
              {copy.retry}
            </Button>
          </div>
        </div>
      ) : null}

      {successMessage ? (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-950/20 dark:text-emerald-300">
          {successMessage}
        </div>
      ) : null}

      <div className="mb-6 rounded-lg border border-[#143675]/20 bg-[#143675]/5 p-6 dark:border-[#143675]/30 dark:bg-[#143675]/10">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h2 className="mb-1 flex items-center gap-2 text-2xl font-semibold text-gray-900 dark:text-white">
              <span className="text-2xl">📅</span>
              {copy.title}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">{copy.subtitle}</p>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              variant="outline"
              className="h-8 whitespace-nowrap rounded-md border-gray-300 bg-white px-3 text-xs font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              onClick={() => setIsLocationRegistrationModalOpen(true)}
            >
              <MapPin className="h-3.5 w-3.5" />
              Register locations
            </Button>
            <Button
              variant="outline"
              className="h-8 whitespace-nowrap rounded-md border-gray-300 bg-white px-3 text-xs font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              onClick={() => setIsSchedulesModalOpen(true)}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              Schedules
            </Button>
            <Button
              variant="outline"
              className="h-8 whitespace-nowrap rounded-md border-gray-300 bg-white px-3 text-xs font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              onClick={openNewKioskDialog}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              {manageKioskLabel}
            </Button>
            <Button
              className="h-8 whitespace-nowrap rounded-md bg-[#143675] px-3 text-xs font-medium text-white shadow-sm hover:bg-[#0f2855]"
              onClick={handleOpenKiosk}
            >
              <Link2 className="h-3.5 w-3.5" />
              {openKioskLabel}
            </Button>
          </div>
        </div>
      </div>

      {!isLoading ? (
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{copy.sections.kiosks}</h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{copy.sections.kiosksHint}</p>
            </div>

            {kioskDevices.length > 0 ? (
              <div className="w-full max-w-xs">
                <label className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">
                  {copy.labels.selectedKioskDevice}
                </label>
                <select
                  value={selectedKioskDeviceId ?? ''}
                  onChange={(event) => setSelectedKioskDeviceId(event.target.value ? Number(event.target.value) : null)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#143675] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  {kioskDevices.map((device) => (
                    <option key={device.id} value={device.id}>{device.name}</option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>

          {selectedKioskDevice ? (
            <>
              <div className="mt-5 flex flex-wrap gap-2">
                <CompactInfoChip>{copy.labels.kioskDevice}: {selectedKioskDevice.name}</CompactInfoChip>
                <CompactInfoChip>{copy.labels.linkedLocation}: {selectedKioskDevice.location_name || copy.labels.noLinkedLocation}</CompactInfoChip>
                <CompactInfoChip>{copy.labels.status}: {copy.statuses[selectedKioskDevice.status]}</CompactInfoChip>
              </div>

              <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/40">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">
                  {copy.labels.kioskPublicLink}
                </p>
                <p className="mt-2 break-all text-sm text-gray-700 dark:text-gray-200">
                  {selectedKioskDeviceLink || copy.labels.kioskTokenUnavailable}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => void handleCopyKioskLink()}>
                    <Copy className="h-4 w-4" />
                    {copy.labels.copyKioskLink}
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={handleOpenKiosk}>
                    <ExternalLink className="h-4 w-4" />
                    {openKioskLabel}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsKioskQrDialogOpen(true)}
                    disabled={!selectedKioskDeviceLink}
                  >
                    <QrCode className="h-4 w-4" />
                    {copy.labels.showKioskQr}
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => void handleRotateKioskLink()} disabled={isSaving}>
                    <RotateCw className="h-4 w-4" />
                    {copy.labels.rotateKioskLink}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-400">
              {copy.labels.noKiosks}
            </div>
          )}
        </div>
      ) : null}

      {isLoading ? (
        <div className="space-y-6">
          <Skeleton className="h-[110px] rounded-2xl" />
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.9fr_1.8fr]">
            <Skeleton className="h-[900px] rounded-2xl" />
            <Skeleton className="h-[900px] rounded-2xl" />
          </div>
        </div>
      ) : overview ? (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.92fr_1.78fr]">
          <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="border-b border-gray-200 px-6 py-6 dark:border-gray-700">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">{copy.labels.dailyAttendance}</h3>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{controlDateLabel}</p>
                </div>
                <div className="w-full max-w-[180px]">
                  <label className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">
                    {copy.labels.controlDate}
                  </label>
                  <input
                    type="date"
                    value={controlDate}
                    onChange={(event) => setControlDate(event.target.value)}
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#143675] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
            </div>

            <div className="max-h-[860px] overflow-y-auto">
              {filteredAssignments.length > 0 ? (
                filteredAssignments.map((assignment) => (
                  <ControlAttendanceRow
                    key={assignment.employee_id}
                    assignment={assignment}
                    copy={copy}
                    locale={currentLanguage.code}
                    selected={selectedEmployeeId === assignment.employee_id}
                    onSelect={() => {
                      setSelectedEmployeeId(assignment.employee_id);
                      if (assignment.schedule_template_id) {
                        setSelectedTemplateId(assignment.schedule_template_id);
                      }
                    }}
                  />
                ))
              ) : (
                <div className="px-6 py-10 text-sm text-gray-500 dark:text-gray-400">
                  {copy.labels.noEmployees}
                </div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">{copy.labels.attendanceCalendar}</h3>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  {selectedEmployee ? selectedEmployee.employee_name : copy.labels.selectEmployeeCalendar}
                </p>
                {selectedEmployee ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <CompactInfoChip>{selectedEmployee.position_title || selectedEmployee.department || copy.labels.noDepartment}</CompactInfoChip>
                    <CompactInfoChip>{selectedEmployee.schedule_template_name || copy.labels.noSchedule}</CompactInfoChip>
                    <CompactInfoChip tone={statusClasses[selectedEmployee.today_status]}>
                      {copy.statuses[selectedEmployee.today_status]}
                    </CompactInfoChip>
                    <CompactInfoChip tone={faceEnrollment?.status === 'active' ? statusClasses.on_time : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}>
                      {copy.labels.faceEnrollmentStatus}: {faceEnrollment?.status ?? 'not_enrolled'}
                    </CompactInfoChip>
                  </div>
                ) : null}
              </div>

              {selectedEmployee ? (
                <div className="flex flex-wrap gap-2 xl:justify-end">
                  <Button variant="outline" size="sm" onClick={selectedAccessProfile ? () => openEditAccessProfileDialog(selectedAccessProfile) : openCreateAccessProfileDialog}>
                    {selectedAccessProfile ? copy.labels.editAccessProfile : copy.labels.addAccessProfile}
                  </Button>
                  {selectedAccessProfile ? (
                    <Button variant="outline" size="sm" onClick={openCreateAccessMethodDialog}>
                      {copy.labels.addAccessMethod}
                    </Button>
                  ) : null}
                  <Button variant="outline" size="sm" onClick={() => setIsFaceEnrollmentModalOpen(true)}>
                    {faceEnrollment ? 'Re-enroll face' : 'Enroll face'}
                  </Button>
                  {faceEnrollment ? (
                    <Button variant="outline" size="sm" onClick={() => void handleDeleteFaceEnrollment()}>
                      Delete face
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>

            {selectedEmployee ? (
              <>
                <div className="mt-8 flex items-center justify-between gap-4">
                  <Button variant="outline" size="icon" onClick={() => shiftCalendarMonth(-1)}>
                    <span aria-hidden="true">‹</span>
                  </Button>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">{calendarMonthLabel}</p>
                  <Button variant="outline" size="icon" onClick={() => shiftCalendarMonth(1)}>
                    <span aria-hidden="true">›</span>
                  </Button>
                </div>

                <div className="mt-8 grid grid-cols-7 gap-3">
                  {weekdayLabels.map((label) => (
                    <div key={label} className="px-2 text-center text-xs font-medium uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">
                      {label}
                    </div>
                  ))}
                </div>

                {isLoadingCalendar ? (
                  <div className="mt-4 grid grid-cols-7 gap-3">
                    {Array.from({ length: 35 }).map((_, index) => (
                      <Skeleton key={index} className="h-[92px] rounded-2xl" />
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 grid grid-cols-7 gap-3">
                    {calendarCells.map((dayNumber, index) => {
                      if (dayNumber === null) {
                        return <div key={`empty-${index}`} className="h-[92px]" />;
                      }

                      const day = attendanceCalendarMap.get(dayNumber) ?? null;
                      const dateKey = `${calendarMonth}-${`${dayNumber}`.padStart(2, '0')}`;

                      return (
                        <ControlCalendarDayCell
                          key={dateKey}
                          copy={copy}
                          day={day}
                          dayNumber={dayNumber}
                          isSelected={controlDate === dateKey}
                          onSelect={() => {
                            setControlDate(dateKey);
                            if (day) {
                              setSelectedCalendarDay(day);
                            }
                          }}
                        />
                      );
                    })}
                  </div>
                )}

                <div className="mt-6 border-t border-gray-200 pt-4 dark:border-gray-700">
                  <div className="flex flex-wrap gap-5 text-xs text-gray-600 dark:text-gray-300">
                    <LegendPill color="bg-emerald-500" label={copy.labels.checkIn} />
                    <LegendPill color="bg-sky-500" label={copy.labels.checkOut} />
                    <LegendOutline label={copy.labels.currentDay} />
                  </div>
                </div>
              </>
            ) : (
              <div className="mt-8 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-400">
                {copy.labels.selectEmployeeCalendar}
              </div>
            )}
          </section>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-10 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-400">
          {copy.loading}
        </div>
      )}

      <Dialog
        open={Boolean(selectedCalendarDay)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedCalendarDay(null);
          }
        }}
      >
        {selectedCalendarDay ? (
          <DialogContent className="max-h-[92vh] overflow-y-auto p-0 sm:max-w-[760px]">
            <DialogHeader className="border-b border-gray-200 px-6 py-5 dark:border-gray-700">
              <DialogTitle>
                {copy.labels.modifyStatusOfDay} {new Date(`${selectedCalendarDay.date}T00:00:00`).getDate()}
              </DialogTitle>
              <DialogDescription>
                {selectedEmployee?.employee_name || '—'} · {formatDate(selectedCalendarDay.date, currentLanguage.code, selectedCalendarDay.date)}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 px-6 py-5">
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/40">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{copy.labels.systemRegistration}</p>
                    <div className={`mt-3 inline-flex rounded-full px-3 py-1 text-sm font-medium ${dayStatusPillTone(selectedCalendarDay)}`}>
                      {copy.statuses[resolvedDayStatus(selectedCalendarDay)]}
                    </div>
                  </div>
                  <span className="text-xs font-medium uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500">
                    {copy.labels.notModifiable}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <DayInfoStat label={copy.labels.checkIn} value={formatTimeOnly(selectedCalendarDay.first_check_in_at, currentLanguage.code, copy.labels.noRegistration)} />
                  <DayInfoStat label={copy.labels.checkOut} value={formatTimeOnly(selectedCalendarDay.last_check_out_at, currentLanguage.code, copy.labels.noRegistration)} />
                  <DayInfoStat label={copy.labels.totalTime} value={formatWorkDuration(selectedCalendarDay.first_check_in_at, selectedCalendarDay.last_check_out_at, copy.labels.noRegistration)} />
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <DayEvidenceCard
                    label={copy.labels.checkIn}
                    photoUrl={selectedCalendarDay.first_photo_url ?? null}
                    location={selectedCalendarDay.first_location?.name ?? null}
                    copy={copy}
                  />
                  <DayEvidenceCard
                    label={copy.labels.checkOut}
                    photoUrl={selectedCalendarDay.last_photo_url ?? null}
                    location={selectedCalendarDay.last_location?.name ?? null}
                    copy={copy}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{copy.labels.manuallyModifyStatus}</p>
                <div className="grid gap-2">
                  <Button
                    type="button"
                    disabled={isUpdatingCalendarDay}
                    className={`justify-start bg-emerald-600 text-white hover:bg-emerald-700 ${pendingCalendarStatus === 'on_time' ? 'ring-2 ring-emerald-300 ring-offset-2' : ''}`}
                    onClick={() => setPendingCalendarStatus('on_time')}
                  >
                    {copy.labels.markAsAttendance}
                  </Button>
                  <Button
                    type="button"
                    disabled={isUpdatingCalendarDay}
                    className={`justify-start bg-rose-600 text-white hover:bg-rose-700 ${pendingCalendarStatus === 'absence' ? 'ring-2 ring-rose-300 ring-offset-2' : ''}`}
                    onClick={() => setPendingCalendarStatus('absence')}
                  >
                    {copy.labels.markAsAbsent}
                  </Button>
                  <Button
                    type="button"
                    disabled={isUpdatingCalendarDay}
                    className={`justify-start bg-amber-500 text-white hover:bg-amber-600 ${pendingCalendarStatus === 'late' ? 'ring-2 ring-amber-300 ring-offset-2' : ''}`}
                    onClick={() => setPendingCalendarStatus('late')}
                  >
                    {copy.labels.markAsDelay}
                  </Button>
                  <Button
                    type="button"
                    disabled={isUpdatingCalendarDay}
                    className={`justify-start bg-slate-500 text-white hover:bg-slate-600 ${pendingCalendarStatus === 'rest' ? 'ring-2 ring-slate-300 ring-offset-2' : ''}`}
                    onClick={() => setPendingCalendarStatus('rest')}
                  >
                    {copy.labels.markAsRest}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isUpdatingCalendarDay}
                    className={pendingCalendarStatus === '' ? 'border-[#1463ff] text-[#1463ff]' : ''}
                    onClick={() => setPendingCalendarStatus('')}
                  >
                    {copy.labels.clearManualCorrection}
                  </Button>
                </div>
                <div className="border-t border-gray-200 pt-3 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                  {copy.labels.currentStatus}: {' '}
                  <span className="font-medium text-gray-900 dark:text-white">
                    {copy.statuses[resolvedDayStatus(selectedCalendarDay)]}
                  </span>
                </div>
                <DialogFooter className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isUpdatingCalendarDay}
                    onClick={() => setSelectedCalendarDay(null)}
                  >
                    {copy.labels.cancel}
                  </Button>
                  <Button
                    type="button"
                    disabled={isUpdatingCalendarDay}
                    className="bg-[#143675] text-white hover:bg-[#0f2855]"
                    onClick={async () => {
                      const didSave = await handleCalendarStatusUpdate(selectedCalendarDay.date, pendingCalendarStatus);
                      if (didSave) {
                        setSelectedCalendarDay(null);
                      }
                    }}
                  >
                    {copy.labels.save}
                  </Button>
                </DialogFooter>
              </div>
            </div>
          </DialogContent>
        ) : null}
      </Dialog>

      <Dialog open={isKioskQrDialogOpen} onOpenChange={setIsKioskQrDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{copy.labels.kioskQrTitle}</DialogTitle>
            <DialogDescription>{selectedKioskDeviceLink || copy.labels.kioskTokenUnavailable}</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-4">
            {kioskQrDataUrl ? (
              <img src={kioskQrDataUrl} alt={copy.labels.kioskQrTitle} className="h-72 w-72 rounded-2xl border border-gray-200 bg-white p-3" />
            ) : (
              <div className="flex h-72 w-72 items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-gray-50 text-sm text-gray-500">
                {copy.loading}
              </div>
            )}
            <Button type="button" variant="outline" className="w-full gap-2" onClick={() => void handleCopyKioskLink()}>
              <Copy className="h-4 w-4" />
              {copy.labels.copyKioskLink}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ControlLocationDialog
        copy={copy}
        isOpen={isLocationDialogOpen}
        isSaving={isSaving}
        form={locationForm}
        onClose={() => setIsLocationDialogOpen(false)}
        onChange={setLocationForm}
        onSave={() => void handleSaveLocation()}
        title={editingLocation ? `${copy.labels.addLocation}: ${editingLocation.name}` : copy.labels.addLocation}
      />

      <ControlTemplateDialog
        copy={copy}
        isOpen={isTemplateDialogOpen}
        isSaving={isSaving}
        form={templateForm}
        onClose={() => setIsTemplateDialogOpen(false)}
        onChange={setTemplateForm}
        onSave={() => void handleSaveTemplate()}
        title={editingTemplate ? `${copy.labels.addTemplate}: ${editingTemplate.name}` : copy.labels.addTemplate}
        locale={currentLanguage.code}
      />

      <ControlAssignmentDialog
        copy={copy}
        isOpen={isAssignmentDialogOpen}
        isSaving={isSaving}
        assignments={overview?.assignments ?? []}
        templates={templates}
        form={assignmentForm}
        onClose={() => setIsAssignmentDialogOpen(false)}
        onChange={setAssignmentForm}
        onSave={() => void handleBulkAssign()}
      />

      <ControlKioskDialog
        copy={copy}
        isOpen={isKioskDialogOpen}
        isSaving={isSaving}
        form={kioskForm}
        assignments={overview?.assignments ?? []}
        locations={locations}
        onClose={() => setIsKioskDialogOpen(false)}
        onChange={setKioskForm}
        onSave={() => void handleSaveKiosk()}
        title={editingKiosk ? `${copy.labels.addKiosk}: ${editingKiosk.name}` : copy.labels.addKiosk}
      />

      <ControlAccessProfileDialog
        copy={copy}
        isOpen={isAccessProfileDialogOpen}
        isSaving={isSaving}
        assignments={overview?.assignments ?? []}
        form={accessProfileForm}
        onClose={() => setIsAccessProfileDialogOpen(false)}
        onChange={setAccessProfileForm}
        onSave={() => void handleSaveAccessProfile()}
        title={editingAccessProfile ? copy.labels.editAccessProfile : copy.labels.addAccessProfile}
      />

      <ControlAccessMethodDialog
        copy={copy}
        isOpen={isAccessMethodDialogOpen}
        isSaving={isSaving}
        accessProfiles={accessProfiles}
        form={accessMethodForm}
        onClose={() => setIsAccessMethodDialogOpen(false)}
        onChange={setAccessMethodForm}
        onSave={() => void handleSaveAccessMethod()}
        title={editingAccessMethod ? copy.labels.editAccessMethod : copy.labels.addAccessMethod}
      />

      <FaceEnrollmentModal
        isOpen={isFaceEnrollmentModalOpen}
        employeeId={selectedEmployee?.employee_id ?? null}
        employeeName={selectedEmployee?.employee_name ?? ''}
        onClose={() => setIsFaceEnrollmentModalOpen(false)}
        onCompleted={async () => {
          if (selectedEmployee?.employee_id) {
            const response = await humanResourcesApi.getFaceEnrollment(selectedEmployee.employee_id);
            setFaceEnrollment(response.enrollment);
            setSuccessMessage('Face enrollment completed.');
          }
        }}
      />

      <LocationRegistrationModal
        isOpen={isLocationRegistrationModalOpen}
        onClose={() => setIsLocationRegistrationModalOpen(false)}
        locations={locations}
        onReload={() => loadControl(controlDate)}
      />

      <HorariosModal
        isOpen={isSchedulesModalOpen}
        onClose={() => setIsSchedulesModalOpen(false)}
        assignments={overview?.assignments ?? []}
        templates={templates}
        locations={locations.filter((location) => location.status !== 'inactive')}
        selectedTemplateId={selectedTemplateId}
        effectiveStartDate={controlDate}
        onApplied={async (result) => {
          setSelectedEmployeeId((current) => (
            current && result.employeeIds.includes(current)
              ? current
              : result.employeeIds[0] ?? current
          ));
          setSelectedTemplateId(result.templateId);
          await loadControl(controlDate);
          setSuccessMessage(copy.bulkAssignSuccess);
        }}
      />
    </>
  );
}

function ControlAttendanceRow({
  assignment,
  copy,
  locale,
  selected,
  onSelect,
}: {
  assignment: AttendanceControlOverviewResponse['assignments'][number];
  copy: typeof controlCopy.en | typeof controlCopy.es;
  locale: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const displayStatus = assignment.corrected_status ?? assignment.today_status;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full border-b border-gray-200 px-4 py-4 text-left transition-colors dark:border-gray-700 ${
        selected
          ? 'border-l-4 border-l-[#1463ff] bg-[#1463ff]/5'
          : 'hover:bg-gray-50 dark:hover:bg-gray-900/40'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold text-gray-900 dark:text-white">{assignment.employee_name}</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {assignment.position_title || assignment.department || copy.labels.noDepartment}
          </p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClasses[displayStatus]}`}>
          {copy.statuses[displayStatus]}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <AttendanceMomentPanel
          label={copy.labels.checkIn}
          time={formatTimeOnly(assignment.first_check_in_at, locale, copy.labels.noRegistration)}
          location={assignment.latest_event?.location_name ?? null}
          copy={copy}
        />
        <AttendanceMomentPanel
          label={copy.labels.checkOut}
          time={formatTimeOnly(assignment.last_check_out_at, locale, copy.labels.noRegistration)}
          location={assignment.latest_event?.location_name ?? null}
          copy={copy}
        />
      </div>
    </button>
  );
}

function AttendanceMomentPanel({
  label,
  time,
  location,
  copy,
}: {
  label: string;
  time: string;
  location: string | null;
  copy: typeof controlCopy.en | typeof controlCopy.es;
}) {
  return (
    <div className="rounded-2xl bg-gray-50 p-3 dark:bg-gray-900/40">
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-2 text-lg font-semibold text-[#1f9d55] dark:text-emerald-300">{time}</p>
      <div className="mt-3 flex items-center gap-1.5 text-xs text-[#1463ff] dark:text-[#8bb3ff]">
        <MapPin className="h-3.5 w-3.5" />
        <span className="truncate">{location || copy.labels.openLocation}</span>
      </div>
    </div>
  );
}

function CompactInfoChip({
  children,
  tone = 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
}: {
  children: ReactNode;
  tone?: string;
}) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-medium ${tone}`}>
      {children}
    </span>
  );
}

function ControlCalendarDayCell({
  copy,
  day,
  dayNumber,
  isSelected,
  onSelect,
}: {
  copy: typeof controlCopy.en | typeof controlCopy.es;
  day: AttendanceCalendarDay | null;
  dayNumber: number;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const statusTone = day ? dayTone(day) : null;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`min-h-[92px] rounded-2xl border p-3 text-left transition-colors ${
        isSelected
          ? 'border-[#1463ff] bg-[#1463ff]/5 shadow-[inset_0_0_0_1px_rgba(20,99,255,0.15)]'
          : 'border-gray-200 bg-white hover:border-[#1463ff]/35 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-[#8bb3ff]/40'
      }`}
    >
      <div className="text-base font-semibold text-gray-900 dark:text-white">{dayNumber}</div>
      {day ? (
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-1.5">
            {day.entry_registered ? <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> : null}
            {day.exit_registered ? <span className="h-2.5 w-2.5 rounded-full bg-sky-500" /> : null}
          </div>
          {statusTone ? (
            <div className={`inline-flex h-6 min-w-6 items-center justify-center rounded-md px-1.5 text-[11px] font-semibold ${statusTone}`}>
              {dayBadge(copy, day)}
            </div>
          ) : null}
        </div>
      ) : null}
    </button>
  );
}

function LegendPill({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-3 w-3 rounded-full ${color}`} />
      <span>{label}</span>
    </div>
  );
}

function LegendOutline({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-3 w-12 rounded-full border border-[#1463ff]" />
      <span>{label}</span>
    </div>
  );
}

function DayInfoStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
    </div>
  );
}

function DayEvidenceCard({
  label,
  photoUrl,
  location,
  copy,
}: {
  label: string;
  photoUrl: string | null;
  location: string | null;
  copy: typeof controlCopy.en | typeof controlCopy.es;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">{label}</p>
      {photoUrl ? (
        <img
          src={photoUrl}
          alt={label}
          className="mt-3 h-32 w-full rounded-lg object-cover"
        />
      ) : (
        <div className="mt-3 flex h-32 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 text-sm text-gray-400 dark:border-gray-700 dark:bg-gray-900/40">
          {copy.labels.noEvidence}
        </div>
      )}

      <div className="mt-3 flex items-center gap-2 text-sm text-[#1463ff] dark:text-[#8bb3ff]">
        <MapPin className="h-4 w-4" />
        <span className="truncate">{location || copy.labels.noLocationHistory}</span>
      </div>
    </div>
  );
}

function DetailCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900/40">
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-2 text-sm font-medium text-gray-900 dark:text-white">{value}</p>
    </div>
  );
}

function formatTimeOnly(value: string | null | undefined, locale: string, fallback: string) {
  if (!value) {
    return fallback;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(parsed);
}

function formatWorkDuration(start: string | null | undefined, end: string | null | undefined, fallback: string) {
  if (!start || !end) {
    return fallback;
  }

  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return fallback;
  }

  const diffMs = endDate.getTime() - startDate.getTime();
  if (diffMs <= 0) {
    return fallback;
  }

  const totalMinutes = Math.round(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

function applyCalendarDayUpdate(
  day: AttendanceCalendarDay,
  result: {
    effective_status: AttendanceCalendarDay['effective_status'];
    system_status: AttendanceCalendarDay['system_status'];
    corrected_status?: AttendanceCalendarDay['corrected_status'];
    notes?: string | null;
  },
): AttendanceCalendarDay {
  return {
    ...day,
    effective_status: result.effective_status,
    system_status: result.system_status,
    corrected_status: result.corrected_status ?? null,
    notes: result.notes ?? null,
  };
}

function resolvedDayStatus(day: AttendanceCalendarDay) {
  return day.corrected_status ?? day.effective_status;
}

function dayStatusPillTone(day: AttendanceCalendarDay) {
  return statusClasses[resolvedDayStatus(day)];
}

function dayTone(day: AttendanceCalendarDay) {
  switch (resolvedDayStatus(day)) {
    case 'on_time':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
    case 'late':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
    case 'absence':
      return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300';
    case 'rest':
      return 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300';
    case 'leave':
      return 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300';
    default:
      return null;
  }
}

function dayBadge(copy: typeof controlCopy.en | typeof controlCopy.es, day: AttendanceCalendarDay) {
  switch (resolvedDayStatus(day)) {
    case 'on_time':
      return '✓';
    case 'absence':
      return '✕';
    case 'late':
      return '!';
    case 'rest':
      return '–';
    case 'leave':
      return copy.statuses.leave.slice(0, 1);
    default:
      return null;
  }
}

function DetailStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{value}</p>
    </div>
  );
}

function RecentActivityRow({
  copy,
  event,
  locale,
}: {
  copy: typeof controlCopy.en | typeof controlCopy.es;
  event: AttendanceControlOverviewResponse['recent_events'][number];
  locale: string;
}) {
  const resultClass = event.result_status
    ? statusClasses[
        event.result_status === 'success' || event.result_status === 'overridden'
          ? 'active'
          : 'absence'
      ]
    : statusClasses.inactive;

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-900/40">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-gray-900 dark:text-white">{event.employee_name}</p>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {copy.labels.eventKind}: {copy.labels.eventKinds[event.event_kind as keyof typeof copy.labels.eventKinds] ?? event.event_kind}
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {copy.labels.kioskDevice}: {event.kiosk_device_name || '—'} · {copy.labels.linkedLocation}: {event.location_name || copy.labels.noLinkedLocation}
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {copy.labels.defaultMethod}: {(copy.labels.authMethods[event.auth_method as keyof typeof copy.labels.authMethods] ?? event.auth_method) || '—'}
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${resultClass}`}>
            {(copy.labels.resultStatuses[event.result_status as keyof typeof copy.labels.resultStatuses] ?? event.result_status) || '—'}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {event.event_timestamp ? formatDateTime(event.event_timestamp, locale, '—') : '—'}
          </span>
        </div>
      </div>
    </div>
  );
}

function ControlLocationDialog({
  copy,
  isOpen,
  isSaving,
  form,
  title,
  onClose,
  onChange,
  onSave,
}: {
  copy: typeof controlCopy.en | typeof controlCopy.es;
  isOpen: boolean;
  isSaving: boolean;
  form: AttendanceControlLocationPayload;
  title: string;
  onClose: () => void;
  onChange: (payload: AttendanceControlLocationPayload) => void;
  onSave: () => void;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{copy.sections.locationsHint}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{copy.labels.locationName}</label>
            <input
              type="text"
              value={form.name}
              onChange={(event) => onChange({ ...form, name: event.target.value })}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#143675] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{copy.labels.latitude}</label>
              <input
                type="number"
                step="0.000001"
                value={form.latitude}
                onChange={(event) => onChange({ ...form, latitude: Number(event.target.value) })}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#143675] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{copy.labels.longitude}</label>
              <input
                type="number"
                step="0.000001"
                value={form.longitude}
                onChange={(event) => onChange({ ...form, longitude: Number(event.target.value) })}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#143675] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{copy.labels.radius}</label>
              <input
                type="number"
                min="1"
                value={form.radius_meters}
                onChange={(event) => onChange({ ...form, radius_meters: Number(event.target.value) })}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#143675] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{copy.labels.status}</label>
              <select
                value={form.status}
                onChange={(event) => onChange({ ...form, status: event.target.value as 'active' | 'inactive' })}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#143675] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="active">{copy.statuses.active}</option>
                <option value="inactive">{copy.statuses.inactive}</option>
              </select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{copy.labels.cancel}</Button>
          <Button onClick={onSave} disabled={isSaving}>{copy.labels.save}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ControlTemplateDialog({
  copy,
  isOpen,
  isSaving,
  form,
  title,
  locale,
  onClose,
  onChange,
  onSave,
}: {
  copy: typeof controlCopy.en | typeof controlCopy.es;
  isOpen: boolean;
  isSaving: boolean;
  form: AttendanceControlTemplatePayload;
  title: string;
  locale: string;
  onClose: () => void;
  onChange: (payload: AttendanceControlTemplatePayload) => void;
  onSave: () => void;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{copy.sections.templatesHint}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{copy.labels.templateName}</label>
              <input
                type="text"
                value={form.name}
                onChange={(event) => onChange({ ...form, name: event.target.value })}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#143675] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{copy.labels.status}</label>
              <select
                value={form.status}
                onChange={(event) => onChange({ ...form, status: event.target.value as 'active' | 'inactive' })}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#143675] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="active">{copy.statuses.active}</option>
                <option value="inactive">{copy.statuses.inactive}</option>
              </select>
            </div>
          </div>

          <div className="space-y-3">
            {form.days.map((day, index) => (
              <div key={day.day_of_week} className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/40">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{weekdayLabel(day.day_of_week, locale)}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{copy.labels.dayLabel} {day.day_of_week}</p>
                  </div>
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={day.is_rest_day}
                      onChange={(event) => {
                        const nextDays = form.days.map((item, currentIndex) =>
                          currentIndex === index
                            ? {
                                ...item,
                                is_rest_day: event.target.checked,
                                start_time: event.target.checked ? null : item.start_time || '09:00:00',
                                end_time: event.target.checked ? null : item.end_time || '18:00:00',
                              }
                            : item,
                        );
                        onChange({ ...form, days: nextDays });
                      }}
                    />
                    {copy.labels.restDay}
                  </label>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label className="mb-2 block text-xs font-medium text-gray-500 dark:text-gray-400">{copy.labels.start}</label>
                    <input
                      type="time"
                      disabled={day.is_rest_day}
                      value={(day.start_time ?? '').slice(0, 5)}
                      onChange={(event) => {
                        const nextDays = form.days.map((item, currentIndex) =>
                          currentIndex === index ? { ...item, start_time: `${event.target.value}:00` } : item,
                        );
                        onChange({ ...form, days: nextDays });
                      }}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#143675] focus:outline-none disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-medium text-gray-500 dark:text-gray-400">{copy.labels.end}</label>
                    <input
                      type="time"
                      disabled={day.is_rest_day}
                      value={(day.end_time ?? '').slice(0, 5)}
                      onChange={(event) => {
                        const nextDays = form.days.map((item, currentIndex) =>
                          currentIndex === index ? { ...item, end_time: `${event.target.value}:00` } : item,
                        );
                        onChange({ ...form, days: nextDays });
                      }}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#143675] focus:outline-none disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-medium text-gray-500 dark:text-gray-400">{copy.labels.tolerance}</label>
                    <input
                      type="number"
                      min="0"
                      value={day.late_after_minutes}
                      onChange={(event) => {
                        const nextDays = form.days.map((item, currentIndex) =>
                          currentIndex === index ? { ...item, late_after_minutes: Number(event.target.value) } : item,
                        );
                        onChange({ ...form, days: nextDays });
                      }}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#143675] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{copy.labels.cancel}</Button>
          <Button onClick={onSave} disabled={isSaving}>{copy.labels.save}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ControlAssignmentDialog({
  copy,
  isOpen,
  isSaving,
  assignments,
  templates,
  form,
  onClose,
  onChange,
  onSave,
}: {
  copy: typeof controlCopy.en | typeof controlCopy.es;
  isOpen: boolean;
  isSaving: boolean;
  assignments: AttendanceControlAssignment[];
  templates: AttendanceControlTemplate[];
  form: AttendanceControlAssignmentPayload;
  onClose: () => void;
  onChange: (payload: AttendanceControlAssignmentPayload) => void;
  onSave: () => void;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{copy.labels.bulkAssign}</DialogTitle>
          <DialogDescription>{copy.labels.assignmentHint}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{copy.labels.chooseTemplate}</label>
            <select
              value={form.template_id}
              onChange={(event) => onChange({ ...form, template_id: Number(event.target.value) })}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#143675] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="0">--</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{copy.labels.effectiveStart}</label>
              <input
                type="date"
                value={form.effective_start_date}
                onChange={(event) => onChange({ ...form, effective_start_date: event.target.value })}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#143675] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{copy.labels.effectiveEnd}</label>
              <input
                type="date"
                value={form.effective_end_date ?? ''}
                onChange={(event) => onChange({ ...form, effective_end_date: event.target.value })}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#143675] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{copy.labels.employeesToAssign}</label>
            <div className="max-h-[320px] space-y-2 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900/40">
              {assignments.map((assignment) => {
                const isChecked = form.employee_ids.includes(assignment.employee_id);
                return (
                  <label key={assignment.employee_id} className="flex items-start gap-3 rounded-lg bg-white px-3 py-3 text-sm dark:bg-gray-800">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(event) => {
                        const nextEmployeeIds = event.target.checked
                          ? [...form.employee_ids, assignment.employee_id]
                          : form.employee_ids.filter((employeeId) => employeeId !== assignment.employee_id);
                        onChange({ ...form, employee_ids: nextEmployeeIds });
                      }}
                    />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{assignment.employee_name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {assignment.position_title || '—'} · {assignment.schedule_template_name || copy.labels.noSchedule}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{copy.labels.cancel}</Button>
          <Button onClick={onSave} disabled={isSaving || form.employee_ids.length === 0 || form.template_id <= 0}>
            {copy.labels.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ControlKioskDialog({
  copy,
  isOpen,
  isSaving,
  form,
  assignments,
  locations,
  title,
  onClose,
  onChange,
  onSave,
}: {
  copy: typeof controlCopy.en | typeof controlCopy.es;
  isOpen: boolean;
  isSaving: boolean;
  form: AttendanceKioskDevicePayload;
  assignments: AttendanceControlAssignment[];
  locations: AttendanceControlLocation[];
  title: string;
  onClose: () => void;
  onChange: (value: AttendanceKioskDevicePayload) => void;
  onSave: () => void;
}) {
  const unitOptions = Array.from(new Map(
    assignments
      .filter((assignment) => assignment.unit_id)
      .map((assignment) => [assignment.unit_id!, assignment.unit_name || copy.labels.noUnit]),
  ).entries());
  const businessOptions = Array.from(new Map(
    assignments
      .filter((assignment) => assignment.business_id)
      .map((assignment) => [assignment.business_id!, assignment.business_name || copy.labels.noBusiness]),
  ).entries());

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{copy.sections.kiosksHint}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{copy.labels.code}</label>
              <input
                type="text"
                value={form.code}
                onChange={(event) => onChange({ ...form, code: event.target.value })}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#143675] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{copy.labels.kioskDevice}</label>
              <input
                type="text"
                value={form.name}
                onChange={(event) => onChange({ ...form, name: event.target.value })}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#143675] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{copy.labels.unit}</label>
              <select
                value={form.unit_id ?? ''}
                onChange={(event) => onChange({ ...form, unit_id: event.target.value ? Number(event.target.value) : null })}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#143675] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="">{copy.labels.noUnit}</option>
                {unitOptions.map(([id, label]) => (
                  <option key={id} value={id}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{copy.labels.business}</label>
              <select
                value={form.business_id ?? ''}
                onChange={(event) => onChange({ ...form, business_id: event.target.value ? Number(event.target.value) : null })}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#143675] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="">{copy.labels.noBusiness}</option>
                {businessOptions.map(([id, label]) => (
                  <option key={id} value={id}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{copy.labels.linkedLocation}</label>
              <select
                value={form.location_id ?? ''}
                onChange={(event) => onChange({ ...form, location_id: event.target.value ? Number(event.target.value) : null })}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#143675] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="">{copy.labels.noLinkedLocation}</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>{location.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{copy.labels.status}</label>
            <select
              value={form.status}
              onChange={(event) => onChange({ ...form, status: event.target.value as 'active' | 'inactive' })}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#143675] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="active">{copy.statuses.active}</option>
              <option value="inactive">{copy.statuses.inactive}</option>
            </select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{copy.labels.cancel}</Button>
          <Button onClick={onSave} disabled={isSaving}>{copy.labels.save}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ControlAccessProfileDialog({
  copy,
  isOpen,
  isSaving,
  assignments,
  form,
  title,
  onClose,
  onChange,
  onSave,
}: {
  copy: typeof controlCopy.en | typeof controlCopy.es;
  isOpen: boolean;
  isSaving: boolean;
  assignments: AttendanceControlAssignment[];
  form: AttendanceAccessProfilePayload;
  title: string;
  onClose: () => void;
  onChange: (value: AttendanceAccessProfilePayload) => void;
  onSave: () => void;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{copy.labels.metadataHint}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{copy.labels.selectedEmployee}</label>
            <select
              value={form.employee_id || ''}
              onChange={(event) => onChange({ ...form, employee_id: Number(event.target.value) })}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#143675] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="0">--</option>
              {assignments.map((assignment) => (
                <option key={assignment.employee_id} value={assignment.employee_id}>
                  {assignment.employee_name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{copy.labels.accessProfileStatus}</label>
              <select
                value={form.status}
                onChange={(event) => onChange({ ...form, status: event.target.value as 'active' | 'inactive' })}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#143675] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="active">{copy.statuses.active}</option>
                <option value="inactive">{copy.statuses.inactive}</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{copy.labels.defaultMethod}</label>
              <select
                value={form.default_method}
                onChange={(event) => onChange({ ...form, default_method: event.target.value as AttendanceAccessProfilePayload['default_method'] })}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#143675] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                {Object.entries(copy.labels.authMethods).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{copy.labels.cancel}</Button>
          <Button onClick={onSave} disabled={isSaving || !form.employee_id}>{copy.labels.save}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ControlAccessMethodDialog({
  copy,
  isOpen,
  isSaving,
  accessProfiles,
  form,
  title,
  onClose,
  onChange,
  onSave,
}: {
  copy: typeof controlCopy.en | typeof controlCopy.es;
  isOpen: boolean;
  isSaving: boolean;
  accessProfiles: AttendanceAccessProfile[];
  form: AttendanceAccessMethodPayload;
  title: string;
  onClose: () => void;
  onChange: (value: AttendanceAccessMethodPayload) => void;
  onSave: () => void;
}) {
  const requiresSecret = form.method_type === 'pin' || form.method_type === 'password';
  const requiresCredentialRef = form.method_type === 'badge';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{copy.labels.metadataHint}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{copy.sections.access}</label>
            <select
              value={form.access_profile_id || ''}
              onChange={(event) => onChange({ ...form, access_profile_id: Number(event.target.value) })}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#143675] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="0">--</option>
              {accessProfiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.employee_name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{copy.labels.methodType}</label>
              <select
                value={form.method_type}
                onChange={(event) => onChange({ ...form, method_type: event.target.value as AttendanceAccessMethodPayload['method_type'] })}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#143675] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                {Object.entries(copy.labels.authMethods).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{copy.labels.status}</label>
              <select
                value={form.status}
                onChange={(event) => onChange({ ...form, status: event.target.value as 'active' | 'inactive' })}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#143675] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="active">{copy.statuses.active}</option>
                <option value="inactive">{copy.statuses.inactive}</option>
              </select>
            </div>
          </div>

          {requiresCredentialRef ? (
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{copy.labels.credentialRef}</label>
              <input
                type="text"
                value={form.credential_ref ?? ''}
                onChange={(event) => onChange({ ...form, credential_ref: event.target.value })}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#143675] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
          ) : null}

          {requiresSecret ? (
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{copy.labels.secret}</label>
              <input
                type="password"
                value={form.secret ?? ''}
                onChange={(event) => onChange({ ...form, secret: event.target.value })}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#143675] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
          ) : null}

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{copy.labels.priority}</label>
            <input
              type="number"
              min="0"
              value={form.priority ?? 100}
              onChange={(event) => onChange({ ...form, priority: Number(event.target.value) })}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#143675] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{copy.labels.cancel}</Button>
          <Button onClick={onSave} disabled={isSaving || !form.access_profile_id}>{copy.labels.save}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
