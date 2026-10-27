import { useEffect, useRef, useState } from "react";
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
import {
  SalesFilterBar,
  SalesFilterSearch,
} from "../components/SalesFilterBar";
import { whatsappingApi, type ContactPage } from "./whatsappingApi";
import { useContactCorrectionReturn } from "./useContactCorrectionReturn";
import { useWhatsappingCopy } from "./whatsappingCopy";
import { Badge, ErrorNotice } from "./WhatsappingUi";
import { loadCampaignContacts, selectableContact, uniqueEligibleContacts, contactIssues, contactCorrectionUrl } from "./campaignContactSelection";
import { failure } from "./whatsappingModel";
export function ContactPicker({
  selected,
  onChange,
  region,
  disabled = false,
  needsCompany = false,
}: {
  selected: number[];
  onChange: (ids: number[]) => void;
  region: string;
  disabled?: boolean;
  needsCompany?: boolean;
}) {
  const { copy, label } = useWhatsappingCopy();
  const [search, setSearch] = useState(""),
    [page, setPage] = useState(1),
    [size, setSize] = useState(10),
    [data, setData] = useState<ContactPage | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [refresh, setRefresh] = useState(0);
  const [returnNotice, setReturnNotice] = useState("");
  const returningId = useRef<number | null>(null);
  const markCorrection = useContactCorrectionReturn(id => {
    returningId.current = id;
    setReturnNotice(copy.checkingCorrection);
    setRefresh(value => value + 1);
  });
  const latch = useRef(false);
  const generation = useRef(0);
  useEffect(() => {
    const controller = new AbortController();
    setBusy(true);
    setError("");
    const timer = setTimeout(() => {
      void whatsappingApi
        .contacts(
          new URLSearchParams({
            search,
            region,
            page: String(page),
            pageSize: String(size),
          }),
          controller.signal,
        )
        .then((result) => {
          if (!controller.signal.aborted) {
            setData(result);
            if (returningId.current !== null) {
              const contact = result.items.find(c => c.id === returningId.current);
              setReturnNotice(contact ? `${contact.name}: ${selectableContact(contact, needsCompany) ? label("READY") : contactIssues(contact, needsCompany).map(issue => copy[issue]).join(" · ") || label(contact.eligibility)}` : copy.correctionUnavailable);
              returningId.current = null;
            }
          }
        })
        .catch((e) => {
          if (!controller.signal.aborted) {
            setError(failure(e, copy));
            setData(null);
            if (returningId.current !== null) setReturnNotice(copy.correctionRetry);
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setBusy(false);
        });
    }, 300);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [search, region, page, size, refresh]);
  useEffect(
    () => () => {
      generation.current++;
    },
    [],
  );
  const change = (ids: number[]) => {
    const unique = [...new Set(ids)];
    if (unique.length > 500) {
      setError(copy.limit);
      return;
    }
    onChange(unique);
  };
  async function selectAll() {
    if (latch.current) return;
    latch.current = true;
    setBusy(true);
    setError("");
    const seq = generation.current;
    try {
      const result = await loadCampaignContacts(region, search);
      if (seq === generation.current)
        change([...selected, ...uniqueEligibleContacts(result, needsCompany).map((c) => c.id)]);
    } catch {
      if (seq === generation.current) setError(copy.limit);
    } finally {
      latch.current = false;
      if (seq === generation.current) setBusy(false);
    }
  }
  const [columnWidths, setWidths] = useState<Record<string, number>>({
    name: 260,
    phone: 180,
    status: 180,
  });
  const columns: IndiceTableColumnDefinition<string>[] = [
    { id: "name", label: copy.contacts, width: 260, defaultWidth: 260 },
    { id: "phone", label: copy.phone, width: 180, defaultWidth: 180 },
    { id: "status", label: copy.status, width: 180, defaultWidth: 180 },
  ].map((c) => ({
    ...c,
    width: columnWidths[c.id],
    contentMinimumWidth: c.defaultWidth,
    resizeLabel: c.label,
  }));
  const eligiblePage = data?.items.filter(c => selectableContact(c, needsCompany)) ?? [];
  const selectedPage = !!eligiblePage.length && eligiblePage.every(c => selected.includes(c.id));
  return (
    <div className="min-w-0 space-y-3" aria-busy={busy}>
      <SalesFilterBar
        title={copy.filters}
        gridClassName="grid-cols-1"
        summary={`${selected.length} · ${copy.selected}`}
      >
        <SalesFilterSearch
          label={copy.search}
          placeholder={copy.searchContact}
          value={search}
          onValueChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          onClear={() => {
            setSearch("");
            setPage(1);
          }}
          clearLabel={copy.clear}
        />
      </SalesFilterBar>
      {data?.items.some(contact => !selectableContact(contact, needsCompany)) && <>
        <p className="text-sm text-slate-600 dark:text-slate-300">{copy.contactSelectionHint}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{copy.autoCorrectionReturnHint}</p>
      </>}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={disabled || busy}
          onClick={() => void selectAll()}
        >
          {copy.selectAll}
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={disabled || busy || !selected.length}
          onClick={() => onChange([])}
        >
          {copy.clearSelection}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => setRefresh((x) => x + 1)}
          disabled={busy}
        >
          {copy.refresh}
        </Button>
      </div>
      {returnNotice && <p role="status" className="rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200">{returnNotice}</p>}
      <ErrorNotice text={error} />
      <IndiceTableShell
        pagination={
          data && data.total > 0 ? (
            <DataTablePagination
              currentPage={page}
              pageSize={size}
              pageSizeOptions={[10, 25, 50, 100, 200]}
              totalCount={data.total}
              totalPages={Math.max(1, Math.ceil(data.total / size))}
              pageStart={(page - 1) * size + 1}
              pageEnd={Math.min(page * size, data.total)}
              onPageChange={setPage}
              onPageSizeChange={(value) => {
                setSize(value);
                setPage(1);
              }}
            />
          ) : undefined
        }
      >
        <IndiceOperationalTable minimumWidth={620}>
          <IndiceTableColGroup columns={columns} />
          <IndiceTableHeaderRow
            columns={columns}
            onResize={(id, width) => setWidths((w) => ({ ...w, [id]: width }))}
            tone="coral"
          />
          <TableBody>
            {data?.items.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <label className="flex min-h-11 items-center gap-3">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[#E85C50]"
                      disabled={disabled || busy || (!selected.includes(c.id) && !selectableContact(c, needsCompany))}
                      checked={selected.includes(c.id)}
                      onChange={(e) =>
                        change(
                          e.target.checked
                            ? [...selected, c.id]
                            : selected.filter((id) => id !== c.id),
                        )
                      }
                    />
                    <span>
                      <span className="block font-medium">{c.name}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {c.companyName}
                      </span>
                    </span>
                  </label>
                  {!selectableContact(c, needsCompany) && <div className="mt-2 space-y-2 whitespace-normal text-xs text-slate-600 dark:text-slate-300">
                    <ul className="space-y-1">{contactIssues(c, needsCompany).map(issue => <li key={issue}>{copy[issue]}</li>)}</ul>
                    <a href={contactCorrectionUrl(c)} onClick={() => { setReturnNotice(""); markCorrection(c.id); }} target="_blank" rel="noopener noreferrer"
                      className="inline-flex min-h-11 items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-[#B63B32] focus-visible:outline-2 focus-visible:outline-[#FF6B5E] dark:border-slate-700 dark:bg-slate-900 dark:text-[#FFB0AA]">
                      {copy.correctInContacts}
                    </a>
                  </div>}
                </TableCell>
                <TableCell>{c.phone || "—"}</TableCell>
                <TableCell>
                  <Badge state={selectableContact(c, needsCompany) ? "READY" : c.eligibility === "READY" ? "MISSING_DATA" : c.eligibility}>{label(selectableContact(c, needsCompany) ? "READY" : c.eligibility === "READY" ? "MISSING_DATA" : c.eligibility)}</Badge>

                </TableCell>
              </TableRow>
            ))}
            {!data?.items.length && (
              <TableRow>
                <TableCell colSpan={3} className="p-8 text-center">
                  {busy ? copy.loading : copy.noResults}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </IndiceOperationalTable>
      </IndiceTableShell>
      {!!data?.items.length && (
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={selectedPage}
            disabled={disabled || busy || !eligiblePage.length}
            onChange={(e) =>
              change(
                e.target.checked
                  ? [...selected, ...uniqueEligibleContacts(eligiblePage, needsCompany).map((c) => c.id)]
                  : selected.filter(
                      (id) => !data.items.some((c) => c.id === id),
                    ),
              )
            }
          />
          {copy.selectPage}
        </label>
      )}
    </div>
  );
}
