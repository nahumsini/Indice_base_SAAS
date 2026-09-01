package com.indice.erp.ai.oauth;

import com.indice.erp.ai.access.AiAccessTokenService;
import com.indice.erp.auth.AuthSessionUser;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Arrays;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;
import java.util.regex.Pattern;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AiOAuthService {

    private static final Pattern PKCE_CHALLENGE = Pattern.compile("^[A-Za-z0-9_-]{43,128}$");
    private static final Pattern PKCE_VERIFIER = Pattern.compile("^[A-Za-z0-9._~-]{43,128}$");
    private static final int MAX_REDIRECT_URIS = 4;
    private static final int RANDOM_BYTES = 32;

    private final AiOAuthRepository repository;
    private final AiOAuthProperties properties;
    private final AiAccessTokenService accessTokenService;
    private final Clock clock;
    private final SecureRandom secureRandom = new SecureRandom();

    public AiOAuthService(
        AiOAuthRepository repository,
        AiOAuthProperties properties,
        AiAccessTokenService accessTokenService,
        Clock clock
    ) {
        this.repository = repository;
        this.properties = properties;
        this.accessTokenService = accessTokenService;
        this.clock = clock;
    }

    @Transactional
    public AiOAuthRepository.RegisteredClient register(DynamicRegistration request) {
        if (request == null) throw invalidClientMetadata("Client metadata is required.");
        var redirectUris = request.redirectUris() == null
            ? List.<String>of()
            : request.redirectUris().stream().map(value -> value == null ? "" : value.trim()).distinct().toList();
        if (redirectUris.isEmpty() || redirectUris.size() > MAX_REDIRECT_URIS
            || redirectUris.stream().anyMatch(uri -> !properties.isAllowedRedirectUri(uri))) {
            throw invalidClientMetadata("Only approved ChatGPT HTTPS redirect URLs are accepted.");
        }
        if (request.grantTypes() != null && !request.grantTypes().isEmpty()) {
            var grantTypes = Set.copyOf(request.grantTypes());
            if (!grantTypes.contains("authorization_code")
                || !Set.of("authorization_code", "refresh_token").containsAll(grantTypes)) {
                throw invalidClientMetadata("Only authorization_code with optional refresh_token is supported.");
            }
        }
        if (request.responseTypes() != null && !request.responseTypes().isEmpty()
            && !Set.of("code").equals(Set.copyOf(request.responseTypes()))) {
            throw invalidClientMetadata("Only the code response type is supported.");
        }
        var authMethod = text(request.tokenEndpointAuthMethod());
        if (!authMethod.isBlank() && !"none".equals(authMethod)) {
            throw invalidClientMetadata("This OAuth client must use PKCE without a client secret.");
        }
        var clientName = text(request.clientName());
        if (clientName.isBlank()) clientName = "ChatGPT";
        if (clientName.length() > 120) clientName = clientName.substring(0, 120);
        var canonicalRedirects = redirectUris.stream().sorted().toList();
        var metadataHash = sha256Hex(clientName + "\n" + String.join("\n", canonicalRedirects));
        return repository.registerOrReuse(
            "idx_oauth_client_" + randomToken(), clientName, metadataHash, canonicalRedirects
        );
    }

    @Transactional(readOnly = true)
    public ConsentContext consentContext(AuthSessionUser user, AuthorizationRequest request) {
        requireDirectMembership(user);
        var validated = validateAuthorizationRequest(request);
        return new ConsentContext(
            validated.client().clientName(),
            validated.scopes(),
            properties.getAccessTokenDays(),
            user.userName()
        );
    }

    @Transactional
    public AuthorizationResult authorize(AuthSessionUser user, AuthorizationRequest request, boolean approved) {
        requireDirectMembership(user);
        var validated = validateAuthorizationRequest(request);
        if (!approved) {
            return new AuthorizationResult(redirect(
                request.redirectUri(),
                List.of(
                    new QueryParameter("error", "access_denied"),
                    new QueryParameter("error_description", "The user did not approve this connection."),
                    new QueryParameter("state", request.state())
                )
            ));
        }

        var code = "idx_oauth_code_" + randomToken();
        repository.insertAuthorizationCode(
            sha256Hex(code),
            validated.client(),
            user,
            request.redirectUri(),
            request.resource(),
            validated.scopes(),
            request.codeChallenge(),
            clock.instant().plus(properties.getAuthorizationCodeTtl())
        );
        return new AuthorizationResult(redirect(
            request.redirectUri(),
            List.of(new QueryParameter("code", code), new QueryParameter("state", request.state()))
        ));
    }

    @Transactional
    public TokenResult exchange(TokenRequest request) {
        if (request == null) throw unsupportedGrantType();
        if ("refresh_token".equals(text(request.grantType()))) return refresh(request);
        if (!"authorization_code".equals(text(request.grantType()))) throw unsupportedGrantType();
        if (!PKCE_VERIFIER.matcher(text(request.codeVerifier())).matches()) {
            throw invalidGrant();
        }
        if (!properties.getResourceUrl().equals(text(request.resource()))) {
            throw new AiOAuthException("invalid_target", "The requested resource is not supported.");
        }
        var code = text(request.code());
        var stored = repository.findForUpdate(sha256Hex(code)).orElseThrow(this::invalidGrant);
        var now = clock.instant();
        if (stored.usedAt() != null || !stored.expiresAt().isAfter(now)
            || !stored.clientId().equals(text(request.clientId()))
            || !stored.redirectUri().equals(text(request.redirectUri()))
            || !stored.resource().equals(properties.getResourceUrl())
            || !constantTimeEquals(stored.codeChallenge(), s256(request.codeVerifier()))) {
            throw invalidGrant();
        }
        repository.markAuthorizationCodeUsed(stored.id(), now);
        var issued = accessTokenService.issue(
            stored.user(),
            "ChatGPT · " + repository.findActiveClient(stored.clientId())
                .map(AiOAuthRepository.RegisteredClient::clientName)
                .orElse("Asistente IA"),
            properties.getAccessTokenDays(),
            stored.scopes()
        );
        var refreshToken = issueRefreshToken(
            stored.clientId(), issued.id(), stored.user(), stored.resource(), stored.scopes()
        );
        repository.markClientUsed(stored.clientId(), now);
        return new TokenResult(
            issued.accessToken(),
            Math.max(1L, Duration.between(now, issued.expiresAt()).toSeconds()),
            String.join(" ", new TreeSet<>(stored.scopes())),
            refreshToken
        );
    }

    private TokenResult refresh(TokenRequest request) {
        var refreshToken = text(request.refreshToken());
        if (refreshToken.isBlank()) throw invalidGrant();
        var stored = repository.findRefreshForUpdate(sha256Hex(refreshToken)).orElseThrow(this::invalidGrant);
        var now = clock.instant();
        var requestedResource = text(request.resource());
        if (stored.usedAt() != null
            || !stored.expiresAt().isAfter(now)
            || !stored.clientId().equals(text(request.clientId()))
            || (!requestedResource.isBlank() && !stored.resource().equals(requestedResource))
            || !properties.getResourceUrl().equals(stored.resource())) {
            throw invalidGrant();
        }
        var scopes = refreshScopes(request.scope(), stored.scopes());
        repository.markRefreshUsed(stored.id(), now);
        var issued = accessTokenService.rotate(
            stored.user(), stored.accessTokenId(), properties.getAccessTokenDays(), scopes
        );
        var rotatedRefreshToken = issueRefreshToken(
            stored.clientId(), stored.accessTokenId(), stored.user(), stored.resource(), scopes
        );
        repository.markClientUsed(stored.clientId(), now);
        return new TokenResult(
            issued.accessToken(),
            Math.max(1L, Duration.between(now, issued.expiresAt()).toSeconds()),
            String.join(" ", new TreeSet<>(scopes)),
            rotatedRefreshToken
        );
    }

    private String issueRefreshToken(
        String clientId,
        long accessTokenId,
        AuthSessionUser user,
        String resource,
        Set<String> scopes
    ) {
        var rawToken = "idx_oauth_refresh_" + randomToken();
        repository.insertRefreshToken(
            sha256Hex(rawToken),
            clientId,
            accessTokenId,
            user,
            resource,
            scopes,
            clock.instant().plus(Duration.ofDays(properties.getRefreshTokenDays()))
        );
        return rawToken;
    }

    private Set<String> refreshScopes(String requested, Set<String> granted) {
        if (requested == null || requested.isBlank()) return granted;
        var scopes = parseScopes(requested);
        if (scopes.isEmpty() || !granted.containsAll(scopes)) {
            throw new AiOAuthException("invalid_scope", "Refresh cannot add permissions to this connection.");
        }
        return scopes;
    }

    private ValidatedAuthorization validateAuthorizationRequest(AuthorizationRequest request) {
        if (request == null || !"code".equals(text(request.responseType()))) {
            throw new AiOAuthException("unsupported_response_type", "Only the code response type is supported.");
        }
        if (!"S256".equals(request.codeChallengeMethod())
            || !PKCE_CHALLENGE.matcher(text(request.codeChallenge())).matches()) {
            throw new AiOAuthException("invalid_request", "PKCE with S256 is required.");
        }
        if (text(request.state()).isBlank() || request.state().length() > 1024) {
            throw new AiOAuthException("invalid_request", "A valid state value is required.");
        }
        if (!properties.getResourceUrl().equals(text(request.resource()))) {
            throw new AiOAuthException("invalid_target", "The requested resource is not supported.");
        }
        var client = repository.findActiveClient(text(request.clientId()))
            .orElseThrow(() -> new AiOAuthException("unauthorized_client", "OAuth client is not registered."));
        if (!client.redirectUris().contains(text(request.redirectUri()))) {
            throw new AiOAuthException("invalid_request", "Redirect URL is not registered for this client.");
        }
        var scopes = parseScopes(request.scope());
        if (scopes.isEmpty() || !accessTokenService.supportedScopes().containsAll(scopes)) {
            throw new AiOAuthException("invalid_scope", "One or more requested permissions are not supported.");
        }
        return new ValidatedAuthorization(client, scopes);
    }

    private Set<String> parseScopes(String value) {
        if (value == null || value.isBlank() || value.length() > 2048) return Set.of();
        return Arrays.stream(value.trim().split("\\s+"))
            .map(String::trim)
            .filter(scope -> !scope.isBlank())
            .collect(java.util.stream.Collectors.toUnmodifiableSet());
    }

    private void requireDirectMembership(AuthSessionUser user) {
        if (user == null || user.userId() == null || user.companyId() == null || user.userCompanyId() == null) {
            throw new AiOAuthException("access_denied", "A direct active company membership is required.");
        }
    }

    private String redirect(String base, List<QueryParameter> parameters) {
        var separator = base.contains("?") ? "&" : "?";
        var query = parameters.stream()
            .filter(parameter -> parameter.value() != null)
            .map(parameter -> encode(parameter.name()) + "=" + encode(parameter.value()))
            .collect(java.util.stream.Collectors.joining("&"));
        return base + separator + query;
    }

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8).replace("+", "%20");
    }

    private String randomToken() {
        var bytes = new byte[RANDOM_BYTES];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String s256(String verifier) {
        try {
            return Base64.getUrlEncoder().withoutPadding().encodeToString(
                MessageDigest.getInstance("SHA-256").digest(verifier.getBytes(StandardCharsets.US_ASCII))
            );
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is not available.", exception);
        }
    }

    private String sha256Hex(String value) {
        try {
            return HexFormat.of().formatHex(
                MessageDigest.getInstance("SHA-256").digest(text(value).getBytes(StandardCharsets.UTF_8))
            );
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is not available.", exception);
        }
    }

    private boolean constantTimeEquals(String left, String right) {
        return MessageDigest.isEqual(
            text(left).getBytes(StandardCharsets.US_ASCII),
            text(right).getBytes(StandardCharsets.US_ASCII)
        );
    }

    private String text(String value) {
        return value == null ? "" : value.trim();
    }

    private AiOAuthException invalidClientMetadata(String message) {
        return new AiOAuthException("invalid_client_metadata", message);
    }

    private AiOAuthException invalidGrant() {
        return new AiOAuthException("invalid_grant", "Authorization code is invalid, expired, or already used.");
    }

    private AiOAuthException unsupportedGrantType() {
        return new AiOAuthException(
            "unsupported_grant_type",
            "Only authorization_code and refresh_token are supported."
        );
    }

    public record DynamicRegistration(
        String clientName,
        List<String> redirectUris,
        List<String> grantTypes,
        List<String> responseTypes,
        String tokenEndpointAuthMethod
    ) { }

    public record AuthorizationRequest(
        String responseType,
        String clientId,
        String redirectUri,
        String scope,
        String state,
        String codeChallenge,
        String codeChallengeMethod,
        String resource
    ) { }

    public record ConsentContext(String clientName, Set<String> scopes, int expiresInDays, String userName) { }
    public record AuthorizationResult(String redirectUrl) { }
    public record TokenRequest(
        String grantType,
        String code,
        String redirectUri,
        String clientId,
        String codeVerifier,
        String resource,
        String refreshToken,
        String scope
    ) { }
    public record TokenResult(String accessToken, long expiresIn, String scope, String refreshToken) { }
    private record ValidatedAuthorization(AiOAuthRepository.RegisteredClient client, Set<String> scopes) { }
    private record QueryParameter(String name, String value) { }
}
