import { cn } from '../../../components/ui/utils';
import { FavoritesBar } from '../../../components/FavoritesBar';
import {
  receivablesTabs,
  type ReceivablesTabId,
} from '../constants/receivables.constants';
import type { ReceivablesTranslations } from '../translations';

interface ReceivablesModuleHeaderProps {
  activeTab: ReceivablesTabId;
  copy: ReceivablesTranslations;
  onNavigate: (page: string) => void;
  onTabChange: (tab: ReceivablesTabId) => void;
}

export function ReceivablesModuleHeader({
  activeTab,
  copy,
  onNavigate,
  onTabChange,
}: ReceivablesModuleHeaderProps) {
  return (
    <header className="border-b border-gray-200 bg-white px-4 py-4 dark:border-gray-700 dark:bg-gray-800 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
      <div className="mx-auto max-w-[1600px]">
        <FavoritesBar onNavigate={onNavigate} currentModule="receivables" />

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
              {copy.module.title}
            </h1>
            <p className="max-w-3xl text-sm text-gray-600 dark:text-gray-400 sm:text-base">
              {copy.module.subtitle}
            </p>
          </div>
        </div>

        <nav
          aria-label={copy.module.navLabel}
          className="-mx-4 mt-4 overflow-x-auto px-4 pb-2 scrollbar-hide sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0"
        >
          <div className="flex min-w-max items-center gap-2 lg:min-w-0 lg:flex-wrap">
            {receivablesTabs.map((tab) => {
              const active = tab.id === activeTab;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onTabChange(tab.id)}
                  className={cn(
                    'inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#147514]/30',
                    active
                      ? 'bg-[#147514] text-white shadow-md shadow-[#147514]/25'
                      : 'bg-gray-100 text-gray-600 hover:bg-[#147514]/10 hover:text-[#147514] dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-emerald-400/10 dark:hover:text-emerald-300',
                  )}
                >
                  <span className="text-base leading-none" aria-hidden="true">{tab.emoji}</span>
                  <span>{copy.tabs[tab.id]}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </header>
  );
}
