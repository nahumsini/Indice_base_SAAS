package com.indice.erp.pos;

import com.indice.erp.access.ModuleSlugNormalizer;
import com.indice.erp.auth.AuthSessionUser;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class PosAccessService {

    private static final Set<String> POS_MODULE_SLUGS = Set.of("pos");
    private static final Set<String> FULL_ACCESS_ROLES = Set.of("root", "superadmin");
    private static final Set<String> LEGACY_ADMIN_ROLES = Set.of("admin", "owner");

    private final JdbcTemplate jdbcTemplate;

    public PosAccessService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public Optional<PosContext> resolveContext(AuthSessionUser currentUser) {
        var role = normalizeRole(currentUser.role());
        if (FULL_ACCESS_ROLES.contains(role)) {
            return Optional.of(toContext(currentUser, role, PosScope.corporateOffice()));
        }

        var userCompanyId = activeUserCompanyId(currentUser);
        if (userCompanyId == null) {
            return Optional.empty();
        }

        var moduleSlugs = listModuleSlugs(userCompanyId);
        if (!hasModuleAccess(role, moduleSlugs)) {
            return Optional.empty();
        }
        return Optional.of(toContext(currentUser, role, resolveScope(currentUser.companyId(), userCompanyId)));
    }

    private PosContext toContext(AuthSessionUser user, String role, PosScope scope) {
        return new PosContext(user.userId(), user.companyId(), user.userName(), role, true, scope);
    }

    private Long activeUserCompanyId(AuthSessionUser currentUser) {
        var rows = jdbcTemplate.query(
            """
            SELECT id FROM user_companies
            WHERE user_id = ? AND company_id = ? AND LOWER(COALESCE(status, 'active')) = 'active'
            ORDER BY id DESC LIMIT 1
            """,
            (rs, rowNum) -> rs.getLong("id"),
            currentUser.userId(),
            currentUser.companyId()
        );
        return rows.isEmpty() ? null : rows.getFirst();
    }

    private Set<String> listModuleSlugs(long userCompanyId) {
        var rows = jdbcTemplate.query(
            "SELECT DISTINCT module_slug FROM user_company_module_roles WHERE user_company_id = ?",
            (rs, rowNum) -> ModuleSlugNormalizer.normalize(rs.getString("module_slug")),
            userCompanyId
        );
        return new LinkedHashSet<>(rows);
    }

    private boolean hasModuleAccess(String role, Set<String> moduleSlugs) {
        if (moduleSlugs.isEmpty()) {
            return LEGACY_ADMIN_ROLES.contains(role);
        }
        return moduleSlugs.stream().anyMatch(POS_MODULE_SLUGS::contains);
    }

    private PosScope resolveScope(long companyId, long userCompanyId) {
        var rows = jdbcTemplate.query(
            """
            SELECT unit_id, business_id FROM user_work_profiles
            WHERE company_id = ? AND user_company_id = ?
            ORDER BY id DESC LIMIT 1
            """,
            (rs, rowNum) -> scopeForAssignment(nullableLong(rs, "unit_id"), nullableLong(rs, "business_id")),
            companyId,
            userCompanyId
        );
        return rows.isEmpty() ? PosScope.corporateOffice() : rows.getFirst();
    }

    private PosScope scopeForAssignment(Long unitId, Long businessId) {
        if (businessId != null) {
            return PosScope.businessOffice(unitId, businessId);
        }
        return unitId == null ? PosScope.corporateOffice() : PosScope.unitHeadquarters(unitId);
    }

    private Long nullableLong(ResultSet rs, String column) throws SQLException {
        var value = rs.getLong(column);
        return rs.wasNull() ? null : value;
    }

    private String normalizeRole(String value) {
        var normalized = value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
        return "super admin".equals(normalized) ? "superadmin" : normalized;
    }
}
