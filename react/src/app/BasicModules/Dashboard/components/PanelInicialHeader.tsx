import { FavoritesBar } from '../../../components/FavoritesBar';

export interface PanelInicialHeaderTab {
  emoji: string;
  helper: string;
  id: string;
  label: string;
}

interface PanelInicialHeaderProps {
  activeTabId: string;
  navigationLabel: string;
  onNavigate: (page: string) => void;
  onTabSelect: (tabId: string) => void;
  subtitle: string;
  tabs: readonly PanelInicialHeaderTab[];
  title: string;
}

export function PanelInicialHeader({
  activeTabId,
  navigationLabel,
  onNavigate,
  onTabSelect,
  subtitle,
  tabs,
  title,
}: PanelInicialHeaderProps) {
  const activeTab = tabs.find((tab) => tab.id === activeTabId);

  return (
    <header className="relative z-30 shrink-0 border-b border-[var(--indice-border)] bg-white px-3 py-2 shadow-sm dark:bg-slate-800 sm:px-8">
      <div className="mx-auto max-w-[1600px]">
        <div className="flex items-center gap-3">
          <div className="flex min-w-0 flex-1 items-center justify-between gap-3 md:max-w-[420px] md:flex-none">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-lg ring-1 ring-blue-100 dark:bg-blue-900/30 dark:ring-blue-800" aria-hidden="true">
                🏠
              </span>
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-1.5 text-lg font-medium leading-tight text-[var(--indice-graphite)] dark:text-white sm:text-xl">
                  <span className="shrink-0">{title}</span>
                  {activeTab ? <span className="text-slate-300 dark:text-slate-600">/</span> : null}
                  {activeTab ? (
                    <span className="flex min-w-0 items-center gap-1 text-[var(--indice-blue)]">
                      <span className="shrink-0 text-base" aria-hidden="true">{activeTab.emoji}</span>
                      <span className="truncate">{activeTab.label}</span>
                    </span>
                  ) : null}
                </div>
                <p className="hidden truncate text-xs text-[var(--indice-muted)] sm:block">
                  {activeTab?.helper ?? subtitle}
                </p>
              </div>
            </div>
          </div>

          <div className="hidden min-w-0 flex-1 border-l border-slate-200 pl-3 dark:border-slate-700 md:block">
          <FavoritesBar
            compact
            onNavigate={(page) => {
              if (page !== 'home-panel') onNavigate(page);
            }}
            currentModule="home-panel"
          />
          </div>

        </div>

        <div className="mt-1.5 md:hidden">
          <FavoritesBar
            compact
            onNavigate={(page) => {
              if (page !== 'home-panel') onNavigate(page);
            }}
            currentModule="home-panel"
          />
        </div>

        <nav className="mt-1.5 overflow-x-auto" aria-label={navigationLabel}>
          <div className="flex min-w-max items-center gap-1.5 pb-0.5">
            {tabs.map((tab) => {
              const isActive = activeTabId === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex min-h-9 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--indice-blue)] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-800 sm:text-sm ${
                    isActive
                      ? 'border-[var(--indice-blue)] bg-[var(--indice-blue)] text-white shadow-sm'
                      : 'border-transparent bg-slate-100 text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-800 dark:hover:bg-blue-900/20 dark:hover:text-blue-200'
                  }`}
                  onClick={() => onTabSelect(tab.id)}
                >
                  <span aria-hidden="true">{tab.emoji}</span>
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </header>
  );
}
