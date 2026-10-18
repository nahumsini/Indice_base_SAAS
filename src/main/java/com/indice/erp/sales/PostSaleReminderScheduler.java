package com.indice.erp.sales;

import java.util.concurrent.atomic.AtomicBoolean;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
class PostSaleReminderScheduler {
    private static final Logger LOG=LoggerFactory.getLogger(PostSaleReminderScheduler.class);
    private final JdbcTemplate db;
    private final PostSaleReminderService reminders;
    private final AtomicBoolean running=new AtomicBoolean();
    private long cursor;
    PostSaleReminderScheduler(JdbcTemplate db,PostSaleReminderService reminders){this.db=db;this.reminders=reminders;}
    @Scheduled(initialDelayString="${app.sales.post-sale-reminder-initial-delay-ms:30000}",fixedDelayString="${app.sales.post-sale-reminder-delay-ms:60000}")
    public void dispatch(){
        if(!running.compareAndSet(false,true))return;
        try{
            // Bounded cross-tenant discovery; the service revalidates tenant, current state and recipient.
            var rows=db.query("""
                SELECT company_id,id FROM sales_post_sale_work WHERE id>? AND next_action_date<=DATE_ADD(UTC_DATE(),INTERVAL 1 DAY)
                AND ((source_kind='won' AND stage_key<>'completed') OR (source_kind='lost' AND recovery_status='scheduled')) ORDER BY id LIMIT 100
                """,(rs,n)->new Candidate(rs.getLong(1),rs.getLong(2)),cursor);
            for(var row:rows){try{reminders.dispatch(row.company(),row.id());}catch(RuntimeException ex){LOG.warn("post_sale_reminder_retry companyId={} workId={} failureType={}",row.company(),row.id(),ex.getClass().getSimpleName());}cursor=row.id();}
            if(rows.size()<100)cursor=0;
        }finally{running.set(false);}
    }
    private record Candidate(long company,long id){}
}
