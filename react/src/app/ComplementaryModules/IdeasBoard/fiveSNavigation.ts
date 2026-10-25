import type {Project} from './ideaWorkspaceApi';
/** Saved 5S projects return to the guided tab without changing their persisted kind or content. */
export function projectBoardTab(project:Project):'canvas'|'five-s'|'system' {
 if(project.summary.kind==='SYSTEM')return 'system';
 return project.freeform?.nodes.some(node=>node.fiveS?.role==='SECTION')?'five-s':'canvas';
}
