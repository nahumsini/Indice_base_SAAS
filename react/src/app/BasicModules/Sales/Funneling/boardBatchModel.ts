import type {BoardContent,IdeaNode} from './ideasBoardModel';
/** Assemble one atomic history/autosave edit; a rejected item never leaves a partial batch. */
export function mergeBoardDrafts(content:BoardContent,drafts:IdeaNode[],prepare:(node:IdeaNode,content:BoardContent)=>IdeaNode|null,isValid:(node:IdeaNode)=>boolean):BoardContent|null {
 if(!drafts.length||drafts.length>3||new Set(drafts.map(n=>n.id)).size!==drafts.length||drafts.some(n=>!n.text.trim()||!isValid(n)))return null;
 const additions=drafts.filter(n=>!content.nodes.some(old=>old.id===n.id)).length;if(content.nodes.length+additions>100)return null;
 let next={...content,nodes:[...content.nodes]};
 for(const draft of drafts){const node=prepare({...draft,text:draft.text.trim()},next);if(!node)return null;const exists=next.nodes.some(n=>n.id===node.id);next={...next,nodes:exists?next.nodes.map(n=>n.id===node.id?node:n):[...next.nodes,node]};}
 return next;
}
