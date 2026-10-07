import { chapterFor, learningText } from '../curriculum';
import { useLanguage } from '../../shared/context';
export function LearningWorkflowDetails({ module, tab }: {
    module: string;
    tab: string;
}) {
    const { currentLanguage } = useLanguage();
    const chapter = chapterFor(module, tab);
    if (!chapter)
        return null;
    const english = !currentLanguage.code.toLowerCase().startsWith('es');
    return <details className="mt-3 rounded-lg border border-slate-200 bg-white p-3 text-sm dark:border-slate-800 dark:bg-slate-950">
    <summary className="cursor-pointer font-medium">{english ? 'Learn the complete workflow' : 'Aprende el flujo completo'}</summary>
    <ol className="mt-3 list-decimal space-y-2 pl-5 text-slate-700 dark:text-slate-200">{chapter.steps.map((step, i) => <li key={i}>{learningText(step, currentLanguage.code)}</li>)}</ol>
  </details>;
}
