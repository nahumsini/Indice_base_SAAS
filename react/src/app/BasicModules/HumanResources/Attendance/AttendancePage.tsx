import { useEffect, useMemo, useRef, useState } from 'react';
import { Clock, MapPin, User, View } from 'lucide-react';
import { AttendanceRecorderPhotoCard } from './AttendanceRecorderPhotoCard';
import { AttendanceRecordsModal } from './AttendanceRecordsModal';
import { FailureToast } from '../../../components/FailureToast';
import { LoadingBarOverlay, runWithMinimumDuration } from '../../../components/LoadingBarOverlay';
import { SuccessToast } from '../../../components/SuccessToast';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Skeleton } from '../../../components/ui/skeleton';
import { useAttendancePhotoUpload } from '../../../hooks/useAttendancePhotoUpload';
import { useLanguage } from '../../../shared/context';
import {
  deriveAttendancePunchState,
  getAttendancePunchValidationMessage,
} from '../../../shared/attendancePunchState';
import {
  humanResourcesApi,
  type AttendanceCalendarDay,
  type AttendanceCalendarResponse,
  type AttendanceCorrectionStatus,
  type AttendanceDashboardResponse,
  type AttendanceLocation,
} from '../../../api/humanResources';

const padDatePart = (value: number) => `${value}`.padStart(2, '0');
const localDateString = (date: Date) =>
  `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
const localDateTimeString = (date: Date) =>
  `${localDateString(date)}T${padDatePart(date.getHours())}:${padDatePart(date.getMinutes())}:${padDatePart(date.getSeconds())}`;
const todayIsoDate = () => localDateString(new Date());
const todayMonth = () => todayIsoDate().slice(0, 7);
const formatAttendanceTime = (value: string | null | undefined, locale: string) => {
  if (!value) {
    return '--';
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return '--';
  }

  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsedDate);
};

const formatAttendanceBusinessLocationOption = (location: AttendanceLocation) => {
  const businessName = location.business_name?.trim();
  return businessName && businessName !== location.name
    ? `${location.name} - ${businessName}`
    : location.name;
};

type AttendanceUnitOption = {
  id: string;
  name: string;
};

type AttendanceBusinessOption = {
  id: string;
  unitId: string;
  name: string;
};

const attendanceCopy = {
  en: {
    title: 'Attendance',
    subtitle: 'Register your user entry/exit with photo and location.',
    viewRecords: 'View my records',
    recordsModalSubtitle: 'Review monthly attendance, evidence, and manual corrections in one focused view.',
    closeRecords: 'Close',
    loading: {
      refreshTitle: 'Updating attendance',
      refreshDescription: 'We are syncing the HR operation.',
      registerTitle: 'Recording attendance',
      registerDescription: 'We are saving the photo, validating the location, and updating the daily record.',
      correctTitle: 'Correcting status',
      correctDescription: 'We are saving the manual correction in the backend.',
    },
    success: {
      checkIn: 'Check-in recorded successfully.',
      checkOut: 'Check-out recorded successfully.',
      correctionApplied: 'Correction applied successfully.',
      correctionCleared: 'Correction cleared successfully.',
    },
    summary: {
      onTime: 'On time',
      late: 'Late',
      leave: 'Leave',
      rest: 'Rest',
      absence: 'No record',
      pending: 'Pending',
      not_scheduled: 'Not scheduled',
      totalMonitored: 'Total monitored',
    },
    statuses: {
      on_time: 'On time',
      late: 'Late',
      leave: 'Leave',
      rest: 'Rest',
      absence: 'No record',
      pending: 'Pending',
      not_scheduled: 'Not scheduled',
    },
    labels: {
      collaborator: 'User',
      employeeBrowser: 'User history',
      employeeBrowserHint: 'Review your user history before interacting with the calendar or manual recorder.',
      employeePicker: 'Selected user',
      previousEmployee: 'Previous',
      nextEmployee: 'Next',
      searchEmployee: 'Search employee',
      searchPlaceholder: 'Name or code',
      employeeList: 'Users in scope',
      employeeListHint: 'Your monthly history and today’s record are loaded from your user account.',
      noEmployeesFound: 'No users match the current search.',
      noEmployeesAvailable: 'No users available yet.',
      unassignedUnit: 'No unit',
      unassignedPosition: 'No role',
      employeeSummary: 'Employee summary',
      position: 'Position',
      unit: 'Unit',
      department: 'Department',
      todayStatus: "Today's status",
      latestLocation: 'Latest location',
      noDepartment: 'No department',
      noEmployeeSelected: 'Your user attendance profile is not available yet.',
      retry: 'Retry',
      statusLoggedIn: 'Logged in',
      statusCheckedOut: 'Checked out',
      statusReady: 'Ready to check in',
    },
    recorder: {
      employee: 'User',
      noEmployeeSelected: 'No signed-in user',
      selectEmployeeHint: 'A signed-in user is required to enable photo and location recording.',
      photo: 'Photo',
      photoRequired: 'Required to record',
      takePhoto: 'Take photo',
      chooseFromGallery: 'Choose from gallery',
      retakePhoto: 'Retake photo',
      capturedPhotoLabel: 'Captured photo preview',
      savedPhotoLabel: 'Latest recorded photo',
      photoLockedHint: 'Photo captured. Complete your attendance record before taking another one.',
      photoAlreadyRecordedHint: 'Today\'s attendance photo is already locked.',
      photoHint: 'Tip: keep your face centered and use good lighting.',
      location: 'Location',
      unit: 'Unit',
      business: 'Business',
      selectUnit: 'Select unit',
      selectBusiness: 'Select business',
      locationRequired: 'Matched automatically from your current position',
      getLocation: 'Get location',
      refreshLocation: 'Refresh location',
      noLocation: 'No location',
      record: 'Record',
      recordHint: 'It will be enabled when there is photo + location',
      checkIn: 'Check-in',
      checkOut: 'Check-out',
      locationReady: 'Location ready',
      locationUnsupported: 'This browser does not support geolocation.',
      locationDenied: 'You must allow location access to register attendance.',
      locationUnavailable: 'The device location could not be retrieved.',
      photoRequiredError: 'Take a photo before recording attendance.',
      locationRequiredError: 'An attendance location is required before recording attendance.',
      checkInAlreadyRecorded: 'Check-in has already been recorded for today.',
      checkOutRequiresCheckIn: 'Check-out requires an active check-in.',
      statusActiveTitle: 'You are checked in.',
      statusActiveDescription: 'Checked in at',
      statusCheckedOutTitle: 'You are checked out for today.',
      statusCheckedOutDescription: 'Last check-out recorded at',
      statusIdleTitle: 'You have not checked in yet.',
      statusIdleDescription: 'Take a photo and capture your location when you are ready to check in.',
      submitHint: 'Photo and location will be validated when you submit.',
      checkoutReadyHint: 'You are checked in. Check-out is ready when you are.',
      cameraUnsupported: 'This browser cannot open the webcam.',
      cameraPermissionDenied: 'You must allow camera access to take a photo.',
      cameraUnavailable: 'The webcam could not be started.',
      capturePhoto: 'Capture photo',
      cancelCamera: 'Cancel',
    },
  },
  es: {
    title: 'Asistencia',
    subtitle: 'Registra la entrada/salida de tu usuario con foto y ubicación.',
    viewRecords: 'Ver mis registros',
    recordsModalSubtitle: 'Revisa asistencia mensual, evidencia y correcciones manuales en una vista clara.',
    closeRecords: 'Cerrar',
    loading: {
      refreshTitle: 'Actualizando asistencia',
      refreshDescription: 'Estamos sincronizando la operación de RH.',
      registerTitle: 'Registrando asistencia',
      registerDescription: 'Estamos guardando la foto, validando la ubicación y actualizando el expediente diario.',
      correctTitle: 'Corrigiendo estatus',
      correctDescription: 'Estamos guardando la corrección manual en el backend.',
    },
    success: {
      checkIn: 'Ingreso registrado correctamente.',
      checkOut: 'Salida registrada correctamente.',
      correctionApplied: 'Corrección aplicada correctamente.',
      correctionCleared: 'Corrección eliminada correctamente.',
    },
    summary: {
      onTime: 'A tiempo',
      late: 'Retardos',
      leave: 'Permisos',
      rest: 'Descanso',
      absence: 'Sin registro',
      pending: 'Pendiente',
      not_scheduled: 'Sin horario',
      totalMonitored: 'Total monitoreado',
    },
    statuses: {
      on_time: 'A tiempo',
      late: 'Retardo',
      leave: 'Permiso',
      rest: 'Descanso',
      absence: 'Sin registro',
      pending: 'Pendiente',
      not_scheduled: 'Sin horario',
    },
    labels: {
      collaborator: 'Usuario',
      employeeBrowser: 'Historial de usuario',
      employeeBrowserHint: 'Revisa tu historial de usuario antes de interactuar con el calendario o el registro manual.',
      employeePicker: 'Usuario seleccionado',
      previousEmployee: 'Anterior',
      nextEmployee: 'Siguiente',
      searchEmployee: 'Buscar colaborador',
      searchPlaceholder: 'Nombre o código',
      employeeList: 'Usuarios en alcance',
      employeeListHint: 'Tu historial mensual y el registro de hoy se cargan desde tu cuenta de usuario.',
      noEmployeesFound: 'No hay usuarios con esa búsqueda.',
      noEmployeesAvailable: 'Aún no hay usuarios disponibles.',
      unassignedUnit: 'Sin unidad',
      unassignedPosition: 'Sin puesto',
      employeeSummary: 'Resumen del colaborador',
      position: 'Puesto',
      unit: 'Unidad',
      department: 'Departamento',
      todayStatus: 'Estado de hoy',
      latestLocation: 'Última ubicación',
      noDepartment: 'Sin departamento',
      noEmployeeSelected: 'Tu perfil de asistencia de usuario no está disponible.',
      retry: 'Reintentar',
      statusLoggedIn: 'Sesión activa',
      statusCheckedOut: 'Salida registrada',
      statusReady: 'Listo para ingresar',
    },
    recorder: {
      employee: 'Usuario',
      noEmployeeSelected: 'No hay un usuario autenticado',
      selectEmployeeHint: 'Necesitas un usuario autenticado para habilitar la foto y la ubicación.',
      photo: 'Foto',
      photoRequired: 'Obligatoria para registrar',
      takePhoto: 'Tomar foto',
      chooseFromGallery: 'Elegir de galería',
      retakePhoto: 'Tomar de nuevo',
      capturedPhotoLabel: 'Vista previa capturada',
      savedPhotoLabel: 'Última foto registrada',
      photoLockedHint: 'La foto ya fue capturada. Completa tu registro de asistencia antes de tomar otra.',
      photoAlreadyRecordedHint: 'La foto de asistencia de hoy ya quedó bloqueada.',
      photoHint: 'Tip: keep your face centered and use good lighting.',
      location: 'Ubicación',
      unit: 'Unidad',
      business: 'Negocio',
      selectUnit: 'Seleccionar unidad',
      selectBusiness: 'Seleccionar negocio',
      locationRequired: 'Se valida automáticamente con tu ubicación actual',
      getLocation: 'Obtener ubicación',
      refreshLocation: 'Actualizar ubicación',
      noLocation: 'Sin ubicación',
      record: 'Registro',
      recordHint: 'Se habilitará cuando exista foto + ubicación',
      checkIn: 'Registrar ingreso',
      checkOut: 'Registrar salida',
      locationReady: 'Ubicación lista',
      locationUnsupported: 'Este navegador no soporta geolocalización.',
      locationDenied: 'Debes permitir la ubicación para registrar asistencia.',
      locationUnavailable: 'No se pudo obtener la ubicación del dispositivo.',
      photoRequiredError: 'Toma una foto antes de registrar asistencia.',
      locationRequiredError: 'Se requiere una ubicación de asistencia antes de registrar.',
      checkInAlreadyRecorded: 'El ingreso de hoy ya fue registrado.',
      checkOutRequiresCheckIn: 'Debes registrar un ingreso antes de registrar la salida.',
      statusActiveTitle: 'Ya registraste tu ingreso.',
      statusActiveDescription: 'Ingreso registrado a las',
      statusCheckedOutTitle: 'Tu salida de hoy ya fue registrada.',
      statusCheckedOutDescription: 'Última salida registrada a las',
      statusIdleTitle: 'Aún no registras ingreso.',
      statusIdleDescription: 'Toma una foto y captura tu ubicación cuando estés listo para registrar ingreso.',
      submitHint: 'La foto y la ubicación se validarán al momento de registrar.',
      checkoutReadyHint: 'Tu salida ya está lista para registrarse cuando quieras.',
      cameraUnsupported: 'Este navegador no puede abrir la webcam.',
      cameraPermissionDenied: 'Debes permitir el acceso a la cámara para tomar la foto.',
      cameraUnavailable: 'No se pudo iniciar la webcam.',
      capturePhoto: 'Capturar foto',
      cancelCamera: 'Cancelar',
    },
  },
} as const;

export default function Attendance() {
  const { currentLanguage } = useLanguage();
  const copy = currentLanguage.code.startsWith('es') ? attendanceCopy.es : attendanceCopy.en;
  const [currentAttendanceDate, setCurrentAttendanceDate] = useState(todayIsoDate());
  const [dashboard, setDashboard] = useState<AttendanceDashboardResponse | null>(null);
  const [calendar, setCalendar] = useState<AttendanceCalendarResponse | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(todayMonth());
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(true);
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecordsOpen, setIsRecordsOpen] = useState(false);
  const [overlayTitle, setOverlayTitle] = useState<string>(copy.loading.refreshTitle);
  const [overlayDescription, setOverlayDescription] = useState<string>(copy.loading.refreshDescription);
  const [errorMessage, setErrorMessage] = useState('');
  const [successToastMessage, setSuccessToastMessage] = useState('');
  const [recorderUnitKey, setRecorderUnitKey] = useState('');
  const [recorderLocationId, setRecorderLocationId] = useState('');
  const [recorderLocationState, setRecorderLocationState] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const successToastTimeoutRef = useRef<number | null>(null);
  const attendancePhotoUpload = useAttendancePhotoUpload();
  const attendanceLocations = useMemo(() => dashboard?.locations ?? [], [dashboard?.locations]);
  const attendanceUnitOptions = useMemo<AttendanceUnitOption[]>(() => {
    const unitOptionsByKey = new Map<string, string>();

    attendanceLocations.forEach((location) => {
      const unitKey = location.unit_id ? String(location.unit_id) : 'unassigned';
      if (!unitOptionsByKey.has(unitKey)) {
        unitOptionsByKey.set(unitKey, location.unit_name?.trim() || copy.labels.unassignedUnit);
      }
    });

    return Array.from(unitOptionsByKey, ([id, name]) => ({ id, name }));
  }, [attendanceLocations, copy.labels.unassignedUnit]);
  const allBusinessOptions = useMemo<AttendanceBusinessOption[]>(() => {
    const businessOptionsByKey = new Map<string, AttendanceBusinessOption>();
    attendanceLocations.forEach((location) => {
      const unitId = location.unit_id ? String(location.unit_id) : 'unassigned';
      const locationId = String(location.id);
      if (!businessOptionsByKey.has(locationId)) {
        businessOptionsByKey.set(locationId, {
          id: locationId,
          unitId,
          name: location.business_name?.trim() || formatAttendanceBusinessLocationOption(location),
        });
      }
    });

    return Array.from(businessOptionsByKey.values());
  }, [attendanceLocations]);
  const businessLocationOptions = useMemo(
    () => recorderUnitKey
      ? allBusinessOptions.filter((business) => business.unitId === recorderUnitKey)
      : [],
    [allBusinessOptions, recorderUnitKey],
  );
  const selectedAttendanceUnit = useMemo(
    () => attendanceUnitOptions.find((unit) => unit.id === recorderUnitKey) ?? null,
    [attendanceUnitOptions, recorderUnitKey],
  );
  const selectedAttendanceBusiness = useMemo(
    () => businessLocationOptions.find((business) => business.id === recorderLocationId) ?? null,
    [businessLocationOptions, recorderLocationId],
  );
  const selectedAttendanceLocation = useMemo(
    () => attendanceLocations.find((location) => String(location.id) === recorderLocationId) ?? null,
    [attendanceLocations, recorderLocationId],
  );
  const hasSelectedAttendanceLocation = Boolean(selectedAttendanceLocation);
  const shouldShowAttendanceLocationSelectors = attendanceLocations.length > 1;
  const shouldShowAttendanceUnitSelector = shouldShowAttendanceLocationSelectors && attendanceUnitOptions.length > 1;
  const selectedItem = useMemo(() => dashboard?.items[0] ?? null, [dashboard?.items]);
  const selectedEmployeeOption = useMemo(() => dashboard?.employees[0] ?? null, [dashboard?.employees]);
  const selectedEmployeeId = selectedItem?.employee_id ?? null;
  const punchState = useMemo(
    () => deriveAttendancePunchState(selectedItem),
    [selectedItem],
  );
  const latestRecordedPhotoUrl = selectedItem?.last_photo_url || selectedItem?.first_photo_url || null;
  const selectedUserAvatarUrl = selectedItem?.avatar_url || selectedEmployeeOption?.avatar_url || '';
  const statusBadgeLabel = punchState.hasActiveCheckIn
    ? copy.labels.statusLoggedIn
    : punchState.hasCheckOut
      ? copy.labels.statusCheckedOut
      : copy.labels.statusReady;
  const statusBadgeClassName = punchState.hasActiveCheckIn
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-300'
    : punchState.hasCheckOut
      ? 'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
      : 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800/50 dark:bg-blue-950/30 dark:text-blue-200';
  const attendanceStatusTitle = punchState.hasActiveCheckIn
    ? copy.recorder.statusActiveTitle
    : punchState.hasCheckOut
      ? copy.recorder.statusCheckedOutTitle
      : copy.recorder.statusIdleTitle;
  const attendanceStatusDescription = punchState.hasActiveCheckIn
    ? `${copy.recorder.statusActiveDescription} ${formatAttendanceTime(selectedItem?.first_check_in_at, currentLanguage.code)}`
    : punchState.hasCheckOut
      ? `${copy.recorder.statusCheckedOutDescription} ${formatAttendanceTime(selectedItem?.last_check_out_at, currentLanguage.code)}`
      : copy.recorder.statusIdleDescription;

  const refreshDashboardSnapshot = async (attendanceDate = currentAttendanceDate) => {
    const response = await humanResourcesApi.getMyAttendanceDashboard(attendanceDate);
    setDashboard(response);
    return response;
  };

  const loadDashboard = async (attendanceDate = currentAttendanceDate) => {
    setIsLoadingDashboard(true);
    setErrorMessage('');

    try {
      const response = await runWithMinimumDuration(refreshDashboardSnapshot(attendanceDate));
      return response;
    } catch (error) {
      setDashboard(null);
      setErrorMessage(error instanceof Error ? error.message : copy.labels.retry);
      return null;
    } finally {
      setIsLoadingDashboard(false);
    }
  };

  const loadCalendar = async (month: string) => {
    setIsLoadingCalendar(true);

    try {
      const response = await humanResourcesApi.getMyAttendanceCalendar(month);
      setCalendar(response);
    } catch (error) {
      setCalendar(null);
      setErrorMessage(error instanceof Error ? error.message : copy.labels.retry);
    } finally {
      setIsLoadingCalendar(false);
    }
  };

  useEffect(() => {
    void loadDashboard(currentAttendanceDate);
  }, [currentAttendanceDate]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      const nextDate = todayIsoDate();
      setCurrentAttendanceDate((currentDate) => (
        currentDate === nextDate ? currentDate : nextDate
      ));
    }, 60_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (!selectedItem) {
      setCalendar(null);
      return;
    }

    void loadCalendar(calendarMonth);
  }, [calendarMonth, selectedItem]);

  useEffect(() => {
    if (attendanceLocations.length === 1) {
      const [singleLocation] = attendanceLocations;
      setRecorderUnitKey(singleLocation.unit_id ? String(singleLocation.unit_id) : 'unassigned');
      setRecorderLocationId(String(singleLocation.id));
      return;
    }

    if (!attendanceUnitOptions.length) {
      setRecorderUnitKey('');
      setRecorderLocationId('');
      return;
    }
    if (attendanceUnitOptions.length === 1) {
      setRecorderUnitKey(attendanceUnitOptions[0].id);
      return;
    }

    setRecorderUnitKey((currentUnitKey) => (
      attendanceUnitOptions.some((unit) => unit.id === currentUnitKey) ? currentUnitKey : ''
    ));
  }, [attendanceLocations, attendanceUnitOptions]);

  useEffect(() => {
    if (attendanceLocations.length === 1) {
      return;
    }

    if (!businessLocationOptions.length) {
      setRecorderLocationId('');
      return;
    }

    setRecorderLocationId((currentLocationId) => (
      businessLocationOptions.some((location) => String(location.id) === currentLocationId) ? currentLocationId : ''
    ));
  }, [attendanceLocations.length, businessLocationOptions]);

  useEffect(() => {
    attendancePhotoUpload.clearPhoto();
  }, [selectedEmployeeId]);

  useEffect(() => {
    attendancePhotoUpload.clearPhoto();
    setRecorderLocationState(null);
    setErrorMessage('');
    setSuccessToastMessage('');
    setCalendarMonth((currentMonth) => {
      const nextMonth = currentAttendanceDate.slice(0, 7);
      return currentMonth === nextMonth ? currentMonth : nextMonth;
    });
  }, [currentAttendanceDate]);

  useEffect(() => () => {
    if (successToastTimeoutRef.current !== null) {
      window.clearTimeout(successToastTimeoutRef.current);
    }
  }, []);

  const showSuccessToast = (message: string) => {
    if (successToastTimeoutRef.current !== null) {
      window.clearTimeout(successToastTimeoutRef.current);
      successToastTimeoutRef.current = null;
    }

    setSuccessToastMessage('');
    successToastTimeoutRef.current = window.setTimeout(() => {
      setSuccessToastMessage(message);
      successToastTimeoutRef.current = null;
    }, 10);
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
    setOverlayTitle(title);
    setOverlayDescription(description);
    setIsSubmitting(true);

    try {
      await runWithMinimumDuration(task());
    } finally {
      setIsSubmitting(false);
    }
  };

  const requestRecorderGeolocation = async () => {
    setErrorMessage('');

    if (!('geolocation' in navigator)) {
      setErrorMessage(copy.recorder.locationUnsupported);
      return null;
    }

    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 7000,
        maximumAge: 0,
      });
    }).catch((error: GeolocationPositionError) => {
      const nextMessage =
        error.code === error.PERMISSION_DENIED
          ? copy.recorder.locationDenied
          : copy.recorder.locationUnavailable;
      setErrorMessage(nextMessage);
      return null;
    });

    if (!position) {
      return null;
    }

    const nextLocation = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };
    setRecorderLocationState(nextLocation);
    return nextLocation;
  };

  const handleInlineAttendanceRecord = async (eventType: 'check_in' | 'check_out') => {
    if (!selectedItem) {
      setErrorMessage(copy.labels.noEmployeeSelected);
      return;
    }

    const validationMessage = getAttendancePunchValidationMessage(
      eventType,
      punchState,
      {
        checkInAlreadyRecorded: copy.recorder.checkInAlreadyRecorded,
        checkOutRequiresCheckIn: copy.recorder.checkOutRequiresCheckIn,
      },
    );

    if (validationMessage) {
      setErrorMessage(validationMessage);
      return;
    }

    const latestDashboard = await loadDashboard(currentAttendanceDate);
    const latestSelectedItem = latestDashboard?.items[0] ?? null;
    const latestPunchState = deriveAttendancePunchState(latestSelectedItem);
    const latestValidationMessage = getAttendancePunchValidationMessage(
      eventType,
      latestPunchState,
      {
        checkInAlreadyRecorded: copy.recorder.checkInAlreadyRecorded,
        checkOutRequiresCheckIn: copy.recorder.checkOutRequiresCheckIn,
      },
    );

    if (latestValidationMessage) {
      setErrorMessage(latestValidationMessage);
      return;
    }

    if (!hasSelectedAttendanceLocation) {
      setErrorMessage(copy.recorder.locationRequiredError);
      return;
    }

    if (eventType === 'check_in' && !attendancePhotoUpload.photo) {
      setErrorMessage(copy.recorder.photoRequiredError);
      return;
    }

    let coordinates = recorderLocationState;
    if (!coordinates) {
      coordinates = await requestRecorderGeolocation();
    }

    if (!coordinates) {
      return;
    }

    const eventTimestamp = localDateTimeString(new Date());

    try {
      await runMutation({
        title: copy.loading.registerTitle,
        description: copy.loading.registerDescription,
        task: async () => {
          const photoObjectKey = attendancePhotoUpload.photo
            ? await attendancePhotoUpload.ensureUploadedForCurrentUser({
              event_type: eventType,
              event_timestamp: eventTimestamp,
              content_type: attendancePhotoUpload.photo?.contentType ?? 'image/jpeg',
            })
            : undefined;

          await humanResourcesApi.recordMyAttendanceKioskEvent({
            event_type: eventType,
            event_kind: eventType,
            auth_method: 'manual_override',
            location_id: selectedAttendanceLocation?.id,
            latitude: coordinates.latitude,
            longitude: coordinates.longitude,
            photo_url: photoObjectKey,
            event_timestamp: eventTimestamp,
            metadata: {
              selected_unit_id: selectedAttendanceLocation?.unit_id ?? null,
              selected_unit_name: selectedAttendanceUnit?.name ?? selectedAttendanceLocation?.unit_name ?? null,
              selected_business_id: selectedAttendanceLocation?.business_id ?? null,
              selected_business_name: selectedAttendanceLocation?.business_name ?? selectedAttendanceBusiness?.name ?? null,
              selected_location_id: selectedAttendanceLocation?.id ?? null,
              selected_location_name: selectedAttendanceLocation?.name ?? null,
            },
          });

          await loadDashboard(currentAttendanceDate);
          await loadCalendar(calendarMonth);
        },
      });
    } catch (error) {
      try {
        const postErrorDashboard = await refreshDashboardSnapshot(currentAttendanceDate);
        const postErrorSelectedItem = postErrorDashboard?.items[0] ?? null;
        const postErrorPunchState = deriveAttendancePunchState(postErrorSelectedItem);
        const postErrorValidationMessage = getAttendancePunchValidationMessage(
          eventType,
          postErrorPunchState,
          {
            checkInAlreadyRecorded: copy.recorder.checkInAlreadyRecorded,
            checkOutRequiresCheckIn: copy.recorder.checkOutRequiresCheckIn,
          },
        );

        if (postErrorValidationMessage) {
          setErrorMessage(postErrorValidationMessage);
          return;
        }
      } catch {
        // Fall back to the original error below if the refresh also fails.
      }

      setErrorMessage(error instanceof Error ? error.message : copy.labels.retry);
      return;
    }

    attendancePhotoUpload.clearPhoto();
    showSuccessToast(eventType === 'check_in' ? copy.success.checkIn : copy.success.checkOut);
  };

  const recorderDisabled = !selectedItem;
  const photoCaptureDisabled = recorderDisabled || isSubmitting || punchState.hasActiveCheckIn || punchState.hasCheckOut;
  const canInlineCheckIn = Boolean(selectedItem) && hasSelectedAttendanceLocation && !punchState.hasCheckIn;
  const canInlineCheckOut = Boolean(selectedItem) && hasSelectedAttendanceLocation && punchState.hasActiveCheckIn;

  const handleUpdateStatus = async (
    date: string,
    status: AttendanceCorrectionStatus | '',
  ) => {
    if (!selectedItem) {
      return;
    }

    try {
      await runMutation({
        title: copy.loading.correctTitle,
        description: copy.loading.correctDescription,
        task: async () => {
          await humanResourcesApi.updateMyAttendanceDailyRecord(date, { status });
          await Promise.all([loadDashboard(currentAttendanceDate), loadCalendar(calendarMonth)]);
        },
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : copy.labels.retry);
      return;
    }

    showSuccessToast(status ? copy.success.correctionApplied : copy.success.correctionCleared);
  };

  return (
    <>
      <LoadingBarOverlay
        isVisible={isSubmitting}
        title={overlayTitle}
        description={overlayDescription}
        className="z-[120]"
      />

      <SuccessToast
        isVisible={Boolean(successToastMessage)}
        message={successToastMessage}
        onClose={() => setSuccessToastMessage('')}
        className="z-[120]"
        durationMs={3600}
      />
      <FailureToast
        isVisible={Boolean(errorMessage)}
        message={errorMessage}
        onClose={() => setErrorMessage('')}
        className="z-[120]"
        durationMs={4200}
      />

      <div className="mb-5 rounded-lg border border-[#143675]/30 bg-[#143675]/10 p-6 shadow-sm dark:border-[#143675]/40 dark:bg-[#143675]/15">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="mb-1 flex items-center gap-2 text-2xl font-semibold text-slate-900 dark:text-white">
              <span className="text-2xl">📅</span>
              {copy.title}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {copy.subtitle}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              className="h-11 gap-2 rounded-xl bg-[#143675] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#0f2855] disabled:bg-gray-300 disabled:text-gray-500"
              onClick={() => setIsRecordsOpen(true)}
              disabled={!selectedItem}
            >
              <View className="h-4 w-4" />
              {copy.viewRecords}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          {isLoadingDashboard ? (
            <div className="space-y-5">
              <div className="flex items-start gap-3">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-40" />
                </div>
              </div>
              <Skeleton className="h-px w-full" />
              <Skeleton className="h-40 rounded-lg" />
            </div>
          ) : selectedItem ? (
            <>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  {selectedUserAvatarUrl ? (
                    <img
                      src={selectedUserAvatarUrl}
                      alt={selectedItem.employee_name}
                      className="h-12 w-12 rounded-full border border-blue-100 object-cover shadow-sm dark:border-blue-900/50"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
                      <User className="h-5 w-5" />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{copy.labels.collaborator}</p>
                    <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">{selectedItem.employee_name}</p>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {selectedItem.position_title || selectedItem.department || copy.labels.unassignedPosition}
                    </p>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {selectedEmployeeOption?.employee_number || copy.labels.unassignedUnit}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 border-t border-gray-200 pt-6 dark:border-gray-700">
                <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-4 dark:border-gray-700 dark:bg-gray-900/40">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {attendanceStatusTitle}
                      </p>
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                        {attendanceStatusDescription}
                      </p>
                    </div>
                    <Badge variant="outline" className={statusBadgeClassName}>
                      {statusBadgeLabel}
                    </Badge>
                  </div>
                </div>

                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">{copy.recorder.photo}</h4>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{copy.recorder.photoRequired}</p>
                </div>

                <AttendanceRecorderPhotoCard
                  takePhotoLabel={copy.recorder.takePhoto}
                  chooseFromGalleryLabel={copy.recorder.chooseFromGallery}
                  captureLabel={copy.recorder.capturePhoto}
                  cancelLabel={copy.recorder.cancelCamera}
                  helperText={photoCaptureDisabled && !attendancePhotoUpload.photo
                    ? copy.recorder.photoAlreadyRecordedHint
                    : copy.recorder.photoHint}
                  capturedPhotoLabel={copy.recorder.capturedPhotoLabel}
                  photoLockedHint={copy.recorder.photoLockedHint}
                  photo={attendancePhotoUpload.photo}
                  disabled={photoCaptureDisabled}
                  showGalleryUpload={false}
                  onPhotoChange={attendancePhotoUpload.setCapturedPhoto}
                  onError={setErrorMessage}
                  errors={{
                    cameraUnsupported: copy.recorder.cameraUnsupported,
                    cameraPermissionDenied: copy.recorder.cameraPermissionDenied,
                    cameraUnavailable: copy.recorder.cameraUnavailable,
                  }}
                />

                {!attendancePhotoUpload.photo && latestRecordedPhotoUrl ? (
                  <div className="mt-4">
                    <p className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
                      {copy.recorder.savedPhotoLabel}
                    </p>
                    <img
                      src={latestRecordedPhotoUrl}
                      alt={copy.recorder.savedPhotoLabel}
                      className="h-40 w-full rounded-lg border border-gray-200 object-cover shadow-sm dark:border-gray-700"
                    />
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-5 py-10 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-400">
              {copy.labels.noEmployeeSelected}
            </div>
          )}
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-6">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">{copy.recorder.location}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{copy.recorder.locationRequired}</p>
                </div>
              </div>
            </div>

            {shouldShowAttendanceLocationSelectors ? (
              <div className={`mb-3 grid grid-cols-1 gap-3 ${shouldShowAttendanceUnitSelector ? 'sm:grid-cols-2' : ''}`}>
                {shouldShowAttendanceUnitSelector ? (
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">
                      {copy.recorder.unit}
                    </span>
                    <select
                      value={recorderUnitKey}
                      onChange={(event) => {
                        const nextUnitKey = event.target.value;
                        setRecorderUnitKey(nextUnitKey);
                        setRecorderLocationId('');
                      }}
                      disabled={recorderDisabled || attendanceUnitOptions.length === 0}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#143675] focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:disabled:bg-gray-900/50"
                    >
                      <option value="">{copy.recorder.selectUnit}</option>
                      {attendanceUnitOptions.length ? (
                        attendanceUnitOptions.map((unit) => (
                          <option key={unit.id} value={unit.id}>
                            {unit.name}
                          </option>
                        ))
                      ) : null}
                    </select>
                  </label>
                ) : null}

                <label className="block">
                  <span className="mb-1 block text-xs font-medium uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">
                    {copy.recorder.business}
                  </span>
                  <select
                    value={recorderLocationId}
                    onChange={(event) => setRecorderLocationId(event.target.value)}
                    disabled={recorderDisabled || !recorderUnitKey || businessLocationOptions.length === 0}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#143675] focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:disabled:bg-gray-900/50"
                  >
                    <option value="">{copy.recorder.selectBusiness}</option>
                    {businessLocationOptions.length ? (
                      businessLocationOptions.map((business) => (
                        <option key={business.id} value={business.id}>
                          {business.name}
                        </option>
                      ))
                    ) : null}
                  </select>
                </label>
              </div>
            ) : selectedAttendanceLocation ? (
              <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/30 dark:text-emerald-200">
                <span className="font-medium">{copy.recorder.location}:</span>{' '}
                {formatAttendanceBusinessLocationOption(selectedAttendanceLocation)}
              </div>
            ) : null}

            <Button
              type="button"
              variant="outline"
              className="mb-3 w-full gap-2"
              disabled={recorderDisabled}
              onClick={() => void requestRecorderGeolocation()}
            >
              <MapPin className="h-4 w-4" />
              {recorderLocationState ? copy.recorder.refreshLocation : copy.recorder.getLocation}
            </Button>

            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-300">
              {recorderLocationState
                ? `${copy.recorder.locationReady}: ${recorderLocationState.latitude.toFixed(5)}, ${recorderLocationState.longitude.toFixed(5)}`
                : copy.recorder.noLocation}
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6 dark:border-gray-700">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <h4 className="font-semibold text-gray-900 dark:text-white">{copy.recorder.record}</h4>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {!selectedItem
                    ? copy.recorder.selectEmployeeHint
                    : punchState.hasActiveCheckIn
                      ? copy.recorder.checkoutReadyHint
                      : copy.recorder.submitHint}
                </p>
              </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                disabled={recorderDisabled || !canInlineCheckIn || isSubmitting}
                className="bg-[#143675] text-white hover:bg-[#0f2855] disabled:bg-gray-300 disabled:text-gray-500"
                onClick={() => {
                  void handleInlineAttendanceRecord('check_in');
                }}
              >
                {copy.recorder.checkIn}
              </Button>
              <Button
                type="button"
                disabled={recorderDisabled || !canInlineCheckOut || isSubmitting}
                className="bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-gray-300 disabled:text-gray-500"
                onClick={() => {
                  void handleInlineAttendanceRecord('check_out');
                }}
              >
                {copy.recorder.checkOut}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <AttendanceRecordsModal
        calendar={selectedItem ? calendar : null}
        closeLabel={copy.closeRecords}
        emptyMessage={copy.labels.noEmployeeSelected}
        isLoadingCalendar={isLoadingCalendar}
        isOpen={isRecordsOpen}
        month={calendarMonth}
        subtitle={copy.recordsModalSubtitle}
        title={copy.viewRecords}
        onMonthChange={setCalendarMonth}
        onOpenChange={setIsRecordsOpen}
        onUpdateStatus={handleUpdateStatus}
      />
    </>
  );
}
