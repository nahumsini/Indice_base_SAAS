import { useState } from 'react';
import { Check, Clipboard, Lightbulb } from 'lucide-react';
import { QUESTION_IDEAS, type QuestionCategory, type QuestionIdeaId } from '../constants';
import type { IntegrationsTranslations } from '../translations';
import { copyText } from '../utils';

const categories: QuestionCategory[] = ['pulse', 'money', 'products', 'team'];

export function AiQuestionIdeas({ copy }: { copy: IntegrationsTranslations }) {
  const [copiedId, setCopiedId] = useState<QuestionIdeaId | null>(null);

  const copyQuestion = async (ideaId: QuestionIdeaId) => {
    await copyText(copy.ideas.items[ideaId].prompt);
    setCopiedId(ideaId);
    window.setTimeout(() => setCopiedId((current) => current === ideaId ? null : current), 1800);
  };

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
        <h3 className="text-xl font-medium text-slate-950 dark:text-white">{copy.ideas.title}</h3>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">{copy.ideas.description}</p>

        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          {categories.map((category) => (
            <section key={category} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
              <h4 className="flex items-center gap-2 text-base font-medium text-slate-950 dark:text-white">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#2563EB]/10 text-[#2563EB] dark:text-[#93C5FD]"><Lightbulb className="h-4 w-4" /></span>
                {copy.ideas.categoryLabels[category]}
              </h4>
              <div className="mt-3 space-y-3">
                {QUESTION_IDEAS.filter((idea) => idea.category === category).map((idea) => {
                  const content = copy.ideas.items[idea.id];
                  const copied = copiedId === idea.id;
                  return (
                    <article key={idea.id} className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60">
                      <p className="text-sm font-medium leading-6 text-slate-950 dark:text-white">“{content.prompt}”</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{content.value}</p>
                      <button
                        type="button"
                        onClick={() => void copyQuestion(idea.id)}
                        className="mt-3 inline-flex h-9 items-center gap-2 rounded-xl px-3 text-xs font-medium text-[#2563EB] hover:bg-[#2563EB]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] dark:text-[#93C5FD]"
                      >
                        {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
                        {copied ? copy.ideas.copied : copy.ideas.copy}
                      </button>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </section>

      <aside className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/50 dark:bg-blue-950/30">
        <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-blue-700 dark:text-blue-300" />
        <div>
          <h3 className="text-sm font-medium text-slate-950 dark:text-white">{copy.ideas.tipTitle}</h3>
          <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{copy.ideas.tipDescription}</p>
        </div>
      </aside>
    </div>
  );
}
