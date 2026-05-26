import { CheckCircle2 } from 'lucide-react';
import type { ConfigCenterCatalogTab } from '../../../api/configCenter';
import type { TabPermissionModuleOption } from './usersTabPermissionAssignments';

interface UsersTabPermissionPickerProps {
  catalogTabs: ConfigCenterCatalogTab[];
  modules: TabPermissionModuleOption[];
  selectedModuleIds: string[];
  selectedPermissionKeys: string[];
  onChange: (permissionKeys: string[]) => void;
}

export function UsersTabPermissionPicker({
  catalogTabs,
  modules,
  selectedModuleIds,
  selectedPermissionKeys,
  onChange,
}: UsersTabPermissionPickerProps) {
  const selectedModules = modules.filter((module) => selectedModuleIds.includes(module.id));
  const selectedPermissionSet = new Set(selectedPermissionKeys);
  const tabsByModule = new Map<string, ConfigCenterCatalogTab[]>();

  for (const tab of catalogTabs) {
    const moduleTabs = tabsByModule.get(tab.module_slug) ?? [];
    moduleTabs.push(tab);
    tabsByModule.set(tab.module_slug, moduleTabs);
  }

  const visibleModules = selectedModules.filter((module) => (tabsByModule.get(module.slug)?.length ?? 0) > 0);

  if (catalogTabs.length === 0 || visibleModules.length === 0) {
    return null;
  }

  const replaceModuleTabs = (moduleSlug: string, nextPermissionKeys: string[]) => {
    const modulePermissionKeys = new Set(
      (tabsByModule.get(moduleSlug) ?? []).map((tab) => tab.permission_key),
    );
    const retainedPermissions = selectedPermissionKeys.filter((key) => !modulePermissionKeys.has(key));
    onChange([...retainedPermissions, ...nextPermissionKeys]);
  };

  const togglePermission = (permissionKey: string) => {
    if (selectedPermissionSet.has(permissionKey)) {
      onChange(selectedPermissionKeys.filter((key) => key !== permissionKey));
      return;
    }

    onChange([...selectedPermissionKeys, permissionKey]);
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          Tab permissions
        </h4>
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {selectedPermissionKeys.length} selected
        </span>
      </div>

      <div className="space-y-4">
        {visibleModules.map((module) => {
          const moduleTabs = tabsByModule.get(module.slug) ?? [];
          const selectedModuleTabKeys = moduleTabs
            .filter((tab) => selectedPermissionSet.has(tab.permission_key))
            .map((tab) => tab.permission_key);

          return (
            <div
              key={module.id}
              className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950"
            >
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-white shadow-sm dark:bg-slate-900">
                    {module.emoji}
                  </span>
                  <span className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {module.name}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => replaceModuleTabs(module.slug, moduleTabs.map((tab) => tab.permission_key))}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-600 transition-colors hover:border-purple-200 hover:text-purple-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-purple-700 dark:hover:text-purple-300"
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => replaceModuleTabs(module.slug, [])}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-600 transition-colors hover:border-red-200 hover:text-red-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-red-800 dark:hover:text-red-300"
                  >
                    None
                  </button>
                  <span className="text-slate-500 dark:text-slate-400">
                    {selectedModuleTabKeys.length}/{moduleTabs.length}
                  </span>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {moduleTabs.map((tab) => {
                  const isSelected = selectedPermissionSet.has(tab.permission_key);

                  return (
                    <label
                      key={tab.permission_key}
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                        isSelected
                          ? 'border-purple-300 bg-purple-50 text-purple-800 dark:border-purple-700 dark:bg-purple-900/30 dark:text-purple-200'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-purple-200 hover:bg-purple-50/60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-purple-700 dark:hover:bg-purple-900/20'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => togglePermission(tab.permission_key)}
                        className="sr-only"
                      />
                      <span
                        className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border ${
                          isSelected
                            ? 'border-purple-500 bg-purple-600 text-white'
                            : 'border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-900'
                        }`}
                      >
                        {isSelected ? <CheckCircle2 className="h-4 w-4" /> : null}
                      </span>
                      <span className="min-w-0 truncate">{tab.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
