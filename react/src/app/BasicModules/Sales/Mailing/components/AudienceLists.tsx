import { ImportContactsModal } from "../../Contactos/components/ImportContactsModal";
import { useContactFileImport } from "../../Contactos/hooks/useContactFileImport";
import { useContactosTranslations } from "../../Contactos/hooks/useContactosTranslations";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Bookmark, Plus } from "lucide-react";
import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";
import { SalesFilterSelect } from "../../components/SalesFilterBar";
import {
  audienceApi,
  type AudienceContact,
  type AudienceList,
} from "../audienceApi";
import { useAudienceCopy } from "../audienceCopy";
import type { MailingContact } from "../mailingApi";
import { useMailingWorkspaceCopy } from "../workspaceCopy";
import { ApiClientError } from "../../../../lib/apiClient";

export function AudienceLists({
  children,
  assigning = false,
  onAssignmentSaved,
  onListsLoaded,
  selected,
  disabled,
  onAdd,
  onBusyChange,
  onLoad,
  expanded = false,
  readOnly = false,
}: {
  children?: ReactNode;
  assigning?: boolean;
  onAssignmentSaved?: () => void;
  onListsLoaded?: (lists: AudienceList[]) => void;
  onLoad?: (rows: AudienceContact[]) => void;
  expanded?: boolean;
  readOnly?: boolean;
  selected: MailingContact[];
  disabled: boolean;
  onAdd: (rows: AudienceContact[]) => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const text = useAudienceCopy();
  const contactCopy = useContactosTranslations();
  const importContacts = useContactFileImport();
  const [importOpen, setImportOpen] = useState(false);
  const workspaceCopy = useMailingWorkspaceCopy();
  const [lists, setLists] = useState<AudienceList[]>([]);
  const [current, setCurrent] = useState("all");
  const [editor, setEditor] = useState<{
    id: string;
    version: number;
    name: string;
  } | null>(null);
  const [archive, setArchive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [refresh, setRefresh] = useState(0);
  const inFlight = useRef(false);
  const active = lists.find((row) => row.id === current);
  useEffect(() => {
    const controller = new AbortController();
    setError("");
    void audienceApi
      .lists(controller.signal)
      .then(items => {
        if (controller.signal.aborted) return;
        setLists(items);
        onListsLoaded?.(items);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(text.error);
      });
    return () => controller.abort();
  }, [refresh, text, onListsLoaded]);
  async function run(action: () => Promise<void>) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    onBusyChange(true);
    setError("");
    setNotice("");
    try {
      await action();
    } catch (e) {
      setError(
        e instanceof ApiClientError && e.status === 409
          ? text.conflict
          : text.error,
      );
    } finally {
      inFlight.current = false;
      setBusy(false);
      onBusyChange(false);
    }
  }
  const spanish = contactCopy.table.columns.contact === "Contacto";
  function chooseList(value: string) {
    if (!onLoad || value === "all") setCurrent(value);
    setArchive(false);
    setEditor(null);
    setNotice("");
    if (onLoad && value !== "all") {
      void run(async () => {
        const result = await audienceApi.list(value);
        setCurrent(value);
        onLoad(result.items);
        if (result.unavailable) setNotice(`${text.unavailable}: ${result.unavailable}`);
      });
    }
  }
  const controls = (
      <div className="space-y-3">
        {expanded ? (
          <div>
            <h3 className="text-lg font-semibold">{active?.name ?? (spanish ? "Listas de segmentación" : "Segmentation lists")}</h3>
            {active && <p className="text-sm text-slate-600 dark:text-slate-300">
              {active.contactCount} {spanish ? "integrantes en la lista" : "members in this list"}
            </p>}
            {!active && <p className="text-sm text-slate-600 dark:text-slate-300">
              {assigning
                ? (spanish ? "Elige una lista existente o crea una con los contactos seleccionados." : "Choose an existing list or create one with the selected contacts.")
                : (spanish ? "Elige una lista para ver sus integrantes o importa contactos desde un archivo." : "Choose a list to view its members or import contacts from a file.")}
            </p>}
          </div>
        ) : <p className="text-xs text-slate-500 dark:text-slate-400">{text.listHint}</p>}
        <div className={expanded ? "max-w-xl" : undefined}><SalesFilterSelect
          label={expanded ? (spanish ? "Elegir lista de segmentación" : "Choose a segmentation list") : text.lists}
          value={current}
          onValueChange={chooseList}
          options={[
            { value: "all", label: expanded ? (spanish ? "Selecciona una lista" : "Select a list") : "—" },
            ...lists.map((row) => ({
              value: row.id,
              label: `${row.name} · ${row.contactCount}`,
              disabled: disabled || busy,
            })),
          ]}
        /></div>
        <div className="flex flex-wrap gap-2">
          {onLoad && !readOnly && (
            <Button type="button" disabled={disabled || busy} onClick={() => setImportOpen(true)}>
              {spanish ? "Importar contactos desde archivo" : "Import contacts from file"}
            </Button>
          )}
          {!expanded && <Button
            className="min-h-11"
            type="button"
            variant="outline"
            disabled={!active || disabled || busy}
            onClick={() =>
              void run(async () => {
                const result = await audienceApi.list(current);
                (onLoad ?? onAdd)(result.items);
                if (result.unavailable)
                  setNotice(`${text.unavailable}: ${result.unavailable}`);
              })
            }
          >
            {onLoad ? workspaceCopy.loadList : text.useList}
          </Button>}
          <Button
            className="min-h-11"
            type="button"
            variant="outline"
            disabled={readOnly || !selected.length || disabled || busy}
            onClick={() => {
              setArchive(false);
              setEditor({ id: crypto.randomUUID(), version: 0, name: "" });
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            {assigning ? (spanish ? "Crear lista con la selección" : "Create list with selection") : text.newList}
          </Button>
          {importOpen && (
            <ImportContactsModal
              copy={contactCopy.importModal}
              isOpen
              initialListId={active?.id ?? "new"}
              onOpenChange={setImportOpen}
              onImportContacts={importContacts}
              onListSaved={(list) => {
                setCurrent(list.id);
                setRefresh(value => value + 1);
                void run(async () => {
                  const result = await audienceApi.list(list.id);
                  onLoad?.(result.items);
                });
              }}
            />
          )}
          {active && (
            <>
              {(onLoad || assigning) && (
                <Button
                  className="min-h-11"
                  type="button"
                  variant="outline"
                  disabled={readOnly || !selected.length || disabled || busy}
                  onClick={() => void run(async () => {
                    await audienceApi.addMembers(active.id, active.name, selected.map(row => row.id), active.version);
                    setRefresh(value => value + 1);
                    if (assigning) onAssignmentSaved?.();
                    else if (onLoad) onLoad((await audienceApi.list(active.id)).items);
                    setNotice(text.saved);
                  })}
                >
                  {assigning
                    ? (spanish ? `Añadir ${selected.length} a ${active.name}` : `Add ${selected.length} to ${active.name}`)
                    : (spanish ? "Añadir a la lista" : "Add to list")}
                </Button>
              )}
              {!assigning && <>
              <Button
                className="min-h-11"
                type="button"
                variant="outline"
                disabled={readOnly || !selected.length || disabled || busy}
                onClick={() => {
                  setArchive(false);
                  setEditor({
                    id: active.id,
                    version: active.version,
                    name: active.name,
                  });
                }}
              >
                {text.updateList}
              </Button>
              <Button
                className="min-h-11"
                type="button"
                variant="ghost"
                disabled={readOnly || disabled || busy}
                onClick={() => {
                  setEditor(null);
                  setArchive(true);
                }}
              >
                {text.archiveList}
              </Button>
              </>}
            </>
          )}
        </div>
        {editor && (
          <div className="space-y-3 rounded-xl border bg-white p-3 dark:bg-slate-900">
            <label className="block text-sm">
              {text.listName}
              <Input
                className="mt-2 h-11"
                value={editor.name}
                maxLength={180}
                disabled={busy || disabled}
                onChange={(e) => setEditor({ ...editor, name: e.target.value })}
              />
            </label>
            <p className="text-xs">
              {text.selected}: {selected.length}
            </p>
            <div className="flex gap-2">
              <Button
                className="min-h-11"
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => setEditor(null)}
              >
                {text.close}
              </Button>
              <Button
                className="min-h-11"
                type="button"
                disabled={readOnly || busy || disabled || !selected.length}
                onClick={() => {
                  if (!editor.name.trim()) {
                    setError(text.nameRequired);
                    return;
                  }
                  void run(async () => {
                    const saved = await audienceApi.save(
                      editor.id,
                      editor.name,
                      selected.map((row) => row.id),
                      editor.version,
                    );
                    setEditor(null);
                    setCurrent(saved.id);
                    setRefresh((v) => v + 1);
                    setNotice(text.saved);
                    if (assigning) onAssignmentSaved?.();
                  });
                }}
              >
                {text.saveList}
              </Button>
            </div>
          </div>
        )}
        {archive && active && (
          <div className="space-y-2 rounded-xl border p-3">
            <p className="text-sm">{text.archiveConfirm}</p>
            <Button
              className="min-h-11"
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => setArchive(false)}
            >
              {text.close}
            </Button>{" "}
            <Button
              className="min-h-11"
              type="button"
              disabled={readOnly || busy || disabled}
              onClick={() =>
                void run(async () => {
                  await audienceApi.archive(active);
                  setArchive(false);
                  setCurrent("all");
                  setRefresh((v) => v + 1);
                  setNotice(text.archived);
                })
              }
            >
              {text.confirmArchive}
            </Button>
          </div>
        )}
        {notice && (
          <p
            role="status"
            className="text-sm text-emerald-700 dark:text-emerald-300"
          >
            {notice}
          </p>
        )}
        {error && (
          <div role="alert" className="text-sm text-red-700 dark:text-red-300">
            {error}
            <Button
              className="min-h-11"
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={() => setRefresh((v) => v + 1)}
            >
              {text.reload}
            </Button>
          </div>
        )}
      </div>
  );
  const panel = "rounded-2xl border border-[#FF6B5E]/20 bg-[#FF6B5E]/5 p-4 dark:bg-[#FF6B5E]/10";
  if (expanded) {
    return (
      <div className="min-w-0 space-y-5">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-5">
          {controls}
        </section>
        {children}
      </div>
    );
  }
  return (
    <details className={panel}>
      <summary className="mb-2 min-h-11 cursor-pointer text-sm font-medium">
        <Bookmark className="mr-2 inline h-4 w-4" />
        {text.lists}
      </summary>
      {controls}
    </details>
  );
}
