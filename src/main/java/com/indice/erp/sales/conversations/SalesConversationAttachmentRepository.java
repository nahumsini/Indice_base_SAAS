package com.indice.erp.sales.conversations;

import static com.indice.erp.sales.conversations.SalesConversationRepository.instant;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class SalesConversationAttachmentRepository {
    public record Row(long company,String id,String conversation,String message,Long uploader,String request,String direction,String name,String mime,long size,String state,String objectKey,String uploadKey,String sha,String providerId,String expectedHash,Instant expires,long fence,int attempts){
        @Override public String toString(){return "Attachment[redacted]";}
        public SalesConversationDtos.Attachment view(){return new SalesConversationDtos.Attachment(id,name,mime,size,state);}
    }
    private final JdbcTemplate db;
    public SalesConversationAttachmentRepository(JdbcTemplate db){this.db=db;}
    private final org.springframework.jdbc.core.RowMapper<Row> row=(r,n)->new Row(r.getLong("company_id"),r.getString("id"),r.getString("conversation_id"),r.getString("message_id"),r.getObject("uploader_membership_id",Long.class),r.getString("request_key"),r.getString("direction"),r.getString("file_name"),r.getString("mime_type"),r.getLong("size_bytes"),r.getString("state"),r.getString("object_key"),r.getString("upload_key"),r.getString("sha256"),r.getString("provider_media_id"),r.getString("expected_provider_hash"),instant(r,"expires_at"),r.getLong("fence"),r.getInt("attempts"));
    public Optional<Row> find(long company,String id){return db.query("SELECT * FROM sales_conversation_attachments WHERE company_id=? AND id=?",row,company,id).stream().findFirst();}
    public Optional<Row> retry(long company,long member,String request){return db.query("SELECT * FROM sales_conversation_attachments WHERE company_id=? AND uploader_membership_id=? AND request_key=?",row,company,member,request).stream().findFirst();}
    public void rate(long company,long member){SalesConversationAccess.require(db.queryForObject("SELECT COUNT(*) FROM sales_conversation_attachments WHERE company_id=? AND uploader_membership_id=? AND created_at>TIMESTAMPADD(MINUTE,-1,CURRENT_TIMESTAMP(6))",Integer.class,company,member)<20,org.springframework.http.HttpStatus.TOO_MANY_REQUESTS,"conversation_upload_rate");}
    public void insert(long company,String id,String conversation,long member,String request,String name,String mime,long size,String key,Instant expires){db.update("INSERT INTO sales_conversation_attachments(company_id,id,conversation_id,uploader_membership_id,request_key,direction,file_name,mime_type,size_bytes,state,upload_key,expires_at) VALUES(?,?,?,?,?,'OUT',?,?,?,'STAGING',?,?)",company,id,conversation,member,request,name,mime,size,key,Timestamp.from(expires));}
    public void renew(Row a,String key,Instant expires){db.update("UPDATE sales_conversation_attachments SET upload_key=?,expires_at=?,state='STAGING',cleanup_at=NULL WHERE company_id=? AND id=? AND message_id IS NULL AND state IN ('STAGING','EXPIRED')",key,Timestamp.from(expires),a.company(),a.id());}
    public void ready(Row a,String key,long size,String hash){
        int changed=db.update("UPDATE sales_conversation_attachments SET object_key=?,size_bytes=?,sha256=?,state='READY',lease_until=NULL,error_code=NULL WHERE company_id=? AND id=? AND "+(a.direction().equals("IN")?"state='CLAIMED' AND fence=? AND lease_until>CURRENT_TIMESTAMP(6)":"state='STAGING' AND message_id IS NULL"),
            a.direction().equals("IN")?new Object[]{key,size,hash,a.company(),a.id(),a.fence()}:new Object[]{key,size,hash,a.company(),a.id()});
        SalesConversationAccess.require(changed==1,org.springframework.http.HttpStatus.CONFLICT,"conversation_attachment_fence");
    }
    public void bind(Row a,String message){int updated=db.update("UPDATE sales_conversation_attachments SET message_id=? WHERE company_id=? AND id=? AND message_id IS NULL AND state='READY'",message,a.company(),a.id());SalesConversationAccess.require(updated==1,org.springframework.http.HttpStatus.CONFLICT,"conversation_attachment_bound");}
    public List<Row> forMessage(long company,String conversation,String message){return db.query("SELECT * FROM sales_conversation_attachments WHERE company_id=? AND conversation_id=? AND message_id=?",row,company,conversation,message);}
    public void inbound(long company,String conversation,String message,String id,String name,String mime,String provider,String expectedHash){db.update("INSERT INTO sales_conversation_attachments(company_id,id,conversation_id,message_id,request_key,direction,file_name,mime_type,state,provider_media_id,expected_provider_hash) VALUES(?,?,?,?,?,'IN',?,?,'PENDING',?,?)",company,id,conversation,message,UUID.randomUUID().toString(),name,mime,provider,expectedHash);}
    public Optional<Row> claim(){var list=db.query("SELECT * FROM sales_conversation_attachments WHERE (state='PENDING' AND next_attempt_at<=CURRENT_TIMESTAMP(6)) OR (state='CLAIMED' AND lease_until<CURRENT_TIMESTAMP(6)) ORDER BY created_at,id LIMIT 1 FOR UPDATE SKIP LOCKED",row);if(list.isEmpty())return Optional.empty();var a=list.getFirst();db.update("UPDATE sales_conversation_attachments SET state='CLAIMED',fence=fence+1,attempts=attempts+1,lease_until=TIMESTAMPADD(SECOND,90,CURRENT_TIMESTAMP(6)) WHERE company_id=? AND id=?",a.company(),a.id());return find(a.company(),a.id());}
    public boolean owns(Row a){return db.queryForObject("SELECT COUNT(*) FROM sales_conversation_attachments WHERE company_id=? AND id=? AND state='CLAIMED' AND fence=? AND lease_until>CURRENT_TIMESTAMP(6)",Integer.class,a.company(),a.id(),a.fence())==1;}
    public void reject(Row a,String reason){db.update("UPDATE sales_conversation_attachments SET state='REJECTED',error_code=?,lease_until=NULL WHERE company_id=? AND id=? AND fence=?",reason,a.company(),a.id(),a.fence());}
    public void retry(Row a){db.update("UPDATE sales_conversation_attachments SET state=?,error_code='MEDIA_UNAVAILABLE',lease_until=NULL,next_attempt_at=TIMESTAMPADD(SECOND,?,CURRENT_TIMESTAMP(6)) WHERE company_id=? AND id=? AND fence=?",a.attempts()>=8?"REJECTED":"PENDING",Math.min(3600,15*(1<<Math.min(a.attempts(),7))),a.company(),a.id(),a.fence());}
}
