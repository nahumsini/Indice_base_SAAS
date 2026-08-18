package com.indice.erp.auth;

import com.indice.erp.billing.BillingHashing;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class LoginMfaChallengeService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final String STATUS_PENDING = "PENDING";
    private static final String STATUS_USED = "USED";
    private static final String STATUS_LOCKED = "LOCKED";
    private static final String STATUS_EXPIRED = "EXPIRED";
    private static final String STATUS_EMAIL_FAILED = "EMAIL_FAILED";
    private static final String GENERIC_FAILURE = "Invalid verification code or account temporarily locked.";

    private final JdbcTemplate jdbcTemplate;
    private final AuthSecurityProperties properties;
    private final LoginOtpEmailService emailService;
    private final AuthLockoutService lockoutService;
    private final LoginAuditService auditService;
    private final Clock clock;
    private final String otpHashSecret;

    public LoginMfaChallengeService(
        JdbcTemplate jdbcTemplate,
        AuthSecurityProperties properties,
        LoginOtpEmailService emailService,
        AuthLockoutService lockoutService,
        LoginAuditService auditService,
        Clock clock
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.properties = properties;
        this.emailService = emailService;
        this.lockoutService = lockoutService;
        this.auditService = auditService;
        this.clock = clock;
        this.otpHashSecret = properties.getMfaOtpHashSecret().isBlank()
            ? BillingHashing.randomReference()
            : properties.getMfaOtpHashSecret();
    }

    @Transactional
    public MfaStartResult startChallenge(AuthenticatedLogin login, String sessionId, LoginAuditContext context) {
        var rateLimit = lockoutService.consumeOtpSend(login);
        if (!rateLimit.allowed()) {
            var lockout = lockoutService.lockAccount(login, AuthFailureReason.RATE_LIMITED);
            audit(login, "MFA_CHALLENGE", "MFA", "BLOCKED", AuthFailureReason.RATE_LIMITED,
                "Too many verification code requests.", context, lockout.lockedUntil(), rateLimit.attemptsUsed());
            return MfaStartResult.blocked("Invalid login or account temporarily locked.", lockout.lockedUntil());
        }

        var code = generateOtp();
        var reference = BillingHashing.randomReference();
        var now = clock.instant();
        var expiresAt = now.plus(Duration.ofSeconds(properties.getMfaOtpTtlSeconds()));

        jdbcTemplate.update(
            """
                INSERT INTO auth_mfa_challenges (
                    challenge_reference, session_id_hash, user_id, company_id, user_company_id,
                    role, full_name, email_normalized, company_name_normalized, company_name,
                    otp_hash, destination_hint, status, attempt_count, max_attempts,
                    resend_count, last_sent_at, expires_at, ip_address, user_agent
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 1, ?, ?, ?, ?)
                """,
            reference,
            sessionHash(sessionId),
            login.userId(),
            login.companyId(),
            login.userCompanyId(),
            login.role(),
            login.fullName(),
            normalize(login.email()),
            normalize(login.companyName()),
            login.companyName(),
            otpHash(reference, code),
            maskEmail(login.email()),
            STATUS_PENDING,
            properties.getMfaMaxAttempts(),
            timestamp(now),
            timestamp(expiresAt),
            clean(context == null ? "" : context.ipAddress(), 64),
            clean(context == null ? "" : context.userAgent(), 512)
        );
        var delivery = emailService.sendOtp(login, code, properties.getMfaOtpTtlSeconds());
        if (!delivery.sent()) {
            jdbcTemplate.update(
                "UPDATE auth_mfa_challenges SET status = ? WHERE challenge_reference = ?",
                STATUS_EMAIL_FAILED,
                reference
            );
            audit(login, "MFA_CHALLENGE", "MFA", "FAILURE", AuthFailureReason.MFA_EMAIL_FAILED,
                "Unable to send verification code.", context, null, rateLimit.attemptsUsed());
            return MfaStartResult.failure("We could not send the verification code. Please try again.");
        }
        audit(login, "MFA_CHALLENGE", "MFA", "SUCCESS", AuthFailureReason.MFA_REQUIRED,
            "Verification code sent.", context, null, rateLimit.attemptsUsed());
        return MfaStartResult.started(
            reference,
            maskEmail(login.email()),
            properties.getMfaOtpTtlSeconds(),
            properties.getMfaResendCooldownSeconds()
        );
    }

    @Transactional
    public MfaStartResult resendChallenge(String challengeReference, String sessionId, LoginAuditContext context) {
        var challenge = findChallengeForUpdate(challengeReference);
        if (challenge == null) {
            auditUnknown(challengeReference, "MFA_RESEND", AuthFailureReason.MFA_CHALLENGE_NOT_FOUND, context);
            return MfaStartResult.failure(GENERIC_FAILURE);
        }
        if (!sessionHash(sessionId).equals(challenge.sessionIdHash())) {
            audit(challenge.login(), "MFA_RESEND", "MFA", "FAILURE", AuthFailureReason.MFA_SESSION_MISMATCH,
                "Verification session mismatch.", context, null, challenge.resendCount());
            return MfaStartResult.failure(GENERIC_FAILURE);
        }
        var now = clock.instant();
        var status = status(challenge.status());
        if (!STATUS_PENDING.equals(status) || challenge.usedAt() != null || challenge.lockedAt() != null) {
            audit(challenge.login(), "MFA_RESEND", "MFA", "BLOCKED", AuthFailureReason.MFA_OTP_LOCKED,
                "Verification challenge is no longer active.", context, null, challenge.resendCount());
            return MfaStartResult.failure(GENERIC_FAILURE);
        }
        if (!challenge.expiresAt().isAfter(now)) {
            markExpired(challenge.id());
            audit(challenge.login(), "MFA_RESEND", "MFA", "FAILURE", AuthFailureReason.MFA_OTP_EXPIRED,
                "Verification code expired.", context, null, challenge.resendCount());
            return MfaStartResult.failure("This verification code expired. Start again from the login screen.");
        }
        var cooldownUntil = challenge.lastSentAt() == null
            ? now
            : challenge.lastSentAt().plus(Duration.ofSeconds(properties.getMfaResendCooldownSeconds()));
        if (cooldownUntil.isAfter(now)) {
            return MfaStartResult.cooldown(
                challenge.challengeReference(),
                challenge.destinationHint(),
                Math.max(1, (int) Duration.between(now, cooldownUntil).getSeconds())
            );
        }
        var rateLimit = lockoutService.consumeOtpSend(challenge.login());
        if (!rateLimit.allowed()) {
            var lockout = lockoutService.lockAccount(challenge.login(), AuthFailureReason.RATE_LIMITED);
            audit(challenge.login(), "MFA_RESEND", "MFA", "BLOCKED", AuthFailureReason.RATE_LIMITED,
                "Too many verification code requests.", context, lockout.lockedUntil(), rateLimit.attemptsUsed());
            return MfaStartResult.blocked("Invalid login or account temporarily locked.", lockout.lockedUntil());
        }

        var code = generateOtp();
        var expiresAt = now.plus(Duration.ofSeconds(properties.getMfaOtpTtlSeconds()));
        jdbcTemplate.update(
            """
                UPDATE auth_mfa_challenges
                SET otp_hash = ?, expires_at = ?, last_sent_at = ?,
                    resend_count = resend_count + 1, attempt_count = 0,
                    status = ?
                WHERE id = ?
                """,
            otpHash(challenge.challengeReference(), code),
            timestamp(expiresAt),
            timestamp(now),
            STATUS_PENDING,
            challenge.id()
        );
        var delivery = emailService.sendOtp(challenge.login(), code, properties.getMfaOtpTtlSeconds());
        if (!delivery.sent()) {
            jdbcTemplate.update("UPDATE auth_mfa_challenges SET status = ? WHERE id = ?", STATUS_EMAIL_FAILED, challenge.id());
            audit(challenge.login(), "MFA_RESEND", "MFA", "FAILURE", AuthFailureReason.MFA_EMAIL_FAILED,
                "Unable to send verification code.", context, null, rateLimit.attemptsUsed());
            return MfaStartResult.failure("We could not send the verification code. Please try again.");
        }
        audit(challenge.login(), "MFA_RESEND", "MFA", "SUCCESS", AuthFailureReason.MFA_REQUIRED,
            "Verification code resent.", context, null, rateLimit.attemptsUsed());
        return MfaStartResult.started(
            challenge.challengeReference(),
            challenge.destinationHint(),
            properties.getMfaOtpTtlSeconds(),
            properties.getMfaResendCooldownSeconds()
        );
    }

    @Transactional
    public MfaVerifyResult verify(String challengeReference, String otpCode, String sessionId, LoginAuditContext context) {
        var challenge = findChallengeForUpdate(challengeReference);
        if (challenge == null) {
            auditUnknown(challengeReference, "MFA_VERIFY", AuthFailureReason.MFA_CHALLENGE_NOT_FOUND, context);
            return MfaVerifyResult.failure(GENERIC_FAILURE, false, null);
        }
        if (!sessionHash(sessionId).equals(challenge.sessionIdHash())) {
            audit(challenge.login(), "MFA_VERIFY", "MFA", "FAILURE", AuthFailureReason.MFA_SESSION_MISMATCH,
                "Verification session mismatch.", context, null, challenge.attemptCount());
            return MfaVerifyResult.failure(GENERIC_FAILURE, false, null);
        }
        var now = clock.instant();
        if (STATUS_USED.equals(status(challenge.status())) || challenge.usedAt() != null) {
            audit(challenge.login(), "MFA_VERIFY", "MFA", "FAILURE", AuthFailureReason.MFA_OTP_USED,
                "Verification code already used.", context, null, challenge.attemptCount());
            return MfaVerifyResult.failure(GENERIC_FAILURE, false, null);
        }
        if (STATUS_LOCKED.equals(status(challenge.status())) || challenge.lockedAt() != null) {
            audit(challenge.login(), "MFA_VERIFY", "MFA", "BLOCKED", AuthFailureReason.MFA_OTP_LOCKED,
                "Verification challenge is locked.", context, null, challenge.attemptCount());
            return MfaVerifyResult.failure(GENERIC_FAILURE, true, null);
        }
        if (!challenge.expiresAt().isAfter(now)) {
            markExpired(challenge.id());
            audit(challenge.login(), "MFA_VERIFY", "MFA", "FAILURE", AuthFailureReason.MFA_OTP_EXPIRED,
                "Verification code expired.", context, null, challenge.attemptCount());
            return MfaVerifyResult.failure("This verification code expired. Start again from the login screen.", false, null);
        }
        if (!matchesOtp(challenge, otpCode)) {
            var nextAttempts = challenge.attemptCount() + 1;
            var locked = nextAttempts >= challenge.maxAttempts();
            Instant lockedUntil = null;
            if (locked) {
                jdbcTemplate.update(
                    "UPDATE auth_mfa_challenges SET attempt_count = ?, status = ?, locked_at = ? WHERE id = ?",
                    nextAttempts,
                    STATUS_LOCKED,
                    timestamp(now),
                    challenge.id()
                );
                lockedUntil = lockoutService.lockAccount(challenge.login(), AuthFailureReason.MFA_OTP_LOCKED).lockedUntil();
            } else {
                jdbcTemplate.update("UPDATE auth_mfa_challenges SET attempt_count = ? WHERE id = ?", nextAttempts, challenge.id());
            }
            audit(challenge.login(), "MFA_VERIFY", "MFA", locked ? "BLOCKED" : "FAILURE",
                locked ? AuthFailureReason.MFA_OTP_LOCKED : AuthFailureReason.MFA_OTP_INVALID,
                locked ? "Too many verification code attempts." : "Invalid verification code.",
                context, lockedUntil, nextAttempts);
            return MfaVerifyResult.failure(GENERIC_FAILURE, locked, lockedUntil);
        }

        jdbcTemplate.update(
            "UPDATE auth_mfa_challenges SET status = ?, used_at = ?, attempt_count = ? WHERE id = ?",
            STATUS_USED,
            timestamp(now),
            challenge.attemptCount(),
            challenge.id()
        );
        lockoutService.clearPasswordFailures(challenge.login());
        audit(challenge.login(), "MFA_VERIFY", "MFA", "SUCCESS", null,
            null, context, null, challenge.attemptCount());
        return MfaVerifyResult.success(challenge.login());
    }

    private MfaChallenge findChallengeForUpdate(String challengeReference) {
        if (challengeReference == null || !challengeReference.matches("[a-f0-9]{64}")) {
            return null;
        }
        var rows = jdbcTemplate.query(
            """
                SELECT id, challenge_reference, session_id_hash, user_id, company_id, user_company_id,
                       role, full_name, email_normalized, company_name_normalized, company_name,
                       otp_hash, destination_hint, status, attempt_count, max_attempts,
                       resend_count, last_sent_at, expires_at, used_at, locked_at
                FROM auth_mfa_challenges
                WHERE challenge_reference = ?
                FOR UPDATE
                """,
            (rs, rowNum) -> new MfaChallenge(
                rs.getLong("id"),
                rs.getString("challenge_reference"),
                rs.getString("session_id_hash"),
                new AuthenticatedLogin(
                    rs.getLong("user_id"),
                    rs.getLong("company_id"),
                    rs.getLong("user_company_id"),
                    rs.getString("full_name"),
                    rs.getString("email_normalized"),
                    rs.getString("company_name"),
                    rs.getString("role")
                ),
                rs.getString("otp_hash"),
                rs.getString("destination_hint"),
                rs.getString("status"),
                rs.getInt("attempt_count"),
                rs.getInt("max_attempts"),
                rs.getInt("resend_count"),
                instant(rs.getTimestamp("last_sent_at")),
                instant(rs.getTimestamp("expires_at")),
                instant(rs.getTimestamp("used_at")),
                instant(rs.getTimestamp("locked_at"))
            ),
            challengeReference
        );
        return rows.isEmpty() ? null : rows.getFirst();
    }

    private void markExpired(long challengeId) {
        jdbcTemplate.update("UPDATE auth_mfa_challenges SET status = ? WHERE id = ?", STATUS_EXPIRED, challengeId);
    }

    private void audit(
        AuthenticatedLogin login,
        String eventType,
        String stage,
        String outcome,
        String reasonCode,
        String safeMessage,
        LoginAuditContext context,
        Instant lockoutUntil,
        Integer attemptsUsed
    ) {
        auditService.record(LoginAuditEvent.builder()
            .eventType(eventType)
            .stage(stage)
            .outcome(outcome)
            .emailNormalized(normalize(login.email()))
            .companyNameNormalized(normalize(login.companyName()))
            .userId(login.userId())
            .companyId(login.companyId())
            .userCompanyId(login.userCompanyId())
            .role(login.role())
            .failureReasonCode(reasonCode)
            .failureMessageSafe(safeMessage)
            .context(context)
            .lockoutUntil(lockoutUntil)
            .attemptsUsed(attemptsUsed)
            .build());
    }

    private void auditUnknown(String challengeReference, String eventType, String reasonCode, LoginAuditContext context) {
        auditService.record(LoginAuditEvent.builder()
            .eventType(eventType)
            .stage("MFA")
            .outcome("FAILURE")
            .failureReasonCode(reasonCode)
            .failureMessageSafe("Verification challenge was not found.")
            .context(context)
            .requestId(challengeReference == null ? "" : challengeReference)
            .build());
    }

    private boolean matchesOtp(MfaChallenge challenge, String otpCode) {
        var cleaned = otpCode == null ? "" : otpCode.replaceAll("\\D", "");
        if (cleaned.length() != 6) {
            return false;
        }
        var expected = challenge.otpHash().getBytes(java.nio.charset.StandardCharsets.UTF_8);
        var actual = otpHash(challenge.challengeReference(), cleaned).getBytes(java.nio.charset.StandardCharsets.UTF_8);
        return MessageDigest.isEqual(expected, actual);
    }

    private String generateOtp() {
        return "%06d".formatted(SECURE_RANDOM.nextInt(1_000_000));
    }

    private String otpHash(String reference, String otpCode) {
        return BillingHashing.sha256(otpHashSecret + ":" + reference + ":" + otpCode);
    }

    private String sessionHash(String sessionId) {
        return BillingHashing.sha256("auth-session:" + (sessionId == null ? "" : sessionId));
    }

    private String maskEmail(String email) {
        var cleaned = email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
        var at = cleaned.indexOf('@');
        if (at <= 0) {
            return "email";
        }
        return cleaned.charAt(0) + "***" + cleaned.substring(at);
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    private String status(String value) {
        return value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
    }

    private String clean(String value, int maxLength) {
        var cleaned = value == null ? "" : value.replaceAll("[\\r\\n\\t]+", " ").trim();
        return cleaned.length() <= maxLength ? cleaned : cleaned.substring(0, maxLength);
    }

    private Instant instant(Timestamp timestamp) {
        return timestamp == null ? null : timestamp.toInstant();
    }

    private Timestamp timestamp(Instant instant) {
        return instant == null ? null : Timestamp.from(instant);
    }

    private record MfaChallenge(
        long id,
        String challengeReference,
        String sessionIdHash,
        AuthenticatedLogin login,
        String otpHash,
        String destinationHint,
        String status,
        int attemptCount,
        int maxAttempts,
        int resendCount,
        Instant lastSentAt,
        Instant expiresAt,
        Instant usedAt,
        Instant lockedAt
    ) {
    }

    public record MfaStartResult(
        boolean started,
        boolean blocked,
        String message,
        String challengeReference,
        String maskedDestination,
        int expiresInSeconds,
        int resendAvailableInSeconds,
        Instant lockoutUntil
    ) {
        static MfaStartResult started(
            String challengeReference,
            String maskedDestination,
            int expiresInSeconds,
            int resendAvailableInSeconds
        ) {
            return new MfaStartResult(true, false, "", challengeReference, maskedDestination,
                expiresInSeconds, resendAvailableInSeconds, null);
        }

        static MfaStartResult cooldown(String challengeReference, String maskedDestination, int resendAvailableInSeconds) {
            return new MfaStartResult(true, false, "", challengeReference, maskedDestination,
                0, resendAvailableInSeconds, null);
        }

        static MfaStartResult blocked(String message, Instant lockoutUntil) {
            return new MfaStartResult(false, true, message, "", "", 0, 0, lockoutUntil);
        }

        static MfaStartResult failure(String message) {
            return new MfaStartResult(false, false, message, "", "", 0, 0, null);
        }
    }

    public record MfaVerifyResult(
        boolean success,
        String message,
        boolean blocked,
        Instant lockoutUntil,
        AuthenticatedLogin login
    ) {
        static MfaVerifyResult success(AuthenticatedLogin login) {
            return new MfaVerifyResult(true, "", false, null, login);
        }

        static MfaVerifyResult failure(String message, boolean blocked, Instant lockoutUntil) {
            return new MfaVerifyResult(false, message, blocked, lockoutUntil, null);
        }
    }
}
