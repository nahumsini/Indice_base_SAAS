package com.indice.erp.sales.mailing;
import com.indice.erp.auth.AuthSessionUser;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import static com.indice.erp.sales.mailing.MailingDeliveryContracts.*;
@Repository
public class MailingDeliveryRepository {
    private final JdbcTemplate db;
    public MailingDeliveryRepository(JdbcTemplate db){this.db=db;}
    List<Audience> audience(long company,String campaign){return db.query("""
        SELECT s.id,s.company_name,LOWER(TRIM(s.email)) AS email,
            CASE WHEN s.deleted_at IS NOT NULL OR s.status<>'active' OR s.email IS NULL OR s.email NOT REGEXP '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' THEN 'INVALID'
            WHEN p.status='SUPPRESSED' THEN 'SUPPRESSED' WHEN p.status='CONSENTED' THEN 'READY' ELSE 'CONSENT_REQUIRED' END AS eligibility
        FROM sales_mailing_recipients r JOIN sales_contacts s ON s.company_id=r.company_id AND s.id=r.contact_id
        LEFT JOIN sales_mailing_permissions p ON p.company_id=s.company_id AND p.email=LOWER(TRIM(s.email))
        WHERE r.company_id=? AND r.campaign_id=? ORDER BY s.id
        """,(r,n)->new Audience(r.getLong(1),r.getString(2),Objects.toString(r.getString(3),""),r.getString(4)),company,campaign);}
    String contactEmail(long company,long id){return db.query("SELECT LOWER(TRIM(email)) FROM sales_contacts WHERE company_id=? AND id=? AND deleted_at IS NULL AND status='active'",(r,n)->r.getString(1),company,id).stream().findFirst().orElse(null);}
    void consent(AuthSessionUser actor,String email,String evidence,Instant at){
        db.update("INSERT INTO sales_mailing_permissions(company_id,email,status,evidence,recorded_by,recorded_at) VALUES(?,?,'CONSENTED',?,?,?) ON DUPLICATE KEY UPDATE evidence=IF(status='SUPPRESSED',evidence,VALUES(evidence)),recorded_at=IF(status='SUPPRESSED',recorded_at,VALUES(recorded_at)),recorded_by=IF(status='SUPPRESSED',recorded_by,VALUES(recorded_by)),updated_at=CURRENT_TIMESTAMP(6)",actor.companyId(),email,evidence,actor.userId(),Timestamp.from(at));
        db.update("INSERT INTO sales_mailing_permission_events(company_id,email,action,actor_user_id,evidence) VALUES(?,?,?,?,?)",actor.companyId(),email,eligible(actor.companyId(),email)?"CONSENT_RECORDED":"CONSENT_IGNORED",actor.userId(),evidence);
    }
    boolean eligible(long company,String email){return Boolean.TRUE.equals(db.queryForObject("SELECT EXISTS(SELECT 1 FROM sales_mailing_permissions WHERE company_id=? AND email=? AND status='CONSENTED')",Boolean.class,company,email));}
    void launch(AuthSessionUser a,MailingContracts.Campaign c,long accountVersion,Instant scheduled,String footer,List<Audience> audience){
        db.update("INSERT INTO sales_mailing_runs(company_id,campaign_id,actor_user_id,account_id,account_version,scheduled_at,footer) VALUES(?,?,?,?,?,?,?)",a.companyId(),c.id(),a.userId(),c.senderAccountId(),accountVersion,Timestamp.from(scheduled),footer);
        for(var person:audience)db.update("INSERT INTO sales_mailing_deliveries(company_id,campaign_id,id,contact_id,email,name) VALUES(?,?,?,?,?,?)",a.companyId(),c.id(),UUID.randomUUID().toString(),person.contactId(),person.email(),person.name());
        state(a.companyId(),c.id(),scheduled.isAfter(Instant.now())?"SCHEDULED":"RUNNING");audit(a,c.id(),c.version()+1,"LAUNCHED");
    }
    void state(long company,String campaign,String state){db.update("UPDATE sales_mailing_campaigns SET status=?,version=version+1,updated_at=CURRENT_TIMESTAMP(6) WHERE company_id=? AND id=?",state,company,campaign);}
    void audit(AuthSessionUser a,String id,long version,String action){db.update("INSERT INTO sales_mailing_audit(company_id,campaign_id,actor_user_id,campaign_version,action) VALUES(?,?,?,?,?)",a.companyId(),id,a.userId(),version,action);}
    record Run(long company,String campaign,long owner,String account,long accountVersion,Instant scheduled,String footer,String lastError){ }
    Run run(long company,String id){return db.query("SELECT * FROM sales_mailing_runs WHERE company_id=? AND campaign_id=?",(r,n)->new Run(company,id,r.getLong("actor_user_id"),r.getString("account_id"),r.getLong("account_version"),r.getTimestamp("scheduled_at").toInstant(),r.getString("footer"),r.getString("last_error")),company,id).stream().findFirst().orElse(null);}
    List<Delivery> deliveries(long company,String id){return db.query("SELECT * FROM sales_mailing_deliveries WHERE company_id=? AND campaign_id=? ORDER BY name,id",(r,n)->new Delivery(r.getString("id"),r.getString("name"),r.getString("email"),r.getString("state"),r.getTimestamp("completed_at")==null?null:r.getTimestamp("completed_at").toInstant()),company,id);}
    List<Run> due(){return db.query("SELECT r.company_id,r.campaign_id FROM sales_mailing_runs r JOIN sales_mailing_campaigns c ON c.company_id=r.company_id AND c.id=r.campaign_id WHERE c.status IN ('SCHEDULED','RUNNING') AND r.scheduled_at<=CURRENT_TIMESTAMP(6) AND r.next_attempt_at<=CURRENT_TIMESTAMP(6) AND (r.lease_until IS NULL OR r.lease_until<CURRENT_TIMESTAMP(6)) ORDER BY r.next_attempt_at,r.campaign_id LIMIT 10",(r,n)->run(r.getLong(1),r.getString(2)));}
    boolean lease(Run r,String token){return db.update("UPDATE sales_mailing_runs SET lease_token=?,lease_until=CURRENT_TIMESTAMP(6)+INTERVAL 10 MINUTE WHERE company_id=? AND campaign_id=? AND (lease_until IS NULL OR lease_until<CURRENT_TIMESTAMP(6)) AND next_attempt_at<=CURRENT_TIMESTAMP(6)",token,r.company(),r.campaign())==1;}
    void release(Run r,String token,String error,int delay){db.update("UPDATE sales_mailing_runs SET lease_token=NULL,lease_until=NULL,last_error=?,next_attempt_at=TIMESTAMPADD(SECOND,?,CURRENT_TIMESTAMP(6)) WHERE company_id=? AND campaign_id=? AND lease_token=?",error,delay,r.company(),r.campaign(),token);}
    Delivery next(Run r){return deliveries(r.company(),r.campaign()).stream().filter(d->Set.of("PENDING","SUBMITTING").contains(d.state())).findFirst().orElse(null);}
    void outcome(Run r,String id,String state){db.update("UPDATE sales_mailing_deliveries SET state=?,started_at=COALESCE(started_at,CURRENT_TIMESTAMP(6)),completed_at=IF(? IN ('PENDING','SUBMITTING'),NULL,CURRENT_TIMESTAMP(6)) WHERE company_id=? AND campaign_id=? AND id=?",state,state,r.company(),r.campaign(),id);}
    void cancel(long company,String campaign){db.update("UPDATE sales_mailing_deliveries SET state='CANCELLED',completed_at=CURRENT_TIMESTAMP(6) WHERE company_id=? AND campaign_id=? AND state='PENDING'",company,campaign);}
    void pauseUnavailable(Run r){db.update("UPDATE sales_mailing_campaigns SET status='PAUSED',version=version+1 WHERE company_id=? AND id=? AND status IN ('SCHEDULED','RUNNING')",r.company(),r.campaign());db.update("UPDATE sales_mailing_runs SET last_error='mailing_access_or_sender_changed' WHERE company_id=? AND campaign_id=?",r.company(),r.campaign());}
    void suppress(String id){
        var rows=db.query("SELECT company_id,email FROM sales_mailing_deliveries WHERE id=?",(r,n)->new Object[]{r.getLong(1),r.getString(2)},id);
        if(rows.isEmpty())return;long company=(long)rows.getFirst()[0];String email=(String)rows.getFirst()[1];
        db.queryForObject("SELECT id FROM companies WHERE id=? FOR UPDATE",Long.class,company);
        int changed=db.update("UPDATE sales_mailing_permissions SET status='SUPPRESSED',updated_at=CURRENT_TIMESTAMP(6) WHERE company_id=? AND email=? AND status<>'SUPPRESSED'",company,email);
        if(changed>0)db.update("INSERT INTO sales_mailing_permission_events(company_id,email,action) VALUES(?,?,'UNSUBSCRIBED')",company,email);
    }
}
