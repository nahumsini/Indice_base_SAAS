import {useLearningViewState} from '../../../learningMode/useLearningViewState';
import {useLearningProgress} from '../../../learningMode/useLearningProgress';
import { getCachedAuthSession } from '../../../api/authSessionStore';
import type { HumanResourcesGuidanceTabId } from './types';
import type {
  EmployeeLearningExemptibleRequirementId,
  EmployeeLearningException,
} from './humanResourcesLearningModel';
import {
  buildHumanResourcesLearningProgressKey,
  defaultHumanResourcesLearningProgress,
  normalizeHumanResourcesLearningProgress,
  type HumanResourcesLearningProgress,
} from './humanResourcesLearningProgress';

export function getHumanResourcesLearningProgressStorageKey() {
  const session = getCachedAuthSession();
  return session
    ? buildHumanResourcesLearningProgressKey(session)
    : 'indice.learningMode.humanResources:unscoped';
}


export function useHumanResourcesLearningProgress(enabled=true) {
  const storageKey=getHumanResourcesLearningProgressStorageKey();
  const view=useLearningViewState('learning-view-human-resources',storageKey,defaultHumanResourcesLearningProgress,normalizeHumanResourcesLearningProgress);
  const remote=useLearningProgress(enabled);
  const chapters=remote.progress?.chapters.filter(c=>c.module==='human_resources')??[];
  const progress:HumanResourcesLearningProgress={...view.value,
    understoodAreaIds:chapters.filter(c=>c.understoodAt!==null).map(c=>c.tab as HumanResourcesGuidanceTabId),
    appliedAreaIds:chapters.filter(c=>c.status==='applied').map(c=>c.tab as HumanResourcesGuidanceTabId),
    syncError:remote.error||view.error};
  return {
    progress,
    markApplied:(_areaId:HumanResourcesGuidanceTabId)=>remote.refresh(),
    markUnderstood:(areaId:HumanResourcesGuidanceTabId)=>{void remote.update('human_resources',areaId,'understood');},
    removeEmployeeException:(employeeId:number,requirementId:EmployeeLearningExemptibleRequirementId)=>view.update(current=>{
      const exceptions={...(current.employeeExceptions[String(employeeId)]??{})};delete exceptions[requirementId];
      return {...current,employeeExceptions:{...current.employeeExceptions,[String(employeeId)]:exceptions}};
    }),
    restartJourneyView:(areaId:HumanResourcesGuidanceTabId)=>view.update(current=>({...current,activeAreaId:areaId,expanded:true})),
    selectArea:(areaId:HumanResourcesGuidanceTabId)=>view.update(current=>({...current,activeAreaId:areaId})),
    selectEmployee:(employeeId:number|null)=>view.update(current=>({...current,selectedEmployeeId:employeeId})),
    setEmployeeException:(employeeId:number,requirementId:EmployeeLearningExemptibleRequirementId,exception:EmployeeLearningException)=>view.update(current=>({
      ...current,employeeExceptions:{...current.employeeExceptions,[String(employeeId)]:{...(current.employeeExceptions[String(employeeId)]??{}),[requirementId]:exception}}
    })),
    setExpanded:(expanded:boolean)=>view.update(current=>({...current,expanded})),
    retry:()=>{remote.retry();view.retry();},
  };
}
