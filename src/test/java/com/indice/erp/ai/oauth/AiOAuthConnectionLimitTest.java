package com.indice.erp.ai.oauth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.indice.erp.ai.access.AiConnectionLimitException;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.auth.SessionCsrfService;
import jakarta.servlet.http.HttpSession;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class AiOAuthConnectionLimitTest {

    private final AiOAuthService service = mock(AiOAuthService.class);
    private final SessionAuthService sessions = mock(SessionAuthService.class);
    private final HttpSession session = mock(HttpSession.class);
    private final AiOAuthApiController controller = new AiOAuthApiController(
        service, sessions, mock(SessionCsrfService.class)
    );

    @BeforeEach
    void setUp() {
        when(sessions.currentUser(session)).thenReturn(Optional.of(new AuthSessionUser(3L, 23L, 41L, "Test", "admin")));
    }

    @Test
    void consentExplainsHowToFreeAConnectionSlot() {
        when(service.consentContext(any(), any())).thenThrow(new AiConnectionLimitException());

        var response = controller.consent(session, "code", "client", "https://chatgpt.com/callback",
            "tasks.read", "state", "challenge", "S256", "https://app.indiceapp.com/api/v1/ai/mcp");

        assertThat(response.getStatusCode().value()).isEqualTo(409);
        assertThat(response.getHeaders().getCacheControl()).isEqualTo("no-store");
        assertThat(((Map<?, ?>) response.getBody()).get("error")).isEqualTo("connection_limit_reached");
        assertThat(((Map<?, ?>) response.getBody()).get("message").toString()).contains("Conectar IA");
    }

    @Test
    void approvalRechecksCapacityInsteadOfRedirectingToAnExchangeThatWillFail() {
        when(service.authorize(any(), any(), eq(true))).thenThrow(new AiConnectionLimitException());

        var response = controller.decide(session, "csrf", new AiOAuthApiController.ConsentDecisionRequest(
            true, "code", "client", "https://chatgpt.com/callback", "tasks.read", "state", "challenge", "S256",
            "https://app.indiceapp.com/api/v1/ai/mcp"
        ));

        assertThat(response.getStatusCode().value()).isEqualTo(409);
        assertThat(((Map<?, ?>) response.getBody()).get("error")).isEqualTo("connection_limit_reached");
    }

    @Test
    void capacityRaceAtExchangeReturnsActionableNonTransientOAuthError() {
        when(service.exchange(any())).thenThrow(new AiConnectionLimitException());

        var response = controller.token(Map.of("grant_type", "authorization_code"));

        assertThat(response.getStatusCode().value()).isEqualTo(400);
        assertThat(((Map<?, ?>) response.getBody()).get("error")).isEqualTo("invalid_grant");
        assertThat(((Map<?, ?>) response.getBody()).get("error_description").toString()).contains("authorize again");
    }

    @Test
    void unrelatedServerFailuresRemainTransientWithoutExposingInternals() {
        when(service.exchange(any())).thenThrow(new IllegalStateException("internal detail"));

        var response = controller.token(Map.of("grant_type", "authorization_code"));

        assertThat(response.getStatusCode().value()).isEqualTo(503);
        assertThat(response.getBody().toString()).doesNotContain("internal detail");
    }
}
