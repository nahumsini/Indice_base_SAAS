import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Copy,
  Plus,
  RotateCw,
  LayoutGrid,
  List,
  MoreHorizontal,
  Pencil,
  X,
} from "lucide-react";
import { IndiceTitleBar } from "../../../components/frontend-os/IndiceTitleBar";
import {
  IndiceFilterBar,
  IndiceFilterSearch,
  IndiceFilterSelect,
} from "../../../components/frontend-os/IndiceFilterBar";
import {
  IndiceFilterDisclosureActions,
  useIndiceFilterDisclosureCopy,
} from "../../../components/frontend-os/IndiceFilterDisclosure";
import { IndiceWorkspaceNavigation } from "../../../components/frontend-os/IndiceWorkspaceNavigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu";
import { useWorkspaceNavigationMemory } from "../../../hooks/useWorkspaceNavigationMemory";
import { schedulingApi, type Event } from "../services/schedulingApi";
import { useSchedulingQuery } from "../hooks/useSchedulingQuery";
import type { SchedulingCopy } from "../translations/schedulingCopy";
import { ActionButton, Feedback } from "../components/SchedulingPrimitives";
import { EventEditor } from "../components/EventEditor";
import { EventParticipants } from "../components/EventParticipants";
import { EventsResults } from "../components/EventsResults";
import { getSchedulingOperationsCopy } from "../translations/schedulingOperationsCopy";
import { getSchedulingExperienceCopy } from "../translations/schedulingExperienceCopy";
import { EventCancellation } from "../components/EventCancellation";
import { schedulingEmoji, schedulingTone } from "../utils/schedulingIdentity";
import {
  defaultEventScope,
  restoreEventScope,
  selectEvents,
  type EventScope,
} from "../utils/eventWorkspace";

export default function EventsTab({
  copy,
  locale,
  administrator,
  canReadParticipants,
}: {
  canReadParticipants: boolean;
  copy: SchedulingCopy;
  locale: string;
  administrator: boolean;
}) {
  const query = useSchedulingQuery(
    useCallback(async (signal: AbortSignal) => {
      const [events, catalog, links] = await Promise.all([
        schedulingApi.events(signal),
        schedulingApi.catalog(signal),
        schedulingApi.links(signal),
      ]);
      return { events, catalog, links };
    }, []),
  );
  const op = getSchedulingOperationsCopy(locale),
    c = getSchedulingExperienceCopy(locale),
    filters = useIndiceFilterDisclosureCopy();
  const [scope, setScope] = useState(defaultEventScope);
  useWorkspaceNavigationMemory({
    moduleKey: "scheduling",
    tabKey: "events",
    state: scope,
    defaults: defaultEventScope,
    urlFields: {
      search: "q",
      period: "period",
      status: "status",
      staff: "staff",
      view: "view",
      page: "page",
    },
    onRestore: (state) => setScope(restoreEventScope(state)),
  });
  const records = useMemo(
    () =>
      selectEvents(
        query.data?.events ?? [],
        query.data?.catalog.staff ?? [],
        scope,
        locale,
        Date.now(),
        {
          published: c.publishedEvent,
          draft: c.draftEvent,
          cancelled: copy.CANCELLED,
        },
      ),
    [query.data, scope, locale, c.publishedEvent, c.draftEvent, copy.CANCELLED],
  );
  useEffect(() => {
    if (query.data) {
      const page = Math.min(
        scope.page,
        Math.max(1, Math.ceil(records.length / scope.size)),
      );
      if (page !== scope.page) setScope((previous) => ({ ...previous, page }));
    }
  }, [query.data, records.length, scope.page, scope.size]);
  const change = (patch: Partial<EventScope>) =>
    setScope((previous) => ({ ...previous, ...patch, page: 1 }));
  const [participants, setParticipants] = useState<Event | null>(null);
  const [editor, setEditor] = useState<Event | "new" | null>(null);
  const [cancelling, setCancelling] = useState<Event | null>(null);
  const [feedback, setFeedback] = useState<"copied" | "error" | null>(null);
  return (
    <>
      <IndiceTitleBar
        tone={schedulingTone}
        title={copy.events}
        subtitle={copy.eventsHint}
        icon={schedulingEmoji.events}
        actions={
          <>
            <ActionButton onClick={query.reload} disabled={query.loading}>
              <RotateCw className="h-4 w-4" />
              {copy.refresh}
            </ActionButton>
            {administrator && (
              <ActionButton
                primary
                disabled={!query.data?.catalog.staff.length}
                onClick={() => setEditor("new")}
              >
                <Plus className="h-4 w-4" />
                {copy.newEvent}
              </ActionButton>
            )}
          </>
        }
      />
      {feedback && (
        <Feedback error={feedback === "error"}>{copy[feedback]}</Feedback>
      )}
      <IndiceWorkspaceNavigation
        tone={schedulingTone}
        variant="views"
        ariaLabel={copy.events}
        value={scope.view}
        onValueChange={(view) => change({ view })}
        items={[
          { id: "cards", label: c.cardsView, icon: <LayoutGrid /> },
          { id: "table", label: copy.tableView, icon: <List /> },
        ]}
      />
      <IndiceFilterBar
        title={copy.filters}
        gridClassName="md:grid-cols-2 xl:grid-cols-4"
        summary={
          <IndiceFilterDisclosureActions
            tone={schedulingTone}
            showAdvancedToggle={false}
            activeAdvancedCount={0}
            isAdvancedOpen={false}
            advancedLabel={filters.moreFilters}
            onToggleAdvanced={() => {}}
            hasActiveFilters={Boolean(
              scope.search ||
                scope.staff ||
                scope.period !== "all" ||
                scope.status !== "all",
            )}
            clearLabel={filters.clearFilters}
            onClear={() =>
              setScope({
                ...defaultEventScope,
                view: scope.view,
                widths: scope.widths,
              })
            }
            resultSummary={
              query.data ? `${copy.events}: ${records.length}` : undefined
            }
          />
        }
      >
        <IndiceFilterSearch
          tone={schedulingTone}
          label={c.searchEvents}
          placeholder={c.searchPlaceholder}
          value={scope.search}
          onValueChange={(search) => change({ search: search.slice(0, 180) })}
          clearLabel={filters.clearFilters}
          onClear={() => change({ search: "" })}
        />
        <IndiceFilterSelect
          tone={schedulingTone}
          label={c.period}
          value={scope.period}
          onValueChange={(period) => change({ period })}
          options={[
            { value: "all", label: c.allEvents },
            { value: "upcoming", label: c.upcoming },
            { value: "past", label: c.past },
          ]}
        />
        <IndiceFilterSelect
          tone={schedulingTone}
          label={copy.status}
          value={scope.status}
          onValueChange={(status) => change({ status })}
          options={[
            { value: "all", label: copy.allStates },
            { value: "published", label: c.publishedEvent },
            { value: "draft", label: c.draftEvent },
            { value: "cancelled", label: copy.CANCELLED },
          ]}
        />
        <IndiceFilterSelect
          tone={schedulingTone}
          label={copy.consultant}
          value={String(scope.staff)}
          onValueChange={(staff) => change({ staff: Number(staff) })}
          options={[
            { value: "0", label: copy.allStaff },
            ...(query.data?.catalog.staff ?? []).map((person) => ({
              value: String(person.id),
              label: person.publicName,
            })),
          ]}
        />
      </IndiceFilterBar>
      {query.loading ? (
        <Feedback>{copy.loading}</Feedback>
      ) : query.error ? (
        <Feedback error>
          {copy.error}
          <ActionButton onClick={query.reload}>{copy.retry}</ActionButton>
        </Feedback>
      ) : (
        query.data && (
          <>
            <EventsResults
              events={records}
              staff={query.data.catalog.staff}
              scope={scope}
              onChange={setScope}
              copy={copy}
              locale={locale}
              renderActions={(event) => {
                const active = event.status === "ACTIVE",
                  future = new Date(event.startAt) > new Date();
                const menu =
                  active &&
                  (administrator ||
                    (event.published && future && query.data!.links.publicUrl));
                return (
                  <>
                    {canReadParticipants && (
                      <ActionButton onClick={() => setParticipants(event)}>
                        {op.attendees}
                      </ActionButton>
                    )}
                    {menu && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <ActionButton
                            aria-label={`${copy.actions}: ${event.title}`}
                            title={copy.actions}
                            className="px-3"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </ActionButton>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {administrator && future && (
                            <DropdownMenuItem onSelect={() => setEditor(event)}>
                              <Pencil className="h-4 w-4" />
                              {copy.edit}
                            </DropdownMenuItem>
                          )}
                          {event.published &&
                            future &&
                            query.data!.links.publicUrl && (
                              <DropdownMenuItem
                                onSelect={async () => {
                                  try {
                                    await navigator.clipboard.writeText(
                                      new URL(
                                        `${query.data!.links.publicUrl}?event=${event.id}`,
                                        window.location.origin,
                                      ).href,
                                    );
                                    setFeedback("copied");
                                  } catch {
                                    setFeedback("error");
                                  }
                                }}
                              >
                                <Copy className="h-4 w-4" />
                                {copy.copy}
                              </DropdownMenuItem>
                            )}
                          {administrator && (
                            <DropdownMenuItem
                              className="text-red-600 dark:text-red-300"
                              onSelect={() => setCancelling(event)}
                            >
                              <X className="h-4 w-4" />
                              {copy.cancelEvent}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </>
                );
              }}
            />
            {participants && (
              <EventParticipants
                event={participants}
                copy={copy}
                locale={locale}
                onClose={() => setParticipants(null)}
              />
            )}
            {editor && (
              <EventEditor
                copy={copy}
                catalog={query.data.catalog}
                event={editor === "new" ? undefined : editor}
                onClose={() => setEditor(null)}
                onSaved={() => {
                  setEditor(null);
                  query.reload();
                }}
              />
            )}
            {cancelling && (
              <EventCancellation
                copy={copy}
                event={cancelling}
                onClose={() => setCancelling(null)}
                onSaved={() => {
                  setCancelling(null);
                  query.reload();
                }}
              />
            )}
          </>
        )
      )}
    </>
  );
}
