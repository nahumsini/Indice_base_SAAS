package com.indice.erp.platformadmin;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.auth.SessionCsrfService;
import com.indice.erp.consulting.ConsultingAdministrationService;
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
    private PlatformAccountProvisioningService accountProvisioning;

    @MockBean
    private CourtesyCodeService courtesyCodes;

    @MockBean
    private ConsultingAdministrationService consulting;

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
    void platformRootCanReadTheCommercialAdministrationConsole() throws Exception {
        var platformRoot = new AuthSessionUser(99L, 7L, "Platform Root", "user");
        given(auth.currentUser(any())).willReturn(Optional.of(platformRoot));
        given(service.billing(99L, 100)).willReturn(Map.of(
            "totals", Map.of("paid_cents", 10900),
            "invoices", List.of(Map.of("invoice_id", "in_test_1001", "status", "paid"))
        ));
        given(service.catalog(99L)).willReturn(Map.of(
            "versions", List.of(Map.of("version_code", "launch-v1", "status", "ACTIVE")),
            "products", List.of(Map.of("product_code", "HR_CORE"))
        ));
        given(service.modules(99L)).willReturn(Map.of(
            "modules", List.of(Map.of("module_code", "human-resources", "lifecycle_status", "ACTIVE"))
        ));
        given(service.audit(99L, 100)).willReturn(Map.of(
            "events", List.of(Map.of("action", "BENEFIT_GRANTED", "outcome", "SUCCESS"))
        ));

        mockMvc.perform(get("/api/v1/platform-admin/billing"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.totals.paid_cents").value(10900))
            .andExpect(jsonPath("$.invoices[0].invoice_id").value("in_test_1001"));

        mockMvc.perform(get("/api/v1/platform-admin/catalog"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.versions[0].version_code").value("launch-v1"))
            .andExpect(jsonPath("$.products[0].product_code").value("HR_CORE"));

        mockMvc.perform(get("/api/v1/platform-admin/modules"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.modules[0].module_code").value("human-resources"));

        mockMvc.perform(get("/api/v1/platform-admin/audit"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.events[0].action").value("BENEFIT_GRANTED"));
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

    @Test
    void platformRootCanCreateAProvisionedCompanyAccount() throws Exception {
        var platformRoot = new AuthSessionUser(99L, 7L, "Platform Root", "root");
        given(auth.currentUser(any())).willReturn(Optional.of(platformRoot));
        given(accountProvisioning.create(eq(99L), eq("account-request-1"), any()))
            .willReturn(Map.of(
                "company_id", 44L,
                "company_name", "Demo Norte",
                "owner_user_id", 88L,
                "owner_email", "demo.norte@example.com",
                "replayed", false
            ));

        mockMvc.perform(post("/api/v1/platform-admin/companies")
                .header("X-CSRF-Token", "csrf-test")
                .header("Idempotency-Key", "account-request-1")
                .contentType(APPLICATION_JSON)
                .content("""
                    {
                      "company_name": "Demo Norte",
                      "owner_email": "demo.norte@example.com",
                      "temporary_password": "DemoSegura2026!",
                      "country_code": "MX",
                      "product_codes": ["hr"],
                      "access_days": 30
                    }
                    """))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.company_id").value(44L))
            .andExpect(jsonPath("$.owner_email").value("demo.norte@example.com"));
    }

    @Test
    void platformRootCanChangeGlobalModuleAvailability() throws Exception {
        var platformRoot = new AuthSessionUser(99L, 7L, "Platform Root", "user");
        given(auth.currentUser(any())).willReturn(Optional.of(platformRoot));
        given(service.updateModuleAvailability(eq(99L), eq(12L), any()))
            .willReturn(Map.of(
                "id", 12L,
                "slug", "maintenance",
                "name", "Mantenimiento",
                "is_active", false,
                "changed", true,
                "global_effect", true,
                "assignments_preserved", true
            ));

        mockMvc.perform(patch("/api/v1/platform-admin/modules/12/availability")
                .header("X-CSRF-Token", "csrf-test")
                .contentType(APPLICATION_JSON)
                .content("""
                    {
                      "active": false,
                      "reason": "Temporary global maintenance"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.slug").value("maintenance"))
            .andExpect(jsonPath("$.is_active").value(false))
            .andExpect(jsonPath("$.global_effect").value(true))
            .andExpect(jsonPath("$.assignments_preserved").value(true));
    }

    @Test
    void platformRootCanReadAndConfirmConsultingRequests() throws Exception {
        var platformRoot = new AuthSessionUser(99L, 7L, "Platform Root", "user");
        given(auth.currentUser(any())).willReturn(Optional.of(platformRoot));
        given(consulting.workspace(99L)).willReturn(Map.of(
            "totals", Map.of("requested", 1),
            "appointments", List.of(Map.of("id", 42L, "status", "REQUESTED")),
            "locations", List.of()
        ));
        given(consulting.updateAppointment(eq(99L), eq(42L), any()))
            .willReturn(Map.of("id", 42L, "status", "CONFIRMED", "consultant_name", "Consultor Índice"));

        mockMvc.perform(get("/api/v1/platform-admin/consulting"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.appointments[0].status").value("REQUESTED"));

        mockMvc.perform(patch("/api/v1/platform-admin/consulting/appointments/42")
                .header("X-CSRF-Token", "csrf-test")
                .contentType(APPLICATION_JSON)
                .content("""
                    {
                      "status": "CONFIRMED",
                      "confirmedStartAt": "2026-08-15T16:00:00Z",
                      "meetingUrl": "https://meet.example.com/indice-42",
                      "consultantName": "Consultor Índice",
                      "consultantEmail": "consultor@indiceapp.com",
                      "paymentStatus": "INCLUDED",
                      "currency": "USD"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("CONFIRMED"));
    }
}
