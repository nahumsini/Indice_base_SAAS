package com.indice.erp.sales;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willThrow;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.auth.SessionCsrfService;
import com.indice.erp.sales.MetaLeadImportDtos.ImportResponse;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(MetaLeadImportApiController.class)
class MetaLeadImportApiControllerTest {

    private static final AuthSessionUser CURRENT_USER = new AuthSessionUser(5L, 7L, 9L, "Owner", "admin");

    @Autowired MockMvc mockMvc;
    @MockBean SessionAuthService sessionAuthService;
    @MockBean SessionCsrfService sessionCsrfService;
    @MockBean MetaLeadImportService importService;

    @BeforeEach
    void authenticate() {
        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(CURRENT_USER));
    }

    @Test
    void importsThroughTheAuthenticatedTenantContract() throws Exception {
        given(importService.importLeads(any(), any()))
                .willReturn(new ImportResponse(4, 2, 1, 1, 0, List.of()));

        mockMvc.perform(post("/api/v1/sales/meta-leads/import")
                        .header("X-CSRF-Token", "csrf-token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"pageId\":\"123456\",\"accessToken\":\"token-that-is-long-enough\",\"maxLeads\":100}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.downloaded").value(4))
                .andExpect(jsonPath("$.imported").value(2));
    }

    @Test
    void rejectsMutationWithoutCsrfBeforeCallingTheImportService() throws Exception {
        willThrow(new IllegalArgumentException("Invalid CSRF token."))
                .given(sessionCsrfService).requireCsrf(any(), any());

        mockMvc.perform(post("/api/v1/sales/meta-leads/import")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"pageId\":\"123456\",\"accessToken\":\"token-that-is-long-enough\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("INVALID_CSRF"));

        verifyNoInteractions(importService);
    }

    @Test
    void returnsSanitizedProviderErrorsWithoutEchoingTheToken() throws Exception {
        given(importService.importLeads(any(), any())).willThrow(new MetaLeadIntegrationException(
                "META_ACCESS_DENIED",
                org.springframework.http.HttpStatus.BAD_GATEWAY,
                "Meta denied access."));

        mockMvc.perform(post("/api/v1/sales/meta-leads/import")
                        .header("X-CSRF-Token", "csrf-token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"pageId\":\"123456\",\"accessToken\":\"token-that-must-not-be-returned\"}"))
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.code").value("META_ACCESS_DENIED"))
                .andExpect(jsonPath("$.message").value("Meta denied access."));
    }
}
