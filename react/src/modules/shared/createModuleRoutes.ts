import { createElement } from 'react';
import { Navigate, type RouteObject } from 'react-router';
import type { ModuleDefinition } from './moduleTypes';

function resolveDefaultTab(moduleDefinition: ModuleDefinition) {
  if (moduleDefinition.tabs.length === 0) {
    throw new Error(`Module "${moduleDefinition.id}" must define at least one tab.`);
  }

  if (!moduleDefinition.defaultTabId) {
    return moduleDefinition.tabs[0];
  }

  return (
    moduleDefinition.tabs.find((tab) => tab.id === moduleDefinition.defaultTabId) ??
    moduleDefinition.tabs[0]
  );
}

export function createModuleRoutes(moduleDefinition: ModuleDefinition): RouteObject[] {
  const defaultTab = resolveDefaultTab(moduleDefinition);

  return [
    {
      index: true,
      element: createElement(Navigate, {
        to: defaultTab.path,
        replace: true,
      }),
    },
    ...moduleDefinition.tabs.map((tab) => ({
      path: tab.path,
      element: createElement(tab.component),
    })),
  ];
}
