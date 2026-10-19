package com.indice.erp.notifications;

import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Fair keyset traversal of active recipients. No business mutations run from a notification GET. */
@Component
class BasicNotificationDispatcher {
    private static final Logger log=LoggerFactory.getLogger(BasicNotificationDispatcher.class);
    private final JdbcTemplate db;
    private final BasicNotificationDelivery delivery;
    private final List<NotificationSignalSource> sources;
    private long cursor;
    BasicNotificationDispatcher(JdbcTemplate db,BasicNotificationDelivery delivery,List<NotificationSignalSource> sources) {
        this.db=db;this.delivery=delivery;this.sources=sources;
    }
    @Scheduled(initialDelayString="${app.notifications.basic.initial-delay-ms:15000}",fixedDelayString="${app.notifications.basic.delay-ms:30000}")
    synchronized void dispatch() {
        var recipients=db.query("""
            SELECT uc.id,uc.user_id,uc.company_id FROM user_companies uc JOIN companies c ON c.id=uc.company_id
            WHERE uc.id>? AND LOWER(uc.status)='active' AND c.platform_status='ACTIVE'
            ORDER BY uc.id LIMIT 50
            """,(rs,n)->new Recipient(rs.getLong(1),rs.getLong(2),rs.getLong(3)),cursor);
        for(var recipient:recipients) {
            for(var source:sources) try {delivery.deliver(recipient.user(),recipient.company(),source);}
            catch(RuntimeException failure) {log.warn("Basic notification delivery failed membership={} module={} errorType={}",recipient.id(),source.module(),failure.getClass().getSimpleName());}
            cursor=recipient.id();
        }
        if(recipients.size()<50) cursor=0;
    }
    private record Recipient(long id,long user,long company) { }
}
