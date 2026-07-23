package com.indice.erp.billing.audit;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.Timestamp;
import java.time.Clock;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
class BillingPaymentAuditRepository {

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;
    private final Clock clock;

    BillingPaymentAuditRepository(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper, Clock clock) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
        this.clock = clock;
    }

    void insert(BillingPaymentAuditEvent event) {
        jdbcTemplate.update(
            """
                INSERT INTO billing_payment_audit_events
                    (company_id, user_id, user_company_id, signup_intent_id, stripe_customer_id,
                     stripe_subscription_id, stripe_checkout_session_id, stripe_invoice_id,
                     stripe_payment_intent_id, stripe_event_id, event_type, status, source,
                     amount_cents, currency, failure_code, failure_message, ip_address, user_agent,
                     metadata_json, occurred_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
            event.companyId(),
            event.userId(),
            event.userCompanyId(),
            event.signupIntentId(),
            clean(event.stripeCustomerId(), 255),
            clean(event.stripeSubscriptionId(), 255),
            clean(event.stripeCheckoutSessionId(), 255),
            clean(event.stripeInvoiceId(), 255),
            clean(event.stripePaymentIntentId(), 255),
            clean(event.stripeEventId(), 255),
            clean(event.eventType(), 120),
            clean(event.status(), 40),
            clean(event.source(), 40),
            event.amountCents(),
            clean(event.currency(), 3),
            clean(event.failureCode(), 120),
            clean(event.failureMessage(), 500),
            clean(event.ipAddress(), 64),
            clean(event.userAgent(), 512),
            metadata(event),
            Timestamp.from(event.occurredAt() == null ? clock.instant() : event.occurredAt())
        );
    }

    private String metadata(BillingPaymentAuditEvent event) {
        try {
            return event.metadata() == null || event.metadata().isEmpty()
                ? null
                : objectMapper.writeValueAsString(event.metadata());
        } catch (JsonProcessingException ex) {
            return "{\"serialization\":\"failed\"}";
        }
    }

    private String clean(String value, int max) {
        var cleaned = value == null ? "" : value.replaceAll("[\\r\\n\\t]+", " ").trim();
        if (cleaned.isBlank()) {
            return null;
        }
        return cleaned.length() > max ? cleaned.substring(0, max) : cleaned;
    }
}
