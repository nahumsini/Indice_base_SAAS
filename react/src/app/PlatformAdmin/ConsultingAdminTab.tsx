import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Building2,
  CalendarCheck2,
  CalendarClock,
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  CircleAlert,
  Clock3,
  ExternalLink,
  Handshake,
  LoaderCircle,
  Mail,
  MapPin,
  Monitor,
  Phone,
  RefreshCw,
  Sparkles,
  UserRound,
  UserPlus,
} from "lucide-react";
import {
  platformAdminApi,
  type PlatformConsultingAppointment,
  type PlatformConsultingAppointmentCreate,
  type PlatformConsultingAppointmentUpdate,
  type PlatformConsultingAvailability,
  type PlatformConsultingAvailabilityUpdate,
  type PlatformConsultingConsultant,
  type PlatformConsultingLocation,
  type PlatformConsultingStatus,
  type PlatformConsultingWorkspace,
} from "../api/platformAdmin";
import { ConsultantCreateModal } from "./Consultants";
import { CoverageCreateModal } from "./ConsultingCoverage";
import {
  SessionCreateModal,
  type ConsultingCompanyOption,
} from "./ConsultingSessions";
import { ConsultingCalendarView } from "./ConsultingCalendarView";
import { ConsultingAvailabilityModal } from "./ConsultingAvailabilityModal";
import {
  IndiceFilterBar,
  IndiceFilterSearch,
  IndiceFilterSelect,
  IndiceTitleBar,
  IndiceWorkspaceNavigation,
} from "../components/frontend-os";
import {
  getIndiceTableMinimumWidth,
  IndiceOperationalTable,
  IndiceTableColGroup,
  IndiceTableHeaderRow,
  IndiceTableShell,
  type IndiceTableColumnDefinition,
} from "../components/table/IndiceTableEngine";
import { TableBody, TableCell, TableRow } from "../components/ui/table";
import { usePersistentColumnWidths } from "../hooks/usePersistentColumnWidths";
import {
  IndiceModalFrame,
  IndiceModalSummary,
  IndiceModalValidation,
  IndiceModalWizardStepper,
} from "../components/indice-modal";

const controlClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-[#177D66] focus:ring-2 focus:ring-[#177D66]/10 disabled:bg-slate-100 disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:disabled:bg-slate-800 dark:disabled:text-slate-500";
const statuses: Array<{ value: PlatformConsultingStatus; label: string }> = [
  { value: "REQUESTED", label: "Por confirmar" },
  { value: "CONFIRMED", label: "Confirmada" },
  { value: "COMPLETED", label: "Completada" },
  { value: "NO_SHOW", label: "No asistió" },
  { value: "CANCELLED", label: "Cancelada" },
];

type EditState = {
  status: PlatformConsultingStatus;
  confirmedStartAt: string;
  meetingUrl: string;
  consultantName: string;
  consultantEmail: string;
  consultantPhone: string;
  internalNotes: string;
  consultationType: ConsultationType;
  paymentStatus: PlatformConsultingAppointment["payment_status"];
  amount: string;
  currency: string;
  cancellationReason: string;
};
type ConsultationType = "PAID" | "COURTESY" | "MODULE_IMPLEMENTATION";
type ConsultingView = "requests" | "calendar" | "consultants" | "coverage";
type AppointmentColumnId =
  | "company"
  | "client"
  | "contact"
  | "mode"
  | "schedule"
  | "status"
  | "consultant";

const appointmentColumnLabels: Record<AppointmentColumnId, string> = {
  company: "Folio y empresa",
  client: "Cliente y objetivo",
  contact: "Contacto",
  mode: "Modalidad",
  schedule: "Horario solicitado",
  status: "Estado",
  consultant: "Consultor",
};
const appointmentColumnDefaults: Record<AppointmentColumnId, number> = {
  company: 230,
  client: 220,
  contact: 250,
  mode: 150,
  schedule: 220,
  status: 140,
  consultant: 210,
};
const appointmentColumnMinimums: Record<AppointmentColumnId, number> = {
  company: 190,
  client: 180,
  contact: 210,
  mode: 130,
  schedule: 190,
  status: 120,
  consultant: 180,
};
const appointmentColumnMaximums: Record<AppointmentColumnId, number> = {
  company: 340,
  client: 340,
  contact: 380,
  mode: 240,
  schedule: 320,
  status: 220,
  consultant: 320,
};
const appointmentActionsWidth = 132;

export interface ConsultingAdminOperations {
  getConsulting: () => Promise<PlatformConsultingWorkspace>;
  createConsultingAppointment: (
    payload: PlatformConsultingAppointmentCreate,
  ) => Promise<PlatformConsultingAppointment>;
  updateConsultingAppointment: (
    appointmentId: number,
    payload: PlatformConsultingAppointmentUpdate,
  ) => Promise<PlatformConsultingAppointment>;
  getConsultingAvailability?: (
    consultantEmail: string,
  ) => Promise<PlatformConsultingAvailability>;
  updateConsultingAvailability?: (
    payload: PlatformConsultingAvailabilityUpdate,
  ) => Promise<PlatformConsultingAvailability>;
  createConsultingConsultant?: (payload: {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
  }) => Promise<PlatformConsultingConsultant>;
  createConsultingLocation?: (payload: {
    cityName: string;
    regionName: string;
    countryName: string;
    countryCode: string;
    timezone: string;
    currency: string;
  }) => Promise<PlatformConsultingLocation>;
  updateConsultingLocation?: (
    locationId: number,
    payload: {
      active: boolean;
      inPersonFeeCents: number | null;
      currency: string;
    },
  ) => Promise<PlatformConsultingLocation>;
}

export interface ConsultingAdminCapabilities {
  viewConsultants: boolean;
  manageConsultants: boolean;
  viewCoverage: boolean;
  manageCoverage: boolean;
  createSessions: boolean;
  manageAppointments: boolean;
  managePayments: boolean;
}

export interface ConsultingAdminHeading {
  eyebrow: string;
  title: string;
  description: string;
}

export default function ConsultingAdminTab({
  canManage,
  companies,
  operations = platformAdminApi,
  capabilities,
  heading,
  attendingConsultant,
}: {
  canManage: boolean;
  companies: ConsultingCompanyOption[];
  operations?: ConsultingAdminOperations;
  capabilities?: Partial<ConsultingAdminCapabilities>;
  heading?: Partial<ConsultingAdminHeading>;
  attendingConsultant?: { name: string };
}) {
  const permissions: ConsultingAdminCapabilities = {
    viewConsultants: true,
    manageConsultants: canManage,
    viewCoverage: true,
    manageCoverage: canManage,
    createSessions: canManage,
    manageAppointments: canManage,
    managePayments: canManage,
    ...capabilities,
  };
  const labels: ConsultingAdminHeading = {
    eyebrow: "Operación de consultoría",
    title: "Solicitudes, distribuidores y sesiones",
    description:
      "Coordina horarios con el cliente, asigna al distribuidor consultor responsable y publica la confirmación desde un solo lugar.",
    ...heading,
  };
  const availableViews: Array<{
    id: ConsultingView;
    label: string;
    icon: typeof CalendarClock;
  }> = [
    { id: "requests", label: "Solicitudes", icon: CalendarClock },
    { id: "calendar", label: "Calendario", icon: CalendarDays },
    ...(permissions.viewConsultants
      ? [{ id: "consultants" as const, label: "Distribuidores", icon: UserRound }]
      : []),
    ...(permissions.viewCoverage
      ? [{ id: "coverage" as const, label: "Cobertura presencial", icon: MapPin }]
      : []),
  ];
  const [workspace, setWorkspace] =
    useState<PlatformConsultingWorkspace | null>(null);
  const [selected, setSelected] =
    useState<PlatformConsultingAppointment | null>(null);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ACTIVE");
  const [modeFilter, setModeFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [consultantModalOpen, setConsultantModalOpen] = useState(false);
  const [coverageModalOpen, setCoverageModalOpen] = useState(false);
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [availabilityModalOpen, setAvailabilityModalOpen] = useState(false);
  const [activeView, setActiveView] = useState<ConsultingView>("requests");
  const consultants: PlatformConsultingConsultant[] = workspace?.consultants ?? [];
  const allAppointments = workspace?.appointments ?? [];
  const allLocations = workspace?.locations ?? [];
  const selectableCompanies = workspace?.companies ?? companies;

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const next = await operations.getConsulting();
      setWorkspace(next);
      if (selected) {
        const updated =
          next.appointments.find((item) => item.id === selected.id) ?? null;
        setSelected(updated);
        setEdit(updated ? toEditState(updated) : null);
      }
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "No se pudieron cargar las solicitudes de consultoría.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return allAppointments.filter((appointment) => {
      const matchesQuery =
        !normalized ||
        [
          appointment.company_name,
          appointment.attendee_name,
          appointment.attendee_email,
          appointment.attendee_phone || "",
          String(appointment.id),
        ].some((value) => value.toLowerCase().includes(normalized));
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" &&
          ["REQUESTED", "PAYMENT_REQUIRED", "CONFIRMED"].includes(
            appointment.status,
          )) ||
        (statusFilter === "UPCOMING" &&
          appointment.status === "CONFIRMED" &&
          new Date(
            appointment.confirmed_start_at || appointment.preferred_start_at,
          ) > new Date()) ||
        appointment.status === statusFilter;
      const matchesMode =
        modeFilter === "ALL" || appointment.consultation_mode === modeFilter;
      return matchesQuery && matchesStatus && matchesMode;
    });
  }, [allAppointments, modeFilter, query, statusFilter]);
  const requestCounts = useMemo(() => {
    const now = new Date();
    return {
      requested: allAppointments.filter((item) => item.status === "REQUESTED")
        .length,
      confirmed: allAppointments.filter((item) => item.status === "CONFIRMED")
        .length,
      upcoming: allAppointments.filter(
        (item) =>
          item.status === "CONFIRMED" &&
          new Date(item.confirmed_start_at || item.preferred_start_at) > now,
      ).length,
      total: allAppointments.length,
    };
  }, [allAppointments]);

  const openAppointment = (appointment: PlatformConsultingAppointment) => {
    setSelected(appointment);
    setEdit(toEditState(appointment));
    setError("");
    setSuccess("");
  };

  const saveAppointment = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected || !edit || saving || !permissions.manageAppointments) return;
    const meetingUrl = edit.meetingUrl.trim();
    if (meetingUrl && !isHttpsUrl(meetingUrl)) {
      setError("El enlace de reunión debe comenzar con https://");
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const payload: PlatformConsultingAppointmentUpdate = {
        status: edit.status === "PAYMENT_REQUIRED" ? "REQUESTED" : edit.status,
        confirmedStartAt: edit.confirmedStartAt
          ? new Date(edit.confirmedStartAt).toISOString()
          : null,
        meetingUrl: isHttpsUrl(meetingUrl) ? meetingUrl : "",
        consultantName: edit.consultantName.trim(),
        consultantEmail: edit.consultantEmail.trim(),
        consultantPhone: edit.consultantPhone.trim(),
        internalNotes: edit.internalNotes.trim(),
        paymentStatus: paymentStatusForConsultationType(
          edit.consultationType,
          edit.paymentStatus,
        ),
        amountCents: consultationAmountCents(edit.consultationType),
        currency: "USD",
        cancellationReason: edit.cancellationReason.trim(),
      };
      const updated = await operations.updateConsultingAppointment(
        selected.id,
        payload,
      );
      setSelected(updated);
      setEdit(toEditState(updated));
      setWorkspace((current) =>
        current
          ? {
              ...current,
              appointments: current.appointments.map((item) =>
                item.id === updated.id ? updated : item,
              ),
            }
          : current,
      );
      setSuccess(
        "La solicitud quedó actualizada y el cliente recibirá el aviso correspondiente.",
      );
      await load();
      setSelected(null);
      setEdit(null);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "No se pudo actualizar la solicitud.",
      );
    } finally {
      setSaving(false);
    }
  };

  const saveLocation = async (
    location: PlatformConsultingLocation,
    active: boolean,
    fee: string,
  ) => {
    if (saving || !permissions.manageCoverage || !operations.updateConsultingLocation) return;
    setSaving(true);
    setError("");
    try {
      const feeCents = fee.trim() === "" ? null : Math.round(Number(fee) * 100);
      const updated = await operations.updateConsultingLocation(
        location.id,
        {
          active,
          inPersonFeeCents: Number.isFinite(feeCents) ? feeCents : null,
          currency: location.currency || "USD",
        },
      );
      setWorkspace((current) =>
        current
          ? {
              ...current,
              locations: current.locations.map((item) =>
                item.id === updated.id ? updated : item,
              ),
            }
          : current,
      );
      setSuccess(
        `${updated.city_name} quedó ${updated.active ? "disponible" : "oculta"} para solicitudes presenciales.`,
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "No se pudo actualizar la ciudad.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <IndiceTitleBar
        tone="aqua"
        icon={<Handshake className="h-5 w-5" />}
        title={labels.title}
        subtitle={labels.description}
        actions={
          <div className="flex flex-wrap justify-end gap-2">
          {permissions.manageConsultants && activeView === "consultants" ? (
            <button
              type="button"
              onClick={() => setConsultantModalOpen(true)}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#177D66] px-4 text-sm font-medium text-white shadow-sm transition hover:bg-[#126553] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#59C3A5]/30"
            >
              <UserPlus className="h-4 w-4" />
              Agregar consultor interno
            </button>
          ) : null}
          {permissions.createSessions &&
          (activeView === "requests" || activeView === "calendar") ? (
            <button
              type="button"
              onClick={() => {
                setError("");
                setSessionModalOpen(true);
              }}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#177D66] px-4 text-sm font-medium text-white shadow-sm transition hover:bg-[#126553] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#59C3A5]/30"
            >
              <CalendarPlus className="h-4 w-4" />
              Agregar sesión
            </button>
          ) : null}
          {permissions.manageCoverage && activeView === "coverage" ? (
            <button
              type="button"
              onClick={() => setCoverageModalOpen(true)}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#177D66] px-4 text-sm font-medium text-white shadow-sm transition hover:bg-[#126553] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#59C3A5]/30"
            >
              <MapPin className="h-4 w-4" />
              Agregar cobertura
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#59C3A5]/30 bg-white px-4 text-sm font-medium text-[#176B5B] transition hover:bg-[#59C3A5]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#59C3A5]/25 dark:bg-slate-900 dark:text-[#8FE0CA]"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </button>
        </div>
        }
      />

      {error ? (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      ) : null}
      {success ? (
        <div
          role="status"
          className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          {success}
        </div>
      ) : null}

      {availableViews.length > 1 ? (
        <IndiceWorkspaceNavigation<ConsultingView>
          ariaLabel="Vistas de consultoría"
          tone="aqua"
          value={activeView}
          onValueChange={setActiveView}
          items={availableViews.map((view) => {
            const Icon = view.icon;
            return { ...view, icon: <Icon /> };
          })}
        />
      ) : null}

      {activeView === "requests" ? (
        <>
          <section className="flex items-start gap-3 rounded-2xl border border-[#59C3A5]/30 bg-[#59C3A5]/10 px-4 py-3 text-sm text-[#176B5B] dark:border-[#59C3A5]/30 dark:bg-[#59C3A5]/10 dark:text-[#8FE0CA]">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-[#177D66] shadow-sm dark:bg-slate-900">
              <Sparkles className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="font-medium text-slate-900 dark:text-white">
                {requestCounts.requested > 0
                  ? `${requestCounts.requested} ${requestCounts.requested === 1 ? "solicitud requiere" : "solicitudes requieren"} coordinación.`
                  : "No hay solicitudes pendientes de confirmación."}
              </p>
              <p className="mt-0.5 text-xs leading-5 text-slate-600 dark:text-slate-300">
                Confirma horario, asigna consultor y deja listo el enlace antes de la sesión.
              </p>
            </div>
          </section>

          <IndiceFilterBar
            title="Filtros"
            subtitle="Encuentra una solicitud por cliente y reduce la vista por estado o modalidad."
            summary={`${filtered.length} de ${allAppointments.length} solicitudes`}
            gridClassName="lg:grid-cols-[minmax(280px,1fr)_240px_220px]"
          >
            <IndiceFilterSearch
              label="Buscar"
              value={query}
              onValueChange={setQuery}
              onClear={() => setQuery("")}
              placeholder="Empresa, persona, correo, teléfono o folio"
              tone="aqua"
            />
            <IndiceFilterSelect
              label="Estado"
              value={statusFilter}
              onValueChange={setStatusFilter}
              tone="aqua"
              options={[
                { value: "ACTIVE", label: "Pendientes y próximas" },
                { value: "UPCOMING", label: "Próximas sesiones" },
                { value: "ALL", label: "Todos los estados" },
                ...statuses.map((status) => ({
                  value: status.value,
                  label: status.label,
                })),
              ]}
            />
            <IndiceFilterSelect
              label="Modalidad"
              value={modeFilter}
              onValueChange={setModeFilter}
              tone="aqua"
              options={[
                { value: "ALL", label: "Todas las modalidades" },
                { value: "VIRTUAL", label: "Virtual" },
                { value: "IN_PERSON", label: "Presencial" },
              ]}
            />
          </IndiceFilterBar>

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric
              icon={CalendarClock}
              label="Por confirmar"
              value={requestCounts.requested}
              caption="Requieren coordinación"
              tone="amber"
              active={statusFilter === "REQUESTED"}
              onClick={() => setStatusFilter("REQUESTED")}
            />
            <Metric
              icon={CalendarCheck2}
              label="Confirmadas"
              value={requestCounts.confirmed}
              caption="Con fecha y consultor"
              tone="blue"
              active={statusFilter === "CONFIRMED"}
              onClick={() => setStatusFilter("CONFIRMED")}
            />
            <Metric
              icon={Clock3}
              label="Próximas"
              value={requestCounts.upcoming}
              caption="Sesiones por realizar"
              tone="mint"
              active={statusFilter === "UPCOMING"}
              onClick={() => setStatusFilter("UPCOMING")}
            />
            <Metric
              icon={Building2}
              label="Solicitudes totales"
              value={requestCounts.total}
              caption="Historial completo"
              tone="slate"
              active={statusFilter === "ALL"}
              onClick={() => setStatusFilter("ALL")}
            />
          </section>
          {loading && !workspace ? (
            <IndiceTableShell>
              <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-slate-500">
                <LoaderCircle className="h-5 w-5 animate-spin text-[#177D66]" />
                Cargando solicitudes…
              </div>
            </IndiceTableShell>
          ) : (
            <AppointmentsTable
              appointments={filtered}
              onOpen={openAppointment}
            />
          )}
        </>
      ) : null}

      {activeView === "calendar" ? (
        <ConsultingCalendarView
          appointments={allAppointments}
          onOpen={openAppointment}
          onConfigureAvailability={
            permissions.manageConsultants &&
            consultants.length > 0 &&
            operations.getConsultingAvailability &&
            operations.updateConsultingAvailability
              ? () => setAvailabilityModalOpen(true)
              : undefined
          }
        />
      ) : null}

      {activeView === "consultants" ? (
        consultants.length ? (
          <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700">
              <div>
                <h3 className="font-medium text-slate-900 dark:text-white">
                  Directorio de distribuidores consultores
                </h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Las cuentas activas de distribuidores se sincronizan automáticamente; el equipo interno se agrega por separado.
                </p>
              </div>
              <span className="w-fit rounded-full bg-[#59C3A5]/10 px-3 py-1 text-xs font-medium text-[#176B5B] dark:text-[#8FE0CA]">
                {consultants.length} {consultants.length === 1 ? "perfil disponible" : "perfiles disponibles"}
              </span>
            </div>
            <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {consultants.map((consultant) => (
                <article
                  key={consultant.id}
                  className="rounded-2xl border border-[#59C3A5]/20 bg-[#59C3A5]/5 p-4 transition hover:-translate-y-0.5 hover:border-[#59C3A5]/50 hover:shadow-sm dark:bg-[#59C3A5]/10"
                >
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-white text-sm font-medium text-[#177D66] shadow-sm dark:bg-slate-900 dark:text-[#8FE0CA]">
                      {consultant.firstName[0]}
                      {consultant.lastName?.[0] ?? ""}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-900 dark:text-white">
                        {consultant.firstName} {consultant.lastName}
                      </p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                        {consultant.companyName || "Equipo Índice"}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[11px] font-medium text-[#176B5B] shadow-sm dark:bg-slate-900 dark:text-[#8FE0CA]">
                      <Building2 className="h-3 w-3" />
                      {consultant.sourceType === "DISTRIBUTOR" ? "Distribuidor" : "Equipo Índice"}
                    </span>
                  </div>
                  <p className="mt-3 flex items-center gap-1.5 truncate text-xs text-slate-600 dark:text-slate-300">
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    {consultant.email}
                  </p>
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                    <Phone className="h-3.5 w-3.5" />
                    {consultant.phone || "Sin teléfono registrado"}
                  </p>
                </article>
              ))}
            </div>
          </section>
        ) : (
          <EmptyConsultants
            onCreate={() => setConsultantModalOpen(true)}
            canManage={permissions.manageConsultants}
          />
        )
      ) : null}

      {activeView === "coverage" ? (
        <LocationsPanel
          locations={allLocations}
          saving={saving}
          canManage={permissions.manageCoverage}
          onSave={(location, active, fee) => void saveLocation(location, active, fee)}
        />
      ) : null}

      {selected && edit ? (
        <AppointmentDrawer
          appointment={selected}
          edit={edit}
          consultants={consultants}
          saving={saving}
          canManage={permissions.manageAppointments}
          canManagePayment={permissions.managePayments}
          onEdit={setEdit}
          onClose={() => {
            setSelected(null);
            setEdit(null);
          }}
          onSubmit={saveAppointment}
        />
      ) : null}
      {consultantModalOpen ? (
        <ConsultantCreateModal
          onClose={() => setConsultantModalOpen(false)}
          onCreate={async (input) => {
            setSaving(true);
            setError("");
            try {
              if (!operations.createConsultingConsultant) {
                throw new Error("No tienes permiso para administrar consultores.");
              }
              await operations.createConsultingConsultant(input);
              setConsultantModalOpen(false);
              await load();
              setSuccess("El consultor interno quedó disponible para asignar a las solicitudes.");
            } catch (createError) {
              setError(createError instanceof Error ? createError.message : "No se pudo guardar el consultor.");
            } finally {
              setSaving(false);
            }
          }}
        />
      ) : null}
      {coverageModalOpen ? (
        <CoverageCreateModal
          onClose={() => setCoverageModalOpen(false)}
          onCreate={async (input) => {
            setSaving(true);
            setError("");
            try {
              if (!operations.createConsultingLocation) {
                throw new Error("No tienes permiso para administrar cobertura.");
              }
              await operations.createConsultingLocation({
                cityName: input.city_name,
                regionName: input.region_name,
                countryName: input.country_name,
                countryCode: input.country_code,
                timezone: input.timezone,
                currency: input.currency,
              });
              setCoverageModalOpen(false);
              await load();
              setSuccess("La cobertura quedó agregada y lista para configurar su tarifa.");
            } catch (createError) {
              setError(createError instanceof Error ? createError.message : "No se pudo guardar la cobertura.");
            } finally {
              setSaving(false);
            }
          }}
        />
      ) : null}
      {availabilityModalOpen &&
      operations.getConsultingAvailability &&
      operations.updateConsultingAvailability ? (
        <ConsultingAvailabilityModal
          consultants={consultants}
          onClose={() => setAvailabilityModalOpen(false)}
          onLoad={operations.getConsultingAvailability}
          onSave={operations.updateConsultingAvailability}
          onSaved={(availability) => {
            setError("");
            setSuccess(
              `La disponibilidad de ${availability.consultantName} quedó actualizada.`,
            );
          }}
        />
      ) : null}
      {sessionModalOpen ? (
        <SessionCreateModal
          companies={selectableCompanies}
          consultants={consultants}
          locations={allLocations}
          attendingConsultant={attendingConsultant}
          busy={saving}
          submitError={error}
          onClose={() => {
            setSessionModalOpen(false);
            setError("");
          }}
          onCreate={async (input) => {
            setSaving(true);
            setError("");
            try {
              await operations.createConsultingAppointment({
                ...input,
                startAt: new Date(input.startAt).toISOString(),
                consultationMode: input.mode,
              });
              setSessionModalOpen(false);
              await load();
              setSuccess("La sesión quedó registrada, auditada y agregada al calendario.");
            } catch (createError) {
              setError(
                consultingOperationError(
                  createError,
                  "No se pudo guardar la sesión.",
                ),
              );
            } finally {
              setSaving(false);
            }
          }}
        />
      ) : null}
    </div>
  );
}

function AppointmentsTable({
  appointments,
  onOpen,
}: {
  appointments: PlatformConsultingAppointment[];
  onOpen: (appointment: PlatformConsultingAppointment) => void;
}) {
  const { columnWidths, resizeColumn } =
    usePersistentColumnWidths<AppointmentColumnId>({
      defaults: appointmentColumnDefaults,
      headerLabels: appointmentColumnLabels,
      maxWidths: appointmentColumnMaximums,
      minWidths: appointmentColumnMinimums,
      storageKey: "indice-consulting-appointment-column-widths-v1",
    });
  const columns: Array<IndiceTableColumnDefinition<AppointmentColumnId>> = (
    Object.keys(appointmentColumnLabels) as AppointmentColumnId[]
  ).map((columnId) => ({
    id: columnId,
    label: appointmentColumnLabels[columnId],
    width: columnWidths[columnId],
    defaultWidth: appointmentColumnDefaults[columnId],
    contentMinimumWidth: appointmentColumnMinimums[columnId],
    maxWidth: appointmentColumnMaximums[columnId],
    resizeLabel: `Ajustar columna ${appointmentColumnLabels[columnId]}`,
  }));
  const minimumWidth = getIndiceTableMinimumWidth({
    actionsWidth: appointmentActionsWidth,
    columns,
  });

  return (
    <IndiceTableShell>
      <IndiceOperationalTable minimumWidth={minimumWidth}>
        <IndiceTableColGroup
          columns={columns}
          actionsWidth={appointmentActionsWidth}
        />
        <IndiceTableHeaderRow
          actions={{ label: "Acción", width: appointmentActionsWidth }}
          columns={columns}
          onResize={resizeColumn}
          tone="blue"
        />
        <TableBody>
          {appointments.map((appointment) => (
            <TableRow
              key={appointment.id}
              className="h-16 border-slate-100 transition hover:bg-[#59C3A5]/5 dark:border-slate-700"
            >
              <TableCell className="px-4 py-3 text-sm">
                <p className="truncate font-medium text-slate-900 dark:text-white">
                  {appointment.id < 0 ? "Sesión local" : `#${appointment.id}`} ·{" "}
                  {appointment.company_name}
                </p>
                {appointment.id < 0 ? (
                  <span className="mt-1 inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                    Borrador local
                  </span>
                ) : null}
                <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                  Solicitada {formatDateTime(appointment.created_at)}
                </p>
              </TableCell>
              <TableCell className="px-4 py-3 text-sm">
                <p className="truncate font-medium text-slate-800 dark:text-slate-100">
                  {appointment.attendee_name}
                </p>
                <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                  {topicLabel(appointment.topic)}
                </p>
              </TableCell>
              <TableCell className="px-4 py-3 text-sm">
                <a
                  href={`mailto:${appointment.attendee_email}`}
                  className="flex min-w-0 items-center gap-1.5 text-xs text-[#143675] hover:underline dark:text-blue-300"
                >
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{appointment.attendee_email}</span>
                </a>
                {appointment.attendee_phone ? (
                  <a
                    href={`tel:${appointment.attendee_phone}`}
                    className="mt-1 flex items-center gap-1.5 text-xs text-[#177D66] hover:underline dark:text-[#8FE0CA]"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    {appointment.attendee_phone}
                  </a>
                ) : null}
              </TableCell>
              <TableCell className="px-4 py-3 text-sm text-slate-700 dark:text-slate-200">
                {appointment.consultation_mode === "IN_PERSON" ? (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-amber-600" />
                    {appointment.service_location_name ||
                      appointment.country_code}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5">
                    <Monitor className="h-4 w-4 text-blue-600" />
                    Virtual
                  </span>
                )}
              </TableCell>
              <TableCell className="px-4 py-3 text-sm">
                <p className="truncate font-medium text-slate-800 dark:text-slate-100">
                  {formatDateTime(
                    appointment.preferred_start_at,
                    appointment.timezone,
                  )}
                </p>
                {appointment.alternative_start_at ? (
                  <p className="mt-0.5 text-xs text-slate-500">
                    Alt.{" "}
                    {formatDateTime(
                      appointment.alternative_start_at,
                      appointment.timezone,
                    )}
                    </p>
                  ) : null}
              </TableCell>
              <TableCell className="px-4 py-3">
                <Status status={appointment.status} />
              </TableCell>
              <TableCell className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                <p className="truncate">
                  {appointment.consultant_name || "Sin asignar"}
                </p>
                <p className="mt-1 truncate text-[11px] font-normal text-slate-500 dark:text-slate-400">
                  Solicitó: {appointment.consultant_preference === "DISTRIBUTOR"
                    ? appointment.requested_distributor_name || "su distribuidor"
                    : "equipo de Índice"}
                </p>
              </TableCell>
              <TableCell className="px-4 py-3 text-right">
                <button
                  type="button"
                  onClick={() => onOpen(appointment)}
                  className="inline-flex h-9 items-center justify-center rounded-xl border border-[#59C3A5]/30 bg-white px-3 text-xs font-medium text-[#176B5B] transition hover:bg-[#59C3A5]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#59C3A5]/25 dark:bg-slate-900 dark:text-[#8FE0CA]"
                >
                  Administrar
                </button>
              </TableCell>
            </TableRow>
          ))}
          {appointments.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={8}
                className="px-5 py-14 text-center text-sm text-slate-500 dark:text-slate-400"
              >
                <span className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-xl bg-[#59C3A5]/10 text-[#177D66] dark:text-[#8FE0CA]">
                  <CalendarClock className="h-5 w-5" />
                </span>
                <p className="font-medium text-slate-800 dark:text-slate-100">
                  No encontramos solicitudes
                </p>
                <p className="mt-1 text-xs">
                  Ajusta los filtros o registra una nueva sesión.
                </p>
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </IndiceOperationalTable>
    </IndiceTableShell>
  );
}

function EmptyConsultants({
  canManage,
  onCreate,
}: {
  canManage: boolean;
  onCreate: () => void;
}) {
  return (
    <section className="rounded-[24px] border border-dashed border-[#59C3A5]/50 bg-white px-6 py-12 text-center shadow-sm dark:bg-slate-800">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#59C3A5]/10 text-[#177D66] dark:text-[#8FE0CA]">
        <UserRound className="h-6 w-6" />
      </span>
      <h3 className="mt-4 font-medium text-slate-900 dark:text-white">
        Aún no hay distribuidores activos
      </h3>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Activa una cuenta de distribuidor para sincronizarla aquí, o agrega un consultor del equipo Índice.
      </p>
      {canManage ? (
        <button
          type="button"
          onClick={onCreate}
          className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-[#177D66] px-4 text-sm font-medium text-white transition hover:bg-[#126553]"
        >
          <UserPlus className="h-4 w-4" />
          Agregar consultor interno
        </button>
      ) : null}
    </section>
  );
}

function AppointmentDrawer({
  appointment,
  edit,
  consultants,
  saving,
  canManage,
  canManagePayment,
  onEdit,
  onClose,
  onSubmit,
}: {
  appointment: PlatformConsultingAppointment;
  edit: EditState;
  consultants: PlatformConsultingConsultant[];
  saving: boolean;
  canManage: boolean;
  canManagePayment: boolean;
  onEdit: (value: EditState) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
}) {
  const confirmed = edit.status === "CONFIRMED";
  const [step, setStep] = useState(0);
  const assignmentComplete =
    !confirmed ||
    Boolean(
      edit.confirmedStartAt &&
      edit.consultantName,
    );
  const steps = [
    { id: "request", label: "Solicitud" },
    { id: "assignment", label: "Asignación" },
    { id: "confirmation", label: "Costo y confirmación" },
  ] as const;
  const activeStep = steps[step];
  return (
    <IndiceModalFrame
      open
      busy={saving}
      onOpenChange={(open) => !open && onClose()}
      modalType="wizard"
      tone="aqua"
      icon={<CalendarCheck2 className="h-5 w-5" />}
      eyebrow={`Solicitud #${appointment.id}`}
      title={appointment.company_name}
      description={`${appointment.attendee_name} · ${topicLabel(appointment.topic)}`}
      footerLeading={
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="h-11 rounded-xl border border-white/50 bg-transparent px-4 text-sm font-medium text-white transition hover:bg-white/10 disabled:opacity-50"
        >
          Cancelar
        </button>
      }
      footerSummary={`Paso ${step + 1} de ${steps.length} · ${activeStep.label}`}
      footer={
        <>
          {step > 0 ? (
            <button
              type="button"
              onClick={() => setStep((current) => current - 1)}
              disabled={saving}
            >
              Anterior
            </button>
          ) : null}
          {step < steps.length - 1 ? (
            <button
              type="button"
              disabled={step === 1 && !assignmentComplete}
              onClick={() => setStep((current) => current + 1)}
            >
              Siguiente
            </button>
          ) : (
            <button
              type="submit"
              form="consulting-appointment-form"
              disabled={!canManage || saving}
              className="inline-flex min-w-[11rem] items-center justify-center gap-2 whitespace-normal text-center leading-tight"
            >
              {saving ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <CalendarCheck2 className="h-4 w-4" />
              )}
              <span className="text-center leading-tight">
                {saving ? "Guardando…" : "Guardar y notificar"}
              </span>
            </button>
          )}
        </>
      }
    >
      <form
        id="consulting-appointment-form"
        onSubmit={onSubmit}
        className="space-y-5"
      >
        <IndiceModalWizardStepper
          accent="aqua"
          activeStepId={activeStep.id}
          progressLabel="Progreso para administrar la consultoría"
          steps={steps}
          onStepSelect={(stepId) => {
            const nextStep = steps.findIndex((item) => item.id === stepId);
            if (nextStep <= step) setStep(nextStep);
          }}
        />
        <IndiceModalValidation
          tone="warning"
          title="Completa la asignación"
          messages={
            step === 1 && confirmed && !assignmentComplete
              ? ["Para confirmar la sesión necesitas definir fecha, hora y consultor."]
              : []
          }
        />
          {step === 0 ? (
            <>
              <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
                <h3 className="font-medium text-slate-900 dark:text-white">Contacto rápido</h3>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <a
                    href={`mailto:${appointment.attendee_email}`}
                    className="flex min-h-11 items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 text-sm text-[#143675] transition hover:border-blue-300 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300"
                  >
                    <Mail className="h-4 w-4 shrink-0" />
                    <span className="truncate">{appointment.attendee_email}</span>
                  </a>
                  <a
                    href={`tel:${appointment.attendee_phone || ""}`}
                    className="flex min-h-11 items-center gap-2 rounded-xl border border-[#59C3A5]/20 bg-[#59C3A5]/10 px-3 text-sm text-[#177D66] transition hover:border-[#59C3A5]/50 dark:text-[#8FE0CA]"
                  >
                    <Phone className="h-4 w-4" />
                    {appointment.attendee_phone || "Sin teléfono"}
                  </a>
                </div>
                {appointment.notes ? (
                  <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {appointment.notes}
                  </p>
                ) : null}
              </section>
              <IndiceModalSummary
                title="Trazabilidad de la solicitud"
                description="La preferencia orienta la asignación, pero puede cambiarse por petición del cliente sin perder el origen."
                variant="muted"
                columns={2}
                items={[
                  { label: "Empresa", value: `${appointment.company_name} · ID ${appointment.company_id}`, emphasized: true },
                  { label: "Usuario solicitante", value: `${appointment.booked_by_email} · ID ${appointment.booked_by_user_id}` },
                  {
                    label: "Preferencia del cliente",
                    value: appointment.consultant_preference === "DISTRIBUTOR"
                      ? appointment.requested_distributor_name || "Su distribuidor"
                      : "Otro consultor del equipo de Índice",
                  },
                  {
                    label: "Origen",
                    value: appointment.request_source === "CLIENT_PORTAL"
                      ? "Panel de la empresa cliente"
                      : appointment.request_source === "DISTRIBUTOR_PORTAL"
                        ? "Centro de distribuidores"
                        : "Administración de plataforma",
                  },
                ]}
              />
              <IndiceModalSummary
                title="Horario solicitado"
                variant="plain"
                columns={2}
                items={[
                  {
                    label: "Preferido",
                    value: formatDateTime(appointment.preferred_start_at, appointment.timezone),
                    emphasized: true,
                  },
                  {
                    label: "Alternativo",
                    value: formatDateTime(appointment.alternative_start_at, appointment.timezone),
                  },
                  {
                    label: "Modalidad",
                    value: appointment.consultation_mode === "IN_PERSON"
                      ? `Presencial · ${appointment.service_location_name}`
                      : "Virtual",
                  },
                  { label: "Zona horaria", value: appointment.timezone },
                ]}
              />
            </>
          ) : null}
          {step === 1 ? (
            <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
              <h3 className="font-medium text-slate-900 dark:text-white">
                Confirmación y asignación
              </h3>
              <IndiceModalSummary
                title="Preferencia y horario de origen"
                description="Puedes reasignar según disponibilidad o por petición del cliente sin perder la trazabilidad de la solicitud."
                variant="muted"
                columns={2}
                items={[
                  {
                    label: "Preferencia del cliente",
                    value: appointment.consultant_preference === "DISTRIBUTOR"
                      ? appointment.requested_distributor_name || "Su distribuidor"
                      : "Otro consultor del equipo de Índice",
                    emphasized: true,
                  },
                  {
                    label: "Horario solicitado",
                    value: formatDateTime(appointment.preferred_start_at, appointment.timezone),
                  },
                ]}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Estado">
                  <select
                    disabled={!canManage}
                    value={
                      edit.status === "PAYMENT_REQUIRED"
                        ? "REQUESTED"
                        : edit.status
                    }
                    onChange={(event) =>
                      onEdit({
                        ...edit,
                        status: event.target.value as PlatformConsultingStatus,
                      })
                    }
                    className={controlClass}
                  >
                    {statuses.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Fecha y hora definitiva">
                  <input
                    disabled={!canManage}
                    required={confirmed}
                    type="datetime-local"
                    value={edit.confirmedStartAt}
                    onChange={(event) =>
                      onEdit({ ...edit, confirmedStartAt: event.target.value })
                    }
                    className={controlClass}
                  />
                </Field>
                <Field label="Asignar consultor">
                  <select
                    disabled={!canManage}
                    required={confirmed}
                    value={
                      consultants.find(
                        (consultant) =>
                          `${consultant.firstName} ${consultant.lastName}` ===
                            edit.consultantName &&
                          consultant.email === edit.consultantEmail,
                      )?.id || ""
                    }
                    onChange={(event) => {
                      const consultant = consultants.find(
                        (item) => String(item.id) === event.target.value,
                      );
                      onEdit(
                        consultant
                          ? {
                              ...edit,
                              consultantName: `${consultant.firstName} ${consultant.lastName}`,
                              consultantEmail: consultant.email,
                              consultantPhone: consultant.phone,
                            }
                          : {
                              ...edit,
                              consultantName: "",
                              consultantEmail: "",
                              consultantPhone: "",
                            },
                      );
                    }}
                    className={controlClass}
                  >
                    <option value="">Selecciona un consultor</option>
                    {consultants.map((consultant) => (
                      <option key={consultant.id} value={consultant.id}>
                        {consultant.firstName} {consultant.lastName}
                        {consultant.companyName ? ` · ${consultant.companyName}` : ""}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Correo del consultor">
                  <input
                    disabled
                    value={edit.consultantEmail}
                    className={controlClass}
                    placeholder="Se completa al asignar"
                  />
                </Field>
                <Field label="Teléfono del consultor">
                  <input
                    disabled
                    value={edit.consultantPhone}
                    className={controlClass}
                    placeholder="Se completa al asignar"
                  />
                </Field>
                {appointment.consultation_mode === "VIRTUAL" ? (
                  <Field label="Enlace de reunión (opcional)">
                    <input
                      disabled={!canManage || !canManagePayment}
                      type="url"
                      value={edit.meetingUrl}
                      onChange={(event) =>
                        onEdit({ ...edit, meetingUrl: event.target.value })
                      }
                      className={controlClass}
                      placeholder="https://meet..."
                    />
                    {edit.meetingUrl && !isHttpsUrl(edit.meetingUrl) ? (
                      <p className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">
                        Usa un enlace que comience con https://
                      </p>
                    ) : null}
                  </Field>
                ) : null}
              </div>
              {appointment.meeting_url ? (
                <a
                  href={appointment.meeting_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-10 items-center gap-2 rounded-xl px-2 text-sm font-medium text-[#177D66] hover:bg-[#59C3A5]/10 dark:text-[#8FE0CA]"
                >
                  Probar enlace <ExternalLink className="h-4 w-4" />
                </a>
              ) : null}
            </section>
          ) : null}
          {step === 2 ? (
            <>
              <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
                <h3 className="font-medium text-slate-900 dark:text-white">
                  Costo y seguimiento interno
                </h3>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Tipo de consultoría">
                    <select
                      disabled={!canManage || !canManagePayment}
                      value={edit.consultationType}
                      onChange={(event) => {
                        const consultationType = event.target
                          .value as ConsultationType;
                        onEdit({
                          ...edit,
                          consultationType,
                          paymentStatus: paymentStatusForConsultationType(
                            consultationType,
                            edit.paymentStatus,
                          ),
                          amount: String(
                            consultationAmountCents(consultationType) / 100,
                          ),
                          currency: "USD",
                        });
                      }}
                      className={controlClass}
                    >
                      <option value="PAID">De pago</option>
                      <option value="COURTESY">Cortesía</option>
                      <option value="MODULE_IMPLEMENTATION">
                        Implementación de módulo
                      </option>
                    </select>
                  </Field>
                  <Field label="Importe fijo">
                    <input
                      disabled
                      value={edit.amount}
                      className={`${controlClass} font-semibold tabular-nums`}
                      aria-label="Importe fijo en dólares"
                    />
                  </Field>
                  <Field label="Moneda">
                    <input
                      disabled
                      value="USD"
                      className={`${controlClass} font-semibold`}
                      aria-label="Moneda fija"
                    />
                  </Field>
                </div>
                <div className="flex items-start gap-2 rounded-xl border border-[#59C3A5]/35 bg-[#59C3A5]/10 px-3 py-2.5 text-sm text-[#176A59] dark:text-[#8FE0CA]">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>
                    Sólo las consultorías de pago generan un cargo. La tarifa es
                    fija: <strong>USD 79</strong>.
                  </p>
                </div>
                <Field label="Notas internas">
                  <textarea
                    disabled={!canManage}
                    value={edit.internalNotes}
                    onChange={(event) =>
                      onEdit({ ...edit, internalNotes: event.target.value })
                    }
                    className={`${controlClass} min-h-24 resize-y py-2`}
                    placeholder="Coordinación, disponibilidad o acuerdos con el consultor"
                  />
                </Field>
                {edit.status === "CANCELLED" ? (
                  <Field label="Motivo de cancelación">
                    <textarea
                      disabled={!canManage}
                      required
                      value={edit.cancellationReason}
                      onChange={(event) =>
                        onEdit({
                          ...edit,
                          cancellationReason: event.target.value,
                        })
                      }
                      className={`${controlClass} min-h-20 resize-y py-2`}
                    />
                  </Field>
                ) : null}
              </section>
              <IndiceModalSummary
                title="Resumen antes de notificar"
                description="Revisa la información que se conservará en el expediente de la consultoría."
                variant="success"
                columns={2}
                items={[
                  {
                    label: "Estado",
                    value: statuses.find((status) => status.value === edit.status)?.label || edit.status,
                    emphasized: true,
                  },
                  { label: "Consultor", value: edit.consultantName || "Sin asignar" },
                  {
                    label: "Fecha definitiva",
                    value: edit.confirmedStartAt
                      ? formatDateTime(new Date(edit.confirmedStartAt).toISOString())
                      : "Sin confirmar",
                  },
                  {
                    label: "Tipo y costo",
                    value: `${consultationTypeLabel(edit.consultationType)} · ${formatConsultationCost(edit.consultationType)}`,
                  },
                ]}
              />
            </>
          ) : null}
      </form>
    </IndiceModalFrame>
  );
}

function LocationsPanel({
  locations,
  saving,
  canManage,
  onSave,
}: {
  locations: PlatformConsultingLocation[];
  saving: boolean;
  canManage: boolean;
  onSave: (
    location: PlatformConsultingLocation,
    active: boolean,
    fee: string,
  ) => void;
}) {
  return (
    <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700">
        <div>
          <h3 className="font-medium text-slate-900 dark:text-white">Cobertura presencial</h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Activa ciudades y define su costo adicional. Sin importe, la solicitud queda pendiente de cotización.
          </p>
        </div>
        <span className="w-fit rounded-full bg-[#59C3A5]/10 px-3 py-1 text-xs font-medium text-[#176B5B] dark:text-[#8FE0CA]">
          {locations.filter((location) => location.active).length} activas
        </span>
      </div>
      <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
        {locations.map((location) => (
          <LocationCard
            key={location.id}
            location={location}
            saving={saving}
            canManage={canManage}
            onSave={onSave}
          />
        ))}
      </div>
    </section>
  );
}

function LocationCard({
  location,
  saving,
  canManage,
  onSave,
}: {
  location: PlatformConsultingLocation;
  saving: boolean;
  canManage: boolean;
  onSave: (
    location: PlatformConsultingLocation,
    active: boolean,
    fee: string,
  ) => void;
}) {
  const [fee, setFee] = useState(
    location.in_person_fee_cents == null
      ? ""
      : String(location.in_person_fee_cents / 100),
  );
  useEffect(
    () =>
      setFee(
        location.in_person_fee_cents == null
          ? ""
          : String(location.in_person_fee_cents / 100),
      ),
    [location.in_person_fee_cents],
  );
  return (
    <article
      className={`rounded-2xl border p-4 transition ${location.active ? "border-[#59C3A5]/40 bg-[#59C3A5]/5 dark:bg-[#59C3A5]/10" : "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/60"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-slate-900 dark:text-white">{location.city_name}</p>
            {location.id < 0 ? (
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                Borrador local
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {location.region_name} · {location.country_name}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">
            {location.timezone}
          </p>
        </div>
        <button
          type="button"
          disabled={!canManage || saving}
          onClick={() => onSave(location, !location.active, fee)}
          className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${location.active ? "bg-[#59C3A5]/15 text-[#176B5B] dark:text-[#8FE0CA]" : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"}`}
        >
          {location.active ? "Disponible" : "Oculta"}
        </button>
      </div>
      <label className="mt-4 block text-xs font-medium text-slate-600 dark:text-slate-300">
        Costo adicional ({location.currency})
        <input
          disabled={!canManage}
          min="0"
          step="0.01"
          type="number"
          value={fee}
          onChange={(event) => setFee(event.target.value)}
          className={`${controlClass} mt-1`}
          placeholder="Cotización manual"
        />
      </label>
      <button
        type="button"
        disabled={!canManage || saving}
        onClick={() => onSave(location, location.active, fee)}
        className="mt-3 h-10 w-full rounded-xl border border-[#59C3A5]/30 bg-white px-3 text-xs font-medium text-[#176B5B] transition hover:bg-[#59C3A5]/10 disabled:opacity-50 dark:bg-slate-900 dark:text-[#8FE0CA]"
      >
        Guardar tarifa
      </button>
    </article>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  caption,
  tone,
  active,
  onClick,
}: {
  icon: typeof CalendarClock;
  label: string;
  value: number;
  caption: string;
  tone: "amber" | "blue" | "mint" | "slate";
  active: boolean;
  onClick: () => void;
}) {
  const styles = {
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
    blue: "bg-blue-50 text-[#143675] dark:bg-blue-500/10 dark:text-blue-300",
    mint: "bg-[#59C3A5]/10 text-[#177D66] dark:text-[#8FE0CA]",
    slate: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
  };
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`group rounded-2xl border bg-white p-4 text-left shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#59C3A5]/30 dark:bg-slate-800 ${
        active
          ? "border-[#59C3A5] ring-2 ring-[#59C3A5]/15"
          : "border-slate-200 hover:-translate-y-0.5 hover:border-[#59C3A5]/50 hover:shadow-md dark:border-slate-700"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={`grid h-10 w-10 place-items-center rounded-xl ${styles[tone]}`}
        >
          <Icon className="h-5 w-5" />
        </span>
        <span className="text-2xl font-medium tracking-tight text-slate-950 dark:text-white">
          {value}
        </span>
      </div>
      <p className="mt-3 text-sm font-medium text-slate-900 dark:text-white">
        {label}
      </p>
      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
        {caption}
      </p>
    </button>
  );
}
function Status({ status }: { status: PlatformConsultingStatus }) {
  const label = statuses.find((item) => item.value === status)?.label || status;
  const tone =
    status === "CONFIRMED"
      ? "bg-blue-50 text-blue-700"
      : status === "REQUESTED" || status === "PAYMENT_REQUIRED"
        ? "bg-amber-50 text-amber-700"
        : status === "COMPLETED"
          ? "bg-emerald-50 text-emerald-700"
          : "bg-slate-100 text-slate-600";
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${tone}`}
    >
      {label}
    </span>
  );
}
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
      <span>{label}</span>
      {children}
    </label>
  );
}
function consultationTypeFromPaymentStatus(
  value: EditState["paymentStatus"],
): ConsultationType {
  if (value === "WAIVED") return "COURTESY";
  if (value === "INCLUDED") return "MODULE_IMPLEMENTATION";
  return "PAID";
}
function paymentStatusForConsultationType(
  type: ConsultationType,
  current: EditState["paymentStatus"],
): EditState["paymentStatus"] {
  if (type === "COURTESY") return "WAIVED";
  if (type === "MODULE_IMPLEMENTATION") return "INCLUDED";
  return ["QUOTE_PENDING", "PENDING", "PAID", "REFUNDED"].includes(current)
    ? current
    : "PENDING";
}
function consultationAmountCents(type: ConsultationType) {
  return type === "PAID" ? 7_900 : 0;
}
function consultationTypeLabel(type: ConsultationType) {
  return {
    PAID: "De pago",
    COURTESY: "Cortesía",
    MODULE_IMPLEMENTATION: "Implementación de módulo",
  }[type];
}
function formatConsultationCost(type: ConsultationType) {
  return type === "PAID" ? "USD 79.00" : "USD 0.00";
}
function topicLabel(value: string) {
  if (value === "ONBOARDING") return "Implementación inicial de Índice";
  if (value === "BUSINESS_CONSULTING") return "Consultoría de negocios";
  if (value === "OTHER") return "Otro reto de la empresa";
  return value
    .replace(/^MODULE:/, "")
    .replace(/[-_]/g, " ")
    .replace(/^./, (letter) => letter.toUpperCase());
}
function formatDateTime(value?: string | null, timeZone?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timeZone || undefined,
  }).format(date);
}
function toLocalInput(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
function isHttpsUrl(value: string) {
  try {
    return new URL(value.trim()).protocol === "https:";
  } catch {
    return false;
  }
}
function consultingOperationError(error: unknown, fallback: string) {
  if (error instanceof TypeError && /fetch/i.test(error.message)) {
    return "No se pudo conectar con Índice. Verifica que el servidor esté activo y vuelve a intentarlo.";
  }
  return error instanceof Error && error.message ? error.message : fallback;
}
function toEditState(appointment: PlatformConsultingAppointment): EditState {
  const consultationType = consultationTypeFromPaymentStatus(
    appointment.payment_status,
  );
  return {
    status:
      appointment.status === "PAYMENT_REQUIRED"
        ? "REQUESTED"
        : appointment.status,
    confirmedStartAt: toLocalInput(appointment.confirmed_start_at),
    meetingUrl: appointment.meeting_url || "",
    consultantName: appointment.consultant_name || "",
    consultantEmail: appointment.consultant_email || "",
    consultantPhone: appointment.consultant_phone || "",
    internalNotes: appointment.internal_notes || "",
    consultationType,
    paymentStatus: appointment.payment_status,
    amount: String(consultationAmountCents(consultationType) / 100),
    currency: "USD",
    cancellationReason: appointment.cancellation_reason || "",
  };
}
