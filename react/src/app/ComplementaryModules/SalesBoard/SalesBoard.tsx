import { useEffect, useState } from "react";
import { Navigate, useLocation, useParams } from "react-router";
import {
  BarChart3,
  ChartNoAxesCombined,
  List,
  Network,
  RefreshCw,
} from "lucide-react";
import { apiClient } from "../../lib/apiClient";
import { Button } from "../../components/ui/button";
import {
  IndiceModuleShell,
  IndiceTitleBar,
  IndiceViewState,
} from "../../components/frontend-os";
import {
  IndiceFilterBar,
  IndiceFilterField,
  IndiceFilterSearch,
  IndiceFilterSelect,
  getIndiceFilterControlClassName,
} from "../../components/frontend-os/IndiceFilterBar";
import {
  IndiceFilterAdvancedSection,
  IndiceFilterDisclosureActions,
  useIndiceFilterDisclosureCopy,
} from "../../components/frontend-os/IndiceFilterDisclosure";
import { useAuthorizationRevision } from "../../hooks/useAuthorizationRevision";
import { useRoutedModuleTab } from "../../hooks/useRoutedModuleTab";
import { useWorkspaceNavigationMemory } from "../../hooks/useWorkspaceNavigationMemory";
import { usePreferredBusinessCurrency } from "../../BasicModules/shared/BusinessCurrencyContext";
import { BoardChannels, BoardOverview, BoardTrends } from "./BoardInsights";
import { BoardSales, SaleDetail } from "./BoardSales";
import { channelLabel, originLabel, useBoardCopy } from "./boardCopy";
import {
  boardDefaults,
  boardQuery,
  detectedPeriod,
  periodRange,
  dateLabel,
  moneyLabel,
  normalizeFilters,
  type BoardFilters,
  type SaleRow,
  type Workspace,
} from "./boardModel";

import {
  boardTabs,
  legacyBoardDestination,
  type BoardTab,
} from "./boardNavigation";
export default function SalesBoard({
  onNavigate,
}: {
  onNavigate?: (page?: string) => void;
}) {
  const location = useLocation();
  const params = useParams();
  const legacyDestination = legacyBoardDestination(
    params["*"]?.split("/").filter(Boolean)[0],
    location.search,
  );
  if (legacyDestination) return <Navigate to={legacyDestination} replace />;
  return <RoutedSalesBoard onNavigate={onNavigate} />;
}
function RoutedSalesBoard({
  onNavigate,
}: {
  onNavigate?: (page?: string) => void;
}) {
  const { copy } = useBoardCopy();
  const revision = useAuthorizationRevision();
  const { activeTab, setActiveTab } = useRoutedModuleTab(
    "overview",
    boardTabs,
    {},
    { preserveSearch: true },
  );
  return (
    <IndiceModuleShell containedWorkspace
      currentModule="sales-board"
      title={copy.title}
      subtitle={copy.subtitle}
      tone="coral"
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onNavigate={onNavigate}
      tabs={[
        {
          id: "overview",
          label: copy.overview,
          icon: <BarChart3 className="h-4 w-4" />,
        },
        {
          id: "trends",
          label: copy.trends,
          icon: <ChartNoAxesCombined className="h-4 w-4" />,
        },
        {
          id: "channels",
          label: copy.channels,
          icon: <Network className="h-4 w-4" />,
        },
        {
          id: "sales",
          label: copy.salesDetail,
          icon: <List className="h-4 w-4" />,
        },
      ]}
    >
      <BoardWorkspace
        key={revision}
        view={activeTab}
        onViewChange={setActiveTab}
      />
    </IndiceModuleShell>
  );
}
function BoardWorkspace({
  view,
  onViewChange,
}: {
  view: BoardTab;
  onViewChange: (view: BoardTab) => void;
}) {
  const { copy, locale } = useBoardCopy();
  const disclosure = useIndiceFilterDisclosureCopy();
  const { preferredCurrency } = usePreferredBusinessCurrency();
  const [filters, setFilters] = useState(boardDefaults);
  const [advanced, setAdvanced] = useState(false);
  const [data, setData] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [selected, setSelected] = useState<SaleRow | null>(null);
  const [search, setSearch] = useState("");
  const [asOfDate, setAsOfDate] = useState("");
  const [periodChoice, setPeriodChoice] = useState<string | null>(null);
  const period = periodChoice ?? detectedPeriod(filters, asOfDate);
  const titles = {
    overview: [copy.overview, copy.overviewHint, BarChart3],
    trends: [copy.trends, copy.trendsSubtitle, ChartNoAxesCombined],
    channels: [copy.channels, copy.channelsSubtitle, Network],
    sales: [copy.salesDetail, copy.detailSubtitle, List],
  } as const;
  const [title, subtitle, ViewIcon] = titles[view];
  const advancedCount = [
    filters.channel !== "ALL",
    filters.status !== "ALL",
    filters.unitId !== "ALL",
    filters.businessId !== "ALL",
  ].filter(Boolean).length;
  useWorkspaceNavigationMemory({
    moduleKey: "sales_board",
    tabKey: "overview",
    state: filters,
    defaults: boardDefaults,
    urlFields: { from: "from", to: "to", origin: "origin", channel: "channel" },
    onRestore: (value) => {
      const next = normalizeFilters(value);
      setFilters(next);
      setPeriodChoice(null);
      setAdvanced(
        next.channel !== "ALL" ||
          next.status !== "ALL" ||
          next.unitId !== "ALL",
      );
    },
  });
  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(filters.search), 250);
    return () => window.clearTimeout(timer);
  }, [filters.search]);
  const query = boardQuery({ ...filters, search }, preferredCurrency);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setFailed(false);
    setData(null);
    setSelected(null);
    apiClient<Workspace>(`/api/v1/sales-board?${query}`, {
      signal: controller.signal,
    })
      .then((result) => {
        if (controller.signal.aborted) return;
        setData(result);
        setAsOfDate(result.context.asOfDate);
        const last = Math.max(1, Math.ceil(result.total / result.pageSize));
        if (result.page > last)
          setFilters((value) => ({ ...value, page: last }));
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [query, refresh]);
  const change = (patch: Partial<BoardFilters>) =>
    setFilters((value) => ({ ...value, ...patch, page: 1 }));
  const option = (value: string, label: string) => ({ value, label });
  const originOptions = ["ALL", "SALES", "POS", "UNKNOWN"].map((value) =>
    option(value, value === "ALL" ? copy.all : originLabel(value, copy)),
  );
  const channelValues = Array.from(
    new Set([
      ...(data?.options.channels
        .filter(
          (value) =>
            filters.origin === "ALL" || value.origin === filters.origin,
        )
        .map((value) => value.channel) ?? []),
      ...(filters.channel === "ALL" ? [] : [filters.channel]),
    ]),
  );
  const hasFilters = Object.keys(boardDefaults).some(
    (key) =>
      ![
        "view",
        "page",
        "pageSize",
        "sort",
        "direction",
        "granularity",
      ].includes(key) &&
      filters[key as keyof BoardFilters] !==
        boardDefaults[key as keyof BoardFilters],
  );
  return (
    <div className="grid min-w-0 grid-cols-1 gap-6">
      <IndiceTitleBar
        title={title}
        subtitle={subtitle}
        tone="coral"
        icon={<ViewIcon className="h-5 w-5" />}
        actions={
          <Button
            variant="outline"
            className="min-h-11 gap-2"
            disabled={loading}
            onClick={() => setRefresh((value) => value + 1)}
          >
            <RefreshCw className="h-4 w-4" />
            {copy.refresh}
          </Button>
        }
      />
      <IndiceFilterBar
        title={copy.filters}
        gridClassName="xl:grid-cols-[2fr_1fr_1fr]"
        summary={
          <IndiceFilterDisclosureActions
            tone="coral"
            activeAdvancedCount={advancedCount}
            advancedLabel={
              advanced ? disclosure.hideFilters : disclosure.moreFilters
            }
            clearLabel={disclosure.clearFilters}
            hasActiveFilters={hasFilters}
            isAdvancedOpen={advanced}
            onClear={() => {
              setFilters((value) => ({ ...boardDefaults, view: value.view }));
              setAdvanced(false);
              setPeriodChoice(null);
            }}
            onToggleAdvanced={() => setAdvanced((value) => !value)}
          />
        }
      >
        <IndiceFilterSearch
          tone="coral"
          label={copy.search}
          placeholder={copy.searchHint}
          value={filters.search}
          onValueChange={(value) => change({ search: value.slice(0, 180) })}
        />
        <IndiceFilterSelect
          tone="coral"
          label={copy.period}
          value={period}
          options={[
            option("today", copy.today),
            option("week", copy.thisWeek),
            option("month", copy.thisMonth),
            option("custom", copy.custom),
          ]}
          onValueChange={(value) => {
            if (!asOfDate) return;
            setPeriodChoice(value);
            if (value !== "custom") {
              const range = periodRange(
                value as "today" | "week" | "month",
                asOfDate,
              );
              if (range) change(range);
            }
          }}
        />
        <IndiceFilterSelect
          tone="coral"
          label={copy.origin}
          value={filters.origin}
          options={originOptions}
          onValueChange={(origin) => change({ origin, channel: "ALL" })}
        />
        {period === "custom" && (
          <div className="grid gap-4 sm:grid-cols-2 md:col-span-2 xl:col-span-3">
            <IndiceFilterField label={copy.from}>
              <input
                type="date"
                className={`${getIndiceFilterControlClassName("coral")} dark:[color-scheme:dark]`}
                value={filters.from || data?.context.from || ""}
                onChange={(event) => change({ from: event.target.value })}
              />
            </IndiceFilterField>
            <IndiceFilterField label={copy.to}>
              <input
                type="date"
                className={`${getIndiceFilterControlClassName("coral")} dark:[color-scheme:dark]`}
                value={filters.to || data?.context.to || ""}
                onChange={(event) => change({ to: event.target.value })}
              />
            </IndiceFilterField>
          </div>
        )}
        {advanced && (
          <IndiceFilterAdvancedSection className="md:col-span-2 xl:col-span-3">
            <IndiceFilterSelect
              tone="coral"
              label={copy.channel}
              value={filters.channel}
              options={[
                option("ALL", copy.all),
                ...channelValues.map((value) =>
                  option(value, channelLabel(value, copy)),
                ),
              ]}
              onValueChange={(channel) => change({ channel })}
            />
            <IndiceFilterSelect
              tone="coral"
              label={copy.status}
              value={filters.status}
              options={[
                option("ALL", copy.all),
                option("ACTIVE", copy.active),
                option("CANCELLED", copy.cancelled),
              ]}
              onValueChange={(status) => change({ status })}
            />
            <IndiceFilterSelect
              tone="coral"
              label={copy.unit}
              value={filters.unitId}
              options={[
                option("ALL", copy.all),
                ...(data?.options.units ?? []).map((unit) =>
                  option(String(unit.id), unit.name),
                ),
              ]}
              onValueChange={(unitId) => change({ unitId, businessId: "ALL" })}
            />
            <IndiceFilterSelect
              tone="coral"
              label={copy.business}
              value={filters.businessId}
              options={[
                option("ALL", copy.all),
                ...(
                  data?.options.businesses.filter(
                    (business) => String(business.unitId) === filters.unitId,
                  ) ?? []
                ).map((business) => option(String(business.id), business.name)),
              ]}
              onValueChange={(businessId) => change({ businessId })}
            />
          </IndiceFilterAdvancedSection>
        )}
      </IndiceFilterBar>
      {loading ? (
        <IndiceViewState variant="loading" title={copy.loading} tone="coral" />
      ) : failed || !data ? (
        <IndiceViewState
          variant="error"
          title={copy.loadError}
          tone="coral"
          action={
            <Button
              variant="outline"
              onClick={() => setRefresh((value) => value + 1)}
            >
              {copy.retry}
            </Button>
          }
        />
      ) : (
        <>
          <div className="text-xs leading-5 text-slate-500 dark:text-slate-400">
            <p>
              {dateLabel(data.context.from, locale)} –{" "}
              {dateLabel(data.context.to, locale)} · {copy.currency}:{" "}
              {preferredCurrency} · {data.context.timeZone} · {copy.sales}:{" "}
              {data.total.toLocaleString(locale)}
            </p>
            {(data.summary.total.partial ||
              data.analytics.comparison.total.partial) && (
              <p
                role="status"
                className="mt-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100"
              >
                {copy.partial}
                <br />
                {copy.current}:{" "}
                {data.summary.total.nativeTotals
                  .map((total) =>
                    moneyLabel(total.amount, total.currency, locale),
                  )
                  .join(" · ") || "—"}
                <br />
                {copy.previous}:{" "}
                {data.analytics.comparison.total.nativeTotals
                  .map((total) =>
                    moneyLabel(total.amount, total.currency, locale),
                  )
                  .join(" · ") || "—"}
              </p>
            )}
          </div>
          {data.total === 0 && (
            <IndiceViewState
              variant="empty"
              title={copy.empty}
              description={copy.emptyHint}
              tone="coral"
            />
          )}
          {view === "overview" && (
            <BoardOverview
              data={data}
              copy={copy}
              locale={locale}
              onSales={activeOnly => { if (activeOnly) change({ status: 'ACTIVE' }); onViewChange('sales'); }}
            />
          )}
          {view === "trends" && (
            <BoardTrends
              data={data}
              copy={copy}
              locale={locale}
              granularity={filters.granularity}
              onGranularity={(granularity) => change({ granularity })}
              onInterval={(from, to) => {
                change({ from, to });
                setPeriodChoice("custom");
                onViewChange("sales");
              }}
            />
          )}
          {view === "channels" && data.total > 0 && (
            <BoardChannels
              data={data}
              copy={copy}
              locale={locale}
              onChannel={(origin, channel) => {
                change({ origin, channel });
                setAdvanced(true);
                onViewChange("sales");
              }}
            />
          )}
          {view === "sales" && data.total > 0 && (
            <BoardSales
              data={data}
              copy={copy}
              locale={locale}
              filters={{ ...filters, search }}
              onFilters={setFilters}
              onSelect={setSelected}
            />
          )}
          <details className="rounded-xl border border-slate-200 p-4 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
            <summary className="cursor-pointer font-medium">
              {copy.method}
            </summary>
            <p className="mt-3">{copy.definition}</p>
            <p className="mt-2">{copy.channelHint}</p>
            <p className="mt-2">{copy.comparisonHint}</p>
            <p className="mt-2">
              {copy.rateDate}:{" "}
              {data.summary.total.exchangeRate.effectiveDate ?? "—"} ·{" "}
              {data.summary.total.exchangeRate.source || "—"}
            </p>
          </details>
        </>
      )}
      {selected && (
        <SaleDetail
          row={selected}
          copy={copy}
          locale={locale}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
