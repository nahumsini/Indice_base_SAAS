import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { CalendarRange, LoaderCircle } from "lucide-react";
import type {
  PlatformConsultingAvailability,
  PlatformConsultingAvailabilityDay,
  PlatformConsultingAvailabilityUpdate,
  PlatformConsultingConsultant,
} from "../api/platformAdmin";
import {
  IndiceModalFrame,
  IndiceModalValidation,
} from "../components/indice-modal";
import { countryOptions } from "./flowOptions";

const weekdays = [
  { id: 1, label: "Lunes", short: "Lun" },
  { id: 2, label: "Martes", short: "Mar" },
  { id: 3, label: "Miércoles", short: "Mié" },
  { id: 4, label: "Jueves", short: "Jue" },
  { id: 5, label: "Viernes", short: "Vie" },
  { id: 6, label: "Sábado", short: "Sáb" },
  { id: 7, label: "Domingo", short: "Dom" },
] as const;

const controlClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-[#177D66] focus:ring-2 focus:ring-[#177D66]/10 disabled:bg-slate-100 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white";

export function ConsultingAvailabilityModal({
  consultants,
  initialConsultantEmail,
  onClose,
  onLoad,
  onSave,
  onSaved,
}: {
  consultants: PlatformConsultingConsultant[];
  initialConsultantEmail?: string;
  onClose: () => void;
  onLoad: (consultantEmail: string) => Promise<PlatformConsultingAvailability>;
  onSave: (
    payload: PlatformConsultingAvailabilityUpdate,
  ) => Promise<PlatformConsultingAvailability>;
  onSaved: (availability: PlatformConsultingAvailability) => void;
}) {
  const [consultantEmail, setConsultantEmail] = useState(
    initialConsultantEmail || consultants[0]?.email || "",
  );
  const [availability, setAvailability] =
    useState<PlatformConsultingAvailability | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const timezoneOptions = useMemo(
    () =>
      Array.from(
        new Set(countryOptions.flatMap((country) => country.timezones)),
      ),
    [],
  );

  useEffect(() => {
    if (!consultantEmail) {
      setAvailability(null);
      return;
    }
    let active = true;
    setLoading(true);
    setError("");
    void onLoad(consultantEmail)
      .then((next) => {
        if (active) setAvailability(next);
      })
      .catch((loadError: unknown) => {
        if (!active) return;
        setAvailability(null);
        setError(errorMessage(loadError, "No se pudo cargar la disponibilidad."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [consultantEmail, onLoad]);

  const updateDay = (
    dayOfWeek: number,
    update: Partial<PlatformConsultingAvailabilityDay>,
  ) => {
    setAvailability((current) =>
      current
        ? {
            ...current,
            days: current.days.map((day) =>
              day.dayOfWeek === dayOfWeek ? { ...day, ...update } : day,
            ),
          }
        : current,
    );
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!availability || saving) return;
    setSaving(true);
    setError("");
    try {
      const saved = await onSave({
        consultantEmail: availability.consultantEmail,
        timezone: availability.timezone,
        days: availability.days,
      });
      onSaved(saved);
      onClose();
    } catch (saveError) {
      setError(
        errorMessage(saveError, "No se pudo guardar la disponibilidad."),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <IndiceModalFrame
      open
      busy={saving}
      onOpenChange={(open) => !open && onClose()}
      modalType="standard-form"
      tone="aqua"
      icon={<CalendarRange className="h-5 w-5" />}
      eyebrow="Agenda de consultorías"
      title="Configurar disponibilidad"
      description="Define los días y horarios en los que cada distribuidor consultor puede recibir sesiones."
      footerSummary={
        availability
          ? `${availability.days.filter((day) => day.enabled).length} días disponibles`
          : "Selecciona un consultor"
      }
      footer={
        <>
          <button type="button" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button
            type="submit"
            form="consulting-availability-form"
            disabled={!availability || loading || saving}
          >
            {saving ? "Guardando…" : "Guardar disponibilidad"}
          </button>
        </>
      }
    >
      <form
        id="consulting-availability-form"
        onSubmit={submit}
        className="space-y-4"
      >
        <IndiceModalValidation messages={error ? [error] : []} />

        <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2 dark:border-slate-700 dark:bg-slate-900">
          <Field label="Distribuidor consultor">
            <select
              autoFocus
              required
              value={consultantEmail}
              onChange={(event) => setConsultantEmail(event.target.value)}
              className={controlClass}
            >
              {consultants.map((consultant) => (
                <option key={consultant.id} value={consultant.email}>
                  {consultant.firstName} {consultant.lastName}
                  {consultant.companyName ? ` · ${consultant.companyName}` : ""}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Zona horaria">
            <select
              required
              disabled={!availability || loading}
              value={availability?.timezone || "America/Mexico_City"}
              onChange={(event) =>
                setAvailability((current) =>
                  current ? { ...current, timezone: event.target.value } : current,
                )
              }
              className={controlClass}
            >
              {timezoneOptions.map((timezone) => (
                <option key={timezone} value={timezone}>
                  {timezone}
                </option>
              ))}
            </select>
          </Field>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
          <header className="border-b border-slate-100 px-4 py-3 dark:border-slate-700">
            <h3 className="text-sm font-medium text-slate-950 dark:text-white">
              Horario semanal
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Desactiva un día si no debe aceptar nuevas consultorías.
            </p>
          </header>

          {loading ? (
            <div className="flex min-h-52 items-center justify-center gap-2 text-sm text-slate-500">
              <LoaderCircle className="h-5 w-5 animate-spin text-[#177D66]" />
              Cargando disponibilidad…
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {weekdays.map((weekday) => {
                const day = availability?.days.find(
                  (item) => item.dayOfWeek === weekday.id,
                );
                return (
                  <div
                    key={weekday.id}
                    className="grid items-center gap-3 px-4 py-3 sm:grid-cols-[150px_1fr_1fr]"
                  >
                    <label className="flex min-h-11 items-center gap-3 text-sm font-medium text-slate-800 dark:text-slate-100">
                      <input
                        type="checkbox"
                        checked={Boolean(day?.enabled)}
                        disabled={!day}
                        onChange={(event) =>
                          updateDay(weekday.id, {
                            enabled: event.target.checked,
                            startTime: event.target.checked
                              ? day?.startTime || "09:00"
                              : "",
                            endTime: event.target.checked
                              ? day?.endTime || "17:00"
                              : "",
                          })
                        }
                        className="h-5 w-5 rounded border-slate-300 accent-[#177D66]"
                      />
                      <span className="hidden sm:inline">{weekday.label}</span>
                      <span className="sm:hidden">{weekday.short}</span>
                    </label>
                    <Field label="Desde" compact>
                      <input
                        type="time"
                        required={Boolean(day?.enabled)}
                        disabled={!day?.enabled}
                        value={day?.startTime || ""}
                        onChange={(event) =>
                          updateDay(weekday.id, { startTime: event.target.value })
                        }
                        className={controlClass}
                      />
                    </Field>
                    <Field label="Hasta" compact>
                      <input
                        type="time"
                        required={Boolean(day?.enabled)}
                        disabled={!day?.enabled}
                        value={day?.endTime || ""}
                        min={day?.startTime || undefined}
                        onChange={(event) =>
                          updateDay(weekday.id, { endTime: event.target.value })
                        }
                        className={controlClass}
                      />
                    </Field>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </form>
    </IndiceModalFrame>
  );
}

function Field({
  label,
  compact = false,
  children,
}: {
  label: string;
  compact?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span
        className={`${compact ? "text-[11px]" : "text-xs"} mb-1 block font-medium text-slate-600 dark:text-slate-300`}
      >
        {label}
      </span>
      {children}
    </label>
  );
}

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof TypeError && /fetch/i.test(error.message)) {
    return "No se pudo conectar con Índice. Verifica que el servidor esté activo y vuelve a intentarlo.";
  }
  return error instanceof Error && error.message ? error.message : fallback;
}
