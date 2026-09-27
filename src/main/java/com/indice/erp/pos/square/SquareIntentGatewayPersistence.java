package com.indice.erp.pos.square;
import java.sql.Timestamp;
import java.time.Instant;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
class SquareIntentGatewayPersistence {
    private final JdbcTemplate jdbc;
    SquareIntentGatewayPersistence(JdbcTemplate jdbc) { this.jdbc = jdbc; }
    boolean submitting(long id, String request) {
        return jdbc.update("""
            UPDATE pos_square_terminal_payment_intents SET submission_started_at=CURRENT_TIMESTAMP(6),
              submission_attempts=submission_attempts+1,square_request_json=CAST(? AS JSON),updated_at=CURRENT_TIMESTAMP
            WHERE id=? AND status='WAITING' AND pos_ticket_id IS NULL AND submission_started_at IS NULL
            """, request, id) == 1;
    }
    boolean retrying(long id, Instant staleBefore) {
        return jdbc.update("""
            UPDATE pos_square_terminal_payment_intents SET submission_started_at=CURRENT_TIMESTAMP(6),
              submission_attempts=submission_attempts+1,updated_at=CURRENT_TIMESTAMP
            WHERE id=? AND status='WAITING' AND pos_ticket_id IS NULL AND square_checkout_id IS NULL
              AND submission_started_at<=?
            """, id, Timestamp.from(staleBefore)) == 1;
    }
    void created(long id, String checkoutId, String request, String response) {
        jdbc.update("""
            UPDATE pos_square_terminal_payment_intents
            SET square_checkout_id = ?, square_request_json = COALESCE(square_request_json, CAST(? AS JSON)),
              square_response_json = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND status IN ('WAITING', 'UNCERTAIN') AND pos_ticket_id IS NULL
            """, checkoutId, request, response, id);
    }
    void status(long id, SquareRecords.GatewayStatus status) {
        jdbc.update("""
            UPDATE pos_square_terminal_payment_intents
            SET status = CASE WHEN status IN ('APPROVED','PARTIALLY_REFUNDED','REFUNDED')
                  OR pos_ticket_id IS NOT NULL THEN status ELSE ? END,
                square_payment_id = COALESCE(square_payment_id, ?), square_response_json = COALESCE(?, square_response_json),
                failure_code = ?, failure_message = ?,
                completed_at = CASE WHEN ? IN ('APPROVED', 'DECLINED', 'CANCELLED') THEN CURRENT_TIMESTAMP ELSE completed_at END,
                updated_at = CURRENT_TIMESTAMP WHERE id = ?
            """, status.status().name(), blank(status.squarePaymentId()), status.rawJson(), blank(status.failureCode()),
            blank(status.failureMessage()), status.status().name(), id);
    }
    private String blank(String value) {
        return value == null || value.isBlank() ? null : value;
    }
}
