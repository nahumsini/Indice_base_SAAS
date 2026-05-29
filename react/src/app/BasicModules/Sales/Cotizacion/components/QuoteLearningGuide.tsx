import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleDollarSign,
  Lightbulb,
  Quote,
} from 'lucide-react';
import { useLocalStorageState } from '../../../../hooks/useLocalStorageState';
import type { QuotesTranslations } from '../translations';

type QuoteLearningGuideProps = {
  copy: QuotesTranslations['learningMode'];
};

const guideIcons = [Quote, CircleDollarSign, CheckCircle2] as const;

export function QuoteLearningGuide({ copy }: QuoteLearningGuideProps) {
  const [isCollapsed, setIsCollapsed] = useLocalStorageState<boolean>(
    'indice.sales.quotes.learningGuide.collapsed',
    false,
  );

  return (
    <section className="overflow-hidden rounded-lg border border-[#FF6B5E]/25 bg-white shadow-sm dark:border-[#FFB4AD]/20 dark:bg-slate-950">
      <div className="border-b border-[#FF6B5E]/10 bg-[#FF6B5E]/[0.06] p-5 dark:border-[#FFB4AD]/10 dark:bg-[#FF6B5E]/10">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#FF6B5E]/25 bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-[#B63B32] shadow-sm dark:border-[#FFB4AD]/25 dark:bg-slate-950 dark:text-[#FFD8D4]">
              <Lightbulb className="h-3.5 w-3.5" />
              {copy.eyebrow}
            </div>
            <h3 className="mt-3 text-xl font-black text-slate-950 dark:text-white">{copy.title}</h3>
            <p className="mt-2 max-w-4xl text-sm font-medium leading-6 text-slate-600 dark:text-slate-300">
              {copy.subtitle}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsCollapsed((currentValue) => !currentValue)}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#FF6B5E]/25 bg-white px-4 text-sm font-bold text-[#B63B32] shadow-sm transition hover:bg-[#FF6B5E]/10 dark:border-[#FFB4AD]/25 dark:bg-slate-950 dark:text-[#FFD8D4] dark:hover:bg-slate-900"
          >
            {isCollapsed ? copy.expandLabel : copy.collapseLabel}
            {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {isCollapsed ? null : (
        <div className="space-y-4 p-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#B63B32] dark:text-[#FFD8D4]">
              {copy.flowTitle}
            </p>
            <div className="mt-3 grid gap-3 lg:grid-cols-4">
              {copy.flow.map((item, index) => (
                <article key={item.label} className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-slate-950 dark:text-white">{item.label}</p>
                      <p className="mt-2 text-xs font-medium leading-5 text-slate-600 dark:text-slate-300">{item.description}</p>
                    </div>
                    {index < copy.flow.length - 1 ? (
                      <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-[#FF6B5E]" />
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr]">
            <div className="rounded-lg border border-[#FF6B5E]/15 bg-[#FF6B5E]/[0.04] p-4 dark:border-[#FFB4AD]/15 dark:bg-[#FF6B5E]/10">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#B63B32] dark:text-[#FFD8D4]">
                {copy.cardsTitle}
              </p>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                {copy.cards.map((card, index) => {
                  const CardIcon = guideIcons[index] ?? CheckCircle2;

                  return (
                    <article key={card.title} className="rounded-lg border border-white/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/75">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#FF6B5E]/20 bg-[#FF6B5E]/10 text-[#B63B32] dark:border-[#FFB4AD]/20 dark:bg-[#FFB4AD]/10 dark:text-[#FFD8D4]">
                        <CardIcon className="h-4 w-4" />
                      </span>
                      <p className="mt-3 text-sm font-black text-slate-950 dark:text-white">{card.title}</p>
                      <p className="mt-2 text-xs font-medium leading-5 text-slate-600 dark:text-slate-300">{card.body}</p>
                    </article>
                  );
                })}
              </div>
            </div>

            <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                {copy.checklistTitle}
              </p>
              <div className="mt-3 space-y-2">
                {copy.checklist.map((item) => (
                  <div key={item} className="flex items-start gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#177d66]" />
                    <p className="text-xs font-semibold leading-5 text-slate-700 dark:text-slate-200">{item}</p>
                  </div>
                ))}
              </div>
              <p className="mt-3 rounded-lg border border-[#FF6B5E]/15 bg-[#FF6B5E]/[0.05] px-3 py-2 text-xs font-bold leading-5 text-[#B63B32] dark:border-[#FFB4AD]/15 dark:bg-[#FFB4AD]/10 dark:text-[#FFD8D4]">
                {copy.footer}
              </p>
            </aside>
          </div>
        </div>
      )}
    </section>
  );
}
