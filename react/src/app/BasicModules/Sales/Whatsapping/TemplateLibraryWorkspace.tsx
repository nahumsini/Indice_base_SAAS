import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Eye, FileText, Pencil } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { TableBody, TableCell, TableRow } from "../../../components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../../components/ui/tooltip";
import { IndiceTableActionGroup, IndiceTableColGroup, IndiceTableHeaderRow, IndiceTableShell, IndiceOperationalTable, type IndiceTableColumnDefinition } from "../../../components/table/IndiceTableEngine";
import { DataTablePagination } from "../../../components/table/DataTablePagination";
import { getCachedAuthSession } from "../../../api/authSessionStore";
import { usePersistentColumnWidths } from "../../../hooks/usePersistentColumnWidths";
import { SalesFilterBar, SalesFilterSearch, SalesFilterSelect } from "../components/SalesFilterBar";
import { Badge, panel } from "./WhatsappingUi";
import { preview } from "./whatsappingModel";
import { useWhatsappingCopy } from "./whatsappingCopy";
import type { Template } from "./whatsappingApi";

const defaultWidths = { name: 270, status: 130 };

export function TemplateLibraryWorkspace({ active, busy, loadFailed, records, onEdit }: {
  active: boolean;
  busy: boolean;
  loadFailed: boolean;
  records: Template[];
  onEdit: (record: Template) => void;
}) {
  const { copy, label, locale } = useWhatsappingCopy();
  const { columnWidths, resizeColumn } = usePersistentColumnWidths({
    defaults: defaultWidths, minWidths: defaultWidths,
    headerLabels: { name: copy.name, status: copy.status },
    storageKey: "sales-whatsapping-template-library-widths-v1",
  });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobilePreview, setMobilePreview] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const wasActive = useRef(active);
  const query = search.trim().toLocaleLowerCase(locale);
  const filtered = records.filter(record => (status === "ALL" || record.status === status)
    && `${record.name} ${record.body}`.toLocaleLowerCase(locale).includes(query))
    .sort((a, b) => a.name.localeCompare(b.name, locale) || a.id.localeCompare(b.id));
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pages);
  const rows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const selected = rows.find(record => record.id === selectedId) ?? rows[0];
  const session = getCachedAuthSession();
  const values = { name: copy.sample, clientCompany: copy.sampleCompany,
    seller: session?.user.name || copy.owner, company: session?.company.name || copy.senderCompany,
    offer: copy.sampleCampaignText, link: "https://example.com" };
  const message = (record: Template) => preview(record.body, values);
  const columns: IndiceTableColumnDefinition<"name" | "status">[] = [
    { id: "name", label: copy.name, width: columnWidths.name, defaultWidth: 270, contentMinimumWidth: 270, resizeLabel: copy.name },
    { id: "status", label: copy.status, width: columnWidths.status, defaultWidth: 130, contentMinimumWidth: 130, resizeLabel: copy.status },
  ];
  useEffect(() => { if (page > pages) setPage(pages); }, [page, pages]);
  useEffect(() => {
    if (active && !wasActive.current) {
      const frame = requestAnimationFrame(() => {
        const target = Array.from(root.current?.querySelectorAll<HTMLButtonElement>("[data-template-record]") ?? [])
          .find(button => button.dataset.templateRecord === selected?.id);
        (target ?? root.current?.querySelector<HTMLInputElement>("input[type=search]"))?.focus({ preventScroll: true });
      });
      wasActive.current = active;
      return () => cancelAnimationFrame(frame);
    }
    wasActive.current = active;
  }, [active, selected?.id]);
  useEffect(() => {
    if (!active || !mobilePreview || !window.matchMedia("(max-width: 1023px)").matches) return;
    const frame = requestAnimationFrame(() => {
      root.current?.closest<HTMLElement>('[data-slot="indice-modal-body"]')?.scrollTo({ top: 0 });
      root.current?.querySelector<HTMLElement>("[data-template-preview-heading]")?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [active, mobilePreview, selected?.id]);
  function select(record: Template) { setSelectedId(record.id); setMobilePreview(true); }
  function returnToList() {
    setMobilePreview(false);
    requestAnimationFrame(() => {
      Array.from(root.current?.querySelectorAll<HTMLButtonElement>("[data-template-record]") ?? [])
        .find(button => button.dataset.templateRecord === selected?.id)?.focus();
    });
  }
  function reset() { setSearch(""); setStatus("ALL"); setPage(1); }
  return <div ref={root} hidden={!active} className="space-y-4">
    <div className={mobilePreview ? "hidden lg:block" : ""}>
      <SalesFilterBar title={copy.filters} gridClassName="sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]"
        summary={<div className="flex items-center gap-2"><span>{busy || loadFailed ? "—" : filtered.length}</span>{(search || status !== "ALL") && <Button variant="ghost" onClick={reset}>{copy.clear}</Button>}</div>}>
        <SalesFilterSearch label={copy.search} placeholder={copy.searchTemplate} value={search}
          onValueChange={value => { setSearch(value); setPage(1); }} onClear={() => { setSearch(""); setPage(1); }} clearLabel={copy.clear} />
        <SalesFilterSelect label={copy.status} value={status} onValueChange={value => { setStatus(value); setPage(1); }}
          options={[{ value: "ALL", label: copy.all }, { value: "ACTIVE", label: copy.available }, { value: "ARCHIVED", label: label("ARCHIVED") }]} />
      </SalesFilterBar>
    </div>
    {busy ? <p role="status" className="py-6 text-sm text-slate-500">{copy.loading}</p> : loadFailed && records.length === 0 ? null : filtered.length === 0 ? (
      <section className={`${panel} py-10 text-center`}>
        <FileText aria-hidden="true" className="mx-auto mb-3 size-8 text-slate-400" />
        <h3 className="text-base font-medium">{search || status !== "ALL" ? copy.noResults : copy.noTemplates}</h3>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{search || status !== "ALL" ? copy.adjustTemplateFilters : copy.templatesHint}</p>
        {(search || status !== "ALL") && <Button className="mt-3" variant="outline" onClick={reset}>{copy.clear}</Button>}
      </section>
    ) : <div className="grid min-w-0 items-start gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <div className={`min-w-0 ${mobilePreview ? "hidden lg:block" : ""}`}>
        <IndiceTableShell pagination={<DataTablePagination currentPage={currentPage} pageSize={pageSize}
          totalCount={filtered.length} totalPages={pages} pageSizeOptions={[10, 25, 50, 100, 200]}
          pageStart={(currentPage - 1) * pageSize + 1} pageEnd={Math.min(currentPage * pageSize, filtered.length)}
          onPageChange={setPage} onPageSizeChange={value => { setPageSize(value); setPage(1); }} />}>
          <IndiceOperationalTable minimumWidth={columnWidths.name + columnWidths.status + 116}>
            <IndiceTableColGroup columns={columns} actionsWidth={116} />
            <IndiceTableHeaderRow columns={columns} onResize={resizeColumn} tone="coral" actions={{ label: copy.actions, width: 116 }} />
            <TableBody>{rows.map(record => <TableRow key={record.id} className={selected?.id === record.id ? "bg-[#FF6B5E]/5 dark:bg-[#FF6B5E]/10" : undefined}>
              <TableCell className="px-4 py-3 whitespace-normal">
                <button type="button" data-template-record={record.id} aria-pressed={selected?.id === record.id}
                  className="min-h-11 w-full break-words text-left text-sm font-medium hover:text-[#B63B32] focus-visible:outline-2 focus-visible:outline-[#FF6B5E] dark:hover:text-[#FFB0AA]"
                  onClick={() => select(record)}>{record.name}</button>
                <p className="line-clamp-2 break-words text-xs leading-5 text-slate-500 dark:text-slate-400">{message(record)}</p>
              </TableCell>
              <TableCell className="px-4 py-3"><Badge state={record.status === "ACTIVE" ? "READY" : record.status}>{record.status === "ACTIVE" ? copy.available : label(record.status)}</Badge></TableCell>
              <TableCell className="px-3 py-3"><IndiceTableActionGroup>{[
                { label: `${copy.preview}: ${record.name}`, icon: Eye, action: () => select(record), primary: true },
                { label: `${copy.edit}: ${record.name}`, icon: Pencil, action: () => onEdit(record), primary: false },
              ].map(action => <Tooltip key={action.label}><TooltipTrigger asChild>
                <Button type="button" variant="ghost" size="icon" title={action.label} aria-label={action.label}
                  className={`size-11 lg:size-9 ${action.primary ? "text-[#B63B32] dark:text-[#FFB0AA]" : ""}`} onClick={action.action}><action.icon className="size-4" aria-hidden="true" /></Button>
              </TooltipTrigger><TooltipContent>{action.label}</TooltipContent></Tooltip>)}</IndiceTableActionGroup></TableCell>
            </TableRow>)}</TableBody>
          </IndiceOperationalTable>
        </IndiceTableShell>
      </div>
      {selected && <section aria-label={copy.preview} className={`${panel} min-w-0 space-y-4 ${mobilePreview ? "" : "hidden lg:block"}`}>
        <Button variant="outline" className="min-h-11 lg:hidden" onClick={returnToList}><ArrowLeft aria-hidden="true" className="size-4" />{copy.back}</Button>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1"><p className="mb-1 text-xs text-slate-500 dark:text-slate-400">{copy.preview}</p><h3 data-template-preview-heading tabIndex={-1} className="break-words text-base font-medium outline-none">{selected.name}</h3></div>
          <Button variant="outline" className="min-h-11" onClick={() => onEdit(selected)}><Pencil aria-hidden="true" className="size-4" />{copy.edit}</Button>
        </div>
        <Badge state={selected.status === "ACTIVE" ? "READY" : selected.status}>{selected.status === "ACTIVE" ? copy.available : label(selected.status)}</Badge>
        <div className="whitespace-pre-wrap break-words rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">{message(selected)}</div>
        <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">{copy.templatePreviewHint}</p>
      </section>}
    </div>}
  </div>;
}
