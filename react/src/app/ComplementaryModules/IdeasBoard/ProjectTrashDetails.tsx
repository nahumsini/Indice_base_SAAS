import {projectCardCopy} from './projectCardCopy';

export function ProjectTrashDetails({deletedAt,locale}:{deletedAt:string|null|undefined;locale:string}){
 const date=deletedAt?new Date(deletedAt):null;
 if(!date||!Number.isFinite(date.getTime()))return null;
 return <p className="project-trash-date"><span>{projectCardCopy(locale).trashSince}</span><time dateTime={deletedAt!}>{new Intl.DateTimeFormat(locale,{dateStyle:'medium'}).format(date)}</time></p>;
}
