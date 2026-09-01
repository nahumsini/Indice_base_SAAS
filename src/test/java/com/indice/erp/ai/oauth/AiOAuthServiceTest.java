package com.indice.erp.ai.oauth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.indice.erp.ai.access.AiAccessTokenService;
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
    void validatesTenantConsentWithoutCreatingAConnection() {
        var client = client();
        when(repository.findActiveClient("client-1")).thenReturn(Optional.of(client));
        when(accessTokenService.supportedScopes()).thenReturn(Set.of("sales.read", "tasks.create"));

        var context = service.consentContext(user, authorizationRequest("sales.read sales.read tasks.create"));

        assertThat(context.clientName()).isEqualTo("ChatGPT");
        assertThat(context.scopes()).containsExactlyInAnyOrder("sales.read", "tasks.create");
        assertThat(context.expiresInDays()).isEqualTo(30);
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
        when(accessTokenService.issue(eq(user), eq("ChatGPT · ChatGPT"), eq(30), eq(Set.of("sales.read"))))
            .thenReturn(new AiAccessTokenService.IssuedConnection(
                7L, "generic_mcp", "ChatGPT", "idx_ai_visible", Set.of("sales.read"),
                NOW.plusSeconds(3600), NOW, "idx_ai_secret"
            ));

        var result = service.exchange(new AiOAuthService.TokenRequest(
            "authorization_code", "one-time-code", REDIRECT, "client-1", VERIFIER, RESOURCE
        ));

        assertThat(result.accessToken()).isEqualTo("idx_ai_secret");
        assertThat(result.scope()).isEqualTo("sales.read");
        verify(repository).markAuthorizationCodeUsed(99L, NOW);
        verify(repository).markClientUsed("client-1", NOW);
    }

    @Test
    void rejectsTokenExchangeForAnotherResource() {
        assertThatThrownBy(() -> service.exchange(new AiOAuthService.TokenRequest(
            "authorization_code", "code", REDIRECT, "client-1", VERIFIER,
            "https://other.example/mcp"
        )))
            .isInstanceOf(AiOAuthException.class)
            .hasMessageContaining("resource");
    }

    private AiOAuthService.AuthorizationRequest authorizationRequest(String scopes) {
        return new AiOAuthService.AuthorizationRequest(
            "code", "client-1", REDIRECT, scopes, "state-1", challenge(VERIFIER), "S256", RESOURCE
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
