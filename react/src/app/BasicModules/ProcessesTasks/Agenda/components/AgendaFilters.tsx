import { Input } from '../../../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../components/ui/select';
import { agendaStatusFilterValues } from '../hooks/useAgendaFilters';
import type { AgendaTranslations } from '../translations';
import type {
  AgendaParticipantFilterOption,
  AgendaProjectFilterOption,
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
  onBusinessFilterChange: (value: string) => void;
  onCollaboratorFilterChange: (value: string) => void;
  onCustomDateFromChange: (value: string) => void;
  onCustomDateToChange: (value: string) => void;
  onPeriodFilterChange: (value: PeriodFilter) => void;
  onProjectFilterChange: (value: string) => void;
  onStatusFilterChange: (value: StatusFilter) => void;
  onUnitFilterChange: (value: string) => void;
  periodFilter: PeriodFilter;
  periodLabels: Record<string, string>;
  projectFilter: string;
  projectOptions: AgendaProjectFilterOption[];
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
  onBusinessFilterChange,
  onCollaboratorFilterChange,
  onCustomDateFromChange,
  onCustomDateToChange,
  onPeriodFilterChange,
  onProjectFilterChange,
  onStatusFilterChange,
  onUnitFilterChange,
  periodFilter,
  periodLabels,
  projectFilter,
  projectOptions,
  statusFilter,
  unitFilter,
  unitOptions,
}: AgendaFiltersProps) {
  return (
    <section className="mb-6 rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <h3 className="mb-5 text-base font-bold text-slate-800 dark:text-white">{copy.filters.title}</h3>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">{copy.filters.period}</label>
          <Select value={periodFilter} onValueChange={(value) => onPeriodFilterChange(value as PeriodFilter)}>
            <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(periodLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {periodFilter === 'custom' ? (
          <>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">{copy.filters.from}</label>
              <Input
                type="date"
                value={customDateFrom}
                max={customDateTo}
                className="h-11 rounded-xl border-slate-200 bg-white text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                onChange={(event) => onCustomDateFromChange(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">{copy.filters.to}</label>
              <Input
                type="date"
                value={customDateTo}
                min={customDateFrom}
                className="h-11 rounded-xl border-slate-200 bg-white text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                onChange={(event) => onCustomDateToChange(event.target.value)}
              />
            </div>
          </>
        ) : null}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">{copy.filters.unit}</label>
          <Select value={unitFilter} onValueChange={onUnitFilterChange}>
            <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{copy.common.all}</SelectItem>
              {unitOptions.map((unit) => (
                <SelectItem key={unit} value={unit}>
                  {unit}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">{copy.filters.business}</label>
          <Select value={businessFilter} onValueChange={onBusinessFilterChange}>
            <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{copy.common.all}</SelectItem>
              {businessOptions.map((business) => (
                <SelectItem key={business} value={business}>
                  {business}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">{copy.form.labels.project}</label>
          <Select value={projectFilter} onValueChange={onProjectFilterChange}>
            <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{copy.common.all}</SelectItem>
              {projectOptions.map((project) => (
                <SelectItem key={project.value} value={project.value}>
                  {project.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">{copy.filters.collaborator}</label>
          <Select value={collaboratorFilter} onValueChange={onCollaboratorFilterChange}>
            <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{copy.common.all}</SelectItem>
              {collaboratorOptions.map((collaborator) => (
                <SelectItem key={collaborator.value} value={collaborator.value}>
                  {collaborator.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">{copy.filters.status}</label>
          <Select value={statusFilter} onValueChange={(value) => onStatusFilterChange(value as StatusFilter)}>
            <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{copy.common.all}</SelectItem>
              {agendaStatusFilterValues.map((value) => (
                <SelectItem key={value} value={value}>
                  {copy.statuses[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </section>
  );
}
