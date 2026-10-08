import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  IndiceFilterBar,
  IndiceFilterSearch,
  IndiceFilterSelect,
} from "../../../components/frontend-os/IndiceFilterBar";
import {
  IndiceFilterAdvancedSection,
  IndiceFilterDisclosureActions,
  useIndiceFilterDisclosureCopy,
} from "../../../components/frontend-os/IndiceFilterDisclosure";
import {
  IndiceOperationalTable,
  IndiceTableColGroup,
  IndiceTableHeaderRow,
  IndiceTableShell,
  type IndiceTableColumnDefinition,
} from "../../../components/table/IndiceTableEngine";
import { DataTablePagination } from "../../../components/table/DataTablePagination";
import { TableBody, TableRow, TableCell } from "../../../components/ui/table";
import type { MeetingCopy } from "../translations/meetingCopy";
import { Field, control } from "./MeetingPrimitives";

export type ListScope = {
  from: string;
  to: string;
  search: string;
  status: string;
  attention: string;
  person: number;
  page: number;
  size: number;
  view: string;
  sort: string;
  direction: string;
  widths: Record<string, number>;
};
export function ScopeFilters({
  scope,
  defaults,
  copy,
  statuses,
  total,
  people = [],
  onChange,
}: {
  scope: ListScope;
  defaults: ListScope;
  copy: MeetingCopy;
  statuses: readonly string[];
  total?: number;
  people?: { id: number; name: string }[];
  onChange: (scope: ListScope) => void;
}) {
  const c = useIndiceFilterDisclosureCopy(),
    change = (key: string, value: string | number) =>
      onChange({ ...scope, [key]: value, page: 1 }),
    [advanced, setAdvanced] = useState(false);
  useEffect(() => {
    if (scope.person || scope.status || scope.attention) setAdvanced(true);
  }, [scope.person, scope.status, scope.attention]);
  return (
    <IndiceFilterBar
      title={copy.filters}
      subtitle={
        scope.attention ? copy[scope.attention as keyof MeetingCopy] : undefined
      }
      gridClassName="lg:grid-cols-3"
      summary={
        <IndiceFilterDisclosureActions
          tone="blue"
          activeAdvancedCount={
            Number(Boolean(scope.person)) + Number(Boolean(scope.status))
          }
          advancedLabel={advanced ? c.hideFilters : c.moreFilters}
          isAdvancedOpen={advanced}
          onToggleAdvanced={() => setAdvanced((v) => !v)}
          clearLabel={c.clearFilters}
          hasActiveFilters={[
            "from",
            "to",
            "search",
            "status",
            "person",
            "attention",
          ].some(
            (k) =>
              scope[k as keyof ListScope] !== defaults[k as keyof ListScope],
          )}
          onClear={() => {
            onChange({ ...defaults, widths: scope.widths, view: scope.view });
            setAdvanced(false);
          }}
          resultSummary={
            total === undefined ? undefined : `${total} ${copy.records}`
          }
        />
      }
    >
      <IndiceFilterSearch
        label={copy.search}
        placeholder={copy.name}
        tone="blue"
        value={scope.search}
        onValueChange={(value) => change("search", value.slice(0, 180))}
        clearLabel={c.clearFilters}
        onClear={() => change("search", "")}
        inputClassName="rounded-[12px]"
      />
      <Field label={copy.from}>
        <input
          className={control}
          type="date"
          value={scope.from}
          onChange={(e) => change("from", e.target.value)}
        />
      </Field>
      <Field label={copy.to}>
        <input
          className={control}
          type="date"
          value={scope.to}
          onChange={(e) => change("to", e.target.value)}
        />
      </Field>
      {advanced && (
        <IndiceFilterAdvancedSection className="md:col-span-2 lg:col-span-3">
          <IndiceFilterSelect
            label={copy.status}
            tone="blue"
            value={scope.status || "all"}
            onValueChange={(value) =>
              change("status", value === "all" ? "" : value)
            }
            options={[
              { value: "all", label: copy.all },
              ...statuses.map((s) => ({
                value: s,
                label: copy[s as keyof MeetingCopy],
              })),
            ]}
            triggerClassName="rounded-[12px] data-[size=default]:h-11"
          />
          <IndiceFilterSelect
            label={copy.owner}
            tone="blue"
            value={String(scope.person)}
            onValueChange={(value) => change("person", Number(value))}
            options={[
              { value: "0", label: copy.all },
              ...people.map((p) => ({ value: String(p.id), label: p.name })),
            ]}
            triggerClassName="rounded-[12px] data-[size=default]:h-11"
          />
        </IndiceFilterAdvancedSection>
      )}
    </IndiceFilterBar>
  );
}
const labels: Record<string, { actions: string; resize: string }> = {
  es: { actions: "Acciones", resize: "Cambiar ancho" },
  en: { actions: "Actions", resize: "Resize" },
  fr: { actions: "Actions", resize: "Redimensionner" },
  pt: { actions: "Ações", resize: "Redimensionar" },
  ko: { actions: "작업", resize: "너비 조절" },
  zh: { actions: "操作", resize: "调整宽度" },
};
export function MeetingList<T extends { id: number }>({
  items,
  total,
  scope,
  copy,
  locale,
  columns,
  onChange,
  render,
}: {
  items: T[];
  total: number;
  scope: ListScope;
  copy: MeetingCopy;
  locale: string;
  columns: { id: string; label: string; defaultWidth: number }[];
  onChange: (scope: ListScope) => void;
  render: (item: T) => ReactNode;
}) {
  const c = labels[locale.split("-")[0]] ?? labels.en;
  const definitions = useMemo(
    () =>
      columns.map((column) => ({
        ...column,
        sortable: true,
        width: scope.widths[column.id] ?? column.defaultWidth,
        contentMinimumWidth: 160,
        resizeLabel: c.resize,
      })) as IndiceTableColumnDefinition<string>[],
    [columns, scope.widths, c],
  );
  return (
    <IndiceTableShell
      pagination={
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
      }
    >
      <IndiceOperationalTable
        minimumWidth={definitions.reduce((sum, c) => sum + c.width, 200)}
      >
        <IndiceTableColGroup columns={definitions} actionsWidth={200} />
        <IndiceTableHeaderRow
          columns={definitions}
          tone="blue"
          actions={{ label: c.actions, width: 200 }}
          sortState={{
            columnId: scope.sort,
            direction: scope.direction === "desc" ? "desc" : "asc",
          }}
          onSort={(id) =>
            onChange({
              ...scope,
              sort: id,
              direction:
                scope.sort === id && scope.direction === "asc" ? "desc" : "asc",
              page: 1,
            })
          }
          onResize={(id, width) =>
            onChange({ ...scope, widths: { ...scope.widths, [id]: width } })
          }
        />
        <TableBody>
          {items.length ? (
            items.map((item) => (
              <TableRow key={item.id}>{render(item)}</TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={columns.length + 1}
                className="h-36 text-center text-slate-500"
              >
                {copy.empty}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </IndiceOperationalTable>
    </IndiceTableShell>
  );
}
export function restoreScope(
  state: ListScope,
  defaults: ListScope,
  statuses: readonly string[],
): ListScope {
  return {
    ...defaults,
    from: /^\d{4}-\d{2}-\d{2}$/.test(state.from) ? state.from : defaults.from,
    to: /^\d{4}-\d{2}-\d{2}$/.test(state.to) ? state.to : defaults.to,
    search: typeof state.search === "string" ? state.search.slice(0, 180) : "",
    status: statuses.includes(state.status) ? state.status : "",
    attention: [
      "awaitingClosure",
      "missingMinutes",
      "overdueAgreements",
    ].includes(state.attention)
      ? state.attention
      : "",
    person:
      Number.isSafeInteger(Number(state.person)) && Number(state.person) > 0
        ? Number(state.person)
        : 0,
    sort: Object.keys(defaults.widths).includes(state.sort)
      ? state.sort
      : defaults.sort,
    direction: state.direction === "desc" ? "desc" : "asc",
    page:
      Number.isInteger(state.page) && state.page > 0 && state.page <= 10000
        ? state.page
        : 1,
    size: [10, 25, 50, 100, 200].includes(state.size) ? state.size : 25,
    view: ["calendar", "table"].includes(state.view)
      ? state.view
      : defaults.view,
    widths:
      state.widths &&
      Object.values(state.widths).every(
        (w) => Number.isFinite(w) && w >= 160 && w <= 1200,
      )
        ? state.widths
        : defaults.widths,
  };
}
