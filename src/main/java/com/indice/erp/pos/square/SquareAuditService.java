package com.indice.erp.pos.square;

import com.indice.erp.pos.PosContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
class SquareAuditService {

    private static final Logger log = LoggerFactory.getLogger(SquareAuditService.class);

    private final JdbcTemplate jdbcTemplate;

    SquareAuditService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    void record(PosContext context, String eventType, String status, String message) {
        record(context.companyId(), context.userId(), null, null, null, eventType, status, message);
    }

    void recordIntent(SquareRecords.PaymentIntent intent, String eventType, String status, String message) {
        record(intent.companyId(), intent.createdByUserId(), intent.cashRegisterId(), intent.terminalId(),
            intent.id(), eventType, status, message);
    }

    void recordTerminal(PosContext context, long terminalId, String eventType, String status, String message) {
        record(context.companyId(), context.userId(), null, terminalId, null, eventType, status, message);
    }

    private void record(Long companyId, Long userId, Long registerId, Long terminalId, Long intentId,
            String eventType, String status, String message) {
        try {
            jdbcTemplate.update("""
                INSERT INTO pos_square_audit_events
                  (company_id, actor_user_id, cash_register_id, terminal_id, intent_id,
                   event_type, status, message)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, companyId, userId, registerId, terminalId, intentId,
                truncate(eventType, 80), truncate(status, 32), truncate(message, 500));
        } catch (RuntimeException ex) {
            log.warn("Square audit event was not recorded: {}", eventType);
        }
    }

    private String truncate(String value, int max) {
        if (value == null) return null;
        var trimmed = value.trim();
        return trimmed.length() <= max ? trimmed : trimmed.substring(0, max);
    }
}
