package com.indice.erp.platformadmin;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.auth.SessionCsrfService;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(PlatformAdminApiController.class)
class PlatformAdminApiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private SessionAuthService auth;

    @MockBean
    private SessionCsrfService csrf;

    @MockBean
    private PlatformAdminService service;

    @MockBean
    private CourtesyCodeService courtesyCodes;

    @Test
    void contextRequiresAnAuthenticatedApplicationSession() throws Exception {
        given(auth.currentUser(any())).willReturn(Optional.empty());

        mockMvc.perform(get("/api/v1/platform-admin/context"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.message").value("Unauthorized"));
    }

    @Test
    void platformAuthorityIsIndependentFromTheTenantRole() throws Exception {
        var tenantOwner = new AuthSessionUser(41L, 7L, "Tenant Owner", "owner");
        given(auth.currentUser(any())).willReturn(Optional.of(tenantOwner));
        given(service.context(41L)).willThrow(
            new PlatformAdminForbiddenException("Platform administration access is required.")
        );

        mockMvc.perform(get("/api/v1/platform-admin/context"))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.message").value("Platform administration access is required."));
    }

    @Test
    void platformRootCanGrantAnAuditableCourtesyBenefit() throws Exception {
        var platformRoot = new AuthSessionUser(99L, 7L, "Platform Root", "user");
        given(auth.currentUser(any())).willReturn(Optional.of(platformRoot));
        given(service.grantBenefit(eq(99L), eq(22L), eq("benefit-request-1"), any()))
            .willReturn(Map.of(
                "public_reference", "benefit-1",
                "benefit_type", "SEAT",
                "source_type", "COURTESY",
                "quantity", 2,
                "status", "ACTIVE",
                "permissions", List.of()
            ));

        mockMvc.perform(post("/api/v1/platform-admin/companies/22/benefits")
                .header("X-CSRF-Token", "csrf-test")
                .header("Idempotency-Key", "benefit-request-1")
                .contentType(APPLICATION_JSON)
                .content("""
                    {
                      "benefit_type": "SEAT",
                      "quantity": 2,
                      "source_type": "COURTESY",
                      "reason": "Lifetime courtesy"
                    }
                    """))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.public_reference").value("benefit-1"))
            .andExpect(jsonPath("$.status").value("ACTIVE"));
    }
}
