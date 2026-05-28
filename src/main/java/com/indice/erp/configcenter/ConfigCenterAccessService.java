package com.indice.erp.configcenter;

import com.indice.erp.auth.AuthSessionUser;
import java.util.Arrays;
import java.util.Locale;
import java.util.Set;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class ConfigCenterAccessService {

    private static final String CONFIG_CENTER_MODULE = "config_center";
    private static final Set<String> UNRESTRICTED_ROLES = Set.of("root", "superadmin");
    private static final Set<String> SETUP_ROLES = Set.of("root", "superadmin", "admin", "owner", "dueno");
    private static final Set<String> USER_MANAGEMENT_ROLES = Set.of("root", "superadmin", "admin");

    private final JdbcTemplate jdbcTemplate;

    public ConfigCenterAccessService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public boolean canAccess(AuthSessionUser currentUser, ConfigCenterTab tab) {
        var role = normalizeRole(currentUser.role());
        if (UNRESTRICTED_ROLES.contains(role)) {
            return true;
        }
        if (!roleAllowsTab(role, tab)) {
            return false;
        }

        var userCompanyId = userCompanyId(currentUser);
        if (userCompanyId == null) {
            return false;
        }
        if (!hasConfigCenterModuleAccess(userCompanyId, role)) {
            return false;
        }
        if (hasConfiguredTabPermissions(userCompanyId)) {
            return hasAllowedTab(userCompanyId, tab);
        }

        return true;
    }

    public boolean canAccessAny(AuthSessionUser currentUser, ConfigCenterTab... tabs) {
        return Arrays.stream(tabs).anyMatch(tab -> canAccess(currentUser, tab));
    }

    private boolean roleAllowsTab(String role, ConfigCenterTab tab) {
        if (tab == ConfigCenterTab.USERS) {
            return USER_MANAGEMENT_ROLES.contains(role);
        }

        return SETUP_ROLES.contains(role);
    }

    private Long userCompanyId(AuthSessionUser currentUser) {
        var rows = jdbcTemplate.query(
            """
                SELECT id
                FROM user_companies
                WHERE user_id = ?
                  AND company_id = ?
                  AND LOWER(COALESCE(status, 'active')) IN ('active', 'activo')
                LIMIT 1
                """,
            (rs, rowNum) -> rs.getLong("id"),
            currentUser.userId(),
            currentUser.companyId()
        );
        return rows.isEmpty() ? null : rows.getFirst();
    }

    private boolean hasConfigCenterModuleAccess(long userCompanyId, String role) {
        var moduleSlugs = jdbcTemplate.query(
            """
                SELECT DISTINCT module_slug
                FROM user_company_module_roles
                WHERE user_company_id = ?
                ORDER BY module_slug ASC
                """,
            (rs, rowNum) -> rs.getString("module_slug"),
            userCompanyId
        );
        if (moduleSlugs.isEmpty()) {
            return SETUP_ROLES.contains(role);
        }

        return moduleSlugs.contains(CONFIG_CENTER_MODULE);
    }

    private boolean hasConfiguredTabPermissions(long userCompanyId) {
        var rowCount = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM user_company_tab_permissions WHERE user_company_id = ?",
            Long.class,
            userCompanyId
        );
        return rowCount != null && rowCount > 0;
    }

    private boolean hasAllowedTab(long userCompanyId, ConfigCenterTab tab) {
        var rowCount = jdbcTemplate.queryForObject(
            """
                SELECT COUNT(*)
                FROM user_company_tab_permissions
                WHERE user_company_id = ?
                  AND module_slug = ?
                  AND tab_key = ?
                  AND can_view = 1
                """,
            Long.class,
            userCompanyId,
            CONFIG_CENTER_MODULE,
            tab.tabKey()
        );
        return rowCount != null && rowCount > 0;
    }

    private String normalizeRole(String value) {
        var normalized = value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "super admin" -> "superadmin";
            case "dueño" -> "dueno";
            default -> normalized;
        };
    }

    public enum ConfigCenterTab {
        BUSINESS_STRUCTURE("business-structure"),
        BUSINESS_PROFILE("business-profile"),
        USERS("users");

        private final String tabKey;

        ConfigCenterTab(String tabKey) {
            this.tabKey = tabKey;
        }

        public String tabKey() {
            return tabKey;
        }
    }
}
