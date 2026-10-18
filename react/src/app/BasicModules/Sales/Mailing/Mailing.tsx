import { CampaignDelivery } from './components/CampaignDelivery';
import { useDeliveryCopy } from './deliveryCopy';
import { useEffect, useMemo, useState } from "react";
import { Mail, Plus, RefreshCw, Pencil, Eye, Send, FileText, Settings } from "lucide-react";
import { canAccessModuleTab } from "../../../access/tabScopeCatalog";
import { getCachedAuthSession } from "../../../api/authSessionStore";
import { useNavigate, useSearchParams } from "react-router";
import { IndiceTitleBarOverflow, IndiceViewState } from "../../../components/frontend-os";
import { useEmailCopy } from "../../../ComplementaryModules/Email/translations";
import { Button } from "../../../components/ui/button";
import { TableBody, TableCell, TableRow } from "../../../components/ui/table";
import { DataTablePagination } from "../../../components/table/DataTablePagination";
import {
  IndiceTableShell,
  IndiceOperationalTable,
  IndiceTableColGroup,
  IndiceTableHeaderRow,
  type IndiceTableColumnDefinition,
} from "../../../components/table/IndiceTableEngine";
import { usePersistentColumnWidths } from "../../../hooks/usePersistentColumnWidths";
import { useWorkspaceNavigationMemory } from "../../../hooks/useWorkspaceNavigationMemory";
import { useAuthorizationRevision } from "../../../hooks/useAuthorizationRevision";
import {
  SalesTitleBar,
  salesTitleBarPrimaryActionClassName,
} from "../components/SalesTitleBar";
import {
  SalesFilterBar,
  SalesFilterSearch,
} from "../components/SalesFilterBar";
import { mailingApi, type Campaign, type CampaignPage } from "./mailingApi";
import { CampaignEditor } from "./components/CampaignEditor";
import { TemplateManager } from "./components/TemplateManager";
import { useMailingCopy } from "./translations";

type Column = "name" | "subject" | "recipients" | "updatedAt";
const defaults = {
  search: "",
  page: 1,
  pageSize: 25,
  sort: "updatedAt",
  direction: "desc",
};
const widths = { name: 280, subject: 300, recipients: 180, updatedAt: 210 };
const sortable = ["name", "subject", "updatedAt"] as Column[];
export default function Mailing() {
  const { copy, locale } = useMailingCopy(); const deliveryCopy=useDeliveryCopy(); const [delivery,setDelivery]=useState<Campaign|null>(null);
  const { copy: emailCopy } = useEmailCopy();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const returnCampaign = params.get("campaign");
  const revision = useAuthorizationRevision();
  const canConfigureAccounts = canAccessModuleTab("email", "accounts", getCachedAuthSession());
  const [filters, setFilters] = useState(defaults);
  const [search, setSearch] = useState("");
  const [data, setData] = useState<CampaignPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [editor, setEditor] = useState<Campaign | "new" | null>(null);
  const [opening, setOpening] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [notice, setNotice] = useState("");
  useWorkspaceNavigationMemory({
    moduleKey: "crm",
    tabKey: "mailing",
    state: filters,
    defaults,
    onRestore: (value) =>
      setFilters({
        search:
          typeof value.search === "string" ? value.search.slice(0, 180) : "",
        page: Math.max(1, Math.min(10000, Number(value.page) || 1)),
        pageSize: [10, 25, 50, 100, 200].includes(value.pageSize)
          ? value.pageSize
          : 25,
        sort: ["name", "subject", "updatedAt"].includes(value.sort)
          ? value.sort
          : "updatedAt",
        direction: value.direction === "asc" ? "asc" : "desc",
      }),
  });
  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(filters.search), 300);
    return () => window.clearTimeout(timer);
  }, [filters.search]);
  useEffect(() => {
    setEditor(null);setDelivery(null);
    setTemplatesOpen(false);
    setNotice("");
  }, [revision]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setFailed(false);
    setData(null);
    const query = new URLSearchParams({
      search,
      page: String(filters.page),
      pageSize: String(filters.pageSize),
      sort: filters.sort,
      direction: filters.direction,
    });
    mailingApi
      .list(query, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setData(result);
        if (
          filters.page > Math.max(1, Math.ceil(result.total / filters.pageSize))
        )
          setFilters((f) => ({
            ...f,
            page: Math.max(1, Math.ceil(result.total / f.pageSize)),
          }));
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [
    search,
    filters.page,
    filters.pageSize,
    filters.sort,
    filters.direction,
    refresh,
    revision,
  ]);
  useEffect(() => {
    if (!returnCampaign || !data?.canViewDetails) return;
    const controller = new AbortController();setOpening(true);
    mailingApi.get(returnCampaign, controller.signal).then(campaign => {
      if (!controller.signal.aborted) { setEditor(campaign);setParams(current => { const next = new URLSearchParams(current);next.delete("campaign");return next; }, { replace: true }); }
    }).catch(() => { if (!controller.signal.aborted) setNotice(copy.loadError); })
      .finally(() => { if (!controller.signal.aborted) setOpening(false); });
    return () => controller.abort();
  }, [returnCampaign, data?.canViewDetails, revision, copy.loadError, setParams]);
    const labels = useMemo(
    () => ({
      name: copy.campaign,
      subject: copy.subject,
      recipients: copy.recipients,
      updatedAt: copy.updated,
    }),
    [copy],
  );
  const { columnWidths, resizeColumn } = usePersistentColumnWidths<Column>({
    defaults: widths,
    headerLabels: labels,
    sortableColumnIds: sortable,
    storageKey: "sales-mailing-column-widths-v1",
  });
  const columns: IndiceTableColumnDefinition<Column>[] = (
    Object.keys(widths) as Column[]
  ).map((id) => ({
    id,
    label: labels[id],
    width: columnWidths[id],
    defaultWidth: widths[id],
    contentMinimumWidth: widths[id],
    sortable: sortable.includes(id),
    resizeLabel: `${copy.resize}: ${labels[id]}`,
  }));
  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / filters.pageSize));
  async function open(campaign: Campaign) {
    if(campaign.status!=="DRAFT"){setDelivery(campaign);return;}
    setOpening(true);
    setNotice("");
    try {
      setEditor(await mailingApi.get(campaign.id));
    } catch {
      setNotice(copy.loadError);
    } finally {
      setOpening(false);
    }
  }
  return (
    <div className="space-y-5">
      <SalesTitleBar
        title="Mailing"
        subtitle={copy.subtitle}
        icon={<Mail className="h-5 w-5" />}
        actions={
          <>
            {canConfigureAccounts && <Button variant="outline" onClick={() => navigate('/email/accounts')}><Settings className="mr-2 h-4 w-4" />{emailCopy.configureAccounts}</Button>}
            <Button
              variant="outline"
              disabled={loading}
              onClick={() => setTemplatesOpen(true)}
            >
              <FileText className="mr-2 h-4 w-4" />
              {copy.templates}
            </Button>
            <IndiceTitleBarOverflow label={copy.actions} items={[{ id: "refresh", label: copy.refresh, icon: <RefreshCw className="h-4 w-4" />, disabled: loading, onSelect: () => setRefresh(v => v + 1) }]} />
            {data?.canEdit && (
              <Button
                className={salesTitleBarPrimaryActionClassName}
                onClick={() => setEditor("new")}
              >
                <Plus className="mr-2 h-4 w-4" />
                {copy.newCampaign}
              </Button>
            )}
          </>
        }
      />
      <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
        {deliveryCopy.note}
      </p>
      {notice && (
        <p role="status" className="text-sm">
          {notice}
        </p>
      )}
      <SalesFilterBar
        title={copy.filters}
        summary={loading ? copy.loading : `${total}`}
      >
        <SalesFilterSearch
          label={copy.search}
          placeholder={copy.searchPlaceholder}
          value={filters.search}
          onValueChange={(value) =>
            setFilters((f) => ({ ...f, search: value.slice(0, 180), page: 1 }))
          }
          onClear={() => setFilters((f) => ({ ...f, search: "", page: 1 }))}
          clearLabel={copy.cancel}
        />
      </SalesFilterBar>
      {loading || opening ? (
        <IndiceViewState variant="loading" title={copy.loading} tone="coral" />
      ) : failed ? (
        <IndiceViewState variant="error" title={copy.loadError} tone="coral" action={<Button variant="outline" onClick={() => setRefresh(v => v + 1)}>{copy.retry}</Button>} />
      ) : (
        <IndiceTableShell
          pagination={
            total > 0 ? (
              <DataTablePagination
                currentPage={filters.page}
                pageSize={filters.pageSize}
                pageSizeOptions={[10, 25, 50, 100, 200]}
                totalCount={total}
                totalPages={pages}
                pageStart={(filters.page - 1) * filters.pageSize + 1}
                pageEnd={Math.min(filters.page * filters.pageSize, total)}
                onPageChange={(page) => setFilters((f) => ({ ...f, page }))}
                onPageSizeChange={(pageSize) =>
                  setFilters((f) => ({ ...f, pageSize, page: 1 }))
                }
              />
            ) : undefined
          }
        >
          <IndiceOperationalTable
            minimumWidth={
              Object.values(columnWidths).reduce((a, b) => a + b, 0) + 132
            }
          >
            <IndiceTableColGroup columns={columns} actionsWidth={132} />
            <IndiceTableHeaderRow
              columns={columns}
              onResize={resizeColumn}
              sortState={{
                columnId: filters.sort as Column,
                direction: filters.direction as "asc" | "desc",
              }}
              onSort={(id) =>
                setFilters((f) => ({
                  ...f,
                  sort: id,
                  direction:
                    f.sort === id && f.direction === "asc" ? "desc" : "asc",
                  page: 1,
                }))
              }
              actions={{ label: copy.actions, width: 132 }}
              tone="coral"
            />
            <TableBody>
              {data?.items.length ? (
                data.items.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <span className="font-medium">{row.name}</span>
                      <span className="ml-2 rounded-full bg-slate-100 px-2 py-1 text-xs dark:bg-slate-800">
                        {deliveryCopy.states[row.status]}
                      </span>
                    </TableCell>
                    <TableCell>{row.subject || "—"}</TableCell>
                    <TableCell>{row.recipientCount}</TableCell>
                    <TableCell>
                      {new Intl.DateTimeFormat(locale, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(row.updatedAt))}
                    </TableCell>
                    <TableCell>
                      {data.canViewDetails&&<Button variant="ghost" className="h-11 w-11 p-0" aria-label={`${deliveryCopy.title}: ${row.name}`} onClick={()=>setDelivery(row)}><Send className="h-4 w-4"/></Button>}
                      {data.canViewDetails && (
                        <Button
                          variant="ghost"
                          className="h-11 w-11 p-0"
                          aria-label={`${data.canEdit ? copy.edit : copy.view}: ${row.name}`}
                          onClick={() => void open(row)}
                        >
                          {data.canEdit ? (
                            <Pencil className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center">
                    {copy.empty}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </IndiceOperationalTable>
        </IndiceTableShell>
      )}
      {delivery&&<CampaignDelivery key={delivery.id} id={delivery.id} name={delivery.name} onClose={()=>{setDelivery(null);setRefresh(v=>v+1);}}/>}
      {templatesOpen && (
        <TemplateManager
          copy={copy}
          locale={locale}
          onClose={() => setTemplatesOpen(false)}
        />
      )}
      {editor && (
        <CampaignEditor
          key={editor === "new" ? "new" : editor.id}
          campaign={editor === "new" ? null : editor}
          canEdit={data?.canEdit ?? false}
          copy={copy}
          onConfigureAccounts={canConfigureAccounts ? id => navigate(`/email/accounts?campaign=${id}`) : undefined}
          onClose={() => setEditor(null)}
          onSaved={() => {
            setEditor(null);
            setNotice(copy.saved);
            setRefresh((v) => v + 1);
          }}
        />
      )}
    </div>
  );
}
