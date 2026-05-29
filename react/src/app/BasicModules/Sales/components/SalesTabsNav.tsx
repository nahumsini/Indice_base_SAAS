import { visibleSalesModuleTabs, type SalesTabId } from '../salesIdentity';
import type { SalesTranslations } from '../translations';

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
    <nav className="mt-4 flex items-center gap-2 overflow-x-auto pb-2">
      {visibleSalesModuleTabs.map((tab) => {
        const active = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
              active
                ? 'bg-[#FF6B5E] text-white shadow-md shadow-[#FF6B5E]/20'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200'
            }`}
          >
            <span className="text-base leading-none" aria-hidden="true">{tab.emoji}</span>
            <span>{copy.tabs[tab.translationKey]}</span>
          </button>
        );
      })}
    </nav>
  );
}
