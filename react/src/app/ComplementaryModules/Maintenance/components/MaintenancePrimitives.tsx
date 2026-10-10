import {
  useEffect,
  useState,
  useId,
  useRef,
  cloneElement,
  type ReactElement,
  type ReactNode,
  type ComponentProps,
} from "react";
import { Wrench } from "lucide-react";
import { Button } from "../../../components/ui/button";
import {
  IndiceModalFrame,
  type IndiceModalType,
} from "../../../components/indice-modal/IndiceModalFrame";
import { getIndiceFilterControlClassName } from "../../../components/frontend-os/IndiceFilterBar";
import { useAuthorizationRevision } from "../../../hooks/useAuthorizationRevision";
import { ApiClientError } from "../../../lib/apiClient";
import {
  maintenanceApi,
  query,
  type Page,
  type Choice,
} from "../services/maintenanceApi";
import type { MaintenanceCopy } from "../translations/maintenanceCopy";

export const panel =
  "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900";
export const control =
  getIndiceFilterControlClassName("gray") +
  " w-full rounded-xl [color-scheme:light] dark:[color-scheme:dark]";
export const label = (c: MaintenanceCopy, key: string) =>
  c[key as keyof MaintenanceCopy] ?? key;
export function Action({
  primary = false,
  ...props
}: ComponentProps<typeof Button> & { primary?: boolean }) {
  return (
    <Button
      type="button"
      variant={primary ? "default" : "outline"}
      {...props}
      className={`min-h-11 rounded-xl px-4 ${primary ? "bg-slate-800 text-white hover:bg-slate-700 dark:bg-slate-200 dark:text-slate-900" : ""} ${props.className ?? ""}`}
    />
  );
}
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactElement;
}) {
  const id = useId();
  return (
    <div className="min-w-0 space-y-2">
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      {cloneElement(children as ReactElement<{ id?: string }>, { id })}
    </div>
  );
}
export function Feedback({
  children,
  error = false,
}: {
  children: ReactNode;
  error?: boolean;
}) {
  return (
    <div
      role={error ? "alert" : "status"}
      className={`rounded-xl border p-4 text-sm ${error ? "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200" : "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"}`}
    >
      {children}
    </div>
  );
}
export function Status({ value, c }: { value: string; c: MaintenanceCopy }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${["CLOSED", "ACCEPTED"].includes(value) ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200" : ["CRITICAL", "REJECTED"].includes(value) ? "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200" : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100"}`}
    >
      {label(c, value)}
    </span>
  );
}
export function errorCopy(error: unknown, c: MaintenanceCopy) {
  if (error instanceof ApiClientError) {
    if (error.status === 409) return c.conflict;
    if ([403, 404].includes(error.status)) return c.scopeError;
    const message = `${error.message} ${JSON.stringify(error.payload)}`;
    if (/schedule_conflict/.test(message)) return c.scheduleConflict;
    if (/other_fault_open/.test(message)) return c.otherFault;
    if (/currency_|duplicates_parts/.test(message)) return c.currencyError;
    if (
      /evidence_required|resolution_required|checklist_incomplete/.test(message)
    )
      return c.closureRequired;
    if (/reason_required/.test(message)) return c.reasonRequired;
    if (/identity_immutable/.test(message)) return c.assetIdentity;
    if (/file_|pdf_|image_/.test(message)) return c.fileError;
  }
  return c.error;
}
export function useMaintenanceQuery<T>(
  load: (signal: AbortSignal) => Promise<T>,
) {
  const revision = useAuthorizationRevision();
  const [tick, setTick] = useState(0);
  const [state, setState] = useState<{
    data?: T;
    error?: unknown;
    loading: boolean;
  }>({ loading: true });
  useEffect(() => {
    const abort = new AbortController();
    setState({ loading: true });
    Promise.resolve().then(() => load(abort.signal)).then(
      (data) => {
        if (!abort.signal.aborted) setState({ data, loading: false });
      },
      (error) => {
        if (!abort.signal.aborted) setState({ error, loading: false });
      },
    );
    return () => abort.abort();
  }, [load, revision, tick]);
  return { ...state, reload: () => setTick((v) => v + 1) };
}
export function Editor({
  title,
  c,
  children,
  draft,
  onSave,
  onSaved,
  onClose,
  ready = true,
  kind = "standard-form",
  footer,
  submitLabel,
}: {
  title: string;
  c: MaintenanceCopy;
  children: ReactNode;
  draft: unknown;
  onSave: () => Promise<unknown>;
  onSaved: () => void;
  onClose: () => void;
  ready?: boolean;
  kind?: IndiceModalType;
  footer?: ReactNode;
  submitLabel?: string;
}) {
  const form = useId(),
    initial = useRef(JSON.stringify(draft)),
    pending = useRef(false);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [discard, setDiscard] = useState(false);
  const close = () => {
    if (pending.current) return;
    if (initial.current !== JSON.stringify(draft)) setDiscard(true);
    else onClose();
  };
  return (
    <IndiceModalFrame
      open
      tone="gray"
      modalType={discard ? "confirmation" : kind}
      busy={busy}
      icon={<Wrench />}
      title={discard ? c.discard : title}
      description={c.subtitle}
      closeLabel={c.close}
      onOpenChange={(open) => {
        if (!open) close();
      }}
      footer={
        discard ? (
          <>
            <Action onClick={() => setDiscard(false)}>{c.keepEditing}</Action>
            <Action onClick={onClose}>{c.close}</Action>
          </>
        ) : (
          <>
            <Action disabled={busy} onClick={close}>
              {c.cancel}
            </Action>
            {footer}
            <Action primary type="submit" form={form} disabled={busy || !ready}>
              {busy ? c.loading : (submitLabel ?? c.save)}
            </Action>
          </>
        )
      }
    >
      {discard ? (
        <p>{c.discard}</p>
      ) : (
        <form
          id={form}
          className="space-y-5"
          onSubmit={async (e) => {
            e.preventDefault();
            if (pending.current || !ready) return;
            pending.current = true;
            setBusy(true);
            setError("");
            try {
              await onSave();
              onSaved();
            } catch (error) {
              setError(errorCopy(error, c));
            } finally {
              pending.current = false;
              setBusy(false);
            }
          }}
        >
          {error && <Feedback error>{error}</Feedback>}
          <fieldset disabled={busy} className="space-y-5">
            {children}
          </fieldset>
        </form>
      )}
    </IndiceModalFrame>
  );
}
export function ReasonEditor({
  title,
  c,
  onSave,
  onSaved,
  onClose,
}: {
  title: string;
  c: MaintenanceCopy;
  onSave: (reason: string) => Promise<unknown>;
  onSaved: () => void;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  return (
    <Editor
      title={title}
      c={c}
      kind="confirmation"
      draft={reason}
      ready={Boolean(reason.trim())}
      onSave={() => onSave(reason)}
      onSaved={onSaved}
      onClose={onClose}
      submitLabel={c.confirm}
    >
      <Field label={c.reason}>
        <textarea
          className={control}
          rows={4}
          required
          maxLength={2000}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </Field>
    </Editor>
  );
}
export function Picker<T extends Choice>({
  path,
  value,
  selected,
  onChange,
  c,
  title,
  describe,
}: {
  path: string;
  value: number | null;
  selected?: string | null;
  onChange: (item: T | null) => void;
  c: MaintenanceCopy;
  title: string;
  describe?: (item: T) => string;
}) {
  const [search, setSearch] = useState(""),
    [debounced, setDebounced] = useState(""),
    [page, setPage] = useState(1),
    [rows, setRows] = useState<Page<T>>(),
    [error, setError] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    const abort = new AbortController();
    setRows(undefined);
    setError(false);
    maintenanceApi
      .get<Page<T>>(
        path +
          (path.includes("?") ? "&" : "?") +
          query({ search: debounced, page, pageSize: 10 }).slice(1),
        abort.signal,
      )
      .then(
        (rows) => {
          if (!abort.signal.aborted) setRows(rows);
        },
        () => {
          if (!abort.signal.aborted) setError(true);
        },
      );
    return () => abort.abort();
  }, [path, debounced, page]);
  return (
    <div className="space-y-2">
      <Field label={`${title} · ${c.search}`}>
        <input
          className={control}
          value={search}
          maxLength={180}
          onChange={(e) => setSearch(e.target.value)}
        />
      </Field>
      <Field label={title}>
        <select
          className={control}
          value={value ?? ""}
          onChange={(e) =>
            onChange(
              rows?.items.find((item) => item.id === Number(e.target.value)) ??
                null,
            )
          }
        >
          <option value="">{c.select}</option>
          {value && !rows?.items.some((item) => item.id === value) && (
            <option value={value}>{selected || `#${value}`}</option>
          )}
          {rows?.items.map((item) => (
            <option key={item.id} value={item.id}>
              {describe ? describe(item) : item.name}
            </option>
          ))}
        </select>
      </Field>
      {error && <Feedback error>{c.error}</Feedback>}
      <div className="flex items-center gap-2">
        <Action
          disabled={page <= 1}
          onClick={() => setPage((v) => v - 1)}
          aria-label={c.previous}
        >
          ‹
        </Action>
        <span className="text-xs">
          {rows
            ? `${(page - 1) * 10 + (rows.items.length ? 1 : 0)}–${Math.min(page * 10, rows.total)} / ${rows.total}`
            : c.loading}
        </span>
        <Action
          disabled={!rows || page * 10 >= rows.total}
          onClick={() => setPage((v) => v + 1)}
          aria-label={c.more}
        >
          ›
        </Action>
      </div>
    </div>
  );
}
export const dateInput = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
export const localInput = (date: string) => {
  const d = new Date(date);
  return `${dateInput(d)}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};
export const formatDate = (
  value: string | null,
  locale: string,
  timezone?: string,
) =>
  value
    ? new Intl.DateTimeFormat(locale, {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: timezone,
      }).format(new Date(value))
    : "—";
