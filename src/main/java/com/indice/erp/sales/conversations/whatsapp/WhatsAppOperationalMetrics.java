package com.indice.erp.sales.conversations.whatsapp;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.sales.conversations.*;
import java.util.concurrent.atomic.LongAdder;
import org.slf4j.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

/** No provider IDs, phone numbers, message text or tenant labels in operational counters. */
@Service
public class WhatsAppOperationalMetrics {
    private static final Logger log=LoggerFactory.getLogger(WhatsAppOperationalMetrics.class);
    private final LongAdder invalidSignatures=new LongAdder();
    private final JdbcTemplate db;private final SalesConversationAccess access;private final WhatsAppProperties flags;
    public record Snapshot(long inboxBacklog,long inboxDead,long inboxRetries,long inboxLagSeconds,long outboxBacklog,long outboxLagSeconds,long unknown,long mediaRejected,long accessChanges,long notificationBacklog){ }
    public WhatsAppOperationalMetrics(JdbcTemplate db,SalesConversationAccess access,WhatsAppProperties flags){this.db=db;this.access=access;this.flags=flags;}
    public void invalidSignature(){invalidSignatures.increment();}
    public long invalidSignatureCount(){return invalidSignatures.sum();}
    public Snapshot forManager(AuthSessionUser actor,String connection){var a=access.current(actor,false);access.manager(a);
        var rows=db.query("SELECT unit_id,business_id FROM sales_wa_connections WHERE company_id=? AND id=?",(r,n)->new SalesConversationAccess.Scope(r.getObject(1,Long.class),r.getObject(2,Long.class)),a.companyId(),connection);
        SalesConversationAccess.require(!rows.isEmpty()&&access.scope(a).contains(rows.getFirst()),org.springframework.http.HttpStatus.NOT_FOUND,"whatsapp_connection_unavailable");
        return new Snapshot(number("SELECT COUNT(*) FROM sales_wa_inbox WHERE company_id=? AND connection_id=? AND state IN ('QUEUED','CLAIMED')",a.companyId(),connection),
            number("SELECT COUNT(*) FROM sales_wa_inbox WHERE company_id=? AND connection_id=? AND state='DEAD'",a.companyId(),connection),
            number("SELECT COALESCE(SUM(GREATEST(attempts-1,0)),0) FROM sales_wa_inbox WHERE company_id=? AND connection_id=?",a.companyId(),connection),
            number("SELECT COALESCE(GREATEST(0,TIMESTAMPDIFF(SECOND,MIN(received_at),CURRENT_TIMESTAMP(6))),0) FROM sales_wa_inbox WHERE company_id=? AND connection_id=? AND state IN ('QUEUED','CLAIMED')",a.companyId(),connection),
            number("SELECT COUNT(*) FROM sales_wa_outbox WHERE company_id=? AND connection_id=? AND state IN ('QUEUED','CLAIMED','SUBMITTING')",a.companyId(),connection),
            number("SELECT COALESCE(GREATEST(0,TIMESTAMPDIFF(SECOND,MIN(created_at),CURRENT_TIMESTAMP(6))),0) FROM sales_wa_outbox WHERE company_id=? AND connection_id=? AND state IN ('QUEUED','CLAIMED','SUBMITTING')",a.companyId(),connection),
            number("SELECT COUNT(*) FROM sales_wa_outbox WHERE company_id=? AND connection_id=? AND state='UNKNOWN'",a.companyId(),connection),
            number("SELECT COUNT(*) FROM sales_conversation_attachments a JOIN sales_conversations c ON c.company_id=a.company_id AND c.id=a.conversation_id WHERE a.company_id=? AND c.connection_id=? AND a.state='REJECTED'",a.companyId(),connection),
            number("SELECT COUNT(*) FROM sales_conversation_events WHERE company_id=? AND connection_id=? AND event_type IN ('MEMBER_REVOKED','MEMBER_ACCESS_LOST','MEMBER_GRANTED','MEMBER_ACCESS_BOOTSTRAPPED')",a.companyId(),connection),
            number("SELECT COUNT(*) FROM sales_conversation_notification_outbox n JOIN sales_conversation_events e ON e.company_id=n.company_id AND e.seq=n.event_seq WHERE n.company_id=? AND e.connection_id=? AND n.delivered_at IS NULL AND n.cancelled_at IS NULL",a.companyId(),connection));
    }
    private long number(String sql,long company,String connection){return db.queryForObject(sql,Long.class,company,connection);}
    @Scheduled(fixedDelayString="${app.sales-conversations.metrics-ms:60000}",initialDelayString="${app.sales-conversations.initial-delay-ms:30000}")
    public void report(){if(flags.ingressEnabled())log.info("whatsapp_ingress invalid_signature_total={}",invalidSignatures.sum());}
}
