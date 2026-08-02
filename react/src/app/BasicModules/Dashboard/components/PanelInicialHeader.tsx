import { Button } from '../../../components/ui/button';
import { FavoritesBar } from '../../../components/FavoritesBar';

export interface PanelInicialHeaderTab {
  emoji: string;
  id: string;
  label: string;
}

interface PanelInicialHeaderProps {
  activeTabId: string;
  backLabel: string;
  navigationLabel: string;
  onBack: () => void;
  onNavigate: (page: string) => void;
  onTabSelect: (tabId: string) => void;
  subtitle: string;
  tabs: readonly PanelInicialHeaderTab[];
  title: string;
}

export function PanelInicialHeader({
  activeTabId,
  backLabel,
  navigationLabel,
  onBack,
  onNavigate,
  onTabSelect,
  subtitle,
  tabs,
  title,
}: PanelInicialHeaderProps) {
  return (
    <header className="border-b border-[var(--indice-border)] bg-white px-3 py-3 dark:bg-slate-800 sm:px-8 sm:py-6">
      <div className="mx-auto max-w-[1600px]">
        <div className="mt-2 sm:mt-3">
          <FavoritesBar
            onNavigate={(page) => {
              if (page !== 'home-panel') onNavigate(page);
            }}
            currentModule="home-panel"
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <h1 className="mb-2 text-[1.625rem] font-medium leading-tight text-[var(--indice-graphite)] dark:text-white sm:text-3xl">
              {title}
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-[var(--indice-muted)] sm:text-base">
              {subtitle}
            </p>
          </div>
          <Button variant="outline" onClick={onBack} className="w-full justify-center gap-2 text-sm sm:w-auto">
            <span className="text-lg" aria-hidden="true">🏠</span>
            {backLabel}
          </Button>
        </div>

        <nav className="mt-4" aria-label={navigationLabel}>
          <div className="flex flex-wrap items-center gap-2">
            {tabs.map((tab) => {
              const isActive = activeTabId === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex min-h-11 items-center gap-2 whitespace-nowrap rounded-full border px-3 py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--indice-blue)] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-800 sm:px-4 sm:text-sm ${
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
