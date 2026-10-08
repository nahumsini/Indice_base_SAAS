package com.indice.erp.configcenter.users;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.HashSet;
import org.junit.jupiter.api.Test;

class ConfigCenterTabPermissionCatalogTest {

    @Test
    void exposesTheCompleteCanonicalScopeCatalog() {
        var tabs = ConfigCenterTabPermissionCatalog.catalogTabs();
        var permissionKeys = tabs.stream().map(row -> (String) row.get("permission_key")).toList();

        assertEquals(65, tabs.size());
        assertEquals(65, new HashSet<>(permissionKeys).size());
        assertEquals(12, ConfigCenterTabPermissionCatalog.moduleSlugsWithTabs().size());
        assertTrue(permissionKeys.containsAll(java.util.List.of("control_minutas.meetings","control_minutas.agreements","control_minutas.indicators")));
        assertTrue(permissionKeys.contains("inventory.purchase-orders"));
        assertTrue(permissionKeys.contains("receivables.kpis"));
        assertTrue(permissionKeys.contains("expenses.payment-accounts"));
        assertTrue(permissionKeys.contains("pos.kiosks"));
        assertTrue(permissionKeys.contains("kpis.automated-reports"));
        assertTrue(permissionKeys.contains("config_center.consulting"));
        assertTrue(permissionKeys.contains("config_center.integrations"));
        assertTrue(permissionKeys.containsAll(java.util.List.of("scheduling.calendar","scheduling.reservations","scheduling.clients","scheduling.events","scheduling.indicators","scheduling.configuration")));
        assertFalse(permissionKeys.contains("config_center.personal-performance"));
        assertTrue(ConfigCenterTabPermissionCatalog.isProtectedScope("config_center.plan"));
        assertFalse(ConfigCenterTabPermissionCatalog.isProtectedScope("config_center.users"));
        assertTrue(tabs.stream().allMatch(row -> !((String) row.get("name_en")).isBlank()));
        assertTrue(tabs.stream().allMatch(row -> !((String) row.get("name_es")).isBlank()));
        assertTrue(tabs.stream().allMatch(row -> !((String) row.get("description_en")).isBlank()));
        assertTrue(tabs.stream().allMatch(row -> !((String) row.get("description_es")).isBlank()));
        assertTrue(tabs.stream().allMatch(row -> row.get("role_access") instanceof java.util.Map));
        assertEquals("protected", tabs.stream()
            .filter(row -> "config_center.plan".equals(row.get("permission_key")))
            .findFirst()
            .orElseThrow()
            .get("access_level"));
    }

    @Test
    void exposesTheSameRoleCompatibilityUsedByMutationGuards() {
        assertFalse(ConfigCenterTabPermissionCatalog.isRoleCompatible("scheduling.configuration", "User"));
        assertFalse(ConfigCenterTabPermissionCatalog.isRoleCompatible("scheduling.clients", "User"));
        assertTrue(ConfigCenterTabPermissionCatalog.isRoleCompatible("scheduling.reservations", "User"));
        assertTrue(ConfigCenterTabPermissionCatalog.isRoleCompatible("config_center.profile", "User"));
        assertTrue(ConfigCenterTabPermissionCatalog.isRoleCompatible("processes.calendar", "User"));
        assertFalse(ConfigCenterTabPermissionCatalog.isRoleCompatible("config_center.users", "User"));
        assertFalse(ConfigCenterTabPermissionCatalog.isRoleCompatible("config_center.consulting", "User"));
        assertFalse(ConfigCenterTabPermissionCatalog.isRoleCompatible("config_center.integrations", "User"));
        assertFalse(ConfigCenterTabPermissionCatalog.isRoleCompatible("human_resources.payroll", "User"));
        assertFalse(ConfigCenterTabPermissionCatalog.isRoleCompatible("config_center.plan", "Admin"));
        assertTrue(ConfigCenterTabPermissionCatalog.isRoleCompatible("config_center.plan", "Super Admin"));
    }
}
