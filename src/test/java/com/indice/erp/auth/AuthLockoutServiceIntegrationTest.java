package com.indice.erp.auth;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
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
class AuthLockoutServiceIntegrationTest {

    private static final String EMAIL_PREFIX = "auth-lockout-";
    private static final String COMPANY_PREFIX = "auth-lockout-";
    private static final String NOW = "2026-08-18T20:00:00Z";

    @Autowired
    private JdbcTemplate jdbc;

    private MutableClock clock;
    private AuthSecurityProperties properties;
    private AuthLockoutService service;

    @BeforeEach
    void setUp() {
        cleanTestState();
        clock = new MutableClock(Instant.parse(NOW));
        properties = new AuthSecurityProperties();
        properties.setLoginLockoutAttempts(5);
        properties.setLoginLockoutMinutes(30);
        properties.setMfaSendMaxRequests(5);
        properties.setMfaSendWindowMinutes(30);
        service = new AuthLockoutService(jdbc, properties, clock);
    }

    @AfterEach
    void clean() {
        cleanTestState();
    }

    @Test
    void fiveFailedPasswordAttemptsLockTheAccountCompanyPairForThirtyMinutes() {
        var email = EMAIL_PREFIX + UUID.randomUUID() + "@example.com";
        var company = COMPANY_PREFIX + UUID.randomUUID();

        for (int attempt = 1; attempt < 5; attempt++) {
            var state = service.recordPasswordFailure(failure(email, company));

            assertThat(state.failureCount()).isEqualTo(attempt);
            assertThat(state.locked()).isFalse();
        }

        var locked = service.recordPasswordFailure(failure(email, company));

        assertThat(locked.failureCount()).isEqualTo(5);
        assertThat(locked.locked()).isTrue();
        assertThat(locked.lockedUntil()).isEqualTo(clock.instant().plus(Duration.ofMinutes(30)));
        assertThat(service.passwordLockout(email, company).locked()).isTrue();

        clock.advance(Duration.ofMinutes(31));

        assertThat(service.passwordLockout(email, company).locked()).isFalse();
        var next = service.recordPasswordFailure(failure(email, company));
        assertThat(next.failureCount()).isEqualTo(1);
        assertThat(next.locked()).isFalse();
    }

    @Test
    void successfulMfaVerificationClearsPasswordFailures() {
        var login = insertLogin(UUID.randomUUID().toString());

        service.recordPasswordFailure(failure(login.email(), login.companyName()));
        assertThat(lockoutRowCount(login.email())).isEqualTo(1);

        service.clearPasswordFailures(login);

        assertThat(lockoutRowCount(login.email())).isZero();
    }

    @Test
    void otpSendRequestsAllowFiveThenBlockForThirtyMinutes() {
        var login = insertLogin(UUID.randomUUID().toString());

        for (int request = 1; request <= 5; request++) {
            var decision = service.consumeOtpSend(login);

            assertThat(decision.allowed()).isTrue();
            assertThat(decision.attemptsUsed()).isEqualTo(request);
        }

        var blocked = service.consumeOtpSend(login);

        assertThat(blocked.allowed()).isFalse();
        assertThat(blocked.attemptsUsed()).isEqualTo(5);
        assertThat(blocked.blockedUntil()).isEqualTo(clock.instant().plus(Duration.ofMinutes(30)));

        clock.advance(Duration.ofMinutes(31));

        var reopened = service.consumeOtpSend(login);
        assertThat(reopened.allowed()).isTrue();
        assertThat(reopened.attemptsUsed()).isEqualTo(1);
    }

    private LoginCredentialVerificationResult failure(String email, String company) {
        return LoginCredentialVerificationResult.failure(
            "Invalid company, email, or password.",
            AuthFailureReason.PASSWORD_INVALID,
            email.toLowerCase(),
            company.toLowerCase(),
            null,
            null,
            null,
            null
        );
    }

    private AuthenticatedLogin insertLogin(String discriminator) {
        var email = EMAIL_PREFIX + discriminator + "@example.com";
        var company = COMPANY_PREFIX + discriminator;
        jdbc.update("INSERT INTO companies (name) VALUES (?)", company);
        var companyId = jdbc.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
        jdbc.update(
            "INSERT INTO users (email, password_hash, full_name) VALUES (?, '$2a$10$authlockouttest', 'Auth Lockout User')",
            email
        );
        var userId = jdbc.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
        jdbc.update(
            "INSERT INTO user_companies (user_id, company_id, role, status, visibility) VALUES (?, ?, 'admin', 'active', 'all')",
            userId,
            companyId
        );
        var userCompanyId = jdbc.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
        return new AuthenticatedLogin(userId, companyId, userCompanyId, "Auth Lockout User", email, company, "admin");
    }

    private int lockoutRowCount(String email) {
        return jdbc.queryForObject(
            "SELECT COUNT(*) FROM auth_login_lockouts WHERE email_normalized = ?",
            Integer.class,
            email.toLowerCase()
        );
    }

    private void cleanTestState() {
        jdbc.update("DELETE FROM auth_rate_limit_buckets WHERE email_normalized LIKE ?", EMAIL_PREFIX + "%");
        jdbc.update("DELETE FROM auth_login_lockouts WHERE email_normalized LIKE ?", EMAIL_PREFIX + "%");
        jdbc.update("DELETE FROM user_login_audit WHERE email_normalized LIKE ? OR email LIKE ?", EMAIL_PREFIX + "%", EMAIL_PREFIX + "%");
        jdbc.update("DELETE FROM user_companies WHERE company_id IN (SELECT id FROM companies WHERE name LIKE ?)", COMPANY_PREFIX + "%");
        jdbc.update("DELETE FROM users WHERE email LIKE ?", EMAIL_PREFIX + "%");
        jdbc.update("DELETE FROM companies WHERE name LIKE ?", COMPANY_PREFIX + "%");
    }
}
