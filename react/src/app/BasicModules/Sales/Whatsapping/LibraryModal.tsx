import { useEffect, useRef, useState } from "react";
import { FileText, Plus, Users, ArrowUpRight } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
import { IndiceModalValidation } from "../../../components/indice-modal";
import { SalesModalFrame } from "../components/SalesModalFrame";
import {
  whatsappingApi,
  type Template,
  type SavedList,
} from "./whatsappingApi";
import { useWhatsappingCopy } from "./whatsappingCopy";
import {
  Badge,
  Field,
  panel,
  useDirtyExit,
} from "./WhatsappingUi";
import { failure, validBody, variables } from "./whatsappingModel";
import {
  SalesFilterBar,
  SalesFilterSearch,
} from "../components/SalesFilterBar";
import { ContactPicker } from "./ContactPicker";
import { TemplateLibraryWorkspace } from "./TemplateLibraryWorkspace";
export function LibraryModal({
  mode,
  onClose,
}: {
  mode: "templates" | "lists";
  onClose: () => void;
}) {
  const { copy, label } = useWhatsappingCopy();
  const [templates, setTemplates] = useState<Template[]>([]),
    [lists, setLists] = useState<SavedList[]>([]),
    [edit, setEdit] = useState<Template | SavedList | null>(null),
    [busy, setBusy] = useState(true),
    [error, setError] = useState(""),
    [search, setSearch] = useState(""),
    [discard, setDiscard] = useState(false),
    [loadRevision, setLoadRevision] = useState(0);
  const original = useRef(""),
    latch = useRef(false),
    mounted = useRef(true);
  const dirty = !!edit && JSON.stringify(edit) !== original.current;
  useDirtyExit(dirty);
  useEffect(() => {
    mounted.current = true;
    const c = new AbortController();
    setBusy(true);
    setError("");
    const request = mode === "templates"
      ? whatsappingApi.templates(c.signal).then(rows => { if (!c.signal.aborted) setTemplates(rows); })
      : whatsappingApi.lists(c.signal).then(rows => { if (!c.signal.aborted) setLists(rows); });
    void request
      .catch((e) => {
        if (!c.signal.aborted) setError(failure(e, copy));
      })
      .finally(() => {
        if (!c.signal.aborted) setBusy(false);
      });
    return () => {
      c.abort();
      mounted.current = false;
    };
  }, [mode, loadRevision]);
  function open(record: Template | SavedList) {
    original.current = JSON.stringify(record);
    setEdit(record);
    setError("");
  }
  function close() {
    if (latch.current) return;
    if (dirty) setDiscard(true);
    else if (edit) setEdit(null);
    else onClose();
  }
  async function save() {
    if (!edit || latch.current) return;
    if (
      !edit.name.trim() ||
      ("body" in edit ? !validBody(edit.body) : !edit.contactIds.length)
    ) {
      setError("body" in edit ? copy.missing : copy.noContacts);
      return;
    }
    latch.current = true;
    setBusy(true);
    setError("");
    try {
      if ("body" in edit) {
        const rows = await whatsappingApi.saveTemplate(edit);
        if (mounted.current) setTemplates(rows);
      } else {
        const rows = await whatsappingApi.saveList(edit);
        if (mounted.current) setLists(rows);
      }
      if (mounted.current) setEdit(null);
    } catch (e) {
      if (mounted.current) setError(failure(e, copy));
    } finally {
      latch.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  const title = mode === "templates" ? copy.templates : copy.lists;
  const tokenLabels = { name: copy.contactName, clientCompany: copy.contactCompany, seller: copy.owner, company: copy.senderCompany, link: copy.messageLink };
  const catalog = (mode === "templates" ? templates : lists)
    .filter((r) =>
      r.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
    )
    .sort((a, b) => a.name.localeCompare(b.name));
  return (
    <SalesModalFrame
      open
      busy={busy}
      modalType={
        discard
          ? "confirmation"
          : edit
            ? "standard-form"
            : "operational-workspace"
      }
      icon={mode === "templates" ? <FileText /> : <Users />}
      title={discard ? copy.discardTitle : edit && mode === "templates" ? (edit.version === 0 ? copy.newTemplate : copy.editTemplate) : edit?.name || title}
      description={discard ? copy.discardHint : edit && mode === "templates" ? copy.templateFormHint : mode === "templates" ? copy.templatesHint : copy.listsHint}
      closeLabel={copy.close}
      onOpenChange={discard ? () => setDiscard(false) : close}
      footerLeading={
        <Button
          variant="outline"
          disabled={busy}
          onClick={discard ? () => setDiscard(false) : close}
        >
          {discard ? copy.keep : edit ? copy.cancel : copy.close}
        </Button>
      }
      footerSummary={!edit && !discard && !busy && !error ? `${mode === "templates" ? templates.length : lists.length} · ${title}` : undefined}
      footer={
        discard ? (
          <Button
            data-modal-destructive
            onClick={() => {
              setDiscard(false);
              setEdit(null);
            }}
          >
            {copy.discard}
          </Button>
        ) : edit ? (
          <Button disabled={busy} onClick={() => void save()}>
            {busy ? copy.loading : copy.save}
          </Button>
        ) : (
          <Button
            disabled={busy}
            onClick={() =>
              open(
                mode === "templates"
                  ? {
                      id: crypto.randomUUID(),
                      name: "",
                      body: "",
                      status: "ACTIVE",
                      version: 0,
                    }
                  : {
                      id: crypto.randomUUID(),
                      name: "",
                      contactIds: [],
                      version: 0,
                    },
              )
            }
          >
            <Plus className="size-4" aria-hidden="true" />
            {mode === "templates" ? copy.newTemplate : copy.newList}
          </Button>
        )
      }
    >
      {mode === "templates" && <TemplateLibraryWorkspace active={!edit && !discard} busy={busy} loadFailed={!!error && !edit} records={templates} onEdit={open} />}
      {!discard && (
        <div className="space-y-4">
          <IndiceModalValidation messages={error ? [error] : []} />
          {error && !edit && <Button variant="outline" disabled={busy} onClick={() => setLoadRevision(value => value + 1)}>{copy.retry}</Button>}
          {edit ? (
            <fieldset disabled={busy} className={`${panel} space-y-4`}>
              <Field label={`${copy.name} *`}>
                <Input
                  autoFocus
                  required
                  maxLength={180}
                  value={edit.name}
                  onChange={(e) => { setEdit({ ...edit, name: e.target.value }); setError(""); }}
                />
              </Field>
              {"body" in edit ? (
                <>
                  <Field label={`${copy.message} *`}>
                    <Textarea
                      className="min-h-48"
                      rows={9}
                      value={edit.body}
                      maxLength={4000}
                      required
                      onChange={(e) => { setEdit({ ...edit, body: e.target.value }); setError(""); }}
                    />
                  </Field>
                  <p className="text-sm text-slate-500">{copy.variables}</p>
                  <div className="flex flex-wrap gap-2">
                    {variables.filter((v): v is keyof typeof tokenLabels => v !== "offer").map((v) => (
                      <Button
                        key={v}
                        type="button"
                        variant="outline"
                        onClick={() =>
                          setEdit({
                            ...edit,
                            body: `${edit.body} {{${v}}}`.trim().slice(0, 4000),
                          })
                        }
                      >{tokenLabels[v]}</Button>
                    ))}
                  </div>
                  <Field label={copy.status}>
                    <select value={edit.status} className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      onChange={(event) => { setEdit({ ...edit, status: event.target.value }); setError(""); }}>
                      <option value="ACTIVE">{copy.available}</option>
                      <option value="ARCHIVED">{label("ARCHIVED")}</option>
                    </select>
                  </Field>
                </>
              ) : (
                <ContactPicker
                  region="MX"
                  selected={edit.contactIds}
                  onChange={(contactIds) => setEdit({ ...edit, contactIds })}
                  disabled={busy}
                />
              )}
            </fieldset>
          ) : mode === "lists" ? (
            <>
              <SalesFilterBar
                title={copy.filters}
                gridClassName="grid-cols-1 md:grid-cols-1"
                summary={String(catalog.length)}
              >
                <SalesFilterSearch
                  label={copy.search}
                  placeholder={title}
                  value={search}
                  onValueChange={setSearch}
                  onClear={() => setSearch("")}
                  clearLabel={copy.clear}
                />
              </SalesFilterBar>
              {busy ? (
                <p role="status">{copy.loading}</p>
              ) : catalog.length ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {catalog.map((record) => (
                    <button
                      type="button"
                      key={record.id}
                      onClick={() => open(record)}
                      className={`${panel} group min-h-36 text-left transition hover:border-[#FF6B5E]/50 hover:bg-[#FF6B5E]/5 focus-visible:outline-2 focus-visible:outline-[#FF6B5E]`}
                    >
                      <span className="mb-3 flex items-center justify-between gap-3">
                        <span
                          aria-hidden="true"
                          className="flex size-10 items-center justify-center rounded-xl bg-[#FF6B5E]/10 text-[#B63B32] dark:text-[#FFB0AA]"
                        >
                          {"body" in record ? (
                            <FileText className="size-5" />
                          ) : (
                            <Users className="size-5" />
                          )}
                        </span>
                        {"body" in record ? (
                          <Badge
                            state={
                              record.status === "ACTIVE"
                                ? "READY"
                                : record.status
                            }
                          >
                            {record.status === "ACTIVE"
                              ? copy.available
                              : label(record.status)}
                          </Badge>
                        ) : (
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {record.contactIds.length} · {copy.contacts}
                          </span>
                        )}
                      </span>
                      <span className="flex items-center justify-between gap-3 text-base font-medium">
                        <span className="break-words">{record.name}</span>
                        <ArrowUpRight
                          aria-hidden="true"
                          className="size-4 shrink-0 text-slate-400 group-hover:text-[#B63B32]"
                        />
                      </span>
                      {"body" in record && (
                        <span className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm font-normal leading-6 text-slate-600 dark:text-slate-300">
                          {record.body}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <p className={`${panel} py-12 text-center`}>{copy.noResults}</p>
              )}
            </>
          ) : null}
        </div>
      )}
    </SalesModalFrame>
  );
}
