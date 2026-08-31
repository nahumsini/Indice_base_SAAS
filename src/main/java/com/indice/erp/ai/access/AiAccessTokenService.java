package com.indice.erp.ai.access;

import com.indice.erp.auth.AuthSessionUser;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AiAccessTokenService {

    public static final String SALES_TODAY_READ = "sales.today:read";
    public static final String BUSINESS_SNAPSHOT_READ = "business.snapshot:read";

    private static final Set<String> DEFAULT_SCOPES = Set.of(
        SALES_TODAY_READ,
        BUSINESS_SNAPSHOT_READ
    );

    private static final String PROVIDER = "generic_mcp";
    private static final String TOKEN_PREFIX = "idx_ai_";
    private static final int TOKEN_BYTES = 32;
    private static final int DEFAULT_EXPIRY_DAYS = 30;
    private static final int MAX_EXPIRY_DAYS = 90;
    private static final int MAX_ACTIVE_CONNECTIONS = 5;

    private final AiAccessTokenRepository repository;
    private final Clock clock;
    private final SecureRandom secureRandom = new SecureRandom();

    public AiAccessTokenService(AiAccessTokenRepository repository, Clock clock) {
        this.repository = repository;
        this.clock = clock;
    }

    @Transactional
    public IssuedConnection issue(AuthSessionUser owner, String label, Integer expiresInDays) {
        requireDirectMembership(owner);
        var normalizedLabel = normalizeLabel(label);
        var days = expiresInDays == null ? DEFAULT_EXPIRY_DAYS : expiresInDays;
        if (days < 1 || days > MAX_EXPIRY_DAYS) {
            throw new IllegalArgumentException("expiresInDays must be between 1 and 90.");
        }

        var now = clock.instant();
        if (repository.countActive(owner.userId(), owner.companyId(), now) >= MAX_ACTIVE_CONNECTIONS) {
            throw new IllegalStateException("Revoke an existing AI connection before creating another one.");
        }

        var rawToken = generateToken();
        var expiresAt = now.plus(Duration.ofDays(days));
        var visiblePrefix = rawToken.substring(0, Math.min(18, rawToken.length()));
        var scopes = DEFAULT_SCOPES;
        var id = repository.insert(
            owner,
            PROVIDER,
            normalizedLabel,
            visiblePrefix,
            sha256Hex(rawToken),
            expiresAt,
            scopes
        );
        return new IssuedConnection(id, PROVIDER, normalizedLabel, visiblePrefix, scopes, expiresAt, now, rawToken);
    }

    @Transactional(readOnly = true)
    public List<AiAccessTokenRepository.StoredConnection> list(AuthSessionUser owner) {
        requireDirectMembership(owner);
        return repository.list(owner.userId(), owner.companyId());
    }

    @Transactional
    public boolean revoke(AuthSessionUser owner, long connectionId) {
        requireDirectMembership(owner);
        return repository.revoke(connectionId, owner.userId(), owner.companyId(), clock.instant()) == 1;
    }

    @Transactional
    public Optional<AiAccessTokenRepository.StoredToken> authenticate(
        String authorizationHeader,
        String requiredScope
    ) {
        return authenticateStoredToken(authorizationHeader, requiredScope);
    }

    @Transactional
    public Optional<AiAccessTokenRepository.StoredToken> authenticate(String authorizationHeader) {
        return authenticateStoredToken(authorizationHeader, null);
    }

    private Optional<AiAccessTokenRepository.StoredToken> authenticateStoredToken(
        String authorizationHeader,
        String requiredScope
    ) {
        var rawToken = bearerToken(authorizationHeader);
        if (rawToken.isEmpty()) {
            return Optional.empty();
        }
        var now = clock.instant();
        var stored = repository.findActiveByHash(sha256Hex(rawToken.get()), now)
            .filter(token -> requiredScope == null || token.scopes().contains(requiredScope));
        stored.ifPresent(token -> repository.markUsed(token.id(), now));
        return stored;
    }

    private void requireDirectMembership(AuthSessionUser owner) {
        if (owner == null || owner.userId() == null || owner.companyId() == null || owner.userCompanyId() == null) {
            throw new IllegalArgumentException("AI connections require a direct active company membership.");
        }
    }

    private String normalizeLabel(String label) {
        var normalized = label == null ? "" : label.trim();
        if (normalized.isBlank()) {
            return "Conexión MCP";
        }
        if (normalized.length() > 120) {
            throw new IllegalArgumentException("label must not exceed 120 characters.");
        }
        return normalized;
    }

    private Optional<String> bearerToken(String authorizationHeader) {
        if (authorizationHeader == null || authorizationHeader.length() > 512) {
            return Optional.empty();
        }
        var separator = authorizationHeader.indexOf(' ');
        if (separator < 1 || !"bearer".equalsIgnoreCase(authorizationHeader.substring(0, separator))) {
            return Optional.empty();
        }
        var token = authorizationHeader.substring(separator + 1).trim();
        if (!token.startsWith(TOKEN_PREFIX) || token.length() < 40 || token.contains(" ")) {
            return Optional.empty();
        }
        return Optional.of(token);
    }

    private String generateToken() {
        var bytes = new byte[TOKEN_BYTES];
        secureRandom.nextBytes(bytes);
        return TOKEN_PREFIX + Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String sha256Hex(String value) {
        try {
            var digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is not available.", exception);
        }
    }

    public record IssuedConnection(
        long id,
        String provider,
        String label,
        String tokenPrefix,
        Set<String> scopes,
        Instant expiresAt,
        Instant createdAt,
        String accessToken
    ) {
    }
}
