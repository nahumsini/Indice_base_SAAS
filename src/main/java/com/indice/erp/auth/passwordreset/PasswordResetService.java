package com.indice.erp.auth.passwordreset;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Locale;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PasswordResetService {

    public static final String GENERIC_RESET_REQUEST_MESSAGE = "If that email exists, a password reset link has been sent.";
    public static final String INVALID_RESET_LINK_MESSAGE = "Password reset link is invalid or expired.";

    private static final Duration TOKEN_TTL = Duration.ofMinutes(10);
    private static final Duration REQUEST_WINDOW = Duration.ofHours(1);
    private static final int MAX_EMAIL_REQUESTS_PER_WINDOW = 5;
    private static final int MAX_IP_REQUESTS_PER_WINDOW = 30;
    private static final int TOKEN_BYTES = 32;

    private final PasswordResetRepository repository;
    private final PasswordResetEmailService emailService;
    private final BCryptPasswordEncoder passwordEncoder;
    private final Clock clock;
    private final SecureRandom secureRandom = new SecureRandom();

    public PasswordResetService(
        PasswordResetRepository repository,
        PasswordResetEmailService emailService,
        BCryptPasswordEncoder passwordEncoder,
        Clock clock
    ) {
        this.repository = repository;
        this.emailService = emailService;
        this.passwordEncoder = passwordEncoder;
        this.clock = clock;
    }

    public PasswordResetRequestResult requestReset(
        String email,
        String resetBaseUrl,
        String clientIp,
        String userAgent
    ) {
        var normalizedEmail = normalizeEmail(email);
        if (normalizedEmail.isBlank() || !looksLikeEmail(normalizedEmail)) {
            return PasswordResetRequestResult.generic();
        }

        var now = clock.instant();
        var windowStart = now.minus(REQUEST_WINDOW);
        var emailHash = sha256Hex(normalizedEmail);
        var ipHash = hashNullable(normalizeIp(clientIp));
        var userAgentHash = hashNullable(userAgent);

        if (repository.countRequestsByEmailHashSince(emailHash, windowStart) >= MAX_EMAIL_REQUESTS_PER_WINDOW) {
            repository.recordRequest(emailHash, ipHash, userAgentHash, false, false, "email_rate_limited");
            return PasswordResetRequestResult.generic();
        }

        if (!isBlank(ipHash) && repository.countRequestsByIpHashSince(ipHash, windowStart) >= MAX_IP_REQUESTS_PER_WINDOW) {
            repository.recordRequest(emailHash, ipHash, userAgentHash, false, false, "ip_rate_limited");
            return PasswordResetRequestResult.generic();
        }

        var user = repository.findUserByEmail(normalizedEmail);
        if (user.isEmpty()) {
            repository.recordRequest(emailHash, ipHash, userAgentHash, true, false, "email_not_found");
            return PasswordResetRequestResult.generic();
        }

        repository.invalidateActiveTokensForUser(user.get().id(), now);

        var rawToken = generateToken();
        repository.insertToken(
            user.get().id(),
            sha256Hex(rawToken),
            now.plus(TOKEN_TTL),
            ipHash,
            userAgentHash
        );

        var emailResult = emailService.sendPasswordReset(
            user.get().email(),
            user.get().fullName(),
            buildResetLink(resetBaseUrl, rawToken)
        );
        repository.recordRequest(
            emailHash,
            ipHash,
            userAgentHash,
            true,
            emailResult.sent(),
            emailResult.sent() ? null : emailResult.status()
        );

        return PasswordResetRequestResult.generic();
    }

    @Transactional(readOnly = true)
    public boolean isTokenValid(String rawToken) {
        if (isBlank(rawToken) || rawToken.length() > 512) {
            return false;
        }

        return repository.findTokenByHash(sha256Hex(rawToken))
            .filter(token -> isUsable(token, clock.instant()))
            .isPresent();
    }

    @Transactional
    public void completeReset(String rawToken, String password, String confirmPassword) {
        validatePassword(password, confirmPassword);

        if (isBlank(rawToken) || rawToken.length() > 512) {
            throw new IllegalArgumentException(INVALID_RESET_LINK_MESSAGE);
        }

        var now = clock.instant();
        var token = repository.findTokenByHashForUpdate(sha256Hex(rawToken))
            .filter(record -> isUsable(record, now))
            .orElseThrow(() -> new IllegalArgumentException(INVALID_RESET_LINK_MESSAGE));

        var updated = repository.updateUserPassword(token.userId(), passwordEncoder.encode(password));
        if (updated != 1) {
            throw new IllegalStateException("Password could not be reset.");
        }

        repository.markTokenUsed(token.id(), now);
        repository.invalidateOtherActiveTokens(token.userId(), token.id(), now);
    }

    private boolean isUsable(PasswordResetTokenRecord token, java.time.Instant now) {
        return token != null
            && "active".equalsIgnoreCase(nullToBlank(token.status()))
            && token.usedAt() == null
            && token.invalidatedAt() == null
            && token.expiresAt() != null
            && token.expiresAt().isAfter(now);
    }

    private void validatePassword(String password, String confirmPassword) {
        var nextPassword = nullToBlank(password);
        var confirmation = nullToBlank(confirmPassword);
        if (nextPassword.isBlank() || confirmation.isBlank()) {
            throw new IllegalArgumentException("Password and confirmation are required.");
        }

        if (!nextPassword.equals(confirmation)) {
            throw new IllegalArgumentException("Password and confirmation must match.");
        }

        if (nextPassword.length() < 8) {
            throw new IllegalArgumentException("Password must be at least 8 characters long.");
        }
    }

    private String buildResetLink(String resetBaseUrl, String rawToken) {
        var baseUrl = nullToBlank(resetBaseUrl).replaceAll("/+$", "");
        if (baseUrl.isBlank()) {
            return "/reset-password/" + rawToken;
        }

        return baseUrl + "/reset-password/" + rawToken;
    }

    private String generateToken() {
        var bytes = new byte[TOKEN_BYTES];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String normalizeEmail(String email) {
        return nullToBlank(email).trim().toLowerCase(Locale.ROOT);
    }

    private String normalizeIp(String clientIp) {
        return nullToBlank(clientIp).trim();
    }

    private boolean looksLikeEmail(String email) {
        var at = email.indexOf('@');
        return at > 0 && at < email.length() - 1 && email.indexOf('@', at + 1) < 0;
    }

    private String hashNullable(String value) {
        var safeValue = nullToBlank(value).trim();
        return safeValue.isBlank() ? "" : sha256Hex(safeValue);
    }

    private String sha256Hex(String value) {
        try {
            var digest = MessageDigest.getInstance("SHA-256");
            var hash = digest.digest(nullToBlank(value).getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 is not available.", ex);
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private String nullToBlank(String value) {
        return value == null ? "" : value;
    }

    public record PasswordResetRequestResult(String message) {
        static PasswordResetRequestResult generic() {
            return new PasswordResetRequestResult(GENERIC_RESET_REQUEST_MESSAGE);
        }
    }
}
