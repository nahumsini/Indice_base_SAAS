package com.indice.erp.sales.conversations.whatsapp;

import static com.indice.erp.sales.conversations.SalesConversationAccess.require;
import static org.springframework.http.HttpStatus.*;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.sales.conversations.*;
import jakarta.validation.constraints.*;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/** Local operational controls never imply that a provider-side token was revoked. */
@Service
public class WhatsAppConnectionOperations {
    public record Control(@NotBlank String requestKey,@Positive long version,@NotBlank @Pattern(regexp="SUSPEND|DISCONNECT|REDRIVE")String action,String inboxId) { }
    private final JdbcTemplate db;private final SalesConversationAccess access;private final SalesConversationRepository repository;
    private final SalesConversationAccessReconciler reconciler;private final WhatsAppProperties flags;
    public WhatsAppConnectionOperations(JdbcTemplate db,SalesConversationAccess access,SalesConversationRepository repository,SalesConversationAccessReconciler reconciler,WhatsAppProperties flags){this.db=db;this.access=access;this.repository=repository;this.reconciler=reconciler;this.flags=flags;}
    @Transactional
    public SalesConversationDtos.Connection control(AuthSessionUser actor,String id,Control input){
        require(flags.enabled(),SERVICE_UNAVAILABLE,"conversations_disabled");SalesConversationService.uuid(input.requestKey());
        var a=access.current(actor,true);access.manager(a);repository.lock(a.companyId());
        var c=repository.connection(a.companyId(),id).orElseThrow(()->new ResponseStatusException(NOT_FOUND));
        require(access.scope(a).contains(new SalesConversationAccess.Scope(c.unitId(),c.businessId())),FORBIDDEN,"conversation_scope_denied");
        String fingerprint=SalesConversationService.hash(repository.encode(List.of(id,input)));
        var replay=repository.receipt(a.companyId(),a.userCompanyId(),input.requestKey(),fingerprint);
        if(replay.isPresent())return c;
        require(c.version()==input.version(),CONFLICT,"whatsapp_connection_changed");
        switch(input.action()){
            case "REDRIVE"->{
                SalesConversationService.uuid(input.inboxId());
                int changed=db.update("UPDATE sales_wa_inbox SET state='QUEUED',attempts=0,fence=fence+1,next_attempt_at=CURRENT_TIMESTAMP(6),lease_until=NULL,error_code=NULL WHERE company_id=? AND connection_id=? AND id=? AND state='DEAD'",a.companyId(),id,input.inboxId());
                require(changed==1,CONFLICT,"whatsapp_redrive_unavailable");
            }
            case "SUSPEND","DISCONNECT"->{
                boolean revoke=input.action().equals("DISCONNECT");
                db.update("UPDATE sales_wa_connections SET status=?,reason_code=?,credential_ciphertext=IF(?,NULL,credential_ciphertext),key_version=IF(?,NULL,key_version),version=version+1 WHERE company_id=? AND id=?",revoke?"REVOKED":"RECONNECT_REQUIRED",revoke?"LOCALLY_DISCONNECTED":"OPERATOR_SUSPENDED",revoke,revoke,a.companyId(),id);
                if(revoke){db.update("UPDATE sales_wa_members SET active=0,capabilities=JSON_ARRAY(),version=version+1 WHERE company_id=? AND connection_id=? AND active=1",a.companyId(),id);reconciler.reconcile(a.companyId(),id);}
                // Cancel only unstarted attempts. Started calls retain their external evidence path.
                for(var row:db.query("SELECT m.id,m.conversation_id FROM sales_wa_outbox o JOIN sales_conversation_messages m ON m.company_id=o.company_id AND m.id=o.message_id WHERE o.company_id=? AND o.connection_id=? AND o.state IN ('QUEUED','CLAIMED')",(r,n)->Map.entry(r.getString(1),r.getString(2)),a.companyId(),id)){
                    db.update("UPDATE sales_wa_outbox SET state='CANCELLED',fence=fence+1,error_code='CONNECTION_STOPPED' WHERE company_id=? AND message_id=? AND state IN ('QUEUED','CLAIMED')",a.companyId(),row.getKey());
                    long seq=repository.event(a.companyId(),id,row.getValue(),a.userCompanyId(),"MESSAGE_CANCELLED",null,input.requestKey());
                    db.update("UPDATE sales_conversation_messages SET dispatch_state='CANCELLED',error_code='CONNECTION_STOPPED',change_seq=? WHERE company_id=? AND id=?",seq,a.companyId(),row.getKey());
                }
            }
            default->throw new ResponseStatusException(BAD_REQUEST,"whatsapp_control_invalid");
        }
        repository.event(a.companyId(),id,null,a.userCompanyId(),"CONNECTION_"+input.action(),null,input.requestKey());
        repository.connectionReceipt(a.companyId(),a.userCompanyId(),input.requestKey(),id,fingerprint,new SalesConversationDtos.Receipt(id,c.version(),input.action()));
        return repository.connection(a.companyId(),id).orElseThrow();
    }
}
