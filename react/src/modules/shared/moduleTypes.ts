import type { ComponentType } from 'react';

export type ModuleCategory = 'basic' | 'complementary' | 'ai';

export interface ModuleTabDefinition {
  id: string;
  label: string;
  path: string;
  component: ComponentType;
}

export interface ModuleDefinition {
  id: string;
  displayName: string;
  routeSegment: string;
  category: ModuleCategory;
  defaultTabId?: string;
  tabs: ModuleTabDefinition[];
}
