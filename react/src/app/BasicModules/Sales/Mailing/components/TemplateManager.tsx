import { useEffect, useRef, useState } from "react";
import { FileText, Plus, Pencil, Archive, RotateCcw, ArrowLeft, X } from "lucide-react";
import { Button } from "../../../../components/ui/button";
import { ApiClientError } from "../../../../lib/apiClient";
import { SalesModalFrame } from "../../components/SalesModalFrame";
import {
  SalesFilterBar,
  SalesFilterSearch,
  SalesFilterSelect,
} from "../../components/SalesFilterBar";
import { DataTablePagination } from "../../../../components/table/DataTablePagination";
import {
  templateApi,
  type EmailTemplate,
  type TemplateInput,
  type MailingFile,
  type TemplatePage,
} from "../mailingApi";
import type { MailingCopy } from "../translations";
import { TemplateTable } from "./TemplateTable";
import { TemplateForm, TemplatePreview } from "./TemplateForm";

import { MailingFiles } from "./MailingFiles";
import { useReusableFileCopy } from "../reusableFileCopy";
import { useTemplateWorkspaceCopy } from "../templateWorkspaceCopy";

const blank: TemplateInput = {
  name: "",
  subject: "",
  previewText: "",
  bodyText: "",
  version: 0,
  attachmentIds: [],
};
type View = "workspace" | "edit" | "discard" | "archive";
export function TemplateManager({
  copy,
  locale,
  onClose,
  tone = "coral",
}: {
  copy: MailingCopy;
  locale: string;
  onClose: () => void;
  tone?: "blue" | "coral";
}) {
  const reusable=useReusableFileCopy();
  const workspace = useTemplateWorkspaceCopy();
  const [mobilePreview, setMobilePreview] = useState(false);
  const selectionTrigger = useRef<HTMLButtonElement | null>(null);
  const directory = useRef<HTMLDivElement | null>(null);
  const previewHeading = useRef<HTMLHeadingElement | null>(null);
  const [files,setFiles]=useState<MailingFile[]>([]);
  const [fileBusy,setFileBusy]=useState(false),[editorBusy,setEditorBusy]=useState(false);
  const saveLock=useRef(false),saveRequest=useRef<{snapshot:string;id:string}|null>(null);
  const selectionRequest = useRef(0);
  const [view, setView] = useState<View>("workspace");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(25);
  const [sort, setSort] = useState("updatedAt");
  const [direction, setDirection] = useState<"asc" | "desc">("desc");
  const [data, setData] = useState<TemplatePage | null>(null);
  const [selected, setSelected] = useState<EmailTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [blocked, setBlocked] = useState(false);
  const [draft, setDraft] = useState(blank);
  const id = useRef("");
  const initial = useRef(JSON.stringify(blank));
  const discardTarget = useRef<"workspace" | "close">("workspace");
  const locked=busy||fileBusy||editorBusy;
  const dirty = JSON.stringify(draft) !== initial.current;
  const canManage = data?.canManage ?? false;
  useEffect(() => {
    if (view === "workspace" && mobilePreview && selected && window.matchMedia("(max-width: 767px)").matches)
      previewHeading.current?.focus();
  }, [view, mobilePreview, selected]);
  function closePreview() {
    const selectedId = selected?.id;
    setMobilePreview(false);
    setSelected(null);
    requestAnimationFrame(() => {
      const trigger = selectionTrigger.current?.isConnected ? selectionTrigger.current
        : [...(directory.current?.querySelectorAll<HTMLButtonElement>("button[data-template-id]") ?? [])]
          .find(button => button.dataset.templateId === selectedId);
      trigger?.focus();
    });
  }
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setFailed(false);
    const timer = window.setTimeout(
      () =>
        void templateApi
          .list(
            new URLSearchParams({
              search,
              status,
              page: String(page),
              pageSize: String(size),
              sort,
              direction,
            }),
            controller.signal,
          )
          .then((result) => {
            if (controller.signal.aborted) return;
            setData(result);
            if (page > Math.max(1, Math.ceil(result.total / size)))
              setPage(Math.max(1, Math.ceil(result.total / size)));
          })
          .catch(() => {
            if (!controller.signal.aborted) setFailed(true);
          })
          .finally(() => {
            if (!controller.signal.aborted) setLoading(false);
          }),
      300,
    );
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [search, status, page, size, sort, direction, refresh]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if ((dirty || locked) && (view === "edit" || view === "discard")) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, locked, view]);
  function leave(target: "workspace" | "close") {
    if (locked) return;
    if (view === "edit" && dirty) {
      discardTarget.current = target;
      setView("discard");
    } else if (target === "close") onClose();
    else setView("workspace");
  }
  function edit(template: EmailTemplate | null) {
    const value: TemplateInput = template
      ? {
          name: template.name,
          subject: template.subject,
          previewText: template.previewText,
          bodyText: template.bodyText,
          bodyHtml: template.bodyHtml,
          version: template.version,
          attachmentIds: (template.attachments??[]).map(file=>file.id),
        }
      : { ...blank };
    id.current = template?.id ?? crypto.randomUUID();
    saveRequest.current=null;
    setFiles(template?.attachments??[]);
    initial.current = JSON.stringify(value);
    setDraft(value);
    setBlocked(false);
    setError("");
    setNotice("");
    setView("edit");
  }
  function reportError(error: unknown) {
    if (error instanceof ApiClientError && error.status === 409) {
      setError(copy.templateConflict);
      setBlocked(true);
    } else setError(reusable.retrySave);
  }
  async function select(row: EmailTemplate, trigger?: HTMLButtonElement) {
    selectionTrigger.current = trigger ?? null;
    const request = ++selectionRequest.current;
    setBusy(true);
    setError("");
    try {
      const value = await templateApi.get(row.id);
      if (request === selectionRequest.current) {
        setSelected(value);
        setMobilePreview(true);
        setBlocked(false);
      }
    } catch {
      if (request === selectionRequest.current)
        setError(copy.templateLoadError);
    } finally {
      if (request === selectionRequest.current) setBusy(false);
    }
  }
  async function save() {
    if(saveLock.current||locked||blocked||!canManage)return;
    if (!draft.name.trim() || !draft.subject.trim() || !draft.bodyText.trim()) {
      setError(copy.templateRequired);
      return;
    }
    saveLock.current=true;
    setBusy(true);
    setError("");
    const snapshot=JSON.stringify(draft);
    if(saveRequest.current?.snapshot!==snapshot)saveRequest.current={snapshot,id:crypto.randomUUID()};
    try {
      const saved = await templateApi.save(id.current, {...draft,requestId:saveRequest.current!.id});
      setSelected(saved);
      setMobilePreview(true);
      const value:TemplateInput={name:saved.name,subject:saved.subject,previewText:saved.previewText,bodyText:saved.bodyText,bodyHtml:saved.bodyHtml,version:saved.version,attachmentIds:(saved.attachments??[]).map(f=>f.id)};
      setDraft(value);setFiles(saved.attachments??[]);initial.current=JSON.stringify(value);
      saveRequest.current=null;setSearch("");setStatus(saved.status);setPage(1);
      setView("workspace");
      setNotice(copy.templateSaved);
      setRefresh((v) => v + 1);
    } catch (e) {
      reportError(e);
    } finally {
      saveLock.current=false;setBusy(false);
    }
  }
  async function changeStatus() {
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      const next = selected.status === "ACTIVE" ? "ARCHIVED" : "ACTIVE";
      setSelected(await templateApi.status(selected, next));
      setView("workspace");
      setNotice(
        next === "ACTIVE" ? copy.templateRestored : copy.templateArchived,
      );
      setRefresh((v) => v + 1);
    } catch (e) {
      reportError(e);
    } finally {
      setBusy(false);
    }
  }
  const confirmation = view === "discard" || view === "archive";
  return (
    <SalesModalFrame tone={tone}
      open
      busy={locked}
      contentClassName={view === "workspace" ? "sm:max-w-6xl" : undefined}
      modalType={
        confirmation
          ? "confirmation"
          : view === "edit"
            ? "standard-form"
            : "operational-workspace"
      }
      title={
        view === "discard"
          ? copy.closeWarning
          : view === "archive"
            ? copy.archiveConfirm
            : view === "edit"
              ? draft.version
                ? copy.edit
                : copy.newTemplate
              : copy.templates
      }
      description={
        view === "archive" ? copy.archiveDescription : copy.templatesDescription
      }
      closeLabel={view === "workspace" ? workspace.close : copy.cancel}
      icon={<FileText className="h-5 w-5" />}
      onOpenChange={(open) => {
        if (!open) {
          if (view === "discard") setView("edit");
          else if (view === "archive") setView("workspace");
          else leave("close");
        }
      }}
      footerLeading={<Button className="h-11 rounded-xl !border-white !bg-white px-5 !text-slate-600 hover:!bg-white/90" variant="outline" disabled={locked} onClick={() => {
        if (view === "discard") setView("edit");
        else if (view === "archive") { setError("");setView("workspace"); }
        else if (view === "edit") leave("workspace");
        else onClose();
      }}>{view === "discard" ? copy.keepEditing : view === "edit" ? copy.back : view === "workspace" ? workspace.close : copy.cancel}</Button>}
      footerSummary={view === "workspace" && data ? `${copy.templates}: ${data.total}` : undefined}
      footer={view === "discard" ? <Button data-modal-destructive onClick={() => {
        if (discardTarget.current === "close") onClose();else setView("workspace");
      }}>{copy.discard}</Button> : view === "archive" ? <Button data-modal-destructive disabled={locked || blocked} onClick={() => void changeStatus()}>{busy ? copy.saving : copy.archive}</Button>
        : view === "edit" ? <Button disabled={locked || blocked || !canManage} onClick={() => void save()}>{busy ? copy.saving : copy.saveTemplate}</Button>
          : canManage ? <Button disabled={locked} onClick={() => edit(null)}><Plus className="mr-2 h-4 w-4" />{copy.newTemplate}</Button> : undefined}

    >
      {error && (
        <p role="alert" className="mb-4 text-sm text-red-700 dark:text-red-300">
          {error}
        </p>
      )}
      {view === "discard" ? (
        <p className="text-sm">{copy.closeWarning}</p>
      ) : view === "archive" ? (
        <p className="text-sm font-medium">{selected?.name}</p>
      ) : view === "edit" ? (
        <div className="space-y-4"><TemplateForm
          copy={copy}
          value={draft}
          onBusy={setEditorBusy}
          disabled={locked}
          onChange={(value) => {
            setDraft(value);
            setError("");
          }}
        /><MailingFiles shared files={files} disabled={locked||blocked} onBusy={setFileBusy} onChange={value=>{setFiles(value);setDraft(d=>({...d,attachmentIds:value.map(f=>f.id)}));setError("");}}/></div>
      ) : (
        <div className="space-y-3">
          {notice && <p role="status" className="text-sm text-emerald-800 dark:text-emerald-300">{notice}</p>}
          <div className={selected && mobilePreview ? "hidden md:block" : ""}>
            <SalesFilterBar title={copy.filters} className="rounded-xl shadow-none sm:p-3" gridClassName="grid-cols-2 md:grid-cols-[minmax(0,1fr)_9rem_14rem]">
              <SalesFilterSearch
                className="col-span-2 md:col-span-1" inputClassName="[&::-webkit-search-cancel-button]:appearance-none" label={copy.search} value={search} placeholder={copy.templateSearch}
                onValueChange={value => { setSearch(value.slice(0, 180)); setPage(1); }}
                onClear={() => { setSearch(""); setPage(1); }} clearLabel={workspace.clearSearch}
              />
              <SalesFilterSelect label={copy.status} value={status}
                onValueChange={value => { setStatus(value); setPage(1); }}
                options={[{ value: "ACTIVE", label: copy.active }, { value: "ARCHIVED", label: copy.archived }, { value: "ALL", label: copy.allTemplates }]}
              />
              <SalesFilterSelect label={workspace.sort} value={`${sort}:${direction}`}
                onValueChange={value => { const [column, order] = value.split(":"); setSort(column); setDirection(order as "asc" | "desc"); setPage(1); }}
                options={[
                  { value: "updatedAt:desc", label: workspace.newest }, { value: "updatedAt:asc", label: workspace.oldest },
                  { value: "name:asc", label: `${copy.templateName} · ${workspace.ascending}` }, { value: "name:desc", label: `${copy.templateName} · ${workspace.descending}` },
                  { value: "subject:asc", label: `${copy.subject} · ${workspace.ascending}` }, { value: "subject:desc", label: `${copy.subject} · ${workspace.descending}` },
                ]}
              />
            </SalesFilterBar>
          </div>
          <div className="grid min-w-0 items-start gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <div ref={directory} className={`min-w-0 ${selected && mobilePreview ? "hidden md:block" : ""}`}>
              {loading ? <p role="status" className="p-4 text-sm">{copy.loading}</p> : failed ? (
                <div role="alert" className="space-y-2 rounded-xl border p-4 text-sm">
                  <p>{copy.templateLoadError}</p>
                  <Button variant="outline" onClick={() => setRefresh(v => v + 1)}>{copy.retry}</Button>
                </div>
              ) : data && (
                <TemplateTable compact tone={tone} selectedId={selected?.id} disabled={locked}
                  copy={copy} locale={locale} data={data} page={page} size={size} sort={sort} direction={direction}
                  onPage={setPage} onSize={value => { setSize(value); setPage(1); }}
                  onSort={value => { setSort(value); setDirection(sort === value && direction === "asc" ? "desc" : "asc"); setPage(1); }}
                  onSelect={(row, trigger) => void select(row, trigger)}
                />
              )}
            </div>
            {selected ? (
              <div aria-busy={busy}
                className={`min-w-0 space-y-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 ${mobilePreview ? "" : "hidden md:block"}`}>
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
                  <h2 ref={previewHeading} tabIndex={-1} className="min-w-0 flex-1 text-sm font-medium text-slate-500 outline-none dark:text-slate-400">{copy.templatePreview}</h2>
                  <Button type="button" variant="ghost" className="h-11 min-w-11 px-2 md:order-last" disabled={locked}
                    title={workspace.closePreview} aria-label={workspace.closePreview} onClick={closePreview}>
                    <ArrowLeft aria-hidden="true" className="mr-2 h-4 w-4 md:hidden" />
                    <span className="md:hidden">{copy.back}</span><X aria-hidden="true" className="hidden h-4 w-4 md:block" />
                  </Button>
                  {canManage && <div className="flex w-full flex-wrap gap-2 md:w-auto">
                    <Button variant="outline" className="h-11" disabled={locked} onClick={() => edit(selected)}><Pencil className="mr-2 h-4 w-4" />{copy.edit}</Button>
                    <Button variant="ghost" className="h-11" disabled={locked || blocked}
                      onClick={() => { setError(""); setBlocked(false); if (selected.status === "ACTIVE") setView("archive"); else void changeStatus(); }}>
                      {selected.status === "ACTIVE" ? <Archive className="mr-2 h-4 w-4" /> : <RotateCcw className="mr-2 h-4 w-4" />}
                      {selected.status === "ACTIVE" ? copy.archive : copy.restore}
                    </Button>
                  </div>}
                </div>
                {selected.name !== selected.subject && <p className="break-words text-xs text-slate-500 dark:text-slate-400">{copy.templateName}: {selected.name}</p>}
                <TemplatePreview compact value={selected} copy={copy} />
                <MailingFiles compact files={selected.attachments ?? []} />
              </div>
            ) : (
              <div className="hidden min-h-48 items-center justify-center rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500 md:flex dark:border-slate-700 dark:text-slate-400">
                <div className="max-w-xs space-y-3"><FileText aria-hidden="true" className="mx-auto h-7 w-7 text-slate-400" /><p>{workspace.choose}</p></div>
              </div>
            )}
          </div>
          {data && !loading && !failed && data.total > 0 && (
            <div className={selected && mobilePreview ? "hidden md:block" : ""}>
              <DataTablePagination attached={false} className="rounded-xl py-3 shadow-none"
                currentPage={page} pageSize={size} pageSizeOptions={[10, 25, 50, 100, 200]}
                totalCount={data.total} totalPages={Math.max(1, Math.ceil(data.total / size))}
                pageStart={(page - 1) * size + 1} pageEnd={Math.min(page * size, data.total)}
                onPageChange={setPage} onPageSizeChange={value => { setSize(value); setPage(1); }}
              />
            </div>
          )}
        </div>
      )}
    </SalesModalFrame>
  );
}
