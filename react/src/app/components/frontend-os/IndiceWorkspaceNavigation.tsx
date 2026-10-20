import { Fragment, useRef, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import { Check } from 'lucide-react';
import { ModuleTabEmoji } from '../icons/ModuleTabEmoji';
import { IndiceHorizontalScrollControls } from '../ui/horizontal-scroll-controls';
import { useMobileModuleNavigation } from './useMobileModuleNavigation';
import {
  getModulePrimaryForeground,
  MODULE_COLORS,
  type IndiceModuleTone,
} from '../../styles/moduleColors';

export type IndiceWorkspaceNavigationItem<TabId extends string> = {
  id: TabId;
  label: string;
  description?: string;
  icon?: ReactNode;
  disabled?: boolean;
  group?: string;
};

type IndiceWorkspaceNavigationProps<TabId extends string> = {
  ariaLabel: string;
  className?: string;
  items: ReadonlyArray<IndiceWorkspaceNavigationItem<TabId>>;
  onValueChange: (value: TabId) => void;
  tone?: IndiceModuleTone;
  value: TabId;
  variant?: 'sections' | 'views' | 'workflow' | 'workbar';
  moduleId?: string;
  orientation?: 'horizontal' | 'desktop-vertical' | 'vertical';
  /** Compact rail for a workspace with an explicit expand control. Keeps accessible labels. */
  iconOnly?: boolean;
};

const navigationKeyByDirection: Record<string, number> = {
  ArrowLeft: -1,
  ArrowUp: -1,
  ArrowRight: 1,
  ArrowDown: 1,
};

/**
 * Canonical navigation for Indice workspaces.
 *
 * `sections` is the compact pill navigation used to move between sibling
 * views. `views` groups alternate views in an Agenda-style selector.
 * `workflow` makes sequence and context explicit without becoming a
 * wizard: every available step remains directly accessible.
 * `workbar` places primary system sections in the shared pill slider.
 */
export function IndiceWorkspaceNavigation<TabId extends string>({
  ariaLabel,
  className = '',
  items,
  onValueChange,
  tone = 'blue',
  value,
  variant = 'sections',
  moduleId = '',
  orientation = 'horizontal',
  iconOnly = false,
}: IndiceWorkspaceNavigationProps<TabId>) {
  const theme = MODULE_COLORS[tone];
  const activeForeground = getModulePrimaryForeground(tone);
  const activeIndex = items.findIndex((item) => item.id === value);
  const railRef = useRef<HTMLElement>(null);
  useMobileModuleNavigation(value, items.map(item => item.id).join('|'), variant === 'workbar' ? railRef : undefined);
  const vertical = orientation === 'desktop-vertical';

  const handleKeyboardNavigation = (event: KeyboardEvent<HTMLElement>) => {
    const direction = navigationKeyByDirection[event.key];
    const isBoundaryKey = event.key === 'Home' || event.key === 'End';
    if (!direction && !isBoundaryKey) return;

    const tabs = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]:not(:disabled)'),
    );
    if (!tabs.length) return;

    event.preventDefault();
    const currentIndex = Math.max(0, tabs.indexOf(document.activeElement as HTMLButtonElement));
    const nextIndex = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? tabs.length - 1
        : (currentIndex + direction + tabs.length) % tabs.length;
    tabs[nextIndex]?.focus();
    tabs[nextIndex]?.click();
  };

  if (variant === 'workflow') {
    return (
      <nav
        role="tablist"
        aria-label={ariaLabel}
        aria-orientation="horizontal"
        data-indice-workspace-navigation="workflow"
        onKeyDown={handleKeyboardNavigation}
        className={`grid gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-700 dark:bg-slate-900 md:grid-cols-[repeat(var(--workspace-step-count),minmax(0,1fr))] ${className}`}
        style={{ '--workspace-step-count': items.length } as CSSProperties}
      >
        {items.map((item, index) => {
          const active = value === item.id;
          const complete = activeIndex > index;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              disabled={item.disabled}
              data-state={active ? 'active' : complete ? 'complete' : 'inactive'}
              onClick={() => onValueChange(item.id)}
              className={`group flex min-h-16 items-center gap-3 rounded-xl px-4 text-left outline-none transition focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45 ${
                active
                  ? 'shadow-sm'
                  : `bg-slate-50 text-slate-600 hover:text-slate-950 dark:bg-slate-800 dark:text-slate-300 dark:hover:text-white ${theme.iconHover}`
              }`}
              style={active ? {
                backgroundColor: theme.primary,
                color: activeForeground,
                boxShadow: `0 8px 18px -14px ${theme.primary}`,
              } : undefined}
            >
              <span
                aria-hidden="true"
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-medium shadow-sm ${
                  active
                    ? 'bg-white/20'
                    : complete
                      ? `${theme.lightBg} ${theme.text}`
                      : 'bg-white text-slate-500 dark:bg-slate-900 dark:text-slate-300'
                }`}
              >
                {complete ? <Check className="h-4 w-4" /> : index + 1}
              </span>
              {item.icon ? (
                <span aria-hidden="true" className="shrink-0 [&>svg]:h-4 [&>svg]:w-4">
                  {item.icon}
                </span>
              ) : null}
              <span className="min-w-0">
                <span className="block text-sm font-medium">{item.label}</span>
                {item.description ? (
                  <span className={`block truncate text-xs ${active ? 'opacity-80' : 'text-slate-500 dark:text-slate-400'}`}>
                    {item.description}
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
      </nav>
    );
  }

  if (variant === 'workbar') {
    return (
      <div className="relative min-w-0 max-w-full" data-indice-workbar-navigation>
        <nav ref={railRef} role="tablist" aria-label={ariaLabel} aria-orientation={orientation === 'vertical' ? 'vertical' : 'horizontal'}
          data-indice-workspace-navigation="workbar" onKeyDown={handleKeyboardNavigation}
          className={`flex flex-nowrap items-center gap-1.5 overflow-x-auto overscroll-x-contain snap-x snap-proximity pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${orientation === 'vertical' ? 'flex-col items-stretch overflow-visible' : vertical ? 'lg:flex-col lg:items-stretch lg:overflow-visible' : ''} ${className}`}>
          {items.map((item, index) => {
            const active = value === item.id;
            return <Fragment key={item.id}>
              {item.group && item.group !== items[index - 1]?.group ? <span role="presentation" className={iconOnly ? 'my-2 border-t border-slate-200 dark:border-slate-700' : `shrink-0 px-2 text-xs font-medium text-slate-400 dark:text-slate-500 ${vertical ? 'lg:pt-3' : ''}`}><span className={iconOnly ? 'sr-only' : undefined}>{item.group}</span></span> : null}
              <button type="button" role="tab" aria-selected={active} aria-current={active ? 'page' : undefined}
                aria-label={iconOnly ? item.label : undefined} title={iconOnly ? item.description ? `${item.label} · ${item.description}` : item.label : item.description}
                tabIndex={active ? 0 : -1} disabled={item.disabled} data-state={active ? 'active' : 'inactive'}
                onClick={() => onValueChange(item.id)}
                className={`indice-workbar-tab inline-flex min-h-11 shrink-0 snap-start items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45 md:min-h-9 sm:text-sm ${vertical ? 'lg:min-h-11 lg:w-full lg:justify-start lg:rounded-xl' : ''} ${active ? 'border-transparent shadow-sm' : `border-transparent bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 ${theme.iconHover}`}`}
                style={active ? { backgroundColor: theme.primary, color: activeForeground } : undefined}>
                <span aria-hidden="true" className="shrink-0"><ModuleTabEmoji moduleId={moduleId} tabId={item.id} fallback={item.icon} /></span>
                <span className={iconOnly ? 'sr-only' : undefined}>{item.label}</span>
              </button>
            </Fragment>;
          })}
        </nav>
        {orientation !== 'vertical' && <IndiceHorizontalScrollControls scrollRef={railRef} className={vertical ? 'lg:hidden' : undefined} />}
      </div>
    );
  }

  return (
    <nav
      role="tablist"
      aria-label={ariaLabel}
      aria-orientation="horizontal"
      data-indice-workspace-navigation={variant}
      onKeyDown={handleKeyboardNavigation}
      className={`${variant === 'views'
        ? 'flex w-fit max-w-full flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-800'
        : 'flex flex-wrap items-center gap-1.5'} ${className}`}
    >
      {items.map((item, index) => {
        const active = value === item.id;
        return (
          <Fragment key={item.id}>
          {item.group && item.group !== items[index - 1]?.group ? (
            <span role="presentation" className="self-center px-2 text-xs font-medium text-slate-400 dark:text-slate-500">
              {item.group}
            </span>
          ) : null}
          <button
            type="button"
            role="tab"
            aria-selected={active}
            aria-current={active ? 'page' : undefined}
            tabIndex={active ? 0 : -1}
            disabled={item.disabled}
            data-state={active ? 'active' : 'inactive'}
            onClick={() => onValueChange(item.id)}
            className={`inline-flex shrink-0 items-center gap-2 border text-sm font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45 ${variant === 'views' ? 'min-h-11 rounded-lg px-4 py-2' : 'min-h-9 rounded-full px-3 py-1.5'} ${
              active
                ? 'border-transparent shadow-md'
                : `border-transparent ${variant === 'views' ? 'bg-transparent' : 'bg-slate-100 dark:bg-slate-800'} text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white ${theme.iconHover}`
            }`}
            style={active ? {
              backgroundColor: theme.primary,
              color: activeForeground,
              boxShadow: `0 8px 18px -12px ${theme.primary}`,
            } : undefined}
          >
            {item.icon ? (
              <span aria-hidden="true" className="shrink-0 [&>svg]:h-4 [&>svg]:w-4">
                {item.icon}
              </span>
            ) : null}
            <span>{item.label}</span>
          </button>
          </Fragment>
        );
      })}
    </nav>
  );
}
