package com.indice.erp.sales.conversations;

import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.*;

public final class SalesConversationDtos {
    private SalesConversationDtos() { }
    public enum Capability { READ_OWN, TAKE, READ_ALL, REPLY, TRANSFER, RESOLVE, NOTE, LINK, TASK }
    public record Connection(String id,String displayPhone,String status,long version,Long unitId,Long businessId,
        Instant verifiedAt,Instant lastSignalAt,String reasonCode) { @Override public String toString(){return "Connection[redacted]";} }
    public record Member(long membershipId,String name,Set<Capability> capabilities,boolean active,long version) { @Override public String toString(){return "Member[redacted]";} }
    public record Grant(@NotNull Set<Capability> capabilities,boolean active,@PositiveOrZero long version) { }
    public record Conversation(String id,String connectionId,String phone,String status,Long assigneeMembershipId,
        Long contactId,Long opportunityId,long version,long changeSeq,Instant lastInboundAt,Instant lastActivityAt,boolean outboundBlocked) {
        public Conversation withBlocked(boolean blocked){return new Conversation(id,connectionId,phone,status,assigneeMembershipId,contactId,opportunityId,version,changeSeq,lastInboundAt,lastActivityAt,blocked);}
        @Override public String toString(){return "Conversation[redacted]";}
    }
    public record Attachment(String id,String fileName,String contentType,long sizeBytes,String state) { @Override public String toString(){return "Attachment[redacted]";} }
    public record Message(String id,String direction,String type,String body,String dispatchState,Long authorMembershipId,String authorName,
        Instant createdAt,Instant sentAt,Instant deliveredAt,Instant readAt,String errorCode,long changeSeq,List<Attachment> attachments) {
        @Override public String toString(){return "Message[redacted]";}
        public Message withAttachments(List<Attachment> values){return new Message(id,direction,type,body,dispatchState,authorMembershipId,authorName,createdAt,sentAt,deliveredAt,readAt,errorCode,changeSeq,values);}
    }
    public record Note(String id,long authorMembershipId,String authorName,String body,Instant createdAt) { @Override public String toString(){return "Note[redacted]";} }
    public record Event(long seq,String type,Long actorMembershipId,Long targetMembershipId,String actorName,String targetName,Instant createdAt) { @Override public String toString(){return "Event[redacted]";} }
    public record Page(List<Conversation> items,long total,int page,int pageSize,long cursor) { }
    public record Timeline(Conversation conversation,List<Message> messages,List<Note> notes,List<Event> events,
        long cursor,boolean hasEarlier,Set<Capability> capabilities) { }
    public record History(List<Message> messages,List<Note> notes,List<Event> events,boolean hasEarlier) { }
    public record Command(@NotBlank @Pattern(regexp="[0-9a-fA-F-]{36}") String requestKey,
        @PositiveOrZero long version,@NotBlank @Pattern(regexp="TAKE|TRANSFER|RESOLVE|REOPEN|READ|OPT_OUT") String action,
        Long targetMembershipId,@PositiveOrZero Long readSeq) {
        public Command(String key,long version,String action,Long target){this(key,version,action,target,null);}
    }
    public record Text(@NotBlank @Pattern(regexp="[0-9a-fA-F-]{36}") String requestKey,
        @PositiveOrZero long version,@Size(max=4000) String body,@com.fasterxml.jackson.annotation.JsonInclude(com.fasterxml.jackson.annotation.JsonInclude.Include.NON_EMPTY) @Size(max=1) List<@NotBlank String> attachmentIds) {
        public Text(String request,long version,String body){this(request,version,body,null);}
        public Text{if(body==null)body="";}
        @Override public String toString(){return "Text[redacted]";}
    }
    public record Receipt(String id,long version,String outcome) { }
    public record Context(boolean enabled,boolean ingressEnabled,boolean outboundEnabled,Connection connection,
        Set<Capability> capabilities,boolean canManage,long membershipId) { }
}
