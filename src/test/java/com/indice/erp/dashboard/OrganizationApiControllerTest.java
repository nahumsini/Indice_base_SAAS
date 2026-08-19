package com.indice.erp.dashboard;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.auth.SessionCsrfService;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(OrganizationApiController.class)
class OrganizationApiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private SessionAuthService sessionAuthService;

    @MockBean
    private SessionCsrfService sessionCsrfService;

    @MockBean
    private OrganizationService organizationService;

    @Test
    void modulesReturnsUnauthorizedWhenSessionIsMissing() throws Exception {
        given(sessionAuthService.currentUser(any())).willReturn(Optional.empty());

        mockMvc.perform(get("/api/v1/modules"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.message").value("Unauthorized"));
    }

    @Test
    void modulesRequiresCsrfBeforeListingModules() throws Exception {
        var currentUser = new AuthSessionUser(11L, 7L, "Admin User", "admin");
        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        willThrow(new IllegalArgumentException("Invalid CSRF token."))
            .given(sessionCsrfService)
            .requireCsrf(any(), any());

        mockMvc.perform(get("/api/v1/modules"))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.message").value("Invalid CSRF token."));

        verifyNoInteractions(organizationService);
    }

    @Test
    void modulesUsesSessionUserCompanyAndRole() throws Exception {
        var currentUser = new AuthSessionUser(11L, 7L, "Admin User", "admin");
        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        given(organizationService.listModules(11L, 7L, "admin")).willReturn(List.of(
            new ModuleListItem(
                "config_center",
                "Panel Inicial",
                "Company setup",
                "basic",
                "basic",
                "bi-gear-fill",
                null,
                false,
                false,
                "/modules/config_center/"
            )
        ));

        mockMvc.perform(get("/api/v1/modules").header("X-CSRF-Token", "csrf-token"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].slug").value("config_center"));

        verify(sessionCsrfService).requireCsrf(any(), eq("csrf-token"));
        verify(organizationService).listModules(11L, 7L, "admin");
    }

    @Test
    void publicDemoListsOperationalCatalogWithoutPaidPlan() throws Exception {
        var currentUser = new AuthSessionUser(11L, 7L, "Demo User", "superadmin");
        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        given(sessionAuthService.isPublicDemoSession(any())).willReturn(true);
        given(organizationService.listPublicDemoModules(11L)).willReturn(List.of(
            new ModuleListItem(
                "inventory", "Inventarios", "Demo inventory", "complementary", "demo",
                "bi-box", null, false, false, "/inventory"
            )
        ));

        mockMvc.perform(get("/api/v1/modules").header("X-CSRF-Token", "csrf-token"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].slug").value("inventory"));

        verify(organizationService).listPublicDemoModules(11L);
    }

    @Test
    void unitsReturnsUnauthorizedWhenSessionIsMissing() throws Exception {
        given(sessionAuthService.currentUser(any())).willReturn(Optional.empty());

        mockMvc.perform(get("/api/v1/org/units"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.message").value("Unauthorized"));
    }

    @Test
    void unitsRequiresCsrfBeforeListingUnits() throws Exception {
        var currentUser = new AuthSessionUser(11L, 7L, "Scoped User", "user");
        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        willThrow(new IllegalArgumentException("Invalid CSRF token."))
            .given(sessionCsrfService)
            .requireCsrf(any(), any());

        mockMvc.perform(get("/api/v1/org/units"))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.message").value("Invalid CSRF token."));

        verifyNoInteractions(organizationService);
    }

    @Test
    void unitsUsesScopedSessionUser() throws Exception {
        var currentUser = new AuthSessionUser(11L, 7L, "Scoped User", "user");
        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        given(organizationService.listUnits(currentUser)).willReturn(List.of(
            new OrganizationService.UnitSummary(12L, "North Unit", "", "active")
        ));

        mockMvc.perform(get("/api/v1/org/units").header("X-CSRF-Token", "csrf-token"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.ok").value(true))
            .andExpect(jsonPath("$.items[0].id").value(12))
            .andExpect(jsonPath("$.items[0].name").value("North Unit"));

        verify(sessionCsrfService).requireCsrf(any(), eq("csrf-token"));
        verify(organizationService).listUnits(currentUser);
    }

    @Test
    void businessesRequiresCsrfBeforeListingBusinesses() throws Exception {
        var currentUser = new AuthSessionUser(11L, 7L, "Scoped User", "user");
        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        willThrow(new IllegalArgumentException("Invalid CSRF token."))
            .given(sessionCsrfService)
            .requireCsrf(any(), any());

        mockMvc.perform(get("/api/v1/org/businesses"))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.message").value("Invalid CSRF token."));

        verifyNoInteractions(organizationService);
    }

    @Test
    void businessesUsesScopedSessionUser() throws Exception {
        var currentUser = new AuthSessionUser(11L, 7L, "Scoped User", "user");
        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        given(organizationService.listBusinesses(currentUser)).willReturn(List.of(
            new OrganizationService.BusinessSummary(22L, 12L, "North Biz", "", "", "active")
        ));

        mockMvc.perform(get("/api/v1/org/businesses").header("X-CSRF-Token", "csrf-token"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.ok").value(true))
            .andExpect(jsonPath("$.items[0].id").value(22))
            .andExpect(jsonPath("$.items[0].unitId").value(12))
            .andExpect(jsonPath("$.items[0].name").value("North Biz"));

        verify(sessionCsrfService).requireCsrf(any(), eq("csrf-token"));
        verify(organizationService).listBusinesses(currentUser);
    }
}
