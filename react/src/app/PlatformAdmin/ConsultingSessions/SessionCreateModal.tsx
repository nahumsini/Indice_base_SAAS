import {
  useConsultingCopy,
  consultingText,
  consultingNumber,
  type ConsultingCopy,
} from "../ConsultingTranslations";
import { useRef, useState, type FormEvent } from "react";
import { CalendarPlus, CheckCircle2 } from "lucide-react";
import type {
  PlatformConsultingLocation,
} from "../../api/platformAdmin";
import {
  IndiceModalFrame,
  IndiceModalValidation,
  IndiceModalWizardStepper,
} from "../../components/indice-modal";
import type { Consultant } from "../Consultants";
import { countryOption, countryOptions } from "../flowOptions";
import type { SessionInput } from "./types";

const controlClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 disabled:bg-slate-100 disabled:text-slate-500";
type SessionStep = "customer" | "schedule" | "assignment";
const getDefaultSteps = (copy: ConsultingCopy) => [
  { id: "customer", label: copy.client },
  { id: "schedule", label: copy.schedule },
  { id: "assignment", label: copy.assignment },
] as const;

export interface ConsultingCompanyOption {
  id: number;
  name: string;
  owner_email?: string | null;
  country_code?: string | null;
}

export function SessionCreateModal({
  companies,
  consultants,
  locations,
  attendingConsultant,
  busy = false,
  submitError = "",
  onClose,
  onCreate,
}: {
  companies: ConsultingCompanyOption[];
  consultants: Consultant[];
  locations: PlatformConsultingLocation[];
  attendingConsultant?: { name: string };
  busy?: boolean;
  submitError?: string;
  onClose: () => void;
  onCreate: (input: SessionInput) => void;
}) {
  const { copy, locale } = useConsultingCopy();
  const defaultSteps = getDefaultSteps(copy);
  const steps = attendingConsultant
    ? defaultSteps.map((item) =>
        item.id === "assignment" ? { ...item, label: copy.confirmation } : item,
      )
    : defaultSteps;
  const [step, setStep] = useState<SessionStep>("customer");
  const [error, setError] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const [value, setValue] = useState<SessionInput>({
    companyId: 0,
    companyName: "",
    attendeeName: "",
    attendeeEmail: "",
    attendeePhone: "",
    topic: "BUSINESS_CONSULTING",
    mode: "VIRTUAL",
    startAt: "",
    timezone: "America/Mexico_City",
    durationMinutes: 60,
    consultantName: attendingConsultant?.name || "",
    consultantEmail: "",
    consultantPhone: "",
    meetingUrl: "",
    serviceLocationCode: "",
    serviceLocationName: "",
    countryCode: "",
  });
  const stepIndex = steps.findIndex((item) => item.id === step);

  const advance = () => {
    if (!formRef.current?.reportValidity()) return;
    if (step === "schedule" && new Date(value.startAt) <= new Date()) {
      setError(copy.futureTimeError);
      return;
    }
    setError("");
    setStep(steps[Math.min(stepIndex + 1, steps.length - 1)].id);
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (!formRef.current?.reportValidity()) return;
    onCreate(value);
  };
  const selectedLocation = locations.find(
    (location) => location.location_code === value.serviceLocationCode,
  );
  const canSubmit = Boolean(
    value.companyId &&
      value.attendeeName.trim() &&
      value.attendeeEmail.trim() &&
      value.startAt &&
      (attendingConsultant || value.consultantEmail) &&
      (value.mode === "VIRTUAL" || value.serviceLocationCode),
  );

  return (
    <IndiceModalFrame
      open
      busy={busy}
      onOpenChange={(open) => !open && onClose()}
      modalType="wizard"
      tone="blue"
      icon={<CalendarPlus className="h-5 w-5" />}
      eyebrow={copy.operations}
      title={copy.addSession}
      description={copy.createSessionHelp}
      footerSummary={consultingText(copy.stepProgress, { step: consultingNumber(stepIndex + 1, locale), total: consultingNumber(steps.length, locale) })}
      footer={
        <>
          <button
            type="button"
            onClick={() =>
              stepIndex === 0 ? onClose() : setStep(steps[stepIndex - 1].id)
            }
          >
            {stepIndex === 0 ? copy.cancel : copy.previous}
          </button>
          {step === "assignment" ? (
            <button
              type="submit"
              form="session-create-form"
              disabled={!canSubmit || busy}
            >
              {busy ? copy.adding : copy.addSession}
            </button>
          ) : (
            <button type="button" onClick={advance}>
              {copy.next}
            </button>
          )}
        </>
      }
    >
      <form
        ref={formRef}
        id="session-create-form"
        onSubmit={submit}
        className="space-y-5"
      >
        <IndiceModalWizardStepper
          activeStepId={step}
          accent="blue"
          progressLabel={copy.createProgress}
          steps={steps}
        />
        <IndiceModalValidation
          messages={[error, submitError].filter(Boolean)}
        />

        {step === "customer" ? (
          <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label={copy.clientAccount}>
                <select
                  autoFocus
                  required
                  value={value.companyId || ""}
                  onChange={(event) => {
                    const company = companies.find(
                      (item) => item.id === Number(event.target.value),
                    );
                    const country = countryOption(
                      company?.country_code || "MX",
                    );
                    setValue({
                      ...value,
                      companyId: company?.id || 0,
                      companyName: company?.name || "",
                      attendeeEmail: company?.owner_email || "",
                      timezone: country?.timezones[0] || value.timezone,
                    });
                  }}
                  className={controlClass}
                >
                  <option value="">{copy.selectAccount}
            </option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name} ·{" "}
                      {company.owner_email || copy.noOwner}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label={copy.attendeeName}>
              <input
                required
                value={value.attendeeName}
                onChange={(event) =>
                  setValue({ ...value, attendeeName: event.target.value })
                }
                className={controlClass}
              />
            </Field>
            <Field label={copy.email}>
              <input
                required
                type="email"
                value={value.attendeeEmail}
                onChange={(event) =>
                  setValue({ ...value, attendeeEmail: event.target.value })
                }
                className={controlClass}
              />
            </Field>
            <Field label={copy.optionalPhone}>
              <input
                type="tel"
                value={value.attendeePhone}
                onChange={(event) =>
                  setValue({ ...value, attendeePhone: event.target.value })
                }
                className={controlClass}
              />
            </Field>
          </section>
        ) : null}

        {step === "schedule" ? (
          <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-2">
            <Field label={copy.topic}>
              <select
                value={value.topic}
                onChange={(event) =>
                  setValue({ ...value, topic: event.target.value })
                }
                className={controlClass}
              >
                <option value="BUSINESS_CONSULTING">
                  {copy.businessConsulting}
            </option>
                <option value="ONBOARDING">{copy.onboarding}
            </option>
                <option value="OTHER">{copy.other}
            </option>
              </select>
            </Field>
            <Field label={copy.mode}>
              <select
                value={value.mode}
                onChange={(event) =>
                  setValue({
                    ...value,
                    mode: event.target.value as SessionInput["mode"],
                    meetingUrl: "",
                    serviceLocationCode: "",
                    serviceLocationName: "",
                    countryCode: "",
                  })
                }
                className={controlClass}
              >
                <option value="VIRTUAL">{copy.virtual}
            </option>
                <option value="IN_PERSON">{copy.inPerson}
            </option>
              </select>
            </Field>
            <Field label={copy.dateTime}>
              <input
                required
                type="datetime-local"
                value={value.startAt}
                onChange={(event) =>
                  setValue({ ...value, startAt: event.target.value })
                }
                className={controlClass}
              />
            </Field>
            {value.mode === "VIRTUAL" ? (
              <Field label={copy.timezone}>
                <select
                  value={value.timezone}
                  onChange={(event) =>
                    setValue({ ...value, timezone: event.target.value })
                  }
                  className={controlClass}
                >
                  {countryOptions.flatMap((country) =>
                    country.timezones.map((timezone) => (
                      <option key={timezone} value={timezone}>
                        {timezone}
                      </option>
                    )),
                  )}
                </select>
              </Field>
            ) : (
              <Field label={copy.coverage}>
                <select
                  required
                  value={value.serviceLocationCode}
                  onChange={(event) => {
                    const location = locations.find(
                      (item) => item.location_code === event.target.value,
                    );
                    setValue({
                      ...value,
                      serviceLocationCode: location?.location_code || "",
                      serviceLocationName: location?.city_name || "",
                      countryCode: location?.country_code || "",
                      timezone: location?.timezone || value.timezone,
                    });
                  }}
                  className={controlClass}
                >
                  <option value="">{copy.selectCity}
            </option>
                  {locations
                    .filter((location) => location.active)
                    .map((location) => (
                      <option key={location.id} value={location.location_code}>
                        {location.city_name} · {location.country_name}
                      </option>
                    ))}
                </select>
              </Field>
            )}
          </section>
        ) : null}

        {step === "assignment" ? (
          <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={copy.duration}>
                <select
                  value={value.durationMinutes}
                  onChange={(event) =>
                    setValue({
                      ...value,
                      durationMinutes: Number(event.target.value),
                    })
                  }
                  className={controlClass}
                >
                  <option value={30}>{consultingText(copy.minutes, { count: consultingNumber(30, locale) })}</option>
                  <option value={60}>{consultingText(copy.minutes, { count: consultingNumber(60, locale) })}</option>
                  <option value={90}>{consultingText(copy.minutes, { count: consultingNumber(90, locale) })}</option>
                </select>
              </Field>
              {attendingConsultant ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#177D66]">
                    {copy.attendingConsultant}
            </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {attendingConsultant.name}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-600">
                    {copy.autoAssignmentHelp}
            </p>
                </div>
              ) : (
                <Field label={copy.consultant}>
                  <select
                    required
                    value={value.consultantEmail}
                    onChange={(event) => {
                      const consultant = consultants.find(
                        (item) => item.email === event.target.value,
                      );
                      setValue({
                        ...value,
                        consultantName: consultant
                          ? `${consultant.firstName} ${consultant.lastName}`
                          : "",
                        consultantEmail: consultant?.email || "",
                        consultantPhone: consultant?.phone || "",
                      });
                    }}
                    className={controlClass}
                  >
                    <option value="">{copy.selectConsultant}
            </option>
                    {consultants.map((consultant) => (
                      <option key={consultant.id} value={consultant.email}>
                        {consultant.firstName} {consultant.lastName}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
            </div>
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-[#143675]">
              <div className="flex items-center gap-2 font-semibold">
                <CheckCircle2 className="h-4 w-4" /> {copy.sessionReady}
            </div>
              <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                <Summary label={copy.account} value={value.companyName} />
                <Summary
                  label={attendingConsultant ? copy.responsible : copy.consultant}
                  value={
                    attendingConsultant?.name || value.consultantName
                  }
                />
                <Summary
                  label={copy.mode}
                  value={
                    value.mode === "VIRTUAL"
                      ? copy.virtual
                      : `${copy.inPerson} · ${selectedLocation?.city_name || value.serviceLocationName}`
                  }
                />
                <Summary
                  label={copy.duration}
                  value={consultingText(copy.minutes, { count: consultingNumber(value.durationMinutes, locale) })}
                />
              </dl>
            </div>
          </section>
        ) : null}
      </form>
    </IndiceModalFrame>
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
    <label className="block space-y-2 text-sm font-medium text-slate-700">
      <span>{label}</span>
      {children}
    </label>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-0.5 font-medium text-slate-800">{value || "—"}</dd>
    </div>
  );
}
