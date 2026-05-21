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
    <section className="border-t border-slate-200/75 pt-4 dark:border-slate-800">
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#558DBD] dark:text-[#b7d6ed]">
            {copy.eyebrow}
          </p>
          <h3 className="mt-1 text-base font-semibold text-slate-950 dark:text-white">
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
    </section>
  );
}
