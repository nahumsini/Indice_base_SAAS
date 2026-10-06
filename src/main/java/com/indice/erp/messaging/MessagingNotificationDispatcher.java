package com.indice.erp.messaging;

import com.indice.erp.notifications.AppNotificationEvent;
import com.indice.erp.notifications.AppNotificationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.PlatformTransactionManager;

@Component
public class MessagingNotificationDispatcher {
    private static final Logger log=LoggerFactory.getLogger(MessagingNotificationDispatcher.class);
    private final JdbcTemplate jdbc;
    private final AppNotificationService notifications;
    private final TransactionTemplate tx;
    public MessagingNotificationDispatcher(JdbcTemplate jdbc,AppNotificationService notifications,PlatformTransactionManager manager) {
        this.jdbc=jdbc; this.notifications=notifications; this.tx=new TransactionTemplate(manager);
    }
    @Scheduled(fixedDelayString="${app.messaging.notification-delay-ms:10000}",initialDelayString="${app.messaging.notification-initial-delay-ms:30000}")
    public void dispatch() {
        var ids=jdbc.queryForList("SELECT id FROM messaging_notification_outbox WHERE delivered_at IS NULL AND available_at <= CURRENT_TIMESTAMP(6) ORDER BY id LIMIT 50",Long.class);
        for(var id:ids) dispatchOne(id);
    }
    void dispatchOne(long id) {
            try {
                tx.executeWithoutResult(status -> {
                    var rows=jdbc.query("""
                        SELECT o.*,m.conversation_id FROM messaging_notification_outbox o JOIN messaging_messages m ON m.id=o.message_id
                        WHERE o.id=? AND o.delivered_at IS NULL AND o.available_at <= CURRENT_TIMESTAMP(6) FOR UPDATE SKIP LOCKED
                        """,(r,n)->new Pending(r.getLong("message_id"),r.getLong("company_id"),r.getLong("recipient_membership_id"),r.getLong("conversation_id")),id);
                    if(rows.isEmpty()) return;
                    var p=rows.getFirst();
                    var active=jdbc.queryForObject("SELECT COUNT(*) FROM user_companies WHERE id=? AND company_id=? AND LOWER(status)='active'",Integer.class,p.membershipId(),p.companyId());
                    if(active!=null && active==1) notifications.publish(new AppNotificationEvent(p.companyId(),p.membershipId(),"messaging","conversation",p.conversationId(),
                        "new_message","messaging:"+p.messageId()+":"+p.membershipId(),"Messages","","/dashboard?conversation="+p.conversationId()));
                    jdbc.update("UPDATE messaging_notification_outbox SET delivered_at=CURRENT_TIMESTAMP(6) WHERE id=?",id);
                });
            } catch(RuntimeException error) {
                jdbc.update("UPDATE messaging_notification_outbox SET attempts=attempts+1,available_at=TIMESTAMPADD(SECOND,LEAST(3600,10*POW(2,LEAST(attempts,8))),CURRENT_TIMESTAMP) WHERE id=? AND delivered_at IS NULL",id);
                log.warn("Messaging notification {} will retry ({})",id,error.getClass().getSimpleName());
            }
    }
    private record Pending(long messageId,long companyId,long membershipId,long conversationId) { }
}
