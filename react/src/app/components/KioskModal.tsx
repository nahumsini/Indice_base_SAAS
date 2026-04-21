import { useEffect, useMemo, useState } from 'react';
import { MapPin, Search, X } from 'lucide-react';
import { AttendancePhotoCaptureCard } from './AttendancePhotoCaptureCard';
import { LiveFaceChallenge } from './LiveFaceChallenge';
import { Button } from './ui/button';
import { useAttendancePhotoUpload } from '../hooks/useAttendancePhotoUpload';
import {
  humanResourcesApi,
  type AttendanceAccessProfile,
  type AttendanceKioskDevice,
} from '../api/humanResources';
import { ApiClientError } from '../lib/apiClient';
import { useLanguage } from '../shared/context';

interface Colaborador {
  id: number;
  nombre: string;
  puesto: string;
  codigo?: string;
}

interface RegisteredLocation {
  id: number | string;
  name?: string;
  nombre?: string;
  latitude?: number;
  latitud?: number;
  longitude?: number;
  longitud?: number;
  radius_meters?: number;
  radio?: number;
}

interface KioskModalProps {
  isOpen: boolean;
  onClose: () => void;
  colaboradores: Colaborador[];
  registeredLocations: RegisteredLocation[];
  selfMode?: boolean;
  closeOnSuccess?: boolean;
  onSubmit: (payload: {
    employeeId: number;
    eventType: 'check_in' | 'check_out' | 'break_out' | 'break_in';
    locationId: number;
    kioskDeviceId: number;
    authMethod: 'pin' | 'badge' | 'password' | 'manual_override' | 'facial_recognition';
    faceVerificationSessionId?: number;
    credentialPayload?: string;
    latitude: number;
    longitude: number;
    photoUrl?: string;
    eventTimestamp?: string;
  }) => Promise<void>;
}

interface NormalizedLocation {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
}

const normalizeLocation = (location: RegisteredLocation): NormalizedLocation => ({
  id: Number(location.id),
  name: location.name || location.nombre || 'Location',
  latitude: Number(location.latitude ?? location.latitud ?? 0),
  longitude: Number(location.longitude ?? location.longitud ?? 0),
  radiusMeters: Number(location.radius_meters ?? location.radio ?? 0),
});

const padDatePart = (value: number) => `${value}`.padStart(2, '0');
const localDateTimeString = (date: Date) =>
  `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}T${padDatePart(date.getHours())}:${padDatePart(date.getMinutes())}:${padDatePart(date.getSeconds())}`;

const kioskCopy = {
  en: {
    title: 'Attendance kiosk',
    subtitle: 'Select an employee, validate location, and record a check-in or check-out through the HR backend.',
    errors: {
      noGeolocation: 'This browser does not support geolocation.',
      allowGeolocation: 'You must allow location access to register attendance.',
      locationUnavailable: 'The device location could not be retrieved.',
      noKioskDevice: 'Select a kiosk device.',
      selectEmployee: 'Select an employee.',
      selectLocation: 'Select an attendance location.',
      selectAuthMethod: 'Select an authentication method.',
      completeFaceVerification: 'Complete face verification before recording attendance.',
      credentialRequired: 'Enter the credential required for the selected authentication method.',
      facialRecognitionUnavailable: 'Face verification could not be started.',
      capturePhoto: 'Take a photo before recording attendance.',
      submitFailed: 'Attendance could not be recorded.',
      cameraUnsupported: 'This browser cannot open the webcam.',
      cameraPermissionDenied: 'You must allow camera access to take a photo.',
      cameraUnavailable: 'The webcam could not be started.',
    },
    checklist: {
      employeeReady: '1. Employee selected',
      employeePending: '1. Select employee',
      photoReady: '2. Photo captured',
      photoPending: '2. Take photo',
      faceReady: '2. Face verified',
      facePending: '2. Verify face',
      locationReady: '3. Location captured',
      locationPending: '3. Capture location',
    },
    labels: {
      searchEmployee: 'Search employee',
      searchPlaceholder: 'Name or code',
      noResults: 'No results.',
      selectEmployee: 'Select an employee',
      selectEmployeeHint: 'Use the left panel to prepare the punch.',
      employee: 'Employee',
      kioskDevice: 'Kiosk device',
      authMethod: 'Authentication method',
      credential: 'Credential',
      credentialPlaceholder: 'Enter PIN, badge, or password',
      noAccessProfile: 'No access profile is configured for this employee.',
      photo: 'Photo',
      photoRequired: 'Required to record',
      takePhoto: 'Take photo',
      chooseFromGallery: 'Choose from gallery',
      retakePhoto: 'Retake photo',
      capturePhoto: 'Capture photo',
      cancelCamera: 'Cancel',
      photoHint: 'Tip: keep your face centered and use good lighting.',
      configuredLocation: 'Configured location',
      geolocation: 'Geolocation',
      locationRequired: 'Required to record',
      getLocation: 'Get location',
      refreshLocation: 'Refresh location',
      locationReady: 'Location ready',
      noLocation: 'No location',
      record: 'Record',
      recordHint: 'It will be enabled when the required evidence and location are ready.',
      registerCheckIn: 'Check-in',
      registerCheckOut: 'Check-out',
      registerBreakOut: 'Break out',
      registerBreakIn: 'Break in',
      registering: 'Recording...',
      employeeCode: 'Code',
      useLeftPanel: 'Use the left panel to prepare the punch.',
      faceVerificationTitle: 'Face verification',
      faceVerificationHint: 'Keep one face centered in the frame. The challenge will guide neutral, left, and right poses automatically.',
      faceVerificationSuccess: 'Face verified successfully.',
      retryFaceVerification: 'Re-verify face',
      authMethods: {
        pin: 'PIN',
        badge: 'Badge',
        password: 'Password',
        manual_override: 'Manual override',
        facial_recognition: 'Facial recognition',
      },
      faceChallenge: {
        autoCaptureBadge: 'Automatic capture',
        preparing: 'Preparing the camera and face guidance.',
        noFace: 'Position one face inside the frame to continue.',
        multipleFaces: 'Only one face can be visible during verification.',
        neutralPrompt: 'Look straight at the camera.',
        neutralHold: 'Hold still. Capturing the neutral pose.',
        leftPrompt: 'Turn your face slightly to the left.',
        leftHold: 'Hold that left turn. Capturing now.',
        rightPrompt: 'Turn your face slightly to the right.',
        rightHold: 'Hold that right turn. Capturing now.',
        submitting: 'Uploading captures and completing face verification.',
        success: 'Face verified successfully.',
        retry: 'Retry verification',
        cancel: 'Cancel',
        holdMeterLabel: 'Hold steady to auto-capture',
        stepLabels: {
          neutral: 'Look straight',
          left: 'Turn left',
          right: 'Turn right',
        },
        cameraUnsupported: 'This browser cannot open the webcam.',
        cameraPermissionDenied: 'You must allow camera access to continue.',
        cameraUnavailable: 'The webcam could not be started.',
      },
    },
  },
  es: {
    title: 'Kiosco de asistencia',
    subtitle: 'Selecciona colaborador, valida ubicación y registra ingreso o salida con el backend de RH.',
    errors: {
      noGeolocation: 'Este navegador no soporta geolocalización.',
      allowGeolocation: 'Debes permitir la ubicación para registrar asistencia.',
      locationUnavailable: 'No se pudo obtener la ubicación del dispositivo.',
      noKioskDevice: 'Selecciona un dispositivo de kiosco.',
      selectEmployee: 'Selecciona un colaborador.',
      selectLocation: 'Selecciona una ubicación de asistencia.',
      selectAuthMethod: 'Selecciona un método de autenticación.',
      completeFaceVerification: 'Completa la verificación facial antes de registrar la asistencia.',
      credentialRequired: 'Captura la credencial requerida para el método seleccionado.',
      facialRecognitionUnavailable: 'No se pudo iniciar la verificación facial.',
      capturePhoto: 'Toma una foto antes de registrar asistencia.',
      submitFailed: 'No se pudo registrar la asistencia.',
      cameraUnsupported: 'Este navegador no puede abrir la webcam.',
      cameraPermissionDenied: 'Debes permitir el acceso a la cámara para tomar la foto.',
      cameraUnavailable: 'No se pudo iniciar la webcam.',
    },
    checklist: {
      employeeReady: '1. Colaborador listo',
      employeePending: '1. Selecciona colaborador',
      photoReady: '2. Foto lista',
      photoPending: '2. Toma foto',
      faceReady: '2. Rostro verificado',
      facePending: '2. Verifica el rostro',
      locationReady: '3. Ubicación validada',
      locationPending: '3. Captura ubicación',
    },
    labels: {
      searchEmployee: 'Buscar colaborador',
      searchPlaceholder: 'Nombre o código',
      noResults: 'Sin resultados.',
      selectEmployee: 'Selecciona un colaborador',
      selectEmployeeHint: 'Usa el panel izquierdo para preparar la marcación.',
      employee: 'Colaborador',
      kioskDevice: 'Dispositivo de kiosco',
      authMethod: 'Método de autenticación',
      credential: 'Credencial',
      credentialPlaceholder: 'Captura PIN, gafete o contraseña',
      noAccessProfile: 'No hay un perfil de acceso configurado para este colaborador.',
      photo: 'Foto',
      photoRequired: 'Obligatoria para registrar',
      takePhoto: 'Tomar foto',
      chooseFromGallery: 'Elegir de galería',
      retakePhoto: 'Tomar de nuevo',
      capturePhoto: 'Capturar foto',
      cancelCamera: 'Cancelar',
      photoHint: 'Tip: keep your face centered and use good lighting.',
      configuredLocation: 'Ubicación configurada',
      geolocation: 'Geolocalización',
      locationRequired: 'Obligatoria para registrar',
      getLocation: 'Obtener ubicación',
      refreshLocation: 'Actualizar ubicación',
      locationReady: 'Ubicación lista',
      noLocation: 'Sin ubicación',
      record: 'Registro',
      recordHint: 'Se habilitará cuando la evidencia requerida y la ubicación estén listas.',
      registerCheckIn: 'Registrar ingreso',
      registerCheckOut: 'Registrar salida',
      registerBreakOut: 'Salida a descanso',
      registerBreakIn: 'Regreso de descanso',
      registering: 'Registrando...',
      employeeCode: 'Código',
      useLeftPanel: 'Usa el panel izquierdo para preparar la marcación.',
      faceVerificationTitle: 'Verificación facial',
      faceVerificationHint: 'Mantén un solo rostro centrado en el cuadro. El flujo guiará automáticamente las poses neutral, izquierda y derecha.',
      faceVerificationSuccess: 'Rostro verificado correctamente.',
      retryFaceVerification: 'Verificar de nuevo',
      authMethods: {
        pin: 'PIN',
        badge: 'Gafete',
        password: 'Contraseña',
        manual_override: 'Anulación manual',
        facial_recognition: 'Reconocimiento facial',
      },
      faceChallenge: {
        autoCaptureBadge: 'Captura automática',
        preparing: 'Preparando la cámara y la guía facial.',
        noFace: 'Coloca un solo rostro dentro del cuadro para continuar.',
        multipleFaces: 'Solo un rostro puede estar visible durante la verificación.',
        neutralPrompt: 'Mira de frente a la cámara.',
        neutralHold: 'Mantente quieto. Capturando la pose neutral.',
        leftPrompt: 'Gira ligeramente el rostro hacia la izquierda.',
        leftHold: 'Mantén ese giro a la izquierda. Capturando ahora.',
        rightPrompt: 'Gira ligeramente el rostro hacia la derecha.',
        rightHold: 'Mantén ese giro a la derecha. Capturando ahora.',
        submitting: 'Subiendo capturas y completando la verificación facial.',
        success: 'Rostro verificado correctamente.',
        retry: 'Reintentar verificación',
        cancel: 'Cancelar',
        holdMeterLabel: 'Mantén la pose para capturar automáticamente',
        stepLabels: {
          neutral: 'Mira al frente',
          left: 'Gira a la izquierda',
          right: 'Gira a la derecha',
        },
        cameraUnsupported: 'Este navegador no puede abrir la webcam.',
        cameraPermissionDenied: 'Debes permitir el acceso a la cámara para continuar.',
        cameraUnavailable: 'No se pudo iniciar la webcam.',
      },
    },
  },
} as const;

export function KioskModal({
  isOpen,
  onClose,
  colaboradores,
  registeredLocations,
  selfMode = false,
  closeOnSuccess = true,
  onSubmit,
}: KioskModalProps) {
  const { currentLanguage } = useLanguage();
  const copy = currentLanguage.code.startsWith('es') ? kioskCopy.es : kioskCopy.en;
  const [currentTime, setCurrentTime] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<Colaborador | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [kioskDevices, setKioskDevices] = useState<AttendanceKioskDevice[]>([]);
  const [accessProfiles, setAccessProfiles] = useState<AttendanceAccessProfile[]>([]);
  const [selectedKioskDeviceId, setSelectedKioskDeviceId] = useState('');
  const [selectedAuthMethod, setSelectedAuthMethod] = useState<'pin' | 'badge' | 'password' | 'manual_override' | 'facial_recognition' | ''>('');
  const [credentialPayload, setCredentialPayload] = useState('');
  const [eventType, setEventType] = useState<'check_in' | 'check_out' | 'break_out' | 'break_in'>('check_in');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifyingFace, setIsVerifyingFace] = useState(false);
  const [verifiedFaceSessionId, setVerifiedFaceSessionId] = useState<number | null>(null);
  const [isLoadingSetup, setIsLoadingSetup] = useState(false);
  const [locationState, setLocationState] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const attendancePhotoUpload = useAttendancePhotoUpload();

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      const defaultLocation = registeredLocations[0];
      if (defaultLocation) {
        setSelectedLocationId(String(defaultLocation.id));
      }
      if (colaboradores.length === 1) {
        setSelectedEmployee(colaboradores[0]);
      }
    } else {
      setSearchQuery('');
      setSelectedEmployee(null);
      setSelectedKioskDeviceId('');
      setSelectedAuthMethod('');
      setCredentialPayload('');
      setKioskDevices([]);
      setAccessProfiles([]);
      attendancePhotoUpload.clearPhoto();
      setLocationState(null);
      setEventType('check_in');
      setIsVerifyingFace(false);
      setVerifiedFaceSessionId(null);
      setErrorMessage('');
    }
  }, [colaboradores, isOpen, registeredLocations]);

  const locations = useMemo(
    () => registeredLocations.map(normalizeLocation).filter((location) => location.id > 0),
    [registeredLocations],
  );

  const selectedAccessProfile = useMemo(
    () => accessProfiles.find((profile) => profile.employee_id === selectedEmployee?.id) ?? null,
    [accessProfiles, selectedEmployee?.id],
  );

  const availableAuthMethods = useMemo(
    () =>
      selectedAccessProfile?.methods
        .filter((method) => method.status === 'active')
        .sort((left, right) => left.priority - right.priority) ?? [],
    [selectedAccessProfile],
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let active = true;
    setIsLoadingSetup(true);

    Promise.all([
      humanResourcesApi.listAttendanceKioskDevices(),
      humanResourcesApi.listAttendanceAccessProfiles(),
    ])
      .then(([devicesResponse, profilesResponse]) => {
        if (!active) {
          return;
        }

        const activeDevices = devicesResponse.items.filter((device) => device.status === 'active');
        setKioskDevices(activeDevices);
        setAccessProfiles(profilesResponse.items);

        const defaultDevice = activeDevices[0];
        if (defaultDevice) {
          setSelectedKioskDeviceId(String(defaultDevice.id));
          if (defaultDevice.location_id) {
            setSelectedLocationId(String(defaultDevice.location_id));
          }
        }
      })
      .catch((error) => {
        if (!active) {
          return;
        }
        setErrorMessage(error instanceof Error ? error.message : copy.errors.submitFailed);
      })
      .finally(() => {
        if (active) {
          setIsLoadingSetup(false);
        }
      });

    return () => {
      active = false;
    };
  }, [isOpen]);

  useEffect(() => {
    const selectedDevice = kioskDevices.find((device) => String(device.id) === selectedKioskDeviceId);
    if (selectedDevice?.location_id) {
      setSelectedLocationId(String(selectedDevice.location_id));
    }
  }, [kioskDevices, selectedKioskDeviceId]);

  useEffect(() => {
    if (!selectedAccessProfile) {
      setSelectedAuthMethod('');
      setVerifiedFaceSessionId(null);
      return;
    }

    const defaultMethod = availableAuthMethods.find((method) => method.method_type === selectedAccessProfile.default_method);
    setSelectedAuthMethod((defaultMethod?.method_type ?? availableAuthMethods[0]?.method_type ?? '') as typeof selectedAuthMethod);
    setCredentialPayload('');
    setVerifiedFaceSessionId(null);
  }, [availableAuthMethods, selectedAccessProfile]);

  useEffect(() => {
    setVerifiedFaceSessionId(null);
    setIsVerifyingFace(false);
  }, [selectedEmployee?.id, selectedAuthMethod]);

  const filteredEmployees = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return colaboradores.filter((employee) => {
      if (!normalizedSearch) {
        return true;
      }

      return (
        employee.nombre.toLowerCase().includes(normalizedSearch) ||
        employee.puesto.toLowerCase().includes(normalizedSearch) ||
        employee.codigo?.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [colaboradores, searchQuery]);

  if (!isOpen) {
    return null;
  }

  const requestGeolocation = async () => {
    setErrorMessage('');

    if (!('geolocation' in navigator)) {
      setErrorMessage(copy.errors.noGeolocation);
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
          ? copy.errors.allowGeolocation
          : copy.errors.locationUnavailable;
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
    setLocationState(nextLocation);
    return nextLocation;
  };

  const handleSubmit = async (
    nextEventType: 'check_in' | 'check_out' | 'break_out' | 'break_in',
  ) => {
    if (!selectedEmployee) {
      setErrorMessage(copy.errors.selectEmployee);
      return;
    }

    if (!selectedKioskDeviceId) {
      setErrorMessage(copy.errors.noKioskDevice);
      return;
    }

    if (!selectedAccessProfile) {
      setErrorMessage(copy.labels.noAccessProfile);
      return;
    }

    if (!selectedAuthMethod) {
      setErrorMessage(copy.errors.selectAuthMethod);
      return;
    }

    const isFaceAuth = String(selectedAuthMethod) === 'facial_recognition';

    const requiresCredential = selectedAuthMethod === 'pin' || selectedAuthMethod === 'badge' || selectedAuthMethod === 'password';
    if (requiresCredential && credentialPayload.trim().length === 0) {
      setErrorMessage(copy.errors.credentialRequired);
      return;
    }

    if (!selectedLocationId) {
      setErrorMessage(copy.errors.selectLocation);
      return;
    }

    if (!isFaceAuth && !attendancePhotoUpload.photo) {
      setErrorMessage(copy.errors.capturePhoto);
      return;
    }

    if (isFaceAuth && !verifiedFaceSessionId) {
      setErrorMessage(copy.errors.completeFaceVerification);
      return;
    }

    let coordinates = locationState;
    if (!coordinates) {
      coordinates = await requestGeolocation();
    }

    if (!coordinates) {
      return;
    }

    try {
      setEventType(nextEventType);
      setIsSubmitting(true);
      setErrorMessage('');
      const eventTimestamp = localDateTimeString(new Date());

      const photoObjectKey = isFaceAuth
        ? undefined
        : selfMode
          ? await attendancePhotoUpload.ensureUploadedForCurrentUser({
              event_type: nextEventType,
              event_timestamp: eventTimestamp,
              content_type: attendancePhotoUpload.photo?.contentType ?? 'image/jpeg',
            })
          : await attendancePhotoUpload.ensureUploaded({
              employee_id: selectedEmployee.id,
              event_type: nextEventType,
              event_timestamp: eventTimestamp,
              content_type: attendancePhotoUpload.photo?.contentType ?? 'image/jpeg',
            });

      await onSubmit({
        employeeId: selectedEmployee.id,
        eventType: nextEventType,
        locationId: Number(selectedLocationId),
        kioskDeviceId: Number(selectedKioskDeviceId),
        authMethod: selectedAuthMethod,
        credentialPayload: credentialPayload.trim() || undefined,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        photoUrl: photoObjectKey,
        eventTimestamp,
        faceVerificationSessionId: verifiedFaceSessionId ?? undefined,
      });

      attendancePhotoUpload.clearPhoto();
      setCredentialPayload('');
      setVerifiedFaceSessionId(null);
      if (closeOnSuccess) {
        onClose();
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : copy.errors.submitFailed);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isReadyToRecord = Boolean(
    selectedEmployee &&
      selectedKioskDeviceId &&
      selectedLocationId &&
      selectedAuthMethod &&
      locationState &&
      (
        selectedAuthMethod === 'facial_recognition'
          ? verifiedFaceSessionId
          : attendancePhotoUpload.photo &&
            (
              selectedAuthMethod === 'manual_override' ||
              credentialPayload.trim().length > 0
            )
      ),
  );

  const handleFaceVerification = async (captures: Array<{ step: string; photo: { file: Blob; contentType: string } }>) => {
    if (!selectedEmployee) {
      throw new Error(copy.errors.selectEmployee);
    }

    setIsVerifyingFace(true);
    setVerifiedFaceSessionId(null);
    setErrorMessage('');

    try {
      const session = selfMode
        ? await humanResourcesApi.createMyFaceVerificationSession()
        : await humanResourcesApi.createFaceVerificationSession(selectedEmployee.id);
      for (const capture of captures) {
        const presigned = await humanResourcesApi.presignFaceVerificationCapture(
          session.session_id,
          capture.step,
          capture.photo.contentType,
        );
        await humanResourcesApi.uploadAttendancePhoto(
          presigned.upload_url,
          capture.photo.file,
          capture.photo.contentType,
          presigned.upload_headers ?? {},
        );
      }

      const result = await humanResourcesApi.completeFaceVerificationSession(session.session_id);
      if (!result.matched || !result.liveness_passed) {
        throw new Error(result.failure_reason || 'Face verification failed.');
      }
      setVerifiedFaceSessionId(session.session_id);
    } finally {
      setIsVerifyingFace(false);
    }
  };

  const isFaceAuthSelected = selectedAuthMethod === 'facial_recognition';
  const hasRequiredVisualEvidence = isFaceAuthSelected
    ? Boolean(verifiedFaceSessionId)
    : Boolean(attendancePhotoUpload.photo);
  const visualChecklistLabel = hasRequiredVisualEvidence
    ? (isFaceAuthSelected ? copy.checklist.faceReady : copy.checklist.photoReady)
    : (isFaceAuthSelected ? copy.checklist.facePending : copy.checklist.photoPending);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-100 dark:bg-gray-900">
      <div className="min-h-screen">
        <div className="sticky top-0 z-10 border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <div className="mx-auto flex max-w-7xl items-start justify-between gap-4 px-6 py-4">
            <div className="flex-1">
              <div className="mb-1 flex items-center gap-2">
                <h1 className="text-2xl font-bold text-[#143675] dark:text-[#8bb3ff]">
                  {copy.title}
                </h1>
                <div className="rounded bg-gray-100 px-2 py-1 text-sm text-gray-500 dark:bg-gray-700 dark:text-gray-300">
                  {currentTime.toLocaleTimeString(currentLanguage.code, { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {copy.subtitle}
              </p>
            </div>
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-6 py-6">
          {errorMessage ? (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-700/30 dark:bg-red-900/20 dark:text-red-300">
              {errorMessage}
            </div>
          ) : null}

          <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-5 dark:border-blue-900/50 dark:bg-blue-950/30">
            <div className="flex flex-wrap items-center gap-4 text-sm text-blue-900 dark:text-blue-100">
              <span>{selectedEmployee ? copy.checklist.employeeReady : copy.checklist.employeePending}</span>
              <span>{visualChecklistLabel}</span>
              <span>{locationState ? copy.checklist.locationReady : copy.checklist.locationPending}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="border-b border-gray-200 px-4 py-4 dark:border-gray-700">
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{copy.labels.searchEmployee}</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder={copy.labels.searchPlaceholder}
                    className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-gray-900 focus:border-[#143675] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              <div className="max-h-[520px] overflow-y-auto divide-y divide-gray-200 dark:divide-gray-700">
                {filteredEmployees.length === 0 ? (
                  <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">{copy.labels.noResults}</div>
                ) : (
                  filteredEmployees.map((employee) => (
                    <button
                      key={employee.id}
                      type="button"
                      onClick={() => setSelectedEmployee(employee)}
                      className={`w-full px-4 py-4 text-left transition-colors ${
                        selectedEmployee?.id === employee.id
                          ? 'border-l-4 border-[#143675] bg-[#143675]/5 dark:bg-[#143675]/20'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700/40'
                      }`}
                    >
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{employee.nombre}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{employee.puesto}</p>
                      {employee.codigo ? <p className="mt-1 text-xs text-gray-400">{copy.labels.employeeCode}: {employee.codigo}</p> : null}
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="lg:col-span-2 rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              {!selectedEmployee ? (
                <div className="flex min-h-[420px] items-center justify-center text-center text-gray-400 dark:text-gray-500">
                  <div>
                    <div className="mb-4 text-6xl">👤</div>
                    <p className="text-lg">{copy.labels.selectEmployee}</p>
                    <p className="mt-2 text-sm">{copy.labels.useLeftPanel}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="border-b border-gray-200 pb-5 dark:border-gray-700">
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">{copy.labels.employee}</p>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{selectedEmployee.nombre}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {selectedEmployee.codigo ? `${copy.labels.employeeCode}: ${selectedEmployee.codigo}` : selectedEmployee.puesto}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/40">
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{copy.labels.kioskDevice}</label>
                      <select
                        value={selectedKioskDeviceId}
                        disabled={isLoadingSetup || kioskDevices.length === 0}
                        onChange={(event) => setSelectedKioskDeviceId(event.target.value)}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#143675] focus:outline-none disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      >
                        {kioskDevices.length === 0 ? <option value="">--</option> : null}
                        {kioskDevices.map((device) => (
                          <option key={device.id} value={device.id}>
                            {device.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/40">
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{copy.labels.authMethod}</label>
                      <select
                        value={selectedAuthMethod}
                        disabled={!selectedAccessProfile || availableAuthMethods.length === 0}
                        onChange={(event) => setSelectedAuthMethod(event.target.value as typeof selectedAuthMethod)}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#143675] focus:outline-none disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      >
                        {availableAuthMethods.length === 0 ? <option value="">{copy.labels.noAccessProfile}</option> : null}
                        {availableAuthMethods.map((method) => (
                          <option
                            key={method.id}
                            value={method.method_type}
                          >
                            {copy.labels.authMethods[method.method_type]}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/40">
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{copy.labels.credential}</label>
                      <input
                        type={selectedAuthMethod === 'password' ? 'password' : 'text'}
                        value={credentialPayload}
                        disabled={selectedAuthMethod === '' || selectedAuthMethod === 'manual_override' || selectedAuthMethod === 'facial_recognition'}
                        onChange={(event) => setCredentialPayload(event.target.value)}
                        placeholder={copy.labels.credentialPlaceholder}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#143675] focus:outline-none disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                  </div>

                  {!selectedAccessProfile ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
                      {copy.labels.noAccessProfile}
                    </div>
                  ) : null}

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {selectedAuthMethod === 'facial_recognition' ? (
                      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                        <div className="mb-4">
                          <h4 className="font-semibold text-gray-900 dark:text-white">{copy.labels.faceVerificationTitle}</h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {copy.labels.faceVerificationHint}
                          </p>
                        </div>
                        <LiveFaceChallenge
                          title={copy.labels.faceVerificationTitle}
                          helperText={copy.labels.faceVerificationHint}
                          onSubmit={handleFaceVerification}
                          resetToken={`${selectedEmployee?.id ?? 'none'}:${selectedAuthMethod}`}
                          onRestart={() => {
                            setVerifiedFaceSessionId(null);
                            setErrorMessage('');
                          }}
                          onCancel={onClose}
                          onError={setErrorMessage}
                          copy={copy.labels.faceChallenge}
                        />
                        {verifiedFaceSessionId ? (
                          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-950/20 dark:text-emerald-300">
                            {copy.labels.faceVerificationSuccess}
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <AttendancePhotoCaptureCard
                        title={copy.labels.photo}
                        requiredText={copy.labels.photoRequired}
                        takePhotoLabel={copy.labels.takePhoto}
                        chooseFromGalleryLabel={copy.labels.chooseFromGallery}
                        retakePhotoLabel={copy.labels.retakePhoto}
                        captureLabel={copy.labels.capturePhoto}
                        cancelLabel={copy.labels.cancelCamera}
                        helperText={copy.labels.photoHint}
                        photo={attendancePhotoUpload.photo}
                        onPhotoChange={attendancePhotoUpload.setCapturedPhoto}
                        onError={setErrorMessage}
                        errors={{
                          cameraUnsupported: copy.errors.cameraUnsupported,
                          cameraPermissionDenied: copy.errors.cameraPermissionDenied,
                          cameraUnavailable: copy.errors.cameraUnavailable,
                        }}
                      />
                    )}

                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-5 dark:border-gray-700 dark:bg-gray-900/40">
                      <div className="mb-4 flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                            <MapPin className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900 dark:text-white">{copy.labels.configuredLocation}</h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{copy.labels.locationRequired}</p>
                          </div>
                        </div>
                      </div>

                      <select
                        value={selectedLocationId}
                        onChange={(event) => setSelectedLocationId(event.target.value)}
                        className="mb-3 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#143675] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      >
                        {locations.map((location) => (
                          <option key={location.id} value={location.id}>
                            {location.name}
                          </option>
                        ))}
                      </select>

                      <Button type="button" variant="outline" className="mb-3 w-full gap-2" onClick={() => void requestGeolocation()}>
                        <MapPin className="h-4 w-4" />
                        {locationState ? copy.labels.refreshLocation : copy.labels.getLocation}
                      </Button>

                      <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                        {locationState
                          ? `${copy.labels.locationReady}: ${locationState.latitude.toFixed(5)}, ${locationState.longitude.toFixed(5)}`
                          : copy.labels.noLocation}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-5 dark:border-gray-700 dark:bg-gray-900/40">
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white">{copy.labels.record}</h4>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{copy.labels.recordHint}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        type="button"
                        onClick={() => {
                          void handleSubmit('check_in');
                        }}
                        disabled={!isReadyToRecord || isSubmitting}
                        className="bg-[#143675] text-white hover:bg-[#0f2855] disabled:bg-gray-300 disabled:text-gray-500"
                      >
                        {isSubmitting && eventType === 'check_in' ? copy.labels.registering : copy.labels.registerCheckIn}
                      </Button>
                      <Button
                        type="button"
                        onClick={() => {
                          void handleSubmit('check_out');
                        }}
                        disabled={!isReadyToRecord || isSubmitting}
                        className="bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-gray-300 disabled:text-gray-500"
                      >
                        {isSubmitting && eventType === 'check_out' ? copy.labels.registering : copy.labels.registerCheckOut}
                      </Button>
                      <Button
                        type="button"
                        onClick={() => {
                          void handleSubmit('break_out');
                        }}
                        disabled={!isReadyToRecord || isSubmitting}
                        className="bg-amber-600 text-white hover:bg-amber-700 disabled:bg-gray-300 disabled:text-gray-500"
                      >
                        {isSubmitting && eventType === 'break_out' ? copy.labels.registering : copy.labels.registerBreakOut}
                      </Button>
                      <Button
                        type="button"
                        onClick={() => {
                          void handleSubmit('break_in');
                        }}
                        disabled={!isReadyToRecord || isSubmitting}
                        className="bg-sky-600 text-white hover:bg-sky-700 disabled:bg-gray-300 disabled:text-gray-500"
                      >
                        {isSubmitting && eventType === 'break_in' ? copy.labels.registering : copy.labels.registerBreakIn}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
