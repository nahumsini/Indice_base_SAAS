package com.indice.erp.email.accounts;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.access.module.ModuleAccessService;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;
import static com.indice.erp.email.accounts.EmailAccountContracts.*;

@Service
public class EmailAccountService {
    private final JdbcTemplate db;
    private final ModuleAccessService modules;
    private final EmailCredentialCodec codec;
    private final MailConnectionProbe probe;
    private final TransactionTemplate transactions;
    public EmailAccountService(JdbcTemplate db,ModuleAccessService modules,EmailCredentialCodec codec,
        MailConnectionProbe probe,PlatformTransactionManager transactions) {
        this.db=db;this.modules=modules;this.codec=codec;this.probe=probe;this.transactions=new TransactionTemplate(transactions);
    }
    static void require(boolean valid,HttpStatus status,String code) {
        if(!valid)throw new ResponseStatusException(status,code);
    }
    private void access(AuthSessionUser actor) {require(modules.canAccess(actor,"correo"),HttpStatus.FORBIDDEN,"email_access_denied");}
    private void mutation(AuthSessionUser actor) {
        access(actor);
        db.queryForObject("SELECT id FROM companies WHERE id=? FOR UPDATE",Long.class,actor.companyId());
        require(modules.companyCanAccessForMutation(actor.companyId(),"correo"),HttpStatus.FORBIDDEN,"email_access_denied");
    }
    public Accounts list(AuthSessionUser actor) {
        access(actor);
        return new Accounts(db.query("SELECT * FROM email_accounts WHERE company_id=? AND owner_user_id=? AND active=TRUE ORDER BY label,id",
            this::map,actor.companyId(),actor.userId()),codec.available());
    }
    public Account get(AuthSessionUser actor,String id) {
        access(actor);
        return db.query("SELECT * FROM email_accounts WHERE company_id=? AND owner_user_id=? AND id=? AND active=TRUE",
            this::map,actor.companyId(),actor.userId(),id).stream().findFirst()
            .orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"email_account_not_found"));
    }
    @Transactional
    public Account save(AuthSessionUser actor,String id,AccountInput input) {
        mutation(actor);
        require(codec.available(),HttpStatus.SERVICE_UNAVAILABLE,"email_configuration_unavailable");
        try {require(UUID.fromString(id).toString().equals(id),HttpStatus.BAD_REQUEST,"email_id_invalid");}
        catch(IllegalArgumentException bad){throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"email_id_invalid");}
        validate(input);
        requireIdle(actor,id);
        var rows=db.queryForList("SELECT * FROM email_accounts WHERE company_id=? AND id=? FOR UPDATE",actor.companyId(),id);
        var old=rows.isEmpty()?null:rows.getFirst();
        require(old==null||((Number)old.get("owner_user_id")).longValue()==actor.userId(),HttpStatus.NOT_FOUND,"email_account_not_found");
        require(old==null?input.version()==0:((Number)old.get("version")).longValue()==input.version()&&Boolean.TRUE.equals(old.get("active")),HttpStatus.CONFLICT,"email_version_conflict");
        if(old==null)require(db.queryForObject("SELECT COUNT(*) FROM email_accounts WHERE company_id=? AND owner_user_id=? AND active=TRUE",Long.class,actor.companyId(),actor.userId())<20,HttpStatus.CONFLICT,"email_account_limit");
        String smtp=secret(actor,id,"smtp",input.smtpPassword(),old==null?null:(String)old.get("smtp_secret"));
        String receive="NONE".equals(input.receiveProtocol())?null:secret(actor,id,"receive",input.receivePassword(),old==null?null:(String)old.get("receive_secret"));
        if(old==null)db.update("""
            INSERT INTO email_accounts(company_id,id,owner_user_id,label,email,display_name,smtp_host,smtp_port,smtp_security,smtp_username,smtp_secret,
                receive_protocol,receive_host,receive_port,receive_username,receive_secret,mailing_enabled)
            VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            """,actor.companyId(),id,actor.userId(),input.label().trim(),input.email().trim(),input.displayName().trim(),input.smtpHost().trim(),input.smtpPort(),input.smtpSecurity(),input.smtpUsername().trim(),smtp,
            input.receiveProtocol(),input.receiveHost().trim(),input.receivePort(),input.receiveUsername().trim(),receive,input.mailingEnabled());
        else db.update("""
            UPDATE email_accounts SET label=?,email=?,display_name=?,smtp_host=?,smtp_port=?,smtp_security=?,smtp_username=?,smtp_secret=?,
                receive_protocol=?,receive_host=?,receive_port=?,receive_username=?,receive_secret=?,mailing_enabled=?,
                smtp_status='NOT_TESTED',receive_status='NOT_TESTED',smtp_checked_at=NULL,receive_checked_at=NULL,version=version+1,updated_at=CURRENT_TIMESTAMP(6)
            WHERE company_id=? AND owner_user_id=? AND id=? AND version=?
            """,input.label().trim(),input.email().trim(),input.displayName().trim(),input.smtpHost().trim(),input.smtpPort(),input.smtpSecurity(),input.smtpUsername().trim(),smtp,
            input.receiveProtocol(),input.receiveHost().trim(),input.receivePort(),input.receiveUsername().trim(),receive,input.mailingEnabled(),actor.companyId(),actor.userId(),id,input.version());
        audit(actor,id,input.version()+1,"SAVED");return get(actor,id);
    }
    private String secret(AuthSessionUser actor,String id,String channel,String password,String existing) {
        if(password==null||password.isEmpty()) {
            require(existing!=null,HttpStatus.BAD_REQUEST,"email_password_required");return existing;
        }
        return codec.encrypt(actor.companyId(),id,channel,password);
    }
    private void validate(AccountInput input) {
        require(input.smtpPort()==465&&"TLS".equals(input.smtpSecurity())||input.smtpPort()==587&&"STARTTLS".equals(input.smtpSecurity()),HttpStatus.BAD_REQUEST,"email_tls_required");
        require(host(input.smtpHost())&&!input.smtpUsername().isBlank(),HttpStatus.BAD_REQUEST,"email_host_invalid");
        require("NONE".equals(input.receiveProtocol())&&input.receivePort()==993
            ||"IMAP".equals(input.receiveProtocol())&&input.receivePort()==993
            ||"POP3".equals(input.receiveProtocol())&&input.receivePort()==995,HttpStatus.BAD_REQUEST,"email_receive_invalid");
        if(!"NONE".equals(input.receiveProtocol()))require(host(input.receiveHost())&&!input.receiveUsername().isBlank(),HttpStatus.BAD_REQUEST,"email_receive_invalid");
        for(String value:List.of(input.email(),input.displayName(),input.smtpUsername(),input.receiveUsername()))
            require(value.indexOf('\r')<0&&value.indexOf('\n')<0,HttpStatus.BAD_REQUEST,"email_field_invalid");
    }
    private boolean host(String value) {
        return value!=null&&value.trim().matches("(?i)(?=.{1,253}$)[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+")
            &&!value.trim().matches("[0-9.]+");
    }
    @Transactional
    public void disconnect(AuthSessionUser actor,String id,long version) {
        mutation(actor);requireIdle(actor,id);var account=get(actor,id);
        require(account.version()==version,HttpStatus.CONFLICT,"email_version_conflict");
        db.update("UPDATE email_accounts SET active=FALSE,mailing_enabled=FALSE,smtp_secret='',receive_secret=NULL,version=version+1,updated_at=CURRENT_TIMESTAMP(6) WHERE company_id=? AND owner_user_id=? AND id=?",actor.companyId(),actor.userId(),id);
        audit(actor,id,version+1,"DISCONNECTED");
    }
    // Network I/O stays outside the transaction. The version check prevents a stale probe from validating new settings.
    public Account test(AuthSessionUser actor,String id,ConnectionTest input) {
        return testWithDiagnostic(actor,id,input).account();
    }
    public ConnectionTestResult testWithDiagnostic(AuthSessionUser actor,String id,ConnectionTest input) {
        var material=transactions.execute(status->{
            mutation(actor);requireIdle(actor,id);var account=get(actor,id);
            require(account.version()==input.version(),HttpStatus.CONFLICT,"email_version_conflict");
            require(codec.available(),HttpStatus.SERVICE_UNAVAILABLE,"email_configuration_unavailable");
            require("SMTP".equals(input.channel())||!"NONE".equals(account.receiveProtocol()),HttpStatus.BAD_REQUEST,"email_receive_disabled");
            int claimed=db.update("UPDATE email_accounts SET last_test_at=CURRENT_TIMESTAMP(6) WHERE company_id=? AND owner_user_id=? AND id=? AND (last_test_at IS NULL OR last_test_at<CURRENT_TIMESTAMP(6)-INTERVAL 30 SECOND)",actor.companyId(),actor.userId(),id);
            require(claimed==1,HttpStatus.TOO_MANY_REQUESTS,"email_test_rate_limited");
            String channel="SMTP".equals(input.channel())?"smtp":"receive";
            String encrypted=db.queryForObject("SELECT "+channel+"_secret FROM email_accounts WHERE company_id=? AND owner_user_id=? AND id=?",String.class,actor.companyId(),actor.userId(),id);
            return new ProbeMaterial(account,codec.decrypt(actor.companyId(),id,channel,encrypted));
        });
        var a=material.account();boolean smtp="SMTP".equals(input.channel());
        boolean verified;String failureCode=null;
        try {
            verified=probe.verify(smtp?"SMTP":a.receiveProtocol(),smtp?a.smtpHost():a.receiveHost(),smtp?a.smtpPort():a.receivePort(),smtp?a.smtpSecurity():"TLS",smtp?a.smtpUsername():a.receiveUsername(),material.password());
            if(!verified)failureCode=MailConnectionFailure.Code.UNKNOWN.name();
        } catch(MailConnectionFailure failure) {verified=false;failureCode=failure.code().name();}
        final boolean connected=verified;
        var tested=transactions.execute(status->{
            mutation(actor);get(actor,id);String column=smtp?"smtp":"receive";
            int changed=db.update("UPDATE email_accounts SET "+column+"_status=?,"+column+"_checked_at=CURRENT_TIMESTAMP(6) WHERE company_id=? AND owner_user_id=? AND id=? AND active=TRUE AND version=?",
                connected?"VERIFIED":"ERROR",actor.companyId(),actor.userId(),id,input.version());
            require(changed==1,HttpStatus.CONFLICT,"email_version_conflict");
            audit(actor,id,input.version(),smtp?(connected?"SMTP_VERIFIED":"SMTP_FAILED"):(connected?"RECEIVE_VERIFIED":"RECEIVE_FAILED"));
            return get(actor,id);
        });
        return new ConnectionTestResult(tested,failureCode);
    }
    /** Internal Email owner port. Never serialize this material or pass it to another module. */
    public ConnectionMaterial connection(AuthSessionUser actor,String id,boolean smtp) {
        var account=get(actor,id);
        String channel=smtp?"smtp":"receive";
        require(smtp||"IMAP".equals(account.receiveProtocol()),HttpStatus.UNPROCESSABLE_ENTITY,"email_imap_required");
        String encrypted=db.queryForObject("SELECT "+channel+"_secret FROM email_accounts WHERE company_id=? AND owner_user_id=? AND id=? AND active=TRUE",String.class,actor.companyId(),actor.userId(),id);
        return new ConnectionMaterial(account,codec.decrypt(actor.companyId(),id,channel,encrypted));
    }
    public record ConnectionMaterial(Account account,String password) {
        @Override public String toString(){return "ConnectionMaterial[redacted]";}
    }
    private void requireIdle(AuthSessionUser actor,String id) {
        require(db.queryForObject("SELECT COUNT(*) FROM email_mailboxes WHERE company_id=? AND account_id=? AND lease_until>CURRENT_TIMESTAMP(6)",Long.class,actor.companyId(),id)==0,
            HttpStatus.CONFLICT,"email_operation_in_progress");
    }
    /** Sales receives a private owner's safe sender projection; never mailbox data or credentials. */
    public List<Sender> senders(AuthSessionUser actor) {
        if(!modules.canAccess(actor,"correo"))return List.of();
        return db.query("SELECT id,label,email,display_name,smtp_status FROM email_accounts WHERE company_id=? AND owner_user_id=? AND active=TRUE AND mailing_enabled=TRUE ORDER BY label,id",
            (r,n)->new Sender(r.getString(1),r.getString(2),r.getString(3),r.getString(4),r.getString(5)),actor.companyId(),actor.userId());
    }
    public void requireSender(AuthSessionUser actor,String id) {
        require(senders(actor).stream().anyMatch(a->a.id().equals(id)),HttpStatus.BAD_REQUEST,"email_sender_unavailable");
    }
    private void audit(AuthSessionUser actor,String id,long version,String action) {
        db.update("INSERT INTO email_account_audit(company_id,account_id,actor_user_id,action,account_version) VALUES(?,?,?,?,?)",actor.companyId(),id,actor.userId(),action,version);
    }
    private Account map(ResultSet r,int row) throws SQLException {
        return new Account(r.getString("id"),r.getString("label"),r.getString("email"),r.getString("display_name"),
            r.getString("smtp_host"),r.getInt("smtp_port"),r.getString("smtp_security"),r.getString("smtp_username"),
            r.getString("receive_protocol"),r.getString("receive_host"),r.getInt("receive_port"),r.getString("receive_username"),
            r.getBoolean("mailing_enabled"),r.getBoolean("active"),!r.getString("smtp_secret").isEmpty(),r.getString("receive_secret")!=null,
            r.getString("smtp_status"),r.getString("receive_status"),instant(r,"smtp_checked_at"),instant(r,"receive_checked_at"),r.getLong("version"));
    }
    private Instant instant(ResultSet r,String column) throws SQLException {var value=r.getTimestamp(column);return value==null?null:value.toInstant();}
    private record ProbeMaterial(Account account,String password) {
        @Override public String toString(){return "ProbeMaterial[redacted]";}
    }
}
