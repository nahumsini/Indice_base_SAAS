import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  IndiceFilterBar,
  IndiceFilterSearch,
  IndiceFilterSelect,
} from "../../../components/frontend-os/IndiceFilterBar";
import {
  IndiceFilterDisclosureActions,
  IndiceFilterAdvancedSection,
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
import { useWorkspaceNavigationMemory } from "../../../hooks/useWorkspaceNavigationMemory";
import { maintenanceApi, query, type Page } from "../services/maintenanceApi";
import type { MaintenanceCopy } from "../translations/maintenanceCopy";
import {
  Action,
  Feedback,
  Field,
  control,
  label,
  useMaintenanceQuery,
} from "./MaintenancePrimitives";

export type Scope = {
  sort: string;
  direction: "asc" | "desc";
  from: string;
  to: string;
  search: string;
  status: string;
  attention: string;
  assetId: number;
  page: number;
  pageSize: number;
  view: string;
  month: string;
  widths: Record<string, number>;
};
export function useMaintenanceList<T>(
  tab: string,
  path: string,
  statuses: string[],
  revision: number,
) {
  const sortFields: Record<string, string[]> = {
    orders: ["due", "title", "asset", "status", "priority", "assignee"],
    requests: ["created", "title", "asset", "status", "priority"],
    assets: ["name", "type", "location", "criticality", "status"],
    preventive: ["next", "title", "asset", "recurrence", "status"],
  };
  const defaults = useMemo<Scope>(
    () => ({
      sort: sortFields[tab][0],
      direction: tab === "requests" ? "desc" : "asc",
      from: "",
      to: "",
      search: "",
      status: "",
      attention: "",
      assetId: 0,
      page: 1,
      pageSize: 25,
      view: "table",
      month: new Date().toISOString().slice(0, 7),
      widths: {},
    }),
    [],
  );
  const [scope, setScope] = useState(defaults),
    [debounced, setDebounced] = useState("");
  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(scope.search), 300);
    return () => clearTimeout(timeout);
  }, [scope.search]);
  const memory = useWorkspaceNavigationMemory({
    moduleKey: "maintenance",
    tabKey: tab,
    state: scope,
    defaults,
    urlFields: {
      sort: "sort",
      direction: "direction",
      from: "from",
      to: "to",
      search: "q",
      status: "status",
      attention: "attention",
      assetId: "assetId",
      view: "view",
      page: "page",
    },
    onRestore: (state) =>
      setScope({
        ...defaults,
        sort: sortFields[tab].includes(state.sort) ? state.sort : defaults.sort,
        direction: state.direction === "desc" ? "desc" : "asc",
        from: /^\d{4}-\d{2}-\d{2}$/.test(state.from) ? state.from : "",
        to: /^\d{4}-\d{2}-\d{2}$/.test(state.to) ? state.to : "",
        search:
          typeof state.search === "string" ? state.search.slice(0, 180) : "",
        status: statuses.includes(state.status) ? state.status : "",
        attention: ["", "open", "overdue", "critical", "preventive"].includes(
          state.attention,
        )
          ? state.attention
          : "",
        assetId:
          Number.isSafeInteger(state.assetId) && state.assetId > 0
            ? state.assetId
            : 0,
        page:
          Number.isSafeInteger(state.page) &&
          state.page > 0 &&
          state.page <= 10000
            ? state.page
            : 1,
        pageSize: [10, 25, 50, 100, 200].includes(state.pageSize)
          ? state.pageSize
          : 25,
        view: ["table", "board", "calendar"].includes(state.view)
          ? state.view
          : "table",
        month: /^\d{4}-(0[1-9]|1[0-2])$/.test(state.month)
          ? state.month
          : defaults.month,
        widths:
          state.widths &&
          Object.values(state.widths).every(
            (w) => Number.isFinite(w) && w >= 140 && w <= 1200,
          )
            ? state.widths
            : {},
      }),
  });
  const load = useCallback(
    (signal: AbortSignal) => {
      const values: Record<string, string | number> = {
        sort: scope.sort,
        direction: scope.direction,
        search: debounced,
        status: scope.status,
        attention: scope.attention,
        assetId: scope.assetId,
        page: scope.page,
        pageSize: scope.pageSize,
      };
      if (tab === "orders" && scope.view === "calendar") {
        const [year, month] = scope.month.split("-").map(Number);
        values.from = new Date(year, month - 1, 1).toISOString();
        values.to = new Date(year, month, 1).toISOString();
      } else if (tab === "orders" && scope.from && scope.to) {
        const end = new Date(`${scope.to}T00:00:00`);
        end.setDate(end.getDate() + 1);
        values.from = new Date(`${scope.from}T00:00:00`).toISOString();
        values.to = end.toISOString();
      }
      return maintenanceApi.get<Page<T>>(path + query(values), signal);
    },
    [
      path,
      tab,
      debounced,
      scope.sort,
      scope.direction,
      scope.from,
      scope.to,
      scope.status,
      scope.attention,
      scope.assetId,
      scope.page,
      scope.pageSize,
      scope.month,
      scope.view,
      revision,
    ],
  );
  const result = useMaintenanceQuery(load);
  useEffect(() => {
    if (result.data && scope.page > 1 && !result.data.items.length)
      setScope((v) => ({
        ...v,
        page: Math.max(1, Math.ceil(result.data!.total / v.pageSize)),
      }));
  }, [result.data, scope.page]);
  return { scope, setScope, defaults, result, memory };
}
export function Filters({
  scope,
  onChange,
  c,
  statuses,
  total,
  orders = false,
}: {
  scope: Scope;
  onChange: (scope: Scope) => void;
  c: MaintenanceCopy;
  statuses: string[];
  total?: number;
  orders?: boolean;
}) {
  const copy = useIndiceFilterDisclosureCopy(),
    [advanced, setAdvanced] = useState(false);
  const change = (key: keyof Scope, value: string | number) =>
    onChange({ ...scope, [key]: value, page: 1 });
  useEffect(() => {
    if (
      scope.status ||
      scope.attention ||
      scope.assetId ||
      scope.from ||
      scope.to
    )
      setAdvanced(true);
  }, [scope.status, scope.attention, scope.assetId, scope.from, scope.to]);
  return (
    <IndiceFilterBar
      title={c.filters}
      gridClassName="lg:grid-cols-3"
      summary={
        <IndiceFilterDisclosureActions
          tone="gray"
          activeAdvancedCount={
            Number(Boolean(scope.status)) +
            Number(Boolean(scope.attention)) +
            Number(Boolean(scope.assetId)) +
            Number(Boolean(scope.from || scope.to))
          }
          advancedLabel={advanced ? copy.hideFilters : copy.moreFilters}
          isAdvancedOpen={advanced}
          onToggleAdvanced={() => setAdvanced((v) => !v)}
          clearLabel={c.clear}
          hasActiveFilters={Boolean(
            scope.search ||
            scope.status ||
            scope.attention ||
            scope.assetId ||
            scope.from ||
            scope.to,
          )}
          onClear={() =>
            onChange({
              ...scope,
              search: "",
              status: "",
              attention: "",
              assetId: 0,
              from: "",
              to: "",
              page: 1,
            })
          }
          resultSummary={
            total === undefined ? undefined : `${total} ${c.records}`
          }
        />
      }
    >
      <IndiceFilterSearch
        label={c.search}
        placeholder={c.name}
        tone="gray"
        value={scope.search}
        onValueChange={(value) => change("search", value.slice(0, 180))}
        clearLabel={c.clear}
        onClear={() => change("search", "")}
      />
      {orders && scope.view === "calendar" && (
        <Field label={c.month}>
          <input
            type="month"
            className={control}
            value={scope.month}
            onChange={(e) => {
              if (e.target.value) change("month", e.target.value);
            }}
          />
        </Field>
      )}
      {advanced && (
        <IndiceFilterAdvancedSection className="md:col-span-2 lg:col-span-3">
          <div className="grid gap-4 sm:grid-cols-2">
            {statuses.length > 0 && (
              <IndiceFilterSelect
                label={c.status}
                tone="gray"
                value={scope.status || "all"}
                onValueChange={(value) =>
                  change("status", value === "all" ? "" : value)
                }
                options={[
                  { value: "all", label: c.all },
                  ...statuses.map((value) => ({
                    value,
                    label: label(c, value),
                  })),
                ]}
              />
            )}
            {orders && (
              <IndiceFilterSelect
                label={c.attention}
                tone="gray"
                value={scope.attention || "all"}
                onValueChange={(value) =>
                  change("attention", value === "all" ? "" : value)
                }
                options={[
                  { value: "all", label: c.all },
                  { value: "open", label: c.currentOpen },
                  { value: "overdue", label: c.overdue },
                  { value: "critical", label: c.critical },
                  { value: "preventive", label: c.preventiveWork },
                ]}
              />
            )}
            {orders && scope.view !== "calendar" && (
              <>
                <Field label={c.from}>
                  <input
                    type="date"
                    className={control}
                    max={scope.to || undefined}
                    value={scope.from}
                    onChange={(e) => change("from", e.target.value)}
                  />
                </Field>
                <Field label={c.to}>
                  <input
                    type="date"
                    className={control}
                    min={scope.from || undefined}
                    value={scope.to}
                    onChange={(e) => change("to", e.target.value)}
                  />
                </Field>
                {scope.attention === "preventive" && (
                  <p className="text-xs text-slate-500">{c.originalDue}</p>
                )}
              </>
            )}
            {scope.assetId > 0 && (
              <p className="text-sm">
                {c.asset}: #{scope.assetId}
              </p>
            )}
          </div>
        </IndiceFilterAdvancedSection>
      )}
    </IndiceFilterBar>
  );
}
export function Pagination({
  scope,
  total,
  onChange,
}: {
  scope: Scope;
  total: number;
  onChange: (scope: Scope) => void;
}) {
  return (
    <DataTablePagination
      currentPage={scope.page}
      totalPages={Math.max(1, Math.ceil(total / scope.pageSize))}
      totalCount={total}
      pageSize={scope.pageSize}
      pageSizeOptions={[10, 25, 50, 100, 200]}
      pageStart={total ? (scope.page - 1) * scope.pageSize + 1 : 0}
      pageEnd={Math.min(total, scope.page * scope.pageSize)}
      onPageChange={(page) => onChange({ ...scope, page })}
      onPageSizeChange={(pageSize) => onChange({ ...scope, pageSize, page: 1 })}
    />
  );
}
export function ListTable<T extends { id: number }>({
  items,
  total,
  scope,
  onChange,
  c,
  columns,
  render,
  onOpen,
}: {
  items: T[];
  total: number;
  scope: Scope;
  onChange: (scope: Scope) => void;
  c: MaintenanceCopy;
  columns: { id: string; label: string; width: number }[];
  render: (item: T) => ReactNode;
  onOpen: (item: T) => void;
}) {
  const definitions: IndiceTableColumnDefinition<string>[] = columns.map(
    (col) => ({
      ...col,
      defaultWidth: col.width,
      width: scope.widths[col.id] ?? col.width,
      sortable: true,
      contentMinimumWidth: 140,
      resizeLabel: c.resize,
    }),
  );
  return (
    <IndiceTableShell
      pagination={
        <Pagination scope={scope} total={total} onChange={onChange} />
      }
    >
      <IndiceOperationalTable
        minimumWidth={definitions.reduce((sum, col) => sum + col.width, 130)}
      >
        <IndiceTableColGroup columns={definitions} actionsWidth={130} />
        <IndiceTableHeaderRow
          tone="gray"
          columns={definitions}
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
          actions={{ label: c.actions, width: 130 }}
          onResize={(id, width) =>
            onChange({ ...scope, widths: { ...scope.widths, [id]: width } })
          }
        />
        <TableBody>
          {items.length ? (
            items.map((item) => (
              <TableRow key={item.id}>
                {render(item)}
                <TableCell>
                  <Action onClick={() => onOpen(item)}>{c.open}</Action>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={columns.length + 1}
                className="h-36 text-center text-slate-500"
              >
                {c.empty}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </IndiceOperationalTable>
    </IndiceTableShell>
  );
}
export function QueryFeedback({
  result,
  c,
}: {
  result: { loading: boolean; error?: unknown; reload: () => void };
  c: MaintenanceCopy;
}) {
  return result.loading ? (
    <Feedback>{c.loading}</Feedback>
  ) : result.error ? (
    <Feedback error>
      {c.error} <Action onClick={result.reload}>{c.retry}</Action>
    </Feedback>
  ) : null;
}
