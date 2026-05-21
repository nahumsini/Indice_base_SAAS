package com.indice.erp.configcenter.users;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verify;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;

@ExtendWith(MockitoExtension.class)
class ConfigCenterTabPermissionAccessTest {

    @Mock
    private JdbcTemplate jdbcTemplate;

    @Test
    void normalizesStringAndStructuredTabPermissionPayloads() {
        var access = new ConfigCenterTabPermissionAccess(jdbcTemplate);

        var keys = access.normalizeTabPermissionKeys(Map.of(
            "tab_permission_keys", List.of(
                "home_panel.users",
                Map.of("module_slug", "human_resources", "tab_key", "payroll")
            )
        ));

        assertEquals(List.of("config_center.users", "human_resources.payroll"), keys);
    }

    @Test
    void rejectsTabPermissionOutsideAssignedModules() {
        var access = new ConfigCenterTabPermissionAccess(jdbcTemplate);
        var keys = List.of("human_resources.payroll");

        var error = assertThrows(
            IllegalArgumentException.class,
            () -> access.ensureTabPermissionKeysValid(keys, List.of("config_center"))
        );

        assertEquals("Tab permissions must belong to assigned modules: human_resources.payroll", error.getMessage());
    }

    @Test
    void replacesUserTabPermissionsWithAllowAndDenyRowsForAssignedModules() {
        var access = new ConfigCenterTabPermissionAccess(jdbcTemplate);

        access.replaceUserTabPermissions(10L, List.of("config_center.users"), List.of("config_center"));

        verify(jdbcTemplate).update("DELETE FROM user_company_tab_permissions WHERE user_company_id = ?", 10L);
        verify(jdbcTemplate).update(
            """
                INSERT INTO user_company_tab_permissions (user_company_id, module_slug, tab_key, can_view)
                VALUES (?, ?, ?, ?)
                """,
            10L,
            "config_center",
            "profile",
            0
        );
        verify(jdbcTemplate).update(
            """
                INSERT INTO user_company_tab_permissions (user_company_id, module_slug, tab_key, can_view)
                VALUES (?, ?, ?, ?)
                """,
            10L,
            "config_center",
            "users",
            1
        );
    }

    @Test
    void copiesInvitationTabPermissionsToUserCompanyWithCanViewFlags() {
        var access = new ConfigCenterTabPermissionAccess(jdbcTemplate);

        access.copyInvitationTabPermissionsToUserCompany(42L, 10L);

        verify(jdbcTemplate).update("DELETE FROM user_company_tab_permissions WHERE user_company_id = ?", 10L);
        verify(jdbcTemplate).update(
            """
                INSERT INTO user_company_tab_permissions (user_company_id, module_slug, tab_key, can_view)
                SELECT ?, module_slug, tab_key, can_view
                FROM user_invitation_tab_permissions
                WHERE invitation_id = ?
                """,
            10L,
            42L
        );
    }
}
