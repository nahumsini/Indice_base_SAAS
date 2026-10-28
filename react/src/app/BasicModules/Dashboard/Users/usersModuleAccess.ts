import type { TabPermissionModuleOption } from './usersTabPermissionAssignments';

export type ModuleSelectionError = 'user_modules_required' | 'user_module_unknown'
  | 'user_module_not_enabled' | 'user_module_not_assignable';

/** Presentation only. Company eligibility and the actor's delegation ceiling remain server-owned. */
export function moduleAssignmentState(module: TabPermissionModuleOption) {
  const unknown = typeof module.companyEnabled !== 'boolean'
    || typeof module.actorAssignable !== 'boolean' || typeof module.assignable !== 'boolean';
  return {
    unknown,
    editable: !unknown && module.companyEnabled === true && module.actorAssignable === true && module.assignable === true,
  };
}

export function moduleIdForSlug(slug: string, modules: TabPermissionModuleOption[]) {
  return modules.find(module => module.slug === slug)?.id ?? `module:${slug}`;
}

export function modulesWithPreviousAssignments(modules: TabPermissionModuleOption[], previousSlugs: string[]) {
  return [...modules, ...previousSlugs.filter(slug => !modules.some(module => module.slug === slug)).map(slug => ({
    id: moduleIdForSlug(slug, modules), slug, name: slug, emoji: '📦',
  }))];
}

export function selectedModuleSlugs(modules: TabPermissionModuleOption[], selectedIds: string[], previousSlugs: string[] = []) {
  const selected = modules.filter(module => selectedIds.includes(module.id)).map(module => module.slug);
  const retained = previousSlugs.filter(slug => {
    const module = modules.find(candidate => candidate.slug === slug);
    return !module || !moduleAssignmentState(module).editable;
  });
  return [...new Set([...selected, ...retained])];
}

export function moduleSelectionError(modules: TabPermissionModuleOption[], selectedIds: string[], previousSlugs: string[] = []): ModuleSelectionError | null {
  for (const id of selectedIds) {
    if (previousSlugs.some(slug => moduleIdForSlug(slug, modules) === id)) continue;
    const module = modules.find(candidate => candidate.id === id);
    if (!module || moduleAssignmentState(module).unknown) return 'user_module_unknown';
    if (!module.companyEnabled) {
      // Match the registry's order: company activation/entitlement before assignment/lifecycle.
      if (module.active === false || module.entitled === false) return 'user_module_not_enabled';
      if (module.assignmentEnabled === false || (module.lifecycleStatus && !['pilot', 'released'].includes(module.lifecycleStatus)))
        return 'user_module_not_assignable';
      return 'user_module_not_enabled';
    }
    if (!moduleAssignmentState(module).editable) return 'user_module_not_assignable';
  }
  if (!selectedModuleSlugs(modules, selectedIds, previousSlugs).length) return 'user_modules_required';
  return null;
}
