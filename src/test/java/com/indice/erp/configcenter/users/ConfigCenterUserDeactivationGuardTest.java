package com.indice.erp.configcenter.users;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.indice.erp.configcenter.users.ConfigCenterUserMutationGuard.AccessScope;
import com.indice.erp.configcenter.users.ConfigCenterUserMutationGuard.ActorAccess;
import com.indice.erp.configcenter.users.ConfigCenterUserMutationGuard.TargetUser;
import java.util.List;
import org.junit.jupiter.api.Test;

class ConfigCenterUserDeactivationGuardTest {

    private final ConfigCenterUserDeactivationGuard guard = new ConfigCenterUserDeactivationGuard();

    @Test
    void superAdminCanDeactivateAnotherSuperAdmin() {
        assertDoesNotThrow(() -> guard.validate(
            actor(1L, "superadmin", List.of(), List.of(), new AccessScope(null, null)),
            new TargetUser(2L, 20L, "superadmin"),
            List.of("config_center"),
            List.of("config_center.users"),
            new AccessScope(3L, 9L)
        ));
    }

    @Test
    void adminCannotDeactivateOutsideBusinessScope() {
        var error = assertThrows(IllegalArgumentException.class, () -> guard.validate(
            actor(1L, "admin", List.of("config_center"), List.of("config_center.users"), new AccessScope(3L, 9L)),
            new TargetUser(2L, 20L, "user"),
            List.of("config_center"),
            List.of("config_center.users"),
            new AccessScope(3L, 10L)
        ));

        assertEquals("Admin cannot deactivate users outside their unit or business scope.", error.getMessage());
    }

    @Test
    void adminCannotDeactivateUserWithMoreTabAccess() {
        var error = assertThrows(IllegalArgumentException.class, () -> guard.validate(
            actor(1L, "admin", List.of("config_center"), List.of("config_center.users"), new AccessScope(3L, 9L)),
            new TargetUser(2L, 20L, "admin"),
            List.of("config_center"),
            List.of("config_center.users", "config_center.business_structure"),
            new AccessScope(3L, 9L)
        ));

        assertEquals("Admin cannot deactivate users outside their tab access.", error.getMessage());
    }

    private ActorAccess actor(long userId, String role, List<String> modules, List<String> tabs, AccessScope scope) {
        return new ActorAccess(userId, 10L, role, modules, tabs, scope);
    }
}
