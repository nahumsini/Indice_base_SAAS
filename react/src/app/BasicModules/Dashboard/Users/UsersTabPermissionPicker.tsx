import { useMemo, useState } from 'react';
import { Check, ChevronDown, LockKeyhole, Search, ShieldCheck } from 'lucide-react';
import type { ConfigCenterCatalogTab } from '../../../api/configCenter';
import type { TabPermissionModuleOption } from './usersTabPermissionAssignments';

interface UsersTabPermissionPickerProps {
  catalogTabs: ConfigCenterCatalogTab[];
  languageCode: string;
  modules: TabPermissionModuleOption[];
  selectedModuleIds: string[];
  selectedPermissionKeys: string[];
  onModuleChange: (moduleId: string) => void;
  onChange: (permissionKeys: string[]) => void;
  copy: {
    all: string;
    collapse: string;
    expand: string;
    noResults: string;
    none: string;
    protected: string;
    search: string;
    selected: (count: number) => string;
    title: string;
  };
  moduleSelectionLabel: (count: number) => string;
}

type CategoryFilter = 'all' | 'basic' | 'complementary' | 'ai';

export function UsersTabPermissionPicker({
  catalogTabs,
  languageCode,
  modules,
  selectedModuleIds,
  selectedPermissionKeys,
  onModuleChange,
  onChange,
  copy,
  moduleSelectionLabel,
}: UsersTabPermissionPickerProps) {
  const [expandedModuleSlugs, setExpandedModuleSlugs] = useState<Set<string>>(() => new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const selectedPermissionSet = new Set(selectedPermissionKeys);
  const normalizedSearch = searchTerm.trim().toLocaleLowerCase();
  const isSpanish = languageCode.toLocaleLowerCase().startsWith('es');

  const labels = isSpanish ? {
    allCategories: 'Todos', basic: 'Básicos', complementary: 'Complementarios', ai: 'IA',
    fullAccess: 'Acceso completo al módulo', comingSoon: 'Próximamente', development: 'En desarrollo',
    pilot: 'Piloto', available: 'Disponible', notIncluded: 'No incluido', tabs: 'pestañas',
  } : {
    allCategories: 'All', basic: 'Basic', complementary: 'Complementary', ai: 'AI',
    fullAccess: 'Full module access', comingSoon: 'Coming soon', development: 'In development',
    pilot: 'Pilot', available: 'Available', notIncluded: 'Not included', tabs: 'tabs',
  };

  const tabsByModule = useMemo(() => {
    const groupedTabs = new Map<string, ConfigCenterCatalogTab[]>();
    for (const tab of catalogTabs) {
      const moduleTabs = groupedTabs.get(tab.module_slug) ?? [];
      moduleTabs.push(tab);
      groupedTabs.set(tab.module_slug, moduleTabs);
    }
    groupedTabs.forEach((tabs) => tabs.sort((left, right) => (
      (left.tab_order ?? Number.MAX_SAFE_INTEGER) - (right.tab_order ?? Number.MAX_SAFE_INTEGER)
    )));
    return groupedTabs;
  }, [catalogTabs]);

  const tabLabel = (tab: ConfigCenterCatalogTab) => (
    isSpanish ? (tab.name_es ?? tab.name) : (tab.name_en ?? tab.name)
  );
  const visibleModules = modules
    .map((module) => {
      const moduleTabs = tabsByModule.get(module.slug) ?? [];
      const moduleSearchText = `${module.name} ${module.description ?? ''}`.toLocaleLowerCase();
      const searchMatchesModule = moduleSearchText.includes(normalizedSearch);
      const visibleTabs = normalizedSearch && !searchMatchesModule
        ? moduleTabs.filter((tab) => tabLabel(tab).toLocaleLowerCase().includes(normalizedSearch))
        : moduleTabs;
      return { module, moduleTabs, visibleTabs, searchMatchesModule };
    })
    .filter(({ module, visibleTabs, searchMatchesModule }) => (
      (categoryFilter === 'all' || module.category === categoryFilter)
      && (!normalizedSearch || searchMatchesModule || visibleTabs.length > 0)
    ));

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

  const toggleExpanded = (moduleSlug: string) => {
    setExpandedModuleSlugs((current) => {
      const next = new Set(current);
      if (next.has(moduleSlug)) next.delete(moduleSlug);
      else next.add(moduleSlug);
      return next;
    });
  };

  const availabilityLabel = (module: TabPermissionModuleOption) => {
    if (!module.entitled) return labels.notIncluded;
    if (module.lifecycleStatus === 'planned') return labels.comingSoon;
    if (module.lifecycleStatus === 'development') return labels.development;
    if (module.lifecycleStatus === 'pilot') return labels.pilot;
    return labels.available;
  };

  const categoryOptions: Array<{ id: CategoryFilter; label: string }> = [
    { id: 'all', label: labels.allCategories },
    { id: 'basic', label: labels.basic },
    { id: 'complementary', label: labels.complementary },
    { id: 'ai', label: labels.ai },
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h4 className="text-sm font-medium text-slate-800 dark:text-slate-100">{copy.title}</h4>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {moduleSelectionLabel(selectedModuleIds.length)} · {copy.selected(selectedPermissionKeys.length)}
          </span>
        </div>
        <label className="relative block w-full lg:max-w-xs">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder={copy.search}
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-800 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
        </label>
      </div>

      <div className="mt-3 flex flex-wrap gap-2" aria-label="Module categories">
        {categoryOptions.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => setCategoryFilter(category.id)}
            className={`rounded-full border px-3 py-1 text-xs transition-colors ${categoryFilter === category.id
              ? 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-200'
              : 'border-slate-200 bg-white text-slate-500 hover:border-blue-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'}`}
          >
            {category.label}
          </button>
        ))}
      </div>

      <div className="mt-4 max-h-[min(52dvh,520px)] space-y-2 overflow-y-auto pr-1">
        {visibleModules.length === 0 ? (
          <p className="rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500 dark:bg-slate-950 dark:text-slate-400">
            {copy.noResults}
          </p>
        ) : visibleModules.map(({ module, moduleTabs, visibleTabs }) => {
          const isSelected = selectedModuleIds.includes(module.id);
          const canToggle = module.assignable !== false || isSelected;
          const selectedCount = moduleTabs.filter((tab) => selectedPermissionSet.has(tab.permission_key)).length;
          const hasTabs = moduleTabs.length > 0 && module.accessModel !== 'module';
          const isExpanded = isSelected && hasTabs && (normalizedSearch.length > 0 || expandedModuleSlugs.has(module.slug));

          return (
            <section
              key={module.id}
              className={`overflow-hidden rounded-xl border transition-colors ${isSelected
                ? 'border-blue-200 bg-blue-50/60 dark:border-blue-800 dark:bg-blue-950/20'
                : 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950'}`}
            >
              <div className="flex min-h-16 items-center gap-3 px-3 py-2.5">
                <button
                  type="button"
                  disabled={!canToggle}
                  onClick={() => onModuleChange(module.id)}
                  aria-pressed={isSelected}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left disabled:cursor-not-allowed disabled:opacity-65"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-base shadow-sm dark:bg-slate-900">
                    {module.emoji}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{module.name}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] ${module.assignable === false
                        ? 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                        : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'}`}
                      >
                        {availabilityLabel(module)}
                      </span>
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400">
                      {hasTabs ? `${moduleTabs.length} ${labels.tabs}` : labels.fullAccess}
                    </span>
                  </span>
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${isSelected
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-slate-300 bg-white text-transparent dark:border-slate-600 dark:bg-slate-900'}`}
                  >
                    {module.assignable === false && !isSelected ? <LockKeyhole className="h-3.5 w-3.5 text-slate-500" /> : <Check className="h-4 w-4" />}
                  </span>
                </button>

                {isSelected && hasTabs ? (
                  <button
                    type="button"
                    onClick={() => toggleExpanded(module.slug)}
                    aria-expanded={isExpanded}
                    aria-label={isExpanded ? copy.collapse : copy.expand}
                    className="flex h-9 shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-600 hover:border-blue-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                  >
                    {selectedCount}/{moduleTabs.length}
                    <ChevronDown aria-hidden="true" className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>
                ) : null}
              </div>

              {isExpanded ? (
                <div className="border-t border-blue-100 bg-white p-3 dark:border-blue-900 dark:bg-slate-900">
                  <div className="mb-2 flex justify-end gap-1 text-xs">
                    <button type="button" onClick={() => replaceModuleTabs(module.slug, moduleTabs.map((tab) => tab.permission_key))} className="rounded-full border border-slate-200 px-2.5 py-1 text-slate-600 hover:border-blue-200 hover:text-blue-700 dark:border-slate-700 dark:text-slate-300">
                      {copy.all}
                    </button>
                    <button type="button" onClick={() => replaceModuleTabs(module.slug, [])} className="rounded-full border border-slate-200 px-2.5 py-1 text-slate-600 hover:border-red-200 hover:text-red-700 dark:border-slate-700 dark:text-slate-300">
                      {copy.none}
                    </button>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {visibleTabs.map((tab) => {
                      const isTabSelected = selectedPermissionSet.has(tab.permission_key);
                      return (
                        <label key={tab.permission_key} className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-colors ${isTabSelected
                          ? 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-200'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-blue-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'}`}
                        >
                          <input type="checkbox" checked={isTabSelected} onChange={() => togglePermission(tab.permission_key)} className="sr-only" />
                          <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${isTabSelected
                            ? 'border-blue-500 bg-blue-600 text-white'
                            : 'border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-900'}`}
                          >
                            {isTabSelected ? <Check className="h-3.5 w-3.5" /> : null}
                          </span>
                          <span className="min-w-0 flex-1 truncate">{tabLabel(tab)}</span>
                          {tab.protected_scope ? (
                            <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                              <ShieldCheck className="h-3 w-3" /> {copy.protected}
                            </span>
                          ) : null}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </section>
          );
        })}
      </div>
    </div>
  );
}
