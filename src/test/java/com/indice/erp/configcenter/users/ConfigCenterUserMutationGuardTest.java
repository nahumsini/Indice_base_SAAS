package com.indice.erp.configcenter.users;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.indice.erp.configcenter.users.ConfigCenterUserMutationGuard.AccessScope;
import com.indice.erp.configcenter.users.ConfigCenterUserMutationGuard.ActorAccess;
import com.indice.erp.configcenter.users.ConfigCenterUserMutationGuard.TargetUser;
import java.util.List;
import java.util.LinkedHashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;

class ConfigCenterUserMutationGuardTest {

    private final ConfigCenterUserMutationGuard guard = new ConfigCenterUserMutationGuard();

    @Test
    void inviteRequiresExplicitOrganizationalScopeModulesAndTabPayload() {
        var error = assertThrows(
            IllegalArgumentException.class,
            () -> guard.validateInvite(adminActor(), "user", Map.of("role", "user"), List.of(), List.of(), scope(), false)
        );

        assertEquals("Organizational scope is required.", error.getMessage());
    }

    @Test
    void corporateScopeAcceptsExplicitNullUnitAndBusiness() {
        var payload = new LinkedHashMap<String, Object>();
        payload.put("role", "admin");
        payload.put("unit_id", null);
        payload.put("business_id", null);
        payload.put("module_slugs", List.of("config_center"));
        payload.put("tab_permission_keys", List.of("config_center.users"));

        assertDoesNotThrow(() -> guard.validateInvite(
            superAdminActor(),
            "admin",
            payload,
            List.of("config_center"),
            List.of("config_center.users"),
            new AccessScope(null, null),
            true
        ));
    }

    @Test
    void unitScopeAcceptsExplicitNullBusiness() {
        var payload = new LinkedHashMap<String, Object>();
        payload.put("role", "admin");
        payload.put("unit_id", 1L);
        payload.put("business_id", null);
        payload.put("module_slugs", List.of("config_center"));
        payload.put("tab_permission_keys", List.of("config_center.users"));

        assertDoesNotThrow(() -> guard.validateInvite(
            superAdminActor(),
            "admin",
            payload,
            List.of("config_center"),
            List.of("config_center.users"),
            new AccessScope(1L, null),
            true
        ));
    }

    @Test
    void updateRejectsAdminChangingOwnAccess() {
        var payload = Map.<String, Object>of(
            "role", "admin",
            "unit_id", 1L,
            "business_id", 2L,
            "module_slugs", List.of("config_center"),
            "tab_permission_keys", List.of("config_center.users")
        );

        var error = assertThrows(
            IllegalArgumentException.class,
            () -> guard.validateUpdate(
                adminActor(),
                new TargetUser(7L, 10L, "admin"),
                payload,
                List.of("config_center"),
                List.of("config_center.users"),
                scope(),
                true
            )
        );

        assertEquals("You cannot change your own role or permissions.", error.getMessage());
    }

    @Test
    void superAdminCanChangeOwnAccess() {
        var payload = Map.<String, Object>of(
            "role", "superadmin",
            "unit_id", 1L,
            "business_id", 2L,
            "module_slugs", List.of("config_center"),
            "tab_permission_keys", List.of("config_center.users")
        );

        assertDoesNotThrow(() -> guard.validateUpdate(
            superAdminActor(),
            new TargetUser(1L, 10L, "superadmin"),
            payload,
            List.of("config_center"),
            List.of("config_center.users"),
            scope(),
            true
        ));
    }

    @Test
    void adminCannotAssignSuperAdmin() {
        var payload = Map.<String, Object>of(
            "role", "superadmin",
            "unit_id", 1L,
            "business_id", 2L,
            "module_slugs", List.of("config_center"),
            "tab_permission_keys", List.of("config_center.users")
        );

        var error = assertThrows(
            IllegalArgumentException.class,
            () -> guard.validateUpdate(
                adminActor(),
                new TargetUser(2L, 10L, "user"),
                payload,
                List.of("config_center"),
                List.of("config_center.users"),
                scope(),
                true
            )
        );

        assertEquals("Only Super Admin can assign Super Admin access.", error.getMessage());
    }

    @Test
    void superAdminCanAssignCompleteAccessPayload() {
        var payload = Map.<String, Object>of(
            "role", "admin",
            "unit_id", 1L,
            "business_id", 2L,
            "module_slugs", List.of("config_center"),
            "tab_permission_keys", List.of("config_center.users")
        );

        assertDoesNotThrow(() ->
            guard.validateUpdate(
                superAdminActor(),
                new TargetUser(2L, 10L, "user"),
                payload,
                List.of("config_center"),
                List.of("config_center.users"),
                scope(),
                true
            )
        );
    }

    @Test
    void adminCanPromoteUserToAdminInsideOwnPermissions() {
        var payload = Map.<String, Object>of(
            "role", "admin",
            "unit_id", 1L,
            "business_id", 2L,
            "module_slugs", List.of("config_center"),
            "tab_permission_keys", List.of("config_center.users")
        );

        assertDoesNotThrow(() -> guard.validateUpdate(
            adminActor(),
            new TargetUser(2L, 11L, "user"),
            payload,
            List.of("config_center"),
            List.of("config_center.users"),
            scope(),
            true
        ));
    }

    @Test
    void adminCannotAssignModulesOutsideOwnPermissions() {
        var payload = Map.<String, Object>of(
            "role", "admin",
            "unit_id", 1L,
            "business_id", 2L,
            "module_slugs", List.of("human_resources"),
            "tab_permission_keys", List.of()
        );

        var error = assertThrows(IllegalArgumentException.class, () -> guard.validateInvite(
            adminActor(),
            "admin",
            payload,
            List.of("human_resources"),
            List.of(),
            scope(),
            true
        ));

        assertEquals("Admin cannot assign modules outside their own access.", error.getMessage());
    }

    @Test
    void adminCannotAssignBusinessOutsideOwnScope() {
        var payload = Map.<String, Object>of(
            "role", "admin",
            "unit_id", 1L,
            "business_id", 99L,
            "module_slugs", List.of("config_center"),
            "tab_permission_keys", List.of("config_center.users")
        );

        var error = assertThrows(IllegalArgumentException.class, () -> guard.validateInvite(
            adminActor(),
            "admin",
            payload,
            List.of("config_center"),
            List.of("config_center.users"),
            new AccessScope(1L, 99L),
            true
        ));

        assertEquals("Admin cannot assign unit or business outside their own scope.", error.getMessage());
    }

    @Test
    void userCanReceiveOnlySelfServiceTabPermissions() {
        var payload = Map.<String, Object>of(
            "role", "user",
            "unit_id", 1L,
            "business_id", 2L,
            "module_slugs", List.of("config_center", "human_resources"),
            "tab_permission_keys", List.of(
                "config_center.profile",
                "human_resources.announcements",
                "human_resources.assets",
                "human_resources.attendance",
                "human_resources.control",
                "human_resources.permissions"
            )
        );

        assertDoesNotThrow(() -> guard.validateInvite(
            superAdminActor(),
            "user",
            payload,
            List.of("config_center", "human_resources"),
            List.of(
                "config_center.profile",
                "human_resources.announcements",
                "human_resources.assets",
                "human_resources.attendance",
                "human_resources.control",
                "human_resources.permissions"
            ),
            scope(),
            true
        ));
    }

    @Test
    void userCannotReceiveRecordsTabPermission() {
        var payload = Map.<String, Object>of(
            "role", "user",
            "unit_id", 1L,
            "business_id", 2L,
            "module_slugs", List.of("human_resources"),
            "tab_permission_keys", List.of("human_resources.records")
        );

        var error = assertThrows(IllegalArgumentException.class, () -> guard.validateInvite(
            superAdminActor(),
            "user",
            payload,
            List.of("human_resources"),
            List.of("human_resources.records"),
            scope(),
            true
        ));

        assertEquals(
            "User role cannot receive administrative Panel Inicial or HR permissions. Choose Admin for management access.",
            error.getMessage()
        );
    }

    @Test
    void userCannotReceiveManagementTabPermissions() {
        var payload = Map.<String, Object>of(
            "role", "user",
            "unit_id", 1L,
            "business_id", 2L,
            "module_slugs", List.of("config_center", "human_resources"),
            "tab_permission_keys", List.of("config_center.users", "human_resources.collaborators")
        );

        var error = assertThrows(IllegalArgumentException.class, () -> guard.validateInvite(
            adminActor(),
            "user",
            payload,
            List.of("config_center", "human_resources"),
            List.of("config_center.users", "human_resources.collaborators"),
            scope(),
            true
        ));

        assertEquals(
            "User role cannot receive administrative Panel Inicial or HR permissions. Choose Admin for management access.",
            error.getMessage()
        );
    }

    @Test
    void userCanReceiveOperationalModuleTabPermissions() {
        var payload = Map.<String, Object>of(
            "role", "user",
            "unit_id", 1L,
            "business_id", 2L,
            "module_slugs", List.of("inventory", "crm", "pos"),
            "tab_permission_keys", List.of("inventory.products", "crm.sales", "pos.sale")
        );

        assertDoesNotThrow(() -> guard.validateInvite(
            superAdminActor(),
            "user",
            payload,
            List.of("inventory", "crm", "pos"),
            List.of("inventory.products", "crm.sales", "pos.sale"),
            scope(),
            true
        ));
    }

    @Test
    void userCannotReceiveProtectedPlanPermission() {
        var payload = Map.<String, Object>of(
            "role", "user",
            "unit_id", 1L,
            "business_id", 2L,
            "module_slugs", List.of("config_center"),
            "tab_permission_keys", List.of("config_center.plan")
        );

        var error = assertThrows(IllegalArgumentException.class, () -> guard.validateInvite(
            superAdminActor(),
            "user",
            payload,
            List.of("config_center"),
            List.of("config_center.plan"),
            scope(),
            true
        ));

        assertEquals("Protected tab permissions can only be assigned to Super Admin.", error.getMessage());
    }

    @Test
    void userCannotMutateUsers() {
        var error = assertThrows(IllegalArgumentException.class, () -> guard.validateInvite(
            new ActorAccess(8L, 12L, "user", List.of("config_center"), List.of("config_center.users"), scope()),
            "user",
            Map.of("role", "user", "unit_id", 1L, "business_id", 2L, "module_slugs", List.of("config_center")),
            List.of("config_center"),
            List.of("config_center.users"),
            scope(),
            true
        ));

        assertEquals("Only Admin or Super Admin can manage users.", error.getMessage());
    }

    private ActorAccess adminActor() {
        return new ActorAccess(7L, 10L, "admin", List.of("config_center"), List.of("config_center.users"), scope());
    }

    private ActorAccess superAdminActor() {
        return new ActorAccess(1L, 10L, "superadmin", List.of(), List.of(), new AccessScope(null, null));
    }

    private AccessScope scope() {
        return new AccessScope(1L, 2L);
    }
}
