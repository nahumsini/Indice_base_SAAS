package com.indice.erp.platformadmin;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willThrow;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.auth.SessionCsrfService;
import com.indice.erp.config.AppWebProperties;
import com.indice.erp.configcenter.InvitationEmailResult;
import com.indice.erp.configcenter.InvitationEmailService;
import com.indice.erp.consulting.ConsultingAdministrationService;
import com.indice.erp.billing.subscription.BillingSelectionResponse;
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
    private PlatformCompanyModuleService companyModules;

    @MockBean
    private PlatformTrialExtensionService trialExtensions;

    @MockBean
    private CourtesyCodeService courtesyCodes;

    @MockBean
    private ConsultingAdministrationService consulting;

    @MockBean
    private PlatformCatalogManagementService catalogManagement;

    @MockBean
    private PlatformCatalogStripeSynchronizationService catalogStripeSynchronization;

    @MockBean
    private PlatformModuleWorkOrderService moduleWorkOrders;

    @MockBean
    private PlatformCompanyUserService companyUsers;

    @MockBean
    private InvitationEmailService invitationEmailService;

    @MockBean
    private AppWebProperties appWebProperties;

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
            .andExpect(jsonPath("$.code").value("PLATFORM_ACCESS_DENIED"))
            .andExpect(jsonPath("$.message").value("You do not have permission to complete this platform operation."));
    }

    @Test
    void mutationRejectsAnInvalidCsrfTokenAsForbidden() throws Exception {
        var platformRoot = new AuthSessionUser(99L, 7L, "Platform Root", "root");
        given(auth.currentUser(any())).willReturn(Optional.of(platformRoot));
        willThrow(new IllegalArgumentException("Invalid CSRF token."))
            .given(csrf).requireCsrf(any(), eq("expired-token"));

        mockMvc.perform(post("/api/v1/platform-admin/catalog/drafts")
                .header("X-CSRF-Token", "expired-token"))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.code").value("INVALID_CSRF_TOKEN"));
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
    void overviewPassesServerSideFiltersSortingAndPagination() throws Exception {
        var platformRoot = new AuthSessionUser(99L, 7L, "Platform Root", "user");
        given(auth.currentUser(any())).willReturn(Optional.of(platformRoot));
        given(service.overview(99L, "north", "SUPER_ADMIN", "attention", "payment", "asc", 3, 25))
            .willReturn(Map.of(
                "companies", List.of(),
                "pagination", Map.of("page", 3, "page_size", 25, "total_items", 61, "total_pages", 3)
            ));

        mockMvc.perform(get("/api/v1/platform-admin/overview")
                .param("q", "north")
                .param("userType", "SUPER_ADMIN")
                .param("status", "attention")
                .param("sort", "payment")
                .param("direction", "asc")
                .param("page", "3")
                .param("pageSize", "25"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.pagination.total_items").value(61));

        verify(service).overview(99L, "north", "SUPER_ADMIN", "attention", "payment", "asc", 3, 25);
    }

    @Test
    void companyDirectoryUsesASeparatePaginatedProjection() throws Exception {
        var platformRoot = new AuthSessionUser(99L, 7L, "Platform Root", "user");
        given(auth.currentUser(any())).willReturn(Optional.of(platformRoot));
        given(service.companyOptions(99L, "owner@example.com", 2, 50)).willReturn(Map.of(
            "companies", List.of(Map.of("id", 12, "name", "North")),
            "pagination", Map.of("page", 2, "page_size", 50, "total_items", 75, "total_pages", 2)
        ));

        mockMvc.perform(get("/api/v1/platform-admin/companies/options")
                .param("q", "owner@example.com")
                .param("page", "2")
                .param("pageSize", "50"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.companies[0].id").value(12));
    }

    @Test
    void platformRootCanPrepareValidateAndPublishAVersionedCatalog() throws Exception {
        var platformRoot = new AuthSessionUser(99L, 7L, "Platform Root", "root");
        given(auth.currentUser(any())).willReturn(Optional.of(platformRoot));
        given(catalogManagement.createDraft(99L)).willReturn(Map.of(
            "id", 77L,
            "version_code", "2026.08-draft-test",
            "status", "DRAFT",
            "stripe_mode", "TEST"
        ));
        given(catalogManagement.validateDraft(99L, 77L)).willReturn(Map.of(
            "catalog_version_id", 77L,
            "version_code", "2026.08-draft-test",
            "ready", true,
            "blockers", List.of(),
            "stripe_mode", "TEST"
        ));
        given(catalogManagement.publishDraft(99L, 77L)).willReturn(Map.of(
            "catalog_version_id", 77L,
            "version_code", "2026.08-draft-test",
            "status", "ACTIVE",
            "published", true,
            "stripe_mode", "TEST"
        ));

        mockMvc.perform(post("/api/v1/platform-admin/catalog/drafts")
                .header("X-CSRF-Token", "csrf-test"))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.status").value("DRAFT"))
            .andExpect(jsonPath("$.stripe_mode").value("TEST"));

        mockMvc.perform(post("/api/v1/platform-admin/catalog/drafts/77/validation")
                .header("X-CSRF-Token", "csrf-test"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.ready").value(true))
            .andExpect(jsonPath("$.blockers").isEmpty());

        mockMvc.perform(post("/api/v1/platform-admin/catalog/drafts/77/publish")
                .header("X-CSRF-Token", "csrf-test"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("ACTIVE"))
            .andExpect(jsonPath("$.published").value(true));

        verify(csrf, times(3)).requireCsrf(any(), eq("csrf-test"));
    }

    @Test
    void platformRootCanSynchronizeCatalogPricesWithStripeTest() throws Exception {
        var platformRoot = new AuthSessionUser(99L, 7L, "Platform Root", "root");
        given(auth.currentUser(any())).willReturn(Optional.of(platformRoot));
        given(catalogStripeSynchronization.synchronize(eq(99L), eq(41L), any())).willReturn(Map.of(
            "catalog_product_id", 41L,
            "stripe_product_id", "prod_test_41",
            "stripe_mode", "TEST",
            "currency", "USD",
            "tax_behavior", "EXCLUSIVE",
            "tax_code", "txcd_10103001",
            "automatic_tax_enabled", true,
            "monthly", Map.of("external_price_id", "price_month_test"),
            "annual", Map.of("external_price_id", "price_year_test")
        ));

        mockMvc.perform(post("/api/v1/platform-admin/catalog/products/41/stripe-prices/synchronize")
                .header("X-CSRF-Token", "csrf-test")
                .contentType(APPLICATION_JSON)
                .content("{\"monthly_amount_cents\":7900,\"annual_amount_cents\":80500}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.stripe_mode").value("TEST"))
            .andExpect(jsonPath("$.tax_behavior").value("EXCLUSIVE"))
            .andExpect(jsonPath("$.monthly.external_price_id").value("price_month_test"));
    }

    @Test
    void platformRootCanPersistAndCancelAModuleWorkOrder() throws Exception {
        var platformRoot = new AuthSessionUser(99L, 7L, "Platform Root", "root");
        given(auth.currentUser(any())).willReturn(Optional.of(platformRoot));
        given(moduleWorkOrders.create(eq(99L), any())).willReturn(Map.of(
            "id", 81L,
            "moduleName", "Gestión ambiental",
            "slug", "gestion-ambiental",
            "routeSegment", "/gestion-ambiental",
            "sourceLocale", "es-MX",
            "status", "DRAFT"
        ));
        given(moduleWorkOrders.list(99L)).willReturn(Map.of(
            "work_orders", List.of(Map.of("id", 81L, "status", "DRAFT"))
        ));
        given(moduleWorkOrders.cancel(99L, 81L)).willReturn(Map.of(
            "id", 81L,
            "status", "CANCELLED",
            "removed", true
        ));

        mockMvc.perform(post("/api/v1/platform-admin/modules/work-orders")
                .header("X-CSRF-Token", "csrf-test")
                .contentType(APPLICATION_JSON)
                .content("""
                    { "moduleName": "Gestión ambiental", "sourceLocale": "es-MX" }
                    """))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.slug").value("gestion-ambiental"))
            .andExpect(jsonPath("$.status").value("DRAFT"));

        mockMvc.perform(get("/api/v1/platform-admin/modules/work-orders"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.work_orders[0].id").value(81L));

        mockMvc.perform(delete("/api/v1/platform-admin/modules/work-orders/81")
                .header("X-CSRF-Token", "csrf-test"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.removed").value(true));
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
    void platformRootCanUpdateTheProductsChargedWhenATrialEnds() throws Exception {
        var platformRoot = new AuthSessionUser(99L, 7L, "Platform Root", "root");
        given(auth.currentUser(any())).willReturn(Optional.of(platformRoot));
        given(companyModules.updateTrialProducts(eq(99L), eq(22L), eq("trial-products-1"), any()))
            .willReturn(Map.of(
                "company_id", 22L,
                "product_codes", List.of("basic_hr", "basic_process_tasks"),
                "offer_code", "basic_2",
                "charge_timing", "TRIAL_END",
                "charged_now", false
            ));

        mockMvc.perform(patch("/api/v1/platform-admin/companies/22/products")
                .header("X-CSRF-Token", "csrf-test")
                .header("Idempotency-Key", "trial-products-1")
                .contentType(APPLICATION_JSON)
                .content("""
                    { "product_codes": ["basic_hr", "basic_process_tasks"] }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.offer_code").value("basic_2"))
            .andExpect(jsonPath("$.charge_timing").value("TRIAL_END"))
            .andExpect(jsonPath("$.charged_now").value(false));
    }

    @Test
    void platformRootCanPreviewAProductChangeBeforeUpdatingStripe() throws Exception {
        var platformRoot = new AuthSessionUser(99L, 7L, "Platform Root", "root");
        given(auth.currentUser(any())).willReturn(Optional.of(platformRoot));
        given(companyModules.previewProducts(eq(99L), eq(22L), any()))
            .willReturn(new BillingSelectionResponse(
                "STRIPE", "ACTIVE", "2026.08-v2", "custom_offer", "MONTH", "USD",
                5, 0, 2, 3, 12_900L, 0, 0, 12_900L, null,
                "NEXT_INVOICE", false, false, true,
                List.of("module_hr", "module_process"), List.of()
            ));

        mockMvc.perform(post("/api/v1/platform-admin/companies/22/products/preview")
                .header("X-CSRF-Token", "csrf-test")
                .contentType(APPLICATION_JSON)
                .content("""
                    { "product_codes": ["module_hr", "module_process"] }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.catalog_version").value("2026.08-v2"))
            .andExpect(jsonPath("$.estimated_amount_cents").value(12900))
            .andExpect(jsonPath("$.change_timing").value("NEXT_INVOICE"));
    }

    @Test
    void platformRootCanExtendATrialByAnAllowedPreset() throws Exception {
        var platformRoot = new AuthSessionUser(99L, 7L, "Platform Root", "root");
        given(auth.currentUser(any())).willReturn(Optional.of(platformRoot));
        given(trialExtensions.extend(eq(99L), eq(22L), eq("trial-extension-1"), any()))
            .willReturn(Map.of(
                "company_id", 22L,
                "source", "STRIPE",
                "added_days", 15,
                "trial_ends_at", "2026-09-15T00:00:00Z",
                "charged_now", false
            ));

        mockMvc.perform(patch("/api/v1/platform-admin/companies/22/trial-extension")
                .header("X-CSRF-Token", "csrf-test")
                .header("Idempotency-Key", "trial-extension-1")
                .contentType(APPLICATION_JSON)
                .content("""
                    { "days": 15 }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.added_days").value(15))
            .andExpect(jsonPath("$.source").value("STRIPE"))
            .andExpect(jsonPath("$.charged_now").value(false));
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
    void platformRootCanInviteAndDeactivateCompanyUsersWithinSeatCapacity() throws Exception {
        var platformRoot = new AuthSessionUser(99L, 7L, "Platform Root", "root");
        given(auth.currentUser(any())).willReturn(Optional.of(platformRoot));
        given(appWebProperties.resolveInvitationBaseUrl()).willReturn("http://localhost:5174");
        given(companyUsers.invite(eq(99L), eq(44L), eq("user-invite-1"), any()))
            .willReturn(Map.of(
                "invitation_id", 71L,
                "email", "andrea@example.com",
                "full_name", "Andrea López",
                "role", "user",
                "token", "invite-token",
                "expires_at", "2026-08-20T12:00:00Z",
                "seat_usage", Map.of(
                    "included", 5,
                    "active", 1,
                    "reserved", 1,
                    "available", 3
                )
            ));
        given(invitationEmailService.sendInvitation(
            "andrea@example.com",
            "Andrea López",
            "http://localhost:5174/invite/invite-token"
        )).willReturn(InvitationEmailResult.disabled());
        given(companyUsers.updateStatus(eq(99L), eq(44L), eq(88L), any()))
            .willReturn(Map.of(
                "success", true,
                "user_id", 88L,
                "status", "inactive",
                "seat_usage", Map.of("active", 1, "available", 4)
            ));

        mockMvc.perform(post("/api/v1/platform-admin/companies/44/users/invitations")
                .header("X-CSRF-Token", "csrf-test")
                .header("Idempotency-Key", "user-invite-1")
                .contentType(APPLICATION_JSON)
                .content("""
                    {
                      "name": "Andrea López",
                      "email": "andrea@example.com",
                      "role": "user"
                    }
                    """))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.invitation_id").value(71L))
            .andExpect(jsonPath("$.invite_link").value("http://localhost:5174/invite/invite-token"))
            .andExpect(jsonPath("$.email_status").value("disabled"))
            .andExpect(jsonPath("$.seat_usage.reserved").value(1));

        mockMvc.perform(patch("/api/v1/platform-admin/companies/44/users/88/status")
                .header("X-CSRF-Token", "csrf-test")
                .contentType(APPLICATION_JSON)
                .content("""
                    { "status": "inactive" }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("inactive"))
            .andExpect(jsonPath("$.seat_usage.available").value(4));
    }

    @Test
    void platformRootCanEditACommercialAccountType() throws Exception {
        var platformRoot = new AuthSessionUser(99L, 7L, "Platform Root", "root");
        given(auth.currentUser(any())).willReturn(Optional.of(platformRoot));
        given(service.updateCompanyAccountType(eq(99L), eq(44L), any()))
            .willReturn(Map.of(
                "company_id", 44L,
                "user_type", "DISTRIBUTOR",
                "changed", true
            ));

        mockMvc.perform(patch("/api/v1/platform-admin/companies/44/account-type")
                .header("X-CSRF-Token", "csrf-test")
                .contentType(APPLICATION_JSON)
                .content("""
                    { "account_type": "DISTRIBUTOR" }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.company_id").value(44L))
            .andExpect(jsonPath("$.user_type").value("DISTRIBUTOR"))
            .andExpect(jsonPath("$.changed").value(true));
    }

    @Test
    void platformRootCanEnablePublicDemoAccess() throws Exception {
        var platformRoot = new AuthSessionUser(99L, 7L, "Platform Root", "root");
        given(auth.currentUser(any())).willReturn(Optional.of(platformRoot));
        given(service.updatePublicDemoAccess(eq(99L), eq(44L), any()))
            .willReturn(Map.of(
                "company_id", 44L,
                "public_demo_enabled", true,
                "changed", true
            ));

        mockMvc.perform(patch("/api/v1/platform-admin/companies/44/public-demo")
                .header("X-CSRF-Token", "csrf-test")
                .contentType(APPLICATION_JSON)
                .content("""
                    { "enabled": true }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.company_id").value(44L))
            .andExpect(jsonPath("$.public_demo_enabled").value(true))
            .andExpect(jsonPath("$.changed").value(true));
    }

    @Test
    void platformRootCanAssignAClientToADistributor() throws Exception {
        var platformRoot = new AuthSessionUser(99L, 7L, "Platform Root", "root");
        given(auth.currentUser(any())).willReturn(Optional.of(platformRoot));
        given(service.updateCompanyDistributor(eq(99L), eq(44L), any()))
            .willReturn(Map.of(
                "company_id", 44L,
                "distributor_company_id", 9L,
                "distributor_company_name", "Aliado Norte",
                "commercial_origin", "DISTRIBUTOR",
                "changed", true
            ));

        mockMvc.perform(patch("/api/v1/platform-admin/companies/44/distributor")
                .header("X-CSRF-Token", "csrf-test")
                .contentType(APPLICATION_JSON)
                .content("""
                    { "distributor_company_id": 9 }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.company_id").value(44L))
            .andExpect(jsonPath("$.distributor_company_id").value(9L))
            .andExpect(jsonPath("$.distributor_company_name").value("Aliado Norte"));
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

    @Test
    void platformRootCanCreateConsultantsCoverageAndSessions() throws Exception {
        var platformRoot = new AuthSessionUser(99L, 7L, "Platform Root", "root");
        given(auth.currentUser(any())).willReturn(Optional.of(platformRoot));
        given(consulting.createConsultant(eq(99L), any())).willReturn(Map.of(
            "id", 12L,
            "name", "Andrea Ruiz",
            "email", "andrea@example.com",
            "active", true
        ));
        given(consulting.createLocation(eq(99L), any())).willReturn(Map.of(
            "id", 13L,
            "location_code", "MX-MTY",
            "city_name", "Monterrey",
            "active", true
        ));
        given(consulting.createAppointment(eq(99L), any())).willReturn(Map.of(
            "id", 14L,
            "company_id", 22L,
            "status", "CONFIRMED",
            "consultant_name", "Andrea Ruiz"
        ));

        mockMvc.perform(post("/api/v1/platform-admin/consulting/consultants")
                .header("X-CSRF-Token", "csrf-test")
                .contentType(APPLICATION_JSON)
                .content("""
                    {
                      "firstName": "Andrea",
                      "lastName": "Ruiz",
                      "phone": "+52 81 5555 0101",
                      "email": "andrea@example.com"
                    }
                    """))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.name").value("Andrea Ruiz"));

        mockMvc.perform(post("/api/v1/platform-admin/consulting/locations")
                .header("X-CSRF-Token", "csrf-test")
                .contentType(APPLICATION_JSON)
                .content("""
                    {
                      "cityName": "Monterrey",
                      "regionName": "Nuevo León",
                      "countryName": "México",
                      "countryCode": "MX",
                      "timezone": "America/Monterrey",
                      "currency": "USD"
                    }
                    """))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.city_name").value("Monterrey"));

        mockMvc.perform(post("/api/v1/platform-admin/consulting/appointments")
                .header("X-CSRF-Token", "csrf-test")
                .contentType(APPLICATION_JSON)
                .content("""
                    {
                      "companyId": 22,
                      "attendeeName": "Cliente Demo",
                      "attendeeEmail": "cliente@example.com",
                      "attendeePhone": "+52 81 5555 0202",
                      "topic": "IMPLEMENTATION",
                      "consultationMode": "VIRTUAL",
                      "startAt": "2026-09-15T16:00:00Z",
                      "timezone": "America/Monterrey",
                      "durationMinutes": 60,
                      "consultantName": "Andrea Ruiz",
                      "consultantEmail": "andrea@example.com",
                      "consultantPhone": "+52 81 5555 0101",
                      "meetingUrl": "https://meet.example.com/indice-14",
                      "serviceLocationCode": "",
                      "serviceLocationName": "",
                      "countryCode": "MX"
                    }
                    """))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.status").value("CONFIRMED"))
            .andExpect(jsonPath("$.consultant_name").value("Andrea Ruiz"));
    }

    @Test
    void platformRootCanReadAndUpdateConsultantAvailability() throws Exception {
        var platformRoot = new AuthSessionUser(99L, 7L, "Platform Root", "root");
        given(auth.currentUser(any())).willReturn(Optional.of(platformRoot));
        given(consulting.consultantAvailability(99L, "andrea@example.com")).willReturn(Map.of(
            "consultantEmail", "andrea@example.com",
            "consultantName", "Andrea Ruiz",
            "timezone", "America/Monterrey",
            "configured", true,
            "days", List.of(Map.of(
                "dayOfWeek", 1,
                "enabled", true,
                "startTime", "09:00",
                "endTime", "17:00"
            ))
        ));
        given(consulting.updateConsultantAvailability(eq(99L), any())).willReturn(Map.of(
            "consultantEmail", "andrea@example.com",
            "consultantName", "Andrea Ruiz",
            "timezone", "America/Monterrey",
            "configured", true,
            "days", List.of()
        ));

        mockMvc.perform(get("/api/v1/platform-admin/consulting/availability")
                .param("consultantEmail", "andrea@example.com"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.consultantEmail").value("andrea@example.com"));

        mockMvc.perform(put("/api/v1/platform-admin/consulting/availability")
                .header("X-CSRF-Token", "csrf-test")
                .contentType(APPLICATION_JSON)
                .content("""
                    {
                      "consultantEmail": "andrea@example.com",
                      "timezone": "America/Monterrey",
                      "days": [
                        {"dayOfWeek": 1, "enabled": true, "startTime": "09:00", "endTime": "17:00"},
                        {"dayOfWeek": 2, "enabled": true, "startTime": "09:00", "endTime": "17:00"},
                        {"dayOfWeek": 3, "enabled": true, "startTime": "09:00", "endTime": "17:00"},
                        {"dayOfWeek": 4, "enabled": true, "startTime": "09:00", "endTime": "17:00"},
                        {"dayOfWeek": 5, "enabled": true, "startTime": "09:00", "endTime": "17:00"},
                        {"dayOfWeek": 6, "enabled": false, "startTime": "", "endTime": ""},
                        {"dayOfWeek": 7, "enabled": false, "startTime": "", "endTime": ""}
                      ]
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.configured").value(true));
    }
}
