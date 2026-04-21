import { useEffect, useMemo, useRef, useState } from 'react';
import { BadgeCheck, KeyRound, MapPin, RefreshCw } from 'lucide-react';
import { useParams } from 'react-router';
import { LoadingBarOverlay } from '../../../components/LoadingBarOverlay';
import { SuccessToast } from '../../../components/SuccessToast';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import {
  humanResourcesApi,
  type PublicKioskBootstrapResponse,
  type PublicKioskIdentifyResponse,
} from '../../../api/humanResources';
import { useLanguage } from '../../../shared/context';

const padDatePart = (value: number) => `${value}`.padStart(2, '0');
const localDateString = (date: Date) =>
  `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
const localDateTimeString = (date: Date) =>
  `${localDateString(date)}T${padDatePart(date.getHours())}:${padDatePart(date.getMinutes())}:${padDatePart(date.getSeconds())}`;

const kioskCopy = {
  en: {
    title: 'Attendance Kiosk',
    subtitle: 'Fast shared-device check-in and check-out.',
    loading: 'Loading kiosk',
    loadingDescription: 'Preparing device, location, and credential methods.',
    identifying: 'Identifying employee',
    identifyingDescription: 'Validating the credential on this kiosk.',
    recording: 'Recording attendance',
    recordingDescription: 'Submitting the attendance event and refreshing the kiosk.',
    invalidDevice: 'This kiosk link is invalid or inactive.',
    retry: 'Retry',
    reset: 'Reset',
    identifyTitle: 'Identify employee',
    identifyDescription: 'Employees should identify themselves first. Device and location are fixed on this kiosk.',
    credentialLabel: 'Credential',
    pinPlaceholder: 'Enter PIN',
    badgePlaceholder: 'Scan or enter badge code',
    identify: 'Identify',
    methods: {
      pin: 'PIN',
      badge: 'Badge',
    },
    kioskDevice: 'Device',
    location: 'Location',
    identifiedTitle: 'Employee identified',
    identifiedHint: 'Choose the attendance action for this employee.',
    checkIn: 'Check-in',
    checkOut: 'Check-out',
    success: {
      checkIn: 'Check-in recorded successfully.',
      checkOut: 'Check-out recorded successfully.',
    },
    timeout: 'The kiosk timed out and has been reset for the next employee.',
    missingMethods: 'No public kiosk authentication methods are configured for this device.',
    unsupportedMethod: 'This kiosk method is not available.',
  },
  es: {
    title: 'Kiosco de Asistencia',
    subtitle: 'Flujo rápido de ingreso y salida para dispositivo compartido.',
    loading: 'Cargando kiosco',
    loadingDescription: 'Preparando dispositivo, ubicación y métodos de credencial.',
    identifying: 'Identificando colaborador',
    identifyingDescription: 'Validando la credencial en este kiosco.',
    recording: 'Registrando asistencia',
    recordingDescription: 'Enviando el evento de asistencia y refrescando el kiosco.',
    invalidDevice: 'Este enlace de kiosco es inválido o está inactivo.',
    retry: 'Reintentar',
    reset: 'Reiniciar',
    identifyTitle: 'Identificar colaborador',
    identifyDescription: 'El colaborador debe identificarse primero. El dispositivo y la ubicación son fijos en este kiosco.',
    credentialLabel: 'Credencial',
    pinPlaceholder: 'Captura el PIN',
    badgePlaceholder: 'Escanea o captura el gafete',
    identify: 'Identificar',
    methods: {
      pin: 'PIN',
      badge: 'Gafete',
    },
    kioskDevice: 'Dispositivo',
    location: 'Ubicación',
    identifiedTitle: 'Colaborador identificado',
    identifiedHint: 'Elige la acción de asistencia para este colaborador.',
    checkIn: 'Registrar ingreso',
    checkOut: 'Registrar salida',
    success: {
      checkIn: 'Ingreso registrado correctamente.',
      checkOut: 'Salida registrada correctamente.',
    },
    timeout: 'El kiosco alcanzó el tiempo límite y se reinició para el siguiente colaborador.',
    missingMethods: 'No hay métodos públicos de autenticación configurados para este kiosco.',
    unsupportedMethod: 'Este método de kiosco no está disponible.',
  },
} as const;

function deriveInitials(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return '??';
  }

  const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('');
  return initials || '??';
}

type PublicKioskMethod = NonNullable<PublicKioskBootstrapResponse['auth_methods'][number]>;

export default function Kiosk() {
  const { deviceToken } = useParams();
  const { currentLanguage } = useLanguage();
  const copy = currentLanguage.code.startsWith('es') ? kioskCopy.es : kioskCopy.en;
  const [currentTime, setCurrentTime] = useState(new Date());
  const [bootstrap, setBootstrap] = useState<PublicKioskBootstrapResponse | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<PublicKioskMethod>('pin');
  const [credentialValue, setCredentialValue] = useState('');
  const [identifiedEmployee, setIdentifiedEmployee] = useState<PublicKioskIdentifyResponse['employee'] | null>(null);
  const [identificationToken, setIdentificationToken] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [busyState, setBusyState] = useState<'idle' | 'identifying' | 'recording'>('idle');
  const successTimeoutRef = useRef<number | null>(null);
  const resetTimeoutRef = useRef<number | null>(null);

  const resetFlow = (options?: { reason?: string; keepError?: boolean }) => {
    setCredentialValue('');
    setIdentifiedEmployee(null);
    setIdentificationToken('');
    setExpiresAt('');
    setBusyState('idle');
    if (!options?.keepError) {
      setErrorMessage(options?.reason ?? '');
    } else if (options?.reason) {
      setErrorMessage(options.reason);
    }
  };

  const clearResetTimer = () => {
    if (resetTimeoutRef.current !== null) {
      window.clearTimeout(resetTimeoutRef.current);
      resetTimeoutRef.current = null;
    }
  };

  const scheduleAutoReset = (reason?: string) => {
    clearResetTimer();
    const timeoutMs = Math.max((bootstrap?.inactivity_timeout_seconds ?? 60) * 1000, 15000);
    resetTimeoutRef.current = window.setTimeout(() => {
      resetFlow({ reason });
      resetTimeoutRef.current = null;
    }, timeoutMs);
  };

  const showSuccessToast = (message: string) => {
    if (successTimeoutRef.current !== null) {
      window.clearTimeout(successTimeoutRef.current);
      successTimeoutRef.current = null;
    }

    setSuccessMessage('');
    successTimeoutRef.current = window.setTimeout(() => {
      setSuccessMessage(message);
      successTimeoutRef.current = null;
    }, 10);
  };

  const loadBootstrap = async () => {
    if (!deviceToken) {
      setBootstrap(null);
      setErrorMessage(copy.invalidDevice);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const response = await humanResourcesApi.getPublicKioskBootstrap(deviceToken);
      setBootstrap(response);
      const nextMethod = response.auth_methods.includes('pin')
        ? 'pin'
        : response.auth_methods[0] ?? 'pin';
      setSelectedMethod(nextMethod);
      if (response.auth_methods.length === 0) {
        setErrorMessage(copy.missingMethods);
      }
    } catch (error) {
      setBootstrap(null);
      setErrorMessage(error instanceof Error ? error.message : copy.invalidDevice);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadBootstrap();
  }, [deviceToken]);

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => () => {
    clearResetTimer();
    if (successTimeoutRef.current !== null) {
      window.clearTimeout(successTimeoutRef.current);
    }
  }, []);

  useEffect(() => {
    if (!bootstrap) {
      return;
    }

    if (!bootstrap.auth_methods.includes(selectedMethod)) {
      setSelectedMethod(bootstrap.auth_methods.includes('pin') ? 'pin' : bootstrap.auth_methods[0] ?? 'pin');
    }
  }, [bootstrap, selectedMethod]);

  const canIdentify = credentialValue.trim().length > 0 && busyState === 'idle' && !isLoading;
  const canPunch = identifiedEmployee !== null && identificationToken.length > 0 && busyState === 'idle';
  const methodOptions = useMemo(() => bootstrap?.auth_methods ?? [], [bootstrap?.auth_methods]);
  const credentialPlaceholder = selectedMethod === 'badge' ? copy.badgePlaceholder : copy.pinPlaceholder;

  const handleIdentify = async () => {
    if (!deviceToken || !bootstrap) {
      return;
    }
    if (!bootstrap.auth_methods.includes(selectedMethod)) {
      setErrorMessage(copy.unsupportedMethod);
      return;
    }
    if (credentialValue.trim().length === 0) {
      return;
    }

    setBusyState('identifying');
    setErrorMessage('');

    try {
      const response = await humanResourcesApi.identifyPublicKioskEmployee(deviceToken, {
        auth_method: selectedMethod,
        credential_payload: credentialValue.trim(),
      });
      setIdentifiedEmployee(response.employee);
      setIdentificationToken(response.identification_token);
      setExpiresAt(response.expires_at);
      setCredentialValue('');
      scheduleAutoReset(copy.timeout);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : copy.invalidDevice);
    } finally {
      setBusyState('idle');
    }
  };

  const handlePunch = async (eventType: 'check_in' | 'check_out') => {
    if (!deviceToken || !identificationToken) {
      return;
    }

    setBusyState('recording');
    setErrorMessage('');

    try {
      await humanResourcesApi.punchPublicKiosk(deviceToken, {
        identification_token: identificationToken,
        event_type: eventType,
        event_timestamp: localDateTimeString(new Date()),
      });

      showSuccessToast(eventType === 'check_in' ? copy.success.checkIn : copy.success.checkOut);
      clearResetTimer();
      resetFlow();
    } catch (error) {
      const message = error instanceof Error ? error.message : copy.invalidDevice;
      if (/expired/i.test(message)) {
        resetFlow({ reason: copy.timeout, keepError: true });
      } else {
        setErrorMessage(message);
      }
    } finally {
      setBusyState('idle');
    }
  };

  return (
    <>
      <LoadingBarOverlay
        isVisible={busyState !== 'idle'}
        title={busyState === 'identifying' ? copy.identifying : copy.recording}
        description={busyState === 'identifying' ? copy.identifyingDescription : copy.recordingDescription}
      />

      <SuccessToast
        isVisible={Boolean(successMessage)}
        message={successMessage}
        onClose={() => setSuccessMessage('')}
        className="pointer-events-none top-5 bottom-auto left-1/2 right-auto z-[120] block w-auto min-w-0 max-w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 p-3 sm:bottom-auto sm:right-auto"
        durationMs={2600}
      />

      <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(20,54,117,0.14),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.14),_transparent_30%),linear-gradient(180deg,_#f8fafc_0%,_#eaf1f7_100%)] px-4 py-8 text-slate-900">
        <div className="mx-auto flex max-w-5xl flex-col gap-6">
          <section className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/90 shadow-[0_24px_80px_-40px_rgba(20,54,117,0.45)] backdrop-blur">
            <div className="border-b border-slate-200/80 px-6 py-5 sm:px-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-[#143675]/10 px-3 py-1 text-sm font-medium text-[#143675]">
                    <BadgeCheck className="h-4 w-4" />
                    {copy.title}
                  </div>
                  <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">{copy.title}</h1>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{copy.subtitle}</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/90 px-4 py-3 text-right shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{copy.kioskDevice}</p>
                  <p className="mt-1 text-base font-semibold text-slate-900">{bootstrap?.kiosk_device.name ?? '—'}</p>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{copy.location}</p>
                  <p className="mt-1 text-sm text-slate-700">{bootstrap?.location.name ?? '—'}</p>
                  <p className="mt-3 text-sm font-semibold text-[#143675]">
                    {currentTime.toLocaleTimeString(currentLanguage.code, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-6 px-6 py-6 sm:px-8 lg:grid-cols-[1.1fr_0.9fr]">
              <section className="rounded-3xl border border-slate-200 bg-slate-50/80 p-6 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{copy.identifyTitle}</p>
                    <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                      {identifiedEmployee ? copy.identifiedTitle : copy.identifyTitle}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {identifiedEmployee ? copy.identifiedHint : copy.identifyDescription}
                    </p>
                  </div>
                  <Button type="button" variant="outline" className="gap-2" onClick={() => resetFlow()}>
                    <RefreshCw className="h-4 w-4" />
                    {copy.reset}
                  </Button>
                </div>

                {errorMessage ? (
                  <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {errorMessage}
                  </div>
                ) : null}

                {!identifiedEmployee ? (
                  <div className="mt-6 space-y-5">
                    {methodOptions.length > 1 ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {methodOptions.map((method) => (
                          <button
                            key={method}
                            type="button"
                            onClick={() => {
                              setSelectedMethod(method);
                              setCredentialValue('');
                              setErrorMessage('');
                            }}
                            className={`rounded-2xl border px-4 py-4 text-left transition-all ${
                              selectedMethod === method
                                ? 'border-[#143675] bg-[#143675]/8 text-[#143675] shadow-sm'
                                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                            }`}
                          >
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{copy.identify}</p>
                            <p className="mt-2 text-lg font-semibold">{copy.methods[method]}</p>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-[#143675]/15 bg-[#143675]/6 px-4 py-3 text-sm font-medium text-[#143675]">
                        {copy.methods[selectedMethod]}
                      </div>
                    )}

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">{copy.credentialLabel}</label>
                      <div className="flex flex-col gap-3 sm:flex-row">
                        <Input
                          type={selectedMethod === 'pin' ? 'password' : 'text'}
                          value={credentialValue}
                          onChange={(event) => setCredentialValue(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault();
                              void handleIdentify();
                            }
                          }}
                          placeholder={credentialPlaceholder}
                          inputMode={selectedMethod === 'pin' ? 'numeric' : 'text'}
                          autoFocus
                          autoComplete="off"
                          enterKeyHint="done"
                          className="h-12 rounded-2xl border-slate-200 bg-white text-base sm:flex-1"
                        />
                        <Button
                          type="button"
                          disabled={!canIdentify}
                          className="h-12 rounded-2xl bg-[#143675] px-6 text-white hover:bg-[#0f2855] sm:w-auto"
                          onClick={() => void handleIdentify()}
                        >
                          <KeyRound className="h-4 w-4" />
                          {copy.identify}
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-6 space-y-6">
                    <div className="flex items-center gap-4 rounded-3xl border border-emerald-200 bg-emerald-50/90 p-5">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#143675] text-xl font-semibold text-white">
                        {deriveInitials(identifiedEmployee.full_name)}
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">{copy.identifiedTitle}</p>
                        <p className="mt-1 text-2xl font-semibold text-slate-950">{identifiedEmployee.full_name}</p>
                        <p className="mt-1 text-sm text-slate-600">
                          {identifiedEmployee.employee_number || identifiedEmployee.position_title || identifiedEmployee.department || '—'}
                        </p>
                        {expiresAt ? (
                          <p className="mt-2 text-xs text-slate-500">
                            {new Date(expiresAt).toLocaleTimeString(currentLanguage.code, { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <Button
                        type="button"
                        disabled={!canPunch}
                        className="h-16 rounded-3xl bg-[#143675] text-lg font-semibold text-white hover:bg-[#0f2855]"
                        onClick={() => void handlePunch('check_in')}
                      >
                        {copy.checkIn}
                      </Button>
                      <Button
                        type="button"
                        disabled={!canPunch}
                        className="h-16 rounded-3xl bg-emerald-600 text-lg font-semibold text-white hover:bg-emerald-700"
                        onClick={() => void handlePunch('check_out')}
                      >
                        {copy.checkOut}
                      </Button>
                    </div>
                  </div>
                )}
              </section>

              <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{copy.location}</p>
                    <p className="mt-1 text-lg font-semibold text-slate-950">{bootstrap?.location.name ?? '—'}</p>
                  </div>
                </div>

                <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/90 p-4 text-sm text-slate-600">
                  <p className="font-medium text-slate-900">{copy.kioskDevice}</p>
                  <p className="mt-1">{bootstrap?.kiosk_device.name ?? '—'}</p>
                  <p className="mt-4 font-medium text-slate-900">{copy.location}</p>
                  <p className="mt-1">{bootstrap?.location.name ?? '—'}</p>
                </div>

                <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">
                  <p className="font-medium text-slate-900">{copy.identifyTitle}</p>
                  <ul className="mt-3 space-y-2">
                    <li>1. {copy.identify}</li>
                    <li>2. {copy.checkIn} / {copy.checkOut}</li>
                    <li>3. {copy.reset}</li>
                  </ul>
                </div>
              </aside>
            </div>
          </section>

          {isLoading ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm text-slate-600 shadow-sm">
              {copy.loadingDescription}
            </div>
          ) : null}
        </div>
      </main>
    </>
  );
}
