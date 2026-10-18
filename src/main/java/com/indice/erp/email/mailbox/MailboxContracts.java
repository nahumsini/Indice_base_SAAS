package com.indice.erp.email.mailbox;

import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.List;

public final class MailboxContracts {
    private MailboxContracts() { }
    public record Account(String id,String label,String email,String displayName,String receiveProtocol,long version) { }
    public record Folder(String id,String name,String kind,long uidValidity,long newestUid,long oldestUid,boolean hasOlder,Instant syncedAt) { }
    public record Workspace(List<Folder> folders,Instant lastSyncAt,String lastError) { }
    public record Message(String id,String folderId,String state,String subject,String fromAddress,String fromName,
        List<String> to,List<String> cc,List<String> bcc,List<String> replyTo,String bodyText,boolean bodyTruncated,
        boolean hasAttachments,boolean read,boolean starred,Instant occurredAt,long version,String failureCode,String bodyHtml,String sentCopyState) {
        public Message(String id,String folderId,String state,String subject,String fromAddress,String fromName,List<String> to,List<String> cc,List<String> bcc,List<String> replyTo,String bodyText,boolean bodyTruncated,boolean hasAttachments,boolean read,boolean starred,Instant occurredAt,long version,String failureCode){this(id,folderId,state,subject,fromAddress,fromName,to,cc,bcc,replyTo,bodyText,bodyTruncated,hasAttachments,read,starred,occurredAt,version,failureCode,null,"NONE");}
        @Override public String toString(){return "MailboxMessage[redacted]";} }
    public record Page(List<Message> items,boolean hasMore) { }
    public record DraftInput(@Min(0) long version,@Min(1) long accountVersion,
        @NotNull @Size(max=20) List<@NotBlank @Email @Size(max=240) String> to,
        @NotNull @Size(max=20) List<@NotBlank @Email @Size(max=240) String> cc,
        @NotNull @Size(max=20) List<@NotBlank @Email @Size(max=240) String> bcc,
        @NotNull @Size(max=240) String subject,@NotNull @Size(max=20000) String bodyText,
        @Pattern(regexp="[0-9a-f-]{36}") String replyToMessageId,@Size(max=20000) String bodyHtml) {
        public DraftInput(long version,long accountVersion,List<String> to,List<String> cc,List<String> bcc,String subject,String bodyText,String replyToMessageId){this(version,accountVersion,to,cc,bcc,subject,bodyText,replyToMessageId,null);}
        @Override public String toString(){return "DraftInput[redacted]";}
    }
    public record Preferences(boolean backgroundEnabled,String sentFolder,long version,Instant nextSyncAt,int failures) { }
    public record PreferencesInput(boolean backgroundEnabled,@Size(max=512) String sentFolder,@Min(1) long version,@Min(1) long accountVersion) { }
    public record Attachment(String id,String filename,String contentType,long sizeBytes,boolean remote) { }
    public record UploadInput(@NotBlank @Size(max=180) String filename,@NotBlank @Size(max=100) String contentType,@Min(1) @Max(5242880) long sizeBytes,@Min(1) long version,@Min(1) long accountVersion) { }
    public record Upload(String id,String url,java.util.Map<String,String> headers) { }
    public record Version(@Min(1) long version,@Min(1) long accountVersion) { }
    public record SyncInput(@Pattern(regexp="[0-9a-f-]{36}") String folderId,boolean older) { }
    public record ActionInput(@Min(1) long version,@Min(1) long accountVersion,
        @NotNull @Pattern(regexp="READ|UNREAD|STAR|UNSTAR|MOVE") String action,
        @Pattern(regexp="[0-9a-f-]{36}") String targetFolderId) { }
}
