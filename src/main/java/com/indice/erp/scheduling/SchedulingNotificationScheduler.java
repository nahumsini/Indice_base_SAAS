package com.indice.erp.scheduling;

import java.util.concurrent.atomic.AtomicBoolean;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class SchedulingNotificationScheduler {
    private static final Logger LOG=LoggerFactory.getLogger(SchedulingNotificationScheduler.class);
    private final JdbcTemplate db;private final SchedulingNotificationService notifications;
    private final AtomicBoolean running=new AtomicBoolean();private long cursor;
    public SchedulingNotificationScheduler(JdbcTemplate db,SchedulingNotificationService notifications){this.db=db;this.notifications=notifications;}
    @Scheduled(initialDelayString="${app.scheduling.reminder-initial-delay-ms:60000}",fixedDelayString="${app.scheduling.reminder-delay-ms:60000}")
    public void dispatch(){
        if(!running.compareAndSet(false,true))return;
        try{
            var rows=db.query("SELECT company_id,id FROM scheduling_reservations WHERE id>? AND status='CONFIRMED' AND archived_at IS NULL AND start_at>UTC_TIMESTAMP(6) AND start_at<=TIMESTAMPADD(DAY,1,UTC_TIMESTAMP(6)) ORDER BY id LIMIT 100",
                (r,n)->new Candidate(r.getLong(1),r.getLong(2)),cursor);
            for(var row:rows){try{notifications.dispatch(row.company(),row.id(),false);}catch(RuntimeException failure){LOG.warn("scheduling_notification_retry companyId={} reservationId={} failureType={}",row.company(),row.id(),failure.getClass().getSimpleName());}cursor=row.id();}
            if(rows.size()<100)cursor=0;
        }finally{running.set(false);}
    }
    private record Candidate(long company,long id) { }
}
