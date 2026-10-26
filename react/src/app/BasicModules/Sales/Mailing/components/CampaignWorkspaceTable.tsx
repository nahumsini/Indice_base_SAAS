import { ArrowRight, AlertCircle, Mail, Clock3 } from "lucide-react";
import { Button } from "../../../../components/ui/button";
import {
  TableBody,
  TableCell,
  TableRow,
} from "../../../../components/ui/table";
import { IndiceViewState } from "../../../../components/frontend-os";
import { DataTablePagination } from "../../../../components/table/DataTablePagination";
import {
  IndiceTableShell,
  IndiceOperationalTable,
  IndiceTableColGroup,
  IndiceTableHeaderRow,
  type IndiceTableColumnDefinition,
} from "../../../../components/table/IndiceTableEngine";
import { usePersistentColumnWidths } from "../../../../hooks/usePersistentColumnWidths";
import { salesTitleBarPrimaryActionClassName } from "../../components/SalesTitleBar";
import { useMailingCopy } from "../translations";
import { useDeliveryCopy } from "../deliveryCopy";
import { useMailingWorkspaceCopy } from "../workspaceCopy";
import {
  campaignAction,
  processedCount,
  type CampaignRow,
  type CampaignWorkspace,
} from "../workspaceApi";
const widths = {
  name: 250,
  sender: 180,
  status: 155,
  recipients: 135,
  scheduledAt: 180,
  progress: 240,
};
type Column = keyof typeof widths;
const sortable: Column[] = ["name", "status", "scheduledAt"];
export const campaignStateClass: Record<CampaignRow["status"], string> = {
  DRAFT: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  SCHEDULED: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-200",
  RUNNING:
    "bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-200",
  PAUSED: "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  COMPLETED:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200",
  CANCELLED:
    "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};
export function CampaignWorkspaceTable({
  data,
  filters,
  loading,
  onPage,
  onSize,
  onSort,
  onOpen,
  onReview,
  onCreate,
  onClear,
  filtered,
}: {
  data: CampaignWorkspace;
  filters: {
    page: number;
    pageSize: number;
    sort: string;
    direction: "asc" | "desc";
  };
  loading: boolean;
  onPage: (page: number) => void;
  onSize: (size: number) => void;
  onSort: (column: string) => void;
  onOpen: (row: CampaignRow) => void;
  onReview: (row: CampaignRow) => void;
  onCreate: () => void;
  onClear: () => void;
  filtered: boolean;
}) {
  const { copy, locale } = useMailingCopy(),
    text = useMailingWorkspaceCopy(),
    deliveryCopy = useDeliveryCopy();
  const labels = {
    name: copy.campaign,
    sender: text.sender,
    status: text.status,
    recipients: text.recipients,
    scheduledAt: text.schedule,
    progress: text.progress,
  };
  const { columnWidths, resizeColumn } = usePersistentColumnWidths<Column>({
    defaults: widths,
    headerLabels: labels,
    sortableColumnIds: sortable,
    storageKey: "sales-mailing-workspace-widths-v1",
  });
  const columns: IndiceTableColumnDefinition<Column>[] = (
    Object.keys(widths) as Column[]
  ).map((id) => ({
    id,
    label: labels[id],
    width: columnWidths[id],
    defaultWidth: widths[id],
    contentMinimumWidth: widths[id],
    sortable: sortable.includes(id),
    alignment: id === "recipients" ? "right" : "left",
    resizeLabel: `${copy.resize}: ${labels[id]}`,
  }));
  const date = (value: string) =>
    new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  return (
    <div aria-busy={loading} className="min-w-0 space-y-3">
      <IndiceTableShell
        pagination={
          data.total > 0 ? (
            <DataTablePagination
              currentPage={filters.page}
              pageSize={filters.pageSize}
              pageSizeOptions={[10, 25, 50, 100, 200]}
              totalCount={data.total}
              totalPages={Math.max(1, Math.ceil(data.total / filters.pageSize))}
              pageStart={(filters.page - 1) * filters.pageSize + 1}
              pageEnd={Math.min(filters.page * filters.pageSize, data.total)}
              onPageChange={onPage}
              onPageSizeChange={onSize}
            />
          ) : undefined
        }
      >
        <IndiceOperationalTable
          minimumWidth={
            Object.values(columnWidths).reduce((a, b) => a + b, 0) + 205
          }
        >
          <IndiceTableColGroup columns={columns} actionsWidth={205} />
          <IndiceTableHeaderRow
            columns={columns}
            onResize={resizeColumn}
            sortState={{
              columnId: filters.sort as Column,
              direction: filters.direction,
            }}
            onSort={onSort}
            actions={{ label: copy.actions, width: 205 }}
            tone="coral"
          />
          <TableBody>
            {data.items.map((row) => {
              const sender = data.senders.find(
                  (s) => s.id === row.senderAccountId,
                ),
                draft = row.status === "DRAFT",
                processed = processedCount(row.delivery);
              const progress = row.delivery.total
                ? Math.round((100 * processed) / row.delivery.total)
                : 0;
              return (
                <TableRow
                  key={row.id}
                  className="text-slate-900 dark:text-slate-100"
                >
                  <TableCell className="whitespace-normal">
                    <div className="font-medium break-words">{row.name}</div>
                    <div className="mt-1 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">
                      {row.subject || "—"}
                    </div>
                    <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      {text.updated}: {date(row.updatedAt)}
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    <div className="text-sm font-medium break-words">
                      {sender?.displayName || row.senderName || text.noSender}
                    </div>
                    <div className="mt-1 break-all text-xs text-slate-500 dark:text-slate-400">
                      {sender?.email ||
                        (row.senderAccountId
                          ? text.privateSender
                          : text.noSender)}
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${campaignStateClass[row.status]}`}
                    >
                      {deliveryCopy.states[row.status]}
                    </span>
                    {row.waitingForQuota && (
                      <span
                        title={deliveryCopy.quotaWaitHint}
                        className="mt-2 flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300"
                      >
                        <Clock3 className="h-3.5 w-3.5 shrink-0" />
                        {deliveryCopy.waitingForQuota}
                      </span>
                    )}
                    {row.requiresAttention && (
                      <span className="mt-2 flex items-center gap-1 text-xs text-amber-800 dark:text-amber-200">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        {text.attention}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="font-medium tabular-nums">
                      {draft ? row.selectedCount : row.delivery.total}
                    </div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {draft ? text.selected : text.snapshot}
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    <div className="flex items-start gap-2 text-sm">
                      <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                      {row.scheduledAt
                        ? date(row.scheduledAt)
                        : text.notScheduled}
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    {draft ? (
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {text.recipientsHint}
                      </span>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex justify-between gap-2 text-xs">
                          <span>{text.processed}</span>
                          <span className="font-medium tabular-nums">
                            {processed} / {row.delivery.total}
                          </span>
                        </div>
                        <div
                          role="progressbar"
                          aria-label={`${text.progress}: ${row.name}`}
                          aria-valuenow={progress}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
                        >
                          <div
                            className="h-full rounded-full bg-[#FF6B5E]"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                          <span className="text-emerald-700 dark:text-emerald-300">
                            {text.accepted}: {row.delivery.accepted}
                          </span>
                          <span className="text-slate-500 dark:text-slate-400">
                            {text.pending}:{" "}
                            {row.delivery.pending + row.delivery.submitting}
                          </span>
                          {row.delivery.failed > 0 && (
                            <span className="text-red-700 dark:text-red-300">
                              {text.failed}: {row.delivery.failed}
                            </span>
                          )}
                          {row.delivery.unknown > 0 && (
                            <span className="text-amber-800 dark:text-amber-200">
                              {text.unknown}: {row.delivery.unknown}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {data.canViewDetails && (
                      <div className="flex flex-col items-end gap-1">
                        <Button
                          variant="outline"
                          className="h-11 text-[#B83D32] dark:text-[#FF9B91]"
                          disabled={loading}
                          onClick={() => onOpen(row)}
                        >
                          {text[campaignAction(row.status, data.canEdit)]}
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                        {draft && data.canEdit && (
                          <Button
                            variant="ghost"
                            className="h-11 text-xs"
                            disabled={loading}
                            onClick={() => onReview(row)}
                          >
                            {text.reviewSend}
                          </Button>
                        )}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {!data.items.length && (
              <TableRow>
                <TableCell colSpan={7}>
                  <IndiceViewState
                    variant="empty"
                    title={filtered ? text.noMatches : text.emptyTitle}
                    description={filtered ? undefined : text.emptyHint}
                    tone="coral"
                    action={
                      filtered ? (
                        <Button variant="outline" onClick={onClear}>
                          {text.clear}
                        </Button>
                      ) : data.canEdit ? (
                        <Button
                          className={salesTitleBarPrimaryActionClassName}
                          onClick={onCreate}
                        >
                          <Mail className="mr-2 h-4 w-4" />
                          {copy.newCampaign}
                        </Button>
                      ) : undefined
                    }
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </IndiceOperationalTable>
      </IndiceTableShell>
      <p className="px-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
        {text.progressHint}
      </p>
    </div>
  );
}
