import {
  useEffect,
  useState,
  useId,
  cloneElement,
  type ReactElement,
  type ReactNode,
  type ComponentProps,
} from "react";
import { Button } from "../../../components/ui/button";
import { IndiceModalFrame } from "../../../components/indice-modal/IndiceModalFrame";
import { getIndiceFilterControlClassName } from "../../../components/frontend-os/IndiceFilterBar";
import { useAuthorizationRevision } from "../../../hooks/useAuthorizationRevision";
import { ApiClientError } from "../../../lib/apiClient";
import type { MeetingCopy } from "../translations/meetingCopy";

export const panel =
  "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900";
export const control =
  getIndiceFilterControlClassName("blue") +
  " rounded-[12px] [color-scheme:light] dark:[color-scheme:dark]";
export function Action({
  primary = false,
  ...props
}: ComponentProps<typeof Button> & { primary?: boolean }) {
  return (
    <Button
      type="button"
      variant={primary ? "default" : "outline"}
      {...props}
      className={`min-h-11 rounded-xl px-4 ${primary ? "bg-blue-600 text-white hover:bg-blue-700" : "border-slate-200 bg-white text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"} ${props.className ?? ""}`}
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
      <label
        htmlFor={id}
        className="block text-sm font-medium text-slate-700 dark:text-slate-200"
      >
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
      className={`rounded-xl border p-4 text-sm leading-6 ${error ? "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200" : "border-blue-100 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200"}`}
    >
      {children}
    </div>
  );
}
export function Status({
  status,
  copy,
}: {
  status: string;
  copy: MeetingCopy;
}) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${status === "COMPLETED" || status === "DONE" ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" : status === "CANCELLED" ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" : status === "IN_PROGRESS" ? "bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-200" : "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200"}`}
    >
      {copy[status as keyof MeetingCopy] ?? status}
    </span>
  );
}
export function useMeetingQuery<T>(load: (signal: AbortSignal) => Promise<T>) {
  const auth = useAuthorizationRevision(),
    [revision, setRevision] = useState(0),
    [data, setData] = useState<T>(),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setData(undefined);
    setLoading(true);
    setError(false);
    Promise.resolve()
      .then(() => load(controller.signal))
      .then((value) => {
        if (!controller.signal.aborted) setData(value);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [load, auth, revision]);
  return { data, loading, error, reload: () => setRevision((n) => n + 1) };
}
export function Editor({
  title,
  copy,
  children,
  onSave,
  onClose,
  onSaved,
  destructive = false,
  ready = true,
  submitLabel,
  description,
}: {
  title: string;
  copy: MeetingCopy;
  children: ReactNode;
  onSave: () => Promise<unknown>;
  onClose: () => void;
  onSaved: () => void;
  destructive?: boolean;
  ready?: boolean;
  submitLabel?: string;
  description?: string;
}) {
  const id = useId(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [dirty, setDirty] = useState(false),
    [discard, setDiscard] = useState(false);
  const close = () => (dirty ? setDiscard(true) : onClose());
  return (
    <IndiceModalFrame
      open
      tone="blue"
      modalType={discard || destructive ? "confirmation" : "standard-form"}
      busy={busy}
      icon="📝"
      title={discard ? copy.discard : title}
      description={description ?? copy.subtitle}
      closeLabel={copy.close}
      onOpenChange={(open) => {
        if (!open) close();
      }}
      footer={
        discard ? (
          <>
            <Action onClick={() => setDiscard(false)}>
              {copy.keepEditing}
            </Action>
            <Action onClick={onClose}>{copy.close}</Action>
          </>
        ) : (
          <>
            <Action disabled={busy} onClick={close}>
              {copy.cancel}
            </Action>
            <Action
              primary
              disabled={busy || !ready}
              type="submit"
              form={id}
              data-modal-destructive={destructive || undefined}
            >
              {busy ? copy.loading : (submitLabel ?? copy.save)}
            </Action>
          </>
        )
      }
    >
      {!discard && (
        <form
          id={id}
          className="space-y-5"
          onChange={() => setDirty(true)}
          onSubmit={async (e) => {
            e.preventDefault();
            if (busy || !ready) return;
            setBusy(true);
            setError("");
            try {
              await onSave();
              onSaved();
            } catch (error) {
              setError(
                error instanceof ApiClientError && error.status === 409
                  ? copy.conflict
                  : copy.error,
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          {error && <Feedback error>{error}</Feedback>}
          {children}
        </form>
      )}
    </IndiceModalFrame>
  );
}
export { dateInput, instantRange, dateEnd } from "../utils/dateScope";
