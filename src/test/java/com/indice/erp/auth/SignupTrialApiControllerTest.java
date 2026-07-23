package com.indice.erp.auth;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willThrow;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.servlet.http.HttpSession;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(value = SignupTrialApiController.class, properties = "app.billing.signup.internal-trial-enabled=true")
class SignupTrialApiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private SessionAuthService sessionAuthService;

    @MockBean
    private SessionCsrfService sessionCsrfService;

    @MockBean
    private SignupTrialService signupTrialService;

    @Test
    void startTrialRequiresCsrf() throws Exception {
        willThrow(new IllegalArgumentException("Invalid CSRF token."))
            .given(sessionCsrfService).requireCsrf(any(HttpSession.class), any());

        mockMvc.perform(post("/api/v1/auth/signup/trial")
                .contentType(APPLICATION_JSON)
                .content(validPayload()))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.message").value("Invalid CSRF token."));
    }

    @Test
    void startTrialReturnsAuthenticatedSession() throws Exception {
        given(sessionCsrfService.ensureCsrf(any())).willReturn("csrf-token");
        given(sessionAuthService.currentSession(any())).willReturn(Optional.of(session()));

        mockMvc.perform(post("/api/v1/auth/signup/trial")
                .header("X-CSRF-Token", "csrf-token")
                .contentType(APPLICATION_JSON)
                .content(validPayload()))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.user.role").value("superadmin"))
            .andExpect(jsonPath("$.company.subscription.status").value("trialing"))
            .andExpect(jsonPath("$.csrfToken").value("csrf-token"));
    }

    private AuthSessionResponse session() {
        return new AuthSessionResponse(
            new AuthSessionResponse.UserInfo(10L, "Ada Owner", "superadmin", List.of("config_center"), List.of(), false),
            new AuthSessionResponse.CompanyInfo(
                20L,
                "Ada Studio",
                30L,
                "superadmin",
                new AuthSessionResponse.ScopeInfo("corporate_office", null, null),
                true,
                new AuthSessionResponse.SubscriptionInfo("trialing", "all-modules", "2026-07-15T00:00:00Z", true, "")
            ),
            List.of(new AuthSessionResponse.CompanyInfo(
                20L,
                "Ada Studio",
                30L,
                "superadmin",
                new AuthSessionResponse.ScopeInfo("corporate_office", null, null),
                true,
                new AuthSessionResponse.SubscriptionInfo("trialing", "all-modules", "2026-07-15T00:00:00Z", true, "")
            ))
        );
    }

    private String validPayload() {
        return """
            {
              "fullName": "Ada Owner",
              "email": "ada@example.com",
              "password": "securePass123",
              "companyName": "Ada Studio",
              "industry": "retail",
              "companySize": "1-5",
              "country": "US",
              "phone": "+15555550123",
              "planId": "all-modules",
              "moduleCount": 7,
              "extraCollaborators": 0,
              "selectedModuleSlugs": ["human_resources", "expenses", "petty_cash", "pos", "crm", "processes", "kpis"]
            }
            """;
    }
}
