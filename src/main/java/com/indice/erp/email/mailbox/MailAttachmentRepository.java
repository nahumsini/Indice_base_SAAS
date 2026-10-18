package com.indice.erp.email.mailbox;
import com.indice.erp.auth.AuthSessionUser;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
@Repository
public class MailAttachmentRepository {
    private final JdbcTemplate db;
    public MailAttachmentRepository(JdbcTemplate db){this.db=db;}
    record Row(String id,String filename,String type,long size,String key,String state){@Override public String toString(){return "AttachmentRow[redacted]";}}
    List<Row> list(AuthSessionUser a,String account,String message){return db.query("SELECT * FROM email_attachments WHERE company_id=? AND account_id=? AND message_id=? AND status='READY' ORDER BY created_at,id",(r,n)->new Row(r.getString("id"),r.getString("filename"),r.getString("content_type"),r.getLong("size_bytes"),r.getString("object_key"),r.getString("status")),a.companyId(),account,message);}
    Row get(AuthSessionUser a,String account,String message,String id){return db.query("SELECT * FROM email_attachments WHERE company_id=? AND account_id=? AND message_id=? AND id=? AND status<>'REMOVED'",(r,n)->new Row(r.getString("id"),r.getString("filename"),r.getString("content_type"),r.getLong("size_bytes"),r.getString("object_key"),r.getString("status")),a.companyId(),account,message,id).stream().findFirst().orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"email_attachment_unavailable"));}
    long pending(AuthSessionUser a,String account,String message){return db.queryForObject("SELECT COUNT(*) FROM email_attachments WHERE company_id=? AND account_id=? AND message_id=? AND (status='READY' OR status='PENDING' AND created_at>CURRENT_TIMESTAMP(6)-INTERVAL 10 MINUTE)",Long.class,a.companyId(),account,message);}
    void insert(AuthSessionUser a,String account,String message,String id,MailboxContracts.UploadInput in,String key){db.update("INSERT INTO email_attachments(company_id,account_id,message_id,id,filename,content_type,size_bytes,object_key) VALUES(?,?,?,?,?,?,?,?)",a.companyId(),account,message,id,in.filename(),in.contentType(),in.sizeBytes(),key);}
    void ready(AuthSessionUser a,String account,String message,String id,String key){db.update("UPDATE email_attachments SET status='READY',object_key=? WHERE company_id=? AND account_id=? AND message_id=? AND id=?",key,a.companyId(),account,message,id);changed(a,account,message);}
    void remove(AuthSessionUser a,String account,String message,String id){db.update("UPDATE email_attachments SET status='REMOVED' WHERE company_id=? AND account_id=? AND message_id=? AND id=?",a.companyId(),account,message,id);changed(a,account,message);}
    private void changed(AuthSessionUser a,String account,String message){db.update("UPDATE email_messages SET version=version+1,has_attachments=EXISTS(SELECT 1 FROM email_attachments WHERE company_id=? AND account_id=? AND message_id=? AND status='READY') WHERE company_id=? AND account_id=? AND id=?",a.companyId(),account,message,a.companyId(),account,message);}
}
