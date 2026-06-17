import { Search } from 'lucide-react';
import {
  opportunitySources,
  opportunityStages,
  opportunityStatuses,
  opportunityTemperatures,
} from '../../salesCrmContext';
import { Input } from '../../../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../components/ui/select';
import type { ProspectosCopy } from '../translations';
import type { OpportunityFocusFilter, OpportunityPeriodFilter } from '../types/prospectosTypes';

export function FilterSelect({
  label,
  value,
  onValueChange,
  options,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">{label}</label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white px-4 text-sm font-semibold text-slate-950 shadow-none focus:ring-[#FF6B5E]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function ProspectosFilters({
  copy,
  searchQuery,
  focusFilter,
  stageFilter,
  periodFilter,
  ownerFilter,
  temperatureFilter,
  sourceFilter,
  statusFilter,
  ownerSelectOptions,
  onSearchChange,
  onFocusFilterChange,
  onStageFilterChange,
  onPeriodFilterChange,
  onOwnerFilterChange,
  onTemperatureFilterChange,
  onSourceFilterChange,
  onStatusFilterChange,
}: {
  copy: ProspectosCopy;
  searchQuery: string;
  focusFilter: OpportunityFocusFilter;
  stageFilter: string;
  periodFilter: OpportunityPeriodFilter;
  ownerFilter: string;
  temperatureFilter: string;
  sourceFilter: string;
  statusFilter: string;
  ownerSelectOptions: Array<{ value: string; label: string }>;
  onSearchChange: (value: string) => void;
  onFocusFilterChange: (value: OpportunityFocusFilter) => void;
  onStageFilterChange: (value: string) => void;
  onPeriodFilterChange: (value: OpportunityPeriodFilter) => void;
  onOwnerFilterChange: (value: string) => void;
  onTemperatureFilterChange: (value: string) => void;
  onSourceFilterChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
}) {
  const focusOptions: Array<{ value: OpportunityFocusFilter; label: string }> = [
    { value: 'all', label: copy.filters.focusOptions.all },
    { value: 'my_portfolio', label: copy.filters.focusOptions.myPortfolio },
    { value: 'to_contact', label: copy.filters.focusOptions.toContact },
    { value: 'without_quote', label: copy.filters.focusOptions.withoutQuote },
    { value: 'in_proposal', label: copy.filters.focusOptions.inProposal },
    { value: 'closed_period', label: copy.filters.focusOptions.closedPeriod },
    { value: 'won', label: copy.filters.focusOptions.won },
    { value: 'lost', label: copy.filters.focusOptions.lost },
  ];
  const periodOptions: Array<{ value: OpportunityPeriodFilter; label: string; disabled?: boolean }> = [
    { value: 'all', label: copy.filters.all },
    { value: 'today', label: copy.filters.periodOptions.today },
    { value: 'this_week', label: copy.filters.periodOptions.this_week },
    { value: 'this_month', label: copy.filters.periodOptions.this_month },
    { value: 'last_month', label: copy.filters.periodOptions.last_month },
    { value: 'custom', label: copy.filters.periodOptions.custom, disabled: true },
  ];

  return (
    <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <h3 className="mb-4 text-base font-bold text-slate-800 dark:text-white">{copy.filters.title}</h3>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-7">
        <div className="space-y-2 xl:col-span-2">
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">{copy.filters.search}</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              type="search"
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={copy.filters.searchPlaceholder}
              className="h-11 rounded-xl border-slate-200 bg-white pl-10 text-slate-900 shadow-none placeholder:text-slate-400 focus:border-[#FF6B5E] focus:ring-[#FF6B5E]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>
        </div>
        <FilterSelect
          label={copy.filters.focus}
          value={focusFilter}
          onValueChange={(value) => onFocusFilterChange(value as OpportunityFocusFilter)}
          options={focusOptions}
        />
        <FilterSelect
          label={copy.filters.period}
          value={periodFilter}
          onValueChange={(value) => onPeriodFilterChange(value as OpportunityPeriodFilter)}
          options={periodOptions}
        />
        <FilterSelect label={copy.filters.stage} value={stageFilter} onValueChange={onStageFilterChange} options={[{ value: 'all', label: copy.filters.all }, ...opportunityStages.map((stage) => ({ value: stage, label: copy.options.stages[stage] }))]} />
        <FilterSelect label={copy.filters.owner} value={ownerFilter} onValueChange={onOwnerFilterChange} options={[{ value: 'all', label: copy.filters.all }, ...ownerSelectOptions]} />
        <FilterSelect label={copy.filters.temperature} value={temperatureFilter} onValueChange={onTemperatureFilterChange} options={[{ value: 'all', label: copy.filters.all }, ...opportunityTemperatures.map((temperature) => ({ value: temperature, label: copy.options.temperatures[temperature] }))]} />
        <FilterSelect label={copy.filters.source} value={sourceFilter} onValueChange={onSourceFilterChange} options={[{ value: 'all', label: copy.filters.all }, ...opportunitySources.map((source) => ({ value: source, label: copy.options.sources[source] }))]} />
        <FilterSelect label={copy.filters.status} value={statusFilter} onValueChange={onStatusFilterChange} options={[{ value: 'all', label: copy.filters.all }, ...opportunityStatuses.map((status) => ({ value: status, label: copy.options.statuses[status] }))]} />
      </div>
    </section>
  );
}
