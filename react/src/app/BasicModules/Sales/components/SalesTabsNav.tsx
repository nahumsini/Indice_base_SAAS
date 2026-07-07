import { visibleSalesModuleTabs, type SalesTabId } from '../salesIdentity';
import type { SalesTranslations } from '../translations';
import { cn } from '../../../components/ui/utils';

interface SalesTabsNavProps {
  activeTab: SalesTabId;
  copy: Pick<SalesTranslations, 'tabs'>;
  onTabChange: (tabId: SalesTabId) => void;
}

export function SalesTabsNav({
  activeTab,
  copy,
  onTabChange,
}: SalesTabsNavProps) {
  return (
    <nav aria-label="Sales sections" className="mt-4 overflow-x-auto pb-2">
      <div className="inline-flex min-w-max items-center gap-1 rounded-full border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        {visibleSalesModuleTabs.map((tab) => {
          const active = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B5E]/30',
                active
                  ? 'bg-[#FF6B5E] text-white shadow-md shadow-[#FF6B5E]/20'
                  : 'text-slate-600 hover:bg-[#FF6B5E]/10 hover:text-[#B63B32] dark:text-slate-300 dark:hover:bg-[#FF6B5E]/15 dark:hover:text-[#FFB0AA]',
              )}
            >
              <span className="text-base leading-none" aria-hidden="true">
                {tab.emoji}
              </span>
              <span>{copy.tabs[tab.translationKey]}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
