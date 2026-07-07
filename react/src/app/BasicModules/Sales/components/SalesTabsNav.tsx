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
    <nav aria-label="Sales sections" className="-mx-4 mt-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
      <div className="flex min-w-max items-center gap-2 lg:min-w-0 lg:flex-wrap">
        {visibleSalesModuleTabs.map((tab) => {
          const active = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B5E]/30',
                active
                  ? 'bg-[#FF6B5E] text-white shadow-md shadow-[#FF6B5E]/20'
                  : 'bg-slate-100 text-slate-600 hover:bg-[#FF6B5E]/10 hover:text-[#B63B32] dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-[#FF6B5E]/15 dark:hover:text-[#FFB0AA]',
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
