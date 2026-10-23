package com.indice.erp.sales.conversations.whatsapp;

import com.indice.erp.sales.conversations.*;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class WhatsAppOutboxRepository {
    public record Job(long company,String message,String connection,long fence,String attempt) { }
    public record Pending(String conversation,long author,String body,String recipient,String sender,String cipher,String connectionState) {
        @Override public String toString(){return "Pending[redacted]";}
    }
    private final JdbcTemplate db;private final SalesConversationRepository repository;private final WhatsAppMessageStatusPolicy statuses;private final SalesConversationNotificationSource notices;
    public WhatsAppOutboxRepository(JdbcTemplate db,SalesConversationRepository repository,WhatsAppMessageStatusPolicy statuses,SalesConversationNotificationSource notices){this.notices=notices;this.db=db;this.repository=repository;this.statuses=statuses;}
    public Optional<Job> claim(){
        var jobs=db.query("SELECT * FROM sales_wa_outbox WHERE (state='QUEUED' AND next_attempt_at<=CURRENT_TIMESTAMP(6)) OR (state='CLAIMED' AND lease_until<CURRENT_TIMESTAMP(6)) ORDER BY created_at,message_id LIMIT 1 FOR UPDATE SKIP LOCKED",(r,n)->new Job(r.getLong("company_id"),r.getString("message_id"),r.getString("connection_id"),r.getLong("fence")+1,UUID.randomUUID().toString()));
        if(jobs.isEmpty())return Optional.empty();var j=jobs.getFirst();
        db.update("UPDATE sales_wa_outbox SET state='CLAIMED',fence=?,attempt_id=?,lease_until=TIMESTAMPADD(SECOND,60,CURRENT_TIMESTAMP(6)) WHERE company_id=? AND message_id=?",j.fence(),j.attempt(),j.company(),j.message());return Optional.of(j);
    }
    public Optional<Pending> pending(Job j){return db.query("SELECT m.conversation_id,m.author_membership_id,m.body,m.recipient_snapshot,m.sender_snapshot,c.credential_ciphertext,c.status FROM sales_wa_outbox o JOIN sales_conversation_messages m ON m.company_id=o.company_id AND m.id=o.message_id AND m.connection_id=o.connection_id JOIN sales_wa_connections c ON c.company_id=o.company_id AND c.id=o.connection_id WHERE o.company_id=? AND o.message_id=? AND o.connection_id=? AND o.state='CLAIMED' AND o.fence=? AND o.attempt_id=? AND o.lease_until>CURRENT_TIMESTAMP(6)",
        (r,n)->new Pending(r.getString(1),r.getLong(2),r.getString(3),r.getString(4),r.getString(5),r.getString(6),r.getString(7)),j.company(),j.message(),j.connection(),j.fence(),j.attempt()).stream().findFirst();}
    public void submitting(Job j,String conversation){
        int changed=db.update("UPDATE sales_wa_outbox SET state='SUBMITTING' WHERE company_id=? AND message_id=? AND state='CLAIMED' AND fence=? AND attempt_id=? AND lease_until>CURRENT_TIMESTAMP(6)",j.company(),j.message(),j.fence(),j.attempt());
        SalesConversationAccess.require(changed==1,org.springframework.http.HttpStatus.CONFLICT,"whatsapp_dispatch_fence");
        db.update("UPDATE sales_conversation_messages SET dispatch_state='SUBMITTING' WHERE company_id=? AND id=?",j.company(),j.message());change(j,conversation,"MESSAGE_SUBMITTING");
    }
    public void cancel(Job j,String conversation,String reason){
        int changed=db.update("UPDATE sales_wa_outbox SET state='CANCELLED',error_code=? WHERE company_id=? AND message_id=? AND state='CLAIMED' AND fence=? AND attempt_id=?",reason,j.company(),j.message(),j.fence(),j.attempt());
        if(changed>0){db.update("UPDATE sales_conversation_messages SET dispatch_state='CANCELLED',error_code=? WHERE company_id=? AND id=?",reason,j.company(),j.message());change(j,conversation,"MESSAGE_CANCELLED");}
    }
    /** An original SUBMITTING attempt keeps its provider evidence even after its control lease expires. */
    public void evidence(Job j,WhatsAppCloudTransport.Outcome outcome){
        var row=db.query("SELECT m.conversation_id,o.state FROM sales_wa_outbox o JOIN sales_conversation_messages m ON m.company_id=o.company_id AND m.id=o.message_id WHERE o.company_id=? AND o.message_id=? AND o.attempt_id=? AND o.state IN ('SUBMITTING','UNKNOWN','ACCEPTED','FAILED') FOR UPDATE",(r,n)->Map.entry(r.getString(1),r.getString(2)),j.company(),j.message(),j.attempt());
        if(row.isEmpty())return;
        int inserted=db.update("INSERT IGNORE INTO sales_wa_dispatch_evidence(company_id,attempt_id,message_id,outcome,provider_message_id,error_code) VALUES(?,?,?,?,?,?)",j.company(),j.attempt(),j.message(),outcome.state(),outcome.providerMessageId(),outcome.errorCode());
        if(inserted==0)return;
        if(outcome.providerMediaId()!=null)db.update("UPDATE sales_conversation_attachments SET provider_media_id=COALESCE(provider_media_id,?) WHERE company_id=? AND message_id=? AND direction='OUT'",outcome.providerMediaId(),j.company(),j.message());
        if(row.getFirst().getValue().equals("ACCEPTED")&&!outcome.state().equals("ACCEPTED")||row.getFirst().getValue().equals("FAILED")&&outcome.state().equals("UNKNOWN"))return;
        db.update("UPDATE sales_wa_outbox SET state=?,error_code=?,lease_until=NULL WHERE company_id=? AND message_id=? AND attempt_id=?",outcome.state(),outcome.errorCode(),j.company(),j.message(),j.attempt());
        db.update("UPDATE sales_conversation_messages SET dispatch_state=?,provider_message_id=COALESCE(provider_message_id,?),error_code=? WHERE company_id=? AND id=?",outcome.state(),outcome.providerMessageId(),outcome.errorCode(),j.company(),j.message());
        if(outcome.state().equals("ACCEPTED"))db.update("UPDATE sales_wa_connections SET last_signal_at=CURRENT_TIMESTAMP(6) WHERE company_id=? AND id=?",j.company(),j.connection());
        if("PROVIDER_AUTHORIZATION_REQUIRED".equals(outcome.errorCode()))db.update("UPDATE sales_wa_connections SET status='RECONNECT_REQUIRED',reason_code='PROVIDER_AUTHORIZATION_REQUIRED',version=version+1 WHERE company_id=? AND id=? AND status IN ('CONNECTED','DEGRADED')",j.company(),j.connection());
        if(outcome.state().equals("UNKNOWN"))db.update("UPDATE sales_wa_connections SET status='DEGRADED',reason_code='PROVIDER_OUTCOME_UNCONFIRMED',version=version+1 WHERE company_id=? AND id=? AND status='CONNECTED'",j.company(),j.connection());
        change(j,row.getFirst().getKey(),"MESSAGE_"+outcome.state());
        if(outcome.providerMessageId()!=null)statuses.apply(j.company(),j.connection(),outcome.providerMessageId());
    }
    public List<Job> uncertain(){return db.query("SELECT * FROM sales_wa_outbox WHERE state='SUBMITTING' AND lease_until<CURRENT_TIMESTAMP(6) ORDER BY company_id,message_id LIMIT 50",(r,n)->new Job(r.getLong("company_id"),r.getString("message_id"),r.getString("connection_id"),r.getLong("fence"),r.getString("attempt_id")));}
    private void change(Job j,String conversation,String type){long seq=repository.event(j.company(),j.connection(),conversation,null,type,null,null);db.update("UPDATE sales_conversation_messages SET change_seq=? WHERE company_id=? AND id=?",seq,j.company(),j.message());if(type.equals("MESSAGE_UNKNOWN")||type.equals("MESSAGE_FAILED"))notices.enqueue(j.company(),conversation,seq);}
}
