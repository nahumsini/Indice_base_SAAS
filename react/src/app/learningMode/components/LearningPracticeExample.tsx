import type { LearningCharacterId } from '../characters';
import { useLearningCharacter } from '../useLearningCharacter';
import { useState } from 'react';
import { useLanguage } from '../../shared/context';
import { IndiceEmoji } from '../../components/icons/ModuleTabEmoji';
import { Button } from '../../components/ui/button';
import { getLearningPracticeCopy, type LearningPracticeId } from '../practiceExamples';

interface Props { characterId?: LearningCharacterId | null; id: LearningPracticeId; defaultOpen?: boolean; onOpenTools?: () => void; }

/** Use the dashboard's live selection when supplied, otherwise the existing scoped preference. */
export function LearningPracticeExample(props: Props) {
  return props.characterId !== undefined
    ? <PracticeForCharacter {...props} />
    : <SavedCasePractice {...props} />;
}

function SavedCasePractice(props: Props) {
  const [characterId] = useLearningCharacter();
  return <PracticeForCharacter {...props} characterId={characterId} />;
}

function PracticeForCharacter(props: Props) {
  const { currentLanguage } = useLanguage();
  // A different case, locale or stage starts a fresh local question, never a completion.
  return <PracticeContent key={`${props.id}:${props.characterId ?? 'emily'}:${currentLanguage.code}`} {...props} locale={currentLanguage.code} />;
}

/** Read-only practice: feedback is local and never changes business or learning records. */
function PracticeContent({ id, characterId, locale, defaultOpen = false, onOpenTools }: Props & { locale: string }) {
  const copy = getLearningPracticeCopy(locale, id, characterId);
  const [answer, setAnswer] = useState<{ id: LearningPracticeId; correct: boolean } | null>(null);
  const [mobileStep, setMobileStep] = useState(0);
  const currentAnswer = answer?.id === id ? answer : null;
  return (
    <details open={defaultOpen || undefined} data-learning-practice className="min-w-0 rounded-xl border border-slate-200 bg-white p-3 sm:p-4 dark:border-slate-700 dark:bg-slate-900">
      <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium leading-5 sm:min-h-0 sm:py-0 text-slate-900 dark:text-white">{copy.labels.summary}: {copy.title}</summary>
      <div className="mt-3 space-y-3 sm:mt-4 sm:space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div><p className="text-sm text-slate-700 dark:text-slate-200">{copy.purpose}</p><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{copy.labels.notice}</p></div>
          {onOpenTools && <Button type="button" variant="outline" size="sm" className="min-h-11 w-full shrink-0 self-start whitespace-normal rounded-full sm:min-h-9 sm:w-auto" onClick={onOpenTools}>{copy.openLabel}</Button>}
        </div>
        <div role="group" aria-label={copy.labels.summary} className="grid grid-cols-3 gap-2 md:hidden">
          {(['see', 'do', 'check'] as const).map((step, index) => <Button key={step} type="button" variant={mobileStep === index ? 'secondary' : 'outline'} aria-label={`${index + 1}. ${copy.labels[step]}`} aria-pressed={mobileStep === index} onClick={() => setMobileStep(index)} className="h-auto min-h-11 min-w-0 whitespace-normal rounded-full px-1 text-xs sm:text-sm">{copy.labels[step]}</Button>)}
        </div>
        <div aria-live="polite" className="grid gap-4 md:grid-cols-3">
          {(['see', 'do', 'check'] as const).map((step, index) => (
            <div key={step} className={mobileStep === index ? 'min-w-0' : 'hidden min-w-0 md:block'}>
              <p className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-white"><IndiceEmoji name={['photo', 'person', 'check'][index]} className="size-5" />{copy.labels[step]}</p>
              <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{copy[step]}</p>
            </div>
          ))}
        </div>
        <fieldset className={`${mobileStep === 2 ? '' : 'hidden md:block'} min-w-0 border-t border-slate-100 pt-3 dark:border-slate-800`}>
          <legend className="px-1 text-xs text-slate-500 dark:text-slate-400">{copy.labels.question}</legend>
          <p className="text-sm font-medium text-slate-900 dark:text-white">{copy.question}</p>
          <div className="mt-2 grid gap-2 sm:flex sm:flex-wrap">
            {[false, true].map(correct => <Button key={String(correct)} type="button" variant="outline" size="sm" aria-pressed={currentAnswer?.correct === correct} className="h-auto min-h-11 min-w-0 justify-start whitespace-normal break-words rounded-xl px-3 py-2 text-left leading-5 sm:min-h-9 sm:rounded-full" onClick={() => setAnswer({ id, correct })}>{correct ? copy.correct : copy.incorrect}</Button>)}
          </div>
          {currentAnswer && <p role="status" className={`mt-2 text-sm leading-5 ${currentAnswer.correct ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-600 dark:text-slate-300'}`}>{currentAnswer.correct ? copy.correctFeedback : copy.incorrectFeedback}</p>}
        </fieldset>
      </div>
    </details>
  );
}
