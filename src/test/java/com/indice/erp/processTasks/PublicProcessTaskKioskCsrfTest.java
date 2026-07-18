package com.indice.erp.processTasks;

import com.indice.erp.auth.SessionCsrfService;
import com.indice.erp.kiosk.engine.KioskActionRequest;
import com.indice.erp.kiosk.engine.KioskActionDispatcher;
import com.indice.erp.kiosk.engine.KioskExecutionContext;
import com.indice.erp.kiosk.engine.KioskEngineFeatureFlags;
import com.indice.erp.kiosk.engine.KioskRateLimitService;
import com.indice.erp.processTasks.kiosk.ProcessTaskKioskAdapter;
import com.indice.erp.processTasks.kiosk.ProcessTaskKioskCapabilities;
import com.indice.erp.processTasks.kiosk.PublicProcessTaskKioskApiController;
import com.indice.erp.processTasks.kiosk.PublicProcessTaskKioskCsrf;
import java.util.Map;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.BDDMockito.willThrow;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(PublicProcessTaskKioskApiController.class)
@Import(PublicProcessTaskKioskCsrf.class)
class PublicProcessTaskKioskCsrfTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ProcessTaskKioskAdapter kioskAdapter;

    @MockBean
    private KioskActionDispatcher actionDispatcher;

    @MockBean
    private SessionCsrfService sessionCsrfService;

    @MockBean
    private KioskRateLimitService rateLimitService;

    @MockBean
    private KioskEngineFeatureFlags featureFlags;

    @org.junit.jupiter.api.BeforeEach
    void enableEngine() {
        given(featureFlags.registryEnabled()).willReturn(true);
        given(featureFlags.adapterEnabled(ProcessTaskKioskCapabilities.OWNER_MODULE)).willReturn(true);
    }

    @Test
    void bootstrapReturnsCsrfToken() throws Exception {
        given(sessionCsrfService.ensureCsrf(any())).willReturn("csrf-token");
        given(kioskAdapter.bootstrap(any(KioskExecutionContext.class))).willReturn(Map.of(
            "kiosk", Map.of("id", 11, "name", "Lobby"),
            "auth_methods", java.util.List.of("pin")
        ));

        mockMvc.perform(get("/api/v1/process-tasks/public-kiosk/device-token/bootstrap"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.csrfToken").value("csrf-token"))
            .andExpect(jsonPath("$.kiosk.name").value("Lobby"));
    }

    @ParameterizedTest
    @MethodSource("publicWriteEndpoints")
    void publicWriteEndpointsRequireCsrf(String path, String body) throws Exception {
        willThrow(new IllegalArgumentException("Invalid CSRF token."))
            .given(sessionCsrfService)
            .requireCsrf(any(), any());

        mockMvc.perform(post(path)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.message").value("Invalid CSRF token."));

        verifyNoInteractions(kioskAdapter, actionDispatcher);
    }

    @Test
    void identifyAllowsValidCsrfToken() throws Exception {
        given(actionDispatcher.dispatch(
            any(KioskExecutionContext.class), any(KioskActionRequest.class), any()))
            .willReturn(Map.of("identification_token", "id"));

        mockMvc.perform(post("/api/v1/process-tasks/public-kiosk/device-token/identify")
                .header("X-CSRF-Token", "csrf-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"auth_method\":\"pin\",\"credential_payload\":\"1234\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.identification_token").value("id"));

        then(sessionCsrfService).should().requireCsrf(any(), eq("csrf-token"));
        then(actionDispatcher).should().dispatch(
            argThat(context -> ProcessTaskKioskCapabilities.OWNER_MODULE.equals(context.ownerModule())
                && "device-token".equals(context.accessReference())),
            eq(KioskActionRequest.of(
                ProcessTaskKioskCapabilities.IDENTITY_VERIFY,
                Map.of("auth_method", "pin", "credential_payload", "1234")
            )),
            eq(null)
        );
    }

    @ParameterizedTest
    @MethodSource("successfulPublicActionEndpoints")
    void publicActionRoutesPreserveLegacyStatusAndDelegateToCapability(
            String path,
            String body,
            int expectedStatus,
            String capability,
            Long resourceId) throws Exception {
        given(actionDispatcher.dispatch(
            any(KioskExecutionContext.class), any(KioskActionRequest.class), any()))
            .willReturn(Map.of("contract_marker", capability));

        mockMvc.perform(post(path)
                .header("X-CSRF-Token", "csrf-token")
                .header("Idempotency-Key", "action-123")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().is(expectedStatus))
            .andExpect(jsonPath("$.contract_marker").value(capability));

        then(actionDispatcher).should().dispatch(
            argThat(context -> ProcessTaskKioskCapabilities.OWNER_MODULE.equals(context.ownerModule())
                && "device-token".equals(context.accessReference())),
            argThat(request -> capability.equals(request.capabilityKey())
                && java.util.Objects.equals(resourceId, request.resourceId())),
            eq("action-123")
        );
    }

    @Test
    void unknownKioskRemainsNotFoundOnBootstrap() throws Exception {
        given(kioskAdapter.bootstrap(any(KioskExecutionContext.class)))
            .willThrow(new java.util.NoSuchElementException("Kiosk not found."));

        mockMvc.perform(get("/api/v1/process-tasks/public-kiosk/missing/bootstrap"))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.message").value("Kiosk not found."));
    }

    @Test
    void pinThrottleRemainsTooManyRequests() throws Exception {
        given(actionDispatcher.dispatch(
            any(KioskExecutionContext.class), any(KioskActionRequest.class), any()))
            .willThrow(new IllegalArgumentException("Too many failed PIN attempts. Try again later."));

        mockMvc.perform(post("/api/v1/process-tasks/public-kiosk/device-token/identify")
                .header("X-CSRF-Token", "csrf-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"auth_method\":\"pin\",\"credential_payload\":\"0000\"}"))
            .andExpect(status().isTooManyRequests())
            .andExpect(jsonPath("$.message").value("Too many failed PIN attempts. Try again later."));
    }

    static Stream<Arguments> publicWriteEndpoints() {
        return Stream.of(
            Arguments.of("/api/v1/process-tasks/public-kiosk/device-token/identify",
                    "{\"auth_method\":\"pin\",\"credential_payload\":\"1234\"}"),
            Arguments.of("/api/v1/process-tasks/public-kiosk/device-token/tasks",
                    "{\"identification_token\":\"id\"}"),
            Arguments.of("/api/v1/process-tasks/public-kiosk/device-token/tasks/create",
                    "{\"identification_token\":\"id\",\"title\":\"Task\",\"priority\":\"medium\"}"),
            Arguments.of("/api/v1/process-tasks/public-kiosk/device-token/tasks/11/complete",
                    "{\"identification_token\":\"id\"}"),
            Arguments.of("/api/v1/process-tasks/public-kiosk/device-token/tasks/11/responsible",
                    "{\"identification_token\":\"id\",\"assignedUserCompanyId\":22}"),
            Arguments.of("/api/v1/process-tasks/public-kiosk/device-token/tasks/11/attachments/presign-upload",
                    "{\"identification_token\":\"id\",\"file_name\":\"a.txt\",\"content_type\":\"text/plain\",\"size_bytes\":1}"),
            Arguments.of("/api/v1/process-tasks/public-kiosk/device-token/tasks/11/attachments",
                    "{\"identification_token\":\"id\",\"object_key\":\"x\",\"original_filename\":\"a.txt\"}")
        );
    }

    static Stream<Arguments> successfulPublicActionEndpoints() {
        return Stream.of(
            Arguments.of(
                "/api/v1/process-tasks/public-kiosk/device-token/tasks",
                "{\"identification_token\":\"id\"}",
                200,
                ProcessTaskKioskCapabilities.TASKS_READ,
                null
            ),
            Arguments.of(
                "/api/v1/process-tasks/public-kiosk/device-token/tasks/create",
                "{\"identification_token\":\"id\",\"title\":\"Task\"}",
                201,
                ProcessTaskKioskCapabilities.TASK_CREATE,
                null
            ),
            Arguments.of(
                "/api/v1/process-tasks/public-kiosk/device-token/tasks/11/complete",
                "{\"identification_token\":\"id\"}",
                200,
                ProcessTaskKioskCapabilities.TASK_COMPLETE,
                11L
            ),
            Arguments.of(
                "/api/v1/process-tasks/public-kiosk/device-token/tasks/11/responsible",
                "{\"identification_token\":\"id\",\"assignedUserCompanyId\":22}",
                200,
                ProcessTaskKioskCapabilities.TASK_RESPONSIBLE_ASSIGN,
                11L
            ),
            Arguments.of(
                "/api/v1/process-tasks/public-kiosk/device-token/tasks/11/attachments/presign-upload",
                "{\"identification_token\":\"id\",\"file_name\":\"a.txt\"}",
                200,
                ProcessTaskKioskCapabilities.TASK_ATTACHMENT_PRESIGN,
                11L
            ),
            Arguments.of(
                "/api/v1/process-tasks/public-kiosk/device-token/tasks/11/attachments",
                "{\"identification_token\":\"id\",\"object_key\":\"x\"}",
                201,
                ProcessTaskKioskCapabilities.TASK_ATTACHMENT_REGISTER,
                11L
            )
        );
    }

}
