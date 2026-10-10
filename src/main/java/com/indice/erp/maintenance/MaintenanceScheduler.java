package com.indice.erp.maintenance;

import java.time.Instant;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class MaintenanceScheduler {
    private final JdbcTemplate jdbc;
    private final MaintenancePreventionService plans;
    private final MaintenanceNotificationService notifications;
    private long cursor;
    private long orderCursor;
    private static final org.slf4j.Logger LOG=org.slf4j.LoggerFactory.getLogger(MaintenanceScheduler.class);
    public MaintenanceScheduler(JdbcTemplate jdbc,MaintenancePreventionService plans,MaintenanceNotificationService notifications){this.jdbc=jdbc;this.plans=plans;this.notifications=notifications;}
    @Scheduled(fixedDelayString="${app.maintenance.worker-delay-ms:60000}",initialDelayString="${app.maintenance.worker-initial-delay-ms:60000}")
    public void tick(){
        var orders=jdbc.query("SELECT company_id,id FROM maintenance_orders WHERE id>? AND status NOT IN ('CLOSED','CANCELLED') ORDER BY id LIMIT 50",(r,n)->new long[]{r.getLong(1),r.getLong(2)},orderCursor);
        if(orders.isEmpty())orderCursor=0;
        for(var row:orders){orderCursor=row[1];try{notifications.dispatch(row[0],row[1],true);}catch(RuntimeException failure){LOG.warn("Maintenance notification failed: {} ({})",row[1],failure.getClass().getSimpleName());}}
        var rows=jdbc.query("SELECT company_id,id FROM maintenance_plans WHERE active=1 AND id>? AND next_date<=DATE_ADD(UTC_DATE(),INTERVAL 91 DAY) ORDER BY id LIMIT 20",(r,n)->new long[]{r.getLong(1),r.getLong(2)},cursor);
        if(rows.isEmpty()){cursor=0;return;}
        for(var row:rows){cursor=row[1];try{plans.generate(row[0],row[1],Instant.now());}catch(org.springframework.web.server.ResponseStatusException|SecurityException denied){LOG.debug("Maintenance plan unavailable: {}",row[1]);}catch(RuntimeException failure){LOG.warn("Maintenance plan processing failed: {} ({})",row[1],failure.getClass().getSimpleName());}}
    }
}
