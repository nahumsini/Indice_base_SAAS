import { useLearningProgress } from '../useLearningProgress';
import { learningStages, learningText } from '../curriculum';
import { useLanguage } from '../../shared/context';
export function LearningJourneyProgress({ onNavigate }: {
    onNavigate: (page: string, tab?: string) => void;
}) {
    const state = useLearningProgress();
    const { currentLanguage } = useLanguage();
    const es = currentLanguage.code.toLowerCase().startsWith('es');
    if (state.error)
        return <p role="status" className="rounded-xl bg-amber-50 p-3 text-sm dark:bg-amber-950/20">{es ? 'No se pudo consultar tu avance.' : 'Your progress could not be loaded.'}<button className="ml-2 underline" onClick={state.retry}>{es ? 'Reintentar' : 'Retry'}</button></p>;
    if (!state.progress)
        return null;
    const next = state.progress.nextMission;
    return <section aria-label={es ? 'Mi avance de aprendizaje' : 'My learning progress'} className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm font-medium">{es ? 'Mi avance guardado' : 'My saved progress'}</p>
      {next ? <button type="button" className="text-left text-sm font-medium text-blue-700 underline dark:text-blue-300" onClick={() => { void state.update(next.module, next.tab, 'start'); onNavigate(next.pageId, next.tab); }}>{es ? 'Continuar: ' : 'Continue: '}{next.label}</button> : <p className="text-xs">{es ? 'Has revisado tus capítulos disponibles.' : 'You have reviewed your available chapters.'}</p>}
    </div>
    <ul className="mt-2 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">{state.progress.stages.map(stage => <li key={stage.stage} className="min-w-0 rounded-lg bg-slate-50 p-2 text-xs dark:bg-slate-900">
      <p className="font-medium">{learningText(learningStages[stage.stage], currentLanguage.code)}</p>
      <p className="mt-1 text-slate-600 dark:text-slate-300">{stage.understood + stage.applied}/{stage.total} · {stage.applied} {es ? 'aplicados' : 'applied'}</p>
    </li>)}</ul>
  </section>;
}
