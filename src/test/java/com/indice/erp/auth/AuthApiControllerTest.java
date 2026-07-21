package com.indice.erp.auth;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.mock.web.MockHttpSession;

@WebMvcTest(AuthApiController.class)
class AuthApiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private SessionAuthService sessionAuthService;

    @MockBean
    private SessionCsrfService sessionCsrfService;

    @Test
    void meReturnsUnauthorizedWhenSessionIsMissing() throws Exception {
        given(sessionAuthService.currentSession(any())).willReturn(Optional.empty());

        mockMvc.perform(get("/api/v1/auth/me"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.message").value("User is not authenticated"));
    }

    @Test
    void loginReturnsSessionPayloadWhenCredentialsAreValid() throws Exception {
        var session = sessionResponse(1L, "Empresa Demo");

        given(sessionAuthService.loginJson(eq("demo@example.com"), eq("demo123"), any(), any(LoginAuditContext.class)))
            .willReturn(new LoginAttemptResult(true, ""));
        given(sessionAuthService.currentSession(any())).willReturn(Optional.of(session));
        given(sessionCsrfService.ensureCsrf(any())).willReturn("csrf-token");

        mockMvc.perform(post("/api/v1/auth/login")
                .contentType(APPLICATION_JSON)
                .content("""
                    {
                      "email": "demo@example.com",
                      "password": "demo123"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.user.id").value(1))
            .andExpect(jsonPath("$.user.name").value("Usuario Demo"))
            .andExpect(jsonPath("$.user.role").value("admin"))
            .andExpect(jsonPath("$.user.module_slugs[0]").value("config_center"))
            .andExpect(jsonPath("$.user.tab_permission_keys[0]").value("config_center.users"))
            .andExpect(jsonPath("$.user.tab_permissions_configured").value(true))
            .andExpect(jsonPath("$.company.id").value(1))
            .andExpect(jsonPath("$.company.name").value("Empresa Demo"))
            .andExpect(jsonPath("$.companies[0].scope.type").value("corporate_office"))
            .andExpect(jsonPath("$.csrfToken").value("csrf-token"));
    }

    @Test
    void switchCompanyRotatesSessionSecurityAndReturnsTheNewContext() throws Exception {
        var httpSession = new MockHttpSession();
        var response = sessionResponse(9L, "Empresa Dos");
        given(sessionAuthService.switchActiveCompany(any(), eq(9L))).willReturn(true);
        given(sessionAuthService.currentSession(any())).willReturn(Optional.of(response));
        given(sessionCsrfService.ensureCsrf(any())).willReturn("rotated-csrf");

        mockMvc.perform(post("/api/v1/auth/company")
                .session(httpSession)
                .header("X-CSRF-Token", "current-csrf")
                .contentType(APPLICATION_JSON)
                .content("""
                    { "company_id": 9 }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.company.id").value(9))
            .andExpect(jsonPath("$.company.name").value("Empresa Dos"))
            .andExpect(jsonPath("$.csrfToken").value("rotated-csrf"));

        verify(sessionCsrfService).requireCsrf(any(), eq("current-csrf"));
        verify(sessionCsrfService).rotateCsrf(any());
    }

    @Test
    void switchCompanyRejectsACompanyWithoutAnActiveMembership() throws Exception {
        given(sessionAuthService.switchActiveCompany(any(), eq(99L))).willReturn(false);

        mockMvc.perform(post("/api/v1/auth/company")
                .header("X-CSRF-Token", "current-csrf")
                .contentType(APPLICATION_JSON)
                .content("""
                    { "company_id": 99 }
                    """))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.message").value("The requested company is not available for this session."));
    }

    private AuthSessionResponse sessionResponse(long companyId, String companyName) {
        var company = new AuthSessionResponse.CompanyInfo(
            companyId,
            companyName,
            10L,
            "admin",
            new AuthSessionResponse.ScopeInfo("corporate_office", null, null),
            true
        );
        return new AuthSessionResponse(
            new AuthSessionResponse.UserInfo(
                1L,
                "Usuario Demo",
                "admin",
                List.of("config_center"),
                List.of("config_center.users"),
                true
            ),
            company,
            List.of(company)
        );
    }
}
