import {projectCardCopy} from './projectCardCopy';

export function sharedProjectOwnerName(name:string|undefined,locale:string){
 return name?.trim()||projectCardCopy(locale).ownerFallback;
}

export function ProjectSharedBy({name,locale}:{name:string|undefined;locale:string}){
 const ui=projectCardCopy(locale),owner=sharedProjectOwnerName(name,locale);
 const initials=name?.match(/[\p{L}\p{N}]+/gu)?.slice(0,2).map(part=>Array.from(part)[0]).join('').toLocaleUpperCase(locale);
 return <div className="project-shared-by">
  <span className="project-shared-avatar" aria-hidden="true">{initials||'•'}</span>
  <span className="project-shared-person"><small>{ui.sharedBy}</small><strong title={owner}>{owner}</strong></span>
 </div>;
}
