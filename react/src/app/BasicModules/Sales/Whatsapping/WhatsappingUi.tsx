import type { ReactNode, ReactElement } from "react";
import { useEffect, useId, isValidElement, cloneElement } from "react";
import { MessageCircle } from "lucide-react";
import { cn } from "../../../components/ui/utils";
export const panel =
  "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 dark:border-slate-700 dark:bg-slate-900";
export const control =
  "min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal text-slate-950 shadow-none [color-scheme:light] focus-visible:border-[#FF6B5E] focus-visible:ring-2 focus-visible:ring-[#FF6B5E]/25 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:[color-scheme:dark]";
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <div className="block min-w-0 space-y-1.5 text-sm font-medium">
      <label htmlFor={id} className="text-slate-600 dark:text-slate-300">
        {label}
      </label>
      {isValidElement(children)
        ? cloneElement(
            children as ReactElement<{ id?: string; className?: string }>,
            {
              id,
              className: cn(
                control,
                (children.props as { className?: string }).className,
              ),
            },
          )
        : children}
    </div>
  );
}
export function Badge({
  state,
  children,
}: {
  state: string;
  children: ReactNode;
}) {
  const color = ["DONE", "COMPLETED", "REPLIED", "READY"].includes(state)
    ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
    : ["ACTIVE", "PREPARED"].includes(state)
      ? "bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-200"
      : ["INVALID", "MISSING_DATA", "WAITING", "PAUSED", "BLOCKED"].includes(
            state,
          )
        ? "bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${color}`}
    >
      <span
        aria-hidden="true"
        className="size-1.5 shrink-0 rounded-full bg-current opacity-70"
      />
      {children}
    </span>
  );
}
/** Message presentation only; delivery and personalisation stay with the campaign owner. */
export function MessagePreview({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[#FF6B5E]/20 bg-[#FF6B5E]/5 dark:border-[#FF6B5E]/25 dark:bg-[#FF6B5E]/10">
      <h3 className="flex items-center gap-2 border-b border-[#FF6B5E]/15 px-4 py-3 text-sm font-medium text-[#B63B32] dark:text-[#FFB0AA]">
        <MessageCircle aria-hidden="true" className="size-4 shrink-0" />
        {title}
      </h3>
      <div className="p-4 sm:p-5">
        <p className="whitespace-pre-wrap break-words rounded-xl rounded-tl-sm border border-slate-200/80 bg-white p-4 text-sm font-normal leading-7 text-slate-800 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
          {children}
        </p>
      </div>
    </section>
  );
}
export function CampaignProgress({
  done,
  total,
  label,
}: {
  done: number;
  total: number;
  label: string;
}) {
  const percent = total ? Math.min(100, Math.round((done / total) * 100)) : 0;
  return (
    <div className="min-w-0 space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span>
          {done} / {total}
        </span>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {percent}%
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={total || 1}
        aria-valuenow={done}
        className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
      >
        <div
          className="h-full rounded-full bg-[#FF6B5E] transition-[width] motion-reduce:transition-none"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
export function ErrorNotice({ text }: { text: string }) {
  return text ? (
    <p
      role="alert"
      className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200"
    >
      {text}
    </p>
  ) : null;
}
export function useDirtyExit(dirty: boolean) {
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
}
