package com.indice.erp.sales.conversations;

import static com.indice.erp.sales.conversations.SalesConversationDtos.*;
import com.indice.erp.auth.*;
import com.indice.erp.notifications.*;
import com.indice.erp.sales.conversations.whatsapp.WhatsAppProperties;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/** Durable owner notification intents, generic previews and current conversation visibility. */
@Service
public class SalesConversationNotificationSource implements NotificationSignalSource {
    private final JdbcTemplate db;private final SalesConversationAccess access;private final SalesConversationRepository repository;
    private final SessionAuthService auth;private final AppNotificationService notifications;private final WhatsAppProperties flags;private final TransactionTemplate tx;
    public SalesConversationNotificationSource(JdbcTemplate db,SalesConversationAccess access,SalesConversationRepository repository,SessionAuthService auth,AppNotificationService notifications,WhatsAppProperties flags,PlatformTransactionManager manager){this.db=db;this.access=access;this.repository=repository;this.auth=auth;this.notifications=notifications;this.flags=flags;this.tx=new TransactionTemplate(manager);}
    public String module(){return "sales";}
    public boolean supports(String type){return "sales_conversation_activity".equals(type);}
    public boolean canConfigure(AuthSessionUser a,String event){if(!flags.enabled()||!supports(event))return false;try{var current=access.current(a,false);var c=repository.connection(a.companyId());return c.isPresent()&&!access.capabilities(current,c.get().id()).isEmpty();}catch(RuntimeException denied){return false;}}
    public List<Signal> current(AuthSessionUser a){return List.of();} // Dedicated durable intents, not a recurring snapshot that can miss events.
    public boolean visible(AuthSessionUser actor,String type,long seq,String event){if(!supports(type)||!canConfigure(actor,event))return false;
        var rows=db.query("SELECT e.conversation_id FROM sales_conversation_events e LEFT JOIN sales_conversation_reads r ON r.company_id=e.company_id AND r.conversation_id=e.conversation_id AND r.membership_id=? WHERE e.company_id=? AND e.seq=? AND e.seq>COALESCE(r.read_seq,0) AND NOT EXISTS(SELECT 1 FROM sales_conversation_events resolved WHERE resolved.company_id=e.company_id AND resolved.conversation_id=e.conversation_id AND resolved.event_type='RESOLVE' AND resolved.seq>e.seq)",(r,n)->r.getString(1),actor.userCompanyId(),actor.companyId(),seq);
        if(rows.isEmpty()||rows.getFirst()==null||db.queryForObject("SELECT COUNT(*) FROM sales_conversation_notification_outbox WHERE company_id=? AND event_seq=? AND recipient_membership_id=?",Integer.class,actor.companyId(),seq,actor.userCompanyId())!=1)return false;try{var a=access.current(actor,false);var c=repository.find(a.companyId(),rows.getFirst()).orElseThrow();access.read(a,c);return c.status().equals("OPEN");}catch(RuntimeException denied){return false;}
    }
    /** Invoked inside the message/assignment transaction, after its event is durable in that transaction. */
    public void enqueue(long company,String conversation,long seq){
        var c=repository.find(company,conversation).orElseThrow();for(var member:repository.members(company,c.connectionId())){
            if(!member.active())continue;try{var user=repository.activeMember(company,member.membershipId()).flatMap(id->auth.scheduledActor(id,company)).orElseThrow();var caps=access.read(user,c);
                boolean owner=Objects.equals(c.assigneeMembershipId(),member.membershipId());boolean unassigned=c.assigneeMembershipId()==null&&caps.contains(Capability.TAKE);
                if(owner||unassigned||caps.contains(Capability.READ_ALL))db.update("INSERT IGNORE INTO sales_conversation_notification_outbox(company_id,event_seq,recipient_membership_id) VALUES(?,?,?)",company,seq,member.membershipId());
            }catch(org.springframework.web.server.ResponseStatusException|NoSuchElementException denied){/* No authority, no notice. */}
        }
    }
    @Scheduled(fixedDelayString="${app.sales-conversations.notification-ms:5000}",initialDelayString="${app.sales-conversations.initial-delay-ms:30000}")
    public void poll(){if(flags.workerEnabled()&&flags.enabled())deliverPending();}
    public void deliverPending(){for(var item:db.query("SELECT company_id,event_seq,recipient_membership_id FROM sales_conversation_notification_outbox WHERE delivered_at IS NULL AND cancelled_at IS NULL AND next_attempt_at<=CURRENT_TIMESTAMP(6) ORDER BY event_seq,recipient_membership_id LIMIT 50",(r,n)->new long[]{r.getLong(1),r.getLong(2),r.getLong(3)})){
        try{tx.executeWithoutResult(s->{repository.lock(item[0]);var actors=repository.activeMember(item[0],item[2]).flatMap(user->auth.scheduledActor(user,item[0]));
            if(actors.isEmpty()||!visible(actors.get(),"sales_conversation_activity",item[1],"sales_conversation_activity")){db.update("UPDATE sales_conversation_notification_outbox SET cancelled_at=CURRENT_TIMESTAMP(6) WHERE company_id=? AND event_seq=? AND recipient_membership_id=?",item[0],item[1],item[2]);return;}
            String conversation=db.queryForObject("SELECT conversation_id FROM sales_conversation_events WHERE company_id=? AND seq=?",String.class,item[0],item[1]);
            notifications.publishOnce(new AppNotificationEvent(item[0],item[2],"sales","sales_conversation_activity",item[1],"sales_conversation_activity","wa-activity:"+item[1]+":"+item[2],"WhatsApp conversation activity","","/sales/conversations?conversation="+conversation));
            db.update("UPDATE sales_conversation_notification_outbox SET delivered_at=CURRENT_TIMESTAMP(6),error_code=NULL WHERE company_id=? AND event_seq=? AND recipient_membership_id=?",item[0],item[1],item[2]);
        });}catch(RuntimeException retry){tx.executeWithoutResult(s->db.update("UPDATE sales_conversation_notification_outbox SET attempts=attempts+1,error_code='DELIVERY_DEFERRED',next_attempt_at=TIMESTAMPADD(SECOND,LEAST(3600,POW(2,LEAST(attempts+1,10))*5),CURRENT_TIMESTAMP(6)) WHERE company_id=? AND event_seq=? AND recipient_membership_id=? AND delivered_at IS NULL",item[0],item[1],item[2]));}
    }}
}
