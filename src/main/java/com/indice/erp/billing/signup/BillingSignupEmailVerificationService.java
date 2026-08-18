package com.indice.erp.billing.signup;

import com.indice.erp.auth.AuthSecurityProperties;
import com.indice.erp.billing.BillingHashing;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BillingSignupEmailVerificationService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final String STATUS_PENDING = "PENDING";
    private static final String STATUS_VERIFIED = "VERIFIED";
    private static final String STATUS_LOCKED = "LOCKED";
    private static final String STATUS_EXPIRED = "EXPIRED";
    private static final String STATUS_EMAIL_FAILED = "EMAIL_FAILED";
    private static final String GENERIC_FAILURE = "Invalid verification code or email verification expired.";

    private final BillingSignupEmailVerificationRepository repository;
    private final BillingSignupEmailVerificationProperties properties;
    private final BillingSignupEmailVerificationEmailService emailService;
    private final Clock clock;
    private final String otpHashSecret;

    public BillingSignupEmailVerificationService(
        BillingSignupEmailVerificationRepository repository,
        BillingSignupEmailVerificationProperties properties,
        BillingSignupEmailVerificationEmailService emailService,
        AuthSecurityProperties authSecurityProperties,
        Clock clock
    ) {
        this.repository = repository;
        this.properties = properties;
        this.emailService = emailService;
        this.clock = clock;
        this.otpHashSecret = authSecurityProperties.getMfaOtpHashSecret().isBlank()
            ? BillingHashing.randomReference()
            : authSecurityProperties.getMfaOtpHashSecret();
    }

    @Transactional
    public BillingSignupEmailVerificationResponse start(BillingSignupEmailVerificationStartRequest request) {
        if (!properties.isEnabled()) {
            throw exception(HttpStatus.SERVICE_UNAVAILABLE, "EMAIL_VERIFICATION_DISABLED", "Email verification is not enabled.");
        }
        var normalized = BillingSignupEmailVerificationInput.validateStart(request);
        ensureEmailIsNew(normalized.email());
        enforceSendRateLimit(normalized.email());

        var reference = BillingHashing.randomReference();
        var code = generateOtp();
        var now = clock.instant();
        var expiresAt = now.plus(Duration.ofSeconds(properties.getOtpTtlSeconds()));
        var maskedEmail = BillingSignupEmailVerificationInput.maskEmail(normalized.email());

        repository.create(new BillingSignupEmailVerificationRepository.NewVerification(
            reference,
            normalized.email(),
            normalized.fullName(),
            normalized.companyName(),
            otpHash(reference, code),
            maskedEmail,
            STATUS_PENDING,
            properties.getMaxAttempts(),
            now,
            expiresAt
        ));
        var delivery = emailService.sendVerification(
            normalized.email(),
            normalized.fullName(),
            normalized.companyName(),
            code,
            properties.getOtpTtlSeconds()
        );
        if (!delivery.sent()) {
            repository.markEmailFailure(reference, STATUS_EMAIL_FAILED, delivery.message());
            throw exception(HttpStatus.SERVICE_UNAVAILABLE, "EMAIL_VERIFICATION_SEND_FAILED",
                "We could not send the verification code. Please check the email and try again.");
        }
        repository.markEmailSent(reference, now);
        return started(reference, maskedEmail, properties.getOtpTtlSeconds(), properties.getResendCooldownSeconds());
    }

    @Transactional
    public BillingSignupEmailVerificationResponse resend(BillingSignupEmailVerificationResendRequest request) {
        var challenge = findForUpdate(request == null ? null : request.verificationReference());
        if (challenge == null) {
            return failure(GENERIC_FAILURE);
        }
        var now = clock.instant();
        if (!STATUS_PENDING.equals(status(challenge.status())) || challenge.lockedAt() != null || challenge.verifiedAt() != null) {
            return failure(GENERIC_FAILURE);
        }
        if (!challenge.expiresAt().isAfter(now)) {
            repository.markExpired(challenge.id(), STATUS_EXPIRED);
            return failure("This verification code expired. Start email verification again.");
        }
        var cooldownUntil = challenge.lastSentAt() == null
            ? now
            : challenge.lastSentAt().plus(Duration.ofSeconds(properties.getResendCooldownSeconds()));
        if (cooldownUntil.isAfter(now)) {
            return started(
                challenge.reference(),
                challenge.destinationHint(),
                Math.max(1, (int) Duration.between(now, challenge.expiresAt()).getSeconds()),
                Math.max(1, (int) Duration.between(now, cooldownUntil).getSeconds())
            );
        }
        enforceSendRateLimit(challenge.email());

        var code = generateOtp();
        var expiresAt = now.plus(Duration.ofSeconds(properties.getOtpTtlSeconds()));
        repository.resetForResend(
            challenge.id(),
            otpHash(challenge.reference(), code),
            expiresAt,
            now,
            STATUS_PENDING
        );
        var delivery = emailService.sendVerification(
            challenge.email(),
            challenge.fullName(),
            challenge.companyName(),
            code,
            properties.getOtpTtlSeconds()
        );
        if (!delivery.sent()) {
            repository.markEmailFailure(challenge.reference(), STATUS_EMAIL_FAILED, delivery.message());
            throw exception(HttpStatus.SERVICE_UNAVAILABLE, "EMAIL_VERIFICATION_SEND_FAILED",
                "We could not send the verification code. Please try again.");
        }
        repository.markEmailSent(challenge.reference(), now);
        return started(challenge.reference(), challenge.destinationHint(), properties.getOtpTtlSeconds(), properties.getResendCooldownSeconds());
    }

    @Transactional
    public BillingSignupEmailVerificationResponse verify(BillingSignupEmailVerificationVerifyRequest request) {
        var challenge = findForUpdate(request == null ? null : request.verificationReference());
        if (challenge == null) {
            return failure(GENERIC_FAILURE);
        }
        var now = clock.instant();
        if (STATUS_VERIFIED.equals(status(challenge.status())) && challenge.verifiedAt() != null) {
            return verified(challenge.reference(), challenge.destinationHint(), challenge.verifiedExpiresAt());
        }
        if (STATUS_LOCKED.equals(status(challenge.status())) || challenge.lockedAt() != null) {
            return new BillingSignupEmailVerificationResponse(false, false, true, challenge.reference(),
                challenge.destinationHint(), 0, 0, null, GENERIC_FAILURE);
        }
        if (!STATUS_PENDING.equals(status(challenge.status())) || !challenge.expiresAt().isAfter(now)) {
            repository.markExpired(challenge.id(), STATUS_EXPIRED);
            return failure("This verification code expired. Start email verification again.");
        }
        if (!matchesOtp(challenge, request == null ? null : request.otpCode())) {
            var nextAttempts = challenge.attemptCount() + 1;
            if (nextAttempts >= challenge.maxAttempts()) {
                repository.markLocked(challenge.id(), nextAttempts, STATUS_LOCKED, now);
                return new BillingSignupEmailVerificationResponse(false, false, true, challenge.reference(),
                    challenge.destinationHint(), 0, 0, null, GENERIC_FAILURE);
            }
            repository.updateAttemptCount(challenge.id(), nextAttempts);
            return failure(GENERIC_FAILURE);
        }

        var verifiedExpiresAt = now.plus(Duration.ofSeconds(properties.getVerifiedTtlSeconds()));
        repository.markVerified(challenge.id(), STATUS_VERIFIED, now, verifiedExpiresAt, challenge.attemptCount());
        return verified(challenge.reference(), challenge.destinationHint(), verifiedExpiresAt);
    }

    public VerifiedEmail requireVerified(String email, String verificationReference) {
        if (!properties.isEnabled()) {
            return new VerifiedEmail(BillingSignupEmailVerificationInput.normalizeEmail(email), "", clock.instant());
        }
        var normalizedEmail = BillingSignupEmailVerificationInput.normalizeEmail(email);
        if (!BillingSignupEmailVerificationInput.validReference(verificationReference)) {
            throw exception(HttpStatus.BAD_REQUEST, "EMAIL_NOT_VERIFIED", "Verify your email before continuing to payment.");
        }
        var row = repository.findVerification(verificationReference);
        if (row == null) {
            throw exception(HttpStatus.BAD_REQUEST, "EMAIL_NOT_VERIFIED", "Verify your email before continuing to payment.");
        }
        if (!normalizedEmail.equals(BillingSignupEmailVerificationInput.normalizeEmail(row.email()))) {
            throw exception(HttpStatus.BAD_REQUEST, "EMAIL_VERIFICATION_MISMATCH", "Verify the same email before continuing to payment.");
        }
        if (!STATUS_VERIFIED.equals(status(row.status())) || row.verifiedAt() == null) {
            throw exception(HttpStatus.BAD_REQUEST, "EMAIL_NOT_VERIFIED", "Verify your email before continuing to payment.");
        }
        if (row.verifiedExpiresAt() == null || !row.verifiedExpiresAt().isAfter(clock.instant())) {
            throw exception(HttpStatus.BAD_REQUEST, "EMAIL_VERIFICATION_EXPIRED", "Email verification expired. Please verify your email again.");
        }
        return new VerifiedEmail(normalizedEmail, verificationReference, row.verifiedAt());
    }

    private void ensureEmailIsNew(String email) {
        if (repository.existingUserCount(email) > 0) {
            throw exception(HttpStatus.CONFLICT, "EMAIL_ALREADY_REGISTERED",
                "This email already belongs to an Indice account. Use login or password reset.");
        }
    }

    private void enforceSendRateLimit(String email) {
        var since = clock.instant().minus(Duration.ofMinutes(properties.getSendWindowMinutes()));
        if (repository.sentCountSince(email, since) >= properties.getSendMaxRequests()) {
            throw exception(HttpStatus.TOO_MANY_REQUESTS, "EMAIL_VERIFICATION_RATE_LIMITED",
                "Too many verification emails were requested. Try again later.");
        }
    }

    private BillingSignupEmailVerificationResponse started(
        String reference,
        String maskedEmail,
        int expiresInSeconds,
        int resendAvailableInSeconds
    ) {
        return new BillingSignupEmailVerificationResponse(true, false, false, reference, maskedEmail,
            expiresInSeconds, resendAvailableInSeconds, null, "");
    }

    private BillingSignupEmailVerificationResponse verified(String reference, String maskedEmail, Instant verifiedExpiresAt) {
        return new BillingSignupEmailVerificationResponse(false, true, false, reference, maskedEmail,
            0, 0, verifiedExpiresAt, "");
    }

    private BillingSignupEmailVerificationResponse failure(String message) {
        return new BillingSignupEmailVerificationResponse(false, false, false, "", "", 0, 0, null, message);
    }

    private BillingSignupEmailVerificationException exception(HttpStatus status, String code, String message) {
        return new BillingSignupEmailVerificationException(status, code, message);
    }

    private BillingSignupEmailVerificationRepository.Challenge findForUpdate(String reference) {
        if (!BillingSignupEmailVerificationInput.validReference(reference)) {
            return null;
        }
        return repository.findForUpdate(reference);
    }

    private boolean matchesOtp(BillingSignupEmailVerificationRepository.Challenge challenge, String otpCode) {
        var cleaned = otpCode == null ? "" : otpCode.replaceAll("\\D", "");
        if (cleaned.length() != 6) {
            return false;
        }
        var expected = challenge.otpHash().getBytes(java.nio.charset.StandardCharsets.UTF_8);
        var actual = otpHash(challenge.reference(), cleaned).getBytes(java.nio.charset.StandardCharsets.UTF_8);
        return MessageDigest.isEqual(expected, actual);
    }

    private String generateOtp() {
        return "%06d".formatted(SECURE_RANDOM.nextInt(1_000_000));
    }

    private String otpHash(String reference, String otpCode) {
        return BillingHashing.sha256(otpHashSecret + ":signup-email:" + reference + ":" + otpCode);
    }

    private String status(String value) {
        return BillingSignupEmailVerificationInput.status(value);
    }

    public record VerifiedEmail(String email, String verificationReference, Instant verifiedAt) {
    }
}
