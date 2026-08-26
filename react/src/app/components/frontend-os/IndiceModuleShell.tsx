import type { ReactNode, Ref } from 'react';
import { ChevronDown, MoreHorizontal } from 'lucide-react';
import { FavoritesBar } from '../FavoritesBar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { getModulePrimaryForeground, MODULE_COLORS, type IndiceModuleTone } from '../../styles/moduleColors';
import { getCachedAuthSession } from '../../api/authSessionStore';
import { canAccessModuleTab } from '../../access/tabScopeCatalog';
import { resolvePageId, type PageId } from '../../config/navigation';
import { useAuthorizationRevision } from '../../hooks/useAuthorizationRevision';

const MODULE_EMOJI_BY_ROUTE: Record<string, string> = {
  'human-resources': '👥',
  'processes-tasks': '✅',
  expenses: '💸',
  'petty-cash': '💰',
  sales: '💼',
  'point-of-sale': '🛒',
  receivables: '📒',
  kpis: '📊',
  inventory: '📦',
  'material-warehouse': '🏭',
  production: '🏗️',
};

export type IndiceModuleTab<TabId extends string> = {
  id: TabId;
  label: string;
  icon: ReactNode;
  access?: {
    page: PageId;
    tabId?: string;
  };
};

interface IndiceModuleShellProps<TabId extends string> {
  activeTab: TabId;
  backLabel?: string;
  children: ReactNode;
  contentRef?: Ref<HTMLDivElement>;
  currentModule: string;
  guide?: ReactNode;
  loadingOverlay?: ReactNode;
  moreLabel?: string;
  moreTabs?: ReadonlyArray<IndiceModuleTab<TabId>>;
  onNavigate?: (page?: string) => void;
  onTabChange: (tabId: TabId) => void;
  subtitle: string;
  tabs: ReadonlyArray<IndiceModuleTab<TabId>>;
  title: string;
  tone: IndiceModuleTone;
}

/**
 * Shared module frame approved by Frontend Operating System v2. The owning
 * module keeps feature behavior while the canonical access catalog filters
 * navigation consistently across every module.
 */
export function IndiceModuleShell<TabId extends string>({
  activeTab,
  children,
  contentRef,
  currentModule,
  guide,
  loadingOverlay,
  moreLabel = 'More',
  moreTabs = [],
  onNavigate,
  onTabChange,
  subtitle,
  tabs,
  title,
  tone,
}: IndiceModuleShellProps<TabId>) {
  useAuthorizationRevision();
  const theme = MODULE_COLORS[tone];
  const activeTextColor = getModulePrimaryForeground(tone);
  const resolvedPage = resolvePageId(currentModule);
  const cachedSession = getCachedAuthSession();
  const canAccessTab = (tab: IndiceModuleTab<TabId>) => {
    if (cachedSession === undefined) return true;
    const accessPage = tab.access?.page ?? resolvedPage;
    if (!accessPage) return true;
    return canAccessModuleTab(accessPage, tab.access?.tabId ?? tab.id, cachedSession);
  };
  const visibleTabs = tabs.filter(canAccessTab);
  const visibleMoreTabs = moreTabs.filter(canAccessTab);
  const activeTabData = [...visibleTabs, ...visibleMoreTabs].find((tab) => tab.id === activeTab);
  const isMoreActive = visibleMoreTabs.some((tab) => tab.id === activeTab);
  const moduleEmoji = MODULE_EMOJI_BY_ROUTE[resolvedPage ?? currentModule] ?? '◈';

  return (
    <div
      className="flex h-full min-h-0 flex-col overflow-hidden bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-white"
      data-module={currentModule}
    >
      {loadingOverlay}
      <header className="relative z-30 shrink-0 border-b border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:px-8">
        <div className="mx-auto max-w-[1600px]">
          <div className="flex items-center gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-2.5 md:max-w-[420px] md:flex-none">
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg ring-1 ${theme.lightBg} ${theme.darkBg} ${theme.border} ${theme.darkBorder}`} aria-hidden="true">
                {moduleEmoji}
              </span>
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-1.5 text-lg font-medium leading-tight text-slate-950 dark:text-white sm:text-xl">
                  <span className="shrink-0">{title}</span>
                  {activeTabData ? <span className="text-slate-300 dark:text-slate-600">/</span> : null}
                  {activeTabData ? (
                    <span className={`flex min-w-0 items-center gap-1 ${theme.text} ${theme.darkText}`}>
                      <span className="shrink-0 text-base" aria-hidden="true">{activeTabData.icon}</span>
                      <span className="truncate">{activeTabData.label}</span>
                    </span>
                  ) : null}
                </div>
                <p className="hidden truncate text-xs text-slate-500 dark:text-slate-400 sm:block">{subtitle}</p>
              </div>
            </div>

            {onNavigate ? (
              <div className="hidden min-w-0 flex-1 border-l border-slate-200 pl-3 dark:border-slate-700 md:block">
            <FavoritesBar
              compact
              currentModule={currentModule}
              onNavigate={(page) => {
                if (page !== currentModule) onNavigate(page);
              }}
            />
              </div>
            ) : null}
          </div>

          {onNavigate ? (
            <div className="mt-1.5 md:hidden">
              <FavoritesBar compact currentModule={currentModule} onNavigate={(page) => {
                if (page !== currentModule) onNavigate(page);
              }} />
            </div>
          ) : null}

          <nav aria-label={title} className="mt-1.5 overflow-x-auto [scrollbar-width:none]">
            <div className="flex min-w-max items-center gap-1.5 pb-0.5">
              {visibleTabs.map(tab => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    aria-current={isActive ? 'page' : undefined}
                    onClick={() => onTabChange(tab.id)}
                    className={`flex min-h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 sm:text-sm ${
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
              {visibleMoreTabs.length ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      aria-current={isMoreActive ? 'page' : undefined}
                      className={`flex min-h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 sm:text-sm ${
                        isMoreActive
                          ? 'border-transparent shadow-md'
                          : `border-transparent bg-slate-100 text-slate-600 hover:text-slate-950 dark:bg-slate-800 dark:text-slate-300 dark:hover:text-white ${theme.iconHover}`
                      }`}
                      style={isMoreActive ? {
                        backgroundColor: theme.primary,
                        color: activeTextColor,
                        boxShadow: `0 8px 18px -12px ${theme.primary}`,
                      } : undefined}
                    >
                      <MoreHorizontal aria-hidden="true" className="h-4 w-4" />
                      <span>{moreLabel}</span>
                      <ChevronDown aria-hidden="true" className="h-3.5 w-3.5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64 rounded-xl p-1.5">
                    {visibleMoreTabs.map((tab) => {
                      const isActive = activeTab === tab.id;
                      return (
                        <DropdownMenuItem
                          key={tab.id}
                          aria-current={isActive ? 'page' : undefined}
                          className="min-h-10 gap-2.5 rounded-lg px-3"
                          onSelect={() => onTabChange(tab.id)}
                        >
                          <span
                            aria-hidden="true"
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-base"
                            style={isActive ? { backgroundColor: theme.primary, color: activeTextColor } : undefined}
                          >
                            {tab.icon}
                          </span>
                          <span className={isActive ? `${theme.text} ${theme.darkText}` : undefined}>{tab.label}</span>
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </div>
          </nav>

        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div ref={contentRef} className="mx-auto max-w-[1600px] scroll-mt-24 px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
          {guide ? <div className="mb-4">{guide}</div> : null}
          {children}
        </div>
      </main>
    </div>
  );
}
