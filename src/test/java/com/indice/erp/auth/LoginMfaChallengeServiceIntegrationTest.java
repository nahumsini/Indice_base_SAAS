package com.indice.erp.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootTest(properties = {
    "app.entitlements.enforcement-enabled=false",
    "app.entitlements.projection-enabled=false"
})
class LoginMfaChallengeServiceIntegrationTest {

    private static final String EMAIL_PREFIX = "auth-mfa-";
    private static final String COMPANY_PREFIX = "auth-mfa-";
    private static final LoginAuditContext CONTEXT = new LoginAuditContext("203.0.113.10", "JUnit MFA", "session-1");

    @Autowired
    private JdbcTemplate jdbc;

    private MutableClock clock;
    private AuthSecurityProperties properties;
    private AuthLockoutService lockouts;
    private LoginAuditService audits;
    private LoginOtpEmailService emailService;
    private LoginMfaChallengeService service;
    private AtomicReference<String> lastOtp;

    @BeforeEach
    void setUp() {
        cleanTestState();
        clock = new MutableClock(Instant.parse("2026-08-18T21:00:00Z"));
        properties = new AuthSecurityProperties();
        properties.setMfaOtpHashSecret("test-only-otp-hash-secret");
        properties.setMfaOtpTtlSeconds(60);
        properties.setMfaMaxAttempts(5);
        properties.setMfaResendCooldownSeconds(30);
        properties.setMfaSendMaxRequests(5);
        properties.setMfaSendWindowMinutes(30);
        properties.setLoginLockoutAttempts(5);
        properties.setLoginLockoutMinutes(30);
        lockouts = new AuthLockoutService(jdbc, properties, clock);
        audits = new LoginAuditService(jdbc);
        emailService = mock(LoginOtpEmailService.class);
        lastOtp = new AtomicReference<>();
        given(emailService.sendOtp(any(AuthenticatedLogin.class), anyString(), anyInt()))
            .willAnswer(invocation -> {
                lastOtp.set(invocation.getArgument(1));
                return LoginOtpEmailService.DeliveryResult.sentResult();
            });
        service = new LoginMfaChallengeService(jdbc, properties, emailService, lockouts, audits, clock);
    }

    @AfterEach
    void clean() {
        cleanTestState();
    }

    @Test
    void validOtpCreatesAUsableMfaVerificationAndMarksChallengeUsed() {
        var login = insertLogin(UUID.randomUUID().toString());

        var start = service.startChallenge(login, "browser-session", CONTEXT);

        assertThat(start.started()).isTrue();
        assertThat(start.challengeReference()).matches("[a-f0-9]{64}");
        assertThat(lastOtp.get()).matches("\\d{6}");
        assertThat(otpHashFor(start.challengeReference())).matches("[a-f0-9]{64}");

        var verified = service.verify(start.challengeReference(), lastOtp.get(), "browser-session", CONTEXT);

        assertThat(verified.success()).isTrue();
        assertThat(verified.login().email()).isEqualTo(login.email());
        assertThat(challengeStatus(start.challengeReference())).isEqualTo("USED");

        var replay = service.verify(start.challengeReference(), lastOtp.get(), "browser-session", CONTEXT);
        assertThat(replay.success()).isFalse();
    }

    @Test
    void fiveWrongOtpAttemptsLockTheChallengeAndTheAccount() {
        var login = insertLogin(UUID.randomUUID().toString());
        var start = service.startChallenge(login, "browser-session", CONTEXT);

        for (int attempt = 1; attempt < 5; attempt++) {
            var result = service.verify(start.challengeReference(), "000000", "browser-session", CONTEXT);
            assertThat(result.success()).isFalse();
            assertThat(result.blocked()).isFalse();
        }

        var locked = service.verify(start.challengeReference(), "000000", "browser-session", CONTEXT);

        assertThat(locked.success()).isFalse();
        assertThat(locked.blocked()).isTrue();
        assertThat(challengeStatus(start.challengeReference())).isEqualTo("LOCKED");
        assertThat(lockouts.passwordLockout(login.email(), login.companyName()).locked()).isTrue();
        assertThat(auditCount(login.email(), AuthFailureReason.MFA_OTP_LOCKED)).isGreaterThanOrEqualTo(1);
    }

    @Test
    void expiredOtpCannotBeUsed() {
        var login = insertLogin(UUID.randomUUID().toString());
        var start = service.startChallenge(login, "browser-session", CONTEXT);

        clock.advance(Duration.ofSeconds(61));
        var result = service.verify(start.challengeReference(), lastOtp.get(), "browser-session", CONTEXT);

        assertThat(result.success()).isFalse();
        assertThat(result.message()).contains("expired");
        assertThat(challengeStatus(start.challengeReference())).isEqualTo("EXPIRED");
    }

    @Test
    void resendHonorsCooldownThenSendsANewCode() {
        var login = insertLogin(UUID.randomUUID().toString());
        var start = service.startChallenge(login, "browser-session", CONTEXT);
        var firstOtp = lastOtp.get();

        var cooldown = service.resendChallenge(start.challengeReference(), "browser-session", CONTEXT);
        assertThat(cooldown.started()).isTrue();
        assertThat(cooldown.resendAvailableInSeconds()).isPositive();
        verify(emailService, times(1)).sendOtp(any(AuthenticatedLogin.class), anyString(), anyInt());

        clock.advance(Duration.ofSeconds(31));
        var resent = service.resendChallenge(start.challengeReference(), "browser-session", CONTEXT);

        assertThat(resent.started()).isTrue();
        assertThat(lastOtp.get()).matches("\\d{6}");
        verify(emailService, times(2)).sendOtp(any(AuthenticatedLogin.class), anyString(), anyInt());
        assertThat(resendCount(start.challengeReference())).isEqualTo(2);
        assertThat(lastOtp.get()).isNotNull();
        assertThat(firstOtp).isNotNull();
    }

    @Test
    void emailFailureMarksChallengeAsFailedAndDoesNotStartMfa() {
        var login = insertLogin(UUID.randomUUID().toString());
        given(emailService.sendOtp(any(AuthenticatedLogin.class), anyString(), anyInt()))
            .willReturn(LoginOtpEmailService.DeliveryResult.failed("SendGrid rejected request."));

        var start = service.startChallenge(login, "browser-session", CONTEXT);

        assertThat(start.started()).isFalse();
        assertThat(start.message()).contains("could not send");
        assertThat(latestChallengeStatus(login.email())).isEqualTo("EMAIL_FAILED");
    }

    private AuthenticatedLogin insertLogin(String discriminator) {
        var email = EMAIL_PREFIX + discriminator + "@example.com";
        var company = COMPANY_PREFIX + discriminator;
        jdbc.update("INSERT INTO companies (name) VALUES (?)", company);
        var companyId = jdbc.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
        jdbc.update(
            "INSERT INTO users (email, password_hash, full_name) VALUES (?, '$2a$10$authmfatest', 'Auth MFA User')",
            email
        );
        var userId = jdbc.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
        jdbc.update(
            "INSERT INTO user_companies (user_id, company_id, role, status, visibility) VALUES (?, ?, 'admin', 'active', 'all')",
            userId,
            companyId
        );
        var userCompanyId = jdbc.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
        return new AuthenticatedLogin(userId, companyId, userCompanyId, "Auth MFA User", email, company, "admin");
    }

    private String otpHashFor(String challengeReference) {
        return jdbc.queryForObject(
            "SELECT otp_hash FROM auth_mfa_challenges WHERE challenge_reference = ?",
            String.class,
            challengeReference
        );
    }

    private String challengeStatus(String challengeReference) {
        return jdbc.queryForObject(
            "SELECT status FROM auth_mfa_challenges WHERE challenge_reference = ?",
            String.class,
            challengeReference
        );
    }

    private String latestChallengeStatus(String email) {
        return jdbc.queryForObject(
            "SELECT status FROM auth_mfa_challenges WHERE email_normalized = ? ORDER BY id DESC LIMIT 1",
            String.class,
            email.toLowerCase()
        );
    }

    private int resendCount(String challengeReference) {
        return jdbc.queryForObject(
            "SELECT resend_count FROM auth_mfa_challenges WHERE challenge_reference = ?",
            Integer.class,
            challengeReference
        );
    }

    private int auditCount(String email, String reasonCode) {
        return jdbc.queryForObject(
            "SELECT COUNT(*) FROM user_login_audit WHERE email_normalized = ? AND failure_reason_code = ?",
            Integer.class,
            email.toLowerCase(),
            reasonCode
        );
    }

    private void cleanTestState() {
        jdbc.update("DELETE FROM auth_mfa_challenges WHERE email_normalized LIKE ?", EMAIL_PREFIX + "%");
        jdbc.update("DELETE FROM auth_rate_limit_buckets WHERE email_normalized LIKE ?", EMAIL_PREFIX + "%");
        jdbc.update("DELETE FROM auth_login_lockouts WHERE email_normalized LIKE ?", EMAIL_PREFIX + "%");
        jdbc.update("DELETE FROM user_login_audit WHERE email_normalized LIKE ? OR email LIKE ?", EMAIL_PREFIX + "%", EMAIL_PREFIX + "%");
        jdbc.update("DELETE FROM user_companies WHERE company_id IN (SELECT id FROM companies WHERE name LIKE ?)", COMPANY_PREFIX + "%");
        jdbc.update("DELETE FROM users WHERE email LIKE ?", EMAIL_PREFIX + "%");
        jdbc.update("DELETE FROM companies WHERE name LIKE ?", COMPANY_PREFIX + "%");
    }
}
