package com.indice.erp.pos.settlement;

import org.springframework.jdbc.core.JdbcTemplate;

record TerminalRefundAdjustmentEventInsert(JdbcTemplate jdbc) {
    void insert(long company, String provider, String refund) {
        jdbc.update("""
            INSERT INTO pos_terminal_refund_adjustment_events
              (company_id,adjustment_id,event_key,event_type,to_state,reason)
            SELECT company_id,id,CONCAT('DETECTED:',provider_code,':',provider_refund_id),
              'PROVIDER_REFUND_CONFIRMED',state,CONCAT('Verified completed ',provider_code,' refund')
            FROM pos_terminal_refund_adjustments
            WHERE company_id=? AND provider_code=? AND provider_refund_id=?
            ON DUPLICATE KEY UPDATE id=pos_terminal_refund_adjustment_events.id
            """, company, provider, refund);
    }
}
