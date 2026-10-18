package com.indice.erp.sales;

import java.util.concurrent.atomic.AtomicBoolean;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class OpportunityReminderScheduler {
    private static final Logger LOG = LoggerFactory.getLogger(OpportunityReminderScheduler.class);
    private final JdbcTemplate db;
    private final OpportunityReminderService reminders;
    private final AtomicBoolean running = new AtomicBoolean();
    private long cursor;

    public OpportunityReminderScheduler(JdbcTemplate db, OpportunityReminderService reminders) {
        this.db = db;
        this.reminders = reminders;
    }

    @Scheduled(initialDelayString="${app.sales.call-reminder-initial-delay-ms:30000}",
            fixedDelayString="${app.sales.call-reminder-delay-ms:60000}")
    public void dispatch() {
        if (!running.compareAndSet(false, true)) return;
        try {
            // Bounded cross-tenant discovery only; each candidate is revalidated in its own transaction.
            for (int batch = 0; batch < 10; batch++) {
                var rows = db.query("""
                        SELECT o.company_id,o.id FROM sales_opportunities o WHERE o.id>? AND (
                          (o.deleted_at IS NULL AND o.lifecycle_status='OPEN' AND o.next_action='call' AND (
                            o.next_action_scheduled_at BETWEEN UTC_TIMESTAMP() AND TIMESTAMPADD(HOUR,1,UTC_TIMESTAMP())
                            OR (o.next_action_scheduled_at IS NULL AND TIME(o.next_action_at)<>'00:00:00'
                                AND o.next_action_at BETWEEN TIMESTAMPADD(DAY,-1,UTC_TIMESTAMP()) AND TIMESTAMPADD(DAY,2,UTC_TIMESTAMP()))))
                          OR EXISTS(SELECT 1 FROM app_notifications n WHERE n.company_id=o.company_id
                            AND n.source_module='sales' AND n.source_type='opportunity' AND n.source_id=o.id
                            AND n.event_type='sales_call_reminder' AND n.status<>'cancelled'
                            AND (o.deleted_at IS NOT NULL OR o.lifecycle_status<>'OPEN' OR o.next_action<>'call'
                              OR o.status IN ('closed','on_hold') OR o.next_action_scheduled_at IS NULL
                              OR NOT (n.recipient_user_company_id <=> o.owner_user_company_id))))
                        ORDER BY o.id LIMIT 100
                        """, (rs, n) -> new Candidate(rs.getLong(1), rs.getLong(2)), cursor);
                for (var row : rows) {
                    try {
                        reminders.dispatch(row.company(), row.id());
                    } catch (RuntimeException failure) {
                        LOG.warn("sales_call_reminder_retry companyId={} opportunityId={} failureType={}",
                                row.company(), row.id(), failure.getClass().getSimpleName());
                    }
                    cursor = row.id();
                }
                if (rows.size() < 100) { cursor = 0; break; }
            }
        } finally {
            running.set(false);
        }
    }

    private record Candidate(long company, long id) { }
}
