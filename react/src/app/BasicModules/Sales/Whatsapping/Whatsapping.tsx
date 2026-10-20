import { useEffect, useRef, useState } from "react";
import {
  MessageCircle,
  Plus,
  FileText,
  Users,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { useSearchParams } from "react-router";
import { ModuleTabEmoji } from "../../../components/icons/ModuleTabEmoji";
import { Button } from "../../../components/ui/button";
import { TableBody, TableCell, TableRow } from "../../../components/ui/table";
import { IndiceTitleBarOverflow } from "../../../components/frontend-os";
import {
  IndiceTableShell,
  IndiceOperationalTable,
  IndiceTableColGroup,
  IndiceTableHeaderRow,
  type IndiceTableColumnDefinition,
} from "../../../components/table/IndiceTableEngine";
import { DataTablePagination } from "../../../components/table/DataTablePagination";
import { usePersistentColumnWidths } from "../../../hooks/usePersistentColumnWidths";
import { useWorkspaceNavigationMemory } from "../../../hooks/useWorkspaceNavigationMemory";
import { useAuthorizationRevision } from "../../../hooks/useAuthorizationRevision";
import {
  SalesTitleBar,
  salesTitleBarPrimaryActionClassName,
  salesTitleBarSecondaryActionClassName,
} from "../components/SalesTitleBar";
import {
  SalesFilterBar,
  SalesFilterSearch,
  SalesFilterSelect,
} from "../components/SalesFilterBar";
import { whatsappingApi, type Page, type Detail } from "./whatsappingApi";
import { useWhatsappingCopy } from "./whatsappingCopy";
import { CampaignEditor } from "./CampaignEditor";
import { CampaignWork } from "./CampaignWork";
import { LibraryModal } from "./LibraryModal";
import { Badge, CampaignProgress, ErrorNotice, panel } from "./WhatsappingUi";
import { failure } from "./whatsappingModel";
const defaults = {
  search: "",
  status: "ALL",
  owner: "",
  page: 1,
  pageSize: 25,
  sort: "updatedAt",
  direction: "desc" as "asc" | "desc",
};
const statuses = ["ALL", "DRAFT", "ACTIVE", "PAUSED", "COMPLETED", "ARCHIVED"];
const widths = {
  name: 260,
  owner: 180,
  status: 160,
  progress: 170,
  updatedAt: 180,
};
type Column = keyof typeof widths;
export default function Whatsapping() {
  const { copy, label, locale } = useWhatsappingCopy();
  const revision = useAuthorizationRevision(),
    [params, setParams] = useSearchParams();
  const [filters, setFilters] = useState(defaults),
    [search, setSearch] = useState(""),
    [data, setData] = useState<Page | null>(null),
    [busy, setBusy] = useState(true),
    [error, setError] = useState(""),
    [refresh, setRefresh] = useState(0),
    [detail, setDetail] = useState<Detail | null>(null),
    [editor, setEditor] = useState<Detail | "new" | null>(null),
    [library, setLibrary] = useState<"templates" | "lists" | null>(null),
    [opening, setOpening] = useState(false);
  const openAbort = useRef<AbortController | null>(null);
  const operationScope = useRef(revision);
  operationScope.current = revision;
  useWorkspaceNavigationMemory({
    moduleKey: "crm",
    tabKey: "whatsapping",
    state: filters,
    defaults,
    onRestore: (v) =>
      setFilters({
        search: typeof v.search === "string" ? v.search.slice(0, 180) : "",
        status: statuses.includes(v.status) ? v.status : "ALL",
        owner: /^\d*$/.test(String(v.owner)) ? String(v.owner) : "",
        page: Math.max(1, Math.min(10000, Number(v.page) || 1)),
        pageSize: [10, 25, 50, 100, 200].includes(v.pageSize) ? v.pageSize : 25,
        sort: ["name", "status", "updatedAt"].includes(v.sort)
          ? v.sort
          : "updatedAt",
        direction: v.direction === "asc" ? "asc" : "desc",
      }),
  });
  useEffect(() => {
    const t = setTimeout(() => setSearch(filters.search), 300);
    return () => clearTimeout(t);
  }, [filters.search]);
  useEffect(() => {
    openAbort.current?.abort();
    setDetail(null);
    setEditor(null);
    setLibrary(null);
    setData(null);
    setOpening(false);
    setError("");
  }, [revision]);
  useEffect(() => () => openAbort.current?.abort(), []);
  useEffect(() => {
    const c = new AbortController();
    setBusy(true);
    setError("");
    const q = new URLSearchParams({
      search,
      status: filters.status,
      page: String(filters.page),
      pageSize: String(filters.pageSize),
      sort: filters.sort,
      direction: filters.direction,
    });
    if (filters.owner) q.set("owner", filters.owner);
    void whatsappingApi
      .list(q, c.signal)
      .then((result) => {
        if (c.signal.aborted) return;
        setData(result);
        const pages = Math.max(1, Math.ceil(result.total / filters.pageSize));
        if (filters.page > pages) setFilters((f) => ({ ...f, page: pages }));
      })
      .catch((e) => {
        if (!c.signal.aborted) {
          setData(null);
          setError(failure(e, copy));
        }
      })
      .finally(() => {
        if (!c.signal.aborted) setBusy(false);
      });
    return () => c.abort();
  }, [
    search,
    filters.status,
    filters.owner,
    filters.page,
    filters.pageSize,
    filters.sort,
    filters.direction,
    refresh,
    revision,
  ]);
  const campaignParam = params.get("campaign");
  useEffect(() => {
    if (!campaignParam || !/^[a-f0-9-]{36}$/.test(campaignParam)) return;
    const c = new AbortController();
    openAbort.current = c;
    setOpening(true);
    void whatsappingApi
      .get(campaignParam, c.signal)
      .then((value) => {
        if (!c.signal.aborted) setDetail(value);
      })
      .catch((e) => {
        if (!c.signal.aborted) setError(failure(e, copy));
      })
      .finally(() => {
        if (!c.signal.aborted) setOpening(false);
      });
    return () => c.abort();
  }, [campaignParam, revision]);
  function open(id: string) {
    setParams((p) => {
      const next = new URLSearchParams(p);
      next.set("campaign", id);
      return next;
    });
  }
  function back() {
    setDetail(null);
    setRefresh((x) => x + 1);
    setParams((p) => {
      const next = new URLSearchParams(p);
      next.delete("campaign");
      return next;
    });
  }
  const labels = {
    name: copy.name,
    owner: copy.owner,
    status: copy.status,
    progress: copy.progress,
    updatedAt: copy.updated,
  };
  const { columnWidths, resizeColumn } = usePersistentColumnWidths<Column>({
    defaults: widths,
    headerLabels: labels,
    sortableColumnIds: ["name", "status", "updatedAt"],
    storageKey: "sales-whatsapping-widths-v1",
  });
  const columns: IndiceTableColumnDefinition<Column>[] = (
    Object.keys(widths) as Column[]
  ).map((id) => ({
    id,
    label: labels[id],
    width: columnWidths[id],
    defaultWidth: widths[id],
    contentMinimumWidth: widths[id],
    resizeLabel: labels[id],
    sortable: ["name", "status", "updatedAt"].includes(id),
  }));
  const scope = revision;
  return (
    <>
      {detail ? (
        <CampaignWork
          key={`${detail.campaign.id}:${revision}`}
          detail={detail}
          onChange={(value) => {
            if (operationScope.current === scope) setDetail(value);
          }}
          onBack={back}
          onEdit={() => setEditor(detail)}
        />
      ) : (
        <div className="min-w-0 space-y-6">
          <SalesTitleBar
            icon={
              <ModuleTabEmoji
                moduleId="sales"
                tabId="whatsapping"
                className="size-8"
              />
            }
            title={copy.title}
            subtitle={copy.subtitle}
            actions={
              <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
                <Button
                  variant="outline"
                  className={salesTitleBarSecondaryActionClassName}
                  onClick={() => setLibrary("templates")}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  {copy.templates}
                </Button>
                <Button
                  variant="outline"
                  className={salesTitleBarSecondaryActionClassName}
                  onClick={() => setLibrary("lists")}
                >
                  <Users className="mr-2 h-4 w-4" />
                  {copy.lists}
                </Button>
                <Button
                  className={salesTitleBarPrimaryActionClassName}
                  onClick={() => setEditor("new")}
                >
                  <Plus className="h-4 w-4" />
                  {copy.newCampaign}
                </Button>
                <IndiceTitleBarOverflow
                  label={copy.actions}
                  items={[
                    {
                      id: "refresh",
                      label: copy.refresh,
                      icon: <RefreshCw className="h-4 w-4" />,
                      disabled: busy,
                      onSelect: () => setRefresh((v) => v + 1),
                    },
                  ]}
                />
              </div>
            }
          />
          <SalesFilterBar
            title={copy.filters}
            gridClassName="md:grid-cols-[2fr_1fr_1fr]"
            summary={
              filters.search || filters.status !== "ALL" || filters.owner ? (
                <Button variant="ghost" onClick={() => setFilters(defaults)}>
                  {copy.clear}
                </Button>
              ) : undefined
            }
          >
            <SalesFilterSearch
              label={copy.search}
              placeholder={copy.searchCampaign}
              value={filters.search}
              onValueChange={(value) =>
                setFilters((f) => ({ ...f, search: value, page: 1 }))
              }
              onClear={() => setFilters((f) => ({ ...f, search: "", page: 1 }))}
              clearLabel={copy.clear}
            />
            <SalesFilterSelect
              label={copy.status}
              value={filters.status}
              onValueChange={(status) =>
                setFilters((f) => ({ ...f, status, page: 1 }))
              }
              options={statuses.map((value) => ({
                value,
                label: label(value),
              }))}
            />
            <SalesFilterSelect
              label={copy.owner}
              value={filters.owner || "ALL"}
              onValueChange={(owner) =>
                setFilters((f) => ({
                  ...f,
                  owner: owner === "ALL" ? "" : owner,
                  page: 1,
                }))
              }
              options={[
                { value: "ALL", label: copy.all },
                ...(data?.owners ?? []).map((o) => ({
                  value: String(o.id),
                  label: o.name,
                })),
              ]}
            />
          </SalesFilterBar>
          <div className="flex items-start gap-3 rounded-xl border border-[#FF6B5E]/20 bg-[#FF6B5E]/5 px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
            <MessageCircle
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0 text-[#B63B32] dark:text-[#FFB0AA]"
            />
            <p className="leading-6">
              <span className="font-medium text-slate-900 dark:text-white">
                {copy.assisted}.{" "}
              </span>
              {copy.manualHint}
            </p>
          </div>
          <ErrorNotice text={error} />
          {opening && <p role="status">{copy.loading}</p>}
          {!busy && data?.total === 0 ? (
            <section className={`${panel} py-12 text-center`}>
              <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl border border-[#FF6B5E]/20 bg-[#FF6B5E]/5">
                <ModuleTabEmoji
                  moduleId="sales"
                  tabId="whatsapping"
                  className="size-10"
                />
              </div>
              <h2 className="text-lg font-medium">
                {filters.search || filters.status !== "ALL" || filters.owner
                  ? copy.noResults
                  : copy.empty}
              </h2>
              <p className="mx-auto mb-5 mt-2 max-w-xl text-sm text-slate-500">
                {copy.emptyHint}
              </p>
              <Button
                className={salesTitleBarPrimaryActionClassName}
                onClick={() => setEditor("new")}
              >
                {copy.newCampaign}
              </Button>
            </section>
          ) : (
            <div aria-busy={busy}>
              <IndiceTableShell
                pagination={
                  data && data.total > 0 ? (
                    <DataTablePagination
                      currentPage={filters.page}
                      pageSize={filters.pageSize}
                      pageSizeOptions={[10, 25, 50, 100, 200]}
                      totalCount={data.total}
                      totalPages={Math.max(
                        1,
                        Math.ceil(data.total / filters.pageSize),
                      )}
                      pageStart={(filters.page - 1) * filters.pageSize + 1}
                      pageEnd={Math.min(
                        filters.page * filters.pageSize,
                        data.total,
                      )}
                      onPageChange={(page) =>
                        setFilters((f) => ({ ...f, page }))
                      }
                      onPageSizeChange={(pageSize) =>
                        setFilters((f) => ({ ...f, pageSize, page: 1 }))
                      }
                    />
                  ) : undefined
                }
              >
                <IndiceOperationalTable
                  minimumWidth={
                    Object.values(columnWidths).reduce((a, b) => a + b, 0) + 185
                  }
                >
                  <IndiceTableColGroup columns={columns} actionsWidth={185} />
                  <IndiceTableHeaderRow
                    columns={columns}
                    onResize={resizeColumn}
                    tone="coral"
                    sortState={{
                      columnId: filters.sort as Column,
                      direction: filters.direction,
                    }}
                    onSort={(sort) =>
                      setFilters((f) => ({
                        ...f,
                        sort,
                        direction:
                          f.sort === sort && f.direction === "asc"
                            ? "desc"
                            : "asc",
                        page: 1,
                      }))
                    }
                    actions={{ label: copy.actions, width: 185 }}
                  />
                  <TableBody>
                    {data?.items.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>
                          <button
                            type="button"
                            disabled={opening}
                            onClick={() => open(row.id)}
                            className="min-h-11 text-left text-sm font-medium text-slate-950 underline-offset-4 hover:text-[#B63B32] hover:underline focus-visible:rounded focus-visible:outline-2 focus-visible:outline-[#FF6B5E] dark:text-white"
                          >
                            {row.name}
                          </button>
                          <span className="mt-1 block text-xs text-slate-500">
                            {label(row.objective)}
                          </span>
                        </TableCell>
                        <TableCell>{row.ownerName}</TableCell>
                        <TableCell>
                          <Badge state={row.status}>{label(row.status)}</Badge>
                        </TableCell>
                        <TableCell>
                          <CampaignProgress
                            done={row.done}
                            total={row.total}
                            label={`${copy.progress}: ${row.name}`}
                          />
                          {row.due > 0 && (
                            <span className="mt-2 block text-xs text-amber-800 dark:text-amber-200">
                              {row.due} · {copy.due}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {new Intl.DateTimeFormat(locale, {
                            dateStyle: "medium",
                            timeStyle: "short",
                          }).format(new Date(row.updatedAt))}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            className="min-h-11 rounded-xl border-[#FF6B5E]/25 bg-[#FF6B5E]/5 text-[#B63B32] hover:bg-[#FF6B5E]/10 dark:text-[#FFB0AA]"
                            disabled={opening}
                            onClick={() => open(row.id)}
                          >
                            {copy.work}
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {busy && !data && (
                      <TableRow>
                        <TableCell colSpan={6} className="p-8 text-center">
                          {copy.loading}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </IndiceOperationalTable>
              </IndiceTableShell>
            </div>
          )}
        </div>
      )}
      {editor !== null && (
        <CampaignEditor
          key={`${editor === "new" ? "new" : editor.campaign.id}:${revision}`}
          initial={editor === "new" ? null : editor}
          onClose={() => setEditor(null)}
          onSaved={(value) => {
            if (operationScope.current !== scope) return;
            setEditor(null);
            setDetail(value);
            open(value.campaign.id);
            setRefresh((v) => v + 1);
          }}
        />
      )}
      {library && (
        <LibraryModal
          key={`${library}:${revision}`}
          mode={library}
          onClose={() => setLibrary(null)}
        />
      )}
    </>
  );
}
