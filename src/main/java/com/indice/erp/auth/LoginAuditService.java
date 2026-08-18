package com.indice.erp.auth;

import org.springframework.dao.DataAccessException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import java.sql.Timestamp;
import java.time.Instant;

@Service
public class LoginAuditService {

    private final JdbcTemplate jdbcTemplate;
    private final boolean enabled;

    @Autowired
    public LoginAuditService(JdbcTemplate jdbcTemplate) {
        this(jdbcTemplate, true);
    }

    private LoginAuditService(JdbcTemplate jdbcTemplate, boolean enabled) {
        this.jdbcTemplate = jdbcTemplate;
        this.enabled = enabled;
    }

    static LoginAuditService noop() {
        return new LoginAuditService(null, false);
    }

    public void record(
        String email,
        Long userId,
        Long companyId,
        String role,
        boolean success,
        String failureReason,
        LoginAuditContext context
    ) {
        record(LoginAuditEvent.builder()
            .eventType("LOGIN")
            .stage("PASSWORD")
            .outcome(success ? "SUCCESS" : "FAILURE")
            .emailNormalized(normalize(email))
            .userId(userId)
            .companyId(companyId)
            .role(role)
            .failureReasonCode(success ? null : normalizeReason(failureReason))
            .failureMessageSafe(success ? null : failureReason)
            .context(context)
            .build());
    }

    public void record(LoginAuditEvent event) {
        if (!enabled || jdbcTemplate == null) {
            return;
        }
        try {
            jdbcTemplate.update(
                """
                    INSERT INTO user_login_audit
                        (
                            event_type, stage, outcome, email, email_normalized, company_name_normalized,
                            user_id, company_id, user_company_id, role, success,
                            failure_reason, failure_reason_code, failure_message_safe,
                            ip_address, user_agent, session_id, request_id,
                            lockout_until, attempts_used
                        )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                clean(event.eventType(), 64, "LOGIN"),
                clean(event.stage(), 32, "PASSWORD"),
                clean(event.outcome(), 32, "FAILURE"),
                clean(event.emailNormalized(), 255),
                clean(event.emailNormalized(), 255),
                clean(event.companyNameNormalized(), 255),
                event.userId(),
                event.companyId(),
                event.userCompanyId(),
                clean(event.role(), 64),
                "SUCCESS".equals(event.outcome()) ? 1 : 0,
                clean(event.failureMessageSafe(), 255),
                clean(event.failureReasonCode(), 64),
                clean(event.failureMessageSafe(), 255),
                clean(event.ipAddress(), 64),
                clean(event.userAgent(), 512),
                clean(event.sessionId(), 128),
                clean(event.requestId(), 100),
                timestamp(event.lockoutUntil()),
                event.attemptsUsed()
            );
        } catch (DataAccessException ignored) {
            // Audit must never block login in older local schemas or test doubles.
        }
    }

    private String clean(String value, int maxLength) {
        var cleaned = value == null ? "" : value.replaceAll("[\\r\\n\\t]+", " ").trim();
        return cleaned.length() <= maxLength ? cleaned : cleaned.substring(0, maxLength);
    }

    private String clean(String value, int maxLength, String fallback) {
        var cleaned = clean(value, maxLength);
        return cleaned.isBlank() ? fallback : cleaned;
    }

    private String normalize(String value) {
        return clean(value, 255).toLowerCase();
    }

    private String normalizeReason(String value) {
        var cleaned = clean(value, 64).toUpperCase()
            .replaceAll("[^A-Z0-9]+", "_")
            .replaceAll("^_+|_+$", "");
        return cleaned.isBlank() ? "AUTHENTICATION_FAILED" : cleaned;
    }

    private Timestamp timestamp(Instant instant) {
        return instant == null ? null : Timestamp.from(instant);
    }
}
