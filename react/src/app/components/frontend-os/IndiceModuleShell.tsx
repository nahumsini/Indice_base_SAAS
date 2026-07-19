import { Home } from 'lucide-react';
import type { ReactNode, Ref } from 'react';
import { FavoritesBar } from '../FavoritesBar';
import { Button } from '../ui/button';
import { MODULE_COLORS, type IndiceModuleTone } from '../../styles/moduleColors';

export type IndiceModuleTab<TabId extends string> = {
  id: TabId;
  label: string;
  icon: ReactNode;
};

interface IndiceModuleShellProps<TabId extends string> {
  activeTab: TabId;
  backLabel?: string;
  children: ReactNode;
  contentRef?: Ref<HTMLDivElement>;
  currentModule: string;
  guide?: ReactNode;
  loadingOverlay?: ReactNode;
  onNavigate?: (page?: string) => void;
  onTabChange: (tabId: TabId) => void;
  subtitle: string;
  tabs: ReadonlyArray<IndiceModuleTab<TabId>>;
  title: string;
  tone: IndiceModuleTone;
}

/**
 * Presentation-only module frame approved by Frontend Operating System v2.
 * Permissions, route resolution, tab availability, and feature behavior stay
 * inside the owning module.
 */
export function IndiceModuleShell<TabId extends string>({
  activeTab,
  backLabel,
  children,
  contentRef,
  currentModule,
  guide,
  loadingOverlay,
  onNavigate,
  onTabChange,
  subtitle,
  tabs,
  title,
  tone,
}: IndiceModuleShellProps<TabId>) {
  const theme = MODULE_COLORS[tone];
  const activeTextColor = tone === 'yellow' || tone === 'gold' ? '#222831' : '#ffffff';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-white">
      {loadingOverlay}
      <header className="border-b border-slate-200 bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-900 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
        <div className="mx-auto max-w-[1600px]">
          {onNavigate ? (
            <FavoritesBar
              currentModule={currentModule}
              onNavigate={(page) => {
                if (page !== currentModule) onNavigate(page);
              }}
            />
          ) : null}

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold leading-tight text-slate-950 dark:text-white sm:text-3xl">{title}</h1>
              <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base">{subtitle}</p>
            </div>
            {backLabel && onNavigate ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => onNavigate()}
                className="w-full shrink-0 justify-center gap-2 text-sm sm:w-auto"
              >
                <Home aria-hidden="true" className="h-4 w-4" />
                {backLabel}
              </Button>
            ) : null}
          </div>

          <nav aria-label={title} className="-mx-4 mt-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
            <div className="flex min-w-max items-center gap-2 lg:min-w-0 lg:flex-wrap">
              {tabs.map(tab => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    aria-current={isActive ? 'page' : undefined}
                    onClick={() => onTabChange(tab.id)}
                    className={`flex min-h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 ${
                      isActive
                        ? 'border-transparent shadow-md'
                        : `border-transparent bg-slate-100 text-slate-600 hover:text-slate-950 dark:bg-slate-800 dark:text-slate-300 dark:hover:text-white ${theme.iconHover}`
                    }`}
                    style={isActive ? {
                      backgroundColor: theme.primary,
                      color: activeTextColor,
                      boxShadow: `0 8px 18px -12px ${theme.primary}`,
                    } : undefined}
                  >
                    <span aria-hidden="true" className="text-base leading-none">{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </nav>

          {guide ? <div className="mt-4">{guide}</div> : null}
        </div>
      </header>

      <main ref={contentRef} className="mx-auto max-w-[1600px] scroll-mt-24 px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
        {children}
      </main>
    </div>
  );
}
