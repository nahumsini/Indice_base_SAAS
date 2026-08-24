package com.indice.erp.dashboard;

import com.indice.erp.access.ModuleSlugNormalizer;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
class DashboardModuleAccessRepository {

    private static final Set<String> FULL_ACCESS_ROLES = Set.of("root", "superadmin");

    private final JdbcTemplate jdbcTemplate;

    DashboardModuleAccessRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    DashboardModuleAccess loadAccess(long userId, long companyId, String sessionRole) {
        var accessRows = jdbcTemplate.query(
            """
                SELECT id, COALESCE(role, 'user') AS role
                FROM user_companies
                WHERE user_id = ?
                  AND company_id = ?
                  AND LOWER(COALESCE(status, 'active')) IN ('active', 'activo')
                ORDER BY id DESC
                LIMIT 1
                """,
            (rs, rowNum) -> new UserCompanyAccess(
                rs.getLong("id"),
                normalizeRole(rs.getString("role"))
            ),
            userId,
            companyId
        );

        if (accessRows.isEmpty()) {
            if (FULL_ACCESS_ROLES.contains(normalizeRole(sessionRole))) {
                return DashboardModuleAccess.only(listCompanyEntitlements(companyId));
            }
            return DashboardModuleAccess.none();
        }

        var access = accessRows.getFirst();
        var entitlements = listCompanyEntitlements(companyId);
        if (entitlements.isEmpty()) {
            return DashboardModuleAccess.none();
        }
        var role = firstNonBlank(access.role(), normalizeRole(sessionRole));
        if (FULL_ACCESS_ROLES.contains(role)) {
            return DashboardModuleAccess.only(entitlements);
        }

        var moduleSlugs = listModuleSlugs(access.userCompanyId());
        moduleSlugs.retainAll(entitlements);
        return DashboardModuleAccess.only(moduleSlugs);
    }

    DashboardModuleAccess loadPublicDemoAccess() {
        var moduleSlugs = new LinkedHashSet<>(jdbcTemplate.query(
            """
                SELECT slug
                FROM modules
                WHERE COALESCE(is_active, 1) = 1
                  AND COALESCE(assignment_enabled, 1) = 1
                  AND LOWER(COALESCE(lifecycle_status, 'released')) IN ('pilot', 'released')
                  AND slug <> 'config_center'
                ORDER BY sort_order ASC, id ASC
                """,
            (rs, rowNum) -> normalizeModuleSlug(rs.getString("slug"))
        ));
        return DashboardModuleAccess.only(moduleSlugs);
    }

    private Set<String> listCompanyEntitlements(long companyId) {
        return new LinkedHashSet<>(jdbcTemplate.query(
            """
                SELECT DISTINCT module_slug
                FROM company_module_entitlements
                WHERE company_id = ?
                  AND LOWER(COALESCE(status, 'active')) = 'active'
                ORDER BY module_slug ASC
                """,
            (rs, rowNum) -> normalizeModuleSlug(rs.getString("module_slug")),
            companyId
        ));
    }

    private Set<String> listModuleSlugs(long userCompanyId) {
        return new LinkedHashSet<>(jdbcTemplate.query(
            """
                SELECT DISTINCT module_slug
                FROM user_company_module_roles
                WHERE user_company_id = ?
                ORDER BY module_slug ASC
                """,
            (rs, rowNum) -> normalizeModuleSlug(rs.getString("module_slug")),
            userCompanyId
        ));
    }

    private String firstNonBlank(String... values) {
        for (var value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return "";
    }

    private String normalizeRole(String value) {
        var normalized = value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "super admin", "superadmin" -> "superadmin";
            case "owner" -> "owner";
            case "dueno", "dueño" -> "dueno";
            default -> normalized;
        };
    }

    private String normalizeModuleSlug(String value) {
        return ModuleSlugNormalizer.normalize(value);
    }

    private record UserCompanyAccess(long userCompanyId, String role) {
    }

    record DashboardModuleAccess(boolean allModules, Set<String> moduleSlugs) {
        static DashboardModuleAccess all() {
            return new DashboardModuleAccess(true, Set.of());
        }

        static DashboardModuleAccess only(Set<String> moduleSlugs) {
            return new DashboardModuleAccess(false, Set.copyOf(moduleSlugs));
        }

        static DashboardModuleAccess none() {
            return only(Set.of());
        }
    }
}
