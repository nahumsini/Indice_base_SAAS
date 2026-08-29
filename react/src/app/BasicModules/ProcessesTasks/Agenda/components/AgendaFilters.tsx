import { useEffect, useState } from 'react';
import {
  IndiceFilterAdvancedSection,
  IndiceFilterBar,
  IndiceFilterDisclosureActions,
} from '../../../../components/frontend-os';
import { Input } from '../../../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../components/ui/select';
import { agendaFocusFilterValues, agendaStatusFilterValues } from '../hooks/useAgendaFilters';
import type { AgendaTranslations } from '../translations';
import type {
  AgendaParticipantFilterOption,
  AgendaProjectFilterOption,
  AgendaFocusFilter,
  PeriodFilter,
  StatusFilter,
} from '../types';

type AgendaFiltersProps = {
  businessFilter: string;
  businessOptions: string[];
  collaboratorFilter: string;
  collaboratorOptions: AgendaParticipantFilterOption[];
  copy: AgendaTranslations;
  customDateFrom: string;
  customDateTo: string;
  focusFilter: AgendaFocusFilter;
  focusLabels: Record<AgendaFocusFilter, string>;
  onBusinessFilterChange: (value: string) => void;
  onClearFilters: () => void;
  onCollaboratorFilterChange: (value: string) => void;
  onCustomDateFromChange: (value: string) => void;
  onCustomDateToChange: (value: string) => void;
  onFocusFilterChange: (value: AgendaFocusFilter) => void;
  onPeriodFilterChange: (value: PeriodFilter) => void;
  onProjectFilterChange: (value: string) => void;
  onSearchQueryChange: (value: string) => void;
  onStatusFilterChange: (value: StatusFilter) => void;
  onUnitFilterChange: (value: string) => void;
  periodFilter: PeriodFilter;
  periodLabels: Record<string, string>;
  projectFilter: string;
  projectOptions: AgendaProjectFilterOption[];
  searchQuery: string;
  statusFilter: StatusFilter;
  unitFilter: string;
  unitOptions: string[];
};

export function AgendaFilters({
  businessFilter,
  businessOptions,
  collaboratorFilter,
  collaboratorOptions,
  copy,
  customDateFrom,
  customDateTo,
  focusFilter,
  focusLabels,
  onBusinessFilterChange,
  onClearFilters,
  onCollaboratorFilterChange,
  onCustomDateFromChange,
  onCustomDateToChange,
  onFocusFilterChange,
  onPeriodFilterChange,
  onProjectFilterChange,
  onSearchQueryChange,
  onStatusFilterChange,
  onUnitFilterChange,
  periodFilter,
  periodLabels,
  projectFilter,
  projectOptions,
  searchQuery,
  statusFilter,
  unitFilter,
  unitOptions,
}: AgendaFiltersProps) {
  const advancedFilterCount = [
    unitFilter !== 'all',
    businessFilter !== 'all',
    collaboratorFilter !== 'all',
    projectFilter !== 'all',
  ].filter(Boolean).length;
  const hasActiveFilters = Boolean(
    searchQuery
    || focusFilter !== 'mine'
    || periodFilter !== 'today'
    || statusFilter !== 'all'
    || advancedFilterCount > 0,
  );
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(advancedFilterCount > 0);

  useEffect(() => {
    if (advancedFilterCount > 0) {
      setShowAdvancedFilters(true);
    }
  }, [advancedFilterCount]);

  const handleClearFilters = () => {
    onClearFilters();
    setShowAdvancedFilters(false);
  };

  return (
    <IndiceFilterBar
      className="mb-6"
      gridClassName="xl:grid-cols-[minmax(20rem,2fr)_minmax(18rem,1.25fr)_repeat(2,minmax(0,1fr))]"
      summary={(
        <IndiceFilterDisclosureActions
          activeAdvancedCount={advancedFilterCount}
          advancedLabel={showAdvancedFilters ? copy.filters.hideMore : copy.filters.more}
          clearLabel={copy.filters.clear}
          hasActiveFilters={hasActiveFilters}
          isAdvancedOpen={showAdvancedFilters}
          onClear={handleClearFilters}
          onToggleAdvanced={() => setShowAdvancedFilters((visible) => !visible)}
          tone="yellow"
        />
      )}
      title={copy.filters.title}
    >
        <div className="space-y-2 md:col-span-2 xl:col-span-1">
          <label htmlFor="agenda-search" className="text-sm font-medium text-slate-700 dark:text-slate-200">{copy.filters.search}</label>
          <Input
            id="agenda-search"
            type="search"
            value={searchQuery}
            placeholder={copy.filters.searchPlaceholder}
            className="h-11 rounded-xl border-slate-200 bg-white text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
            onChange={(event) => onSearchQueryChange(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-[#8A6200] dark:text-[#FDE68A]">
            <span className="h-2 w-2 rounded-full bg-[#F4C84A]" aria-hidden="true" />
            {copy.filters.focus}
          </label>
          <Select value={focusFilter} onValueChange={(value) => onFocusFilterChange(value as AgendaFocusFilter)}>
            <SelectTrigger aria-label={copy.filters.focus} className="h-11 rounded-xl border-[#E2B931] bg-[#FFF9E5] text-slate-950 shadow-none ring-1 ring-[#F4C84A]/20 dark:border-[#C38A00] dark:bg-[#F4C84A]/10 dark:text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {agendaFocusFilterValues.map((value) => (
                <SelectItem key={value} value={value}>
                  {focusLabels[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200">{copy.filters.period}</label>
          <Select value={periodFilter} onValueChange={(value) => onPeriodFilterChange(value as PeriodFilter)}>
            <SelectTrigger aria-label={copy.filters.period} className="h-11 rounded-xl border-slate-200 bg-white text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(periodLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200">{copy.filters.status}</label>
          <Select value={statusFilter} onValueChange={(value) => onStatusFilterChange(value as StatusFilter)}>
            <SelectTrigger aria-label={copy.filters.status} className="h-11 rounded-xl border-slate-200 bg-white text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{copy.common.all}</SelectItem>
              {agendaStatusFilterValues.map((value) => (
                <SelectItem key={value} value={value}>{copy.statuses[value]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {periodFilter === 'custom' ? (
          <div className="grid grid-cols-1 gap-4 border-t border-slate-200 pt-4 md:col-span-2 md:grid-cols-2 dark:border-slate-700 xl:col-span-4">
            <div className="space-y-2">
              <label htmlFor="agenda-date-from" className="text-sm font-medium text-slate-700 dark:text-slate-200">{copy.filters.from}</label>
              <Input
                id="agenda-date-from"
                type="date"
                value={customDateFrom}
                max={customDateTo}
                className="h-11 rounded-xl border-slate-200 bg-white text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                onChange={(event) => onCustomDateFromChange(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="agenda-date-to" className="text-sm font-medium text-slate-700 dark:text-slate-200">{copy.filters.to}</label>
              <Input
                id="agenda-date-to"
                type="date"
                value={customDateTo}
                min={customDateFrom}
                className="h-11 rounded-xl border-slate-200 bg-white text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                onChange={(event) => onCustomDateToChange(event.target.value)}
              />
            </div>
          </div>
        ) : null}
        {showAdvancedFilters ? (
          <IndiceFilterAdvancedSection className="md:col-span-2 xl:col-span-4" gridClassName="xl:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">{copy.filters.unit}</label>
              <Select value={unitFilter} onValueChange={onUnitFilterChange}>
                <SelectTrigger aria-label={copy.filters.unit} className="h-11 rounded-xl border-slate-200 bg-white text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{copy.common.all}</SelectItem>
                  {unitOptions.map((unit) => (
                    <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">{copy.filters.business}</label>
              <Select value={businessFilter} onValueChange={onBusinessFilterChange}>
                <SelectTrigger aria-label={copy.filters.business} className="h-11 rounded-xl border-slate-200 bg-white text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{copy.common.all}</SelectItem>
                  {businessOptions.map((business) => (
                    <SelectItem key={business} value={business}>{business}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">{copy.filters.collaborator}</label>
              <Select value={collaboratorFilter} onValueChange={onCollaboratorFilterChange}>
                <SelectTrigger aria-label={copy.filters.collaborator} className="h-11 rounded-xl border-slate-200 bg-white text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{copy.common.all}</SelectItem>
                  {collaboratorOptions.map((collaborator) => (
                    <SelectItem key={collaborator.value} value={collaborator.value}>{collaborator.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">{copy.form.labels.project}</label>
              <Select value={projectFilter} onValueChange={onProjectFilterChange}>
                <SelectTrigger aria-label={copy.form.labels.project} className="h-11 rounded-xl border-slate-200 bg-white text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{copy.common.all}</SelectItem>
                  {projectOptions.map((project) => (
                    <SelectItem key={project.value} value={project.value}>{project.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </IndiceFilterAdvancedSection>
        ) : null}
    </IndiceFilterBar>
  );
}
