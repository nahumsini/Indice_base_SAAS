import { useCallback, useId, useState } from "react";
import {
  IndiceModalFrame,
  IndiceModalValidation,
} from "../../../components/indice-modal";
import { getMeetingWorkflowCopy } from "../translations/meetingWorkflowCopy";
import type { MeetingCopy } from "../translations/meetingCopy";
import {
  meetingApi,
  type FlowItem,
  type SeriesItem,
} from "../services/meetingApi";
import { ApiClientError } from "../../../lib/apiClient";
import {
  Action,
  Field,
  control,
  Feedback,
  panel,
  useMeetingQuery,
} from "./MeetingPrimitives";

type Command =
  | { flow: FlowItem }
  | {
      series: SeriesItem;
      action: "PAUSE_REMINDERS" | "RESUME_REMINDERS" | "CANCEL_FUTURE";
    };
/** Replaces the workspace body for confirmation; never stacks dialogs. */
export function MeetingWorkflows({
  copy,
  locale,
  onClose,
  onChanged,
}: {
  copy: MeetingCopy;
  locale: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const w = getMeetingWorkflowCopy(locale),
    formId = useId();
  const [page, setPage] = useState(1),
    [command, setCommand] = useState<Command>(),
    [busy, setBusy] = useState(false),
    [reason, setReason] = useState(""),
    [error, setError] = useState("");
  const flows = useMeetingQuery(
    useCallback((signal) => meetingApi.flows(signal), []),
  );
  const series = useMeetingQuery(
    useCallback((signal) => meetingApi.series(page, signal), [page]),
  );
  const label = command
    ? "flow" in command
      ? w.archiveFlow
      : command.action === "CANCEL_FUTURE"
        ? w.cancelFuture
        : command.action === "PAUSE_REMINDERS"
          ? w.pause
          : w.resume
    : w.workflowTitle;
  const select = (value: Command) => {
    setCommand(value);
    setReason("");
    setError("");
  };
  const back = () => {
    setCommand(undefined);
    setError("");
  };
  const save = async () => {
    if (!command || busy) return;
    setBusy(true);
    setError("");
    try {
      if ("flow" in command)
        await meetingApi.archiveFlow(command.flow.id, command.flow.version);
      else
        await meetingApi.seriesCommand(
          command.series.id,
          command.action,
          reason,
          command.series.version,
        );
      back();
      flows.reload();
      series.reload();
      onChanged();
    } catch (e) {
      setError(
        e instanceof ApiClientError && e.status === 409
          ? copy.conflict
          : copy.error,
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <IndiceModalFrame
      open
      tone="blue"
      icon="🔁"
      busy={busy}
      modalType={command ? "confirmation" : "operational-workspace"}
      title={label}
      description={
        command
          ? "flow" in command
            ? w.archiveHint
            : command.action === "CANCEL_FUTURE"
              ? w.cancelFutureHint
              : w.pauseHint
          : w.flowHint
      }
      closeLabel={copy.close}
      onOpenChange={(open) => {
        if (!open && !busy) {
          if (command) back();
          else onClose();
        }
      }}
      footer={
        command ? (
          <>
            <Action disabled={busy} onClick={back}>
              {copy.cancel}
            </Action>
            <Action
              primary
              disabled={busy}
              type="submit"
              form={formId}
              data-modal-destructive={
                "flow" in command ||
                command.action === "CANCEL_FUTURE" ||
                undefined
              }
            >
              {busy ? copy.loading : label}
            </Action>
          </>
        ) : (
          <Action onClick={onClose}>{copy.close}</Action>
        )
      }
    >
      {error && <IndiceModalValidation messages={[error]} />}
      {command ? (
        <form
          id={formId}
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <p className="font-medium break-words">
            {"flow" in command ? command.flow.name : command.series.title}
          </p>
          {"series" in command && command.action === "CANCEL_FUTURE" && (
            <>
              <p className="text-sm">
                {w.futureCount}: {command.series.futurePlanned}
              </p>
              <Field label={copy.reason}>
                <textarea
                  className={control + " h-28 py-3"}
                  required
                  minLength={3}
                  maxLength={2000}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </Field>
            </>
          )}
        </form>
      ) : (
        <div className="space-y-6">
          <section className="space-y-3">
            <h3 className="text-sm font-medium">📋 {w.flows}</h3>
            {flows.loading ? (
              <Feedback>{copy.loading}</Feedback>
            ) : flows.error ? (
              <Feedback error>{copy.error}</Feedback>
            ) : !flows.data?.length ? (
              <Feedback>{copy.empty}</Feedback>
            ) : (
              flows.data.map((flow) => (
                <article
                  className={
                    panel + " flex flex-wrap items-center justify-between gap-3"
                  }
                  key={flow.id}
                >
                  <div className="min-w-0">
                    <h4 className="break-words text-sm font-medium">
                      {flow.name}
                    </h4>
                    <p className="mt-1 break-words text-xs text-slate-500 dark:text-slate-300">
                      {flow.settings.objective}
                    </p>
                  </div>
                  <Action onClick={() => select({ flow })}>
                    {w.archiveFlow}
                  </Action>
                </article>
              ))
            )}
          </section>
          <section className="space-y-3">
            <h3 className="text-sm font-medium">🔁 {w.series}</h3>
            {series.loading ? (
              <Feedback>{copy.loading}</Feedback>
            ) : series.error ? (
              <Feedback error>{copy.error}</Feedback>
            ) : !series.data?.items.length ? (
              <Feedback>{copy.empty}</Feedback>
            ) : (
              series.data.items.map((item) => (
                <article key={item.id} className={panel + " space-y-3"}>
                  <h4 className="break-words text-sm font-medium">
                    {item.title}
                  </h4>
                  <p className="text-xs leading-6 text-slate-500 dark:text-slate-300">
                    {w[item.frequency]} · {w.interval}: {item.interval} ·{" "}
                    {w.count}: {item.count} · {item.timezone}
                    <br />
                    {item.status === "CANCELLED"
                      ? copy.CANCELLED
                      : item.remindersPaused
                        ? w.paused
                        : w.active}{" "}
                    · {w.futureCount}: {item.futurePlanned}
                    {item.nextAt && (
                      <>
                        <br />
                        {w.upcoming}:{" "}
                        {new Intl.DateTimeFormat(locale, {
                          dateStyle: "medium",
                          timeStyle: "short",
                          timeZone: item.timezone,
                        }).format(new Date(item.nextAt))}
                      </>
                    )}
                  </p>
                  {item.status === "ACTIVE" && (
                    <div className="flex flex-wrap gap-2">
                      <Action
                        onClick={() =>
                          select({
                            series: item,
                            action: item.remindersPaused
                              ? "RESUME_REMINDERS"
                              : "PAUSE_REMINDERS",
                          })
                        }
                      >
                        {item.remindersPaused ? w.resume : w.pause}
                      </Action>
                      <Action
                        disabled={!item.futurePlanned}
                        className="text-red-600 dark:text-red-300"
                        onClick={() =>
                          select({ series: item, action: "CANCEL_FUTURE" })
                        }
                      >
                        {w.cancelFuture}
                      </Action>
                    </div>
                  )}
                </article>
              ))
            )}
            {series.data && series.data.total > 25 && (
              <div className="flex items-center justify-between gap-3">
                <Action
                  disabled={page === 1 || series.loading}
                  onClick={() => setPage(page - 1)}
                >
                  {copy.previous}
                </Action>
                <span className="text-sm">
                  {page} / {Math.ceil(series.data.total / 25)}
                </span>
                <Action
                  disabled={page * 25 >= series.data.total || series.loading}
                  onClick={() => setPage(page + 1)}
                >
                  {copy.next}
                </Action>
              </div>
            )}
          </section>
          <IndiceModalValidation
            tone="info"
            messages={[w.pauseHint, w.humanControl]}
          />
        </div>
      )}
    </IndiceModalFrame>
  );
}
