package com.indice.erp.configcenter.users;

import com.indice.erp.access.ModuleSlugNormalizer;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.springframework.jdbc.core.JdbcTemplate;

public class ConfigCenterTabPermissionAccess {

    private final JdbcTemplate jdbcTemplate;

    public ConfigCenterTabPermissionAccess(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public boolean hasTabPermissionPayload(Map<String, Object> payload) {
        return payload.containsKey("tab_permission_keys")
            || payload.containsKey("tabPermissionKeys")
            || payload.containsKey("tab_permissions")
            || payload.containsKey("tabPermissions");
    }

    public List<String> normalizeTabPermissionKeys(Map<String, Object> payload) {
        var raw = firstPresent(
            payload,
            "tab_permission_keys",
            "tabPermissionKeys",
            "tab_permissions",
            "tabPermissions"
        );
        return normalizeRawValue(raw);
    }

    public void ensureTabPermissionKeysValid(List<String> permissionKeys, List<String> moduleSlugs) {
        if (permissionKeys == null || permissionKeys.isEmpty()) {
            return;
        }

        var allowedModules = new LinkedHashSet<>(moduleSlugs == null ? List.<String>of() : moduleSlugs);
        var unknown = new ArrayList<String>();
        var outsideModuleAccess = new ArrayList<String>();
        for (var key : permissionKeys) {
            if (!ConfigCenterTabPermissionCatalog.VALID_KEYS.contains(key)) {
                unknown.add(key);
                continue;
            }
            var moduleSlug = moduleSlug(key);
            if (!allowedModules.contains(moduleSlug)) {
                outsideModuleAccess.add(key);
            }
        }
        if (!unknown.isEmpty()) {
            throw new IllegalArgumentException("Unknown tab permission: " + String.join(", ", unknown));
        }
        if (!outsideModuleAccess.isEmpty()) {
            throw new IllegalArgumentException("Tab permissions must belong to assigned modules: " + String.join(", ", outsideModuleAccess));
        }
    }

    public List<String> listUserTabPermissionKeys(long userCompanyId) {
        return jdbcTemplate.query(
            """
                SELECT module_slug, tab_key
                FROM user_company_tab_permissions
                WHERE user_company_id = ?
                  AND can_view = 1
                ORDER BY module_slug ASC, tab_key ASC
                """,
            (rs, rowNum) -> permissionKey(rs.getString("module_slug"), rs.getString("tab_key")),
            userCompanyId
        );
    }

    public boolean hasUserTabPermissionRows(long userCompanyId) {
        var rowCount = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM user_company_tab_permissions WHERE user_company_id = ?",
            Long.class,
            userCompanyId
        );
        return rowCount != null && rowCount > 0;
    }

    public void replaceUserTabPermissions(long userCompanyId, List<String> permissionKeys) {
        replaceUserTabPermissions(userCompanyId, permissionKeys, modulesFromPermissionKeys(permissionKeys));
    }

    public void replaceUserTabPermissions(long userCompanyId, List<String> permissionKeys, List<String> moduleSlugs) {
        jdbcTemplate.update("DELETE FROM user_company_tab_permissions WHERE user_company_id = ?", userCompanyId);
        var allowedKeys = new LinkedHashSet<>(permissionKeys == null ? List.<String>of() : permissionKeys);
        for (var key : catalogPermissionKeysForModules(moduleSlugs)) {
            jdbcTemplate.update(
                """
                    INSERT INTO user_company_tab_permissions (user_company_id, module_slug, tab_key, can_view)
                    VALUES (?, ?, ?, ?)
                    """,
                userCompanyId,
                moduleSlug(key),
                tabKey(key),
                allowedKeys.contains(key) ? 1 : 0
            );
        }
    }

    public List<String> listInvitationTabPermissionKeys(long invitationId) {
        return jdbcTemplate.query(
            """
                SELECT module_slug, tab_key
                FROM user_invitation_tab_permissions
                WHERE invitation_id = ?
                  AND can_view = 1
                ORDER BY module_slug ASC, tab_key ASC
                """,
            (rs, rowNum) -> permissionKey(rs.getString("module_slug"), rs.getString("tab_key")),
            invitationId
        );
    }

    public boolean hasInvitationTabPermissionRows(long invitationId) {
        var rowCount = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM user_invitation_tab_permissions WHERE invitation_id = ?",
            Long.class,
            invitationId
        );
        return rowCount != null && rowCount > 0;
    }

    public void replaceInvitationTabPermissions(long invitationId, List<String> permissionKeys) {
        replaceInvitationTabPermissions(invitationId, permissionKeys, modulesFromPermissionKeys(permissionKeys));
    }

    public void replaceInvitationTabPermissions(long invitationId, List<String> permissionKeys, List<String> moduleSlugs) {
        jdbcTemplate.update("DELETE FROM user_invitation_tab_permissions WHERE invitation_id = ?", invitationId);
        var allowedKeys = new LinkedHashSet<>(permissionKeys == null ? List.<String>of() : permissionKeys);
        for (var key : catalogPermissionKeysForModules(moduleSlugs)) {
            jdbcTemplate.update(
                """
                    INSERT INTO user_invitation_tab_permissions (invitation_id, module_slug, tab_key, can_view)
                    VALUES (?, ?, ?, ?)
                    """,
                invitationId,
                moduleSlug(key),
                tabKey(key),
                allowedKeys.contains(key) ? 1 : 0
            );
        }
    }

    public void copyInvitationTabPermissionsToUserCompany(long invitationId, long userCompanyId) {
        jdbcTemplate.update("DELETE FROM user_company_tab_permissions WHERE user_company_id = ?", userCompanyId);
        jdbcTemplate.update(
            """
                INSERT INTO user_company_tab_permissions (user_company_id, module_slug, tab_key, can_view)
                SELECT ?, module_slug, tab_key, can_view
                FROM user_invitation_tab_permissions
                WHERE invitation_id = ?
                """,
            userCompanyId,
            invitationId
        );
    }

    public List<Map<String, Object>> catalogTabs() {
        return ConfigCenterTabPermissionCatalog.catalogTabs();
    }

    private List<String> catalogPermissionKeysForModules(List<String> moduleSlugs) {
        var modules = new LinkedHashSet<>(moduleSlugs == null ? List.<String>of() : moduleSlugs);
        return ConfigCenterTabPermissionCatalog.permissionKeysForModuleSlugs(modules);
    }

    private List<String> modulesFromPermissionKeys(List<String> permissionKeys) {
        var modules = new LinkedHashSet<String>();
        for (var key : permissionKeys == null ? List.<String>of() : permissionKeys) {
            modules.add(moduleSlug(key));
        }
        return new ArrayList<>(modules);
    }

    private List<String> normalizeRawValue(Object rawValue) {
        var result = new LinkedHashSet<String>();
        if (rawValue instanceof List<?> rawList) {
            for (var entry : rawList) {
                addNormalizedEntry(result, entry);
            }
        } else if (rawValue instanceof Map<?, ?> rawMap) {
            for (var entry : rawMap.entrySet()) {
                var moduleSlug = normalizeModuleSlug(String.valueOf(entry.getKey()));
                if (entry.getValue() instanceof List<?> tabs) {
                    for (var tab : tabs) {
                        result.add(permissionKey(moduleSlug, normalizeTabKey(String.valueOf(tab))));
                    }
                } else if (entry.getValue() instanceof Boolean enabled && enabled) {
                    result.add(normalizePermissionKey(String.valueOf(entry.getKey())));
                }
            }
        }
        return new ArrayList<>(result);
    }

    private void addNormalizedEntry(Set<String> result, Object entry) {
        if (entry instanceof Map<?, ?> rawMap) {
            var permissionKey = stringValue(rawMap, "permission_key", "permissionKey", "key");
            if (!permissionKey.isBlank()) {
                result.add(normalizePermissionKey(permissionKey));
                return;
            }
            var moduleSlug = stringValue(rawMap, "module_slug", "moduleSlug", "module");
            var tabKey = stringValue(rawMap, "tab_key", "tabKey", "tab");
            if (!moduleSlug.isBlank() && !tabKey.isBlank()) {
                result.add(permissionKey(normalizeModuleSlug(moduleSlug), normalizeTabKey(tabKey)));
            }
            return;
        }

        var rawText = String.valueOf(entry);
        if (!rawText.isBlank()) {
            result.add(normalizePermissionKey(rawText));
        }
    }

    private Object firstPresent(Map<String, Object> payload, String... keys) {
        for (var key : keys) {
            if (payload.containsKey(key)) {
                return payload.get(key);
            }
        }
        return Collections.emptyList();
    }

    private String stringValue(Map<?, ?> payload, String... keys) {
        for (var key : keys) {
            var value = payload.get(key);
            if (value != null) {
                return String.valueOf(value).trim();
            }
        }
        return "";
    }

    private String normalizePermissionKey(String rawValue) {
        var normalized = rawValue.trim().toLowerCase(Locale.ROOT).replace('_', '-');
        var separatorIndex = normalized.indexOf('.');
        if (separatorIndex < 1 || separatorIndex == normalized.length() - 1) {
            return normalized;
        }
        return permissionKey(
            normalizeModuleSlug(normalized.substring(0, separatorIndex)),
            normalizeTabKey(normalized.substring(separatorIndex + 1))
        );
    }

    private String normalizeModuleSlug(String rawValue) {
        return ModuleSlugNormalizer.normalize(rawValue);
    }

    private String normalizeTabKey(String rawValue) {
        var normalized = rawValue.trim().toLowerCase(Locale.ROOT).replace('_', '-');
        return switch (normalized) {
            case "recursos-humanos" -> "human-resources";
            case "businessstructure" -> "business-structure";
            case "businessprofile" -> "business-profile";
            case "personalperformance" -> "personal-performance";
            case "paymentaccounts" -> "payment-accounts";
            default -> normalized;
        };
    }

    private String permissionKey(String moduleSlug, String tabKey) {
        return moduleSlug + "." + tabKey;
    }

    private String moduleSlug(String permissionKey) {
        return permissionKey.substring(0, permissionKey.indexOf('.'));
    }

    private String tabKey(String permissionKey) {
        return permissionKey.substring(permissionKey.indexOf('.') + 1);
    }

}
