export type MessagingPortal = 'member' | 'platform' | 'distributor';
export interface Person { id: number; name: string }
export interface MessagingContext { userId: number; companyId: number; membershipId: number; distributor: Person | null; supportOnly: boolean }
export interface Conversation {
  id: number; companyId: number; companyName: string; kind: 'DIRECT' | 'GROUP' | 'SUPPORT' | 'DISTRIBUTOR';
  displayName?: string;
  subject: string; topic: string; moduleName: string; language: string;
  status: 'OPEN' | 'WAITING_CUSTOMER' | 'RESOLVED'; priority: string; createdByMembershipId: number;
  distributorCompanyId: number | null; assignedUserId: number | null; assigneeName: string; requesterName: string;
  version: number; lastMessageId: number | null; firstResponseAt: string | null; resolvedAt: string | null;
  awaitingSince: string; createdAt: string; updatedAt: string; unreadCount: number;
}
export interface Message {
  id: number; conversationId: number; senderUserId: number; senderName: string; senderScope: string;
  visibility: 'PUBLIC' | 'INTERNAL'; requestKey: string; body: string; createdAt: string;
  attachments?: PhotoAttachment[];
}
export interface PhotoAttachment { id: string; fileName: string; contentType: string; sizeBytes: number }
export interface PhotoUpload { id: string; uploadUrl: string; uploadHeaders: Record<string, string>; expiresAt: string }
export interface Page<T> { items: T[]; hasMore: boolean }
export interface Participant { membershipId: number; userId: number; name: string; active: boolean; lastReadMessageId: number }
export interface Detail { conversation: Conversation; messages: Page<Message>; participants?: Participant[] }
export interface TaskLink { id: number; folio: string; title: string; status: string; dueDate: string | null }
export interface CreateConversation {
  kind: Conversation['kind']; recipientMembershipId: number | null; subject: string; topic: string;
  moduleName: string; language: string; body: string; requestKey: string;
  participantMembershipIds?: number[]; groupName?: string;
}
export interface CareSummary {
  unassigned: number; waitingCare: number; waitingCustomer: number; resolved: number; overdue: number;
  averageFirstResponseMinutes: number | null; averageResolutionMinutes: number | null; pendingNotifications: number;
}
export interface Audit { id: number; actorName: string; action: string; detail: string; createdAt: string }
