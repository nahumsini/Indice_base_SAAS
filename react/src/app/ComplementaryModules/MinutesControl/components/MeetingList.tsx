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
import { getMeetingWorkspaceCopy } from "../translations/meetingWorkspaceCopy";
import { getMeetingOperationsCopy } from "../translations/meetingOperationsCopy";
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
  hideDates = false,
  locale,
  agreements = false,
  meetingScoped = false,
}: {
  scope: ListScope;
  defaults: ListScope;
  copy: MeetingCopy;
  statuses: readonly string[];
  total?: number;
  people?: { id: number; name: string }[];
  hideDates?: boolean;
  locale: string;
  agreements?: boolean;
  meetingScoped?: boolean;
  onChange: (scope: ListScope) => void;
}) {
  const c = useIndiceFilterDisclosureCopy(),
    w = getMeetingWorkspaceCopy(locale),
    op = getMeetingOperationsCopy(locale);
  const change = (key: string, value: string | number) =>
    onChange({ ...scope, [key]: value, page: 1 });
  const [advanced, setAdvanced] = useState(false);
  const fixedOpen =
    agreements &&
    ["allOpen", "allOverdue", "overdueAgreements"].includes(scope.attention) &&
    (!scope.status || scope.status === "OPEN");
  const controls: { key: string; active: boolean; node: ReactNode }[] = [
    {
      key: "search",
      active: Boolean(scope.search),
      node: (
        <IndiceFilterSearch
          label={copy.search}
          placeholder={copy.name}
          tone="blue"
          value={scope.search}
          onValueChange={(value) => change("search", value.slice(0, 180))}
          clearLabel={c.clearFilters}
          onClear={() => change("search", "")}
        />
      ),
    },
  ];
  if (agreements && !meetingScoped)
    controls.push({
      key: "attention",
      active: scope.attention !== defaults.attention,
      node: (
        <IndiceFilterSelect
          tone="blue"
          label={w.quickView}
          value={scope.attention || "period"}
          onValueChange={(value) =>
            onChange({
              ...scope,
              attention: value === "period" ? "" : value,
              status: "",
              page: 1,
            })
          }
          options={[
            { value: "allOpen", label: op.allOpen },
            { value: "allOverdue", label: op.allOverdue },
            { value: "period", label: op.period },
            ...(scope.attention === "overdueAgreements"
              ? [{ value: "overdueAgreements", label: copy.overdueAgreements }]
              : []),
          ]}
        />
      ),
    });
  if (!hideDates)
    for (const key of ["from", "to"] as const)
      controls.push({
        key,
        active: scope[key] !== defaults[key],
        node: (
          <Field label={copy[key]}>
            <input
              className={control}
              type="date"
              value={scope[key]}
              onChange={(e) => change(key, e.target.value)}
            />
          </Field>
        ),
      });
  if (!fixedOpen)
    controls.push({
      key: "status",
      active: Boolean(scope.status),
      node: (
        <IndiceFilterSelect
          label={copy.status}
          tone="blue"
          value={scope.status || "all"}
          onValueChange={(value) =>
            change("status", value === "all" ? "" : value)
          }
          options={[
            { value: "all", label: copy.all },
            ...statuses.map((value) => ({
              value,
              label: copy[value as keyof MeetingCopy],
            })),
          ]}
        />
      ),
    });
  controls.push({
    key: "person",
    active: Boolean(scope.person),
    node: (
      <IndiceFilterSelect
        label={agreements ? copy.assignee : copy.owner}
        tone="blue"
        value={String(scope.person)}
        onValueChange={(value) => change("person", Number(value))}
        options={[
          { value: "0", label: copy.all },
          ...people.map((person) => ({
            value: String(person.id),
            label: person.name,
          })),
        ]}
      />
    ),
  });
  if (!agreements)
    controls.push({
      key: "attention",
      active: Boolean(scope.attention),
      node: (
        <IndiceFilterSelect
          tone="blue"
          label={w.attention}
          value={scope.attention || "all"}
          onValueChange={(value) =>
            change("attention", value === "all" ? "" : value)
          }
          options={[
            { value: "all", label: copy.all },
            { value: "awaitingClosure", label: copy.awaitingClosure },
            { value: "missingMinutes", label: copy.missingMinutes },
          ]}
        />
      ),
    });
  const secondary = controls.slice(4),
    activeSecondary = secondary
      .filter((item) => item.active)
      .map((item) => item.key)
      .join(",");
  useEffect(() => {
    if (activeSecondary) setAdvanced(true);
  }, [activeSecondary]);
  return (
    <IndiceFilterBar
      title={copy.filters}
      gridClassName="md:grid-cols-2 xl:grid-cols-4"
      summary={
        <IndiceFilterDisclosureActions
          tone="blue"
          showAdvancedToggle={secondary.length > 0}
          activeAdvancedCount={secondary.filter((item) => item.active).length}
          advancedLabel={advanced ? c.hideFilters : c.moreFilters}
          isAdvancedOpen={advanced}
          onToggleAdvanced={() => setAdvanced((value) => !value)}
          clearLabel={c.clearFilters}
          hasActiveFilters={[
            "from",
            "to",
            "search",
            "status",
            "person",
            "attention",
          ].some(
            (key) =>
              scope[key as keyof ListScope] !==
              defaults[key as keyof ListScope],
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
      {controls.slice(0, 4).map((item) => (
        <div key={item.key} className="min-w-0">
          {item.node}
        </div>
      ))}
      {advanced && secondary.length > 0 && (
        <IndiceFilterAdvancedSection className="md:col-span-2 xl:col-span-4">
          {secondary.map((item) => (
            <div key={item.key} className="min-w-0">
              {item.node}
            </div>
          ))}
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
      "allOpen",
      "allOverdue",
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
