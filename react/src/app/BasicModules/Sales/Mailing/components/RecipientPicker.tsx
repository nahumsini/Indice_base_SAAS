import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../../../../components/ui/button";
import {
  IndiceFilterBar,
  IndiceFilterDisclosureActions,
  useIndiceFilterDisclosureCopy,
} from "../../../../components/frontend-os";
import {
  SalesFilterSearch,
  SalesFilterSelect,
} from "../../components/SalesFilterBar";
import type { MailingContact } from "../mailingApi";
import type { MailingCopy } from "../translations";
import {
  audienceApi,
  type AudienceOptions,
  type AudiencePage,
  type AudienceSummary,
} from "../audienceApi";
import { audienceQuery, mergeAudience } from "../audienceModel";
import { useAudienceCopy } from "../audienceCopy";
import { useDeliveryCopy } from "../deliveryCopy";
import { AudienceTable } from "./AudienceTable";
import { AudienceLists } from "./AudienceLists";
import { useContactosTranslations } from "../../Contactos/hooks/useContactosTranslations";
import { ApiClientError } from "../../../../lib/apiClient";
const initialFilters = {
  search: "",
  source: "all",
  owner: "all",
  tag: "all",
  eligibility: "all",
  listId: "all",
};
const noBusyChange = () => {};
export function RecipientPicker({
  selected,
  onChange,
  disabled,
  onBusyChange = noBusyChange,
  listMode = false,
  canManageLists = true,
}: {
  copy: MailingCopy;
  selected: MailingContact[];
  onChange: (value: MailingContact[]) => void;
  disabled: boolean;
  onBusyChange?: (busy: boolean) => void;
  listMode?: boolean;
  canManageLists?: boolean;
}) {
  const text = useAudienceCopy();
  const contactCopy = useContactosTranslations();
  const delivery = useDeliveryCopy();
  const filterCopy = useIndiceFilterDisclosureCopy();
  const [filters, setFilters] = useState(initialFilters);
  const [advanced, setAdvanced] = useState(false);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [sort, setSort] = useState("name");
  const [direction, setDirection] = useState<"asc" | "desc">("asc");
  const [data, setData] = useState<AudiencePage | null>(null);
  const [options, setOptions] = useState<AudienceOptions>({
    sources: [],
    owners: [],
    tags: [],
  });
  const [summary, setSummary] = useState<AudienceSummary | null>(null);
  const [onlySelected, setOnlySelected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [error, setError] = useState("");
  const [previewError, setPreviewError] = useState("");
  const [actionError, setActionError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const selecting = useRef(false);
  const query = useMemo(
    () => audienceQuery(filters, sort, direction).toString(),
    [filters, sort, direction],
  );
  const selectionKey = selected
    .map((row) => row.id)
    .sort((a, b) => a - b)
    .join(",");
  useEffect(() => {
    const c = new AbortController();
    void audienceApi
      .options(c.signal)
      .then(setOptions)
      .catch(() => {
        if (!c.signal.aborted) setActionError(text.error);
      });
    return () => c.abort();
  }, [refresh, text]);
  useEffect(() => {
    const c = new AbortController();
    setLoading(true);
    setData(null);
    setError("");
    const timer = setTimeout(() => {
      const q = new URLSearchParams(query);
      q.set("page", String(page));
      q.set("pageSize", String(size));
      void audienceApi
        .contacts(q, c.signal)
        .then((result) => {
          if (!c.signal.aborted) setData(result);
        })
        .catch(() => {
          if (!c.signal.aborted) setError(text.error);
        })
        .finally(() => {
          if (!c.signal.aborted) setLoading(false);
        });
    }, 300);
    return () => {
      clearTimeout(timer);
      c.abort();
    };
  }, [query, page, size, refresh, text]);
  useEffect(() => {
    const c = new AbortController();
    setPreviewError("");
    setSummary(null);
    if (!selectionKey) {
      setSummaryLoading(false);
      return () => c.abort();
    }
    setSummaryLoading(true);
    const timer = setTimeout(
      () =>
        void audienceApi
          .preview(selectionKey.split(",").map(Number), c.signal)
          .then((result) => {
            if (!c.signal.aborted) setSummary(result);
          })
          .catch(() => {
            if (!c.signal.aborted) setPreviewError(text.error);
          })
          .finally(() => {
            if (!c.signal.aborted) setSummaryLoading(false);
          }),
      200,
    );
    return () => {
      clearTimeout(timer);
      c.abort();
    };
  }, [selectionKey, refresh, text]);
  function add(rows: MailingContact[]) {
    const next = mergeAudience(selected, rows);
    if (!next) {
      setActionError(text.limitError);
      return;
    }
    setActionError("");
    onChange(next);
  }
  function filter(key: keyof typeof filters, value: string) {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
    setOnlySelected(false);
  }
  const activeAdvanced = [filters.source, filters.owner, filters.tag].filter(
    (v) => v !== "all",
  ).length;
  const ids = new Set(selected.map((row) => row.id));
  const selectedRows = useMemo(
    () =>
      [...(summary?.items ?? [])].sort((a, b) => {
        const key = sort as "name" | "companyName" | "email" | "ownerName";
        return (
          (a[key].localeCompare(b[key]) || a.id - b.id) *
          (direction === "asc" ? 1 : -1)
        );
      }),
    [summary, sort, direction],
  );
  const items = onlySelected
    ? selectedRows.slice((page - 1) * size, page * size)
    : (data?.items ?? []);
  const total = onlySelected ? selectedRows.length : (data?.total ?? 0);
  const pending = onlySelected ? summaryLoading : loading;
  function sortBy(column: string) {
    setSort(column);
    setDirection(column === sort && direction === "asc" ? "desc" : "asc");
    setPage(1);
  }
  function selectResults() {
    if (selecting.current || disabled) return;
    selecting.current = true;
    onBusyChange(true);
    setActionError("");
    void audienceApi
      .selection(new URLSearchParams(query))
      .then(add)
      .catch((e) =>
        setActionError(
          e instanceof ApiClientError && e.status === 409
            ? text.limitError
            : text.error,
        ),
      )
      .finally(() => {
        selecting.current = false;
        onBusyChange(false);
      });
  }
  const optionsFor = (values: string[]) => [
    { value: "all", label: text.all },
    ...values.map((value) => ({ value, label: value })),
  ];
  return (
    <div className="min-w-0 space-y-4 text-slate-900 dark:text-slate-100">
      <AudienceLists
        expanded={listMode}
        readOnly={!canManageLists}
        onLoad={listMode ? onChange : undefined}
        selected={selected}
        disabled={disabled}
        onAdd={add}
        onBusyChange={onBusyChange}
      />
      <IndiceFilterBar
        title={text.filters}
        gridClassName="grid-cols-1 md:grid-cols-2"
        summary={
          <IndiceFilterDisclosureActions
            tone="coral"
            showAdvancedToggle
            activeAdvancedCount={activeAdvanced}
            isAdvancedOpen={advanced}
            onToggleAdvanced={() => setAdvanced((v) => !v)}
            advancedLabel={filterCopy.moreFilters}
            clearLabel={filterCopy.clearFilters}
            hasActiveFilters={
              filters.search !== "" ||
              filters.eligibility !== "all" ||
              activeAdvanced > 0
            }
            onClear={() => {
              setFilters(initialFilters);
              setPage(1);
              setOnlySelected(false);
            }}
          />
        }
      >
        <SalesFilterSearch
          label={text.browse}
          placeholder={text.search}
          value={filters.search}
          onValueChange={(value) => filter("search", value)}
          clearLabel={filterCopy.clearFilters}
          onClear={() => filter("search", "")}
        />
        <SalesFilterSelect
          label={text.eligibility}
          value={filters.eligibility}
          onValueChange={(value) => filter("eligibility", value)}
          options={[
            { value: "all", label: text.all },
            ...["READY", "INVALID", "SUPPRESSED"].map((value) => ({
              value,
              label: delivery.states[value as keyof typeof delivery.states],
            })),
          ]}
        />
        {advanced && (
          <>
            <SalesFilterSelect
              label={text.source}
              value={filters.source}
              onValueChange={(value) => filter("source", value)}
              options={[
                { value: "all", label: text.all },
                ...options.sources.map((value) => ({
                  value,
                  label:
                    contactCopy.sources[
                      value as keyof typeof contactCopy.sources
                    ] ?? value,
                })),
              ]}
            />
            <SalesFilterSelect
              label={text.owner}
              value={filters.owner}
              onValueChange={(value) => filter("owner", value)}
              options={[{ value: "all", label: text.all }, ...options.owners]}
            />
            <SalesFilterSelect
              label={text.tag}
              value={filters.tag}
              onValueChange={(value) => filter("tag", value)}
              options={optionsFor(options.tags)}
            />
          </>
        )}
      </IndiceFilterBar>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3" aria-live="polite">
        {[
          {
            label: text.selected,
            value: selected.length,
            style: "bg-[#FF6B5E]/10 text-[#A4382F] dark:text-[#FFB0AA]",
          },
          {
            label: text.ready,
            value: summary?.ready,
            style:
              "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
          },
          {
            label: text.excluded,
            value: summary?.excluded,
            style:
              "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
          },
        ].map((item) => (
          <div key={item.label} className={`rounded-xl p-3 ${item.style}`}>
            <span className="block text-xl font-medium">
              {item.value ?? (selected.length ? "—" : 0)}
            </span>
            <span className="text-xs">{item.label}</span>
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        {text.summaryHint}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          className="min-h-11"
          type="button"
          variant="outline"
          disabled={disabled || pending || !items.length}
          onClick={() => add(items)}
        >
          {text.selectPage}
        </Button>
        <Button
          className="min-h-11"
          type="button"
          variant="outline"
          disabled={disabled || loading || onlySelected || !data?.total}
          onClick={selectResults}
        >
          {text.selectResults}
        </Button>
        <Button
          className="min-h-11"
          type="button"
          variant="outline"
          aria-pressed={onlySelected}
          onClick={() => {
            setOnlySelected((v) => !v);
            setPage(1);
          }}
        >
          {onlySelected ? text.browse : text.selectedOnly} · {selected.length}
        </Button>
        <Button
          className="min-h-11"
          type="button"
          variant="ghost"
          disabled={disabled || !selected.length}
          onClick={() => {
            onChange([]);
            setPage(1);
          }}
        >
          {text.clear}
        </Button>
      </div>
      <p className="text-xs text-slate-500">{text.limit}</p>
      {(error || previewError || actionError) && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200"
        >
          {actionError || error || previewError}{" "}
          <Button
            className="min-h-11"
            type="button"
            variant="ghost"
            onClick={() => {
              setActionError("");
              setRefresh((v) => v + 1);
            }}
          >
            {text.retry}
          </Button>
        </div>
      )}
      {pending ? (
        <p role="status" className="py-6 text-sm">
          {text.loading}
        </p>
      ) : (
        !error && (
          <AudienceTable
            items={items}
            selected={ids}
            disabled={disabled}
            onToggle={(row) => {
              if (ids.has(row.id)) {
                onChange(selected.filter((c) => c.id !== row.id));
                if (onlySelected && items.length === 1 && page > 1)
                  setPage((p) => p - 1);
              } else add([row]);
            }}
            page={page}
            size={size}
            total={total}
            sort={sort}
            direction={direction}
            onSort={sortBy}
            onPage={setPage}
            onSize={(value) => {
              setSize(value);
              setPage(1);
            }}
          />
        )
      )}
    </div>
  );
}
