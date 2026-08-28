import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Boxes,
  Columns3,
  Grid2X2,
  List,
  LockKeyhole,
  PackageCheck,
  Plus,
  Power,
  PowerOff,
  X,
} from "lucide-react";
import type { PlatformCatalogProduct, PlatformModule, PlatformModules } from "../../api/platformAdmin";
import { IndiceFilterBar, IndiceFilterSearch, IndiceFilterSelect } from "../../components/frontend-os";
import {
  getIndiceTableMinimumWidth,
  IndiceOperationalTable,
  IndiceTableActionGroup,
  IndiceTableColGroup,
  IndiceTableHeaderRow,
  IndiceTableShell,
  type IndiceTableColumnDefinition,
} from "../../components/table/IndiceTableEngine";
import { DataTablePagination } from "../../components/table/DataTablePagination";
import { TableBody, TableCell, TableRow } from "../../components/ui/table";
import { usePersistentColumnWidths } from "../../hooks/usePersistentColumnWidths";
import { ModuleWorkOrderModal, useModuleWorkOrderCopy, useModuleWorkOrders } from "../ModuleWorkOrders";
import { ModuleColumnsModal } from "./ModuleColumnsModal";
import {
  buildModuleAvailabilityRows,
  defaultModuleAvailabilityColumnIds,
  getModuleVisual,
  loadModuleAvailabilityColumnIds,
  moduleAvailabilityActionsWidth,
  moduleAvailabilityColumnLabels,
  moduleAvailabilityDefaultWidths,
  moduleAvailabilityMaximumWidths,
  moduleAvailabilityMinimumWidths,
  saveModuleAvailabilityColumnIds,
  type ModuleAvailabilityColumnId,
  type ModuleAvailabilityRow,
  type ModuleAvailabilitySortDirection,
  type ModuleAvailabilitySortKey,
  type ModuleCommercialState,
} from "./moduleAvailabilityModel";

type ModuleAvailabilityChange = { module: PlatformModule; active: boolean } | null;
type ViewMode = "table" | "cards";
type AvailabilityFilter = "all" | "active" | "inactive";
type CommercialStateFilter = "all" | "core" | "ready" | "unassigned";

const localeLabels: Record<string, string> = {
  "en-CA": "English (Canada)",
  "en-US": "English (United States)",
  "es-MX": "Español (México)",
  "es-CO": "Español (Colombia)",
  "fr-CA": "Français (Canada)",
  "pt-BR": "Português (Brasil)",
  "ko-CA": "한국어",
  "zh-CA": "中文",
};

function commercialStateCopy(state: ModuleCommercialState, english: boolean) {
  const copy = {
    core: english ? "Required" : "Obligatorio",
    ready: english ? "Ready to offer" : "Listo para ofrecer",
    unassigned: english ? "Without product" : "Sin producto",
    unavailable: english ? "Unavailable" : "No disponible",
  };
  return copy[state];
}

function commercialStateClassName(state: ModuleCommercialState) {
  return {
    core: "bg-blue-100 text-blue-700",
    ready: "bg-emerald-100 text-emerald-700",
    unassigned: "bg-amber-100 text-amber-800",
    unavailable: "bg-slate-200 text-slate-600",
  }[state];
}

function compareRows(
  left: ModuleAvailabilityRow,
  right: ModuleAvailabilityRow,
  key: ModuleAvailabilitySortKey,
) {
  const values: Record<ModuleAvailabilitySortKey, [string | number, string | number]> = {
    module: [left.name, right.name],
    category: [left.categoryLabel, right.categoryLabel],
    use: [left.useLabel, right.useLabel],
    products: [left.productCount, right.productCount],
    status: [left.commercialState, right.commercialState],
    configuration: [left.configurationLabel, right.configurationLabel],
  };
  const [leftValue, rightValue] = values[key];
  return typeof leftValue === "number" && typeof rightValue === "number"
    ? leftValue - rightValue
    : String(leftValue).localeCompare(String(rightValue), undefined, { sensitivity: "base" });
}

function ModuleAction({
  canManage,
  english,
  onChange,
  row,
  saving,
}: {
  canManage: boolean;
  english: boolean;
  onChange: (change: ModuleAvailabilityChange) => void;
  row: ModuleAvailabilityRow;
  saving: boolean;
}) {
  const protectedCore = row.module.is_core;
  const label = protectedCore
    ? english ? "Required module" : "Módulo obligatorio"
    : row.module.is_active
      ? english ? "Remove from offer" : "Retirar de la oferta"
      : english ? "Enable for offer" : "Habilitar para la oferta";
  const Icon = protectedCore ? LockKeyhole : row.module.is_active ? PowerOff : Power;

  return (
    <IndiceTableActionGroup>
      <button
        type="button"
        aria-label={`${label}: ${row.name}`}
        title={label}
        disabled={!canManage || saving || protectedCore}
        onClick={() => onChange({ module: row.module, active: !row.module.is_active })}
        className={`grid h-9 w-9 place-items-center rounded-lg border transition disabled:cursor-not-allowed disabled:opacity-45 ${
          protectedCore
            ? "border-slate-200 bg-white text-slate-400"
            : row.module.is_active
              ? "border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
              : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
        }`}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
      </button>
    </IndiceTableActionGroup>
  );
}

function ModuleCell({ row }: { row: ModuleAvailabilityRow }) {
  const visual = getModuleVisual(row.module);
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className={`grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl border text-lg ${visual.border} ${visual.background}`} aria-hidden="true">
        {visual.emoji}
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-slate-950" title={row.name}>{row.name}</p>
        <p className="mt-0.5 truncate text-xs text-slate-500" title={row.description}>{row.description}</p>
      </div>
    </div>
  );
}

export function ModuleAvailabilityWorkspace({
  canManage,
  data,
  english,
  onChange,
  products,
  saving,
}: {
  canManage: boolean;
  data: PlatformModules | null;
  english: boolean;
  onChange: (change: ModuleAvailabilityChange) => void;
  products: PlatformCatalogProduct[];
  saving: boolean;
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [availability, setAvailability] = useState<AvailabilityFilter>("all");
  const [usage, setUsage] = useState("all");
  const [commercialState, setCommercialState] = useState<CommercialStateFilter>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<ModuleAvailabilityColumnId[]>(loadModuleAvailabilityColumnIds);
  const [sort, setSort] = useState<{ key: ModuleAvailabilitySortKey; direction: ModuleAvailabilitySortDirection }>({ key: "module", direction: "asc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [workOrderOpen, setWorkOrderOpen] = useState(false);
  const { create, error: workOrderError, loading: workOrdersLoading, remove, workOrders } = useModuleWorkOrders();
  const workOrderCopy = useModuleWorkOrderCopy();
  const labels = moduleAvailabilityColumnLabels(english);
  const rows = useMemo(
    () => buildModuleAvailabilityRows(data?.modules ?? [], products, english),
    [data?.modules, english, products],
  );

  const categoryOptions = useMemo(() => {
    const options = Array.from(
      new Map(rows.map((row) => [row.module.category, row.categoryLabel])).entries(),
    )
      .sort((left, right) => left[1].localeCompare(right[1]))
      .map(([value, label]) => ({ value, label }));
    return [
      { value: "all", label: english ? "All categories" : "Todas las categorías" },
      ...options,
    ];
  }, [english, rows]);

  // Search, category and use define the base scope. Availability and commercial
  // status are facets over that scope, so their counts remain discoverable.
  const scopeRows = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase();
    return rows.filter((row) => {
      const matchesSearch = !normalizedSearch || [row.name, row.description, row.module.slug, row.module.route_key, row.configurationLabel]
        .filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase().includes(normalizedSearch));
      const matchesCategory = category === "all" || row.module.category === category;
      const matchesUsage = usage === "all" || (usage === "assignable" ? row.module.assignment_enabled : !row.module.assignment_enabled);
      return matchesSearch && matchesCategory && matchesUsage;
    });
  }, [category, rows, search, usage]);

  const filteredRows = useMemo(
    () => scopeRows
      .filter((row) => availability === "all" || (availability === "active" ? row.module.is_active : !row.module.is_active))
      .filter((row) => commercialState === "all" || row.commercialState === commercialState)
      .sort((left, right) => compareRows(left, right, sort.key) * (sort.direction === "asc" ? 1 : -1)),
    [availability, commercialState, scopeRows, sort],
  );
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const pageRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => setPage(1), [availability, category, commercialState, search, usage]);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const { columnWidths, resizeColumn } = usePersistentColumnWidths<ModuleAvailabilityColumnId>({
    defaults: moduleAvailabilityDefaultWidths,
    headerLabels: labels,
    maxWidths: moduleAvailabilityMaximumWidths,
    minWidths: moduleAvailabilityMinimumWidths,
    sortableColumnIds: defaultModuleAvailabilityColumnIds,
    storageKey: "indice-platform-admin-module-column-widths-v1",
  });
  const tableColumns: Array<IndiceTableColumnDefinition<ModuleAvailabilityColumnId>> = visibleColumns.map((columnId) => ({
    id: columnId,
    label: labels[columnId],
    width: columnWidths[columnId],
    defaultWidth: moduleAvailabilityDefaultWidths[columnId],
    contentMinimumWidth: moduleAvailabilityMinimumWidths[columnId],
    maxWidth: moduleAvailabilityMaximumWidths[columnId],
    sortable: true,
    resizeLabel: english ? `Resize ${labels[columnId]} column` : `Ajustar columna ${labels[columnId]}`,
  }));
  const minimumWidth = getIndiceTableMinimumWidth({ columns: tableColumns, actionsWidth: moduleAvailabilityActionsWidth });
  const counts = {
    total: scopeRows.length,
    active: scopeRows.filter((row) => row.module.is_active).length,
    inactive: scopeRows.filter((row) => !row.module.is_active).length,
    core: scopeRows.filter((row) => row.commercialState === "core").length,
    ready: scopeRows.filter((row) => row.commercialState === "ready").length,
    unassigned: scopeRows.filter((row) => row.commercialState === "unassigned").length,
  };
  const hasActiveFilters = Boolean(
    search || category !== "all" || availability !== "all" || usage !== "all" || commercialState !== "all",
  );

  const clearFilters = () => {
    setSearch("");
    setCategory("all");
    setAvailability("all");
    setUsage("all");
    setCommercialState("all");
  };

  const changeAvailability = (value: string) => {
    const next = value as AvailabilityFilter;
    setAvailability(next);
    if (next === "inactive") setCommercialState("all");
  };

  const changeCommercialState = (value: string) => {
    const next = value as CommercialStateFilter;
    setCommercialState(next);
    if (next !== "all") setAvailability("active");
  };

  const handleSort = (key: ModuleAvailabilitySortKey) => {
    setSort((current) => current.key === key
      ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
      : { key, direction: "asc" });
  };

  const renderCell = (row: ModuleAvailabilityRow, columnId: ModuleAvailabilityColumnId) => {
    if (columnId === "module") return <ModuleCell row={row} />;
    if (columnId === "category") return row.categoryLabel;
    if (columnId === "use") return row.useLabel;
    if (columnId === "products") return (
      <span className="inline-flex items-center gap-2">
        <PackageCheck className="h-4 w-4 text-blue-500" />
        {row.productCount} {english ? "linked" : "vinculado(s)"}
      </span>
    );
    if (columnId === "status") return (
      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${commercialStateClassName(row.commercialState)}`}>
        {commercialStateCopy(row.commercialState, english)}
      </span>
    );
    return <span className="block truncate" title={row.configurationLabel}>{row.configurationLabel}</span>;
  };

  const kpis: Array<{
    id: "active" | "inactive" | "core" | "unassigned";
    group: "availability" | "commercial";
    label: string;
    description: string;
    value: number;
    icon: typeof Activity;
    tone: string;
  }> = [
    { id: "active", group: "availability", label: english ? "Available" : "Disponibles", description: english ? "Enabled for use" : "Habilitados para usarse", value: counts.active, icon: Activity, tone: "bg-[#59C3A5]/15 text-[#177D66]" },
    { id: "inactive", group: "availability", label: english ? "Unavailable" : "No disponibles", description: english ? "Disabled from the offer" : "Desactivados de la oferta", value: counts.inactive, icon: PowerOff, tone: "bg-slate-100 text-slate-600" },
    { id: "core", group: "commercial", label: english ? "Required" : "Obligatorios", description: english ? "Always enabled" : "Siempre habilitados", value: counts.core, icon: LockKeyhole, tone: "bg-violet-50 text-violet-700" },
    { id: "unassigned", group: "commercial", label: english ? "Without product" : "Sin producto", description: english ? "Enabled but not linked" : "Activos sin producto vinculado", value: counts.unassigned, icon: Boxes, tone: "bg-amber-50 text-amber-800" },
  ];

  return (
    <div className="space-y-4">
      {!canManage ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {english ? "You can review availability, but cannot change the commercial offer." : "Puedes consultar la disponibilidad, pero no cambiar la oferta comercial."}
        </div>
      ) : null}

      <IndiceFilterBar
        title={english ? "Filters" : "Filtros"}
        subtitle={english ? "Find a module and narrow the commercial availability." : "Encuentra un módulo y limita la disponibilidad comercial."}
        gridClassName="lg:grid-cols-6"
        summary={(
          <div className="flex items-center gap-3">
            <span>{filteredRows.length} / {rows.length}</span>
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 transition hover:border-[#59C3A5] hover:text-[#177D66] dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300"
              >
                <X className="h-3.5 w-3.5" />
                {english ? "Clear filters" : "Limpiar filtros"}
              </button>
            ) : null}
          </div>
        )}
      >
        <IndiceFilterSearch
          className="lg:col-span-2"
          label={english ? "Search" : "Buscar"}
          placeholder={english ? "Name, route or description" : "Nombre, ruta o descripción"}
          tone="aqua"
          value={search}
          onValueChange={setSearch}
          onClear={() => setSearch("")}
        />
        <IndiceFilterSelect
          label={english ? "Category" : "Categoría"}
          tone="aqua"
          value={category}
          onValueChange={setCategory}
          options={categoryOptions}
        />
        <IndiceFilterSelect
          label={english ? "Availability" : "Disponibilidad"}
          tone="aqua"
          value={availability}
          onValueChange={changeAvailability}
          options={[
            { value: "all", label: `${english ? "All modules" : "Todos los módulos"} (${counts.total})` },
            { value: "active", label: `${english ? "Available" : "Disponibles"} (${counts.active})` },
            { value: "inactive", label: `${english ? "Unavailable" : "No disponibles"} (${counts.inactive})` },
          ]}
        />
        <IndiceFilterSelect
          label={english ? "Use" : "Uso"}
          tone="aqua"
          value={usage}
          onValueChange={setUsage}
          options={[
            { value: "all", label: english ? "All uses" : "Todos los usos" },
            { value: "assignable", label: english ? "Customer assignable" : "Asignable a clientes" },
            { value: "internal", label: english ? "Internal use" : "Uso interno" },
          ]}
        />
        <IndiceFilterSelect
          label={english ? "Commercial status" : "Estado comercial"}
          tone="aqua"
          value={commercialState}
          onValueChange={changeCommercialState}
          options={[
            { value: "all", label: english ? "All statuses" : "Todos los estados" },
            { value: "core", label: `${english ? "Required" : "Obligatorio"} (${counts.core})` },
            { value: "ready", label: `${english ? "Ready to offer" : "Listo para ofrecer"} (${counts.ready})` },
            { value: "unassigned", label: `${english ? "Without product" : "Sin producto"} (${counts.unassigned})` },
          ]}
        />
      </IndiceFilterBar>

      <section aria-label={english ? "Availability indicators" : "Indicadores de disponibilidad"} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          const selected = kpi.group === "availability"
            ? availability === kpi.id && commercialState === "all"
            : commercialState === kpi.id;
          return (
            <button
              key={kpi.id}
              type="button"
              aria-pressed={selected}
              onClick={() => {
                if (selected) {
                  setAvailability("all");
                  setCommercialState("all");
                  return;
                }
                if (kpi.group === "availability") {
                  setAvailability(kpi.id as AvailabilityFilter);
                  setCommercialState("all");
                  return;
                }
                setAvailability("active");
                setCommercialState(kpi.id as CommercialStateFilter);
              }}
              className={`flex min-h-24 items-center gap-3 rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:border-[#59C3A5]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#59C3A5]/30 dark:bg-slate-900 ${selected ? "border-[#59C3A5] ring-2 ring-[#59C3A5]/15" : "border-slate-200 dark:border-slate-700"}`}
            >
              <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${kpi.tone}`}><Icon className="h-5 w-5" /></span>
              <span className="min-w-0">
                <span className="block text-sm text-slate-500">{kpi.label}</span>
                <span className="mt-1 block text-2xl font-medium text-slate-950">{kpi.value}</span>
                <span className="mt-1 block truncate text-xs text-slate-400">{kpi.description}</span>
              </span>
            </button>
          );
        })}
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-medium text-slate-950">{english ? "Module availability" : "Disponibilidad de módulos"}</h2>
          <p className="mt-1 text-sm text-slate-500">
            {filteredRows.length} {english ? "of" : "de"} {rows.length} {english ? "modules" : "módulos"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
            <button type="button" aria-pressed={viewMode === "table"} onClick={() => setViewMode("table")} className={`inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium ${viewMode === "table" ? "bg-[#177D66] text-white" : "text-slate-600 dark:text-slate-300"}`}>
              <List className="h-4 w-4" />{english ? "Table" : "Tabla"}
            </button>
            <button type="button" aria-pressed={viewMode === "cards"} onClick={() => setViewMode("cards")} className={`inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium ${viewMode === "cards" ? "bg-[#177D66] text-white" : "text-slate-600 dark:text-slate-300"}`}>
              <Grid2X2 className="h-4 w-4" />{english ? "Cards" : "Tarjetas"}
            </button>
          </div>
          {viewMode === "table" ? (
            <button type="button" onClick={() => setColumnsOpen(true)} className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#59C3A5]/40 bg-white px-4 text-sm font-medium text-[#176B5B] hover:bg-[#59C3A5]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#59C3A5]/25 dark:bg-slate-900 dark:text-[#8FE0CA]">
              <Columns3 className="h-4 w-4" />{english ? "Columns" : "Columnas"}
            </button>
          ) : null}
          {canManage ? (
            <button type="button" onClick={() => setWorkOrderOpen(true)} className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#177D66] px-4 text-sm font-medium text-white hover:bg-[#126553] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#59C3A5]/30">
              <Plus className="h-4 w-4" />{workOrderCopy.add}
            </button>
          ) : null}
        </div>
      </section>

      {workOrderError ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{workOrderError}</div> : null}
      {workOrdersLoading ? <p className="text-sm text-slate-500">{english ? "Loading module requests…" : "Cargando solicitudes de módulos…"}</p> : null}
      {workOrders.length ? (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-3">
            <h3 className="text-sm font-medium text-slate-950">{workOrderCopy.sectionTitle}</h3>
            <p className="mt-1 text-xs text-slate-500">{workOrderCopy.sectionDescription}</p>
          </div>
          <div className="divide-y divide-slate-100 px-4">
            {workOrders.map((order) => (
              <article key={order.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-blue-100 bg-blue-50 text-lg">🧩</span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-sm font-medium text-slate-950">{order.moduleName}</h3>
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">{workOrderCopy.draft}</span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-slate-500">{english ? "Initial language" : "Idioma inicial"}: {localeLabels[order.sourceLocale] || order.sourceLocale}</p>
                  </div>
                </div>
                <button type="button" onClick={() => void remove(order.id)} className="inline-flex h-9 items-center justify-center rounded-lg border border-red-200 px-3 text-xs font-medium text-red-600 hover:bg-red-50">{workOrderCopy.remove}</button>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {viewMode === "table" ? (
        <IndiceTableShell
          pagination={filteredRows.length ? (
            <DataTablePagination
              currentPage={page}
              totalPages={totalPages}
              pageSize={pageSize}
              pageSizeOptions={[10, 25, 50, 100, 200]}
              totalCount={filteredRows.length}
              pageStart={(page - 1) * pageSize + 1}
              pageEnd={Math.min(page * pageSize, filteredRows.length)}
              itemLabel={english ? "modules" : "módulos"}
              onPageChange={setPage}
              onPageSizeChange={(nextSize) => { setPageSize(nextSize); setPage(1); }}
            />
          ) : undefined}
        >
          <IndiceOperationalTable minimumWidth={minimumWidth}>
            <IndiceTableColGroup columns={tableColumns} actionsWidth={moduleAvailabilityActionsWidth} />
            <IndiceTableHeaderRow
              actions={{ label: english ? "Actions" : "Acciones", width: moduleAvailabilityActionsWidth }}
              columns={tableColumns}
              onResize={resizeColumn}
              onSort={handleSort}
              sortState={{ columnId: sort.key, direction: sort.direction }}
              tone="blue"
            />
            <TableBody>
              {pageRows.map((row) => (
                <TableRow key={row.module.id} className="border-slate-100 hover:bg-[#59C3A5]/5 dark:border-slate-800 dark:hover:bg-[#59C3A5]/10">
                  {visibleColumns.map((columnId) => (
                    <TableCell key={columnId} className="h-[72px] px-4 py-3 text-[13px] font-normal text-slate-700" style={{ width: columnWidths[columnId], minWidth: columnWidths[columnId], maxWidth: columnWidths[columnId] }}>
                      {renderCell(row, columnId)}
                    </TableCell>
                  ))}
                  <TableCell className="h-[72px] px-4 py-3 text-right" style={{ width: moduleAvailabilityActionsWidth, minWidth: moduleAvailabilityActionsWidth, maxWidth: moduleAvailabilityActionsWidth }}>
                    <ModuleAction row={row} canManage={canManage} saving={saving} english={english} onChange={onChange} />
                  </TableCell>
                </TableRow>
              ))}
              {!pageRows.length ? (
                <TableRow><TableCell colSpan={visibleColumns.length + 1} className="px-6 py-14 text-center text-sm text-slate-500">{english ? "No modules match these filters." : "No hay módulos con estos filtros."}</TableCell></TableRow>
              ) : null}
            </TableBody>
          </IndiceOperationalTable>
        </IndiceTableShell>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {pageRows.map((row) => {
            const visual = getModuleVisual(row.module);
            return (
              <article key={row.module.id} className="flex min-h-56 flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <span className={`grid h-11 w-11 place-items-center overflow-hidden rounded-xl border text-lg ${visual.border} ${visual.background}`}>{visual.emoji}</span>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${commercialStateClassName(row.commercialState)}`}>{commercialStateCopy(row.commercialState, english)}</span>
                </div>
                <h3 className="mt-3 text-base font-medium text-slate-950">{row.name}</h3>
                <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-500">{row.description}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1">{row.categoryLabel}</span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1">{row.useLabel}</span>
                  <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700">{row.productCount} {english ? "products" : "productos"}</span>
                </div>
                <div className="mt-auto pt-4"><ModuleAction row={row} canManage={canManage} saving={saving} english={english} onChange={onChange} /></div>
              </article>
            );
          })}
          {!pageRows.length ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center text-sm text-slate-500 sm:col-span-2 xl:col-span-3">{english ? "No modules match these filters." : "No hay módulos con estos filtros."}</div> : null}
        </div>
      )}

      {viewMode === "cards" && filteredRows.length ? (
        <DataTablePagination
          attached={false}
          currentPage={page}
          totalPages={totalPages}
          pageSize={pageSize}
          pageSizeOptions={[10, 25, 50, 100, 200]}
          totalCount={filteredRows.length}
          pageStart={(page - 1) * pageSize + 1}
          pageEnd={Math.min(page * pageSize, filteredRows.length)}
          itemLabel={english ? "modules" : "módulos"}
          onPageChange={setPage}
          onPageSizeChange={(nextSize) => { setPageSize(nextSize); setPage(1); }}
        />
      ) : null}

      <ModuleColumnsModal
        english={english}
        isOpen={columnsOpen}
        onClose={() => setColumnsOpen(false)}
        visibleColumns={visibleColumns}
        onVisibleColumnsChange={(nextColumns) => {
          setVisibleColumns(nextColumns);
          saveModuleAvailabilityColumnIds(nextColumns);
        }}
      />
      {workOrderOpen ? (
        <ModuleWorkOrderModal
          english={english}
          onClose={() => setWorkOrderOpen(false)}
          onCreate={async (input) => {
            await create(input);
            setWorkOrderOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}
