package com.indice.erp.ai.access;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.indice.erp.auth.AuthSessionUser;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;

@ExtendWith(MockitoExtension.class)
class AiAccessVerificationApiControllerTest {

    private static final String AUTHORIZATION = "Bearer idx_ai_abcdefghijklmnopqrstuvwxyz1234567890";
    private static final AuthSessionUser USER = new AuthSessionUser(3L, 23L, 41L, "Reader", "user");
    private static final AiAccessTokenRepository.StoredToken TOKEN =
        new AiAccessTokenRepository.StoredToken(91L, USER, Set.of(AiAccessTokenService.TASKS_READ));

    @Mock private AiAccessTokenService tokenService;
    @Mock private AiToolCapabilityService capabilityService;

    private AiAccessVerificationApiController controller;

    @BeforeEach
    void setUp() {
        controller = new AiAccessVerificationApiController(tokenService, capabilityService);
    }

    @Test
    void returnsNoStoreCapabilityManifestWithoutTokenDetails() {
        when(tokenService.authenticate(AUTHORIZATION)).thenReturn(Optional.of(TOKEN));
        when(capabilityService.allowedTools(TOKEN)).thenReturn(List.of("get_task_detail", "list_tasks"));

        var response = controller.capabilities(AUTHORIZATION);
        var body = assertInstanceOf(AiToolCapabilitiesResponse.class, response.getBody());

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("no-store", response.getHeaders().getCacheControl());
        assertEquals("v1", body.version());
        assertEquals(List.of("get_task_detail", "list_tasks"), body.tools());
    }

    @Test
    void rejectsInvalidTokenBeforeResolvingCapabilities() {
        when(tokenService.authenticate(AUTHORIZATION)).thenReturn(Optional.empty());

        var response = controller.capabilities(AUTHORIZATION);

        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        assertEquals("no-store", response.getHeaders().getCacheControl());
        assertEquals("Bearer realm=\"indice-ai\", error=\"invalid_token\"",
            response.getHeaders().getFirst(HttpHeaders.WWW_AUTHENTICATE));
        verifyNoInteractions(capabilityService);
    }

    @Test
    void preservesTheExistingVerificationContract() {
        when(tokenService.authenticate(AUTHORIZATION)).thenReturn(Optional.of(TOKEN));

        var response = controller.verify(AUTHORIZATION);

        assertEquals(HttpStatus.NO_CONTENT, response.getStatusCode());
        assertNull(response.getBody());
        verifyNoInteractions(capabilityService);
    }
}
