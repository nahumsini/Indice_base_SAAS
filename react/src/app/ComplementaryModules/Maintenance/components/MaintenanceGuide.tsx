import { ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../../../components/ui/collapsible";
import { useModuleLearningProgress } from "../../../learningMode/useModuleLearningProgress";
import type { MaintenanceCopy } from "../translations/maintenanceCopy";

export function MaintenanceGuide({ c }: { c: MaintenanceCopy }) {
  const { progress, setExpanded } = useModuleLearningProgress("maintenance-v1");
  return (
    <Collapsible
      open={progress.expanded}
      onOpenChange={setExpanded}
      className="rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800"
    >
      <CollapsibleTrigger className="flex min-h-11 w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500">
        <span aria-hidden="true">🧭</span>
        {c.guide}
        <ChevronDown
          className={`ml-auto h-4 w-4 ${progress.expanded ? "rotate-180" : ""}`}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-3 px-4 pb-4">
        <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
          {c.guideText}
        </p>
        <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
          {c.closedHint}
        </p>
      </CollapsibleContent>
    </Collapsible>
  );
}
