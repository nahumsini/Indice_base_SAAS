package com.indice.erp.auth;

import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;

import java.sql.Timestamp;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;

@ExtendWith(MockitoExtension.class)
class LoginAuditServiceTest {

    @Mock
    private JdbcTemplate jdbcTemplate;

    @Test
    void recordsSuccessfulLoginAttempt() {
        var service = new LoginAuditService(jdbcTemplate);

        service.record(
            "demo@example.com",
            7L,
            3L,
            "admin",
            true,
            "",
            new LoginAuditContext("127.0.0.1", "JUnit", "session-1")
        );

        verify(jdbcTemplate).update(
            contains("INSERT INTO user_login_audit"),
            eq("LOGIN"),
            eq("PASSWORD"),
            eq("SUCCESS"),
            eq("demo@example.com"),
            eq("demo@example.com"),
            eq(""),
            eq(7L),
            eq(3L),
            isNull(),
            eq("admin"),
            eq(1),
            eq(""),
            eq(""),
            eq(""),
            eq("127.0.0.1"),
            eq("JUnit"),
            eq("session-1"),
            eq(""),
            isNull(),
            isNull()
        );
    }

    @Test
    void recordsStructuredSearchableLoginAuditEvent() {
        var service = new LoginAuditService(jdbcTemplate);
        var lockoutUntil = Instant.parse("2026-08-18T20:30:00Z");

        service.record(LoginAuditEvent.builder()
            .eventType("MFA_VERIFY")
            .stage("MFA")
            .outcome("BLOCKED")
            .emailNormalized("owner@example.com")
            .companyNameNormalized("acme workspace")
            .userId(17L)
            .companyId(23L)
            .userCompanyId(31L)
            .role("owner")
            .failureReasonCode(AuthFailureReason.MFA_OTP_LOCKED)
            .failureMessageSafe("Too many verification code attempts.")
            .context(new LoginAuditContext("203.0.113.10", "JUnit MFA", "session-2"))
            .requestId("request-1")
            .lockoutUntil(lockoutUntil)
            .attemptsUsed(5)
            .build());

        verify(jdbcTemplate).update(
            contains("INSERT INTO user_login_audit"),
            eq("MFA_VERIFY"),
            eq("MFA"),
            eq("BLOCKED"),
            eq("owner@example.com"),
            eq("owner@example.com"),
            eq("acme workspace"),
            eq(17L),
            eq(23L),
            eq(31L),
            eq("owner"),
            eq(0),
            eq("Too many verification code attempts."),
            eq(AuthFailureReason.MFA_OTP_LOCKED),
            eq("Too many verification code attempts."),
            eq("203.0.113.10"),
            eq("JUnit MFA"),
            eq("session-2"),
            eq("request-1"),
            eq(Timestamp.from(lockoutUntil)),
            eq(5)
        );
    }
}
