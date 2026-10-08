package com.indice.erp.billing.signup;

import java.sql.Timestamp;
import java.time.Instant;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class PublicTrialEntryRepository {
    private final JdbcTemplate jdbc;

    public PublicTrialEntryRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public Entry lockByRequest(String keyHash) { return find("request_idempotency_hash", keyHash); }
    public Entry lockByReference(String referenceHash) { return find("reference_hash", referenceHash); }

    private Entry find(String column, String value) {
        // Column comes only from the two fixed owner methods above, never from request input.
        var rows = jdbc.query("""
            SELECT id, lead_id, country_code, browser_session_hash, request_fingerprint,
                   signup_intent_id, company_id, continuation_expires_at, trial_starts_at, trial_ends_at
            FROM billing_trial_entries WHERE %s = ? FOR UPDATE
            """.formatted(column), (rs, n) -> new Entry(rs.getLong("id"), rs.getLong("lead_id"),
            rs.getString("country_code"), rs.getString("browser_session_hash"), rs.getString("request_fingerprint"),
            rs.getObject("signup_intent_id", Long.class), rs.getObject("company_id", Long.class),
            instant(rs.getTimestamp("continuation_expires_at")), instant(rs.getTimestamp("trial_starts_at")),
            instant(rs.getTimestamp("trial_ends_at"))), value);
        return rows.isEmpty() ? null : rows.getFirst();
    }

    public void insert(String referenceHash, String sessionHash, String keyHash, String fingerprint,
                       long leadId, String countryCode, Instant expiresAt) {
        jdbc.update("""
            INSERT INTO billing_trial_entries (reference_hash, browser_session_hash,
                request_idempotency_hash, request_fingerprint, lead_id, country_code, continuation_expires_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """, referenceHash, sessionHash, keyHash, fingerprint, leadId, countryCode, Timestamp.from(expiresAt));
    }

    public void bindIntent(long id, String sessionHash, long intentId) {
        jdbc.update("""
            UPDATE billing_trial_entries SET signup_intent_id = ?
            WHERE id = ? AND browser_session_hash = ? AND status = 'LEAD_CAPTURED'
              AND (signup_intent_id IS NULL OR signup_intent_id = ?)
            """, intentId, id, sessionHash, intentId);
    }

    public void activate(long id, String sessionHash, long intentId, long companyId, Instant startsAt, Instant endsAt) {
        var updated = jdbc.update("""
            UPDATE billing_trial_entries SET signup_intent_id = ?, company_id = ?, status = 'ACTIVE',
                trial_starts_at = ?, trial_ends_at = ?, trial_terms_version = 'NO_CARD_15D_NO_CHARGE_V1',
                trial_terms_accepted_at = ?
            WHERE id = ? AND browser_session_hash = ? AND status = 'LEAD_CAPTURED'
            """, intentId, companyId, Timestamp.from(startsAt), Timestamp.from(endsAt), Timestamp.from(startsAt), id, sessionHash);
        if (updated != 1) throw new BillingSignupConflictException("Trial entry changed. Please reload.");
    }

    private static Instant instant(Timestamp value) { return value == null ? null : value.toInstant(); }

    public record Entry(long id, long leadId, String countryCode, String sessionHash, String fingerprint,
                        Long signupIntentId, Long companyId, Instant expiresAt, Instant startsAt, Instant endsAt) { }
}
