import { useEffect, useState } from "react";
import { Mail } from "lucide-react";
import { Button } from "../../../../components/ui/button";
import { canAccessModuleTab } from "../../../../access/tabScopeCatalog";
import { getCachedAuthSession } from "../../../../api/authSessionStore";
import { useAuthorizationRevision } from "../../../../hooks/useAuthorizationRevision";
import { DataTablePagination } from "../../../../components/table/DataTablePagination";
import { audienceApi, type ContactHistory } from "../audienceApi";
import { useAudienceCopy } from "../audienceCopy";
import { useMailingCopy } from "../translations";
import { useDeliveryCopy } from "../deliveryCopy";
import { AudienceState } from "./AudienceTable";

/** Read-only Mailing owner projection, loaded only when the authorized user opens the section. */
export function ContactMailingHistory({ contactId }: { contactId: string }) {
  const text = useAudienceCopy();
  const { locale } = useMailingCopy();
  const delivery = useDeliveryCopy();
  const revision = useAuthorizationRevision();
  const allowed = canAccessModuleTab(
    "sales",
    "mailing",
    getCachedAuthSession(),
  );
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ContactHistory | null>(null);
  const [error, setError] = useState(false);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    setPage(1);
    setData(null);
    setOpen(false);
  }, [contactId]);
  useEffect(() => {
    if (!open || !allowed || !/^\d+$/.test(contactId)) return;
    const c = new AbortController();
    setData(null);
    setError(false);
    void audienceApi
      .history(contactId, page, c.signal)
      .then((result) => {
        if (!c.signal.aborted) setData(result);
      })
      .catch(() => {
        if (!c.signal.aborted) setError(true);
      });
    return () => c.abort();
  }, [open, allowed, contactId, page, refresh, revision]);
  if (!allowed || !/^\d+$/.test(contactId)) return null;
  return (
    <details
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
      className="rounded-2xl border border-[#FF6B5E]/20 bg-white p-4 text-slate-900 dark:bg-slate-900 dark:text-slate-100"
    >
      <summary className="min-h-11 cursor-pointer text-sm font-medium">
        <Mail className="mr-2 inline h-4 w-4" />
        {text.history}
      </summary>
      {open && (
        <div className="space-y-3">
          <p className="text-xs text-slate-500">{text.historyHint}</p>
          {error ? (
            <div role="alert" className="text-sm text-red-700">
              {text.error}
              <Button
                className="min-h-11"
                type="button"
                variant="ghost"
                onClick={() => setRefresh((v) => v + 1)}
              >
                {text.retry}
              </Button>
            </div>
          ) : !data ? (
            <p role="status">{text.loading}</p>
          ) : (
            <>
              {data.items.length ? (
                data.items.map((row) => (
                  <article
                    key={row.campaignId}
                    className="space-y-2 rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-700"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium">{row.name}</p>
                      <AudienceState state={row.deliveryState} />
                    </div>
                    <p>{row.subject}</p>
                    <p className="text-xs text-slate-500">
                      {text.status}:{" "}
                      {
                        delivery.states[
                          row.campaignStatus as keyof typeof delivery.states
                        ]
                      }
                    </p>
                    {row.email && (
                      <p className="break-all text-xs text-slate-500">
                        {row.email}
                      </p>
                    )}
                    {(row.completedAt || row.scheduledAt) && (
                      <p className="text-xs text-slate-500">
                        {text.date}:{" "}
                        {new Intl.DateTimeFormat(locale, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(
                          new Date((row.completedAt || row.scheduledAt)!),
                        )}
                      </p>
                    )}
                  </article>
                ))
              ) : (
                <p className="text-sm">{text.noHistory}</p>
              )}
              {data.total > 10 && (
                <DataTablePagination
                  attached={false}
                  currentPage={page}
                  pageSize={10}
                  pageSizeOptions={[10]}
                  totalCount={data.total}
                  totalPages={Math.ceil(data.total / 10)}
                  pageStart={(page - 1) * 10 + 1}
                  pageEnd={Math.min(page * 10, data.total)}
                  onPageChange={setPage}
                  onPageSizeChange={() => {}}
                />
              )}
            </>
          )}
        </div>
      )}
    </details>
  );
}
