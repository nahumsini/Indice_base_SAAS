import { Card } from '../../components/ui/card';
import type { OperationalTipDefinition } from '../operationalTips';
import type { MainDashboardTranslations } from '../translations';
import { OperationalTipCard } from './OperationalTipCard';

interface OperationalTipsSectionProps {
  copy: MainDashboardTranslations['operationalJourney']['tips'];
  tips: OperationalTipDefinition[];
}

export function OperationalTipsSection({ copy, tips }: OperationalTipsSectionProps) {
  if (tips.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="operational-tips-title">
      <Card className="overflow-hidden rounded-xl border border-slate-200/80 bg-white/90 p-4 shadow-[0_14px_42px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-950/80 lg:p-5">
        <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#2563EB] dark:text-[#93C5FD]">
              {copy.eyebrow}
            </p>
            <h3 id="operational-tips-title" className="mt-1 text-base font-semibold text-slate-950 dark:text-white">
              {copy.title}
            </h3>
          </div>
          <p className="max-w-xl text-xs leading-5 text-slate-500 dark:text-slate-400">
            {copy.subtitle}
          </p>
        </div>

        <div className="-mx-1 overflow-x-auto px-1 pb-1 scrollbar-hide">
          <div className="grid auto-cols-[82%] grid-flow-col gap-3 sm:auto-cols-[minmax(260px,46%)] lg:auto-cols-[minmax(270px,31%)]">
            {tips.map((tip) => {
              const item = copy.items[tip.id as keyof typeof copy.items];

              if (!item) {
                return null;
              }

              return (
                <OperationalTipCard
                  key={tip.id}
                  tip={tip}
                  item={item}
                  categoryLabel={copy.categoryLabels[tip.category]}
                />
              );
            })}
          </div>
        </div>
      </Card>
    </section>
  );
}
