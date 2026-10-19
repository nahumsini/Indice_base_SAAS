import type { Event } from "../services/schedulingApi";

export type EventColumn = "title" | "start" | "host" | "capacity" | "status";
export type EventScope = {
  search: string;
  period: string;
  status: string;
  staff: number;
  view: "cards" | "table";
  page: number;
  size: number;
  sort: EventColumn;
  direction: "asc" | "desc";
  widths: Record<EventColumn, number>;
};
export const defaultEventScope: EventScope = {
  search: "",
  period: "all",
  status: "all",
  staff: 0,
  view: "cards",
  page: 1,
  size: 25,
  sort: "start",
  direction: "asc",
  widths: { title: 300, start: 240, host: 220, capacity: 190, status: 170 },
};
export const eventState = (event: Event) =>
  event.status === "CANCELLED"
    ? "cancelled"
    : event.published
      ? "published"
      : "draft";
export function restoreEventScope(state: EventScope): EventScope {
  return {
    ...defaultEventScope,
    search: typeof state.search === "string" ? state.search.slice(0, 180) : "",
    period: ["all", "upcoming", "past"].includes(state.period)
      ? state.period
      : "all",
    status: ["all", "published", "draft", "cancelled"].includes(state.status)
      ? state.status
      : "all",
    staff:
      Number.isSafeInteger(Number(state.staff)) && Number(state.staff) > 0
        ? Number(state.staff)
        : 0,
    view: state.view === "table" ? "table" : "cards",
    page:
      Number.isInteger(state.page) && state.page > 0 && state.page <= 10000
        ? state.page
        : 1,
    size: [10, 25, 50, 100, 200].includes(state.size) ? state.size : 25,
    sort: Object.prototype.hasOwnProperty.call(
      defaultEventScope.widths,
      state.sort,
    )
      ? state.sort
      : "start",
    direction: state.direction === "desc" ? "desc" : "asc",
    widths: Object.fromEntries(
      Object.entries(defaultEventScope.widths).map(([key, value]) => {
        const width = state.widths?.[key as EventColumn];
        return [
          key,
          Number.isFinite(width) && width >= 140 && width <= 1200
            ? width
            : value,
        ];
      }),
    ) as Record<EventColumn, number>,
  };
}
const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase();
/** The server returns a bounded, authorized set. Filter and sort it before pagination. */
export function selectEvents(
  events: Event[],
  staff: { id: number; publicName: string }[],
  scope: EventScope,
  locale: string,
  now: number,
  statusLabels?: Record<string, string>,
) {
  const names = new Map(staff.map((person) => [person.id, person.publicName]));
  const needle = normalize(scope.search.trim());
  const compare = new Intl.Collator(locale, {
    numeric: true,
    sensitivity: "base",
  });
  return events
    .filter(
      (event) =>
        (!scope.staff || scope.staff === event.staffId) &&
        (scope.status === "all" || eventState(event) === scope.status) &&
        (scope.period === "all" ||
          (scope.period === "upcoming"
            ? Date.parse(event.startAt) >= now
            : Date.parse(event.startAt) < now)) &&
        (!needle ||
          normalize(
            `${event.title} ${event.description} ${names.get(event.staffId) ?? ""}`,
          ).includes(needle)),
    )
    .sort((a, b) => {
      const result =
        scope.sort === "start"
          ? Date.parse(a.startAt) - Date.parse(b.startAt)
          : scope.sort === "capacity"
            ? a.confirmedCount - b.confirmedCount
            : compare.compare(
                scope.sort === "host"
                  ? (names.get(a.staffId) ?? "")
                  : scope.sort === "status"
                    ? (statusLabels?.[eventState(a)] ?? eventState(a))
                    : a.title,
                scope.sort === "host"
                  ? (names.get(b.staffId) ?? "")
                  : scope.sort === "status"
                    ? (statusLabels?.[eventState(b)] ?? eventState(b))
                    : b.title,
              );
      return (scope.direction === "desc" ? -result : result) || a.id - b.id;
    });
}
