package com.indice.erp.processTasks;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.auth.SessionCsrfService;
import com.indice.erp.processTasks.kiosk.ProcessTaskKioskApiController;
import com.indice.erp.processTasks.kiosk.ProcessTaskKioskService;
import com.indice.erp.processTasks.projects.ProjectsApiController;
import com.indice.erp.processTasks.projects.ProjectsService;
import com.indice.erp.processTasks.tasks.ProcessTaskAttachmentsApiController;
import com.indice.erp.processTasks.tasks.ProcessTasksApiController;
import com.indice.erp.processTasks.tasks.ProcessTasksService;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Stream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.BDDMockito.willThrow;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest({
    ProcessTasksApiController.class,
    ProcessTaskAttachmentsApiController.class,
    ProjectsApiController.class,
    ProcessTaskKioskApiController.class
})
@Import(ProcessTasksRequestGuard.class)
class ProcessTasksSessionCsrfTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private SessionAuthService sessionAuthService;

    @MockBean
    private SessionCsrfService sessionCsrfService;

    @MockBean
    private ProcessTasksAccessService accessService;

    @MockBean
    private ProcessTasksService processTasksService;

    @MockBean
    private ProjectsService projectsService;

    @MockBean
    private ProcessTaskKioskService kioskService;

    @BeforeEach
    void allowAccess() {
        var currentUser = new AuthSessionUser(1L, 7L, "Usuario Demo", "user");
        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        given(accessService.canAccess(currentUser)).willReturn(true);
    }

    @ParameterizedTest
    @MethodSource("protectedWriteEndpoints")
    void sessionWriteEndpointsRequireCsrf(HttpMethod method, String path, String body) throws Exception {
        willThrow(new IllegalArgumentException("Invalid CSRF token."))
            .given(sessionCsrfService)
            .requireCsrf(any(), any());

        var builder = request(method, path).contentType(MediaType.APPLICATION_JSON);
        if (body != null) {
            builder.content(body);
        }

        mockMvc.perform(builder)
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.message").value("Invalid CSRF token."));

        verifyNoInteractions(processTasksService, projectsService, kioskService);
    }

    @Test
    void taskCreateAllowsValidCsrfToken() throws Exception {
        given(processTasksService.createTask(eq(7L), eq(1L), any())).willReturn(Map.of("id", 11));

        mockMvc.perform(post("/api/v1/process-tasks")
                .header("X-CSRF-Token", "csrf-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"Task\"}"))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id").value(11));

        then(sessionCsrfService).should().requireCsrf(any(), eq("csrf-token"));
    }

    @Test
    void projectCreateAllowsValidCsrfToken() throws Exception {
        given(projectsService.createProject(eq(7L), eq(1L), any())).willReturn(Map.of("id", 12));

        mockMvc.perform(post("/api/v1/projects")
                .header("X-CSRF-Token", "csrf-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Project\"}"))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id").value(12));
    }

    @Test
    void kioskCreateAllowsValidCsrfToken() throws Exception {
        given(kioskService.saveKiosk(eq(7L), eq(1L), eq(null), any())).willReturn(Map.of("id", 13));

        mockMvc.perform(post("/api/v1/process-tasks/kiosks")
                .header("X-CSRF-Token", "csrf-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Kiosk\",\"code\":\"K1\",\"status\":\"active\"}"))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id").value(13));
    }

    static Stream<Arguments> protectedWriteEndpoints() {
        return Stream.of(
            Arguments.of(HttpMethod.POST, "/api/v1/process-tasks", "{\"title\":\"Task\"}"),
            Arguments.of(HttpMethod.PUT, "/api/v1/process-tasks/11", "{\"title\":\"Task\"}"),
            Arguments.of(HttpMethod.DELETE, "/api/v1/process-tasks/11", null),
            Arguments.of(HttpMethod.POST, "/api/v1/process-tasks/11/complete", "{}"),
            Arguments.of(HttpMethod.POST, "/api/v1/process-tasks/11/audit", "{}"),
            Arguments.of(HttpMethod.POST, "/api/v1/process-tasks/11/cancel", null),
            Arguments.of(HttpMethod.POST, "/api/v1/process-tasks/11/attachments/presign-upload",
                    "{\"file_name\":\"a.txt\",\"content_type\":\"text/plain\",\"size_bytes\":1}"),
            Arguments.of(HttpMethod.POST, "/api/v1/process-tasks/11/attachments",
                    "{\"object_key\":\"x\",\"file_name\":\"a.txt\"}"),
            Arguments.of(HttpMethod.DELETE, "/api/v1/process-tasks/11/attachments/22", null),
            Arguments.of(HttpMethod.POST, "/api/v1/projects", "{\"name\":\"Project\"}"),
            Arguments.of(HttpMethod.PUT, "/api/v1/projects/11", "{\"name\":\"Project\"}"),
            Arguments.of(HttpMethod.DELETE, "/api/v1/projects/11", null),
            Arguments.of(HttpMethod.POST, "/api/v1/projects/11/complete", null),
            Arguments.of(HttpMethod.POST, "/api/v1/projects/11/cancel", null),
            Arguments.of(HttpMethod.POST, "/api/v1/process-tasks/kiosks",
                    "{\"name\":\"Kiosk\",\"code\":\"K1\",\"status\":\"active\"}"),
            Arguments.of(HttpMethod.PUT, "/api/v1/process-tasks/kiosks/11",
                    "{\"name\":\"Kiosk\",\"code\":\"K1\",\"status\":\"active\"}"),
            Arguments.of(HttpMethod.DELETE, "/api/v1/process-tasks/kiosks/11", null),
            Arguments.of(HttpMethod.POST, "/api/v1/process-tasks/kiosks/11/rotate-public-access-token", null)
        );
    }
}
