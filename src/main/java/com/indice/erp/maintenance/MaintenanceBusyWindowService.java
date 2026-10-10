package com.indice.erp.maintenance;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.Locale;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/** Boolean-only owner contract for a validated member identity; exposes no work-order data. */
@Service
public class MaintenanceBusyWindowService {
    private final JdbcTemplate jdbc;
    public MaintenanceBusyWindowService(JdbcTemplate jdbc){this.jdbc=jdbc;}
    public boolean busy(String email,Instant from,Instant to,Long excluded){
        String lock=TransactionSynchronizationManager.isActualTransactionActive()&&!TransactionSynchronizationManager.isCurrentTransactionReadOnly()?" FOR UPDATE":"";
        return !jdbc.query("SELECT o.id FROM maintenance_orders o JOIN users u ON u.id=o.assignee_id WHERE LOWER(u.email)=? AND o.status NOT IN ('CLOSED','CANCELLED') AND o.scheduled_start<? AND o.scheduled_end>? AND (? IS NULL OR o.id<>?)"+lock,(r,n)->r.getLong(1),email.toLowerCase(Locale.ROOT),Timestamp.from(to),Timestamp.from(from),excluded,excluded).isEmpty();
    }
}
