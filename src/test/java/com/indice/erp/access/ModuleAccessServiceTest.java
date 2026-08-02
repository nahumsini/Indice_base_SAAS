package com.indice.erp.access;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import com.indice.erp.access.module.ModuleAccessService;
import com.indice.erp.auth.AuthSessionUser;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;

@ExtendWith(MockitoExtension.class)
class ModuleAccessServiceTest {

    @Mock
    private JdbcTemplate jdbcTemplate;

    @Test
    void rejectsModuleUntilCompanyLifecycleAndEntitlementAllowIt() {
        var service = new ModuleAccessService(jdbcTemplate);
        var user = new AuthSessionUser(1L, 7L, "Admin", "admin");
        when(jdbcTemplate.queryForObject(
            contains("company_module_entitlements"),
            eq(Integer.class),
            eq(7L),
            eq("cleaning")
        )).thenReturn(0);

        assertFalse(service.canAccess(user, "cleaning"));
    }

    @Test
    void protectedRoleStillRequiresCompanyEntitlement() {
        var service = new ModuleAccessService(jdbcTemplate);
        var user = new AuthSessionUser(1L, 7L, "Super Admin", "superadmin");
        when(jdbcTemplate.queryForObject(
            contains("company_module_entitlements"),
            eq(Integer.class),
            eq(7L),
            eq("maintenance")
        )).thenReturn(1);

        assertTrue(service.canAccess(user, "maintenance"));
    }

    @Test
    void regularRoleRequiresCompanyEntitlementAndUserGrant() {
        var service = new ModuleAccessService(jdbcTemplate);
        var user = new AuthSessionUser(1L, 7L, "Admin", "admin");
        when(jdbcTemplate.queryForObject(
            contains("company_module_entitlements"),
            eq(Integer.class),
            eq(7L),
            eq("maintenance")
        )).thenReturn(1);
        when(jdbcTemplate.query(
            contains("FROM user_companies"),
            org.mockito.ArgumentMatchers.<org.springframework.jdbc.core.RowMapper<Long>>any(),
            eq(1L),
            eq(7L)
        )).thenReturn(java.util.List.of(44L));
        when(jdbcTemplate.queryForObject(
            contains("FROM user_company_module_roles"),
            eq(Integer.class),
            eq(44L),
            eq("maintenance")
        )).thenReturn(1);

        assertTrue(service.canAccess(user, "maintenance"));
    }
}
