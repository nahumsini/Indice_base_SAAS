package com.indice.erp.configcenter.users;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

public final class ConfigCenterTabPermissionCatalog {

    static final String CONFIG_CENTER_MODULE = "config_center";
    static final String HR_MODULE = "human_resources";

    private static final List<TabDefinition> CATALOG = List.of(
        new TabDefinition(CONFIG_CENTER_MODULE, "profile", "Profile"),
        new TabDefinition(CONFIG_CENTER_MODULE, "business-structure", "Business Structure"),
        new TabDefinition(CONFIG_CENTER_MODULE, "business-profile", "Business Profile"),
        new TabDefinition(CONFIG_CENTER_MODULE, "personal-performance", "Personal Performance"),
        new TabDefinition(CONFIG_CENTER_MODULE, "users", "Users"),
        new TabDefinition(HR_MODULE, "collaborators", "Collaborators"),
        new TabDefinition(HR_MODULE, "attendance", "Attendance"),
        new TabDefinition(HR_MODULE, "control", "Control"),
        new TabDefinition(HR_MODULE, "payroll", "Payroll"),
        new TabDefinition(HR_MODULE, "announcements", "Announcements"),
        new TabDefinition(HR_MODULE, "assets", "Assets"),
        new TabDefinition(HR_MODULE, "records", "Records"),
        new TabDefinition(HR_MODULE, "permissions", "Permissions"),
        new TabDefinition(HR_MODULE, "incentives", "Incentives"),
        new TabDefinition(HR_MODULE, "kpis", "KPIs")
    );
    static final Set<String> VALID_KEYS = validKeys();

    private ConfigCenterTabPermissionCatalog() {
    }

    static List<Map<String, Object>> catalogTabs() {
        var rows = new ArrayList<Map<String, Object>>();
        for (var tab : CATALOG) {
            var row = new LinkedHashMap<String, Object>();
            row.put("module_slug", tab.moduleSlug());
            row.put("tab_key", tab.tabKey());
            row.put("permission_key", tab.moduleSlug() + "." + tab.tabKey());
            row.put("name", tab.name());
            rows.add(row);
        }
        return rows;
    }

    public static List<String> permissionKeysForModuleSlugs(Set<String> moduleSlugs) {
        var keys = new ArrayList<String>();
        for (var tab : CATALOG) {
            if (moduleSlugs.contains(tab.moduleSlug())) {
                keys.add(tab.moduleSlug() + "." + tab.tabKey());
            }
        }
        return keys;
    }

    private static Set<String> validKeys() {
        var keys = new LinkedHashSet<String>();
        for (var tab : CATALOG) {
            keys.add(tab.moduleSlug() + "." + tab.tabKey());
        }
        return Set.copyOf(keys);
    }

    private record TabDefinition(String moduleSlug, String tabKey, String name) {
    }
}
