import type { Message, Timeline } from './conversationsApi';
export function mergeTimeline(current:Timeline|null,next:Timeline):Timeline {
 if(!current||current.conversation.id!==next.conversation.id)return next;
 const messages=new Map(current.messages.map(m=>[m.id,m]));
 for(const item of next.messages){const previous=messages.get(item.id);if(!previous||previous.changeSeq<=item.changeSeq)messages.set(item.id,item);}
 return {...next,messages:[...messages.values()].sort((a,b)=>a.createdAt.localeCompare(b.createdAt)||a.id.localeCompare(b.id)),
  notes:[...new Map([...current.notes,...next.notes].map(n=>[n.id,n])).values()].sort((a,b)=>a.createdAt.localeCompare(b.createdAt)||a.id.localeCompare(b.id)),
  events:[...new Map([...current.events,...next.events].map(e=>[e.seq,e])).values()].sort((a,b)=>a.seq-b.seq),hasEarlier:current.hasEarlier,cursor:Math.max(current.cursor,next.cursor)};
}
export function transportStatus(m:Message):string {return m.readAt?'READ':m.deliveredAt?'DELIVERED':m.sentAt?'SENT':m.errorCode==='PROVIDER_FAILURE'?'FAILED':m.dispatchState;}
export function serviceWindow(last:string|null,now=Date.now()){return !!last&&Date.parse(last)+24*60*60*1000>now;}
