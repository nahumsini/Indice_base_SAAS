package com.indice.erp.access.tab;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.indice.erp.auth.AuthSessionUser;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

class TabPermissionAccessServiceTest {

    @Test
    void superAdminIsExplicitlyUnrestricted() {
        var jdbcTemplate = mock(JdbcTemplate.class);
        var service = new TabPermissionAccessService(jdbcTemplate);

        assertTrue(service.canAccess(user("superadmin"), TabPermissionRequirement.one("inventory.products")));
        verifyNoInteractions(jdbcTemplate);
    }

    @Test
    void requiresBothAssignedModuleAndEnabledTab() {
        var serviceWithAccess = serviceReturning(
            List.of("inventory"),
            List.of("inventory.products")
        );
        var serviceWithoutModule = serviceReturning(
            List.of("crm"),
            List.of("inventory.products")
        );

        assertTrue(serviceWithAccess.canAccess(user("user"), TabPermissionRequirement.one("inventory.products")));
        assertFalse(serviceWithoutModule.canAccess(user("user"), TabPermissionRequirement.one("inventory.products")));
    }

    @Test
    void deniesAssignedModuleWhenTabIsRevoked() {
        var service = serviceReturning(List.of("inventory"), List.of("inventory.inventory"));

        assertFalse(service.canAccess(user("user"), TabPermissionRequirement.one("inventory.products")));
    }

    @Test
    void sharedRequirementAcceptsAnyEnabledConsumerScope() {
        var service = serviceReturning(List.of("processes"), List.of("processes.projects"));

        assertTrue(service.canAccess(
            user("user"),
            TabPermissionRequirement.any("processes.calendar", "processes.projects", "processes.processes")
        ));
    }

    private TabPermissionAccessService serviceReturning(List<String> assignedModules, List<String> allowedPermissions) {
        var jdbcTemplate = mock(JdbcTemplate.class);
        when(jdbcTemplate.query(
            anyString(),
            org.mockito.ArgumentMatchers.<RowMapper<String>>any(),
            eq(7L)
        ))
            .thenReturn(assignedModules)
            .thenReturn(allowedPermissions);
        return new TabPermissionAccessService(jdbcTemplate);
    }

    private AuthSessionUser user(String role) {
        return new AuthSessionUser(3L, 1L, 7L, "Scope Test", role);
    }
}
