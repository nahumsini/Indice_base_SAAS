package com.indice.erp.email.mailbox;

import com.indice.erp.email.accounts.EmailAccountService.ConnectionMaterial;
import java.time.Instant;
import java.util.List;

/** Network boundary; provider payloads and exceptions never escape to controllers or logs. */
public interface MailboxTransport {
    record FolderInfo(String name,String kind) { }
    record Cursor(String name,long validity,long newest,long oldest) { }
    record RemoteHeader(long uid,String subject,String fromAddress,String fromName,List<String> to,List<String> cc,
        List<String> replyTo,String messageId,String references,Instant at,boolean read,boolean starred) { }
    record RemoteFlag(long uid,boolean present,boolean read,boolean starred) { }
    record Batch(long validity,long newest,long oldest,boolean hasOlder,List<RemoteHeader> messages,List<RemoteFlag> flags) { }
    record Body(String text,boolean truncated,boolean attachments,String html) {
        public Body(String text,boolean truncated,boolean attachments){this(text,truncated,attachments,null);}
    }
    record FilePart(String name,String type,byte[] bytes) { @Override public String toString(){return "FilePart[redacted]";} }
    record RemoteFile(String path,String name,String type,long size) { }
    enum CopyOutcome { COPIED, FAILED, UNKNOWN, UNAVAILABLE }
    default CopyOutcome copySent(ConnectionMaterial material,Outgoing message,String folder,boolean append){return CopyOutcome.UNAVAILABLE;}
    default List<RemoteFile> attachments(ConnectionMaterial material,Cursor cursor,long uid){return List.of();}
    default FilePart attachment(ConnectionMaterial material,Cursor cursor,long uid,String path){throw new Failure("email_attachment_unavailable");}
    record Outgoing(String messageId,String subject,String text,List<String> to,List<String> cc,List<String> bcc,String inReplyTo,String references,String html,List<FilePart> files,String replyTo,String unsubscribe,String displayName) {
        public Outgoing(String messageId,String subject,String text,List<String> to,List<String> cc,List<String> bcc,String inReplyTo,String references,String html,List<FilePart> files,String replyTo,String unsubscribe){this(messageId,subject,text,to,cc,bcc,inReplyTo,references,html,files,replyTo,unsubscribe,null);}
        public Outgoing(String messageId,String subject,String text,List<String> to,List<String> cc,List<String> bcc,String inReplyTo,String references){this(messageId,subject,text,to,cc,bcc,inReplyTo,references,null,List.of(),null,null,null);}
        @Override public String toString(){return "Outgoing[redacted]";}
    }
    enum Outcome { ACCEPTED, FAILED, UNKNOWN }
    default FolderInfo createFolder(ConnectionMaterial material,String name){throw new Failure("email_folder_create_failed");}
    List<FolderInfo> folders(ConnectionMaterial material);
    Batch sync(ConnectionMaterial material,Cursor cursor,boolean older,long[] knownUids);
    Body open(ConnectionMaterial material,Cursor cursor,long uid);
    void action(ConnectionMaterial material,Cursor cursor,long uid,String action,String targetFolder);
    Outcome send(ConnectionMaterial material,Outgoing message);
    final class Failure extends RuntimeException {
        private final String code;
        public Failure(String code){super(code,null,false,false);this.code=code;}
        public String code(){return code;}
    }
}
