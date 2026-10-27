import { useEffect, useRef, useState } from "react";
import {
  MessageCircle,
  Plus,
  FileText,
  ArrowRight,
} from "lucide-react";
import { useSearchParams } from "react-router";
import { ModuleTabEmoji } from "../../../components/icons/ModuleTabEmoji";
import { Button } from "../../../components/ui/button";
import { TableBody, TableCell, TableRow } from "../../../components/ui/table";
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
import { CampaignResultCount } from "./CampaignResultCount";
import { parseRecipientView, type RecipientView } from "./campaignRecipientViews";
import { CampaignTableActions } from "./CampaignTableActions";
import { CampaignEditor } from "./CampaignEditor";
import { CampaignWork } from "./CampaignWork";
import { LibraryModal } from "./LibraryModal";
import { Badge, CampaignProgress, ErrorNotice, panel } from "./WhatsappingUi";
import { failure, terminal } from "./whatsappingModel";
const defaults = {
  search: "",
  status: "ALL",
  result: "ALL",
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
  progress: 190,
  contacted: 170,
  positive: 230,
  negative: 230,
  withOpportunity: 250,
  nextFollowUp: 220,
  updatedAt: 180,
};
type Column = keyof typeof widths;
export default function Whatsapping() {
  const { copy, label, locale } = useWhatsappingCopy();
  const revision = useAuthorizationRevision(),
    [params, setParams] = useSearchParams();
  const campaignParam = params.get("campaign");
  const [filters, setFilters] = useState(defaults),
    [search, setSearch] = useState(""),
    [data, setData] = useState<Page | null>(null),
    [busy, setBusy] = useState(true),
    [error, setError] = useState(""),
    [refresh, setRefresh] = useState(0),
    [detail, setDetail] = useState<Detail | null>(null),
    [editor, setEditor] = useState<Detail | "new" | null>(null),
    [library, setLibrary] = useState<"templates" | null>(null),
    [opening, setOpening] = useState(false);
  const [followUps, setFollowUps] = useState<Record<string, { date: string | null; failed?: boolean }>>({});
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
        result: ["ALL", "CONTACTED", "POSITIVE", "NEGATIVE"].includes(v.result) ? v.result : "ALL",
        owner: /^\d*$/.test(String(v.owner)) ? String(v.owner) : "",
        page: Math.max(1, Math.min(10000, Number(v.page) || 1)),
        pageSize: [10, 25, 50, 100, 200].includes(v.pageSize) ? v.pageSize : 25,
        sort: ["name", "status", "updatedAt", "contacted", "positive", "negative"].includes(v.sort)
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
    if (campaignParam) return;
    const c = new AbortController();
    setBusy(true);
    setError("");
    const q = new URLSearchParams({
      search,
      status: filters.status,
      result: filters.result,
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
    campaignParam,
    search,
    filters.status,
    filters.result,
    filters.owner,
    filters.page,
    filters.pageSize,
    filters.sort,
    filters.direction,
    refresh,
    revision,
  ]);
  // Read only visible campaigns, with two requests at a time. Never cache across auth scopes.
  useEffect(() => {
    const controller = new AbortController();
    setFollowUps({});
    const rows = data?.items.filter(row => row.pending > 0 && !["COMPLETED", "ARCHIVED"].includes(row.status)) ?? [];
    let index = 0;
    async function worker() {
      while (!controller.signal.aborted && index < rows.length) {
        const row = rows[index++];
        try {
          const value = await whatsappingApi.get(row.id, controller.signal);
          if (controller.signal.aborted) return;
          const dates = value.recipients.filter(r => !terminal(r.state) && r.nextActionAt && Number.isFinite(Date.parse(r.nextActionAt)))
            .map(r => r.nextActionAt!).sort((a, b) => Date.parse(a) - Date.parse(b));
          setFollowUps(previous => ({ ...previous, [row.id]: { date: dates[0] ?? null } }));
        } catch {
          if (!controller.signal.aborted) setFollowUps(previous => ({ ...previous, [row.id]: { date: null, failed: true } }));
        }
      }
    }
    void worker(); void worker();
    return () => controller.abort();
  }, [data, revision]);
  const dateText = (value: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  function followUpText(row: Page["items"][number]) {
    if (["COMPLETED", "ARCHIVED"].includes(row.status) || row.pending === 0) return copy.noFollowUp;
    const result = followUps[row.id];
    if (!result) return copy.loading;
    if (result.failed) return copy.followUpLoadFailed;
    return result.date ? dateText(result.date) : copy.noFollowUp;
  }
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
  }, [campaignParam, revision, refresh]);
  function open(id: string, pendingFollowUps = false, recipientView?: RecipientView) {
    setParams((p) => {
      const next = new URLSearchParams(p);
      next.set("campaign", id);
      if (recipientView) next.set("recipients", recipientView);
      else if (pendingFollowUps) next.set("recipients", "DUE");
      else next.delete("recipients");
      return next;
    });
  }
  function back() {
    openAbort.current?.abort();
    setDetail(null);
    setParams((p) => {
      const next = new URLSearchParams(p);
      next.delete("campaign");
      next.delete("recipients");
      return next;
    });
  }
  const labels = {
    name: copy.name,
    owner: copy.owner,
    status: copy.status,
    progress: copy.progress,
    contacted: copy.contacted,
    positive: copy.positiveResponses,
    negative: copy.negativeResponses,
    withOpportunity: copy.contactsWithOpportunity,
    nextFollowUp: copy.nextFollowUp,
    updatedAt: copy.updated,
  };
  const { columnWidths, resizeColumn } = usePersistentColumnWidths<Column>({
    defaults: widths,
    headerLabels: labels,
    sortableColumnIds: ["name", "status", "updatedAt", "contacted", "positive", "negative"],
    storageKey: "sales-whatsapping-widths-v2",
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
    sortable: ["name", "status", "updatedAt", "contacted", "positive", "negative"].includes(id),
  }));
  const scope = revision;
  return (
    <>
      {detail ? (
        <CampaignWork
          key={`${detail.campaign.id}:${revision}`}
          detail={detail}
          initialView={parseRecipientView(params.get("recipients"))}
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
                  className={salesTitleBarPrimaryActionClassName}
                  onClick={() => setEditor("new")}
                >
                  <Plus className="h-4 w-4" />
                  {copy.newCampaign}
                </Button>
              </div>
            }
          />
          <SalesFilterBar
            title={copy.filters}
            gridClassName="md:grid-cols-2 xl:grid-cols-[2fr_1fr_1fr_1fr]"
            summary={
              filters.search || filters.status !== "ALL" || filters.result !== "ALL" || filters.owner ? (
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
            <SalesFilterSelect label={copy.resultFilter} value={filters.result} onValueChange={result => setFilters(f => ({...f,result,page:1}))} options={[
              {value:"ALL",label:`${copy.all} (${data?.results?.all ?? "—"})`},
              {value:"CONTACTED",label:`${copy.contacted} (${data?.results?.contacted ?? "—"})`},
              {value:"POSITIVE",label:`${copy.positiveResponses} (${data?.results?.positive ?? "—"})`},
              {value:"NEGATIVE",label:`${copy.negativeResponses} (${data?.results?.negative ?? "—"})`},
            ]}/>
            <div className="lg:hidden">
              <SalesFilterSelect label={copy.sortCampaigns} value={`${filters.sort}:${filters.direction}`}
                onValueChange={value => { const [sort, direction] = value.split(":"); setFilters(f => ({ ...f, sort, direction: direction === "asc" ? "asc" : "desc", page: 1 })); }}
                options={[
                  { value: "updatedAt:desc", label: copy.recentFirst },
                  { value: "updatedAt:asc", label: copy.oldestFirst },
                  { value: "name:asc", label: `${copy.name}: A–Z` },
                  { value: "name:desc", label: `${copy.name}: Z–A` },
                  { value: "status:asc", label: `${copy.status}: A–Z` },
                  { value: "status:desc", label: `${copy.status}: Z–A` },
                  { value: "contacted:desc", label: `${copy.contacted}: ${copy.highestFirst}` },
                  { value: "contacted:asc", label: `${copy.contacted}: ${copy.lowestFirst}` },
                  { value: "positive:desc", label: `${copy.positiveResponses}: ${copy.highestFirst}` },
                  { value: "positive:asc", label: `${copy.positiveResponses}: ${copy.lowestFirst}` },
                  { value: "negative:desc", label: `${copy.negativeResponses}: ${copy.highestFirst}` },
                  { value: "negative:asc", label: `${copy.negativeResponses}: ${copy.lowestFirst}` },
                ]} />
            </div>
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
          {(error || Object.values(followUps).some(value => value.failed)) && (
            <Button variant="outline" disabled={busy} onClick={() => setRefresh(value => value + 1)}>
              {copy.retry}
            </Button>
          )}
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
                {filters.search || filters.status !== "ALL" || filters.result !== "ALL" || filters.owner
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
                <div className="grid min-w-0 gap-3 p-3 sm:grid-cols-2 lg:hidden">
                  {data?.items.map(row => <article key={row.id} className={`${panel} min-w-0 !p-4`}>
                    <div className="flex items-start justify-between gap-2">
                      <button type="button" className="min-h-11 min-w-0 break-words text-left font-medium hover:underline" disabled={opening} onClick={() => open(row.id)}>{row.name}</button>
                      <Badge state={row.status}>{label(row.status)}</Badge>
                    </div>
                    <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">{label(row.objective)}</p>
                    <CampaignProgress done={row.done} total={row.total} label={`${copy.progress}: ${row.name}`} />
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                      <span>{copy.finished}: {row.done}</span><span>{copy.pending}: {row.pending}</span>
                      {row.due > 0 && <span className="text-amber-800 dark:text-amber-200">{copy.due}: {row.due}</span>}
                    </div>
                    <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                      <div><dt className="text-xs text-slate-500 dark:text-slate-400">{copy.contacted}</dt><dd className="mt-1 tabular-nums"><CampaignResultCount count={row.outcomes?.contacted} label={copy.contacted} campaignName={row.name} busy={opening} onOpen={() => open(row.id,false,"CONTACTED")}/></dd></div>
                      <div><dt className="text-xs text-slate-500 dark:text-slate-400">{copy.positiveResponses}</dt><dd className="mt-1 tabular-nums"><CampaignResultCount count={row.outcomes?.positive} label={copy.positiveResponses} campaignName={row.name} busy={opening} onOpen={() => open(row.id,false,"POSITIVE")}/></dd></div>
                      <div><dt className="text-xs text-slate-500 dark:text-slate-400">{copy.negativeResponses}</dt><dd className="mt-1 tabular-nums"><CampaignResultCount count={row.outcomes?.negative} label={copy.negativeResponses} campaignName={row.name} busy={opening} onOpen={() => open(row.id,false,"NEGATIVE")}/></dd></div>
                      <div><dt className="text-xs text-slate-500 dark:text-slate-400">{copy.contactsWithOpportunity}</dt><dd className="mt-1 tabular-nums" title={row.outcomes?.withOpportunity == null ? copy.noOpportunityAccess : undefined}><CampaignResultCount count={row.outcomes?.withOpportunity} label={copy.contactsWithOpportunity} campaignName={row.name} busy={opening} onOpen={() => open(row.id,false,"OPPORTUNITY")}/></dd></div>
                    </dl>
                    <dl className="my-3 space-y-2 text-sm">
                      <div><dt className="text-xs text-slate-500 dark:text-slate-400">{copy.nextFollowUp}</dt><dd className="mt-1 break-words">{followUpText(row)}</dd></div>
                      <div><dt className="text-xs text-slate-500 dark:text-slate-400">{copy.owner}</dt><dd className="mt-1 break-words">{row.ownerName}</dd></div>
                    </dl>
                    <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">{copy.updated}: {dateText(row.updatedAt)}</p>
                    {row.status === "PAUSED" && <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">{copy.pausedWorkHint}</p>}
                    <div className="flex justify-end"><CampaignTableActions campaign={row} busy={opening} onOpen={() => open(row.id)} onFollowUps={() => open(row.id,true)}/></div>
                  </article>)}
                  {busy && !data && <p role="status" className="p-4 text-sm">{copy.loading}</p>}
                </div>
                <div className="hidden lg:block">
                <IndiceOperationalTable
                  minimumWidth={
                    Object.values(columnWidths).reduce((a, b) => a + b, 0) + 116
                  }
                >
                  <IndiceTableColGroup columns={columns} actionsWidth={116} />
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
                    actions={{ label: copy.actions, width: 116 }}
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
                          <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">{copy.finished}: {row.done} · {copy.pending}: {row.pending}</p>
                          {row.due > 0 && (
                            <span className="mt-2 block text-xs text-amber-800 dark:text-amber-200">
                              {row.due} · {copy.due}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="tabular-nums"><CampaignResultCount count={row.outcomes?.contacted} label={copy.contacted} campaignName={row.name} busy={opening} onOpen={() => open(row.id,false,"CONTACTED")}/></TableCell>
                        <TableCell className="tabular-nums"><CampaignResultCount count={row.outcomes?.positive} label={copy.positiveResponses} campaignName={row.name} busy={opening} onOpen={() => open(row.id,false,"POSITIVE")}/></TableCell>
                        <TableCell className="tabular-nums"><CampaignResultCount count={row.outcomes?.negative} label={copy.negativeResponses} campaignName={row.name} busy={opening} onOpen={() => open(row.id,false,"NEGATIVE")}/></TableCell>
                        <TableCell className="whitespace-normal tabular-nums" title={row.outcomes?.withOpportunity == null ? copy.noOpportunityAccess : undefined}><CampaignResultCount count={row.outcomes?.withOpportunity} label={copy.contactsWithOpportunity} campaignName={row.name} busy={opening} onOpen={() => open(row.id,false,"OPPORTUNITY")}/></TableCell>
                        <TableCell><span className="block whitespace-normal text-sm">{followUpText(row)}</span></TableCell>
                        <TableCell>
                          {new Intl.DateTimeFormat(locale, {
                            dateStyle: "medium",
                            timeStyle: "short",
                          }).format(new Date(row.updatedAt))}
                        </TableCell>
                        <TableCell><CampaignTableActions campaign={row} busy={opening} onOpen={() => open(row.id)} onFollowUps={() => open(row.id,true)}/></TableCell>
                      </TableRow>
                    ))}
                    {busy && !data && (
                      <TableRow>
                        <TableCell colSpan={11} className="p-8 text-center">
                          {copy.loading}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </IndiceOperationalTable>
                </div>
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
