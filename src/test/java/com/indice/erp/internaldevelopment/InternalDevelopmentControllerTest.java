package com.indice.erp.internaldevelopment;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.auth.SessionCsrfService;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(InternalDevelopmentController.class)
class InternalDevelopmentControllerTest {

    @Autowired private MockMvc mockMvc;
    @MockBean private SessionAuthService auth;
    @MockBean private SessionCsrfService csrf;
    @MockBean private InternalDevelopmentService service;

    @Test
    void workspaceRejectsAnonymousRequests() throws Exception {
        given(auth.currentUser(any())).willReturn(Optional.empty());

        mockMvc.perform(get("/api/v1/platform-admin/internal-development"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void createRequiresCsrfAndUsesAuthenticatedActor() throws Exception {
        var actor = new AuthSessionUser(99L, 1L, "Root", "root");
        given(auth.currentUser(any())).willReturn(Optional.of(actor));

        mockMvc.perform(post("/api/v1/platform-admin/internal-development")
                .header("X-CSRF-Token", "csrf-token")
                .contentType("application/json")
                .content("""
                    {
                      "entryType": "CONTRIBUTION",
                      "area": "DEVELOPMENT",
                      "status": "RECORDED",
                      "title": "API de trazabilidad",
                      "summary": "Se cerró la primera versión.",
                      "eventAt": "2026-08-28T20:00:00Z",
                      "ownerUserId": 99,
                      "participantUserIds": [99]
                    }
                    """))
            .andExpect(status().isCreated());

        verify(csrf).requireCsrf(any(), eq("csrf-token"));
        verify(service).create(eq(99L), any());
    }
}
