import { getMeetingPlanningStepsCopy } from "../translations/meetingPlanningStepsCopy";
import { getMeetingLiveCopy } from "../translations/meetingLiveCopy";
import { MeetingAvailability } from "./MeetingAvailability";
import { getAuthorizationRevision } from "../../../api/authSessionStore";
import { useAuthorizationRevision } from "../../../hooks/useAuthorizationRevision";
import { useCallback, useEffect, useId, useRef, useState } from "react";
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
import { getMeetingOperationsCopy } from "../translations/meetingOperationsCopy";
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
  suggestedDate,
  onClose,
  onSaved,
  onPlanned,
}: {
  copy: MeetingCopy;
  userId: number;
  administrator: boolean;
  initial?: MeetingDetail;
  suggestedDate?: string;
  onClose: () => void;
  onSaved: () => void;
  onPlanned?: (result: PlanResult) => void;
}) {
  const { currentLanguage } = useLanguage();
  const w = getMeetingWorkflowCopy(currentLanguage.code);
  const labels = getMeetingPlanningStepsCopy(currentLanguage.code);
  const live = getMeetingLiveCopy(currentLanguage.code);
  const op = getMeetingOperationsCopy(currentLanguage.code);
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
    const d = initialPlanning(userId, suggestedDate);
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
  const [guided, setGuided] = useState(!initial),
    [seriesMode, setSeriesMode] = useState(false),
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
    key = useRef({ body: "", key: "" }),
    pending = useRef(false);
  const formId = useId();
  const authorization = useAuthorizationRevision(), openedAuthorization = useRef(authorization);
  useEffect(() => { if (authorization !== openedAuthorization.current) onClose(); }, [authorization]);
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const scheduleStep = initial ? 1 : 2, reviewStep = initial ? 2 : 3;
  const stepLabels = initial ? [w.peopleStep, w.scheduleStep, w.reviewStep]
    : [labels.purposeStep, labels.teamStep, labels.scheduleStep, labels.reviewStep];
  const stepHints = [labels.purposeHint, labels.teamHint, labels.scheduleHint, labels.reviewHint];
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
    if (!busy && !pending.current) {
      if (dirty) setDiscard(true);
      else onClose();
    }
  };
  const go = (value: number) => {
    setStep(value);
    setError("");
    bodyRef.current?.scrollTo({ top: 0 });
    requestAnimationFrame(() =>
      (formRef.current?.querySelector<HTMLElement>("input,select,textarea") ?? formRef.current)
        ?.focus({ preventScroll: true }),
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
    if (busy || pending.current || !directory.data || !formRef.current?.reportValidity()) return;
    if (!initial && step === 0) {
      if (!form.title.trim() || !form.objective.trim() || !form.expectedResult.trim()) {
        setError(w.required);
        return;
      }
      go(1);
      return;
    }
    if (!checkPeople()) return;
    if (step < scheduleStep) {
      go(step + 1);
      return;
    }
    if (openedAuthorization.current !== getAuthorizationRevision()) return;
    pending.current = true;
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
      if (openedAuthorization.current !== getAuthorizationRevision()) return;
      setPreview(result);
      go(reviewStep);
    } catch (e) {
      if (openedAuthorization.current !== getAuthorizationRevision()) return;
      setError(planningError(e, w, w.previewError, op.appointmentConflict));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  const submit = async () => {
    if (
      busy || pending.current ||
      (guided && (step !== reviewStep || !preview)) ||
      !directory.data ||
      !formRef.current?.reportValidity() ||
      !checkPeople()
    )
      return;
    if (openedAuthorization.current !== getAuthorizationRevision()) return;
    pending.current = true;
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
            go(reviewStep);
            return;
          }
          await meetingApi.editFuture(
            initial.meeting.id,
            body.meeting,
            initial.planning!.seriesVersion,
          );
        } else await meetingApi.edit(initial.meeting.id, body.meeting);
        if (openedAuthorization.current === getAuthorizationRevision()) onSaved();
        return;
      }
      let checked = preview;
      if (!checked) {
        checked = await meetingApi.preview(body);
        setPreview(checked);
      }
      if (openedAuthorization.current !== getAuthorizationRevision()) return;
      if (
        checked.occurrences.some((o) => o.conflicts > 0) &&
        !form.allowConflicts
      ) {
        setGuided(true);
        go(reviewStep);
        return;
      }
      const value = JSON.stringify(body);
      if (key.current.body !== value)
        key.current = { body: value, key: crypto.randomUUID() };
      const result = await meetingApi.plan(body, key.current.key);
      if (openedAuthorization.current !== getAuthorizationRevision()) return;
      if (onPlanned) onPlanned(result);
      else onSaved();
    } catch (e) {
      if (openedAuthorization.current !== getAuthorizationRevision()) return;
      setError(
        planningError(
          e,
          w,
          e instanceof ApiClientError && e.status === 409
            ? copy.conflict
            : copy.error,
          op.appointmentConflict,
        ),
      );
    } finally {
      pending.current = false;
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
            step === reviewStep &&
            (!preview ||
              (preview.occurrences.some((o) => o.conflicts > 0) &&
                (Boolean(initial && future) || !form.allowConflicts))))
        }
        type={guided && step < reviewStep ? "button" : "submit"}
        form={formId}
        onClick={guided && step < reviewStep ? () => void next() : undefined}
      >
        {busy
          ? copy.loading
          : guided && step < scheduleStep
            ? w.next
            : guided && step === scheduleStep
              ? initial ? w.review : labels.reviewAction
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
      contentClassName="max-h-[calc(100dvh-1rem)]"
      icon={guided && !discard ? ["🎯", "👥", "📅", "✅"][initial ? Math.min(step + 1, 3) : step] : "📝"}
      title={discard ? copy.discard : initial ? copy.edit : copy.newMeeting}
      description={
        discard
          ? copy.subtitle
          : guided
            ? initial ? stepLabels[step] : stepHints[step]
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
          ? `${step + 1} / ${stepLabels.length} · ${stepLabels[step]}`
          : undefined
      }
    >
      {!discard && (
        <form
          id={formId}
          ref={formRef}
          tabIndex={-1}
          className="space-y-6 focus:outline-none"
          onSubmit={(e) => {
            e.preventDefault();
            if (guided && step < reviewStep) void next();
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
                steps={stepLabels.map((label, index) => ({ id: String(index), label }))}
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
                    aria-pressed={seriesMode === m.value}
                    onClick={() => {
                      setSeriesMode(m.value);
                      setDirty(true);
                      setPreview(undefined);
                      if (!m.value)
                        update({ recurring: false, saveFlow: false });
                    }}
                    className={`rounded-2xl border p-4 text-left focus-visible:ring-2 focus-visible:ring-blue-600 ${seriesMode === m.value ? "border-blue-400 bg-blue-50 dark:bg-blue-950" : "border-slate-200 dark:border-slate-700"}`}
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
            {initial?.participants.some(p => !directory.data?.items.some(m => m.id === p.id)) && <Feedback error>{live.leaveHint}</Feedback>}
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
                {seriesMode && step === 0 && !initial && (
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
                {(!guided || step < scheduleStep) && (
                  <PurposePeople
                    key={guided && !initial ? step : "all"}
                    part={guided && !initial ? step === 0 ? "purpose" : "team" : "all"}
                    form={form}
                    update={update}
                    copy={copy}
                    w={w}
                    members={[...(directory.data?.items ?? []), ...(initial?.participants.filter(p => !directory.data?.items.some(m => m.id === p.id)) ?? [])]}
                    administrator={administrator}
                    userId={userId}
                  />
                )}
                {(!guided || step === scheduleStep) && (
                  <>
                    <ScheduleSetup
                      form={form}
                      update={update}
                      copy={copy}
                      w={w}
                      guided={seriesMode && !initial}
                      zone={zone}
                    />
                    <MeetingAvailability form={form} zone={zone} locale={currentLanguage.code} copy={copy} meetingId={initial?.meeting.id} update={update} />
                    <p className="text-xs leading-5 text-slate-500 dark:text-slate-300">{live.reminderHint}</p>
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
                {guided && step === reviewStep && preview && (
                  <PlanReview
                    form={form}
                    update={update}
                    preview={preview}
                    copy={copy}
                    w={w}
                    members={[...(directory.data?.items ?? []), ...(initial?.participants.filter(p => !directory.data?.items.some(m => m.id === p.id)) ?? [])]}
                    locale={currentLanguage.code}
                    editing={Boolean(initial)}
                    allowSaveFlow={seriesMode}
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
