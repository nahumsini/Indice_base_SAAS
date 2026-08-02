import type { ConfigCenterCatalogTab } from '../../../api/configCenter';

export interface TabPermissionModuleOption {
  id: string;
  slug: string;
  name: string;
  emoji: string;
  category?: 'basic' | 'complementary' | 'ai';
  lifecycleStatus?: 'planned' | 'development' | 'pilot' | 'released' | 'retired';
  accessModel?: 'module' | 'tabs';
  assignable?: boolean;
  entitled?: boolean;
  description?: string;
}

export function buildTabPermissionModuleOptions(
  modules: TabPermissionModuleOption[],
): TabPermissionModuleOption[] {
  return modules.map((module) => ({
    id: module.id,
    slug: module.slug,
    name: module.name,
    emoji: module.emoji,
    category: module.category,
    lifecycleStatus: module.lifecycleStatus,
    accessModel: module.accessModel,
    assignable: module.assignable,
    entitled: module.entitled,
    description: module.description,
  }));
}

export function permissionKeysForModuleIds(
  catalogTabs: ConfigCenterCatalogTab[],
  modules: TabPermissionModuleOption[],
  moduleIds: string[],
) {
  const selectedSlugs = new Set(
    moduleIds
      .map((moduleId) => modules.find((module) => module.id === moduleId)?.slug)
      .filter((slug): slug is string => Boolean(slug)),
  );

  return catalogTabs
    .filter((tab) => selectedSlugs.has(tab.module_slug))
    .map((tab) => tab.permission_key);
}

export function pruneTabPermissionKeysForModules(
  catalogTabs: ConfigCenterCatalogTab[],
  modules: TabPermissionModuleOption[],
  permissionKeys: string[],
  moduleIds: string[],
) {
  const allowedKeys = new Set(permissionKeysForModuleIds(catalogTabs, modules, moduleIds));
  return permissionKeys.filter((permissionKey) => allowedKeys.has(permissionKey));
}

export function mergeDefaultTabPermissions(
  catalogTabs: ConfigCenterCatalogTab[],
  modules: TabPermissionModuleOption[],
  permissionKeys: string[],
  moduleIds: string[],
) {
  return Array.from(new Set([
    ...permissionKeys,
    ...permissionKeysForModuleIds(catalogTabs, modules, moduleIds),
  ]));
}
