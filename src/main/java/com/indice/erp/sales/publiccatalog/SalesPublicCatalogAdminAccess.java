package com.indice.erp.sales.publiccatalog;

import com.indice.erp.access.ModuleSlugNormalizer;
import com.indice.erp.auth.AuthSessionUser;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.Set;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/** Resolves the authenticated Sales administrator and freezes their organizational scope. */
@Service
public class SalesPublicCatalogAdminAccess {

    private static final Set<String> FULL_ACCESS_ROLES = Set.of("root", "superadmin");
    private static final Set<String> LEGACY_ADMIN_ROLES = Set.of("admin", "owner", "dueno");
    private static final Set<String> SALES_MODULE_SLUGS = Set.of("crm");

    private final JdbcTemplate jdbcTemplate;

    public SalesPublicCatalogAdminAccess(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public AdminContext require(AuthSessionUser currentUser) {
        if (currentUser == null || currentUser.userId() == null || currentUser.companyId() == null) {
            throw new SecurityException("Sales catalog administration is unavailable.");
        }
        var role = normalizeRole(currentUser.role());
        if (FULL_ACCESS_ROLES.contains(role)) {
            return AdminContext.corporate(currentUser.userId(), currentUser.companyId());
        }

        var userCompanyId = activeUserCompanyId(currentUser);
        if (userCompanyId == null) {
            throw new SecurityException("Sales catalog administration is unavailable.");
        }
        var modules = moduleSlugs(userCompanyId);
        if (!modules.isEmpty() && modules.stream().noneMatch(SALES_MODULE_SLUGS::contains)) {
            throw new SecurityException("Sales catalog administration is unavailable.");
        }
        if (modules.isEmpty() && !LEGACY_ADMIN_ROLES.contains(role)) {
            throw new SecurityException("Sales catalog administration is unavailable.");
        }

        var assignment = assignment(currentUser.companyId(), userCompanyId);
        if (assignment == null || assignment.unitId() == null) {
            throw new SecurityException("An organizational assignment is required.");
        }
        if (LEGACY_ADMIN_ROLES.contains(role)) {
            return AdminContext.unit(
                currentUser.userId(), currentUser.companyId(), assignment.unitId());
        }
        if (assignment.businessId() == null) {
            throw new SecurityException("A Business assignment is required.");
        }
        return AdminContext.business(
            currentUser.userId(), currentUser.companyId(), assignment.unitId(), assignment.businessId());
    }

    private Long activeUserCompanyId(AuthSessionUser currentUser) {
        var preferred = currentUser.userCompanyId();
        var rows = jdbcTemplate.query(
            """
                SELECT id
                FROM user_companies
                WHERE user_id = ? AND company_id = ?
                  AND LOWER(COALESCE(status, 'active')) IN ('active', 'activo')
                  AND (? IS NULL OR id = ?)
                ORDER BY CASE WHEN id = ? THEN 0 ELSE 1 END, id DESC
                LIMIT 1
                """,
            (rs, rowNum) -> rs.getLong("id"),
            currentUser.userId(), currentUser.companyId(), preferred, preferred, preferred);
        return rows.isEmpty() ? null : rows.getFirst();
    }

    private Set<String> moduleSlugs(long userCompanyId) {
        var rows = jdbcTemplate.query(
            "SELECT DISTINCT module_slug FROM user_company_module_roles WHERE user_company_id = ?",
            (rs, rowNum) -> ModuleSlugNormalizer.normalize(rs.getString("module_slug")),
            userCompanyId);
        return new LinkedHashSet<>(rows);
    }

    private Assignment assignment(long companyId, long userCompanyId) {
        var rows = jdbcTemplate.query(
            """
                SELECT unit_id, business_id
                FROM user_work_profiles
                WHERE company_id = ? AND user_company_id = ?
                ORDER BY id DESC
                LIMIT 1
                """,
            (rs, rowNum) -> new Assignment(nullableLong(rs, "unit_id"), nullableLong(rs, "business_id")),
            companyId, userCompanyId);
        return rows.isEmpty() ? null : rows.getFirst();
    }

    private Long nullableLong(ResultSet rs, String column) throws SQLException {
        return rs.getObject(column, Long.class);
    }

    private String normalizeRole(String value) {
        var normalized = value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "super admin" -> "superadmin";
            case "dueño" -> "dueno";
            default -> normalized;
        };
    }

    public record AdminContext(
            long userId,
            long companyId,
            ScopeType scopeType,
            Long unitId,
            Long businessId) {

        static AdminContext corporate(long userId, long companyId) {
            return new AdminContext(userId, companyId, ScopeType.CORPORATE, null, null);
        }

        static AdminContext unit(long userId, long companyId, long unitId) {
            return new AdminContext(userId, companyId, ScopeType.UNIT, unitId, null);
        }

        static AdminContext business(long userId, long companyId, long unitId, long businessId) {
            return new AdminContext(userId, companyId, ScopeType.BUSINESS, unitId, businessId);
        }

        public boolean includes(Long targetUnitId, Long targetBusinessId) {
            if (scopeType == ScopeType.CORPORATE) return true;
            if (targetUnitId == null || targetBusinessId == null) return false;
            return switch (scopeType) {
                case CORPORATE -> true;
                case UNIT -> unitId.equals(targetUnitId);
                case BUSINESS -> unitId.equals(targetUnitId) && businessId.equals(targetBusinessId);
            };
        }

        public void requireIncludes(Long targetUnitId, Long targetBusinessId) {
            if (!includes(targetUnitId, targetBusinessId)) {
                throw new SecurityException("The requested catalog scope is unavailable.");
            }
        }
    }

    public enum ScopeType {
        CORPORATE,
        UNIT,
        BUSINESS
    }

    private record Assignment(Long unitId, Long businessId) {
    }
}
