package com.indice.erp.hr;

import com.indice.erp.access.ModuleSlugNormalizer;
import com.indice.erp.auth.AuthSessionUser;
import java.util.Arrays;
import java.util.EnumSet;
import java.util.Locale;
import java.util.Set;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class HrAccessService {

    private static final String HR_MODULE = "human_resources";
    private static final Set<String> UNRESTRICTED_ROLES = Set.of("root", "superadmin");
    private static final Set<String> HR_MANAGEMENT_ROLES = Set.of(
        "root",
        "superadmin",
        "admin",
        "owner",
        "dueno",
        "manager",
        "approver"
    );
    private static final Set<String> PERSONAL_READ_ROLES = Set.of("user");
    private static final Set<HrTab> PERSONAL_READ_TABS = EnumSet.of(
        HrTab.ANNOUNCEMENTS,
        HrTab.ASSETS,
        HrTab.ATTENDANCE,
        HrTab.CONTROL,
        HrTab.PERMISSIONS
    );
    private final JdbcTemplate jdbcTemplate;

    public HrAccessService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public boolean canAccessManagementTab(AuthSessionUser currentUser, HrTab tab) {
        var role = normalizeRole(currentUser.role());
        if (UNRESTRICTED_ROLES.contains(role)) {
            return true;
        }
        if (!HR_MANAGEMENT_ROLES.contains(role)) {
            return false;
        }

        var userCompanyId = userCompanyId(currentUser);
        return userCompanyId != null && canAccessManagementTab(userCompanyId, role, tab);
    }

    public boolean canAccessManagementTab(long userCompanyId, String rawRole, HrTab tab) {
        var role = normalizeRole(rawRole);
        if (UNRESTRICTED_ROLES.contains(role)) {
            return true;
        }
        if (!HR_MANAGEMENT_ROLES.contains(role)) {
            return false;
        }
        if (!hasHrModuleAccess(userCompanyId, role)) {
            return false;
        }
        return hasAllowedTab(userCompanyId, tab);
    }

    public boolean canAccessAnyManagementTab(AuthSessionUser currentUser, HrTab... tabs) {
        return Arrays.stream(tabs).anyMatch(tab -> canAccessManagementTab(currentUser, tab));
    }

    public boolean canAccessReadableTab(AuthSessionUser currentUser, HrTab tab) {
        var role = normalizeRole(currentUser.role());
        if (UNRESTRICTED_ROLES.contains(role)) {
            return true;
        }

        var userCompanyId = userCompanyId(currentUser);
        return userCompanyId != null && canAccessReadableTab(userCompanyId, role, tab);
    }

    public boolean canAccessReadableTab(long userCompanyId, String rawRole, HrTab tab) {
        var role = normalizeRole(rawRole);
        if (UNRESTRICTED_ROLES.contains(role)) {
            return true;
        }
        if (HR_MANAGEMENT_ROLES.contains(role)) {
            return canAccessManagementTab(userCompanyId, role, tab);
        }
        if (!PERSONAL_READ_ROLES.contains(role) || !PERSONAL_READ_TABS.contains(tab)) {
            return false;
        }
        if (!hasHrModuleAccess(userCompanyId, role)) {
            return false;
        }
        return hasAllowedTab(userCompanyId, tab);
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

    private boolean hasHrModuleAccess(long userCompanyId, String role) {
        var moduleSlugs = jdbcTemplate.query(
            """
                SELECT DISTINCT module_slug
                FROM user_company_module_roles
                WHERE user_company_id = ?
                ORDER BY module_slug ASC
                """,
            (rs, rowNum) -> normalizeModuleSlug(rs.getString("module_slug")),
            userCompanyId
        );
        return moduleSlugs.contains(HR_MODULE);
    }

    private boolean hasAllowedTab(long userCompanyId, HrTab tab) {
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
            HR_MODULE,
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

    private String normalizeModuleSlug(String value) {
        return ModuleSlugNormalizer.normalize(value);
    }

    public enum HrTab {
        COLLABORATORS("collaborators"),
        ATTENDANCE("attendance"),
        CONTROL("control"),
        PAYROLL("payroll"),
        ANNOUNCEMENTS("announcements"),
        ASSETS("assets"),
        RECORDS("records"),
        PERMISSIONS("permissions"),
        INCENTIVES("incentives"),
        KPIS("kpis");

        private final String tabKey;

        HrTab(String tabKey) {
            this.tabKey = tabKey;
        }

        public String tabKey() {
            return tabKey;
        }
    }
}
