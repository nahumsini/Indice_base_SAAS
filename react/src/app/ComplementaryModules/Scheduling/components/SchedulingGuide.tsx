import { ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../../components/ui/collapsible';
import { useModuleLearningProgress } from '../../../learningMode/useModuleLearningProgress';
import type { SchedulingCopy } from '../translations/schedulingCopy';

/** Compact pilot companion: remembering expansion is not evidence of a completed business operation. */
export function SchedulingGuide({ copy }: { copy: SchedulingCopy }) {
  const { progress, setExpanded } = useModuleLearningProgress('scheduling-v1');
  return <Collapsible open={progress.expanded} onOpenChange={setExpanded} className="rounded-xl border border-[#FF6B5E]/20 bg-[#FF6B5E]/5 dark:border-[#FF6B5E]/30 dark:bg-[#FF6B5E]/10">
    <CollapsibleTrigger className="flex min-h-11 w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-[#B63B32] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B5E] dark:text-[#FFB0AA]"><span aria-hidden="true">🧭</span>{copy.guideTitle}<ChevronDown className={`ml-auto h-4 w-4 ${progress.expanded ? 'rotate-180' : ''}`} /></CollapsibleTrigger>
    <CollapsibleContent className="space-y-4 px-4 pb-4"><p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{copy.guideHint}</p>
      <ol className="grid gap-3 text-sm sm:grid-cols-3">{[copy.services, copy.team, copy.publicAgenda, copy.REQUESTED, copy.CONFIRMED, copy.attendance].map((label, index) => <li key={index} className="flex items-center gap-2"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#FF6B5E]/30 text-xs dark:border-[#FF6B5E]/40">{index + 1}</span>{label}</li>)}</ol>
    </CollapsibleContent>
  </Collapsible>;
}
