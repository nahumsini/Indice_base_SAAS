package com.indice.erp.email.mailbox;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.auth.AuthSessionUser;
import java.sql.*;
import java.time.Instant;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.web.server.ResponseStatusException;
import static com.indice.erp.email.mailbox.MailboxContracts.*;

@Repository
public class MailboxRepository {
    final JdbcTemplate db;private final ObjectMapper json;
    public MailboxRepository(JdbcTemplate db,ObjectMapper json){this.db=db;this.json=json;}
    record Row(Message view,long accountVersion,Long uid,long validity,String messageId,String inReplyTo,String references) {
        @Override public String toString(){return "MailboxRow[redacted]";}
    }
    String json(List<String> values){try{return json.writeValueAsString(values);}catch(Exception e){throw new IllegalStateException("email_serialization_failed");}}
    private List<String> addresses(String value){try{return json.readValue(value,new TypeReference<List<String>>(){});}catch(Exception e){throw new IllegalStateException("email_storage_invalid");}}
    private Instant instant(ResultSet r,String key)throws SQLException {var v=r.getTimestamp(key);return v==null?null:v.toInstant();}
    Row row(ResultSet r,int n)throws SQLException {
        String state=r.getString("state");var started=instant(r,"send_started_at");
        if(state.equals("SUBMITTING")&&started!=null&&started.isBefore(Instant.now().minusSeconds(180)))state="UNKNOWN";
        var view=new Message(r.getString("id"),r.getString("folder_id"),state,r.getString("subject"),r.getString("from_address"),r.getString("from_name"),
            addresses(r.getString("to_json")),addresses(r.getString("cc_json")),addresses(r.getString("bcc_json")),addresses(r.getString("reply_to_json")),
            r.getString("body_text"),r.getBoolean("body_truncated"),r.getBoolean("has_attachments"),r.getBoolean("is_read"),r.getBoolean("is_starred"),
            instant(r,"occurred_at"),r.getLong("version"),r.getString("failure_code"),r.getString("body_html"),r.getString("sent_copy_state"));
        return new Row(view,r.getLong("account_version"),(Long)r.getObject("remote_uid"),r.getLong("uid_validity"),r.getString("message_id"),r.getString("in_reply_to"),r.getString("references_header"));
    }
    Row get(AuthSessionUser actor,String account,String id) {
        return db.query("SELECT * FROM email_messages WHERE company_id=? AND account_id=? AND id=? AND state<>'DISCARDED'",this::row,actor.companyId(),account,id).stream().findFirst()
            .orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"email_message_not_found"));
    }
    List<Folder> folders(AuthSessionUser actor,String account,long version) {
        return db.query("SELECT f.*, (SELECT COUNT(*) FROM email_messages m WHERE m.company_id=f.company_id AND m.account_id=f.account_id AND m.folder_id=f.id AND m.account_version=f.account_version AND m.uid_validity=f.uid_validity AND m.remote_present=TRUE AND m.is_read=FALSE) unread_count FROM email_folders f WHERE f.company_id=? AND f.account_id=? AND f.account_version=? ORDER BY CASE kind WHEN 'INBOX' THEN 0 WHEN 'SENT' THEN 1 ELSE 2 END,remote_name",
            (r,n)->new Folder(r.getString("id"),r.getString("remote_name"),r.getString("kind"),r.getLong("uid_validity"),r.getLong("newest_uid"),r.getLong("oldest_uid"),r.getBoolean("has_older"),instant(r,"synced_at"),r.getLong("unread_count")),actor.companyId(),account,version);
    }
    Workspace workspace(AuthSessionUser actor,String account,long version) {
        var status=db.query("SELECT last_sync_at,last_error FROM email_mailboxes WHERE company_id=? AND account_id=?",(r,n)->new Workspace(folders(actor,account,version),instant(r,"last_sync_at"),r.getString("last_error")),actor.companyId(),account);
        return status.isEmpty()?new Workspace(folders(actor,account,version),null,null):status.getFirst();
    }
    Page list(AuthSessionUser actor,String account,long accountVersion,String folder,String query,int offset,String filter) {
        var args=new ArrayList<Object>(List.of(actor.companyId(),account));String where;
        if(folder.equals("DRAFTS"))where="m.state='DRAFT'";
        else if(folder.equals("OUTBOX"))where="m.state IN ('SUBMITTING','UNKNOWN','FAILED')";
        else if(folder.equals("SENT")){where="((m.state='ACCEPTED' AND m.remote_uid IS NULL) OR (f.kind='SENT' AND f.account_version=? AND m.uid_validity=f.uid_validity AND m.remote_present=TRUE))";args.add(accountVersion);}
        else {where="m.folder_id=? AND f.account_version=? AND m.uid_validity=f.uid_validity AND m.remote_present=TRUE";args.add(folder);args.add(accountVersion);}
        if(filter.equals("UNREAD"))where+=" AND m.is_read=FALSE";
        if(filter.equals("STARRED"))where+=" AND m.is_starred=TRUE";
        if(!query.isBlank()){where+=" AND (LOWER(m.subject) LIKE ? ESCAPE '!' OR LOWER(m.from_address) LIKE ? ESCAPE '!' OR LOWER(m.from_name) LIKE ? ESCAPE '!' OR LOWER(m.to_json) LIKE ? ESCAPE '!' OR LOWER(m.cc_json) LIKE ? ESCAPE '!')";
            String term="%"+query.toLowerCase(Locale.ROOT).replace("!","!!").replace("%","!%").replace("_","!_")+"%";args.add(term);args.add(term);args.add(term);args.add(term);args.add(term);}
        args.add(offset);
        var rows=db.query("SELECT m.* FROM email_messages m LEFT JOIN email_folders f ON f.company_id=m.company_id AND f.account_id=m.account_id AND f.id=m.folder_id WHERE m.company_id=? AND m.account_id=? AND "+where+" ORDER BY m.occurred_at DESC,m.id DESC LIMIT 26 OFFSET ?",this::row,args.toArray());
        return new Page(rows.stream().limit(25).map(Row::view).map(m->new Message(m.id(),m.folderId(),m.state(),m.subject(),m.fromAddress(),m.fromName(),m.to(),m.cc(),m.bcc(),m.replyTo(),null,m.bodyTruncated(),m.hasAttachments(),m.read(),m.starred(),m.occurredAt(),m.version(),m.failureCode())).toList(),rows.size()>25);
    }
    void discover(AuthSessionUser actor,String account,long version,List<MailboxTransport.FolderInfo> folders) {
        for(var f:folders)db.update("INSERT INTO email_folders(company_id,account_id,id,account_version,remote_name,kind) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE kind=VALUES(kind)",actor.companyId(),account,UUID.randomUUID().toString(),version,f.name(),f.kind());
    }
    void batch(AuthSessionUser actor,String account,long accountVersion,Folder folder,MailboxTransport.Batch batch) {
        for(var h:batch.messages()) {
            // Reconcile a server's sent copy with our durable accepted message, if the server creates one.
            if(folder.kind().equals("SENT")&&h.messageId()!=null)db.update("UPDATE email_messages SET folder_id=?,remote_uid=?,uid_validity=?,remote_present=TRUE WHERE company_id=? AND account_id=? AND state='ACCEPTED' AND message_id=? AND remote_uid IS NULL AND account_version=?",folder.id(),h.uid(),batch.validity(),actor.companyId(),account,h.messageId(),accountVersion);
            db.update("""
                INSERT INTO email_messages(company_id,account_id,id,account_version,folder_id,remote_uid,uid_validity,state,subject,from_address,from_name,to_json,cc_json,bcc_json,reply_to_json,message_id,references_header,is_read,is_starred,occurred_at)
                VALUES(?,?,?,?,?,?,?,'RECEIVED',?,?,?,?,?,'[]',?,?,?,?,?,?)
                ON DUPLICATE KEY UPDATE is_read=VALUES(is_read),is_starred=VALUES(is_starred),remote_present=TRUE,version=version+1,updated_at=CURRENT_TIMESTAMP(6)
                """,actor.companyId(),account,UUID.randomUUID().toString(),accountVersion,folder.id(),h.uid(),batch.validity(),h.subject(),h.fromAddress(),h.fromName(),json(h.to()),json(h.cc()),json(h.replyTo()),h.messageId(),h.references(),h.read(),h.starred(),Timestamp.from(h.at()));
        }
        for(var flag:batch.flags())db.update("UPDATE email_messages SET remote_present=?,is_read=?,is_starred=?,version=version+1 WHERE company_id=? AND account_id=? AND folder_id=? AND uid_validity=? AND remote_uid=?",flag.present(),flag.read(),flag.starred(),actor.companyId(),account,folder.id(),batch.validity(),flag.uid());
        db.update("UPDATE email_folders SET uid_validity=?,newest_uid=?,oldest_uid=?,has_older=?,synced_at=CURRENT_TIMESTAMP(6) WHERE company_id=? AND account_id=? AND id=?",batch.validity(),batch.newest(),batch.oldest(),batch.hasOlder(),actor.companyId(),account,folder.id());
        db.update("UPDATE email_mailboxes SET last_sync_at=CURRENT_TIMESTAMP(6),last_error=NULL WHERE company_id=? AND account_id=?",actor.companyId(),account);
    }
    long[] known(AuthSessionUser actor,String account,Folder folder) {
        return db.queryForList("SELECT remote_uid FROM email_messages WHERE company_id=? AND account_id=? AND folder_id=? AND uid_validity=? AND remote_present=TRUE ORDER BY remote_uid DESC LIMIT 50",Long.class,actor.companyId(),account,folder.id(),folder.uidValidity()).stream().mapToLong(Long::longValue).toArray();
    }
    void lockCompany(AuthSessionUser actor){db.queryForObject("SELECT id FROM companies WHERE id=? FOR UPDATE",Long.class,actor.companyId());}
    boolean lease(AuthSessionUser actor,String account,String token){
        db.update("INSERT IGNORE INTO email_mailboxes(company_id,account_id) VALUES(?,?)",actor.companyId(),account);
        return db.update("UPDATE email_mailboxes SET lease_token=?,lease_until=CURRENT_TIMESTAMP(6)+INTERVAL 10 MINUTE WHERE company_id=? AND account_id=? AND (lease_until IS NULL OR lease_until<CURRENT_TIMESTAMP(6))",token,actor.companyId(),account)==1;
    }
    void release(AuthSessionUser actor,String account,String token){db.update("UPDATE email_mailboxes SET lease_token=NULL,lease_until=NULL WHERE company_id=? AND account_id=? AND lease_token=?",actor.companyId(),account,token);}
    boolean claimSync(AuthSessionUser actor,String account){return db.update("UPDATE email_mailboxes SET last_attempt_at=CURRENT_TIMESTAMP(6) WHERE company_id=? AND account_id=? AND (last_attempt_at IS NULL OR last_attempt_at<CURRENT_TIMESTAMP(6)-INTERVAL 5 SECOND)",actor.companyId(),account)==1;}
    void syncError(AuthSessionUser actor,String account,String token,String code){db.update("UPDATE email_mailboxes SET last_error=? WHERE company_id=? AND account_id=? AND lease_token=?",code,actor.companyId(),account,token);}
    void body(AuthSessionUser actor,String account,String id,MailboxTransport.Body body){db.update("UPDATE email_messages SET body_html=?,body_text=?,body_truncated=?,has_attachments=?,is_read=TRUE,version=version+1 WHERE company_id=? AND account_id=? AND id=?",body.html(),body.text(),body.truncated(),body.attachments(),actor.companyId(),account,id);}
    void action(AuthSessionUser actor,String account,String id,String action){
        String column=switch(action){case "READ","UNREAD"->"is_read";case "STAR","UNSTAR"->"is_starred";case "MOVE"->"remote_present";default->throw new IllegalArgumentException("email_action_invalid");};
        boolean value=action.equals("READ")||action.equals("STAR");
        db.update("UPDATE email_messages SET "+column+"=?,version=version+1 WHERE company_id=? AND account_id=? AND id=?",value,actor.companyId(),account,id);
    }
    Optional<Row> draftCandidate(AuthSessionUser actor,String account,String id){return db.query("SELECT * FROM email_messages WHERE company_id=? AND account_id=? AND id=?",this::row,actor.companyId(),account,id).stream().findFirst();}
    long draftCount(AuthSessionUser actor,String account){return db.queryForObject("SELECT COUNT(*) FROM email_messages WHERE company_id=? AND account_id=? AND state='DRAFT'",Long.class,actor.companyId(),account);}
    void insertDraft(AuthSessionUser actor,com.indice.erp.email.accounts.EmailAccountContracts.Account account,String id,DraftInput input,String inReplyTo,String references){
        db.update("""
            INSERT INTO email_messages(company_id,account_id,id,account_version,state,subject,from_address,from_name,to_json,cc_json,bcc_json,reply_to_json,body_text,is_read,in_reply_to,references_header,body_html)
            VALUES(?,?,?,?,'DRAFT',?,?,?,?,?,?,'[]',?,TRUE,?,?,?)
            """,actor.companyId(),account.id(),id,account.version(),input.subject().trim(),account.email(),account.displayName(),json(input.to()),json(input.cc()),json(input.bcc()),input.bodyText(),inReplyTo,references,SafeMailHtml.clean(input.bodyHtml()));
    }
    void updateDraft(AuthSessionUser actor,com.indice.erp.email.accounts.EmailAccountContracts.Account account,String id,DraftInput input){
        db.update("UPDATE email_messages SET account_version=?,subject=?,from_address=?,from_name=?,to_json=?,cc_json=?,bcc_json=?,body_text=?,body_html=?,version=version+1,updated_at=CURRENT_TIMESTAMP(6) WHERE company_id=? AND account_id=? AND id=?",
            account.version(),input.subject().trim(),account.email(),account.displayName(),json(input.to()),json(input.cc()),json(input.bcc()),input.bodyText(),SafeMailHtml.clean(input.bodyHtml()),actor.companyId(),account.id(),id);
    }
    void discard(AuthSessionUser actor,String account,String id){db.update("UPDATE email_messages SET state='DISCARDED',version=version+1,updated_at=CURRENT_TIMESTAMP(6) WHERE company_id=? AND account_id=? AND id=?",actor.companyId(),account,id);}
    long recentSendCount(AuthSessionUser actor,String account){return db.queryForObject("SELECT COUNT(*) FROM email_send_attempts WHERE company_id=? AND account_id=? AND started_at>CURRENT_TIMESTAMP(6)-INTERVAL 1 HOUR",Long.class,actor.companyId(),account);}
    void submitting(AuthSessionUser actor,String account,String id,String attempt,String messageId){
        db.update("UPDATE email_messages SET state='SUBMITTING',message_id=?,send_started_at=CURRENT_TIMESTAMP(6),version=version+1 WHERE company_id=? AND account_id=? AND id=?",messageId,actor.companyId(),account,id);
        db.update("INSERT INTO email_send_attempts(company_id,account_id,message_id,id,actor_user_id,outcome) VALUES(?,?,?,?,?,'SUBMITTING')",actor.companyId(),account,id,attempt,actor.userId());
    }
    void outcome(AuthSessionUser actor,String account,String id,String attempt,String state,String failure){
        db.update("UPDATE email_messages SET state=?,failure_code=?,sent_copy_state=IF(?='ACCEPTED','PENDING','NONE'),version=version+1,occurred_at=CURRENT_TIMESTAMP(6),updated_at=CURRENT_TIMESTAMP(6) WHERE company_id=? AND account_id=? AND id=? AND state='SUBMITTING'",state,state.equals("ACCEPTED")?null:failure!=null?failure:"email_send_"+state.toLowerCase(Locale.ROOT),state,actor.companyId(),account,id);
        db.update("UPDATE email_send_attempts SET outcome=?,completed_at=CURRENT_TIMESTAMP(6) WHERE company_id=? AND account_id=? AND id=?",state,actor.companyId(),account,attempt);
    }
    void campaignReplyTo(AuthSessionUser actor,String account,String id,String replyTo,String displayName){db.update("UPDATE email_messages SET from_name=?,reply_to_json=? WHERE company_id=? AND account_id=? AND id=? AND state='DRAFT'",displayName,json(replyTo==null||replyTo.isBlank()?List.of():List.of(replyTo)),actor.companyId(),account,id);}
    void audit(AuthSessionUser actor,String account,long version,String action){db.update("INSERT INTO email_account_audit(company_id,account_id,actor_user_id,action,account_version) VALUES(?,?,?,?,?)",actor.companyId(),account,actor.userId(),action,version);}
}
