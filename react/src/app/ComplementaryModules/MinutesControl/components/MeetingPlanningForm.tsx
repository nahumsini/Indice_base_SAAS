import { useState, type ReactNode } from "react";
import {
  IndiceModalSummary,
  IndiceModalValidation,
} from "../../../components/indice-modal";
import type { Member, PlanPreview } from "../services/meetingApi";
import type { MeetingCopy } from "../translations/meetingCopy";
import type { MeetingWorkflowCopy } from "../translations/meetingWorkflowCopy";
import type { PlanningDraft } from "../utils/meetingPlanning";
import { Field, control } from "./MeetingPrimitives";

export function PlanningSection({
  icon,
  title,
  hint,
  children,
}: {
  icon: string;
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-lg dark:bg-blue-950"
        >
          {icon}
        </span>
        <div>
          <h3 className="text-sm font-medium">{title}</h3>
          {hint && (
            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-300">
              {hint}
            </p>
          )}
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
type Props = {
  form: PlanningDraft;
  update: (patch: Partial<PlanningDraft>) => void;
  copy: MeetingCopy;
  w: MeetingWorkflowCopy;
  members: Member[];
  administrator: boolean;
  userId: number;
};
export function PurposePeople({
  form,
  update,
  copy,
  w,
  members,
  administrator,
  userId,
}: Props) {
  const [search, setSearch] = useState("");
  return (
    <div className="space-y-6">
      <PlanningSection icon="🎯" title={w.peopleStep} hint={w.validationHint}>
        <Field label={copy.name + " *"}>
          <input
            className={control}
            required
            maxLength={180}
            value={form.title}
            onChange={(e) => update({ title: e.target.value })}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={w.purpose + " *"}>
            <textarea
              className={control + " h-24 py-3"}
              required
              maxLength={1000}
              value={form.objective}
              onChange={(e) => update({ objective: e.target.value })}
            />
          </Field>
          <Field label={w.expectedResult + " *"}>
            <textarea
              className={control + " h-24 py-3"}
              required
              maxLength={1000}
              value={form.expectedResult}
              onChange={(e) => update({ expectedResult: e.target.value })}
            />
          </Field>
        </div>
        <Field label={copy.type}>
          <select
            className={control}
            value={form.meetingType}
            onChange={(e) => update({ meetingType: e.target.value })}
          >
            {(["BOARD", "WORKING", "PROJECT"] as const).map((k) => (
              <option key={k} value={k}>
                {copy[k]}
              </option>
            ))}
          </select>
        </Field>
      </PlanningSection>
      <PlanningSection icon="👥" title={copy.participants} hint={w.peopleHint}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Field label={w.coordinator + " *"}>
              <select
                className={control}
                required
                disabled={!administrator}
                value={form.ownerId}
                onChange={(e) => {
                  const ownerId = Number(e.target.value);
                  update({
                    ownerId,
                    minutesOwnerId:
                      form.minutesOwnerId === form.ownerId
                        ? ownerId
                        : form.minutesOwnerId,
                  });
                }}
              >
                {members
                  .filter((m) => administrator || m.id === userId)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
              </select>
            </Field>
            <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-300">
              {w.coordinatorHint}
            </p>
          </div>
          <div>
            <Field label={w.minutesOwner + " *"}>
              <select
                className={control}
                required
                value={form.minutesOwnerId}
                onChange={(e) => {
                  const minutesOwnerId = Number(e.target.value);
                  update({
                    minutesOwnerId,
                    participantIds:
                      minutesOwnerId !== form.ownerId &&
                      !form.participantIds.includes(minutesOwnerId)
                        ? [...form.participantIds, minutesOwnerId]
                        : form.participantIds,
                  });
                }}
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </Field>
            <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-300">
              {w.minutesOwnerHint}
            </p>
          </div>
        </div>
        <Field label={w.participantSearch}>
          <input
            type="search"
            className={control}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Field>
        <fieldset>
          <legend className="mb-2 text-xs text-slate-500">
            {copy.participants} ·{" "}
            {new Set([form.ownerId, ...form.participantIds]).size}
          </legend>
          <div className="grid max-h-44 gap-2 overflow-auto rounded-xl border border-slate-200 p-3 dark:border-slate-700 sm:grid-cols-2">
            {members
              .filter((m) =>
                m.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
              )
              .map((m) => (
                <label
                  key={m.id}
                  className="flex min-h-11 items-center gap-3 rounded-lg px-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-blue-600"
                    checked={
                      m.id === form.ownerId ||
                      form.participantIds.includes(m.id)
                    }
                    disabled={
                      m.id === form.ownerId || m.id === form.minutesOwnerId
                    }
                    onChange={(e) =>
                      update({
                        participantIds: e.target.checked
                          ? [...form.participantIds, m.id]
                          : form.participantIds.filter((id) => id !== m.id),
                      })
                    }
                  />
                  <span className="min-w-0 break-words">
                    {m.name}
                    {m.id === form.ownerId && (
                      <span className="block text-xs text-blue-600 dark:text-blue-300">
                        {w.coordinator}
                      </span>
                    )}
                    {m.id === form.minutesOwnerId && (
                      <span className="block text-xs text-slate-500">
                        {w.minutesOwner}
                      </span>
                    )}
                  </span>
                </label>
              ))}
          </div>
        </fieldset>
        <p className="text-xs leading-5 text-slate-500 dark:text-slate-300">
          {w.permissionHint}
        </p>
      </PlanningSection>
    </div>
  );
}
export function ScheduleSetup({
  form,
  update,
  copy,
  w,
  guided,
  zone,
}: {
  form: PlanningDraft;
  update: Props["update"];
  copy: MeetingCopy;
  w: MeetingWorkflowCopy;
  guided: boolean;
  zone: string;
}) {
  const end = new Date(new Date(form.start).getTime() + form.duration * 60000);
  return (
    <div className="space-y-6">
      <PlanningSection icon="📅" title={w.scheduleStep}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={copy.start + " *"}>
            <input
              className={control}
              type="datetime-local"
              required
              value={form.start}
              onChange={(e) => update({ start: e.target.value })}
            />
          </Field>
          <Field label={copy.duration + " *"}>
            <input
              className={control}
              type="number"
              min={1}
              max={720}
              required
              value={form.duration}
              onChange={(e) => update({ duration: Number(e.target.value) })}
            />
          </Field>
        </div>
        <p className="text-xs leading-5 text-slate-500 dark:text-slate-300">
          {copy.timezone}: {zone}
          {Number.isFinite(end.getTime()) && (
            <>
              {" "}
              · {w.end}{" "}
              {new Intl.DateTimeFormat(undefined, {
                timeStyle: "short",
              }).format(end)}
            </>
          )}
        </p>
        {guided && (
          <>
            <label className="flex min-h-11 items-center gap-3 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 accent-blue-600"
                checked={form.recurring}
                onChange={(e) => update({ recurring: e.target.checked })}
              />
              {w.repeat}
            </label>
            {form.recurring && (
              <div className="space-y-3 rounded-xl border border-blue-100 bg-blue-50/60 p-4 dark:border-blue-900 dark:bg-blue-950/30">
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label={w.frequency}>
                    <select
                      className={control}
                      value={form.frequency}
                      onChange={(e) =>
                        update({
                          frequency: e.target
                            .value as PlanningDraft["frequency"],
                        })
                      }
                    >
                      {(["DAILY", "WEEKLY", "MONTHLY"] as const).map((k) => (
                        <option key={k} value={k}>
                          {w[k]}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label={w.interval}>
                    <input
                      className={control}
                      type="number"
                      min={1}
                      max={12}
                      required
                      value={form.interval}
                      onChange={(e) =>
                        update({ interval: Number(e.target.value) })
                      }
                    />
                  </Field>
                  <Field label={w.count}>
                    <input
                      className={control}
                      type="number"
                      min={2}
                      max={52}
                      required
                      value={form.count}
                      onChange={(e) =>
                        update({ count: Number(e.target.value) })
                      }
                    />
                  </Field>
                </div>
                <p className="text-xs leading-5 text-slate-600 dark:text-slate-300">
                  {w.limits}
                </p>
              </div>
            )}
          </>
        )}
        <Field label={w.reminder}>
          <select
            className={control}
            value={form.reminderMinutes}
            onChange={(e) =>
              update({ reminderMinutes: Number(e.target.value) })
            }
          >
            {(
              [
                [0, "none"],
                [15, "minutes15"],
                [30, "minutes30"],
                [60, "hour1"],
                [1440, "day1"],
              ] as const
            ).map(([v, k]) => (
              <option key={v} value={v}>
                {w[k]}
              </option>
            ))}
          </select>
        </Field>
        <p className="text-xs leading-5 text-slate-500 dark:text-slate-300">
          {form.reminderMinutes ? w.reminderHint : w.noExternal}
        </p>
      </PlanningSection>
      <PlanningSection icon="📝" title={w.details}>
        <Field label={copy.agenda}>
          <textarea
            className={control + " h-28 py-3"}
            maxLength={10000}
            value={form.agenda}
            onChange={(e) => update({ agenda: e.target.value })}
          />
        </Field>
        <Field label={copy.location}>
          <input
            className={control}
            maxLength={240}
            value={form.location}
            onChange={(e) => update({ location: e.target.value })}
          />
        </Field>
      </PlanningSection>
    </div>
  );
}
export function PlanReview({
  form,
  update,
  preview,
  copy,
  w,
  members,
  locale,
  editing = false,
}: {
  form: PlanningDraft;
  update: Props["update"];
  preview: PlanPreview;
  copy: MeetingCopy;
  w: MeetingWorkflowCopy;
  members: Member[];
  locale: string;
  editing?: boolean;
}) {
  const name = (id: number) => members.find((m) => m.id === id)?.name ?? "—";
  const conflicts = preview.occurrences.some((o) => o.conflicts > 0);
  return (
    <div className="space-y-5">
      <IndiceModalSummary
        className="[&_dd]:whitespace-normal [&_dd]:overflow-visible [&_dd]:break-words"
        variant="muted"
        columns={2}
        title={form.title}
        description={form.objective}
        items={[
          { label: w.expectedResult, value: form.expectedResult },
          { label: w.coordinator, value: name(form.ownerId) },
          { label: w.minutesOwner, value: name(form.minutesOwnerId) },
          {
            label: copy.participants,
            value: [...new Set([form.ownerId, ...form.participantIds])]
              .map(name)
              .join(" · "),
          },
          { label: w.count, value: preview.count },
          { label: copy.timezone, value: preview.timezone },
          {
            label: w.reminder,
            value: form.reminderMinutes
              ? `${form.reminderMinutes} min`
              : w.none,
          },
          { label: copy.agenda, value: form.agenda || "—" },
          { label: copy.location, value: form.location || "—" },
        ]}
      />
      <PlanningSection
        icon="📅"
        title={w.previewDates}
        hint={editing ? w.futureHint : undefined}
      >
        <ol className="max-h-56 space-y-2 overflow-auto rounded-xl border border-slate-200 p-3 dark:border-slate-700">
          {preview.occurrences.map((o) => (
            <li
              key={o.number}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-800"
            >
              <span>
                {o.number}.{" "}
                {new Intl.DateTimeFormat(locale, {
                  dateStyle: "medium",
                  timeStyle: "short",
                  timeZone: preview.timezone,
                }).format(new Date(o.startAt))}{" "}
                –{" "}
                {new Intl.DateTimeFormat(locale, {
                  timeStyle: "short",
                  timeZone: preview.timezone,
                }).format(new Date(o.endAt))}
              </span>
              {o.conflicts > 0 && (
                <span className="rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-900">
                  ⚠️ {o.conflicts}
                </span>
              )}
            </li>
          ))}
        </ol>
      </PlanningSection>
      {preview.monthlyClamp && (
        <IndiceModalValidation tone="info" messages={[w.monthClamp]} />
      )}{" "}
      {preview.overlapUsesEarlierOffset && (
        <IndiceModalValidation tone="info" messages={[w.overlapPolicy]} />
      )}{" "}
      {conflicts && (
        <>
          <IndiceModalValidation
            tone="warning"
            messages={[editing ? w.futureConflict : w.conflictsHint]}
          />
          {!editing && (
            <label className="flex min-h-11 items-start gap-3 text-sm leading-6">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 shrink-0 accent-blue-600"
                checked={form.allowConflicts}
                onChange={(e) => update({ allowConflicts: e.target.checked })}
              />
              {w.conflictAcknowledgment}
            </label>
          )}
        </>
      )}
      {!editing && (
        <div className="space-y-3">
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 accent-blue-600"
              checked={form.saveFlow}
              onChange={(e) => update({ saveFlow: e.target.checked })}
            />
            {w.saveFlow}
          </label>
          {form.saveFlow && (
            <Field label={w.flowName + " *"}>
              <input
                className={control}
                required
                maxLength={120}
                value={form.flowName}
                onChange={(e) => update({ flowName: e.target.value })}
              />
            </Field>
          )}
        </div>
      )}
      <IndiceModalValidation
        tone="info"
        messages={[w.humanControl, w.noExternal]}
      />
    </div>
  );
}
