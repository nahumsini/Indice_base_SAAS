import { getMeetingWorkspaceCopy } from "../translations/meetingWorkspaceCopy";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { Plus, RotateCw, CalendarDays, List } from "lucide-react";
import { IndiceTitleBar } from "../../../components/frontend-os/IndiceTitleBar";
import { IndiceWorkspaceNavigation } from "../../../components/frontend-os/IndiceWorkspaceNavigation";
import { MeetingCalendar } from "../components/MeetingCalendar";
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
import { MeetingVotingEditor } from "../components/MeetingVotingEditor";
import { MeetingVotingWorkspace } from "../components/MeetingVotingWorkspace";
import { AgreementEditor } from "../components/AgreementEditors";
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
  | { kind: "agreement"; detail: Detail; suggestedTitle?: string }
  | { kind: "ballot-create"; detail: Detail }
  | { kind: "ballot"; detail: Detail; ballotId: number }
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
  onAgreements?: (meetingId: number) => void;
}) {
  const w = getMeetingWorkflowCopy(locale),
    workspace = getMeetingWorkspaceCopy(locale);
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
  return (
    <>
      <IndiceTitleBar
        tone="blue"
        title={copy.meetings}
        subtitle={workspace.meetingsHint}
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
        locale={locale}
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
        <Feedback error>
          {copy.error}
          <Action onClick={query.reload}>{copy.refresh}</Action>
        </Feedback>
      ) : (
        query.data && (
          <>
            {query.data.total > query.data.items.length &&
              scope.view === "calendar" && <Feedback>{copy.partial}</Feedback>}
            {scope.view === "calendar" ? (
              <MeetingCalendar
                items={query.data.items}
                from={scope.from}
                to={scope.to}
                selectedDate={selected}
                onSelectDate={setSelected}
                onRange={(range) => setScope({ ...scope, ...range, page: 1 })}
                onOpen={(id) => setDialog({ kind: "detail", id })}
                copy={copy}
                locale={locale}
              />
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
                      <button
                        type="button"
                        className="min-h-11 w-full truncate text-left font-medium text-blue-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:text-blue-300"
                        title={row.title}
                        onClick={() =>
                          setDialog({ kind: "detail", id: row.id })
                        }
                      >
                        {row.title}
                      </button>
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
          onNewBallot={detail => setDialog({ kind: "ballot-create", detail })}
          onBallot={(detail, ballotId) => setDialog({ kind: "ballot", detail, ballotId })}
          onNewAgreement={onAgreements ? detail => setDialog({ kind: "agreement", detail }) : undefined}
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
          onClose={() => setDialog({ kind: "detail", id: dialog.detail.meeting.id })}
          onSaved={() => { query.reload(); setDialog({ kind: "detail", id: dialog.detail.meeting.id }); }}
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
          onClose={() => setDialog({ kind: "detail", id: dialog.detail.meeting.id })}
          onSaved={() => { query.reload(); setDialog({ kind: "detail", id: dialog.detail.meeting.id }); }}
        />
      )}
      {dialog?.kind === "agreement" && <AgreementEditor copy={copy} suggestedTitle={dialog.suggestedTitle} meetingId={dialog.detail.meeting.id} onClose={() => setDialog({ kind: "detail", id: dialog.detail.meeting.id })} onSaved={() => { query.reload(); setDialog({ kind: "detail", id: dialog.detail.meeting.id }); }} />}
      {dialog?.kind === "ballot-create" && <MeetingVotingEditor meetingId={dialog.detail.meeting.id} locale={locale} copy={copy} onClose={() => setDialog({ kind: "detail", id: dialog.detail.meeting.id })} onOpened={ballotId => setDialog({ kind: "ballot", detail: dialog.detail, ballotId })} />}
      {dialog?.kind === "ballot" && <MeetingVotingWorkspace meetingId={dialog.detail.meeting.id} id={dialog.ballotId} locale={locale} copy={copy} canManage={administrator || dialog.detail.meeting.ownerId === userId} onClose={() => { query.reload(); setDialog({ kind: "detail", id: dialog.detail.meeting.id }); }} onAgreement={onAgreements ? subject => setDialog({ kind: "agreement", detail: dialog.detail, suggestedTitle: subject }) : undefined} />}
      {dialog?.kind === "status" && (
        <TransitionEditor
          copy={copy}
          meeting={dialog.detail}
          status={dialog.status}
          canAgreements={Boolean(onAgreements)}
          onClose={() => setDialog({ kind: "detail", id: dialog.detail.meeting.id })}
          onSaved={() => { query.reload(); setDialog({ kind: "detail", id: dialog.detail.meeting.id }); }}
        />
      )}
    </>
  );
}
