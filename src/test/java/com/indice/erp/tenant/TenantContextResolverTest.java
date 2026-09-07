package com.indice.erp.tenant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

import com.indice.erp.auth.AuthSessionResponse;
import com.indice.erp.auth.SessionAuthService;
import java.util.List;
import org.junit.jupiter.api.Test;

class TenantContextResolverTest {
    private final TenantContextResolver resolver = new TenantContextResolver(mock(SessionAuthService.class));

    @Test
    void delegatedConsultationPreservesActorAndTargetWithoutInventingMembership() {
        var context = resolver.resolve(session(null, "superadmin", "corporate_office", null, null));
        assertThat(context.user_id()).isEqualTo(7L);
        assertThat(context.company_id()).isEqualTo(42L);
        assertThat(context.user_company_id()).isNull();
        assertThat(context.role()).isEqualTo("superadmin");
        assertThat(context.scope()).isEqualTo(TenantScope.from(null, null));
    }

    @Test
    void normalMembershipRetainsItsIdentityAndAssignedScope() {
        var context = resolver.resolve(session(99L, "manager", "business_office", 10L, 20L));
        assertThat(context.user_company_id()).isEqualTo(99L);
        assertThat(context.user_id()).isEqualTo(7L);
        assertThat(context.company_id()).isEqualTo(42L);
        assertThat(context.scope()).isEqualTo(TenantScope.from(10L, 20L));
    }

    private AuthSessionResponse session(Long membership, String role, String scope, Long unit, Long business) {
        var company = new AuthSessionResponse.CompanyInfo(42L, "Test company", membership, role,
            new AuthSessionResponse.ScopeInfo(scope, unit, business), true, null);
        return new AuthSessionResponse(new AuthSessionResponse.UserInfo(7L, "Test actor", role,
            List.of("dashboard", "kpis"), List.of(), false), company, List.of(company));
    }
}
