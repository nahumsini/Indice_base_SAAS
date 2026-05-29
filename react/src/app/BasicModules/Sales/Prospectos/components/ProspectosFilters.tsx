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
import { stageLabels } from '../utils/prospectosStatus';

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
      <h3 className="mb-4 text-lg font-bold text-slate-950">Filtros</h3>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700">Buscar</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Oportunidad, empresa o contacto"
              className="h-11 rounded-lg border-slate-200 bg-white pl-10 text-slate-900 shadow-none placeholder:text-slate-400 focus:border-[#FF6B5E] focus:ring-[#FF6B5E]/20"
            />
          </div>
        </div>
        <FilterSelect label="Etapa" value={stageFilter} onValueChange={onStageFilterChange} options={[{ value: 'all', label: 'Todos' }, ...opportunityStages.map((stage) => ({ value: stage, label: stageLabels[stage] }))]} />
        <FilterSelect label="Responsable" value={ownerFilter} onValueChange={onOwnerFilterChange} options={[{ value: 'all', label: 'Todos' }, ...ownerSelectOptions]} />
        <FilterSelect label="Temperatura" value={temperatureFilter} onValueChange={onTemperatureFilterChange} options={[{ value: 'all', label: 'Todos' }, ...opportunityTemperatures.map((temperature) => ({ value: temperature, label: temperature }))]} />
        <FilterSelect label="Origen" value={sourceFilter} onValueChange={onSourceFilterChange} options={[{ value: 'all', label: 'Todos' }, ...opportunitySources.map((source) => ({ value: source, label: source }))]} />
        <FilterSelect label="Estado" value={statusFilter} onValueChange={onStatusFilterChange} options={[{ value: 'all', label: 'Todos' }, ...opportunityStatuses.map((status) => ({ value: status, label: status }))]} />
      </div>
    </section>
  );
}
