package com.indice.erp.configcenter.users;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.indice.erp.configcenter.users.ConfigCenterUserMutationGuard.AccessScope;
import com.indice.erp.configcenter.users.ConfigCenterUserMutationGuard.ActorAccess;
import java.util.List;
import org.junit.jupiter.api.Test;

class ConfigCenterInvitationAccessGuardTest {

    private final ConfigCenterInvitationAccessGuard guard = new ConfigCenterInvitationAccessGuard();

    @Test
    void superAdminCanManageSuperAdminInvitation() {
        assertDoesNotThrow(() -> guard.validateManage(
            actor("superadmin", List.of(), List.of(), new AccessScope(null, null)),
            "superadmin",
            List.of("config_center"),
            List.of("config_center.users"),
            new AccessScope(3L, 9L)
        ));
    }

    @Test
    void adminCannotManageSuperAdminInvitation() {
        var error = assertThrows(IllegalArgumentException.class, () -> guard.validateManage(
            actor("admin", List.of("config_center"), List.of("config_center.users"), new AccessScope(3L, 9L)),
            "superadmin",
            List.of("config_center"),
            List.of("config_center.users"),
            new AccessScope(3L, 9L)
        ));

        assertEquals("Admin can manage only Admin or User invitations.", error.getMessage());
    }

    @Test
    void adminCannotManageInvitationOutsideBusinessScope() {
        var error = assertThrows(IllegalArgumentException.class, () -> guard.validateManage(
            actor("admin", List.of("config_center"), List.of("config_center.users"), new AccessScope(3L, 9L)),
            "user",
            List.of("config_center"),
            List.of("config_center.users"),
            new AccessScope(3L, 10L)
        ));

        assertEquals("Admin cannot manage invitations outside their unit or business scope.", error.getMessage());
    }

    private ActorAccess actor(String role, List<String> modules, List<String> tabs, AccessScope scope) {
        return new ActorAccess(1L, 10L, role, modules, tabs, scope);
    }
}
