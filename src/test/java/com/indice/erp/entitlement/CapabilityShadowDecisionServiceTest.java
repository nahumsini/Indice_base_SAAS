package com.indice.erp.entitlement;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

import com.indice.erp.auth.AuthSessionResponse;
import com.indice.erp.tenant.TenantContext;
import com.indice.erp.tenant.TenantScope;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

class CapabilityShadowDecisionServiceTest {

    private final CompanyEntitlementService companyEntitlements = Mockito.mock(CompanyEntitlementService.class);
    private final CapabilityShadowDecisionService service = new CapabilityShadowDecisionService(companyEntitlements);

    @Test
    void mirrorsLegacyModuleAssignmentsInShadowMode() {
        var session = session("admin", List.of("crm", "expenses"));
        var tenant = new TenantContext(1L, 2L, 3L, "admin", TenantScope.from(null, null));
        legacyCompany(tenant.company_id(), "sales");
        legacyCompany(tenant.company_id(), "petty_cash");

        var sales = service.evaluate(tenant, session, "sales", CapabilityOperation.READ);
        var pettyCash = service.evaluate(tenant, session, "petty_cash", CapabilityOperation.READ);

        assertTrue(sales.shadow_allowed());
        assertTrue(sales.matched());
        assertFalse(pettyCash.shadow_allowed());
        assertTrue(pettyCash.matched());
    }

    @Test
    void coreCapabilitiesRemainAvailableWithoutAssignments() {
        var session = session("user", List.of());
        var tenant = new TenantContext(1L, 2L, 3L, "user", TenantScope.from(4L, null));
        legacyCompany(tenant.company_id(), "kpis");
        legacyCompany(tenant.company_id(), "config_center");

        assertTrue(service.evaluate(tenant, session, "kpis", CapabilityOperation.READ).shadow_allowed());
        assertTrue(service.evaluate(tenant, session, "config_center", CapabilityOperation.READ).shadow_allowed());
    }

    @Test
    void shadowCohortDetectsACommercialDenialWithoutGrantingAnUnassignedModule() {
        var session = session("admin", List.of("crm", "expenses"));
        var tenant = new TenantContext(1L, 2L, 3L, "admin", TenantScope.from(null, null));
        when(companyEntitlements.resolve(2L, "sales")).thenReturn(
            new CompanyEntitlementResolution(2L, "sales", false, EntitlementPolicyMode.SHADOW, List.of())
        );
        when(companyEntitlements.resolve(2L, "expenses")).thenReturn(
            new CompanyEntitlementResolution(
                2L, "expenses", true, EntitlementPolicyMode.SHADOW, List.of("subscription(subscription:9)")
            )
        );
        when(companyEntitlements.resolve(2L, "human_resources")).thenReturn(
            new CompanyEntitlementResolution(
                2L, "human_resources", true, EntitlementPolicyMode.SHADOW, List.of("trial(trial:7)")
            )
        );

        var deniedPaidModule = service.evaluate(tenant, session, "sales", CapabilityOperation.READ);
        var allowedPaidModule = service.evaluate(tenant, session, "expenses", CapabilityOperation.WRITE);
        var unassignedPaidModule = service.evaluate(tenant, session, "human_resources", CapabilityOperation.READ);

        assertTrue(deniedPaidModule.legacy_allowed());
        assertFalse(deniedPaidModule.company_allowed());
        assertFalse(deniedPaidModule.shadow_allowed());
        assertFalse(deniedPaidModule.matched());
        assertTrue(allowedPaidModule.shadow_allowed());
        assertTrue(allowedPaidModule.matched());
        assertTrue(unassignedPaidModule.company_allowed());
        assertFalse(unassignedPaidModule.shadow_allowed());
        assertTrue(unassignedPaidModule.matched());
    }

    @Test
    void disabledCompanyKillSwitchRestoresLegacyDecisions() {
        var session = session("admin", List.of("crm"));
        var tenant = new TenantContext(1L, 2L, 3L, "admin", TenantScope.from(null, null));
        when(companyEntitlements.resolve(2L, "sales")).thenReturn(
            new CompanyEntitlementResolution(
                2L, "sales", false, EntitlementPolicyMode.DISABLED, List.of()
            )
        );

        var decision = service.evaluate(tenant, session, "sales", CapabilityOperation.WRITE);

        assertTrue(decision.legacy_allowed());
        assertTrue(decision.shadow_allowed());
        assertTrue(decision.matched());
        assertTrue(decision.source().contains("kill-switch"));
    }

    private void legacyCompany(long companyId, String capability) {
        when(companyEntitlements.resolve(companyId, capability)).thenReturn(
            new CompanyEntitlementResolution(
                companyId, capability, false, EntitlementPolicyMode.LEGACY, List.of()
            )
        );
    }

    private AuthSessionResponse session(String role, List<String> modules) {
        var company = new AuthSessionResponse.CompanyInfo(
            2L,
            "Empresa",
            3L,
            role,
            new AuthSessionResponse.ScopeInfo("corporate_office", null, null),
            true
        );
        return new AuthSessionResponse(
            new AuthSessionResponse.UserInfo(1L, "Usuario", role, modules, List.of(), false),
            company,
            List.of(company)
        );
    }
}
