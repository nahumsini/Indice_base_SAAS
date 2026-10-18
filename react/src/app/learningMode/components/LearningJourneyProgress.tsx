import { useLearningProgress } from '../useLearningProgress';
import { learningStages, learningText } from '../curriculum';
import { useLanguage } from '../../shared/context';
import { IndiceEmoji } from '../../components/icons/ModuleTabEmoji';
import { Button } from '../../components/ui/button';

interface LearningProgressCopy {
  title: string; saved: string; reviewed: string; applied: string;
  continueAction: string; next: string; details: string; complete: string;
  error: string; retry: string;
}

export function LearningJourneyProgress({ onNavigate, copy }: {
  onNavigate: (page: string, tab?: string) => void;
  copy: LearningProgressCopy;
}) {
  const state = useLearningProgress();
  const { currentLanguage } = useLanguage();
  if (state.error) return <p role="status" className="rounded-xl bg-amber-50 p-3 text-sm dark:bg-amber-950/20">{copy.error}<button type="button" className="ml-2 underline" onClick={state.retry}>{copy.retry}</button></p>;
  if (!state.progress) return null;
  const next = state.progress.nextMission;
  const totals = state.progress.stages.reduce((sum, stage) => ({ total: sum.total + stage.total, reviewed: sum.reviewed + stage.understood + stage.applied, applied: sum.applied + stage.applied }), { total: 0, reviewed: 0, applied: 0 });
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <IndiceEmoji name="books" className="size-8 shrink-0" />
            <h2 className="text-xl font-semibold leading-tight tracking-tight text-slate-900 dark:text-white sm:text-2xl lg:text-[28px]">{copy.title}</h2>
          </div>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{copy.saved} · {totals.reviewed}/{totals.total} {copy.reviewed} · {totals.applied} {copy.applied}</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{next ? `${copy.next}: ${next.label}` : copy.complete}</p>
        </div>
        {next && <Button type="button" onClick={() => { void state.update(next.module, next.tab, 'start'); onNavigate(next.pageId, next.tab); }} className="min-h-11 w-full shrink-0 self-start whitespace-normal rounded-full sm:w-auto bg-blue-600 text-white hover:bg-blue-700">{copy.continueAction}</Button>}
      </div>
      <details className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
        <summary className="inline-flex min-h-11 cursor-pointer items-center sm:w-fit sm:min-h-0 text-sm font-medium text-blue-700 dark:text-blue-300">{copy.details}</summary>
        <ul className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {state.progress.stages.map(stage => <li key={stage.stage} className="min-w-0 rounded-lg bg-slate-50 p-2 text-xs dark:bg-slate-800">
            <p className="font-medium">{learningText(learningStages[stage.stage], currentLanguage.code)}</p>
            <p className="mt-1 text-slate-600 dark:text-slate-300">{stage.understood + stage.applied}/{stage.total} · {stage.applied} {copy.applied}</p>
          </li>)}
        </ul>
      </details>
    </section>
  );
}
