package com.indice.erp.auth;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(AuthApiController.class)
class AuthApiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private SessionAuthService sessionAuthService;

    @MockBean
    private SessionCsrfService sessionCsrfService;

    @MockBean
    private LoginAuditService loginAuditService;

    @MockBean
    private AuthLockoutService lockoutService;

    @MockBean
    private LoginMfaChallengeService mfaChallengeService;

    @MockBean
    private AuthSecurityProperties securityProperties;

    @BeforeEach
    void allowMvcSliceSessionTimeoutInterceptor() {
        given(sessionAuthService.enforceSessionTimeout(any(), any(LoginAuditContext.class))).willReturn(true);
    }

    @Test
    void meReturnsUnauthorizedWhenSessionIsMissing() throws Exception {
        given(sessionAuthService.currentSession(any())).willReturn(Optional.empty());

        mockMvc.perform(get("/api/v1/auth/me"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.message").value("User is not authenticated"));
    }

    @Test
    void loginRejectsMissingCsrfToken() throws Exception {
        willThrow(new IllegalArgumentException("Invalid CSRF token."))
            .given(sessionCsrfService).requireCsrf(any(), eq(null));

        mockMvc.perform(post("/api/v1/auth/login")
                .contentType(APPLICATION_JSON)
                .content(loginPayload()))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.message").value("Invalid CSRF token."));

        verify(loginAuditService).record(any(LoginAuditEvent.class));
        verifyNoInteractions(sessionAuthService);
    }

    @Test
    void loginStartsMfaChallengeWhenCredentialsAreValid() throws Exception {
        var login = authenticatedLogin();
        given(lockoutService.passwordLockout(eq("demo@example.com"), eq("empresa demo spring")))
            .willReturn(AuthLockoutService.LockoutState.open());
        given(sessionAuthService.verifyLoginCredentials(eq("Empresa Demo Spring"), eq("demo@example.com"), eq("demo123")))
            .willReturn(LoginCredentialVerificationResult.success(login, "demo@example.com", "empresa demo spring"));
        given(securityProperties.isMfaEnabled()).willReturn(true);
        given(securityProperties.isMfaRequired()).willReturn(true);
        given(mfaChallengeService.startChallenge(eq(login), any(), any(LoginAuditContext.class)))
            .willReturn(LoginMfaChallengeService.MfaStartResult.started(
                "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
                "d***@example.com",
                300,
                30
            ));

        mockMvc.perform(post("/api/v1/auth/login")
                .header("X-CSRF-Token", "csrf-token")
                .contentType(APPLICATION_JSON)
                .content(loginPayload()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.mfaRequired").value(true))
            .andExpect(jsonPath("$.challengeId").value("0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"))
            .andExpect(jsonPath("$.maskedDestination").value("d***@example.com"))
            .andExpect(jsonPath("$.expiresInSeconds").value(300))
            .andExpect(jsonPath("$.resendAvailableInSeconds").value(30));

        verify(sessionCsrfService).requireCsrf(any(), eq("csrf-token"));
        verify(loginAuditService).record(any(LoginAuditEvent.class));
    }

    @Test
    void otpVerificationReturnsSessionPayloadWhenCodeIsValid() throws Exception {
        var session = sessionResponse(1L, "Empresa Demo Spring");
        var login = authenticatedLogin();

        given(mfaChallengeService.verify(
            eq("0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"),
            eq("123456"),
            any(),
            any(LoginAuditContext.class)
        )).willReturn(LoginMfaChallengeService.MfaVerifyResult.success(login));
        given(sessionAuthService.currentSession(any())).willReturn(Optional.of(session));
        given(sessionCsrfService.ensureCsrf(any())).willReturn("csrf-token");

        mockMvc.perform(post("/api/v1/auth/login/otp/verify")
                .header("X-CSRF-Token", "csrf-token")
                .contentType(APPLICATION_JSON)
                .content("""
                    {
                      "challengeId": "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
                      "otpCode": "123456"
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
            .andExpect(jsonPath("$.company.name").value("Empresa Demo Spring"))
            .andExpect(jsonPath("$.company.scope.type").value("corporate_office"))
            .andExpect(jsonPath("$.company.subscription.access_allowed").value(true))
            .andExpect(jsonPath("$.companies[0].scope.type").value("corporate_office"))
            .andExpect(jsonPath("$.csrfToken").value("csrf-token"));

        verify(sessionAuthService).storeAuthenticatedSession(any(), eq(login));
        verify(sessionCsrfService).rotateCsrf(any());
    }

    @Test
    void loginLocksAccountAfterTooManyFailedCredentials() throws Exception {
        given(lockoutService.passwordLockout(eq("demo@example.com"), eq("empresa demo spring")))
            .willReturn(AuthLockoutService.LockoutState.open(4));
        given(sessionAuthService.verifyLoginCredentials(eq("Empresa Demo Spring"), eq("demo@example.com"), eq("demo123")))
            .willReturn(LoginCredentialVerificationResult.failure(
                "Invalid company, email, or password.",
                AuthFailureReason.PASSWORD_INVALID,
                "demo@example.com",
                "empresa demo spring",
                1L,
                1L,
                null,
                null
            ));
        given(lockoutService.recordPasswordFailure(any(LoginCredentialVerificationResult.class)))
            .willReturn(new AuthLockoutService.LockoutState(5, java.time.Instant.parse("2026-08-18T20:30:00Z"), true));

        mockMvc.perform(post("/api/v1/auth/login")
                .header("X-CSRF-Token", "csrf-token")
                .contentType(APPLICATION_JSON)
                .content(loginPayload()))
            .andExpect(status().isLocked())
            .andExpect(jsonPath("$.message").value("Invalid login or account temporarily locked."));

        verify(loginAuditService).record(any(LoginAuditEvent.class));
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

    @Test
    void csrfReturnsPublicToken() throws Exception {
        given(sessionCsrfService.ensureCsrf(any())).willReturn("csrf-token");

        mockMvc.perform(get("/api/v1/auth/csrf"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.csrfToken").value("csrf-token"));
    }

    @Test
    void registerRequiresSecurePaymentCheckout() throws Exception {
        mockMvc.perform(post("/api/v1/auth/register")
                .contentType(APPLICATION_JSON)
                .content("""
                    {
                      "fullName": "Ada Owner",
                      "email": "ada@example.com",
                      "password": "securePass123",
                      "companyName": "Ada Studio"
                    }
                    """))
            .andExpect(status().isPaymentRequired())
            .andExpect(jsonPath("$.message").value("Create account is completed through the signup trial flow."));
    }

    @Test
    void logoutRejectsMissingCsrfToken() throws Exception {
        willThrow(new IllegalArgumentException("Invalid CSRF token."))
            .given(sessionCsrfService).requireCsrf(any(), eq(null));

        mockMvc.perform(post("/api/v1/auth/logout"))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.message").value("Invalid CSRF token."));

        verifyNoInteractions(sessionAuthService);
    }

    @Test
    void logoutWithValidCsrfClearsSession() throws Exception {
        mockMvc.perform(post("/api/v1/auth/logout")
                .header("X-CSRF-Token", "csrf-token"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true));

        verify(sessionCsrfService).requireCsrf(any(), eq("csrf-token"));
        verify(sessionAuthService).logout(any());
    }

    private AuthSessionResponse sessionResponse(long companyId, String companyName) {
        var company = new AuthSessionResponse.CompanyInfo(
            companyId,
            companyName,
            10L,
            "admin",
            new AuthSessionResponse.ScopeInfo("corporate_office", null, null),
            true,
            new AuthSessionResponse.SubscriptionInfo("active", "legacy", "", true, "")
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

    private AuthenticatedLogin authenticatedLogin() {
        return new AuthenticatedLogin(
            1L,
            1L,
            10L,
            "Usuario Demo",
            "demo@example.com",
            "Empresa Demo Spring",
            "admin"
        );
    }

    private String loginPayload() {
        return """
            {
              "companyName": "Empresa Demo Spring",
              "email": "demo@example.com",
              "password": "demo123"
            }
            """;
    }
}
