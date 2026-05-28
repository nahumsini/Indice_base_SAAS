package com.indice.erp.processTasks;

import com.indice.erp.auth.SessionCsrfService;
import com.indice.erp.processTasks.kiosk.ProcessTaskKioskService;
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
    private ProcessTaskKioskService kioskService;

    @MockBean
    private SessionCsrfService sessionCsrfService;

    @Test
    void bootstrapReturnsCsrfToken() throws Exception {
        given(sessionCsrfService.ensureCsrf(any())).willReturn("csrf-token");
        given(kioskService.publicBootstrap("device-token")).willReturn(Map.of(
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

        verifyNoInteractions(kioskService);
    }

    @Test
    void identifyAllowsValidCsrfToken() throws Exception {
        given(kioskService.publicIdentify(eq("device-token"), any())).willReturn(Map.of("identification_token", "id"));

        mockMvc.perform(post("/api/v1/process-tasks/public-kiosk/device-token/identify")
                .header("X-CSRF-Token", "csrf-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"auth_method\":\"pin\",\"credential_payload\":\"1234\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.identification_token").value("id"));

        then(sessionCsrfService).should().requireCsrf(any(), eq("csrf-token"));
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
}
