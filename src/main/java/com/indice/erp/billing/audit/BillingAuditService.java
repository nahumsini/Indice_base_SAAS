package com.indice.erp.billing.audit;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import org.slf4j.MDC;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class BillingAuditService {

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    public BillingAuditService(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }

    public void record(
        String category,
        String action,
        String outcome,
        String idempotencyKeyHash,
        String stripeEventId,
        String stripeObjectId,
        Long companyId,
        Long signupIntentId,
        Map<String, ?> detail
    ) {
        jdbcTemplate.update(
            """
                INSERT INTO billing_audit_events (
                    event_category, action_code, outcome, request_id,
                    idempotency_key_hash, stripe_event_id, stripe_object_id,
                    company_id, signup_intent_id, detail_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON))
                """,
            category,
            action,
            outcome,
            blankToNull(MDC.get("requestId")),
            blankToNull(idempotencyKeyHash),
            blankToNull(stripeEventId),
            blankToNull(stripeObjectId),
            companyId,
            signupIntentId,
            json(detail)
        );
    }

    private String json(Map<String, ?> detail) {
        try {
            return objectMapper.writeValueAsString(detail == null ? Map.of() : detail);
        } catch (JsonProcessingException exception) {
            return "{}";
        }
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }
}
