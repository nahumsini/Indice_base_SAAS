import { ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../../../components/ui/collapsible";
import { useModuleLearningProgress } from "../../../learningMode/useModuleLearningProgress";
import type { MeetingCopy } from "../translations/meetingCopy";

export function MeetingGuide({ copy }: { copy: MeetingCopy }) {
  const { progress, setExpanded } =
    useModuleLearningProgress("meeting-control-v1");
  return (
    <Collapsible
      open={progress.expanded}
      onOpenChange={setExpanded}
      className="rounded-xl border border-blue-100 bg-blue-50 dark:border-blue-900 dark:bg-blue-950"
    >
      <CollapsibleTrigger className="flex min-h-11 w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:text-blue-200">
        <span aria-hidden="true">🧭</span>
        {copy.title}
        <ChevronDown
          className={`ml-auto h-4 w-4 ${progress.expanded ? "rotate-180" : ""}`}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-3 px-4 pb-4">
        <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
          {copy.guide}
        </p>
        <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
          {copy.retained}
        </p>
      </CollapsibleContent>
    </Collapsible>
  );
}
