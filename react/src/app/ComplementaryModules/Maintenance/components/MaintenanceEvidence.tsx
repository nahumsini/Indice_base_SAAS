import { useRef, useState } from "react";
import {
  maintenanceApi,
  type Attachment,
  type Event,
} from "../services/maintenanceApi";
import type { MaintenanceCopy } from "../translations/maintenanceCopy";
import {
  Action,
  Feedback,
  errorCopy,
  formatDate,
  label,
} from "./MaintenancePrimitives";

export function Evidence({
  type,
  id,
  items,
  canUpload,
  c,
  onChanged,
}: {
  type: string;
  id: number;
  items: Attachment[];
  canUpload: boolean;
  c: MaintenanceCopy;
  onChanged: () => void;
}) {
  const input = useRef<HTMLInputElement>(null),
    pending = useRef(false);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <section className="space-y-4">
      <h3 className="font-semibold">{c.evidence}</h3>
      <p className="text-sm text-slate-500">{c.evidenceHint}</p>
      {error && <Feedback error>{error}</Feedback>}
      {canUpload && (
        <>
          <input
            ref={input}
            aria-label={c.upload}
            type="file"
            accept="image/jpeg,image/png,application/pdf"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file || pending.current) return;
              if (
                file.size > 10485760 ||
                !["image/jpeg", "image/png", "application/pdf"].includes(
                  file.type,
                )
              ) {
                setError(c.fileError);
                return;
              }
              pending.current = true;
              setBusy(true);
              setError("");
              try {
                await maintenanceApi.upload(type, id, file);
                onChanged();
              } catch (error) {
                setError(errorCopy(error, c));
              } finally {
                pending.current = false;
                setBusy(false);
              }
            }}
          />
          <Action
            disabled={busy || items.length >= 20}
            onClick={() => input.current?.click()}
          >
            {busy ? c.loading : c.upload}
          </Action>
        </>
      )}
      {!items.length && (
        <p className="text-sm text-slate-500">{c.noEvidence}</p>
      )}
      {items.map((file) => (
        <div
          key={file.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3"
        >
          <span className="min-w-0 break-all text-sm">
            {file.filename} · {Math.ceil(file.sizeBytes / 1024)} KB
          </span>
          <Action
            onClick={async () => {
              setError("");
              try {
                const download = await maintenanceApi.get<{ url: string }>(
                  `/evidence/${type}/${id}/${file.id}`,
                );
                window.open(download.url, "_blank", "noopener,noreferrer");
              } catch (error) {
                setError(errorCopy(error, c));
              }
            }}
          >
            {c.download}
          </Action>
        </div>
      ))}
    </section>
  );
}
export function History({
  items,
  c,
  locale,
}: {
  items: Event[];
  c: MaintenanceCopy;
  locale: string;
}) {
  const action = (value: string) =>
    value.startsWith("STATUS_")
      ? label(c, value.slice(7))
      : ((
          {
            ORDER_CREATED: c.newOrder,
            ORDER_PLANNED: c.edit,
            PROGRESS_SAVED: c.progress,
            REQUEST_CREATED: c.newRequest,
            REQUEST_ACCEPTED: c.accept,
            REQUEST_REJECTED: c.reject,
            EVIDENCE_REGISTERED: c.upload,
            PREVENTIVE_GENERATED: c.preventiveWork,
            PART_ISSUED: c.parts,
            PART_REVERSED: c.reverse,
            LABOR_RECORDED: c.labor,
            LABOR_REVERSED: c.reverse,
            EXPENSE_LINKED: c.expenses,
            TASK_LINKED: c.taskLinked,
            ASSET_RESTORED: c.restore,
          } as Record<string, string>
        )[value] ?? c.history);
  return (
    <section className="space-y-4">
      <h3 className="font-semibold">{c.history}</h3>
      {items.length === 100 && <Feedback>{c.partialHistory}</Feedback>}
      <ol className="space-y-3">
        {items.map((event) => (
          <li key={event.id} className="rounded-xl border p-3">
            <div className="flex flex-wrap justify-between gap-2 text-sm">
              <strong>{action(event.action)}</strong>
              <time>{formatDate(event.createdAt, locale)}</time>
            </div>
            {event.reason && (
              <p className="mt-2 whitespace-pre-wrap break-words text-sm">
                {event.reason}
              </p>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
