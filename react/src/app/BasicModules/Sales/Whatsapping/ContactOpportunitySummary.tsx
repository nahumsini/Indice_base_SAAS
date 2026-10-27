import type { Opportunity } from "./whatsappingApi";
import { useWhatsappingCopy } from "./whatsappingCopy";
import { useProspectosTranslations } from "../Prospectos/hooks/useProspectosTranslations";
import { opportunityStageLabel } from "./contactOpportunities";

/** Read-only owner summary; it has no controls inside the contact-selection button. */
export function ContactOpportunitySummary({ opportunities, compact = false }: { opportunities: Opportunity[]; compact?: boolean }) {
  const { copy } = useWhatsappingCopy();
  const t = useProspectosTranslations();
  if (!opportunities.length) return null;
  return <span className={compact ? "mt-2 block min-w-0 space-y-2 border-t border-slate-200/70 pt-2 dark:border-slate-700" : "block min-w-0 space-y-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-800/30"}>
    <span className="block text-xs text-slate-500 dark:text-slate-400">{copy.opportunities}{opportunities.length > 1 ? ` (${opportunities.length})` : ""}</span>
    <span role={compact ? undefined : "list"} aria-label={compact ? undefined : copy.opportunities} className="block space-y-2">{opportunities.map(opportunity => <span role={compact ? undefined : "listitem"} key={opportunity.id} className={compact ? "block min-w-0 space-y-1" : "flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1"}>
      <span className={`block min-w-0 break-words font-medium ${compact ? "text-xs" : "text-sm"}`}>{opportunity.name || opportunity.code || copy.opportunities}</span>
      <span className="inline-flex max-w-full items-center rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-normal whitespace-normal break-words text-slate-600 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300">{opportunityStageLabel(opportunity, t.options.stages, copy.stageUnavailable)}</span>
    </span>)}</span>
  </span>;
}
