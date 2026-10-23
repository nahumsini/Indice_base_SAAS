package com.indice.erp.sales.conversations.whatsapp;

import static com.indice.erp.sales.conversations.SalesConversationRepository.instant;
import java.time.Instant;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class WhatsAppInboxRepository {
    public record Route(long company,String connection) { }
    public record Job(long company,String id,String connection,String payload,long fence,int attempts) {
        @Override public String toString(){return "Job[redacted]";}
    }
    private final JdbcTemplate db;
    public WhatsAppInboxRepository(JdbcTemplate db){this.db=db;}
    public Optional<Route> route(String app,String waba,String phone){return db.query("SELECT company_id,id FROM sales_wa_connections WHERE app_id=? AND waba_id=? AND phone_number_id=? AND verified_at IS NOT NULL",(r,n)->new Route(r.getLong(1),r.getString(2)),app,waba,phone).stream().findFirst();}
    public void insert(Route route,String key,String encrypted){db.update("INSERT IGNORE INTO sales_wa_inbox(company_id,id,connection_id,event_key,payload_ciphertext) VALUES(?,?,?,?,?)",route.company(),UUID.randomUUID().toString(),route.connection(),key,encrypted);}
    public void quarantine(String key){db.update("INSERT IGNORE INTO sales_wa_ingress_rejections(event_key,reason_code) VALUES(?,'UNKNOWN_ROUTE')",key);}
    public Optional<Job> next(){
        var rows=db.query("SELECT * FROM sales_wa_inbox WHERE (state='QUEUED' AND next_attempt_at<=CURRENT_TIMESTAMP(6)) OR (state='CLAIMED' AND lease_until<CURRENT_TIMESTAMP(6)) ORDER BY received_at,id LIMIT 1 FOR UPDATE SKIP LOCKED",(r,n)->new Job(r.getLong("company_id"),r.getString("id"),r.getString("connection_id"),r.getString("payload_ciphertext"),r.getLong("fence")+1,r.getInt("attempts")+1));
        if(rows.isEmpty())return Optional.empty();var j=rows.getFirst();
        db.update("UPDATE sales_wa_inbox SET state='CLAIMED',fence=?,attempts=?,lease_until=TIMESTAMPADD(SECOND,60,CURRENT_TIMESTAMP(6)) WHERE company_id=? AND id=?",j.fence(),j.attempts(),j.company(),j.id());return Optional.of(j);
    }
    public boolean owns(Job j){return db.queryForObject("SELECT COUNT(*) FROM sales_wa_inbox WHERE company_id=? AND id=? AND fence=? AND state='CLAIMED' AND lease_until>CURRENT_TIMESTAMP(6)",Integer.class,j.company(),j.id(),j.fence())==1;}
    public void complete(Job j){db.update("UPDATE sales_wa_inbox SET state='DONE',lease_until=NULL,error_code=NULL WHERE company_id=? AND id=? AND fence=? AND state='CLAIMED'",j.company(),j.id(),j.fence());}
    public void failed(Job j){db.update("UPDATE sales_wa_inbox SET state=?,lease_until=NULL,error_code='PROCESSING_FAILED',next_attempt_at=TIMESTAMPADD(SECOND,?,CURRENT_TIMESTAMP(6)) WHERE company_id=? AND id=? AND fence=? AND state='CLAIMED'",j.attempts()>=8?"DEAD":"QUEUED",Math.min(3600,5*(1<<Math.min(9,j.attempts())))+java.util.concurrent.ThreadLocalRandom.current().nextInt(5),j.company(),j.id(),j.fence());}
}
