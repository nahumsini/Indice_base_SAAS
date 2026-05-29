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
import type { ProspectosCopy } from '../translations/prospectosTranslations';

export function FilterSelect({
  label,
  value,
  onValueChange,
  options,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-bold text-slate-700">{label}</label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="h-11 rounded-lg border-slate-200 bg-white px-4 text-base font-semibold text-slate-950 shadow-none">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
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
  stageFilter,
  ownerFilter,
  temperatureFilter,
  sourceFilter,
  statusFilter,
  ownerSelectOptions,
  onSearchChange,
  onStageFilterChange,
  onOwnerFilterChange,
  onTemperatureFilterChange,
  onSourceFilterChange,
  onStatusFilterChange,
}: {
  copy: ProspectosCopy;
  searchQuery: string;
  stageFilter: string;
  ownerFilter: string;
  temperatureFilter: string;
  sourceFilter: string;
  statusFilter: string;
  ownerSelectOptions: Array<{ value: string; label: string }>;
  onSearchChange: (value: string) => void;
  onStageFilterChange: (value: string) => void;
  onOwnerFilterChange: (value: string) => void;
  onTemperatureFilterChange: (value: string) => void;
  onSourceFilterChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-lg font-bold text-slate-950">{copy.filters.title}</h3>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700">{copy.filters.search}</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={copy.filters.searchPlaceholder}
              className="h-11 rounded-lg border-slate-200 bg-white pl-10 text-slate-900 shadow-none placeholder:text-slate-400 focus:border-[#FF6B5E] focus:ring-[#FF6B5E]/20"
            />
          </div>
        </div>
        <FilterSelect label={copy.filters.stage} value={stageFilter} onValueChange={onStageFilterChange} options={[{ value: 'all', label: copy.filters.all }, ...opportunityStages.map((stage) => ({ value: stage, label: copy.options.stages[stage] }))]} />
        <FilterSelect label={copy.filters.owner} value={ownerFilter} onValueChange={onOwnerFilterChange} options={[{ value: 'all', label: copy.filters.all }, ...ownerSelectOptions]} />
        <FilterSelect label={copy.filters.temperature} value={temperatureFilter} onValueChange={onTemperatureFilterChange} options={[{ value: 'all', label: copy.filters.all }, ...opportunityTemperatures.map((temperature) => ({ value: temperature, label: copy.options.temperatures[temperature] }))]} />
        <FilterSelect label={copy.filters.source} value={sourceFilter} onValueChange={onSourceFilterChange} options={[{ value: 'all', label: copy.filters.all }, ...opportunitySources.map((source) => ({ value: source, label: copy.options.sources[source] }))]} />
        <FilterSelect label={copy.filters.status} value={statusFilter} onValueChange={onStatusFilterChange} options={[{ value: 'all', label: copy.filters.all }, ...opportunityStatuses.map((status) => ({ value: status, label: copy.options.statuses[status] }))]} />
      </div>
    </section>
  );
}
