import type { ReactNode } from 'react';
import type { PageId } from '../../config/navigation';

export type IndiceModuleTab<TabId extends string> = {
  id: TabId;
  label: string;
  icon: ReactNode;
  description?: string;
  disabled?: boolean;
  access?: { page: PageId; tabId?: string };
};

export type IndiceModuleTabMenu<TabId extends string> = {
  id: string;
  label: string;
  icon: ReactNode;
  tabs: ReadonlyArray<IndiceModuleTab<TabId>>;
  beforeTabId?: TabId;
};

type ModuleNavigationEntry<TabId extends string> =
  | { kind: 'tab'; tab: IndiceModuleTab<TabId> }
  | { kind: 'menu'; menu: IndiceModuleTabMenu<TabId> };

/** Keep menu placement stable even when its adjacent tab is permission-filtered. */
export function resolveModuleNavigation<TabId extends string>(
  tabs: ReadonlyArray<IndiceModuleTab<TabId>>,
  menus: ReadonlyArray<IndiceModuleTabMenu<TabId>>,
  canAccessTab: (tab: IndiceModuleTab<TabId>) => boolean,
): ModuleNavigationEntry<TabId>[] {
  const visibleMenus = menus
    .map(menu => ({ ...menu, tabs: menu.tabs.filter(canAccessTab) }))
    .filter(menu => menu.tabs.length > 0);
  const entries: ModuleNavigationEntry<TabId>[] = [];
  for (const tab of tabs) {
    for (const menu of visibleMenus.filter(menu => menu.beforeTabId === tab.id)) {
      entries.push({ kind: 'menu', menu });
    }
    if (canAccessTab(tab)) entries.push({ kind: 'tab', tab });
  }
  for (const menu of visibleMenus.filter(menu => !tabs.some(tab => tab.id === menu.beforeTabId))) {
    entries.push({ kind: 'menu', menu });
  }
  return entries;
}
