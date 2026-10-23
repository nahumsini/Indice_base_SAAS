package com.indice.erp.email.mailbox;

import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.List;

public final class MailboxContracts {
    private MailboxContracts() { }
    public record Account(String id,String label,String email,String displayName,String receiveProtocol,long version) { }
    public record Folder(String id,String name,String kind,long uidValidity,long newestUid,long oldestUid,boolean hasOlder,Instant syncedAt,long unreadCount) {
        public Folder(String id,String name,String kind,long uidValidity,long newestUid,long oldestUid,boolean hasOlder,Instant syncedAt) { this(id,name,kind,uidValidity,newestUid,oldestUid,hasOlder,syncedAt,0); }
    }
    public record Workspace(List<Folder> folders,Instant lastSyncAt,String lastError) { }
    public record Message(String id,String folderId,String state,String subject,String fromAddress,String fromName,
        List<String> to,List<String> cc,List<String> bcc,List<String> replyTo,String bodyText,boolean bodyTruncated,
        boolean hasAttachments,boolean read,boolean starred,Instant occurredAt,long version,String failureCode,String bodyHtml,String sentCopyState) {
        public Message(String id,String folderId,String state,String subject,String fromAddress,String fromName,List<String> to,List<String> cc,List<String> bcc,List<String> replyTo,String bodyText,boolean bodyTruncated,boolean hasAttachments,boolean read,boolean starred,Instant occurredAt,long version,String failureCode){this(id,folderId,state,subject,fromAddress,fromName,to,cc,bcc,replyTo,bodyText,bodyTruncated,hasAttachments,read,starred,occurredAt,version,failureCode,null,"NONE");}
        @Override public String toString(){return "MailboxMessage[redacted]";} }
    public record OperationalCounts(long unread,long starred,long drafts,long review) { }
    public record Page(List<Message> items,boolean hasMore) { }
    public record DraftInput(@Min(0) long version,@Min(1) long accountVersion,
        @NotNull @Size(max=20) List<@NotBlank @Email @Size(max=240) String> to,
        @NotNull @Size(max=20) List<@NotBlank @Email @Size(max=240) String> cc,
        @NotNull @Size(max=20) List<@NotBlank @Email @Size(max=240) String> bcc,
        @NotNull @Size(max=240) String subject,@NotNull @Size(max=20000) String bodyText,
        @Pattern(regexp="[0-9a-f-]{36}") String replyToMessageId,@Size(max=500000) String bodyHtml) {
        public DraftInput(long version,long accountVersion,List<String> to,List<String> cc,List<String> bcc,String subject,String bodyText,String replyToMessageId){this(version,accountVersion,to,cc,bcc,subject,bodyText,replyToMessageId,null);}
        @Override public String toString(){return "DraftInput[redacted]";}
    }
    public record Preferences(boolean backgroundEnabled,String sentFolder,long version,Instant nextSyncAt,int failures,String signature,String signatureHtml,boolean signatureNew,boolean signatureReply) {
        public Preferences(boolean backgroundEnabled,String sentFolder,long version,Instant nextSyncAt,int failures,String signature){this(backgroundEnabled,sentFolder,version,nextSyncAt,failures,signature,null,false,false);}
        public Preferences(boolean backgroundEnabled,String sentFolder,long version,Instant nextSyncAt,int failures){this(backgroundEnabled,sentFolder,version,nextSyncAt,failures,"");}
    }
    public record PreferencesInput(boolean backgroundEnabled,@Size(max=512) String sentFolder,@Min(1) long version,@Min(1) long accountVersion,@Size(max=2000) String signature,@Size(max=500000) String signatureHtml,Boolean signatureNew,Boolean signatureReply) {
        public PreferencesInput(boolean backgroundEnabled,String sentFolder,long version,long accountVersion,String signature){this(backgroundEnabled,sentFolder,version,accountVersion,signature,null,null,null);}
        public PreferencesInput(boolean backgroundEnabled,String sentFolder,long version,long accountVersion){this(backgroundEnabled,sentFolder,version,accountVersion,null);}
        @Override public String toString(){return "MailPreferencesInput[redacted]";}
    }
    public record Attachment(String id,String filename,String contentType,long sizeBytes,boolean remote) { }
    public record UploadInput(@NotBlank @Size(max=180) String filename,@NotBlank @Size(max=100) String contentType,@Min(1) @Max(MailFilePolicy.MAX) long sizeBytes,@Min(1) long version,@Min(1) long accountVersion) { }
    /** Internal owner port; storage keys never enter a browser DTO. */
    public record SharedFile(String id,String filename,String contentType,long sizeBytes,String objectKey) { @Override public String toString(){return "SharedMailFile[redacted]";} }
    public record Upload(String id,String url,java.util.Map<String,String> headers) { @Override public String toString(){return "MailUpload[redacted]";} }
    public record Version(@Min(1) long version,@Min(1) long accountVersion) { }
    public record FolderInput(@NotBlank @Size(max=80) String name,@Min(1) long accountVersion) { }
    public record SyncInput(@Pattern(regexp="[0-9a-f-]{36}") String folderId,boolean older) { }
    public record ActionInput(@Min(1) long version,@Min(1) long accountVersion,
        @NotNull @Pattern(regexp="READ|UNREAD|STAR|UNSTAR|MOVE") String action,
        @Pattern(regexp="[0-9a-f-]{36}") String targetFolderId) { }
}
