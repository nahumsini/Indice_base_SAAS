package com.indice.erp.billing.signup;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

import com.indice.erp.auth.AuthSecurityProperties;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootTest(properties = {
    "app.entitlements.enforcement-enabled=false",
    "app.entitlements.projection-enabled=false"
})
class BillingSignupEmailVerificationServiceIntegrationTest {

    private static final String EMAIL_PREFIX = "signup-verify-";

    @Autowired
    private JdbcTemplate jdbc;

    private TestClock clock;
    private BillingSignupEmailVerificationProperties properties;
    private BillingSignupEmailVerificationEmailService emailService;
    private BillingSignupEmailVerificationService service;
    private AtomicReference<String> lastOtp;

    @BeforeEach
    void setUp() {
        cleanTestState();
        clock = new TestClock(Instant.parse("2026-08-18T22:00:00Z"));
        properties = new BillingSignupEmailVerificationProperties();
        properties.setOtpTtlSeconds(120);
        properties.setVerifiedTtlSeconds(600);
        properties.setMaxAttempts(5);
        properties.setResendCooldownSeconds(30);
        properties.setSendWindowMinutes(30);
        properties.setSendMaxRequests(5);

        var authProperties = new AuthSecurityProperties();
        authProperties.setMfaOtpHashSecret("test-only-signup-otp-secret");
        emailService = mock(BillingSignupEmailVerificationEmailService.class);
        lastOtp = new AtomicReference<>();
        given(emailService.sendVerification(anyString(), anyString(), anyString(), anyString(), anyInt()))
            .willAnswer(invocation -> {
                lastOtp.set(invocation.getArgument(3));
                return BillingSignupEmailVerificationEmailService.DeliveryResult.sentResult();
            });
        service = new BillingSignupEmailVerificationService(
            new BillingSignupEmailVerificationRepository(jdbc),
            properties,
            emailService,
            authProperties,
            clock
        );
    }

    @AfterEach
    void clean() {
        cleanTestState();
    }

    @Test
    void validOtpVerifiesEmailAndStoresOnlyTheOtpHash() {
        var email = uniqueEmail("valid");

        var started = service.start(startRequest(email));

        assertThat(started.started()).isTrue();
        assertThat(started.verificationReference()).matches("[a-f0-9]{64}");
        assertThat(started.maskedEmail()).contains("@example.com");
        assertThat(lastOtp.get()).matches("\\d{6}");
        var storedHash = storedOtpHash(started.verificationReference());
        assertThat(storedHash).matches("[a-f0-9]{64}");
        assertThat(storedHash).isNotEqualTo(lastOtp.get());

        var verified = service.verify(new BillingSignupEmailVerificationVerifyRequest(
            started.verificationReference(),
            lastOtp.get()
        ));

        assertThat(verified.verified()).isTrue();
        assertThat(status(started.verificationReference())).isEqualTo("VERIFIED");
        var required = service.requireVerified(email, started.verificationReference());
        assertThat(required.email()).isEqualTo(email);
        assertThat(required.verificationReference()).isEqualTo(started.verificationReference());
    }

    @Test
    void requireVerifiedRejectsMissingUnverifiedMismatchedAndExpiredReferences() {
        var email = uniqueEmail("required");
        assertThatThrownBy(() -> service.requireVerified(email, ""))
            .isInstanceOf(BillingSignupEmailVerificationException.class)
            .hasMessageContaining("Verify your email");

        var started = service.start(startRequest(email));
        assertThatThrownBy(() -> service.requireVerified(email, started.verificationReference()))
            .isInstanceOf(BillingSignupEmailVerificationException.class)
            .hasMessageContaining("Verify your email");

        service.verify(new BillingSignupEmailVerificationVerifyRequest(started.verificationReference(), lastOtp.get()));
        assertThatThrownBy(() -> service.requireVerified(uniqueEmail("other"), started.verificationReference()))
            .isInstanceOf(BillingSignupEmailVerificationException.class)
            .hasMessageContaining("same email");

        clock.advance(Duration.ofSeconds(601));
        assertThatThrownBy(() -> service.requireVerified(email, started.verificationReference()))
            .isInstanceOf(BillingSignupEmailVerificationException.class)
            .hasMessageContaining("expired");
    }

    @Test
    void fiveWrongOtpAttemptsLockTheSignupVerification() {
        var email = uniqueEmail("lock");
        var started = service.start(startRequest(email));

        for (int attempt = 1; attempt < 5; attempt++) {
            var result = service.verify(new BillingSignupEmailVerificationVerifyRequest(
                started.verificationReference(),
                "bad-code"
            ));
            assertThat(result.verified()).isFalse();
            assertThat(result.blocked()).isFalse();
        }

        var locked = service.verify(new BillingSignupEmailVerificationVerifyRequest(
            started.verificationReference(),
            "bad-code"
        ));

        assertThat(locked.verified()).isFalse();
        assertThat(locked.blocked()).isTrue();
        assertThat(status(started.verificationReference())).isEqualTo("LOCKED");
        assertThatThrownBy(() -> service.requireVerified(email, started.verificationReference()))
            .isInstanceOf(BillingSignupEmailVerificationException.class);
    }

    @Test
    void resendHonorsCooldownThenSendsANewCode() {
        var started = service.start(startRequest(uniqueEmail("resend")));

        var cooldown = service.resend(new BillingSignupEmailVerificationResendRequest(started.verificationReference()));
        assertThat(cooldown.started()).isTrue();
        assertThat(cooldown.resendAvailableInSeconds()).isPositive();
        verify(emailService, times(1)).sendVerification(anyString(), anyString(), anyString(), anyString(), anyInt());

        clock.advance(Duration.ofSeconds(31));
        var resent = service.resend(new BillingSignupEmailVerificationResendRequest(started.verificationReference()));

        assertThat(resent.started()).isTrue();
        assertThat(lastOtp.get()).matches("\\d{6}");
        verify(emailService, times(2)).sendVerification(anyString(), anyString(), anyString(), anyString(), anyInt());
        assertThat(resendCount(started.verificationReference())).isEqualTo(1);
    }

    @Test
    void tooManyVerificationEmailsForOneAddressAreRateLimited() {
        properties.setResendCooldownSeconds(0);
        var email = uniqueEmail("rate");
        for (int i = 0; i < 5; i++) {
            service.start(startRequest(email));
        }

        assertThatThrownBy(() -> service.start(startRequest(email)))
            .isInstanceOfSatisfying(BillingSignupEmailVerificationException.class, exception -> {
                assertThat(exception.status()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
                assertThat(exception.code()).isEqualTo("EMAIL_VERIFICATION_RATE_LIMITED");
            });
        verify(emailService, times(5)).sendVerification(anyString(), anyString(), anyString(), anyString(), anyInt());
    }

    @Test
    void existingAccountEmailCannotStartSignupVerification() {
        var email = uniqueEmail("existing");
        jdbc.update(
            "INSERT INTO users (email, password_hash, full_name) VALUES (?, '$2a$10$signupverify', 'Existing Signup User')",
            email
        );

        assertThatThrownBy(() -> service.start(startRequest(email)))
            .isInstanceOfSatisfying(BillingSignupEmailVerificationException.class, exception -> {
                assertThat(exception.status()).isEqualTo(HttpStatus.CONFLICT);
                assertThat(exception.code()).isEqualTo("EMAIL_ALREADY_REGISTERED");
            });
        verify(emailService, times(0)).sendVerification(anyString(), anyString(), anyString(), anyString(), anyInt());
    }

    private BillingSignupEmailVerificationStartRequest startRequest(String email) {
        return new BillingSignupEmailVerificationStartRequest(
            "Signup Owner",
            email,
            email,
            "Signup Company"
        );
    }

    private String storedOtpHash(String reference) {
        return jdbc.queryForObject(
            "SELECT otp_hash FROM billing_signup_email_verifications WHERE verification_reference = ?",
            String.class,
            reference
        );
    }

    private String status(String reference) {
        return jdbc.queryForObject(
            "SELECT status FROM billing_signup_email_verifications WHERE verification_reference = ?",
            String.class,
            reference
        );
    }

    private int resendCount(String reference) {
        return jdbc.queryForObject(
            "SELECT resend_count FROM billing_signup_email_verifications WHERE verification_reference = ?",
            Integer.class,
            reference
        );
    }

    private String uniqueEmail(String label) {
        return EMAIL_PREFIX + label + "-" + UUID.randomUUID() + "@example.com";
    }

    private void cleanTestState() {
        jdbc.update(
            "DELETE FROM billing_signup_intent_products WHERE signup_intent_id IN (SELECT id FROM billing_signup_intents WHERE email_normalized LIKE ?)",
            EMAIL_PREFIX + "%"
        );
        jdbc.update("DELETE FROM billing_signup_intents WHERE email_normalized LIKE ?", EMAIL_PREFIX + "%");
        jdbc.update("DELETE FROM billing_signup_email_verifications WHERE email_normalized LIKE ?", EMAIL_PREFIX + "%");
        jdbc.update("DELETE FROM users WHERE email LIKE ?", EMAIL_PREFIX + "%");
    }

    private static final class TestClock extends Clock {
        private Instant instant;

        private TestClock(Instant instant) {
            this.instant = instant;
        }

        void advance(Duration duration) {
            instant = instant.plus(duration);
        }

        @Override
        public ZoneId getZone() {
            return ZoneId.of("UTC");
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return instant;
        }
    }
}
