package com.indice.erp.ai.oauth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verifyNoInteractions;

import com.indice.erp.ai.access.AiAccessTokenService;
import com.indice.erp.ai.access.AiConnectionLimitException;
import com.indice.erp.auth.AuthSessionUser;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Base64;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class AiOAuthServiceTest {

    private static final Instant NOW = Instant.parse("2026-09-01T04:00:00Z");
    private static final String RESOURCE = "https://app.indiceapp.com/api/v1/ai/mcp";
    private static final String OPENAI_TUNNEL_RESOURCE =
        "https://tunnel-service.gateway.unified-0.internal.api.openai.org/v1/mcp/"
            + "tunnel_6a9659a73c9c8191bf66f176c8bf6550";
    private static final String REDIRECT = "https://chatgpt.com/connector/oauth/callback";
    private static final String VERIFIER = "indice-verifier-abcdefghijklmnopqrstuvwxyz-0123456789";

    private AiOAuthRepository repository;
    private AiAccessTokenService accessTokenService;
    private AiOAuthService service;
    private AuthSessionUser user;

    @BeforeEach
    void setUp() {
        repository = mock(AiOAuthRepository.class);
        accessTokenService = mock(AiAccessTokenService.class);
        var properties = new AiOAuthProperties();
        properties.setIssuerUrl("https://app.indiceapp.com");
        properties.setResourceUrl(RESOURCE);
        service = new AiOAuthService(
            repository,
            properties,
            accessTokenService,
            Clock.fixed(NOW, ZoneOffset.UTC)
        );
        user = new AuthSessionUser(10L, 20L, 30L, "Nahum", "OWNER");
    }

    @Test
    void rejectsDynamicRegistrationOutsideApprovedChatGptHosts() {
        assertThatThrownBy(() -> service.register(new AiOAuthService.DynamicRegistration(
            "Untrusted client",
            List.of("https://attacker.example/callback"),
            List.of("authorization_code"),
            List.of("code"),
            "none"
        )))
            .isInstanceOf(AiOAuthException.class)
            .hasMessageContaining("approved ChatGPT");
    }

    @Test
    void acceptsChatGptRegistrationWithRefreshTokenRotation() {
        when(repository.registerOrReuse(any(), eq("ChatGPT"), any(), eq(List.of(REDIRECT))))
            .thenReturn(client());

        var registered = service.register(new AiOAuthService.DynamicRegistration(
            "ChatGPT",
            List.of(REDIRECT),
            List.of("authorization_code", "refresh_token"),
            List.of("code"),
            "none"
        ));

        assertThat(registered.clientId()).isEqualTo("client-1");
    }

    @Test
    void validatesTenantConsentWithoutCreatingAConnection() {
        var client = client();
        when(repository.findActiveClient("client-1")).thenReturn(Optional.of(client));
        when(accessTokenService.supportedOAuthScopes()).thenReturn(Set.of(
            "openid", "email", "sales.read", "tasks.create"
        ));

        var context = service.consentContext(user, authorizationRequest("openid email sales.read sales.read tasks.create"));

        assertThat(context.clientName()).isEqualTo("ChatGPT");
        assertThat(context.scopes()).containsExactlyInAnyOrder("openid", "email", "sales.read", "tasks.create");
        assertThat(context.expiresInDays()).isEqualTo(30);
    }

    @Test
    void acceptsOpenAiHostedTunnelResourceForChatGptConnection() {
        when(repository.findActiveClient("client-1")).thenReturn(Optional.of(client()));
        when(accessTokenService.supportedOAuthScopes()).thenReturn(Set.of("sales.read"));

        var context = service.consentContext(user, authorizationRequest("sales.read", OPENAI_TUNNEL_RESOURCE));

        assertThat(context.scopes()).containsExactly("sales.read");
    }

    @Test
    void rejectsLookalikeAndMalformedOpenAiTunnelResources() {
        assertThatThrownBy(() -> service.consentContext(
            user,
            authorizationRequest(
                "sales.read",
                "https://tunnel-service.gateway.unified-0.internal.api.openai.org.attacker.example/"
                    + "v1/mcp/tunnel_6a9659a73c9c8191bf66f176c8bf6550"
            )
        ))
            .isInstanceOf(AiOAuthException.class)
            .hasMessageContaining("resource");

        assertThatThrownBy(() -> service.consentContext(
            user,
            authorizationRequest(
                "sales.read",
                "https://tunnel-service.gateway.unified-0.internal.api.openai.org/v1/mcp/not-a-tunnel"
            )
        ))
            .isInstanceOf(AiOAuthException.class)
            .hasMessageContaining("resource");
    }

    @Test
    void rejectsAnAuthorizationRequestWithOnlyOneIdentityScope() {
        when(repository.findActiveClient("client-1")).thenReturn(Optional.of(client()));

        assertThatThrownBy(() -> service.consentContext(user, authorizationRequest("email sales.read")))
            .isInstanceOf(AiOAuthException.class)
            .hasMessageContaining("permissions");
    }

    @Test
    void exchangesOneTimePkceCodeForExistingDelegatedIndiceToken() {
        var stored = new AiOAuthRepository.StoredAuthorizationCode(
            99L,
            "client-1",
            REDIRECT,
            RESOURCE,
            Set.of("sales.read"),
            challenge(VERIFIER),
            NOW.plusSeconds(120),
            null,
            user
        );
        when(repository.findForUpdate(any())).thenReturn(Optional.of(stored));
        when(repository.findActiveClient("client-1")).thenReturn(Optional.of(client()));
        when(accessTokenService.issueOAuth(eq(user), eq("ChatGPT · ChatGPT"), eq(30), eq(Set.of("sales.read"))))
            .thenReturn(new AiAccessTokenService.IssuedConnection(
                7L, "generic_mcp", "ChatGPT", "idx_ai_visible", Set.of("sales.read"),
                NOW.plusSeconds(3600), NOW, "idx_ai_secret"
            ));

        var result = service.exchange(new AiOAuthService.TokenRequest(
            "authorization_code", "one-time-code", REDIRECT, "client-1", VERIFIER, RESOURCE, null, null
        ));

        assertThat(result.accessToken()).isEqualTo("idx_ai_secret");
        assertThat(result.scope()).isEqualTo("sales.read");
        assertThat(result.refreshToken()).startsWith("idx_oauth_refresh_");
        verify(repository).markAuthorizationCodeUsed(99L, NOW);
        verify(repository).markClientUsed("client-1", NOW);
    }

    @Test
    void exchangesOneTimePkceCodeBoundToOpenAiTunnelResource() {
        var stored = new AiOAuthRepository.StoredAuthorizationCode(
            99L,
            "client-1",
            REDIRECT,
            OPENAI_TUNNEL_RESOURCE,
            Set.of("sales.read"),
            challenge(VERIFIER),
            NOW.plusSeconds(120),
            null,
            user
        );
        when(repository.findForUpdate(any())).thenReturn(Optional.of(stored));
        when(repository.findActiveClient("client-1")).thenReturn(Optional.of(client()));
        when(accessTokenService.issueOAuth(eq(user), eq("ChatGPT · ChatGPT"), eq(30), eq(Set.of("sales.read"))))
            .thenReturn(new AiAccessTokenService.IssuedConnection(
                7L, "generic_mcp", "ChatGPT", "idx_ai_visible", Set.of("sales.read"),
                NOW.plusSeconds(3600), NOW, "idx_ai_secret"
            ));

        var result = service.exchange(new AiOAuthService.TokenRequest(
            "authorization_code", "one-time-code", REDIRECT, "client-1", VERIFIER,
            OPENAI_TUNNEL_RESOURCE, null, null
        ));

        assertThat(result.accessToken()).isEqualTo("idx_ai_secret");
        assertThat(result.refreshToken()).startsWith("idx_oauth_refresh_");
        verify(repository).markAuthorizationCodeUsed(99L, NOW);
    }

    @Test
    void rotatesRefreshAndAccessTokensWithoutExpandingPermissions() {
        var stored = new AiOAuthRepository.StoredRefreshToken(
            88L,
            "client-1",
            7L,
            RESOURCE,
            Set.of("sales.read", "tasks.create"),
            NOW.plusSeconds(3600),
            null,
            user
        );
        when(repository.findRefreshForUpdate(any())).thenReturn(Optional.of(stored));
        when(accessTokenService.rotateOAuth(eq(user), eq(7L), eq(30), eq(Set.of("sales.read"))))
            .thenReturn(new AiAccessTokenService.IssuedConnection(
                7L, "generic_mcp", "ChatGPT", "idx_ai_rotated", Set.of("sales.read"),
                NOW.plusSeconds(3600), NOW, "idx_ai_new_secret"
            ));

        var result = service.exchange(new AiOAuthService.TokenRequest(
            "refresh_token", null, null, "client-1", null, RESOURCE,
            "idx_oauth_refresh_old", "sales.read"
        ));

        assertThat(result.accessToken()).isEqualTo("idx_ai_new_secret");
        assertThat(result.scope()).isEqualTo("sales.read");
        assertThat(result.refreshToken()).startsWith("idx_oauth_refresh_");
        verify(repository).markRefreshUsed(88L, NOW);
        verify(repository).markClientUsed("client-1", NOW);
    }

    @Test
    void rotatesRefreshTokenBoundToOpenAiTunnelResource() {
        var stored = new AiOAuthRepository.StoredRefreshToken(
            88L,
            "client-1",
            7L,
            OPENAI_TUNNEL_RESOURCE,
            Set.of("sales.read"),
            NOW.plusSeconds(3600),
            null,
            user
        );
        when(repository.findRefreshForUpdate(any())).thenReturn(Optional.of(stored));
        when(accessTokenService.rotateOAuth(eq(user), eq(7L), eq(30), eq(Set.of("sales.read"))))
            .thenReturn(new AiAccessTokenService.IssuedConnection(
                7L, "generic_mcp", "ChatGPT", "idx_ai_rotated", Set.of("sales.read"),
                NOW.plusSeconds(3600), NOW, "idx_ai_new_secret"
            ));

        var result = service.exchange(new AiOAuthService.TokenRequest(
            "refresh_token", null, null, "client-1", null, OPENAI_TUNNEL_RESOURCE,
            "idx_oauth_refresh_old", null
        ));

        assertThat(result.accessToken()).isEqualTo("idx_ai_new_secret");
        verify(repository).markRefreshUsed(88L, NOW);
    }

    @Test
    void rejectsTokenExchangeForAnotherResource() {
        assertThatThrownBy(() -> service.exchange(new AiOAuthService.TokenRequest(
            "authorization_code", "code", REDIRECT, "client-1", VERIFIER,
            "https://other.example/mcp", null, null
        )))
            .isInstanceOf(AiOAuthException.class)
            .hasMessageContaining("resource");
    }

    @Test
    void rejectsTokenExchangeWhenResourceDiffersFromAuthorizedTunnel() {
        var stored = new AiOAuthRepository.StoredAuthorizationCode(
            99L,
            "client-1",
            REDIRECT,
            OPENAI_TUNNEL_RESOURCE,
            Set.of("sales.read"),
            challenge(VERIFIER),
            NOW.plusSeconds(120),
            null,
            user
        );
        when(repository.findForUpdate(any())).thenReturn(Optional.of(stored));

        assertThatThrownBy(() -> service.exchange(new AiOAuthService.TokenRequest(
            "authorization_code", "one-time-code", REDIRECT, "client-1", VERIFIER,
            "https://tunnel-service.gateway.unified-0.internal.api.openai.org/v1/mcp/"
                + "tunnel_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            null, null
        )))
            .isInstanceOf(AiOAuthException.class)
            .hasMessageContaining("invalid");
    }

    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(strings = { "expired", "used", "client", "resource" })
    void rejectsInvalidRefreshWithoutRotatingAnAccessToken(String scenario) {
        var stored = new AiOAuthRepository.StoredRefreshToken(
            88L, "client-1", 7L, RESOURCE, Set.of("sales.read"),
            scenario.equals("expired") ? NOW : NOW.plusSeconds(3600),
            scenario.equals("used") ? NOW.minusSeconds(1) : null, user
        );
        when(repository.findRefreshForUpdate(any())).thenReturn(Optional.of(stored));
        assertThatThrownBy(() -> service.exchange(new AiOAuthService.TokenRequest(
            "refresh_token", null, null, scenario.equals("client") ? "other-client" : "client-1", null,
            scenario.equals("resource") ? OPENAI_TUNNEL_RESOURCE : RESOURCE, "idx_oauth_refresh_old", null
        ))).isInstanceOf(AiOAuthException.class).hasMessageContaining("invalid");
        verifyNoInteractions(accessTokenService);
        verify(repository, never()).markRefreshUsed(any(Long.class), any());
    }

    @Test
    void rejectsScopeExpansionDuringRefreshWithoutConsumingTheRefreshToken() {
        when(repository.findRefreshForUpdate(any())).thenReturn(Optional.of(new AiOAuthRepository.StoredRefreshToken(
            88L, "client-1", 7L, RESOURCE, Set.of("sales.read"), NOW.plusSeconds(3600), null, user
        )));
        assertThatThrownBy(() -> service.exchange(new AiOAuthService.TokenRequest(
            "refresh_token", null, null, "client-1", null, RESOURCE, "idx_oauth_refresh_old", "sales.read tasks.create"
        ))).isInstanceOf(AiOAuthException.class).hasMessageContaining("cannot add permissions");
        verifyNoInteractions(accessTokenService);
        verify(repository, never()).markRefreshUsed(any(Long.class), any());
    }

    private AiOAuthService.AuthorizationRequest authorizationRequest(String scopes) {
        return authorizationRequest(scopes, RESOURCE);
    }

    @Test
    void checksCapacityBeforeConsentAndBeforeCreatingAnAuthorizationCode() {
        when(repository.findActiveClient("client-1")).thenReturn(Optional.of(client()));
        when(accessTokenService.supportedOAuthScopes()).thenReturn(Set.of("tasks.read"));
        doThrow(new AiConnectionLimitException()).when(accessTokenService).requireAvailableConnection(user);

        assertThatThrownBy(() -> service.consentContext(user, authorizationRequest("tasks.read")))
            .isInstanceOf(AiConnectionLimitException.class);
        assertThatThrownBy(() -> service.authorize(user, authorizationRequest("tasks.read"), true))
            .isInstanceOf(AiConnectionLimitException.class);

        verify(repository, never()).insertAuthorizationCode(any(), any(), any(), any(), any(), any(), any(), any());
        verify(accessTokenService, never()).issueOAuth(any(), any(), any(), any());
    }

    @Test
    void canDeclineConsentEvenWhenConnectionsAreFull() {
        when(repository.findActiveClient("client-1")).thenReturn(Optional.of(client()));
        when(accessTokenService.supportedOAuthScopes()).thenReturn(Set.of("tasks.read"));

        var result = service.authorize(user, authorizationRequest("tasks.read"), false);

        assertThat(result.redirectUrl()).contains("error=access_denied");
        verify(accessTokenService, never()).requireAvailableConnection(any());
        verify(repository, never()).insertAuthorizationCode(any(), any(), any(), any(), any(), any(), any(), any());
    }

    private AiOAuthService.AuthorizationRequest authorizationRequest(String scopes, String resource) {
        return new AiOAuthService.AuthorizationRequest(
            "code", "client-1", REDIRECT, scopes, "state-1", challenge(VERIFIER), "S256", resource
        );
    }

    private AiOAuthRepository.RegisteredClient client() {
        return new AiOAuthRepository.RegisteredClient("client-1", "ChatGPT", List.of(REDIRECT), NOW);
    }

    private String challenge(String verifier) {
        try {
            return Base64.getUrlEncoder().withoutPadding().encodeToString(
                MessageDigest.getInstance("SHA-256").digest(verifier.getBytes(StandardCharsets.US_ASCII))
            );
        } catch (Exception exception) {
            throw new IllegalStateException(exception);
        }
    }
}
