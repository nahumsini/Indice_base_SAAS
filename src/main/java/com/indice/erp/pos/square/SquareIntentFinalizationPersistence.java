package com.indice.erp.pos.square;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
class SquareIntentFinalizationPersistence {
    private final JdbcTemplate jdbc;
    SquareIntentFinalizationPersistence(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }
    boolean finalized(long id, long ticket) {
        return jdbc.update("""
            UPDATE pos_square_terminal_payment_intents SET status = 'APPROVED', pos_ticket_id = ?,
                completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND status = 'APPROVED' AND pos_ticket_id IS NULL
            """, ticket, id) > 0;
    }
    void attempted(long id) {
        jdbc.update("UPDATE pos_square_terminal_payment_intents SET finalize_attempts = finalize_attempts + 1, "
            + "updated_at = CURRENT_TIMESTAMP WHERE id = ?", id);
    }
    void failed(long id, String message) {
        jdbc.update("""
            UPDATE pos_square_terminal_payment_intents SET failure_code = 'INDICE_FINALIZE_FAILED',
                failure_message = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND pos_ticket_id IS NULL
            """, message == null || message.length() <= 500 ? message : message.substring(0, 500), id);
    }
}
