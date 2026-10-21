package com.indice.erp.email.mailbox;

import com.indice.erp.auth.AuthSessionUser;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import static com.indice.erp.email.mailbox.MailboxContracts.*;

@Repository
public class MailOperationsRepository {
    private final JdbcTemplate db;
    public MailOperationsRepository(JdbcTemplate db){this.db=db;}
    public AuthSessionUser current(long company,long user){return db.query("SELECT uc.id,uc.role FROM user_companies uc JOIN companies c ON c.id=uc.company_id AND c.platform_status='ACTIVE' WHERE uc.company_id=? AND uc.user_id=? AND LOWER(COALESCE(uc.status,'active')) IN ('active','activo') ORDER BY uc.id LIMIT 1",(r,n)->new AuthSessionUser(user,company,r.getLong(1),"Email owner",r.getString(2)),company,user).stream().findFirst().orElseThrow(()->new ResponseStatusException(HttpStatus.FORBIDDEN,"email_access_denied"));}
    Preferences preferences(AuthSessionUser a,String account){return db.query("SELECT * FROM email_mailboxes WHERE company_id=? AND account_id=?",(r,n)->new Preferences(r.getBoolean("background_enabled"),r.getString("sent_folder"),r.getLong("preferences_version"),r.getTimestamp("next_sync_at")==null?null:r.getTimestamp("next_sync_at").toInstant(),r.getInt("sync_failures"),r.getString("signature_text")),a.companyId(),account).stream().findFirst().orElse(new Preferences(false,null,1,null,0));}
    boolean preferences(AuthSessionUser a,String account,PreferencesInput in){db.update("INSERT IGNORE INTO email_mailboxes(company_id,account_id) VALUES(?,?)",a.companyId(),account);return db.update("UPDATE email_mailboxes SET background_enabled=?,sent_folder=?,signature_text=COALESCE(?,signature_text),preferences_version=preferences_version+1,next_sync_at=CURRENT_TIMESTAMP(6),sync_failures=0 WHERE company_id=? AND account_id=? AND preferences_version=?",in.backgroundEnabled(),in.sentFolder(),in.signature(),a.companyId(),account,in.version())==1;}
    record Job(long company,long owner,String account,String message) { }
    List<Job> syncJobs(){return db.query("SELECT a.company_id,a.owner_user_id,a.id FROM email_accounts a JOIN email_mailboxes m ON m.company_id=a.company_id AND m.account_id=a.id WHERE a.active=TRUE AND a.receive_protocol='IMAP' AND m.background_enabled=TRUE AND (m.next_sync_at IS NULL OR m.next_sync_at<=CURRENT_TIMESTAMP(6)) AND (m.lease_until IS NULL OR m.lease_until<CURRENT_TIMESTAMP(6)) ORDER BY m.next_sync_at,a.id LIMIT 10",(r,n)->new Job(r.getLong(1),r.getLong(2),r.getString(3),null));}
    boolean claimJob(Job j){return db.update("UPDATE email_mailboxes SET next_sync_at=CURRENT_TIMESTAMP(6)+INTERVAL 5 MINUTE WHERE company_id=? AND account_id=? AND background_enabled=TRUE AND (next_sync_at IS NULL OR next_sync_at<=CURRENT_TIMESTAMP(6))",j.company(),j.account())==1;}
    void syncResult(Job j,boolean ok){db.update("UPDATE email_mailboxes SET sync_failures=IF(?,0,LEAST(sync_failures+1,8)),next_sync_at=TIMESTAMPADD(SECOND,IF(?,60,LEAST(3600,60*POW(2,sync_failures))),CURRENT_TIMESTAMP(6)),last_error=IF(?,NULL,'email_background_failed') WHERE company_id=? AND account_id=?",ok,ok,ok,j.company(),j.account());}
    List<Job> copyJobs(){return db.query("SELECT a.company_id,a.owner_user_id,a.id,m.id FROM email_accounts a JOIN email_messages m ON m.company_id=a.company_id AND m.account_id=a.id AND m.account_version=a.version WHERE a.active=TRUE AND a.receive_protocol='IMAP' AND m.state='ACCEPTED' AND m.sent_copy_state='PENDING' AND m.updated_at<CURRENT_TIMESTAMP(6)-INTERVAL 15 SECOND ORDER BY m.updated_at LIMIT 10",(r,n)->new Job(r.getLong(1),r.getLong(2),r.getString(3),r.getString(4)));}
    void copyState(AuthSessionUser a,String account,String message,String state){db.update("UPDATE email_messages SET sent_copy_state=?,sent_copy_started_at=CURRENT_TIMESTAMP(6) WHERE company_id=? AND account_id=? AND id=?",state,a.companyId(),account,message);}
}
