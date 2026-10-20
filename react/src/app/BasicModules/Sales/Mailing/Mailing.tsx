import { useEffect, useRef, useState } from "react";
import {
  Mail,
  Plus,
  RefreshCw,
  FileText,
  Settings,
  Users,
  ArrowRight,
  CircleAlert,
} from "lucide-react";
import { canAccessModuleTab } from "../../../access/tabScopeCatalog";
import { getCachedAuthSession } from "../../../api/authSessionStore";
import { useNavigate, useSearchParams } from "react-router";
import {
  IndiceTitleBarOverflow,
  IndiceViewState,
} from "../../../components/frontend-os";
import { useEmailCopy } from "../../../ComplementaryModules/Email/translations";
import { Button } from "../../../components/ui/button";
import { useWorkspaceNavigationMemory } from "../../../hooks/useWorkspaceNavigationMemory";
import { useAuthorizationRevision } from "../../../hooks/useAuthorizationRevision";
import {
  SalesTitleBar,
  salesTitleBarPrimaryActionClassName,
} from "../components/SalesTitleBar";
import {
  SalesFilterBar,
  SalesFilterSearch,
  SalesFilterSelect,
} from "../components/SalesFilterBar";
import { mailingApi, type Campaign } from "./mailingApi";
import {
  workspaceApi,
  type CampaignRow,
  type CampaignWorkspace,
} from "./workspaceApi";
import { CampaignEditor } from "./components/CampaignEditor";
import { CampaignDelivery } from "./components/CampaignDelivery";
import { CampaignWorkspaceTable } from "./components/CampaignWorkspaceTable";
import { AudienceWorkspace } from "./components/AudienceWorkspace";
import { TemplateManager } from "./components/TemplateManager";
import { useMailingCopy } from "./translations";
import { useDeliveryCopy } from "./deliveryCopy";
import { useMailingWorkspaceCopy } from "./workspaceCopy";
const statuses = [
  "ALL",
  "DRAFT",
  "SCHEDULED",
  "RUNNING",
  "PAUSED",
  "COMPLETED",
  "CANCELLED",
  "ATTENTION",
];
const defaults = {
  search: "",
  status: "ALL",
  senderAccountId: "",
  page: 1,
  pageSize: 25,
  sort: "updatedAt",
  direction: "desc" as "asc" | "desc",
};
export default function Mailing() {
  const { copy, locale } = useMailingCopy(),
    text = useMailingWorkspaceCopy(),
    deliveryCopy = useDeliveryCopy();
  const { copy: emailCopy } = useEmailCopy();
  const navigate = useNavigate(),
    [params, setParams] = useSearchParams(),
    revision = useAuthorizationRevision();
  const operationScope = useRef(revision);
  operationScope.current = revision;
  const returnCampaign = params.get("campaign");
  const canConfigureAccounts = canAccessModuleTab(
    "email",
    "accounts",
    getCachedAuthSession(),
  );
  const [filters, setFilters] = useState(defaults),
    [search, setSearch] = useState("");
  const [data, setData] = useState<CampaignWorkspace | null>(null),
    [loading, setLoading] = useState(true),
    [failed, setFailed] = useState(false),
    [refresh, setRefresh] = useState(0);
  const [editor, setEditor] = useState<Campaign | "new" | null>(null),
    [delivery, setDelivery] = useState<Pick<Campaign, "id" | "name"> | null>(
      null,
    );
  const [opening, setOpening] = useState(false),
    [templatesOpen, setTemplatesOpen] = useState(false),
    [listsOpen, setListsOpen] = useState(false),
    [notice, setNotice] = useState("");
  const openRequest = useRef<AbortController | null>(null);
  useWorkspaceNavigationMemory({
    moduleKey: "crm",
    tabKey: "mailing",
    state: filters,
    defaults,
    onRestore: (value) =>
      setFilters({
        search:
          typeof value.search === "string" ? value.search.slice(0, 180) : "",
        status: statuses.includes(value.status) ? value.status : "ALL",
        senderAccountId:
          typeof value.senderAccountId === "string" &&
          /^(|NONE|[a-f0-9-]{36})$/.test(value.senderAccountId)
            ? value.senderAccountId
            : "",
        page: Math.max(1, Math.min(10000, Number(value.page) || 1)),
        pageSize: [10, 25, 50, 100, 200].includes(value.pageSize)
          ? value.pageSize
          : 25,
        sort: ["name", "status", "scheduledAt", "updatedAt"].includes(
          value.sort,
        )
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
    openRequest.current?.abort();
    setOpening(false);
    setEditor(null);
    setDelivery(null);
    setTemplatesOpen(false);
    setListsOpen(false);
    setNotice("");
    setData(null);
  }, [revision]);
  useEffect(() => () => openRequest.current?.abort(), []);
  useEffect(() => {
    const c = new AbortController();
    setLoading(true);
    setFailed(false);
    const query = new URLSearchParams({
      search,
      status: filters.status,
      senderAccountId: filters.senderAccountId,
      page: String(filters.page),
      pageSize: String(filters.pageSize),
      sort: filters.sort,
      direction: filters.direction,
    });
    void workspaceApi
      .list(query, c.signal)
      .then((result) => {
        if (c.signal.aborted) return;
        setData(result);
        const pages = Math.max(1, Math.ceil(result.total / filters.pageSize));
        if (filters.page > pages) setFilters((f) => ({ ...f, page: pages }));
        if (
          filters.senderAccountId &&
          filters.senderAccountId !== "NONE" &&
          !result.senders.some((s) => s.id === filters.senderAccountId)
        )
          setFilters((f) => ({ ...f, senderAccountId: "", page: 1 }));
      })
      .catch(() => {
        if (!c.signal.aborted) {
          setFailed(true);
          setData(null);
        }
      })
      .finally(() => {
        if (!c.signal.aborted) setLoading(false);
      });
    return () => c.abort();
  }, [
    search,
    filters.status,
    filters.senderAccountId,
    filters.page,
    filters.pageSize,
    filters.sort,
    filters.direction,
    refresh,
    revision,
  ]);
  useEffect(() => {
    if (
      !data ||
      data.summary.running + data.summary.scheduled === 0 ||
      editor ||
      delivery ||
      listsOpen ||
      templatesOpen
    )
      return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") setRefresh((v) => v + 1);
    }, 15000);
    return () => window.clearInterval(timer);
  }, [
    data?.summary.running,
    data?.summary.scheduled,
    editor,
    delivery,
    listsOpen,
    templatesOpen,
  ]);
  useEffect(() => {
    if (!returnCampaign || !data?.canViewDetails) return;
    const controller = new AbortController();
    setOpening(true);
    void mailingApi.get(returnCampaign, controller.signal)
      .then((campaign) => {
        if (controller.signal.aborted) return;
        if (campaign.status === "DRAFT") setEditor(campaign);
        else setDelivery(campaign);
        setParams(
          (current) => {
            const next = new URLSearchParams(current);
            next.delete("campaign");
            return next;
          },
          { replace: true },
        );
      })
      .catch(() => {
        if (!controller.signal.aborted) setNotice(copy.loadError);
      })
      .finally(() => {
        if (!controller.signal.aborted) setOpening(false);
      });
    return () => controller.abort();
  }, [
    returnCampaign,
    data?.canViewDetails,
    revision,
    copy.loadError,
    setParams,
  ]);
  async function open(row: CampaignRow) {
    if (row.status !== "DRAFT" || !data?.canEdit) {
      setDelivery(row);
      return;
    }
    openRequest.current?.abort();
    const c = new AbortController();
    openRequest.current = c;
    setOpening(true);
    setNotice("");
    try {
      const campaign = await mailingApi.get(row.id, c.signal);
      if (!c.signal.aborted) {
        if (campaign.status === "DRAFT") setEditor(campaign);
        else setDelivery(campaign);
      }
    } catch {
      if (!c.signal.aborted) setNotice(copy.loadError);
    } finally {
      if (!c.signal.aborted) setOpening(false);
    }
  }
  const filter = (
    key: "status" | "senderAccountId" | "search",
    value: string,
  ) => setFilters((f) => ({ ...f, [key]: value, page: 1 }));
  const filtered =
    !!filters.search || filters.status !== "ALL" || !!filters.senderAccountId;
  const statusLabel = (status: string) =>
    status === "ALL"
      ? text.all
      : status === "ATTENTION"
        ? text.attention
        : deliveryCopy.states[status];
  const titleActions = [
    ...(data?.canViewDetails
      ? [
          {
            id: "lists",
            label: text.lists,
            icon: <Users className="h-4 w-4" />,
            onSelect: () => setListsOpen(true),
          },
        ]
      : []),
    {
      id: "templates",
      label: copy.templates,
      icon: <FileText className="h-4 w-4" />,
      onSelect: () => setTemplatesOpen(true),
    },
    ...(data?.canEdit
      ? [
          {
            id: "new",
            label: copy.newCampaign,
            icon: <Plus className="h-4 w-4" />,
            onSelect: () => setEditor("new"),
          },
        ]
      : []),
    {
      id: "refresh",
      label: copy.refresh,
      icon: <RefreshCw className="h-4 w-4" />,
      onSelect: () => setRefresh((v) => v + 1),
    },
    ...(canConfigureAccounts
      ? [
          {
            id: "accounts",
            label: emailCopy.configureAccounts,
            icon: <Settings className="h-4 w-4" />,
            onSelect: () => navigate("/email/accounts"),
          },
        ]
      : []),
  ];
  const direct =
    titleActions.length > 3 ? titleActions.slice(0, 3) : titleActions;
  const facets = data
    ? [
        { status: "ALL", count: data.summary.total },
        { status: "DRAFT", count: data.summary.draft },
        { status: "SCHEDULED", count: data.summary.scheduled },
        { status: "RUNNING", count: data.summary.running },
        { status: "ATTENTION", count: data.summary.attention },
      ]
    : [];
  return (
    <div className="min-w-0 space-y-5">
      <SalesTitleBar
        title={text.title}
        subtitle={text.subtitle}
        icon={<Mail className="h-5 w-5" />}
        actions={
          <>
            {direct.map((action) => (
              <Button
                key={action.id}
                variant={action.id === "new" ? "default" : "outline"}
                className={
                  action.id === "new"
                    ? salesTitleBarPrimaryActionClassName
                    : undefined
                }
                disabled={opening || (loading && action.id !== "accounts")}
                onClick={action.onSelect}
              >
                {action.icon}
                <span className="ml-2">{action.label}</span>
              </Button>
            ))}
            {titleActions.length > 3 && (
              <IndiceTitleBarOverflow
                label={copy.actions}
                items={titleActions
                  .slice(3)
                  .map((action) => ({
                    ...action,
                    disabled: loading && action.id !== "accounts",
                  }))}
              />
            )}
          </>
        }
      />
      <div className="flex flex-wrap items-center gap-2 px-1 text-sm text-slate-600 dark:text-slate-300">
        <ArrowRight className="h-4 w-4 text-[#B83D32] dark:text-[#FF9B91]" />
        {text.workflow}
      </div>
      {data && !data.publicLinkReady && (
        <div
          role="status"
          className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
        >
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          {deliveryCopy.publicMissing}
        </div>
      )}
      {notice && (
        <p role="alert" className="rounded-xl border p-3 text-sm">
          {notice}
        </p>
      )}
      <SalesFilterBar
        title={copy.filters}
        gridClassName="grid-cols-1 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]"
        summary={
          filtered ? (
            <Button variant="ghost" onClick={() => setFilters(defaults)}>
              {text.clear}
            </Button>
          ) : undefined
        }
      >
        <SalesFilterSearch
          label={copy.search}
          placeholder={copy.searchPlaceholder}
          value={filters.search}
          onValueChange={(value) => filter("search", value.slice(0, 180))}
          onClear={() => filter("search", "")}
          clearLabel={text.clear}
        />
        <SalesFilterSelect
          label={text.status}
          value={filters.status}
          onValueChange={(value) => filter("status", value)}
          options={statuses.map((value) => ({
            value,
            label: statusLabel(value),
          }))}
        />
        <SalesFilterSelect
          label={text.sender}
          value={filters.senderAccountId || "ALL"}
          onValueChange={(value) =>
            filter("senderAccountId", value === "ALL" ? "" : value)
          }
          options={[
            { value: "ALL", label: text.allSenders },
            { value: "NONE", label: text.noSender },
            ...(data?.senders ?? []).map((s) => ({
              value: s.id,
              label: `${s.label} · ${s.email}`,
            })),
          ]}
        />
      </SalesFilterBar>
      {data && (
        <div
          aria-label={text.summaryHint}
          className="flex flex-wrap gap-2"
          role="group"
        >
          {facets.map((facet) => (
            <button
              key={facet.status}
              type="button"
              aria-pressed={filters.status === facet.status}
              onClick={() => filter("status", facet.status)}
              className={`inline-flex min-h-11 items-center gap-3 rounded-xl border px-4 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B5E] ${filters.status === facet.status ? "border-[#FF6B5E]/50 bg-[#FF6B5E]/10 text-[#A4372D] dark:text-[#FFAEA6]" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"}`}
            >
              {facet.status === "DRAFT" ? text.draftSummary : facet.status === "SCHEDULED" ? text.scheduledSummary : statusLabel(facet.status)}
              <span className="rounded-md bg-slate-100 px-2 py-0.5 font-medium tabular-nums text-slate-800 dark:bg-slate-800 dark:text-slate-100">
                {facet.count}
              </span>
            </button>
          ))}
        </div>
      )}
      {failed ? (
        <IndiceViewState
          variant="error"
          title={copy.loadError}
          tone="coral"
          action={
            <Button variant="outline" onClick={() => setRefresh((v) => v + 1)}>
              {copy.retry}
            </Button>
          }
        />
      ) : !data ? (
        <IndiceViewState variant="loading" title={copy.loading} tone="coral" />
      ) : (
        <CampaignWorkspaceTable
          data={data}
          filters={filters}
          filtered={filtered}
          loading={loading || opening}
          onOpen={(row) => void open(row)}
          onReview={setDelivery}
          onCreate={() => setEditor("new")}
          onClear={() => setFilters(defaults)}
          onPage={(page) => setFilters((f) => ({ ...f, page }))}
          onSize={(pageSize) =>
            setFilters((f) => ({ ...f, pageSize, page: 1 }))
          }
          onSort={(sort) =>
            setFilters((f) => ({
              ...f,
              sort,
              direction:
                f.sort === sort && f.direction === "asc" ? "desc" : "asc",
              page: 1,
            }))
          }
        />
      )}
      {listsOpen && (
        <AudienceWorkspace
          canManage={data?.canEdit ?? false}
          onClose={() => setListsOpen(false)}
        />
      )}
      {templatesOpen && (
        <TemplateManager
          copy={copy}
          locale={locale}
          onClose={() => setTemplatesOpen(false)}
        />
      )}
      {delivery && (
        <CampaignDelivery
          key={delivery.id}
          id={delivery.id}
          name={delivery.name}
          onClose={() => {
            setDelivery(null);
            setRefresh((v) => v + 1);
          }}
        />
      )}
      {editor && (
        <CampaignEditor
          key={editor === "new" ? "new" : editor.id}
          campaign={editor === "new" ? null : editor}
          canEdit={data?.canEdit ?? false}
          copy={copy}
          onConfigureAccounts={
            canConfigureAccounts
              ? (id) => { if (operationScope.current === revision) navigate(`/email/accounts?campaign=${id}`); }
              : undefined
          }
          onClose={() => setEditor(null)}
          onSaved={(saved, review) => {
            if (operationScope.current !== revision) return;
            setEditor(null);
            setRefresh((v) => v + 1);
            if (review) setDelivery(saved);
            else setNotice(copy.saved);
          }}
        />
      )}
    </div>
  );
}
