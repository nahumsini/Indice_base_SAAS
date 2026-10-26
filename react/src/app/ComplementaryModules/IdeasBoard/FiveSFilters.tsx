import {Circle, CircleCheck, CirclePlay} from 'lucide-react';
import {IndiceFilterBar, IndiceFilterField, IndiceFilterSearch, IndiceFilterSelect, IndiceFilterSegmented, getIndiceFilterControlClassName} from '../../components/frontend-os/IndiceFilterBar';
import {IndiceFilterDisclosureActions} from '../../components/frontend-os/IndiceFilterDisclosure';
import type {IdeaNode} from '../../BasicModules/Sales/Funneling/ideasBoardModel';
import {fiveSCopy} from './fiveSCopy';
import {fiveSFilterText, fiveSFiltersCopy} from './fiveSFiltersCopy';
import {defaultFiveSFilters, fiveSAttentionCounts, fiveSOwners, fiveSOwnerValue, fiveSStatuses, hasFiveSFilters, invalidFiveSRange, type FiveSActionFilters, type FiveSDateFilter, type FiveSStatus, type fiveSProgress} from './fiveSFiltersModel';
import './fiveSFilters.css';

export function FiveSFilters({actions,filters,locale,visibleCount,progress,onChange}:{
  actions:IdeaNode[]; filters:FiveSActionFilters; locale:string; visibleCount:number;
  progress:ReturnType<typeof fiveSProgress>; onChange:(filters:FiveSActionFilters)=>void;
}) {
  const c=fiveSCopy(locale),f=fiveSFiltersCopy(locale),active=hasFiveSFilters(filters);
  const attention=fiveSAttentionCounts(actions,filters);
  const change=(patch:Partial<FiveSActionFilters>)=>onChange({...filters,...patch});
  const scoped=!!filters.search.trim()||filters.owner!=='ALL'||filters.date!=='ALL';
  const labels={PENDING:f.pendingLabel,IN_PROGRESS:c.IN_PROGRESS,VERIFIED:f.verifiedLabel};
  const descriptions={PENDING:f.pendingHelp,IN_PROGRESS:f.inProgressHelp,VERIFIED:f.verifiedHelp};
  const icons={PENDING:Circle,IN_PROGRESS:CirclePlay,VERIFIED:CircleCheck};
  const summary=fiveSFilterText(f.verified,{done:progress.counts.VERIFIED,total:progress.total});
  return <div className="five-s-filter-panel">
    <IndiceFilterBar title={f.filters} gridClassName="md:grid-cols-2 xl:grid-cols-4" summary={<IndiceFilterDisclosureActions
      tone="coral" activeAdvancedCount={0} advancedLabel="" clearLabel={f.clear} hasActiveFilters={active}
      isAdvancedOpen={false} showAdvancedToggle={false} onToggleAdvanced={()=>{}} onClear={()=>onChange({...defaultFiveSFilters})}
      resultSummary={<span role="status">{fiveSFilterText(f.results,{visible:visibleCount,total:actions.length})}</span>}/>}>
      <IndiceFilterSearch tone="coral" label={f.search} placeholder={f.searchHint} value={filters.search}
        clearLabel={f.clearSearch} onClear={()=>change({search:''})} onValueChange={search=>change({search})}/>
      <div className="five-s-date-filter">
      <IndiceFilterSelect tone="coral" label={f.date} value={filters.date} onValueChange={date=>change({date:date as FiveSDateFilter,from:'',to:''})}
        options={[
          {value:'ALL',label:f.allDates},{value:'TODAY',label:f.today},{value:'NEXT_SEVEN',label:f.nextSeven},
          {value:'OVERDUE',label:f.overdue},{value:'REVIEWS_PENDING',label:f.reviewsPending},{value:'UNDATED',label:f.undated},{value:'CUSTOM',label:f.custom},{value:'REVIEWS',label:c.reviews},
        ]}/>
      {filters.date==='CUSTOM'&&<div className="five-s-filter-dates">
        <IndiceFilterField label={f.from}><input type="date" aria-label={f.from} aria-invalid={invalidFiveSRange(filters)} className={getIndiceFilterControlClassName('coral')} value={filters.from} onChange={e=>change({from:e.target.value})}/></IndiceFilterField>
        <IndiceFilterField label={f.to}><input type="date" aria-label={f.to} aria-invalid={invalidFiveSRange(filters)} className={getIndiceFilterControlClassName('coral')} value={filters.to} onChange={e=>change({to:e.target.value})}/></IndiceFilterField>
        {invalidFiveSRange(filters)&&<p className="five-s-range-error" role="alert">{f.rangeError}</p>}
      </div>}
      </div>
      <IndiceFilterSelect tone="coral" label={c.status} value={filters.status} onValueChange={status=>change({status:status as 'ALL'|FiveSStatus})}
        options={[{value:'ALL',label:f.allStatuses},...fiveSStatuses.map(value=>({value,label:c[value]}))]}/>
      <IndiceFilterSelect tone="coral" label={c.owner} value={filters.owner} onValueChange={owner=>change({owner})}
        options={[{value:'ALL',label:f.allOwners},{value:'UNASSIGNED',label:c.noOwner},...fiveSOwners(actions,locale).map(name=>({value:fiveSOwnerValue(name),label:name}))]}/>
      <IndiceFilterSegmented className="five-s-attention" tone="coral" label={f.attention} value={filters.date}
        onValueChange={value=>change({date:filters.date===value?'ALL':value as FiveSDateFilter,from:'',to:''})}
        options={[{value:'OVERDUE',label:`${f.overdueQuick} · ${attention.overdue}`},{value:'REVIEWS_PENDING',label:`${f.reviewsPending} · ${attention.reviews}`}]}/>
      {filters.date==='REVIEWS_PENDING'&&<p className="five-s-filter-help">{f.pendingReviewsHelp}</p>}
      {filters.date==='REVIEWS'&&<p className="five-s-filter-help">{f.reviewHelp}</p>}
    </IndiceFilterBar>
    <section className="five-s-progress-summary" aria-label={scoped?f.selectionProgress:f.progress}>
      <div className="five-s-progress-heading"><h4>{scoped?f.selectionProgress:f.progress}</h4><span>{summary}</span></div>
      <div className="five-s-progress-track" role="progressbar" aria-label={scoped?f.selectionProgress:f.progress} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.percent} aria-valuetext={summary}>
        <span style={{width:`${progress.percent}%`}}/>
      </div>
      <div className="five-s-status-filters">{fiveSStatuses.map(status=>{const Icon=icons[status];return <button type="button" key={status} data-status={status} aria-pressed={filters.status===status}
        onClick={()=>change({status:filters.status===status?'ALL':status})}>
        <span className="five-s-status-filter-value"><Icon size={17} aria-hidden="true"/><strong>{progress.counts[status]}</strong><span>{labels[status]}</span></span>
        <small className="sr-only">{descriptions[status]}</small>
      </button>;})}</div>
    </section>
  </div>;
}
