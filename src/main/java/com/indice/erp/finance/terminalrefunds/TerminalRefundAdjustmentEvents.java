package com.indice.erp.finance.terminalrefunds;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class TerminalRefundAdjustmentEvents {
    private final JdbcTemplate jdbc;
    public TerminalRefundAdjustmentEvents(JdbcTemplate jdbc) { this.jdbc = jdbc; }
    void append(TerminalRefundAdjustment adjustment, String key, String type,
            String from, String to, long actor, String reason) {
        jdbc.update("""
            INSERT INTO pos_terminal_refund_adjustment_events
              (company_id,adjustment_id,event_key,event_type,from_state,to_state,actor_user_id,reason)
            VALUES (?,?,?,?,?,?,?,?)
            ON DUPLICATE KEY UPDATE id=pos_terminal_refund_adjustment_events.id
            """, adjustment.companyId(), adjustment.id(), key, type, from, to, actor, reason);
    }
}
