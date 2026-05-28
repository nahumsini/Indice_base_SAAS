package com.indice.erp.processTasks;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.auth.SessionCsrfService;
import com.indice.erp.processTasks.processes.ProcessesApiController;
import com.indice.erp.processTasks.processes.ProcessesService;
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
import static org.mockito.BDDMockito.willThrow;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ProcessesApiController.class)
@Import(ProcessTasksRequestGuard.class)
class ProcessesApiControllerCsrfTest {

    private static final AuthSessionUser CURRENT_USER = new AuthSessionUser(1L, 7L, "Usuario Demo", "user");

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private SessionAuthService sessionAuthService;

    @MockBean
    private SessionCsrfService sessionCsrfService;

    @MockBean
    private ProcessTasksAccessService processTasksAccessService;

    @MockBean
    private ProcessesService processesService;

    @BeforeEach
    void allowProcessAccess() {
        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(CURRENT_USER));
        given(processTasksAccessService.canAccess(CURRENT_USER)).willReturn(true);
    }

    @ParameterizedTest
    @MethodSource("mutatingProcessRequests")
    void mutatingProcessEndpointsRequireCsrf(HttpMethod method, String path, String body) throws Exception {
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

        verifyNoInteractions(processesService);
    }

    @Test
    void createProcessAllowsValidCsrfToken() throws Exception {
        given(processesService.createProcess(eq(7L), eq(1L), eq("Usuario Demo"), any())).willReturn(Map.of(
            "id", 11,
            "title", "Weekly Audit"
        ));

        mockMvc.perform(
            post("/api/v1/processes")
                .header("X-CSRF-Token", "csrf-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "title": "Weekly Audit"
                    }
                    """)
        )
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id").value(11))
            .andExpect(jsonPath("$.title").value("Weekly Audit"));
    }

    private static Stream<Arguments> mutatingProcessRequests() {
        return Stream.of(
            Arguments.of(HttpMethod.POST, "/api/v1/processes", """
                {
                  "title": "Weekly Audit"
                }
                """),
            Arguments.of(HttpMethod.PUT, "/api/v1/processes/11", """
                {
                  "title": "Weekly Audit Updated"
                }
                """),
            Arguments.of(HttpMethod.DELETE, "/api/v1/processes/11", null),
            Arguments.of(HttpMethod.POST, "/api/v1/processes/11/materialize", null)
        );
    }
}
