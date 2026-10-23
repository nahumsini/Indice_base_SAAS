package com.indice.erp.sales.conversations.whatsapp;

import static com.indice.erp.sales.conversations.SalesConversationAccess.require;
import static org.springframework.http.HttpStatus.*;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.sales.conversations.*;
import java.security.SecureRandom;
import java.sql.Timestamp;
import java.time.*;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

/** Session-bound single-use state machine, exercised with fixtures. No real OAuth adapter is enabled. */
@Service
public class WhatsAppOnboardingService {
    public record Start(String id,String state,Instant expiresAt){@Override public String toString(){return "OnboardingStart[redacted]";}}
    public record Callback(String state,String code){@Override public String toString(){return "OnboardingCallback[redacted]";}}
    private record Attempt(String id,long version,String state,Instant expires){ }
    private final JdbcTemplate db;private final SalesConversationAccess access;private final SalesConversationRepository repository;
    private final WhatsAppOnboardingGateway gateway;private final WhatsAppCredentialCodec codec;private final WhatsAppProperties flags;
    private final TransactionTemplate tx;private final Clock clock;private final boolean enabled;private final SecureRandom random=new SecureRandom();
    public WhatsAppOnboardingService(JdbcTemplate db,SalesConversationAccess access,SalesConversationRepository repository,WhatsAppOnboardingGateway gateway,WhatsAppCredentialCodec codec,WhatsAppProperties flags,PlatformTransactionManager manager,Clock clock,@Value("${app.sales-conversations.onboarding-enabled:false}")boolean enabled){this.db=db;this.access=access;this.repository=repository;this.gateway=gateway;this.codec=codec;this.flags=flags;this.tx=new TransactionTemplate(manager);this.clock=clock;this.enabled=enabled;}
    private AuthSessionUser manager(AuthSessionUser actor,String connection){
        require(flags.enabled(),SERVICE_UNAVAILABLE,"conversations_disabled");var a=access.current(actor,true);access.manager(a);
        var c=repository.connection(a.companyId(),connection).orElseThrow(()->new ResponseStatusException(NOT_FOUND));
        require(access.scope(a).contains(new SalesConversationAccess.Scope(c.unitId(),c.businessId())),FORBIDDEN,"conversation_scope_denied");return a;
    }
    public Start start(AuthSessionUser actor,String connection,String sessionId){
        require(enabled&&gateway.configured()&&codec.available(),SERVICE_UNAVAILABLE,"whatsapp_onboarding_verification_pending");
        require(sessionId!=null&&!sessionId.isBlank(),FORBIDDEN,"whatsapp_session_required");
        return tx.execute(s->{var a=manager(actor,connection);repository.lock(a.companyId());var c=repository.connection(a.companyId(),connection).orElseThrow();
            require(Set.of("CONFIGURING","RECONNECT_REQUIRED","REVOKED","DEGRADED").contains(c.status()),CONFLICT,"whatsapp_connection_already_healthy");
            require(db.queryForObject("SELECT COUNT(*) FROM sales_wa_onboarding_sessions WHERE company_id=? AND connection_id=? AND state IN ('PENDING','VERIFYING') AND expires_at>CURRENT_TIMESTAMP(6)",Integer.class,a.companyId(),connection)<3,TOO_MANY_REQUESTS,"whatsapp_onboarding_rate");
            byte[] nonce=new byte[32];random.nextBytes(nonce);String state=Base64.getUrlEncoder().withoutPadding().encodeToString(nonce),id=UUID.randomUUID().toString();Instant expiry=clock.instant().plusSeconds(600);
            db.update("INSERT INTO sales_wa_onboarding_sessions(company_id,id,connection_id,actor_membership_id,session_hash,state_hash,connection_version,expires_at) VALUES(?,?,?,?,?,?,?,?)",a.companyId(),id,connection,a.userCompanyId(),SalesConversationService.hash(sessionId),SalesConversationService.hash(state),c.version(),Timestamp.from(expiry));
            repository.event(a.companyId(),connection,null,a.userCompanyId(),"ONBOARDING_STARTED",null,id);return new Start(id,state,expiry);
        });
    }
    public SalesConversationDtos.Connection complete(AuthSessionUser actor,String connection,String sessionId,Callback input){
        require(enabled&&gateway.configured()&&codec.available(),SERVICE_UNAVAILABLE,"whatsapp_onboarding_verification_pending");
        require(input!=null&&input.state()!=null&&input.state().matches("[A-Za-z0-9_-]{43}")&&input.code()!=null&&!input.code().isBlank()&&input.code().length()<=4096&&sessionId!=null,BAD_REQUEST,"whatsapp_onboarding_invalid");
        var a=tx.execute(s->manager(actor,connection));
        var attempt=tx.execute(s->{repository.lock(a.companyId());manager(a,connection);
            var rows=db.query("SELECT id,connection_version,state,expires_at FROM sales_wa_onboarding_sessions WHERE company_id=? AND connection_id=? AND actor_membership_id=? AND session_hash=? AND state_hash=? FOR UPDATE",(r,n)->new Attempt(r.getString(1),r.getLong(2),r.getString(3),r.getTimestamp(4).toInstant()),a.companyId(),connection,a.userCompanyId(),SalesConversationService.hash(sessionId),SalesConversationService.hash(input.state()));
            require(!rows.isEmpty(),FORBIDDEN,"whatsapp_onboarding_state_invalid");var row=rows.getFirst();require(row.state().equals("PENDING")&&row.expires().isAfter(clock.instant()),CONFLICT,"whatsapp_onboarding_expired_or_used");
            db.update("UPDATE sales_wa_onboarding_sessions SET state='VERIFYING' WHERE company_id=? AND id=?",a.companyId(),row.id());return row;
        });
        try{
            var assets=gateway.exchangeAndVerify(input.code());
            return tx.execute(s->{repository.lock(a.companyId());manager(a,connection);var c=repository.connection(a.companyId(),connection).orElseThrow();
                require(c.version()==attempt.version()&&attempt.expires().isAfter(clock.instant()),CONFLICT,"whatsapp_connection_changed");
                require(assets!=null&&flags.appId().equals(assets.appId())&&numeric(assets.portfolioId())&&numeric(assets.wabaId())&&numeric(assets.phoneId())&&assets.displayPhone()!=null&&assets.displayPhone().matches("\\+[1-9][0-9]{6,14}")&&assets.accessToken()!=null&&!assets.accessToken().isBlank(),UNPROCESSABLE_ENTITY,"whatsapp_verified_assets_invalid");
                var previous=db.queryForMap("SELECT phone_number_id,waba_id,app_id FROM sales_wa_connections WHERE company_id=? AND id=?",a.companyId(),connection);
                require(c.verifiedAt()==null||assets.phoneId().equals(previous.get("phone_number_id"))&&assets.wabaId().equals(previous.get("waba_id"))&&assets.appId().equals(previous.get("app_id")),CONFLICT,"whatsapp_number_replacement_not_supported");
                db.update("UPDATE sales_wa_connections SET app_id=?,portfolio_id=?,waba_id=?,phone_number_id=?,display_phone=?,credential_ciphertext=?,key_version=?,status='CONNECTED',reason_code=NULL,verified_at=CURRENT_TIMESTAMP(6),last_signal_at=CURRENT_TIMESTAMP(6),version=version+1 WHERE company_id=? AND id=? AND version=?",assets.appId(),assets.portfolioId(),assets.wabaId(),assets.phoneId(),assets.displayPhone(),codec.encrypt(a.companyId(),connection,"token",assets.accessToken().getBytes(java.nio.charset.StandardCharsets.UTF_8)),codec.activeVersion(),a.companyId(),connection,c.version());
                db.update("UPDATE sales_wa_onboarding_sessions SET state='CONNECTED',completed_at=CURRENT_TIMESTAMP(6) WHERE company_id=? AND id=? AND state='VERIFYING'",a.companyId(),attempt.id());
                repository.event(a.companyId(),connection,null,a.userCompanyId(),"CONNECTION_VERIFIED",null,attempt.id());return repository.connection(a.companyId(),connection).orElseThrow();
            });
        }catch(RuntimeException failure){tx.executeWithoutResult(s->{db.update("UPDATE sales_wa_onboarding_sessions SET state='FAILED',error_code='VERIFICATION_FAILED',completed_at=CURRENT_TIMESTAMP(6) WHERE company_id=? AND id=? AND state='VERIFYING'",a.companyId(),attempt.id());});throw new ResponseStatusException(BAD_GATEWAY,"whatsapp_onboarding_verification_failed");}
    }
    private boolean numeric(String value){return value!=null&&value.matches("[0-9]{1,80}");}
}
