import { apiClient,buildApiUrl } from '../../../lib/apiClient';
export type Capability='READ_OWN'|'TAKE'|'READ_ALL'|'REPLY'|'TRANSFER'|'RESOLVE'|'NOTE'|'LINK'|'TASK';
export type Connection={id:string;displayPhone:string;status:string;version:number;unitId:number|null;businessId:number|null;verifiedAt:string|null;lastSignalAt?:string|null;reasonCode:string|null};
export type Context={enabled:boolean;ingressEnabled:boolean;outboundEnabled:boolean;connection:Connection|null;capabilities:Capability[];canManage:boolean;membershipId:number};
export type Conversation={id:string;connectionId:string;phone:string;status:'OPEN'|'RESOLVED';outboundBlocked?:boolean;assigneeMembershipId:number|null;contactId:number|null;opportunityId:number|null;version:number;changeSeq:number;lastInboundAt:string|null;lastActivityAt:string};
export type Attachment={id:string;fileName:string;contentType:string;sizeBytes:number;state:string};
export type Message={id:string;direction:'IN'|'OUT';type:string;body:string;dispatchState:string;authorMembershipId:number|null;authorName:string;createdAt:string;sentAt:string|null;deliveredAt:string|null;readAt:string|null;errorCode:string|null;changeSeq:number;attachments?:Attachment[]};
export type Note={id:string;authorMembershipId:number;authorName:string;body:string;createdAt:string};
export type Event={seq:number;type:string;actorMembershipId:number|null;targetMembershipId:number|null;actorName:string;targetName:string;createdAt:string};
export type Page={items:Conversation[];total:number;page:number;pageSize:number;cursor:number};
export type Timeline={conversation:Conversation;messages:Message[];notes:Note[];events:Event[];cursor:number;hasEarlier:boolean;capabilities:Capability[]};
export type History=Pick<Timeline,'messages'|'notes'|'events'|'hasEarlier'>;
export type Receipt={id:string;version:number;outcome:string};
export type CrmContact={id:number;name:string;companyName:string;phone:string;phoneMatches:boolean};
export type CrmOpportunity={id:number;contactId:number;name:string;stage:string;ownerMembershipId:number|null};
export type Flow={id:number|null;name:string;defaultFlow:boolean;stages:{key:string;label:string;type:string}[]};
export type CrmContext={canReadContacts:boolean;canReadOpportunities:boolean;contact:CrmContact|null;opportunity:CrmOpportunity|null;candidates:CrmContact[];opportunities:CrmOpportunity[];flows:{items:Flow[]}};
export type TaskContext={allowed:boolean;assignees:{membershipId:number;name:string}[];tasks:{id:number;folio:string;title:string;dueDate:string}[]};
export type UploadResult={id:string;uploadUrl:string|null;headers:Record<string,string>;expiresAt:string|null;attachment:Attachment|null};
export type Member={membershipId:number;name:string;capabilities:Capability[];active:boolean;version:number};
const base='/api/v1/sales/conversations',connections='/api/v1/sales/whatsapp/connections';
const post=<T>(path:string,body:unknown)=>apiClient<T>(path,{method:'POST',body:JSON.stringify(body)});
export const conversationsApi={
 crm:(id:string,q:string,signal?:AbortSignal)=>apiClient<CrmContext>(`${base}/${id}/crm?${new URLSearchParams({q})}`,{signal}),
 taskContext:(id:string,signal?:AbortSignal)=>apiClient<TaskContext>(`${base}/${id}/tasks`,{signal}),
 ownerCommand:(id:string,action:string,body:Record<string,unknown>)=>post<Receipt>(`${base}/${id}/${action}`,body),
 prepareUpload:(id:string,body:{requestKey:string;fileName:string;contentType:string;sizeBytes:number})=>post<UploadResult>(`${base}/${id}/attachments`,body),
 finalizeUpload:(id:string,attachment:string)=>post<Attachment>(`${base}/${id}/attachments/${attachment}/finalize`,{}),
 attachmentUrl:(id:string,attachment:string)=>buildApiUrl(`${base}/${id}/attachments/${attachment}/content`),
 context:(signal?:AbortSignal)=>apiClient<Context>(`${base}/context`,{signal}),
 list:(box:string,q:string,page:number,signal?:AbortSignal)=>apiClient<Page>(`${base}?${new URLSearchParams({box,q,page:String(page),pageSize:'25'})}`,{signal}),
 timeline:(id:string,after=0,signal?:AbortSignal,before?:string)=>apiClient<Timeline>(`${base}/${id}?${new URLSearchParams({after:String(after),...(before?{before}:{})})}`,{signal}),
 history:(id:string,before:{message?:string;note?:string;event?:number},signal?:AbortSignal)=>apiClient<History>(`${base}/${id}/history?${new URLSearchParams({...before.message?{beforeMessage:before.message}:{},...before.note?{beforeNote:before.note}:{},...before.event?{beforeEvent:String(before.event)}:{}})}`,{signal}),
 command:(id:string,body:{requestKey:string;version:number;action:string;targetMembershipId?:number;readSeq?:number})=>post<Receipt>(`${base}/${id}/commands`,body),
 text:(id:string,note:boolean,body:{requestKey:string;version:number;body:string;attachmentIds?:string[]})=>post<Receipt>(`${base}/${id}/${note?'notes':'messages'}`,body),
 eligible:(id:string,signal?:AbortSignal)=>apiClient<Member[]>(`${base}/${id}/eligible-members`,{signal}),
 candidates:(id:string,signal?:AbortSignal)=>apiClient<Member[]>(`${connections}/${id}/candidates`,{signal}),
 connectionContext:(signal?:AbortSignal)=>apiClient<Context>(connections,{signal}),
 control:(id:string,body:{requestKey:string;version:number;action:'SUSPEND'|'DISCONNECT'})=>post<Connection>(`${connections}/${id}/control`,body),
 setup:(requestKey:string)=>post<Connection>(connections,{requestKey}),
 members:(id:string,signal?:AbortSignal)=>apiClient<Member[]>(`${connections}/${id}/members`,{signal}),
 grant:(id:string,member:number,body:{capabilities:Capability[];active:boolean;version:number})=>apiClient<Member[]>(`${connections}/${id}/members/${member}`,{method:'PUT',body:JSON.stringify(body)}),
};
