package com.indice.erp.entitlement;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.indice.erp.auth.AuthSessionResponse;
import com.indice.erp.tenant.TenantContext;
import com.indice.erp.tenant.TenantScope;
import java.util.List;
import org.junit.jupiter.api.Test;

class CapabilityShadowDecisionServiceTest {

    private final CapabilityShadowDecisionService service = new CapabilityShadowDecisionService();

    @Test
    void mirrorsLegacyModuleAssignmentsInShadowMode() {
        var session = session("admin", List.of("crm", "expenses"));
        var tenant = new TenantContext(1L, 2L, 3L, "admin", TenantScope.from(null, null));

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

        assertTrue(service.evaluate(tenant, session, "kpis", CapabilityOperation.READ).shadow_allowed());
        assertTrue(service.evaluate(tenant, session, "config_center", CapabilityOperation.READ).shadow_allowed());
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
