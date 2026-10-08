import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import {
  Plus,
  RotateCw,
  CalendarDays,
  List,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { IndiceTitleBar } from "../../../components/frontend-os/IndiceTitleBar";
import { IndiceWorkspaceNavigation } from "../../../components/frontend-os/IndiceWorkspaceNavigation";
import { IndiceCalendarSurface } from "../../../components/frontend-os/IndiceCalendarSurface";
import { IndiceTableActionGroup } from "../../../components/table/IndiceTableEngine";
import { TableCell } from "../../../components/ui/table";
import { useWorkspaceNavigationMemory } from "../../../hooks/useWorkspaceNavigationMemory";
import {
  meetingApi,
  type MeetingDetail as Detail,
  type MeetingStatus,
  type MeetingItem,
} from "../services/meetingApi";
import type { MeetingCopy } from "../translations/meetingCopy";
import {
  Action,
  Feedback,
  Status,
  dateInput,
  instantRange,
  useMeetingQuery,
} from "../components/MeetingPrimitives";
import {
  MeetingList,
  ScopeFilters,
  restoreScope,
  type ListScope,
} from "../components/MeetingList";
import {
  MeetingEditor,
  MinutesEditor,
  TransitionEditor,
} from "../components/MeetingEditors";
import { MeetingDetail } from "../components/MeetingDetail";
import { calendarDates, dayCount } from "../utils/dateScope";
import { MeetingWorkflows } from "../components/MeetingWorkflows";
import { getMeetingWorkflowCopy } from "../translations/meetingWorkflowCopy";

const statuses = ["PLANNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;
type Dialog =
  | { kind: "create" }
  | { kind: "workflows" }
  | { kind: "detail"; id: number }
  | { kind: "edit" | "minutes"; detail: Detail }
  | { kind: "status"; detail: Detail; status: MeetingStatus };
export default function MeetingsTab({
  copy,
  locale,
  userId,
  administrator,
  onAgreements,
}: {
  copy: MeetingCopy;
  locale: string;
  userId: number;
  administrator: boolean;
  onAgreements?: () => void;
}) {
  const w = getMeetingWorkflowCopy(locale);
  const [params, setParams] = useSearchParams();
  const requested = params.get("meeting");
  const opened = useRef("");
  const [notice, setNotice] = useState("");
  const now = new Date(),
    defaults: ListScope = {
      from: dateInput(new Date(now.getFullYear(), now.getMonth(), 1)),
      to: dateInput(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
      search: "",
      status: "",
      attention: "",
      person: 0,
      sort: "start",
      direction: "asc",
      page: 1,
      size: 25,
      view: "calendar",
      widths: {
        title: 280,
        start: 260,
        owner: 210,
        status: 180,
        participants: 180,
      },
    };
  const [scope, setScope] = useState(defaults),
    [dialog, setDialog] = useState<Dialog | null>(null),
    [search, setSearch] = useState(""),
    [selected, setSelected] = useState(dateInput(now));
  useEffect(() => {
    if (
      requested &&
      /^\d+$/.test(requested) &&
      Number.isSafeInteger(Number(requested)) &&
      Number(requested) > 0 &&
      opened.current !== requested
    ) {
      opened.current = requested;
      setDialog({ kind: "detail", id: Number(requested) });
    }
  }, [requested]);
  useEffect(() => {
    const timer = setTimeout(() => setSearch(scope.search), 250);
    return () => clearTimeout(timer);
  }, [scope.search]);
  let valid = true;
  try {
    dayCount(scope.from, scope.to);
    if (scope.view === "calendar") calendarDates(scope.from, scope.to);
  } catch {
    valid = false;
  }
  const directory = useMeetingQuery(
    useCallback((signal) => meetingApi.members(signal), []),
  );
  const query = useMeetingQuery(
    useCallback(
      (signal) =>
        valid
          ? meetingApi.list(
              {
                ...instantRange(scope.from, scope.to),
                search,
                status: scope.status,
                attention: scope.attention,
                ownerId: scope.person,
                sort: scope.sort,
                direction: scope.direction,
                page: scope.page,
                pageSize: scope.size,
              },
              scope.view === "calendar",
              signal,
            )
          : Promise.resolve(undefined),
      [
        valid,
        scope.from,
        scope.to,
        scope.status,
        scope.attention,
        scope.person,
        scope.sort,
        scope.direction,
        scope.page,
        scope.size,
        scope.view,
        search,
      ],
    ),
  );
  useWorkspaceNavigationMemory({
    moduleKey: "control_minutas",
    tabKey: "meetings-v1",
    state: scope,
    defaults,
    urlFields: {
      from: "from",
      to: "to",
      view: "view",
      status: "status",
      attention: "attention",
      person: "owner",
      search: "q",
      page: "page",
    },
    onRestore: (state) => setScope(restoreScope(state, defaults, statuses)),
  });
  const dates =
    valid && scope.view === "calendar"
      ? calendarDates(scope.from, scope.to)
      : [];
  const close = () => {
      setDialog(null);
      if (requested)
        setParams(
          (current) => {
            const next = new URLSearchParams(current);
            next.delete("meeting");
            return next;
          },
          { replace: true },
        );
    },
    saved = () => {
      close();
      query.reload();
    };
  const move = (offset: number) => {
    const date = new Date(scope.from + "T12:00:00");
    date.setMonth(date.getMonth() + offset, 1);
    setScope({
      ...scope,
      from: dateInput(date),
      to: dateInput(new Date(date.getFullYear(), date.getMonth() + 1, 0)),
      page: 1,
    });
  };
  return (
    <>
      <IndiceTitleBar
        tone="blue"
        title={copy.meetings}
        subtitle={copy.subtitle}
        icon="📅"
        actions={
          <>
            <Action onClick={() => setDialog({ kind: "workflows" })}>
              <span aria-hidden>🔁</span> {w.workflowTitle}
            </Action>
            <Action onClick={query.reload} disabled={query.loading}>
              <RotateCw className="h-4 w-4" />
              {copy.refresh}
            </Action>
            <Action primary onClick={() => setDialog({ kind: "create" })}>
              <Plus className="h-4 w-4" />
              {copy.newMeeting}
            </Action>
          </>
        }
      />
      {notice && <Feedback>{notice}</Feedback>}
      <IndiceWorkspaceNavigation
        tone="blue"
        variant="views"
        ariaLabel={copy.meetings}
        value={scope.view}
        onValueChange={(view) => setScope({ ...scope, view, page: 1 })}
        items={[
          {
            id: "calendar",
            label: copy.calendar,
            icon: <CalendarDays className="h-4 w-4" />,
          },
          {
            id: "table",
            label: copy.table,
            icon: <List className="h-4 w-4" />,
          },
        ]}
      />
      <ScopeFilters
        scope={scope}
        defaults={defaults}
        copy={copy}
        statuses={statuses}
        total={query.data?.total}
        people={directory.data?.items}
        onChange={setScope}
      />
      {directory.error && <Feedback error>{copy.error}</Feedback>}
      {!valid ? (
        <Feedback error>{copy.partial}</Feedback>
      ) : query.loading ? (
        <Feedback>{copy.loading}</Feedback>
      ) : query.error ? (
        <Feedback error>{copy.error}</Feedback>
      ) : (
        query.data && (
          <>
            {query.data.total > query.data.items.length &&
              scope.view === "calendar" && <Feedback>{copy.partial}</Feedback>}
            {scope.view === "calendar" ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-slate-500">{copy.localTime}</p>
                  <div className="flex gap-2">
                    <Action aria-label={copy.previous} onClick={() => move(-1)}>
                      <ChevronLeft className="h-4 w-4" />
                    </Action>
                    <Action aria-label={copy.next} onClick={() => move(1)}>
                      <ChevronRight className="h-4 w-4" />
                    </Action>
                  </div>
                </div>
                <IndiceCalendarSurface
                  tone="blue"
                  dates={dates}
                  locale={locale}
                  selectedDate={selected}
                  onSelectDate={setSelected}
                  label={copy.calendar}
                  renderDay={(date) =>
                    query
                      .data!.items.filter(
                        (m) => dateInput(new Date(m.startAt)) === date,
                      )
                      .map((m) => (
                        <button
                          type="button"
                          key={m.id}
                          className="block w-full rounded-xl border border-blue-100 bg-blue-50 p-2.5 text-left text-xs text-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-100"
                          onClick={() =>
                            setDialog({ kind: "detail", id: m.id })
                          }
                        >
                          <p className="mb-1 font-medium">
                            {new Intl.DateTimeFormat(locale, {
                              timeStyle: "short",
                            }).format(new Date(m.startAt))}
                          </p>
                          <p className="break-words">{m.title}</p>
                          <p className="mt-1 text-xs opacity-75">
                            {copy[m.status]}
                          </p>
                        </button>
                      ))
                  }
                />
              </>
            ) : (
              <MeetingList<MeetingItem>
                items={query.data.items}
                total={query.data.total}
                scope={scope}
                copy={copy}
                locale={locale}
                onChange={setScope}
                columns={[
                  { id: "title", label: copy.name, defaultWidth: 280 },
                  { id: "start", label: copy.start, defaultWidth: 260 },
                  { id: "owner", label: copy.owner, defaultWidth: 210 },
                  { id: "status", label: copy.status, defaultWidth: 180 },
                  {
                    id: "participants",
                    label: copy.participants,
                    defaultWidth: 180,
                  },
                ]}
                render={(row) => (
                  <>
                    <TableCell className="px-5 py-4">
                      <p className="truncate font-medium" title={row.title}>
                        {row.title}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {copy[row.meetingType]}
                      </p>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-sm">
                      <p>
                        {new Intl.DateTimeFormat(locale, {
                          dateStyle: "medium",
                          timeStyle: "short",
                          timeZone: row.timezone,
                        }).format(new Date(row.startAt))}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {row.timezone}
                      </p>
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <span
                        className="block truncate text-sm"
                        title={row.ownerName}
                      >
                        {row.ownerName}
                      </span>
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <Status copy={copy} status={row.status} />
                    </TableCell>
                    <TableCell className="px-5 py-4 text-sm">
                      {row.participantCount}
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <IndiceTableActionGroup>
                        <Action
                          onClick={() =>
                            setDialog({ kind: "detail", id: row.id })
                          }
                        >
                          {copy.view}
                        </Action>
                      </IndiceTableActionGroup>
                    </TableCell>
                  </>
                )}
              />
            )}
          </>
        )
      )}
      {dialog?.kind === "create" && (
        <MeetingEditor
          copy={copy}
          userId={userId}
          administrator={administrator}
          onClose={close}
          onSaved={saved}
          onPlanned={(result) => {
            query.reload();
            setNotice(
              result.count > 1
                ? `${w.seriesCreated} · ${result.count}`
                : w.created,
            );
            setDialog({ kind: "detail", id: result.firstMeetingId });
          }}
        />
      )}
      {dialog?.kind === "detail" && (
        <MeetingDetail
          id={dialog.id}
          copy={copy}
          locale={locale}
          userId={userId}
          administrator={administrator}
          onClose={close}
          onAgreements={onAgreements}
          onEdit={(detail) => setDialog({ kind: "edit", detail })}
          onMinutes={(detail) => setDialog({ kind: "minutes", detail })}
          onTransition={(detail, status) =>
            setDialog({ kind: "status", detail, status })
          }
        />
      )}
      {dialog?.kind === "edit" && (
        <MeetingEditor
          copy={copy}
          initial={dialog.detail}
          userId={userId}
          administrator={administrator}
          onClose={close}
          onSaved={saved}
        />
      )}
      {dialog?.kind === "workflows" && (
        <MeetingWorkflows
          copy={copy}
          locale={locale}
          onClose={close}
          onChanged={query.reload}
        />
      )}
      {dialog?.kind === "minutes" && (
        <MinutesEditor
          copy={copy}
          detail={dialog.detail}
          onClose={close}
          onSaved={saved}
        />
      )}
      {dialog?.kind === "status" && (
        <TransitionEditor
          copy={copy}
          meeting={dialog.detail}
          status={dialog.status}
          onClose={close}
          onSaved={saved}
        />
      )}
    </>
  );
}
