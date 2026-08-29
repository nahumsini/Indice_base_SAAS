import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Clock3,
  MapPin,
  Monitor,
  UserRound,
} from "lucide-react";
import type {
  PlatformConsultingAppointment,
  PlatformConsultingStatus,
} from "../api/platformAdmin";
import {
  IndiceFilterBar,
  IndiceFilterSelect,
} from "../components/frontend-os";

type CalendarEntry = {
  appointment: PlatformConsultingAppointment;
  dateKey: string;
  startAt: string;
  timeLabel: string;
  isConfirmedTime: boolean;
};

const weekdayLabels = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const statusCopy: Record<PlatformConsultingStatus, string> = {
  REQUESTED: "Por confirmar",
  PAYMENT_REQUIRED: "Pago pendiente",
  CONFIRMED: "Confirmada",
  COMPLETED: "Completada",
  NO_SHOW: "No asistió",
  CANCELLED: "Cancelada",
};

export function ConsultingCalendarView({
  appointments,
  onOpen,
  onConfigureAvailability,
}: {
  appointments: PlatformConsultingAppointment[];
  onOpen: (appointment: PlatformConsultingAppointment) => void;
  onConfigureAvailability?: () => void;
}) {
  const today = useMemo(() => new Date(), []);
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [selectedDate, setSelectedDate] = useState(() => toLocalDateKey(today));
  const [consultantFilter, setConsultantFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ACTIVE");

  const consultantOptions = useMemo(() => {
    const names = Array.from(
      new Set(
        appointments
          .map((appointment) => appointment.consultant_name?.trim())
          .filter((name): name is string => Boolean(name)),
      ),
    ).sort((left, right) => left.localeCompare(right, "es"));

    return [
      { value: "ALL", label: "Todos los consultores" },
      { value: "UNASSIGNED", label: "Sin consultor asignado" },
      ...names.map((name) => ({ value: name, label: name })),
    ];
  }, [appointments]);

  const entries = useMemo<CalendarEntry[]>(
    () =>
      appointments
        .map((appointment) => {
          const isConfirmedTime = Boolean(appointment.confirmed_start_at);
          const startAt =
            appointment.confirmed_start_at || appointment.preferred_start_at;
          return {
            appointment,
            startAt,
            isConfirmedTime,
            dateKey: toDateKey(startAt, appointment.timezone),
            timeLabel: formatTime(startAt, appointment.timezone),
          };
        })
        .filter((entry) => {
          const matchesConsultant =
            consultantFilter === "ALL" ||
            (consultantFilter === "UNASSIGNED" &&
              !entry.appointment.consultant_name) ||
            entry.appointment.consultant_name === consultantFilter;
          const matchesStatus =
            statusFilter === "ALL" ||
            (statusFilter === "ACTIVE" &&
              ["REQUESTED", "PAYMENT_REQUIRED", "CONFIRMED"].includes(
                entry.appointment.status,
              )) ||
            entry.appointment.status === statusFilter;
          return matchesConsultant && matchesStatus;
        })
        .sort((left, right) =>
          new Date(left.startAt).getTime() - new Date(right.startAt).getTime(),
        ),
    [appointments, consultantFilter, statusFilter],
  );

  const monthKey = toMonthKey(visibleMonth);
  const monthEntries = useMemo(
    () => entries.filter((entry) => entry.dateKey.startsWith(monthKey)),
    [entries, monthKey],
  );
  const entriesByDay = useMemo(() => {
    const grouped = new Map<string, CalendarEntry[]>();
    monthEntries.forEach((entry) => {
      grouped.set(entry.dateKey, [
        ...(grouped.get(entry.dateKey) || []),
        entry,
      ]);
    });
    return grouped;
  }, [monthEntries]);
  const selectedEntries = entriesByDay.get(selectedDate) || [];
  const calendarCells = useMemo(
    () => buildCalendarCells(visibleMonth),
    [visibleMonth],
  );
  const assignedThisMonth = monthEntries.filter(
    (entry) => entry.appointment.consultant_name,
  ).length;
  const requestedThisMonth = monthEntries.filter(
    (entry) => !entry.isConfirmedTime,
  ).length;

  useEffect(() => {
    if (!selectedDate.startsWith(monthKey)) {
      setSelectedDate(
        monthEntries[0]?.dateKey ||
          toLocalDateKey(
            new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1),
          ),
      );
    }
  }, [monthEntries, monthKey, selectedDate, visibleMonth]);

  const moveMonth = (offset: number) => {
    const nextMonth = new Date(
      visibleMonth.getFullYear(),
      visibleMonth.getMonth() + offset,
      1,
    );
    setVisibleMonth(nextMonth);
    setSelectedDate(toLocalDateKey(nextMonth));
  };

  const goToToday = () => {
    setVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(toLocalDateKey(today));
  };

  const selectCalendarDate = (date: Date, dateKey: string) => {
    if (
      date.getFullYear() !== visibleMonth.getFullYear() ||
      date.getMonth() !== visibleMonth.getMonth()
    ) {
      setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    }
    setSelectedDate(dateKey);
  };

  return (
    <div className="space-y-5">
      <IndiceFilterBar
        title="Agenda de consultorías"
        subtitle="Consulta horarios solicitados y confirmados, responsables y disponibilidad mensual."
        summary={`${monthEntries.length} ${monthEntries.length === 1 ? "sesión" : "sesiones"} en el mes`}
        gridClassName="md:grid-cols-2"
      >
        <IndiceFilterSelect
          label="Consultor"
          value={consultantFilter}
          onValueChange={setConsultantFilter}
          options={consultantOptions}
          tone="aqua"
        />
        <IndiceFilterSelect
          label="Estado"
          value={statusFilter}
          onValueChange={setStatusFilter}
          options={[
            { value: "ACTIVE", label: "Pendientes y confirmadas" },
            { value: "ALL", label: "Todos los estados" },
            ...Object.entries(statusCopy).map(([value, label]) => ({
              value,
              label,
            })),
          ]}
          tone="aqua"
        />
      </IndiceFilterBar>

      <section className="grid gap-3 sm:grid-cols-3" aria-label="Resumen mensual">
        <CalendarSummary
          label="Sesiones del mes"
          value={monthEntries.length}
          description="Solicitadas y confirmadas"
          tone="blue"
        />
        <CalendarSummary
          label="Con consultor"
          value={assignedThisMonth}
          description="Responsable identificado"
          tone="aqua"
        />
        <CalendarSummary
          label="Horario solicitado"
          value={requestedThisMonth}
          description="Aún requieren confirmación"
          tone="amber"
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <header className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700">
            <div>
              <p className="text-lg font-medium capitalize text-slate-950 dark:text-white">
                {formatMonth(visibleMonth)}
              </p>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                <Legend color="bg-blue-500" label="Confirmada" />
                <Legend color="bg-amber-500" label="Solicitada" />
                <Legend color="bg-[#59C3A5]" label="Completada" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              {onConfigureAvailability ? (
                <button
                  type="button"
                  onClick={onConfigureAvailability}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#177D66] px-3 text-xs font-medium text-white shadow-sm transition hover:bg-[#126553] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#59C3A5]/30"
                >
                  <CalendarRange className="h-4 w-4" />
                  Configurar disponibilidad
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => moveMonth(-1)}
                aria-label="Mes anterior"
                className={calendarControlClass}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={goToToday}
                className="h-10 rounded-xl border border-[#59C3A5]/30 bg-white px-3 text-xs font-medium text-[#176B5B] transition hover:bg-[#59C3A5]/10 dark:bg-slate-900 dark:text-[#8FE0CA]"
              >
                Hoy
              </button>
              <button
                type="button"
                onClick={() => moveMonth(1)}
                aria-label="Mes siguiente"
                className={calendarControlClass}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </header>

          <div className="overflow-x-auto p-4">
            <div className="min-w-[820px]">
              <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-700">
                {weekdayLabels.map((label) => (
                  <div
                    key={label}
                    className="px-2 py-2 text-center text-xs font-medium text-slate-500 dark:text-slate-400"
                  >
                    {label}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {calendarCells.map((date) => {
                  const dateKey = toLocalDateKey(date);
                  const dayEntries = entriesByDay.get(dateKey) || [];
                  const inMonth = date.getMonth() === visibleMonth.getMonth();
                  const isToday = dateKey === toLocalDateKey(today);
                  const isSelected = dateKey === selectedDate;

                  return (
                    <div
                      key={dateKey}
                      className={`min-h-32 border-b border-r border-slate-100 p-2 transition dark:border-slate-700 ${
                        inMonth
                          ? "bg-white dark:bg-slate-800"
                          : "bg-slate-50/70 dark:bg-slate-900/40"
                      } ${isSelected ? "bg-[#59C3A5]/5 ring-2 ring-inset ring-[#59C3A5]/35 dark:bg-[#59C3A5]/10" : ""}`}
                    >
                      <button
                        type="button"
                        onClick={() => selectCalendarDate(date, dateKey)}
                        className={`mb-1 grid h-7 w-7 place-items-center rounded-full text-xs font-medium transition ${
                          isToday
                            ? "bg-[#177D66] text-white"
                            : inMonth
                              ? "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                              : "text-slate-400 dark:text-slate-600"
                        }`}
                        aria-label={`Ver agenda del ${formatLongDate(dateKey)}`}
                      >
                        {date.getDate()}
                      </button>
                      <div className="space-y-1">
                        {dayEntries.slice(0, 3).map((entry) => (
                          <button
                            key={entry.appointment.id}
                            type="button"
                            onClick={() => {
                              setSelectedDate(dateKey);
                              onOpen(entry.appointment);
                            }}
                            className={`block w-full truncate rounded-lg border px-2 py-1.5 text-left text-[11px] font-medium transition hover:shadow-sm ${eventTone(entry.appointment.status, entry.isConfirmedTime)}`}
                            title={`${entry.timeLabel} · ${entry.appointment.company_name}`}
                          >
                            {entry.timeLabel} · {entry.appointment.company_name}
                          </button>
                        ))}
                        {dayEntries.length > 3 ? (
                          <button
                            type="button"
                            onClick={() => setSelectedDate(dateKey)}
                            className="px-1 text-[11px] font-medium text-[#176B5B] hover:underline dark:text-[#8FE0CA]"
                          >
                            +{dayEntries.length - 3} más
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <aside className="h-fit rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#59C3A5]/10 text-[#177D66] dark:text-[#8FE0CA]">
              <CalendarDays className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-medium text-slate-950 dark:text-white">
                {formatLongDate(selectedDate)}
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {selectedEntries.length
                  ? `${selectedEntries.length} ${selectedEntries.length === 1 ? "consultoría programada" : "consultorías programadas"}`
                  : "Sin consultorías para este día"}
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {selectedEntries.map((entry) => (
              <button
                key={entry.appointment.id}
                type="button"
                onClick={() => onOpen(entry.appointment)}
                className="w-full rounded-2xl border border-slate-200 p-4 text-left transition hover:border-[#59C3A5]/50 hover:bg-[#59C3A5]/5 dark:border-slate-700 dark:hover:bg-[#59C3A5]/10"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                      {entry.appointment.company_name}
                    </p>
                    <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                      {entry.appointment.attendee_name}
                    </p>
                  </div>
                  <CalendarStatus
                    status={entry.appointment.status}
                    isConfirmedTime={entry.isConfirmedTime}
                  />
                </div>
                <div className="mt-3 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                  <p className="flex items-center gap-2">
                    <Clock3 className="h-3.5 w-3.5 text-[#177D66]" />
                    {entry.timeLabel} · {entry.appointment.duration_minutes} min
                    <span className="text-slate-400">
                      {entry.isConfirmedTime ? "Confirmado" : "Solicitado"}
                    </span>
                  </p>
                  <p className="flex items-center gap-2">
                    <UserRound className="h-3.5 w-3.5 text-[#177D66]" />
                    <span className="truncate">
                      {entry.appointment.consultant_name || "Sin consultor asignado"}
                    </span>
                  </p>
                  <p className="flex items-center gap-2">
                    {entry.appointment.consultation_mode === "IN_PERSON" ? (
                      <MapPin className="h-3.5 w-3.5 text-amber-600" />
                    ) : (
                      <Monitor className="h-3.5 w-3.5 text-blue-600" />
                    )}
                    {entry.appointment.consultation_mode === "IN_PERSON"
                      ? entry.appointment.service_location_name || "Presencial"
                      : "Virtual"}
                  </p>
                </div>
                {entry.appointment.alternative_start_at &&
                !entry.isConfirmedTime ? (
                  <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-[11px] text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                    Alternativa: {formatDateTime(
                      entry.appointment.alternative_start_at,
                      entry.appointment.timezone,
                    )}
                  </p>
                ) : null}
              </button>
            ))}
            {!selectedEntries.length ? (
              <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center dark:border-slate-700">
                <Clock3 className="mx-auto h-5 w-5 text-slate-400" />
                <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  Selecciona otro día o cambia los filtros para consultar la agenda.
                </p>
              </div>
            ) : null}
          </div>
        </aside>
      </section>
    </div>
  );
}

function CalendarSummary({
  label,
  value,
  description,
  tone,
}: {
  label: string;
  value: number;
  description: string;
  tone: "blue" | "aqua" | "amber";
}) {
  const tones = {
    blue: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
    aqua: "bg-[#59C3A5]/10 text-[#177D66] dark:text-[#8FE0CA]",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  };
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-900 dark:text-white">{label}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{description}</p>
        </div>
        <span className={`rounded-xl px-3 py-1.5 text-xl font-medium ${tones[tone]}`}>
          {value}
        </span>
      </div>
    </article>
  );
}

function CalendarStatus({
  status,
  isConfirmedTime,
}: {
  status: PlatformConsultingStatus;
  isConfirmedTime: boolean;
}) {
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-medium ${eventTone(status, isConfirmedTime)}`}
    >
      {statusCopy[status]}
    </span>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-full ${color}`} />
      {label}
    </span>
  );
}

function eventTone(status: PlatformConsultingStatus, isConfirmedTime: boolean) {
  if (status === "COMPLETED") {
    return "border-[#59C3A5]/30 bg-[#59C3A5]/10 text-[#176B5B] dark:text-[#8FE0CA]";
  }
  if (status === "CANCELLED" || status === "NO_SHOW") {
    return "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300";
  }
  if (isConfirmedTime || status === "CONFIRMED") {
    return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300";
  }
  return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300";
}

function buildCalendarCells(month: Date) {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const leadingDays = (firstDay.getDay() + 6) % 7;
  const gridStart = new Date(
    month.getFullYear(),
    month.getMonth(),
    1 - leadingDays,
  );
  return Array.from({ length: 42 }, (_, index) =>
    new Date(
      gridStart.getFullYear(),
      gridStart.getMonth(),
      gridStart.getDate() + index,
    ),
  );
}

function toLocalDateKey(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function toMonthKey(date: Date) {
  return toLocalDateKey(new Date(date.getFullYear(), date.getMonth(), 1)).slice(
    0,
    7,
  );
}

function toDateKey(value: string, timeZone?: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: timeZone || undefined,
    }).formatToParts(date);
    const get = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((part) => part.type === type)?.value || "";
    return `${get("year")}-${get("month")}-${get("day")}`;
  } catch {
    return toLocalDateKey(date);
  }
}

function formatMonth(date: Date) {
  return new Intl.DateTimeFormat("es-MX", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatLongDate(dateKey: string) {
  const date = new Date(`${dateKey}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "Fecha seleccionada";
  return new Intl.DateTimeFormat("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatTime(value: string, timeZone?: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  try {
    return new Intl.DateTimeFormat("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: timeZone || undefined,
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }
}

function formatDateTime(value: string, timeZone?: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  try {
    return new Intl.DateTimeFormat("es-MX", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: timeZone || undefined,
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat("es-MX", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }
}

const calendarControlClass =
  "grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-[#59C3A5]/50 hover:bg-[#59C3A5]/10 hover:text-[#176B5B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#59C3A5]/25 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300";
