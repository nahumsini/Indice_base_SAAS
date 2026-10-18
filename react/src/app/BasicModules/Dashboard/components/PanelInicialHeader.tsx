import { useRef, useState, type CSSProperties } from 'react';
import { Home, Star } from 'lucide-react';
import { useLanguage } from '../../../shared/context';
import { useMobileModuleNavigation } from '../../../components/frontend-os/useMobileModuleNavigation';
import { FavoritesBar } from '../../../components/FavoritesBar';
import { OriginalModuleEmoji } from '../../../components/icons/OriginalModuleEmoji';
import { ModuleTabEmoji } from '../../../components/icons/ModuleTabEmoji';
import { IndiceHorizontalScrollControls } from '../../../components/ui/horizontal-scroll-controls';
import { useWorkbarLayout } from '../../../components/workbar/WorkbarLayoutContext';

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
  const { t } = useLanguage();
  const [mobileFavoritesOpen, setMobileFavoritesOpen] = useState(false);
  const { isDualScreenActive, position: workbarPosition } = useWorkbarLayout();
  const isSideLayout = workbarPosition === 'left' && !isDualScreenActive;
  const activeTab = tabs.find((tab) => tab.id === activeTabId);
  const tabsScrollRef = useRef<HTMLElement>(null);
  useMobileModuleNavigation(activeTabId, tabs.map(tab => tab.id).join('|'), tabsScrollRef);

  return (
    <header
      className={`indice-workbar relative z-30 shrink-0 border-b border-[var(--indice-border)] bg-white px-3 py-2 shadow-sm dark:bg-slate-800 sm:px-8 ${isSideLayout ? 'indice-workbar--left lg:h-full lg:w-72 lg:overflow-y-auto lg:border-r lg:border-b-0 lg:px-4 lg:py-5' : ''}`}
      data-workbar-position={isSideLayout ? 'left' : 'top'}
      style={{ '--indice-workbar-tone': 'var(--indice-brand-action)' } as CSSProperties}
    >
      <div className={`mx-auto max-w-[1600px] ${isSideLayout ? 'lg:w-full' : ''}`}>
        <div className={`flex items-center gap-3 ${isSideLayout ? 'lg:flex-col lg:items-stretch' : ''}`}>
          <div className={`flex min-w-0 flex-1 items-center justify-between gap-3 md:max-w-[420px] md:flex-none ${isSideLayout ? 'lg:max-w-none lg:items-start' : ''}`}>
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-lg ring-1 ring-blue-100 dark:bg-blue-900/30 dark:ring-blue-800" aria-hidden="true">
                <OriginalModuleEmoji id="home-panel" className="size-7" />
              </span>
              <div className="min-w-0">
                <div className={`flex min-w-0 flex-col items-start gap-0.5 md:flex-row md:items-center md:gap-1.5 text-lg font-medium leading-tight text-[var(--indice-graphite)] dark:text-white sm:text-xl ${isSideLayout ? 'lg:flex-col lg:items-start lg:gap-1' : ''}`}>
                  <span className="max-w-full truncate text-base md:text-xl">{title}</span>
                  {activeTab ? <span className={`hidden md:inline text-slate-300 dark:text-slate-600 ${isSideLayout ? 'lg:hidden' : ''}`}>/</span> : null}
                  {activeTab ? (
                    <span className="flex min-w-0 items-center gap-1 text-xs md:text-xl text-[var(--indice-blue)]">
                      <span className="shrink-0 text-base" aria-hidden="true"><ModuleTabEmoji moduleId="home-panel" tabId={activeTab.id} fallback={activeTab.emoji} className="size-4" /></span>
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

          <div className="flex shrink-0 gap-1 md:hidden">
            <button type="button" aria-label="Dashboard" onClick={() => onNavigate('dashboard')} className="inline-flex size-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--indice-blue)] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"><Home className="size-5" /></button>
            <button type="button" aria-label={t.sections.favorites} aria-expanded={mobileFavoritesOpen} onClick={() => setMobileFavoritesOpen(open => !open)} className="inline-flex size-11 items-center justify-center rounded-full border border-slate-200 bg-white text-amber-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--indice-blue)] dark:border-slate-700 dark:bg-slate-800"><Star className={`size-5 ${mobileFavoritesOpen ? 'fill-amber-400' : ''}`} /></button>
          </div>

          <div className={`hidden min-w-0 flex-1 border-l border-slate-200 pl-3 dark:border-slate-700 md:block ${isSideLayout ? 'lg:w-full lg:border-l-0 lg:pl-0' : ''}`}>
          <FavoritesBar
            compact
            orientation={isSideLayout ? 'desktop-vertical' : 'horizontal'}
            onNavigate={(page) => {
              if (page !== 'home-panel') onNavigate(page);
            }}
            currentModule="home-panel"
          />
          </div>

        </div>

        <div className={`${mobileFavoritesOpen ? 'block' : 'hidden'} mt-1.5 md:hidden`}>
          <FavoritesBar
            compact
            onNavigate={(page) => {
              if (page !== 'home-panel') onNavigate(page);
            }}
            currentModule="home-panel"
          />
        </div>

        <div className={`relative ${isSideLayout ? 'lg:mt-4 lg:border-t lg:border-slate-200 lg:pt-3 dark:lg:border-slate-700' : ''}`}>
          <nav className={`mt-1.5 overflow-x-auto snap-x snap-proximity overscroll-x-contain [scrollbar-width:none] ${isSideLayout ? 'lg:overflow-visible' : ''}`} ref={tabsScrollRef} aria-label={navigationLabel}>
            <div className={`flex min-w-max items-center gap-1.5 pb-0.5 ${isSideLayout ? 'lg:min-w-0 lg:flex-col lg:items-stretch lg:gap-1' : ''}`}>
              {tabs.map((tab) => {
                const isActive = activeTabId === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    aria-current={isActive ? 'page' : undefined}
                    className={`indice-workbar-tab flex min-h-11 shrink-0 snap-start items-center md:min-h-9 gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--indice-blue)] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-800 sm:text-sm ${isSideLayout ? 'lg:min-h-11 lg:w-full lg:justify-start lg:rounded-xl lg:border-l-[3px] lg:px-3 lg:py-2' : ''} ${
                      isActive
                        ? 'border-[var(--indice-blue)] bg-[var(--indice-blue)] text-white shadow-sm'
                        : 'border-transparent bg-slate-100 text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-800 dark:hover:bg-blue-900/20 dark:hover:text-blue-200'
                    }`}
                    onClick={() => onTabSelect(tab.id)}
                  >
                    <span aria-hidden="true"><ModuleTabEmoji moduleId="home-panel" tabId={tab.id} fallback={tab.emoji} /></span>
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </nav>
          <IndiceHorizontalScrollControls scrollRef={tabsScrollRef} className={isSideLayout ? 'lg:hidden' : undefined} />
        </div>
      </div>
    </header>
  );
}
