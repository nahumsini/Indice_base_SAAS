import { useCallback, useState } from "react";
import { RotateCw } from "lucide-react";
import { Link } from "react-router";
import { IndiceTitleBar } from "../../../components/frontend-os/IndiceTitleBar";
import { IndiceFilterBar } from "../../../components/frontend-os/IndiceFilterBar";
import {
  IndiceFilterDisclosureActions,
  useIndiceFilterDisclosureCopy,
} from "../../../components/frontend-os/IndiceFilterDisclosure";
import { useWorkspaceNavigationMemory } from "../../../hooks/useWorkspaceNavigationMemory";
import { meetingApi } from "../services/meetingApi";
import type { MeetingCopy } from "../translations/meetingCopy";
import {
  Action,
  Feedback,
  Field,
  control,
  panel,
  dateInput,
  instantRange,
  useMeetingQuery,
} from "../components/MeetingPrimitives";
import { dayCount } from "../utils/dateScope";

export default function IndicatorsTab({
  copy,
  locale,
  canMeetings,
  canAgreements,
}: {
  copy: MeetingCopy;
  locale: string;
  canMeetings: boolean;
  canAgreements: boolean;
}) {
  const now = new Date(),
    defaults = {
      from: dateInput(new Date(now.getFullYear(), now.getMonth(), 1)),
      to: dateInput(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
    },
    [range, setRange] = useState(defaults),
    c = useIndiceFilterDisclosureCopy();
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  let valid = true;
  try {
    dayCount(range.from, range.to);
  } catch {
    valid = false;
  }
  const query = useMeetingQuery(
    useCallback(
      (signal) =>
        valid
          ? meetingApi.metrics(
              { ...instantRange(range.from, range.to), timezone: zone },
              signal,
            )
          : Promise.resolve(undefined),
      [valid, range.from, range.to, zone],
    ),
  );
  useWorkspaceNavigationMemory({
    moduleKey: "control_minutas",
    tabKey: "indicators-v1",
    state: range,
    defaults,
    urlFields: { from: "from", to: "to" },
    onRestore: (state) => {
      if (
        /^\d{4}-\d{2}-\d{2}$/.test(state.from) &&
        /^\d{4}-\d{2}-\d{2}$/.test(state.to)
      )
        setRange(state);
    },
  });
  return (
    <>
      <IndiceTitleBar
        tone="blue"
        title={copy.indicators}
        subtitle={copy.metricsHint}
        icon="📊"
        actions={
          <Action onClick={query.reload} disabled={query.loading}>
            <RotateCw className="h-4 w-4" />
            {copy.refresh}
          </Action>
        }
      />
      <IndiceFilterBar
        title={copy.filters}
        summary={
          <IndiceFilterDisclosureActions
            tone="blue"
            activeAdvancedCount={0}
            advancedLabel={c.moreFilters}
            isAdvancedOpen={false}
            onToggleAdvanced={() => {}}
            showAdvancedToggle={false}
            clearLabel={c.clearFilters}
            hasActiveFilters={
              range.from !== defaults.from || range.to !== defaults.to
            }
            onClear={() => setRange(defaults)}
          />
        }
      >
        {(["from", "to"] as const).map((key) => (
          <Field key={key} label={copy[key]}>
            <input
              className={control}
              type="date"
              value={range[key]}
              onChange={(e) => setRange({ ...range, [key]: e.target.value })}
            />
          </Field>
        ))}
      </IndiceFilterBar>
      {!valid ? (
        <Feedback error>{copy.partial}</Feedback>
      ) : query.loading ? (
        <Feedback>{copy.loading}</Feedback>
      ) : query.error ? (
        <Feedback error>{copy.error}</Feedback>
      ) : (
        query.data && (
          <>
            <p className="text-xs leading-5 text-slate-500 dark:text-slate-300">
              {copy.source} · {query.data.timezone}
            </p>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {(
                [
                  "planned",
                  "inProgress",
                  "completed",
                  "cancelled",
                  "awaitingClosure",
                  "missingMinutes",
                  "openAgreements",
                  "overdueAgreements",
                ] as const
              ).map((key, i) => {
                const agreement = i >= 6,
                  canInspect = agreement ? canAgreements : canMeetings,
                  status = [
                    "PLANNED",
                    "IN_PROGRESS",
                    "COMPLETED",
                    "CANCELLED",
                    "",
                    "",
                    "OPEN",
                    "OPEN",
                  ][i],
                  risk = [4, 5, 7].includes(i);
                return (
                  <section key={key} className={panel}>
                    <span aria-hidden="true" className="text-xl">
                      {["📅", "💬", "✅", "📁", "⏳", "📝", "🤝", "⚠️"][i]}
                    </span>
                    <h3 className="mt-3 text-sm font-medium text-slate-600 dark:text-slate-300">
                      {copy[key]}
                    </h3>
                    <p
                      className={`mt-2 text-3xl font-medium ${risk && query.data![key] > 0 ? "text-amber-700 dark:text-amber-300" : ""}`}
                    >
                      {new Intl.NumberFormat(locale).format(query.data![key])}
                    </p>
                    {risk && (
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-300">
                        {copy.target}
                      </p>
                    )}
                    {canInspect && (
                      <Link
                        className="mt-3 inline-flex min-h-11 items-center rounded-lg text-sm text-blue-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:text-blue-300"
                        to={`/minutes-control/${agreement ? "agreements" : "meetings"}?${new URLSearchParams({ ...range, status, view: "table", attention: risk ? key : "", owner: "0", assignee: "0", q: "", page: "1" })}`}
                      >
                        {copy.inspect}
                      </Link>
                    )}
                  </section>
                );
              })}
            </div>
          </>
        )
      )}
    </>
  );
}
