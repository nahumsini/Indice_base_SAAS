package com.indice.erp.billing.signup;

import java.sql.Timestamp;
import java.time.Instant;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class BillingSignupEmailVerificationRepository {

    private final JdbcTemplate jdbcTemplate;

    public BillingSignupEmailVerificationRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public void create(NewVerification verification) {
        jdbcTemplate.update(
            """
                INSERT INTO billing_signup_email_verifications (
                    verification_reference, email_normalized, full_name, company_name,
                    otp_hash, destination_hint, status, attempt_count, max_attempts,
                    resend_count, last_sent_at, expires_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, 0, ?, ?)
                """,
            verification.reference(),
            verification.email(),
            verification.fullName(),
            verification.companyName(),
            verification.otpHash(),
            verification.destinationHint(),
            verification.status(),
            verification.maxAttempts(),
            timestamp(verification.sentAt()),
            timestamp(verification.expiresAt())
        );
    }

    public Challenge findForUpdate(String reference) {
        var rows = jdbcTemplate.query(
            """
                SELECT id, verification_reference, email_normalized, full_name, company_name,
                       otp_hash, destination_hint, status, attempt_count, max_attempts,
                       resend_count, last_sent_at, expires_at, verified_at, verified_expires_at, locked_at
                FROM billing_signup_email_verifications
                WHERE verification_reference = ?
                FOR UPDATE
                """,
            (rs, rowNum) -> new Challenge(
                rs.getLong("id"),
                rs.getString("verification_reference"),
                rs.getString("email_normalized"),
                rs.getString("full_name"),
                rs.getString("company_name"),
                rs.getString("otp_hash"),
                rs.getString("destination_hint"),
                rs.getString("status"),
                rs.getInt("attempt_count"),
                rs.getInt("max_attempts"),
                rs.getInt("resend_count"),
                instant(rs.getTimestamp("last_sent_at")),
                instant(rs.getTimestamp("expires_at")),
                instant(rs.getTimestamp("verified_at")),
                instant(rs.getTimestamp("verified_expires_at")),
                instant(rs.getTimestamp("locked_at"))
            ),
            reference
        );
        return rows.isEmpty() ? null : rows.getFirst();
    }

    public VerifiedEmailRow findVerification(String reference) {
        var rows = jdbcTemplate.query(
            """
                SELECT email_normalized, status, verified_at, verified_expires_at
                FROM billing_signup_email_verifications
                WHERE verification_reference = ?
                """,
            (rs, rowNum) -> new VerifiedEmailRow(
                rs.getString("email_normalized"),
                rs.getString("status"),
                instant(rs.getTimestamp("verified_at")),
                instant(rs.getTimestamp("verified_expires_at"))
            ),
            reference
        );
        return rows.isEmpty() ? null : rows.getFirst();
    }

    public int existingUserCount(String email) {
        var count = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM users WHERE LOWER(email) = LOWER(?)",
            Integer.class,
            email
        );
        return count == null ? 0 : count;
    }

    public int sentCountSince(String email, Instant since) {
        var count = jdbcTemplate.queryForObject(
            """
                SELECT COUNT(*)
                FROM billing_signup_email_verifications
                WHERE email_normalized = ?
                  AND last_sent_at >= ?
                """,
            Integer.class,
            email,
            timestamp(since)
        );
        return count == null ? 0 : count;
    }

    public void markEmailSent(String reference, Instant sentAt) {
        jdbcTemplate.update(
            "UPDATE billing_signup_email_verifications SET email_sent_at = ? WHERE verification_reference = ?",
            timestamp(sentAt),
            reference
        );
    }

    public void markEmailFailure(String reference, String status, String message) {
        jdbcTemplate.update(
            """
                UPDATE billing_signup_email_verifications
                SET status = ?, email_failure_message = ?
                WHERE verification_reference = ?
                """,
            status,
            truncate(message, 255),
            reference
        );
    }

    public void resetForResend(long id, String otpHash, Instant expiresAt, Instant sentAt, String status) {
        jdbcTemplate.update(
            """
                UPDATE billing_signup_email_verifications
                SET otp_hash = ?, expires_at = ?, last_sent_at = ?, resend_count = resend_count + 1,
                    attempt_count = 0, status = ?, email_failure_message = NULL
                WHERE id = ?
                """,
            otpHash,
            timestamp(expiresAt),
            timestamp(sentAt),
            status,
            id
        );
    }

    public void markExpired(long id, String status) {
        jdbcTemplate.update("UPDATE billing_signup_email_verifications SET status = ? WHERE id = ?", status, id);
    }

    public void markLocked(long id, int attemptCount, String status, Instant lockedAt) {
        jdbcTemplate.update(
            "UPDATE billing_signup_email_verifications SET attempt_count = ?, status = ?, locked_at = ? WHERE id = ?",
            attemptCount,
            status,
            timestamp(lockedAt),
            id
        );
    }

    public void updateAttemptCount(long id, int attemptCount) {
        jdbcTemplate.update("UPDATE billing_signup_email_verifications SET attempt_count = ? WHERE id = ?", attemptCount, id);
    }

    public void markVerified(long id, String status, Instant verifiedAt, Instant verifiedExpiresAt, int attemptCount) {
        jdbcTemplate.update(
            """
                UPDATE billing_signup_email_verifications
                SET status = ?, verified_at = ?, verified_expires_at = ?, attempt_count = ?
                WHERE id = ?
                """,
            status,
            timestamp(verifiedAt),
            timestamp(verifiedExpiresAt),
            attemptCount,
            id
        );
    }

    private String truncate(String value, int maxLength) {
        if (value == null) {
            return null;
        }
        return value.length() <= maxLength ? value : value.substring(0, maxLength);
    }

    private Instant instant(Timestamp timestamp) {
        return timestamp == null ? null : timestamp.toInstant();
    }

    private Timestamp timestamp(Instant instant) {
        return instant == null ? null : Timestamp.from(instant);
    }

    public record NewVerification(
        String reference,
        String email,
        String fullName,
        String companyName,
        String otpHash,
        String destinationHint,
        String status,
        int maxAttempts,
        Instant sentAt,
        Instant expiresAt
    ) {
    }

    public record Challenge(
        long id,
        String reference,
        String email,
        String fullName,
        String companyName,
        String otpHash,
        String destinationHint,
        String status,
        int attemptCount,
        int maxAttempts,
        int resendCount,
        Instant lastSentAt,
        Instant expiresAt,
        Instant verifiedAt,
        Instant verifiedExpiresAt,
        Instant lockedAt
    ) {
    }

    public record VerifiedEmailRow(String email, String status, Instant verifiedAt, Instant verifiedExpiresAt) {
    }
}
