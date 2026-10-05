package com.indice.erp.messaging;

import java.time.Instant;
import java.util.List;

public final class MessagingContracts {
    private MessagingContracts() { }
    public record Actor(long userId, long companyId, Long membershipId, String scope, boolean supportOnly) {
        public Actor(long userId,long companyId,Long membershipId,String scope) { this(userId,companyId,membershipId,scope,false); }
        public boolean member() { return "MEMBER".equals(scope); }
    }
    public record Person(long id, String name) { }
    public record Context(long userId, long companyId, Long membershipId, Person distributor, boolean supportOnly) { }
    public record Conversation(long id, long companyId, String companyName, String kind, String subject,
        String topic, String moduleName, String language, String status, String priority, long createdByMembershipId,
        Long distributorCompanyId, Long assignedUserId, String assigneeName, String requesterName,
        long version, Long lastMessageId, Instant firstResponseAt, Instant resolvedAt, Instant awaitingSince,
        Instant createdAt, Instant updatedAt, long unreadCount) { }
    public record Message(long id, long conversationId, long senderUserId, String senderName, String senderScope,
        String visibility, String requestKey, String body, Instant createdAt, List<Attachment> attachments) {
        public Message(long id,long conversationId,long senderUserId,String senderName,String senderScope,
            String visibility,String requestKey,String body,Instant createdAt) {
            this(id,conversationId,senderUserId,senderName,senderScope,visibility,requestKey,body,createdAt,List.of());
        }
    }
    public record Attachment(String id,String fileName,String contentType,long sizeBytes) { }
    public record PhotoUpload(String fileName,String contentType,long sizeBytes,String requestKey) { }
    public record PhotoUploadResult(String id,String uploadUrl,java.util.Map<String,String> uploadHeaders,Instant expiresAt) {
        @Override public String toString() { return "PhotoUploadResult[id="+id+", uploadUrl=[redacted], uploadHeaders=[redacted]]"; }
    }
    public record PhotoDownload(String url) {
        @Override public String toString() { return "PhotoDownload[url=[redacted]]"; }
    }
    public record Page<T>(List<T> items, boolean hasMore) { }
    public record Detail(Conversation conversation, Page<Message> messages) { }
    public record Create(String kind, Long recipientMembershipId, String subject, String topic, String moduleName,
        String language, String body, String requestKey) { }
    public record Send(String body, String visibility, String requestKey, List<String> attachmentIds) {
        public Send(String body,String visibility,String requestKey) { this(body,visibility,requestKey,List.of()); }
    }
    public record Read(long messageId) { }
    public record Change(long version, String action, Long assigneeUserId, String value) { }
    public record Summary(long unassigned, long waitingCare, long waitingCustomer, long resolved,
        long overdue, Long averageFirstResponseMinutes, Long averageResolutionMinutes, long pendingNotifications) { }
    public record Audit(long id, String actorName, String action, String detail, Instant createdAt) { }
}
