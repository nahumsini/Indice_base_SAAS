import { useCallback, useEffect, useState } from "react";
import { Plus, RotateCw, Check, X } from "lucide-react";
import { IndiceTitleBar } from "../../../components/frontend-os/IndiceTitleBar";
import { IndiceTableActionGroup } from "../../../components/table/IndiceTableEngine";
import { TableCell } from "../../../components/ui/table";
import { useWorkspaceNavigationMemory } from "../../../hooks/useWorkspaceNavigationMemory";
import {
  meetingApi,
  type Agreement,
  type AgreementStatus,
} from "../services/meetingApi";
import type { MeetingCopy } from "../translations/meetingCopy";
import {
  Action,
  Feedback,
  Status,
  useMeetingQuery,
  dateInput,
  dateEnd,
} from "../components/MeetingPrimitives";
import {
  MeetingList,
  ScopeFilters,
  restoreScope,
  type ListScope,
} from "../components/MeetingList";
import {
  AgreementEditor,
  TransitionEditor,
} from "../components/MeetingEditors";
import { dayCount } from "../utils/dateScope";

const statuses = ["OPEN", "DONE", "CANCELLED"] as const;
export default function AgreementsTab({
  copy,
  locale,
  userId,
  administrator,
}: {
  copy: MeetingCopy;
  locale: string;
  userId: number;
  administrator: boolean;
}) {
  const now = new Date(),
    defaults: ListScope = {
      from: dateInput(new Date(now.getFullYear(), now.getMonth(), 1)),
      to: dateInput(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
      search: "",
      status: "",
      attention: "",
      person: 0,
      sort: "due",
      direction: "asc",
      page: 1,
      size: 25,
      view: "table",
      widths: {
        title: 300,
        meeting: 260,
        assignee: 210,
        due: 200,
        status: 180,
      },
    };
  const [scope, setScope] = useState(defaults),
    [search, setSearch] = useState(""),
    [create, setCreate] = useState(false),
    [transition, setTransition] = useState<{
      row: Agreement;
      status: AgreementStatus;
    } | null>(null);
  useEffect(() => {
    const timer = setTimeout(() => setSearch(scope.search), 250);
    return () => clearTimeout(timer);
  }, [scope.search]);
  let valid = true;
  try {
    dayCount(scope.from, scope.to);
  } catch {
    valid = false;
  }
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const people = useMeetingQuery(
    useCallback((signal) => meetingApi.assignees(signal), []),
  );
  const query = useMeetingQuery(
    useCallback(
      (signal) =>
        valid
          ? meetingApi.agreements(
              {
                from: scope.from,
                to: dateEnd(scope.to),
                search,
                status: scope.status,
                attention: scope.attention,
                assigneeId: scope.person,
                sort: scope.sort,
                direction: scope.direction,
                timezone: zone,
                page: scope.page,
                pageSize: scope.size,
              },
              signal,
            )
          : Promise.resolve(undefined),
      [
        valid,
        scope.from,
        scope.to,
        search,
        scope.status,
        scope.attention,
        scope.person,
        scope.sort,
        scope.direction,
        scope.page,
        scope.size,
        zone,
      ],
    ),
  );
  useWorkspaceNavigationMemory({
    moduleKey: "control_minutas",
    tabKey: "agreements-v1",
    state: scope,
    defaults,
    urlFields: {
      from: "from",
      to: "to",
      status: "status",
      attention: "attention",
      person: "assignee",
      search: "q",
      page: "page",
    },
    onRestore: (state) => setScope(restoreScope(state, defaults, statuses)),
  });
  const close = () => {
      setCreate(false);
      setTransition(null);
    },
    saved = () => {
      close();
      query.reload();
      people.reload();
    };
  return (
    <>
      <IndiceTitleBar
        tone="blue"
        title={copy.agreements}
        subtitle={copy.metricsHint}
        icon="🤝"
        actions={
          <>
            <Action onClick={query.reload} disabled={query.loading}>
              <RotateCw className="h-4 w-4" />
              {copy.refresh}
            </Action>
            <Action primary onClick={() => setCreate(true)}>
              <Plus className="h-4 w-4" />
              {copy.newAgreement}
            </Action>
          </>
        }
      />
      <ScopeFilters
        scope={scope}
        defaults={defaults}
        copy={copy}
        statuses={statuses}
        total={query.data?.total}
        people={people.data?.items}
        onChange={setScope}
      />
      {people.error && <Feedback error>{copy.error}</Feedback>}
      {!valid ? (
        <Feedback error>{copy.partial}</Feedback>
      ) : query.loading ? (
        <Feedback>{copy.loading}</Feedback>
      ) : query.error ? (
        <Feedback error>{copy.error}</Feedback>
      ) : (
        query.data && (
          <MeetingList<Agreement>
            items={query.data.items}
            total={query.data.total}
            scope={scope}
            copy={copy}
            locale={locale}
            onChange={setScope}
            columns={[
              { id: "title", label: copy.name, defaultWidth: 300 },
              { id: "meeting", label: copy.meeting, defaultWidth: 260 },
              { id: "assignee", label: copy.assignee, defaultWidth: 210 },
              { id: "due", label: copy.due, defaultWidth: 200 },
              { id: "status", label: copy.status, defaultWidth: 180 },
            ]}
            render={(row) => {
              const own = administrator || row.meetingOwnerId === userId;
              return (
                <>
                  <TableCell className="px-5 py-4">
                    <p className="truncate font-medium" title={row.title}>
                      {row.title}
                    </p>
                    {row.resolution && (
                      <details className="mt-2 whitespace-pre-wrap break-words text-xs text-slate-500">
                        <summary className="cursor-pointer">
                          {copy.reason}
                        </summary>
                        {row.resolution}
                      </details>
                    )}
                  </TableCell>
                  <TableCell className="px-5 py-4">
                    <span
                      className="block truncate text-sm"
                      title={row.meetingTitle}
                    >
                      {row.meetingTitle}
                    </span>
                  </TableCell>
                  <TableCell className="px-5 py-4">
                    <span className="block truncate text-sm">
                      {row.assigneeName}
                    </span>
                  </TableCell>
                  <TableCell className="px-5 py-4 text-sm">
                    {new Intl.DateTimeFormat(locale, {
                      dateStyle: "medium",
                    }).format(new Date(row.dueDate + "T12:00:00"))}
                  </TableCell>
                  <TableCell className="px-5 py-4">
                    <Status status={row.status} copy={copy} />
                  </TableCell>
                  <TableCell className="px-5 py-4">
                    {row.status === "OPEN" &&
                      (own || row.assigneeId === userId) && (
                        <IndiceTableActionGroup>
                          <Action
                            onClick={() =>
                              setTransition({ row, status: "DONE" })
                            }
                            aria-label={copy.complete + ": " + row.title}
                            title={copy.complete}
                          >
                            <Check className="h-4 w-4" />
                          </Action>
                          {own && (
                            <Action
                              onClick={() =>
                                setTransition({ row, status: "CANCELLED" })
                              }
                              aria-label={
                                copy.cancelAgreement + ": " + row.title
                              }
                              title={copy.cancelAgreement}
                              className="text-red-600 dark:text-red-300"
                            >
                              <X className="h-4 w-4" />
                            </Action>
                          )}
                        </IndiceTableActionGroup>
                      )}
                  </TableCell>
                </>
              );
            }}
          />
        )
      )}
      {create && (
        <AgreementEditor copy={copy} onClose={close} onSaved={saved} />
      )}
      {transition && (
        <TransitionEditor
          copy={copy}
          agreement={transition.row}
          status={transition.status}
          onClose={close}
          onSaved={saved}
        />
      )}
    </>
  );
}
