package com.indice.erp.sales;

import static org.assertj.core.api.Assertions.assertThat;

import com.indice.erp.auth.AuthSessionUser;
import org.junit.jupiter.api.Test;

class OpportunityFlowAccessServiceTest {

    private final OpportunityFlowAccessService service = new OpportunityFlowAccessService();

    @Test
    void allowsEveryAuthenticatedTenantMemberAlreadyAuthorizedForTheLeadsTab() {
        assertThat(service.canManage(new AuthSessionUser(1L, 7L, "Admin", "admin"))).isTrue();
        assertThat(service.canManage(new AuthSessionUser(2L, 7L, "Owner", "dueño"))).isTrue();
        assertThat(service.canManage(new AuthSessionUser(3L, 7L, "Seller", "user"))).isTrue();
        assertThat(service.canManage(null)).isFalse();
    }
}
