import { useState } from 'react';
import type { ModuleDefinition, ModuleTabDefinition } from './moduleTypes';

function resolveInitialTab(
  moduleDefinition: ModuleDefinition,
  requestedTabId?: string,
): ModuleTabDefinition {
  const defaultTab =
    moduleDefinition.tabs.find((tab) => tab.id === moduleDefinition.defaultTabId) ??
    moduleDefinition.tabs[0];

  if (!requestedTabId) {
    return defaultTab;
  }

  return (
    moduleDefinition.tabs.find((tab) => tab.id === requestedTabId) ??
    defaultTab
  );
}

export interface ModuleShellProps {
  module: ModuleDefinition;
  initialTabId?: string;
}

export function ModuleShell({ module, initialTabId }: ModuleShellProps) {
  const [activeTabId, setActiveTabId] = useState(
    () => resolveInitialTab(module, initialTabId).id,
  );
  const activeTab = resolveInitialTab(module, activeTabId);
  const ActiveTabComponent = activeTab.component;

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Exportable module
        </p>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">{module.displayName}</h1>
            <p className="text-sm text-slate-600">
              Route segment: <code>/{module.routeSegment}</code>
            </p>
          </div>
          <p className="max-w-2xl text-sm text-slate-500">
            This shell keeps module navigation, tab rendering, and local structure self-contained.
          </p>
        </div>
      </header>

      <nav
        aria-label={`${module.displayName} tabs`}
        className="flex flex-wrap gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
      >
        {module.tabs.map((tab) => {
          const isActive = tab.id === activeTabId;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTabId(tab.id)}
              className={[
                'rounded-xl px-4 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
              ].join(' ')}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <ActiveTabComponent />
      </div>
    </section>
  );
}
