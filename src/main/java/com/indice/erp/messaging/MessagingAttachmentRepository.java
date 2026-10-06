package com.indice.erp.messaging;

import java.time.Instant;
import java.sql.Timestamp;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import static com.indice.erp.messaging.MessagingContracts.*;

@Repository
public class MessagingAttachmentRepository {
    private final JdbcTemplate jdbc;
    public MessagingAttachmentRepository(JdbcTemplate jdbc) { this.jdbc=jdbc; }
    record Row(String id,long companyId,long conversationId,long senderId,String senderScope,String fileName,
        String contentType,long size,String uploadKey,String storedKey,Long messageId,Instant expiresAt) {
        Attachment metadata() { return new Attachment(id,fileName,contentType,size); }
    }
    private Row row(java.sql.ResultSet r,int n) throws java.sql.SQLException {
        return new Row(r.getString("id"),r.getLong("company_id"),r.getLong("conversation_id"),r.getLong("sender_user_id"),
            r.getString("sender_scope"),r.getString("file_name"),r.getString("content_type"),r.getLong("size_bytes"),
            r.getString("upload_key"),r.getString("stored_key"),r.getObject("message_id",Long.class),r.getTimestamp("expires_at").toInstant());
    }
    Row find(Conversation c,String id) {
        return jdbc.query("SELECT * FROM messaging_attachments WHERE company_id=? AND conversation_id=? AND id=?",this::row,c.companyId(),c.id(),id)
            .stream().findFirst().orElseThrow(MessagingAccess::notFound);
    }
    Row retry(Actor a,Conversation c,String key) {
        return jdbc.query("SELECT * FROM messaging_attachments WHERE company_id=? AND conversation_id=? AND sender_user_id=? AND sender_scope=? AND request_key=?",
            this::row,c.companyId(),c.id(),a.userId(),a.scope(),key).stream().findFirst().orElse(null);
    }
    void capacity(Actor a) {
        jdbc.queryForObject("SELECT id FROM users WHERE id=? FOR UPDATE",Long.class,a.userId());
        int recent=jdbc.queryForObject("SELECT COUNT(*) FROM messaging_attachments WHERE sender_user_id=? AND created_at>CURRENT_TIMESTAMP - INTERVAL 1 MINUTE",Integer.class,a.userId());
        if(recent>=30) throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.TOO_MANY_REQUESTS,"photo_rate_limit");
    }
    void insert(Actor a,Conversation c,PhotoUpload r,String id,String key,Instant expires) {
        jdbc.update("""
            INSERT INTO messaging_attachments(id,company_id,conversation_id,sender_user_id,sender_scope,request_key,
                file_name,content_type,size_bytes,upload_key,expires_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)
            """,id,c.companyId(),c.id(),a.userId(),a.scope(),r.requestKey(),r.fileName(),r.contentType(),r.sizeBytes(),key,Timestamp.from(expires));
    }
    void bind(Conversation c,Row row,long messageId,String storedKey) {
        int changed=jdbc.update("UPDATE messaging_attachments SET message_id=?,stored_key=? WHERE company_id=? AND conversation_id=? AND id=? AND message_id IS NULL",
            messageId,storedKey,c.companyId(),c.id(),row.id());
        if(changed!=1) throw MessagingService.conflict();
    }
    List<Row> forMessages(Conversation c,List<Long> ids) {
        if(ids.isEmpty()) return List.of();
        var args=new java.util.ArrayList<Object>(); args.add(c.companyId()); args.add(c.id()); args.addAll(ids);
        return jdbc.query("SELECT * FROM messaging_attachments WHERE company_id=? AND conversation_id=? AND message_id IN ("
            +String.join(",",java.util.Collections.nCopies(ids.size(),"?"))+") ORDER BY id",this::row,args.toArray());
    }
    boolean visible(Actor a,Conversation c,Row row) {
        return row.messageId()!=null && jdbc.queryForObject("""
            SELECT COUNT(*) FROM messaging_messages WHERE id=? AND conversation_id=?
            AND (visibility='PUBLIC' OR (visibility='INTERNAL' AND sender_scope=? AND ?<>'MEMBER'))
            """,Integer.class,row.messageId(),c.id(),a.scope(),a.scope())==1;
    }
    List<Row> expiredStaging() {
        return jdbc.query("SELECT * FROM messaging_attachments WHERE staging_cleaned_at IS NULL AND expires_at<CURRENT_TIMESTAMP - INTERVAL 1 MINUTE ORDER BY expires_at LIMIT 50 FOR UPDATE SKIP LOCKED",this::row);
    }
    void cleaned(Row row) {
        jdbc.update("UPDATE messaging_attachments SET staging_cleaned_at=CURRENT_TIMESTAMP WHERE company_id=? AND id=?",row.companyId(),row.id());
    }
}
