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
    public static final String HR_PEOPLE_READ = "hr.people:read";
    public static final String HR_ATTENDANCE_READ = "hr.attendance:read";
    public static final String TASKS_READ = "tasks.read";
    public static final String SALES_READ = "sales.read";
    public static final String POS_READ = "pos.read";
    public static final String INVENTORY_READ = "inventory.read";
    public static final String EXPENSES_READ = "expenses.read";
    public static final String PETTY_CASH_READ = "petty_cash.read";
    public static final String RECEIVABLES_READ = "receivables.read";
    public static final String BUSINESS_CONTEXT_READ = "business.context:read";
    public static final String FINANCE_REFERENCES_READ = "finance.references:read";
    public static final String CUSTOMERS_READ = "customers.read";
    public static final String PROVIDERS_READ = "providers.read";
    public static final String WAREHOUSES_READ = "warehouses.read";
    public static final String BUDGET_LINES_READ = "budget_lines.read";
    public static final String ACCOUNTING_ACCOUNTS_READ = "accounting_accounts.read";
    public static final String TASKS_CREATE = "tasks.create";
    public static final String EXPENSES_CREATE = "expenses.create";
    public static final String PETTY_CASH_EXPENSE_CREATE = "petty_cash.expense:create";
    public static final String PETTY_CASH_DEPOSIT_CREATE = "petty_cash.deposit:create";
    public static final String OPENID = "openid";
    public static final String EMAIL = "email";

    private static final Set<String> DEFAULT_SCOPES = Set.of(
        SALES_TODAY_READ,
        BUSINESS_SNAPSHOT_READ,
        HR_PEOPLE_READ,
        HR_ATTENDANCE_READ,
        TASKS_READ,
        SALES_READ,
        POS_READ,
        INVENTORY_READ,
        EXPENSES_READ,
        PETTY_CASH_READ,
        RECEIVABLES_READ,
        BUSINESS_CONTEXT_READ,
        FINANCE_REFERENCES_READ,
        CUSTOMERS_READ, PROVIDERS_READ, WAREHOUSES_READ, BUDGET_LINES_READ, ACCOUNTING_ACCOUNTS_READ
    );
    private static final Set<String> ACTION_SCOPES = Set.of(
        TASKS_CREATE,
        EXPENSES_CREATE,
        PETTY_CASH_EXPENSE_CREATE,
        PETTY_CASH_DEPOSIT_CREATE
    );
    private static final Set<String> SUPPORTED_SCOPES = supportedScopes(DEFAULT_SCOPES, ACTION_SCOPES);
    private static final Set<String> OAUTH_IDENTITY_SCOPES = Set.of(OPENID, EMAIL);

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
        return issue(owner, label, expiresInDays, null);
    }

    @Transactional
    public IssuedConnection issue(
        AuthSessionUser owner,
        String label,
        Integer expiresInDays,
        Set<String> requestedScopes
    ) {
        return issue(owner, label, expiresInDays, requestedScopes, false);
    }

    @Transactional
    public IssuedConnection issueOAuth(
        AuthSessionUser owner,
        String label,
        Integer expiresInDays,
        Set<String> requestedScopes
    ) {
        return issue(owner, label, expiresInDays, requestedScopes, true);
    }

    private IssuedConnection issue(
        AuthSessionUser owner,
        String label,
        Integer expiresInDays,
        Set<String> requestedScopes,
        boolean allowIdentityScopes
    ) {
        requireDirectMembership(owner);
        var normalizedLabel = normalizeLabel(label);
        var days = expiresInDays == null ? DEFAULT_EXPIRY_DAYS : expiresInDays;
        if (days < 1 || days > MAX_EXPIRY_DAYS) {
            throw new IllegalArgumentException("expiresInDays must be between 1 and 90.");
        }

        var now = clock.instant();
        requireAvailableConnection(owner);

        var rawToken = generateToken();
        var expiresAt = now.plus(Duration.ofDays(days));
        var visiblePrefix = rawToken.substring(0, Math.min(18, rawToken.length()));
        var scopes = normalizeScopes(requestedScopes, allowIdentityScopes);
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
    public void requireAvailableConnection(AuthSessionUser owner) {
        requireDirectMembership(owner);
        if (repository.countActive(owner.userId(), owner.companyId(), clock.instant()) >= MAX_ACTIVE_CONNECTIONS) {
            throw new AiConnectionLimitException();
        }
    }

    public Set<String> supportedScopes() {
        return SUPPORTED_SCOPES;
    }

    public Set<String> supportedOAuthScopes() {
        var scopes = new java.util.HashSet<>(SUPPORTED_SCOPES);
        scopes.addAll(OAUTH_IDENTITY_SCOPES);
        return Set.copyOf(scopes);
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
    public IssuedConnection rotate(
        AuthSessionUser owner,
        long connectionId,
        Integer expiresInDays,
        Set<String> requestedScopes
    ) {
        return rotate(owner, connectionId, expiresInDays, requestedScopes, false);
    }

    @Transactional
    public IssuedConnection rotateOAuth(
        AuthSessionUser owner,
        long connectionId,
        Integer expiresInDays,
        Set<String> requestedScopes
    ) {
        return rotate(owner, connectionId, expiresInDays, requestedScopes, true);
    }

    private IssuedConnection rotate(
        AuthSessionUser owner,
        long connectionId,
        Integer expiresInDays,
        Set<String> requestedScopes,
        boolean allowIdentityScopes
    ) {
        requireDirectMembership(owner);
        var days = expiresInDays == null ? DEFAULT_EXPIRY_DAYS : expiresInDays;
        if (days < 1 || days > MAX_EXPIRY_DAYS) {
            throw new IllegalArgumentException("expiresInDays must be between 1 and 90.");
        }
        var scopes = normalizeScopes(requestedScopes, allowIdentityScopes);
        var now = clock.instant();
        var rawToken = generateToken();
        var expiresAt = now.plus(Duration.ofDays(days));
        var visiblePrefix = rawToken.substring(0, Math.min(18, rawToken.length()));
        if (repository.rotate(
            connectionId,
            owner,
            visiblePrefix,
            sha256Hex(rawToken),
            expiresAt,
            scopes
        ) != 1) {
            throw new IllegalArgumentException("AI connection is no longer active.");
        }
        return new IssuedConnection(
            connectionId,
            PROVIDER,
            "Conexión renovada",
            visiblePrefix,
            scopes,
            expiresAt,
            now,
            rawToken
        );
    }

    @Transactional
    public Optional<AiAccessTokenRepository.StoredToken> authenticate(
        String authorizationHeader,
        String requiredScope
    ) {
        return authenticateStoredToken(authorizationHeader, requiredScope, true);
    }

    @Transactional
    public Optional<AiAccessTokenRepository.StoredToken> authenticate(String authorizationHeader) {
        return authenticateStoredToken(authorizationHeader, null, true);
    }

    @Transactional(readOnly = true)
    public Optional<AiAccessTokenRepository.StoredToken> authenticateReadOnly(String authorizationHeader) {
        return authenticateStoredToken(authorizationHeader, null, false);
    }

    private Optional<AiAccessTokenRepository.StoredToken> authenticateStoredToken(
        String authorizationHeader,
        String requiredScope,
        boolean markUsage
    ) {
        var rawToken = bearerToken(authorizationHeader);
        if (rawToken.isEmpty()) {
            return Optional.empty();
        }
        var now = clock.instant();
        var stored = repository.findActiveByHash(sha256Hex(rawToken.get()), now)
            .filter(token -> requiredScope == null || token.scopes().contains(requiredScope));
        if (markUsage) stored.ifPresent(token -> repository.markUsed(token.id(), now));
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

    private Set<String> normalizeScopes(Set<String> requestedScopes, boolean allowIdentityScopes) {
        if (requestedScopes == null) {
            return DEFAULT_SCOPES;
        }
        var normalized = requestedScopes.stream()
            .filter(java.util.Objects::nonNull)
            .map(String::trim)
            .filter(scope -> !scope.isBlank())
            .collect(java.util.stream.Collectors.toUnmodifiableSet());
        if (normalized.isEmpty()) {
            throw new IllegalArgumentException("At least one AI permission is required.");
        }
        if (allowIdentityScopes
            && normalized.contains(OPENID) != normalized.contains(EMAIL)) {
            throw new IllegalArgumentException("OAuth identity permissions openid and email must be granted together.");
        }
        var supported = allowIdentityScopes ? supportedOAuthScopes() : SUPPORTED_SCOPES;
        if (!supported.containsAll(normalized)) {
            throw new IllegalArgumentException("One or more AI permissions are not supported.");
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

    private static Set<String> supportedScopes(Set<String> reads, Set<String> actions) {
        var scopes = new java.util.HashSet<>(reads);
        scopes.addAll(actions);
        return Set.copyOf(scopes);
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
