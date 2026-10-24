export type FileEntry={id:string;parentId:string|null;kind:'FILE'|'FOLDER';name:string;contentType:string;sizeBytes:number;ownerName:string;owned:boolean;permission:number;trashed:boolean;version:number;updatedAt:string};
export type Crumb={id:string;name:string};
export type FilePage={items:FileEntry[];total:number;page:number;pageSize:number;breadcrumbs:Crumb[];folderPermission:number;actorKey:string};
export type FileMember={id:number;name:string};
export type FileGrant={userId:number;name:string;permission:number;inherited:boolean;owner:boolean};
export type FileSharing={entry:FileEntry;grants:FileGrant[]};
export type FileAction='rename'|'move'|'share'|'trash'|'restore'|'open';
// Keep the grid bounded; large images remain available in the explicit preview.
export const canShowFileThumbnail=(item:FileEntry)=>item.kind==='FILE'&&!item.trashed&&item.sizeBytes>0&&item.sizeBytes<=10*1024*1024&&['image/png','image/jpeg','image/gif','image/webp'].includes(item.contentType);
export const canMoveFileTo=(item:FileEntry|undefined,destination:string|null,choices:Crumb[]|null)=>!!item&&!item.trashed&&item.permission>=3&&choices!==null&&destination!==item.parentId&&(destination===null?item.owned:destination!==item.id&&choices.some(choice=>choice.id===destination));
export const fileCategory=(item:FileEntry)=>item.kind==='FOLDER'?'FOLDER':item.contentType.startsWith('image/')?'IMAGE':item.contentType.startsWith('video/')?'VIDEO':item.contentType.startsWith('audio/')?'AUDIO':item.contentType.startsWith('text/')?'TEXT':'DOCUMENT';
export const fileEmoji=(item:FileEntry)=>({FOLDER:'📁',IMAGE:'🖼️',VIDEO:'🎬',AUDIO:'🎧',TEXT:'📝',DOCUMENT:'📄'})[fileCategory(item)];
export function fileSize(value:number,locale:string){if(!value)return '—';const units=['B','KB','MB','GB'];const index=Math.min(3,Math.floor(Math.log(value)/Math.log(1024)));return `${new Intl.NumberFormat(locale,{maximumFractionDigits:index?1:0}).format(value/1024**index)} ${units[index]}`;}
export const validFileBatch=(files:File[])=>files.length>0&&files.length<=20&&files.every(file=>file.size>0&&file.size<=100*1024*1024&&file.name.length<=180&&!/[\\/\u0000-\u001f\u007f]/.test(file.name));
