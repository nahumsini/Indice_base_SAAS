import {
  opportunitySources,
  opportunityTemperatures,
  type OpportunityFlowStage,
} from '../../salesCrmContext';
import {
  SalesFilterBar,
  SalesFilterSearch,
  SalesFilterSelect,
} from '../../components/SalesFilterBar';
import type { ProspectosCopy } from '../translations';
import type { OpportunityFocusFilter, OpportunityPeriodFilter } from '../types/prospectosTypes';
import { ChevronDown, ChevronUp, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { useEffect, useState } from 'react';
import { getOpportunityStageLabel } from '../utils/prospectosFlow';

export function ProspectosFilters({
  copy,
  searchQuery,
  focusFilter,
  stageFilter,
  periodFilter,
  ownerFilter,
  temperatureFilter,
  sourceFilter,
  stages,
  showOwnerFilter,
  ownerSelectOptions,
  onSearchChange,
  onFocusFilterChange,
  onStageFilterChange,
  onPeriodFilterChange,
  onOwnerFilterChange,
  onTemperatureFilterChange,
  onSourceFilterChange,
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
  stages: OpportunityFlowStage[];
  showOwnerFilter: boolean;
  ownerSelectOptions: Array<{ value: string; label: string }>;
  onSearchChange: (value: string) => void;
  onFocusFilterChange: (value: OpportunityFocusFilter) => void;
  onStageFilterChange: (value: string) => void;
  onPeriodFilterChange: (value: OpportunityPeriodFilter) => void;
  onOwnerFilterChange: (value: string) => void;
  onTemperatureFilterChange: (value: string) => void;
  onSourceFilterChange: (value: string) => void;
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
  const advancedFilterCount = [
    periodFilter !== 'all',
    temperatureFilter !== 'all',
    sourceFilter !== 'all',
  ].filter(Boolean).length;
  const hasActiveFilters = Boolean(
    searchQuery
    || focusFilter !== 'all'
    || stageFilter !== 'all'
    || (showOwnerFilter && ownerFilter !== 'all')
    || advancedFilterCount > 0,
  );
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(advancedFilterCount > 0);

  useEffect(() => {
    if (advancedFilterCount > 0) {
      setShowAdvancedFilters(true);
    }
  }, [advancedFilterCount]);

  const primaryGridClassName = showOwnerFilter
    ? 'xl:grid-cols-[minmax(18rem,2fr)_repeat(3,minmax(0,1fr))]'
    : 'xl:grid-cols-[minmax(18rem,2fr)_repeat(2,minmax(0,1fr))]';
  const advancedGridClassName = showOwnerFilter
    ? 'md:col-span-2 xl:col-span-4'
    : 'md:col-span-2 xl:col-span-3';

  return (
    <SalesFilterBar
      title={copy.filters.title}
      gridClassName={primaryGridClassName}
      summary={(
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            aria-expanded={showAdvancedFilters}
            onClick={() => setShowAdvancedFilters((visible) => !visible)}
          >
            <SlidersHorizontal className="h-4 w-4" />
            {showAdvancedFilters ? copy.filters.hideMore : copy.filters.more}
            {advancedFilterCount > 0 ? (
              <span className="rounded-full bg-[#FF6B5E] px-1.5 py-0.5 text-xs leading-none text-white">
                {advancedFilterCount}
              </span>
            ) : null}
            {showAdvancedFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          {hasActiveFilters ? (
            <Button type="button" variant="outline" className="gap-2" onClick={onClearFilters}>
              <RotateCcw className="h-4 w-4" />
              {copy.filters.clear}
            </Button>
          ) : null}
        </div>
      )}
    >
      <SalesFilterSearch
        label={copy.filters.search}
        value={searchQuery}
        onValueChange={onSearchChange}
        placeholder={copy.filters.searchPlaceholder}
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
          ...stages.map((stage) => ({
            value: stage.key,
            label: getOpportunityStageLabel(stage, copy.options.stages as Record<string, string>),
          })),
        ]}
      />
      {showOwnerFilter ? (
        <SalesFilterSelect
          label={copy.filters.owner}
          value={ownerFilter}
          onValueChange={onOwnerFilterChange}
          options={[{ value: 'all', label: copy.filters.all }, ...ownerSelectOptions]}
        />
      ) : null}

      {showAdvancedFilters ? (
        <div className={`${advancedGridClassName} border-t border-slate-200 pt-4 dark:border-slate-700`}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <SalesFilterSelect
              label={copy.filters.period}
              value={periodFilter}
              onValueChange={(value) => onPeriodFilterChange(value as OpportunityPeriodFilter)}
              options={periodOptions}
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
          </div>
        </div>
      ) : null}
    </SalesFilterBar>
  );
}
