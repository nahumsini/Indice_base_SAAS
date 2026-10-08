import { useCallback, useId, useRef, useState } from "react";
import {
  IndiceModalFrame,
  IndiceModalWizardStepper,
  IndiceModalValidation,
} from "../../../components/indice-modal";
import { useLanguage } from "../../../shared/context";
import { ApiClientError } from "../../../lib/apiClient";
import {
  meetingApi,
  type MeetingDetail,
  type PlanPreview,
  type PlanResult,
} from "../services/meetingApi";
import type { MeetingCopy } from "../translations/meetingCopy";
import { getMeetingWorkflowCopy } from "../translations/meetingWorkflowCopy";
import {
  initialPlanning,
  planningRequest,
  planningError,
  dateTimeInput,
  type PlanningDraft,
} from "../utils/meetingPlanning";
import {
  Action,
  Field,
  control,
  Feedback,
  useMeetingQuery,
} from "./MeetingPrimitives";
import {
  PurposePeople,
  ScheduleSetup,
  PlanReview,
} from "./MeetingPlanningForm";

export function MeetingPlanningModal({
  copy,
  userId,
  administrator,
  initial,
  onClose,
  onSaved,
  onPlanned,
}: {
  copy: MeetingCopy;
  userId: number;
  administrator: boolean;
  initial?: MeetingDetail;
  onClose: () => void;
  onSaved: () => void;
  onPlanned?: (result: PlanResult) => void;
}) {
  const { currentLanguage } = useLanguage();
  const w = getMeetingWorkflowCopy(currentLanguage.code);
  const directory = useMeetingQuery(
    useCallback((signal) => meetingApi.members(signal), []),
  );
  const flows = useMeetingQuery(
    useCallback(
      (signal) => (initial ? Promise.resolve([]) : meetingApi.flows(signal)),
      [Boolean(initial)],
    ),
  );
  const [form, setForm] = useState<PlanningDraft>(() => {
    const d = initialPlanning(userId);
    if (!initial) return d;
    return {
      ...d,
      title: initial.meeting.title,
      meetingType: initial.meeting.meetingType,
      objective: initial.planning?.objective ?? "",
      expectedResult: initial.planning?.expectedResult ?? "",
      ownerId: initial.meeting.ownerId,
      minutesOwnerId:
        initial.planning?.minutesOwner.id ?? initial.meeting.ownerId,
      participantIds: initial.participants.map((p) => p.id),
      agenda: initial.agenda,
      location: initial.location,
      start: dateTimeInput(new Date(initial.meeting.startAt)),
      duration: Math.round(
        (Date.parse(initial.meeting.endAt) -
          Date.parse(initial.meeting.startAt)) /
          60000,
      ),
      reminderMinutes: initial.planning?.reminderMinutes ?? 0,
    };
  });
  const [guided, setGuided] = useState(false),
    [step, setStep] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [dirty, setDirty] = useState(false),
    [discard, setDiscard] = useState(false),
    [preview, setPreview] = useState<PlanPreview>(),
    [flowId, setFlowId] = useState(""),
    [future, setFuture] = useState(false);
  const formRef = useRef<HTMLFormElement>(null),
    bodyRef = useRef<HTMLDivElement>(null),
    key = useRef({ body: "", key: "" });
  const formId = useId();
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const update = (patch: Partial<PlanningDraft>) => {
    setForm((f) => ({
      ...f,
      ...patch,
      ...(!("allowConflicts" in patch) &&
      !("saveFlow" in patch) &&
      !("flowName" in patch)
        ? { allowConflicts: false }
        : {}),
    }));
    setDirty(true);
    setError("");
    if (
      !("allowConflicts" in patch) &&
      !("saveFlow" in patch) &&
      !("flowName" in patch)
    )
      setPreview(undefined);
  };
  const close = () => {
    if (!busy) {
      if (dirty) setDiscard(true);
      else onClose();
    }
  };
  const go = (value: number) => {
    setStep(value);
    setError("");
    bodyRef.current?.scrollTo({ top: 0 });
    requestAnimationFrame(() =>
      formRef.current
        ?.querySelector<HTMLElement>("input,select,textarea")
        ?.focus(),
    );
  };
  const checkPeople = () => {
    const ids = new Set(directory.data?.items.map((m) => m.id));
    if (
      !ids.has(form.ownerId) ||
      !ids.has(form.minutesOwnerId) ||
      form.participantIds.some((id) => !ids.has(id)) ||
      (form.minutesOwnerId !== form.ownerId &&
        !form.participantIds.includes(form.minutesOwnerId))
    ) {
      setError(w.peopleInvalid);
      return false;
    }
    if (
      !initial &&
      (!form.title.trim() ||
        !form.objective.trim() ||
        !form.expectedResult.trim())
    ) {
      setError(w.required);
      return false;
    }
    return true;
  };
  const next = async () => {
    if (!formRef.current?.reportValidity() || !checkPeople()) return;
    if (step === 0) {
      go(1);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const body = planningRequest(form, zone);
      body.meeting.expectedVersion = initial?.meeting.version;
      const result =
        initial && future
          ? await meetingApi.previewFuture(
              initial.meeting.id,
              body.meeting,
              initial.planning!.seriesVersion,
            )
          : await meetingApi.preview(body);
      setPreview(result);
      go(2);
    } catch (e) {
      setError(planningError(e, w, w.previewError));
    } finally {
      setBusy(false);
    }
  };
  const submit = async () => {
    if (
      busy ||
      !directory.data ||
      !formRef.current?.reportValidity() ||
      !checkPeople()
    )
      return;
    setBusy(true);
    setError("");
    try {
      const body = planningRequest(form, zone);
      body.meeting.expectedVersion = initial?.meeting.version;
      if (initial) {
        if (future) {
          if (!preview) {
            setPreview(
              await meetingApi.previewFuture(
                initial.meeting.id,
                body.meeting,
                initial.planning!.seriesVersion,
              ),
            );
            setGuided(true);
            go(2);
            return;
          }
          await meetingApi.editFuture(
            initial.meeting.id,
            body.meeting,
            initial.planning!.seriesVersion,
          );
        } else await meetingApi.edit(initial.meeting.id, body.meeting);
        onSaved();
        return;
      }
      let checked = preview;
      if (!checked) {
        checked = await meetingApi.preview(body);
        setPreview(checked);
      }
      if (
        checked.occurrences.some((o) => o.conflicts > 0) &&
        !form.allowConflicts
      ) {
        setGuided(true);
        go(2);
        return;
      }
      const value = JSON.stringify(body);
      if (key.current.body !== value)
        key.current = { body: value, key: crypto.randomUUID() };
      const result = await meetingApi.plan(body, key.current.key);
      if (onPlanned) onPlanned(result);
      else onSaved();
    } catch (e) {
      setError(
        planningError(
          e,
          w,
          e instanceof ApiClientError && e.status === 409
            ? copy.conflict
            : copy.error,
        ),
      );
    } finally {
      setBusy(false);
    }
  };
  const chooseFlow = (value: string) => {
    setFlowId(value);
    if (!value) {
      const defaults = initialPlanning(userId);
      update({ ...defaults, start: form.start });
      return;
    }
    const selected = flows.data?.find((f) => f.id === Number(value));
    if (!selected) return;
    const s = selected.settings;
    update({
      ...s,
      ownerId: administrator ? s.ownerId : userId,
      duration: s.durationMinutes,
      minutesOwnerId: s.minutesOwnerId ?? s.ownerId,
      participantIds: s.participantIds,
      reminderMinutes: s.reminderMinutes ?? 0,
    });
    const ids = new Set(directory.data?.items.map((m) => m.id));
    if (
      ![s.ownerId, s.minutesOwnerId, ...s.participantIds].every((id) =>
        ids.has(id),
      )
    )
      setError(w.flowUnavailable);
  };
  const ready = Boolean(directory.data && !directory.error);
  const actions = discard ? (
    <>
      <Action onClick={() => setDiscard(false)}>{copy.keepEditing}</Action>
      <Action data-modal-destructive onClick={onClose}>
        {copy.close}
      </Action>
    </>
  ) : (
    <>
      {guided && step > 0 && (
        <Action disabled={busy} onClick={() => go(step - 1)}>
          {w.back}
        </Action>
      )}
      <Action
        primary
        disabled={
          busy ||
          !ready ||
          (guided &&
            step === 2 &&
            (!preview ||
              (preview.occurrences.some((o) => o.conflicts > 0) &&
                (Boolean(initial && future) || !form.allowConflicts))))
        }
        type={guided && step < 2 ? "button" : "submit"}
        form={formId}
        onClick={guided && step < 2 ? () => void next() : undefined}
      >
        {busy
          ? copy.loading
          : guided && step === 0
            ? w.next
            : guided && step === 1
              ? w.review
              : initial
                ? copy.save
                : form.recurring
                  ? w.scheduleSeries
                  : w.scheduleMeeting}
      </Action>
    </>
  );
  return (
    <IndiceModalFrame
      open
      busy={busy}
      tone="blue"
      modalType={discard ? "confirmation" : guided ? "wizard" : "standard-form"}
      bodyRef={bodyRef}
      icon="📝"
      title={discard ? copy.discard : initial ? copy.edit : copy.newMeeting}
      description={
        discard
          ? copy.subtitle
          : guided
            ? [w.peopleStep, w.scheduleStep, w.reviewStep][step]
            : w.quickHint
      }
      closeLabel={copy.close}
      onOpenChange={(open) => {
        if (!open) close();
      }}
      footer={actions}
      footerLeading={
        !discard && (
          <Action disabled={busy} onClick={close}>
            {copy.cancel}
          </Action>
        )
      }
      footerSummary={
        !discard && guided
          ? `${step + 1} / 3 · ${form.title || copy.newMeeting}`
          : undefined
      }
    >
      {!discard && (
        <form
          id={formId}
          ref={formRef}
          className="space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            if (guided && step < 2) void next();
            else void submit();
          }}
        >
          <fieldset disabled={busy} className="min-w-0 space-y-6">
            {guided && (
              <IndiceModalWizardStepper
                accent="blue"
                activeStepId={String(step)}
                progressLabel={w.progress}
                density="compact"
                steps={[
                  { id: "0", label: w.peopleStep },
                  { id: "1", label: w.scheduleStep },
                  { id: "2", label: w.reviewStep },
                ]}
              />
            )}
            {!initial && step === 0 && (
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  {
                    value: false,
                    label: w.quick,
                    hint: w.quickHint,
                    icon: "📅",
                  },
                  {
                    value: true,
                    label: w.guided,
                    hint: w.guidedHint,
                    icon: "🔁",
                  },
                ].map((m) => (
                  <button
                    type="button"
                    key={m.label}
                    aria-pressed={guided === m.value}
                    onClick={() => {
                      setGuided(m.value);
                      if (!m.value)
                        update({ recurring: false, saveFlow: false });
                    }}
                    className={`rounded-2xl border p-4 text-left focus-visible:ring-2 focus-visible:ring-blue-600 ${guided === m.value ? "border-blue-400 bg-blue-50 dark:bg-blue-950" : "border-slate-200 dark:border-slate-700"}`}
                  >
                    <span aria-hidden className="text-xl">
                      {m.icon}
                    </span>
                    <span className="mt-2 block text-sm font-medium">
                      {m.label}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-300">
                      {m.hint}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {error && <IndiceModalValidation messages={[error]} />}
            {directory.loading ? (
              <Feedback>{copy.loading}</Feedback>
            ) : directory.error ? (
              <Feedback error>{copy.error}</Feedback>
            ) : (
              <>
                {directory.data &&
                  directory.data.total > directory.data.items.length && (
                    <Feedback>{copy.partial}</Feedback>
                  )}
                {guided && step === 0 && !initial && (
                  <div className="space-y-2">
                    <Field label={w.chooseFlow}>
                      <select
                        className={control}
                        value={flowId}
                        disabled={flows.loading || flows.error}
                        onChange={(e) => chooseFlow(e.target.value)}
                      >
                        <option value="">{w.fromScratch}</option>
                        {flows.data?.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <p className="text-xs leading-5 text-slate-500 dark:text-slate-300">
                      {w.flowHint}
                    </p>
                    {flows.error && <Feedback error>{copy.error}</Feedback>}
                  </div>
                )}
                {(!guided || step === 0) && (
                  <PurposePeople
                    form={form}
                    update={update}
                    copy={copy}
                    w={w}
                    members={directory.data?.items ?? []}
                    administrator={administrator}
                    userId={userId}
                  />
                )}
                {(!guided || step === 1) && (
                  <>
                    <ScheduleSetup
                      form={form}
                      update={update}
                      copy={copy}
                      w={w}
                      guided={guided && !initial}
                      zone={zone}
                    />
                    {initial?.planning?.seriesId &&
                      Date.parse(initial.meeting.startAt) > Date.now() && (
                        <div className="space-y-2">
                          <Field label={w.scope}>
                            <select
                              className={control}
                              value={future ? "future" : "one"}
                              onChange={(e) => {
                                setFuture(e.target.value === "future");
                                setGuided(e.target.value === "future");
                                setPreview(undefined);
                                setDirty(true);
                              }}
                            >
                              <option value="one">{w.thisMeeting}</option>
                              <option value="future">{w.thisAndFuture}</option>
                            </select>
                          </Field>
                          <p className="text-xs leading-5 text-slate-500 dark:text-slate-300">
                            {w.futureHint}
                          </p>
                        </div>
                      )}
                  </>
                )}
                {guided && step === 2 && preview && (
                  <PlanReview
                    form={form}
                    update={update}
                    preview={preview}
                    copy={copy}
                    w={w}
                    members={directory.data?.items ?? []}
                    locale={currentLanguage.code}
                    editing={Boolean(initial)}
                  />
                )}
              </>
            )}
          </fieldset>
        </form>
      )}
    </IndiceModalFrame>
  );
}
