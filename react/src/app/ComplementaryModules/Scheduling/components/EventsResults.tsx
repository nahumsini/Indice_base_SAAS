import type { ReactNode } from "react";
import { CalendarDays, Users } from "lucide-react";
import {
  IndiceOperationalTable,
  IndiceTableColGroup,
  IndiceTableHeaderRow,
  IndiceTableShell,
  type IndiceTableColumnDefinition,
} from "../../../components/table/IndiceTableEngine";
import { DataTablePagination } from "../../../components/table/DataTablePagination";
import { TableBody, TableCell, TableRow } from "../../../components/ui/table";
import type { Event, BookingCatalog } from "../services/schedulingApi";
import type { SchedulingCopy } from "../translations/schedulingCopy";
import { getSchedulingExperienceCopy } from "../translations/schedulingExperienceCopy";
import {
  eventState,
  defaultEventScope,
  type EventScope,
  type EventColumn,
} from "../utils/eventWorkspace";

export function EventState({
  event,
  copy,
  locale,
}: {
  event: Event;
  copy: SchedulingCopy;
  locale: string;
}) {
  const c = getSchedulingExperienceCopy(locale),
    state = eventState(event);
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs ${state === "published" ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" : state === "draft" ? "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}
    >
      {state === "cancelled"
        ? copy.CANCELLED
        : state === "published"
          ? c.publishedEvent
          : c.draftEvent}
    </span>
  );
}
export function EventsResults({
  events,
  staff,
  scope,
  copy,
  locale,
  onChange,
  renderActions,
}: {
  events: Event[];
  staff: BookingCatalog["staff"];
  scope: EventScope;
  copy: SchedulingCopy;
  locale: string;
  onChange: (scope: EventScope) => void;
  renderActions: (event: Event) => ReactNode;
}) {
  const c = getSchedulingExperienceCopy(locale),
    total = events.length;
  const rows = events.slice(
    (scope.page - 1) * scope.size,
    scope.page * scope.size,
  );
  const pagination = (
    <DataTablePagination
      currentPage={scope.page}
      totalPages={Math.max(1, Math.ceil(total / scope.size))}
      totalCount={total}
      pageSize={scope.size}
      pageSizeOptions={[10, 25, 50, 100, 200]}
      pageStart={total ? (scope.page - 1) * scope.size + 1 : 0}
      pageEnd={Math.min(total, scope.page * scope.size)}
      onPageChange={(page) => onChange({ ...scope, page })}
      onPageSizeChange={(size) => onChange({ ...scope, size, page: 1 })}
    />
  );
  const host = (event: Event) =>
    staff.find((person) => person.id === event.staffId);
  const time = (event: Event) =>
    new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: host(event)?.timezone,
    }).format(new Date(event.startAt));
  const labels: Record<EventColumn, string> = {
    title: copy.events,
    start: copy.eventAt,
    host: copy.consultant,
    capacity: copy.reserved,
    status: copy.status,
  };
  const columns = (Object.keys(defaultEventScope.widths) as EventColumn[]).map(
    (id) => ({
      id,
      label: labels[id],
      width: scope.widths[id],
      defaultWidth: defaultEventScope.widths[id],
      contentMinimumWidth: 140,
      sortable: true,
      resizeLabel: `${c.resize}: ${labels[id]}`,
      alignment: id === "capacity" ? ("right" as const) : ("left" as const),
    } satisfies IndiceTableColumnDefinition<EventColumn>),
  );
  return (
    <div className="space-y-3">
      <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
        {c.loadedEvents}
      </p>
      {scope.view === "table" ? (
        <IndiceTableShell pagination={pagination}>
          <IndiceOperationalTable
            minimumWidth={columns.reduce(
              (sum, column) => sum + column.width,
              220,
            )}
          >
            <IndiceTableColGroup columns={columns} actionsWidth={220} />
            <IndiceTableHeaderRow
              tone="coral"
              columns={columns}
              actions={{ label: copy.actions, width: 220 }}
              sortState={{ columnId: scope.sort, direction: scope.direction }}
              onSort={(sort) =>
                onChange({
                  ...scope,
                  sort,
                  direction:
                    scope.sort === sort && scope.direction === "asc"
                      ? "desc"
                      : "asc",
                  page: 1,
                })
              }
              onResize={(id, width) =>
                onChange({ ...scope, widths: { ...scope.widths, [id]: width } })
              }
            />
            <TableBody>
              {rows.map((event) => (
                <TableRow key={event.id}>
                  <TableCell className="px-5 py-4">
                    <p className="break-words font-medium">{event.title}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                      {event.description}
                    </p>
                  </TableCell>
                  <TableCell className="px-5 py-4">
                    <p className="text-sm">{time(event)}</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {host(event)?.timezone} · {event.durationMinutes}{" "}
                      {copy.minutes}
                    </p>
                  </TableCell>
                  <TableCell className="px-5 py-4">
                    <span className="block truncate">
                      {host(event)?.publicName ?? "—"}
                    </span>
                  </TableCell>
                  <TableCell className="px-5 py-4 text-right tabular-nums">
                    {event.confirmedCount} / {event.capacity}
                  </TableCell>
                  <TableCell className="px-5 py-4">
                    <EventState event={event} copy={copy} locale={locale} />
                  </TableCell>
                  <TableCell className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      {renderActions(event)}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!rows.length && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-36 text-center text-slate-500"
                  >
                    {copy.empty}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </IndiceOperationalTable>
        </IndiceTableShell>
      ) : (
        <>
          {!rows.length ? (
            <div
              role="status"
              className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900"
            >
              {copy.empty}
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {rows.map((event) => (
                <article
                  key={event.id}
                  className="min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#FF6B5E]/10 bg-[#FF6B5E]/5 px-5 py-3">
                    <span className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                      <CalendarDays className="h-4 w-4 text-[#B63B32] dark:text-[#FFB0AA]" />
                      {time(event)}
                    </span>
                    <EventState event={event} copy={copy} locale={locale} />
                  </div>
                  <div className="space-y-4 p-5">
                    <div>
                      <h3 className="break-words text-lg font-medium">
                        {event.title}
                      </h3>
                      <p className="mt-2 line-clamp-3 text-sm text-slate-500 dark:text-slate-400">
                        {event.description}
                      </p>
                    </div>
                    <div className="flex flex-wrap justify-between gap-2 text-sm">
                      <span>{host(event)?.publicName ?? "—"}</span>
                      <span className="text-slate-500 dark:text-slate-400">
                        {event.durationMinutes} {copy.minutes} ·{" "}
                        {host(event)?.timezone}
                      </span>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
                      <div className="mb-2 flex items-center justify-between gap-2 text-sm">
                        <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                          <Users className="h-4 w-4" />
                          {copy.reserved}
                        </span>
                        <span className="tabular-nums">
                          {event.confirmedCount} / {event.capacity}
                        </span>
                      </div>
                      <div
                        className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
                        aria-hidden
                      >
                        <div
                          className="h-full rounded-full bg-[#59C3A5]"
                          style={{
                            width: `${event.capacity > 0 ? Math.min(100, (event.confirmedCount / event.capacity) * 100) : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      {renderActions(event)}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
          {pagination}
        </>
      )}
    </div>
  );
}
