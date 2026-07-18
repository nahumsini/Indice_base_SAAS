package com.indice.erp.kiosk.api;

import com.indice.erp.auth.SessionCsrfService;
import com.indice.erp.kiosk.engine.KioskAccessLevel;
import com.indice.erp.kiosk.engine.KioskActionDispatcher;
import com.indice.erp.kiosk.engine.KioskAdapterRegistry;
import com.indice.erp.kiosk.engine.KioskCapabilityDescriptor;
import com.indice.erp.kiosk.engine.KioskDefinitionStatus;
import com.indice.erp.kiosk.engine.KioskDispatchResult;
import com.indice.erp.kiosk.engine.KioskEngineFeatureFlags;
import com.indice.erp.kiosk.engine.KioskModuleAdapter;
import com.indice.erp.kiosk.engine.KioskOperationPolicy;
import com.indice.erp.kiosk.engine.KioskRateLimitService;
import com.indice.erp.kiosk.engine.KioskRateLimitType;
import com.indice.erp.kiosk.engine.KioskRegistryService;
import com.indice.erp.kiosk.engine.KioskResolvedDefinition;
import com.indice.erp.kiosk.engine.KioskUnavailableException;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.mock.web.MockHttpSession;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willThrow;
import static org.mockito.Mockito.inOrder;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(KioskPublicV2Controller.class)
@Import({KioskV2ResponseFactory.class, KioskPublicV2ExceptionHandler.class})
class KioskPublicV2ControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private KioskRegistryService kioskRegistry;

    @MockBean
    private KioskAdapterRegistry adapterRegistry;

    @MockBean
    private KioskActionDispatcher dispatcher;

    @MockBean
    private KioskRateLimitService rateLimitService;

    @MockBean
    private SessionCsrfService csrfService;

    @MockBean
    private KioskEngineFeatureFlags featureFlags;

    @MockBean
    private KioskModuleAdapter adapter;

    private KioskResolvedDefinition definition;
    private KioskCapabilityDescriptor identityCapability;

    @BeforeEach
    void setUp() {
        definition = new KioskResolvedDefinition(
            17L, 7L, "PROCESS_TASKS", "task_access", 31L, "TASKS", "Tasks",
            KioskDefinitionStatus.ACTIVE, 2L, 3L, null, KioskAccessLevel.CONTROLLED,
            null, "tokenhint", false, 1, 1);
        identityCapability = new KioskCapabilityDescriptor(
            "process-tasks.identity.verify", 1, "PROCESS_TASKS", KioskOperationPolicy.DIRECT,
            KioskAccessLevel.CONTROLLED, false, true);
        given(featureFlags.registryEnabled()).willReturn(true);
        given(featureFlags.sessionsEnabled()).willReturn(true);
        given(featureFlags.auditEnabled()).willReturn(true);
        given(featureFlags.adapterEnabled("PROCESS_TASKS")).willReturn(true);
        given(kioskRegistry.resolvePublic("secret-token")).willReturn(definition);
        given(kioskRegistry.resolvePublicForBootstrap("secret-token")).willReturn(definition);
        given(adapterRegistry.requireAdapter("PROCESS_TASKS")).willReturn(adapter);
        given(adapter.capabilities()).willReturn(Set.of(identityCapability));
        given(adapter.capabilities(any(KioskResolvedDefinition.class)))
            .willReturn(Set.of(identityCapability));
    }

    @Test
    void bootstrapUsesNormalizedContractAndEmitsCsrf() throws Exception {
        given(csrfService.ensureCsrf(any())).willReturn("csrf-token");
        given(adapter.bootstrap(any())).willReturn(Map.of("kiosk", Map.of("name", "Tasks")));

        mockMvc.perform(get("/api/v2/kiosks/public/secret-token/bootstrap")
                .header("X-Request-ID", "request-17"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.kiosk.name").value("Tasks"))
            .andExpect(jsonPath("$.data.csrfToken").value("csrf-token"))
            .andExpect(jsonPath("$.data.accessLevel").value("CONTROLLED"))
            .andExpect(jsonPath("$.meta.requestId").value("request-17"));
    }

    @Test
    void bootstrapRateLimitRunsBeforeCapabilitySynchronizationWrites() throws Exception {
        given(csrfService.ensureCsrf(any())).willReturn("csrf-token");
        given(adapter.bootstrap(any())).willReturn(Map.of());

        mockMvc.perform(get("/api/v2/kiosks/public/secret-token/bootstrap"))
            .andExpect(status().isOk());

        var order = inOrder(rateLimitService, kioskRegistry);
        order.verify(rateLimitService).requireAllowed(
            eq(KioskRateLimitType.BOOTSTRAP), any(), any());
        order.verify(kioskRegistry).synchronizeCapabilities(eq(definition), any());
    }

    @Test
    void capabilitiesAreVersionedAndNormalized() throws Exception {
        given(kioskRegistry.capabilityEnabled(17L, identityCapability)).willReturn(true);

        mockMvc.perform(get("/api/v2/kiosks/public/secret-token/capabilities"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.items[0].versionedKey")
                .value("process-tasks.identity.verify@1"))
            .andExpect(jsonPath("$.data.items[0].accessLevel").value("CONTROLLED"));
    }

    @Test
    void invalidAndRevokedTokensShareTheSamePublicError() throws Exception {
        given(kioskRegistry.resolvePublicForBootstrap("invalid-token"))
            .willThrow(new KioskUnavailableException());

        mockMvc.perform(get("/api/v2/kiosks/public/invalid-token/bootstrap"))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.error.code").value("KIOSK_NOT_AVAILABLE"))
            .andExpect(jsonPath("$.error.retryable").value(false));
    }

    @Test
    void sessionCommandsRequireBrowserCsrf() throws Exception {
        willThrow(new IllegalArgumentException("Invalid CSRF token."))
            .given(csrfService).requireCsrf(any(), any());

        mockMvc.perform(post("/api/v2/kiosks/public/secret-token/sessions")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.error.code").value("KIOSK_ACTION_NOT_ALLOWED"));
    }

    @Test
    void actionResponseIncludesCanonicalSessionAndCapabilityMetadata() throws Exception {
        given(dispatcher.dispatchWithMetadata(any(), any(), any())).willReturn(
            new KioskDispatchResult(
                Map.of("task", Map.of("id", 91L)),
                "session-17",
                "process-tasks.task.complete@1"
            )
        );

        mockMvc.perform(post("/api/v2/kiosks/public/secret-token/actions/process-tasks.task.complete@1")
                .header("X-CSRF-Token", "csrf-token")
                .header("Idempotency-Key", "complete-91")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"resource_id\":91,\"kiosk_session_token\":\"identity-token\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.task.id").value(91))
            .andExpect(jsonPath("$.meta.kioskSessionId").value("session-17"))
            .andExpect(jsonPath("$.meta.capability").value("process-tasks.task.complete@1"));
    }

    @Test
    void expiredPinChallengeIsRejectedWithoutCallingTheAdapter() throws Exception {
        var browserSession = new MockHttpSession();
        browserSession.setAttribute("kiosk.v2.challenge.expired", new long[] {17L, 1L});

        mockMvc.perform(post("/api/v2/kiosks/public/secret-token/sessions/expired/verify-pin")
                .session(browserSession)
                .header("X-CSRF-Token", "csrf-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"pin\":\"1234\"}"))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.error.code").value("KIOSK_ACTION_NOT_ALLOWED"));
    }
}
