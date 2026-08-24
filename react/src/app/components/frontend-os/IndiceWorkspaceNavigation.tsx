import type { CSSProperties, KeyboardEvent, ReactNode } from 'react';
import { Check } from 'lucide-react';
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
};

type IndiceWorkspaceNavigationProps<TabId extends string> = {
  ariaLabel: string;
  className?: string;
  items: ReadonlyArray<IndiceWorkspaceNavigationItem<TabId>>;
  onValueChange: (value: TabId) => void;
  tone?: IndiceModuleTone;
  value: TabId;
  variant?: 'sections' | 'workflow';
};

const navigationKeyByDirection: Record<string, number> = {
  ArrowLeft: -1,
  ArrowUp: -1,
  ArrowRight: 1,
  ArrowDown: 1,
};

/**
 * Canonical internal navigation for Indice workspaces.
 *
 * `sections` is the compact pill navigation used to move between sibling
 * views. `workflow` makes sequence and context explicit without becoming a
 * wizard: every available step remains directly accessible.
 */
export function IndiceWorkspaceNavigation<TabId extends string>({
  ariaLabel,
  className = '',
  items,
  onValueChange,
  tone = 'blue',
  value,
  variant = 'sections',
}: IndiceWorkspaceNavigationProps<TabId>) {
  const theme = MODULE_COLORS[tone];
  const activeForeground = getModulePrimaryForeground(tone);
  const activeIndex = items.findIndex((item) => item.id === value);

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

  return (
    <nav
      role="tablist"
      aria-label={ariaLabel}
      aria-orientation="horizontal"
      data-indice-workspace-navigation="sections"
      onKeyDown={handleKeyboardNavigation}
      className={`flex flex-wrap items-center gap-1.5 ${className}`}
    >
      {items.map((item) => {
        const active = value === item.id;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            aria-current={active ? 'page' : undefined}
            tabIndex={active ? 0 : -1}
            disabled={item.disabled}
            data-state={active ? 'active' : 'inactive'}
            onClick={() => onValueChange(item.id)}
            className={`inline-flex min-h-9 shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45 ${
              active
                ? 'border-transparent shadow-md'
                : `border-transparent bg-slate-100 text-slate-600 hover:text-slate-950 dark:bg-slate-800 dark:text-slate-300 dark:hover:text-white ${theme.iconHover}`
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
        );
      })}
    </nav>
  );
}
