import {
  opportunitySources,
  opportunityStages,
  opportunityStatuses,
  opportunityTemperatures,
} from '../../salesCrmContext';
import {
  SalesFilterBar,
  SalesFilterSearch,
  SalesFilterSelect,
} from '../../components/SalesFilterBar';
import type { ProspectosCopy } from '../translations';
import type { OpportunityFocusFilter, OpportunityPeriodFilter } from '../types/prospectosTypes';
import { RotateCcw } from 'lucide-react';
import { Button } from '../../../../components/ui/button';

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
  onClearFilters,
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
  onClearFilters: () => void;
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
    <SalesFilterBar
      title={copy.filters.title}
      gridClassName="xl:grid-cols-4"
      summary={(
        <Button type="button" variant="outline" className="gap-2" onClick={onClearFilters}>
          <RotateCcw className="h-4 w-4" />
          {copy.filters.clear}
        </Button>
      )}
    >
      <SalesFilterSearch
        label={copy.filters.search}
        value={searchQuery}
        onValueChange={onSearchChange}
        placeholder={copy.filters.searchPlaceholder}
      />
      <SalesFilterSelect
        label={copy.filters.period}
        value={periodFilter}
        onValueChange={(value) => onPeriodFilterChange(value as OpportunityPeriodFilter)}
        options={periodOptions}
      />
      <SalesFilterSelect
        label={copy.filters.status}
        value={statusFilter}
        onValueChange={onStatusFilterChange}
        options={[
          { value: 'all', label: copy.filters.all },
          ...opportunityStatuses.map((status) => ({
            value: status,
            label: copy.options.statuses[status],
          })),
        ]}
      />
      <SalesFilterSelect
        label={copy.filters.focus}
        value={focusFilter}
        onValueChange={(value) => onFocusFilterChange(value as OpportunityFocusFilter)}
        options={focusOptions}
      />
      <SalesFilterSelect
        label={copy.filters.stage}
        value={stageFilter}
        onValueChange={onStageFilterChange}
        options={[
          { value: 'all', label: copy.filters.all },
          ...opportunityStages.map((stage) => ({
            value: stage,
            label: copy.options.stages[stage],
          })),
        ]}
      />
      <SalesFilterSelect
        label={copy.filters.owner}
        value={ownerFilter}
        onValueChange={onOwnerFilterChange}
        options={[{ value: 'all', label: copy.filters.all }, ...ownerSelectOptions]}
      />
      <SalesFilterSelect
        label={copy.filters.temperature}
        value={temperatureFilter}
        onValueChange={onTemperatureFilterChange}
        options={[
          { value: 'all', label: copy.filters.all },
          ...opportunityTemperatures.map((temperature) => ({
            value: temperature,
            label: copy.options.temperatures[temperature],
          })),
        ]}
      />
      <SalesFilterSelect
        label={copy.filters.source}
        value={sourceFilter}
        onValueChange={onSourceFilterChange}
        options={[
          { value: 'all', label: copy.filters.all },
          ...opportunitySources.map((source) => ({
            value: source,
            label: copy.options.sources[source],
          })),
        ]}
      />
    </SalesFilterBar>
  );
}
