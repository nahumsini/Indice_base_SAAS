package com.indice.erp.finance;

import com.indice.erp.access.ModuleSlugNormalizer;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.shared.FinanceScope;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class FinanceAccessService {

    private static final Set<String> FINANCE_MODULE_SLUGS = Set.of(
        "cartera",
        "expenses",
        "finance",
        "receivables"
    );
    private static final Set<String> PAYMENT_ACCOUNT_READ_MODULE_SLUGS = Set.of(
        "cartera",
        "crm",
        "expenses",
        "finance",
        "receivables"
    );
    private static final Set<String> FULL_ACCESS_ROLES = Set.of("root", "superadmin");
    private static final Set<String> LEGACY_ADMIN_ROLES = Set.of("admin", "owner");

    private final JdbcTemplate jdbcTemplate;

    public FinanceAccessService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public Optional<FinanceContext> resolveContext(AuthSessionUser currentUser) {
        return resolveContext(currentUser, FINANCE_MODULE_SLUGS);
    }

    public Optional<FinanceContext> resolvePaymentAccountContext(AuthSessionUser currentUser) {
        return resolveContext(currentUser, PAYMENT_ACCOUNT_READ_MODULE_SLUGS);
    }

    private Optional<FinanceContext> resolveContext(AuthSessionUser currentUser, Set<String> allowedModuleSlugs) {
        var role = normalizeRole(currentUser.role());
        if (FULL_ACCESS_ROLES.contains(role)) {
            return Optional.of(toContext(currentUser, role, true, FinanceScope.corporateOffice()));
        }

        var userCompanyId = activeUserCompanyId(currentUser);
        if (userCompanyId == null) {
            return Optional.empty();
        }

        var moduleSlugs = listModuleSlugs(userCompanyId);
        if (!hasModuleAccess(role, moduleSlugs, allowedModuleSlugs)) {
            return Optional.empty();
        }

        return Optional.of(toContext(currentUser, role, true, resolveScope(currentUser.companyId(), userCompanyId)));
    }

    public boolean containsAssignment(FinanceContext context, Long unitId, Long businessId) {
        return switch (context.scope().type()) {
            case CORPORATE_OFFICE -> true;
            case UNIT_HEADQUARTERS -> unitMatches(context.scope().unitId(), unitId)
                || businessBelongsToUnit(context.companyId(), businessId, context.scope().unitId());
            case BUSINESS_OFFICE -> businessId != null && businessId.equals(context.scope().businessId());
        };
    }

    private FinanceContext toContext(
            AuthSessionUser currentUser,
            String role,
            boolean moduleAccess,
            FinanceScope scope) {
        return new FinanceContext(
            currentUser.userId(),
            currentUser.companyId(),
            currentUser.userName(),
            role,
            moduleAccess,
            scope
        );
    }

    private Long activeUserCompanyId(AuthSessionUser currentUser) {
        var rows = jdbcTemplate.query(
            """
                SELECT id
                FROM user_companies
                WHERE user_id = ?
                  AND company_id = ?
                  AND LOWER(COALESCE(status, 'active')) = 'active'
                ORDER BY id DESC
                LIMIT 1
                """,
            (rs, rowNum) -> rs.getLong("id"),
            currentUser.userId(),
            currentUser.companyId()
        );
        return rows.isEmpty() ? null : rows.getFirst();
    }

    private Set<String> listModuleSlugs(long userCompanyId) {
        var rows = jdbcTemplate.query(
            """
                SELECT DISTINCT module_slug
                FROM user_company_module_roles
                WHERE user_company_id = ?
                ORDER BY module_slug ASC
                """,
            (rs, rowNum) -> ModuleSlugNormalizer.normalize(rs.getString("module_slug")),
            userCompanyId
        );

        var moduleSlugs = new LinkedHashSet<String>();
        for (var row : rows) {
            if (!row.isBlank()) {
                moduleSlugs.add(row);
            }
        }
        return moduleSlugs;
    }

    private boolean hasModuleAccess(String role, Set<String> moduleSlugs, Set<String> allowedModuleSlugs) {
        if (moduleSlugs.isEmpty()) {
            return LEGACY_ADMIN_ROLES.contains(role);
        }
        return moduleSlugs.stream().anyMatch(allowedModuleSlugs::contains);
    }

    private FinanceScope resolveScope(long companyId, long userCompanyId) {
        var rows = jdbcTemplate.query(
            """
                SELECT unit_id, business_id
                FROM user_work_profiles
                WHERE company_id = ?
                  AND user_company_id = ?
                ORDER BY id DESC
                LIMIT 1
                """,
            (rs, rowNum) -> scopeForAssignment(getNullableLong(rs, "unit_id"), getNullableLong(rs, "business_id")),
            companyId,
            userCompanyId
        );
        return rows.isEmpty() ? FinanceScope.corporateOffice() : rows.getFirst();
    }

    private FinanceScope scopeForAssignment(Long unitId, Long businessId) {
        if (businessId != null) {
            return FinanceScope.businessOffice(unitId, businessId);
        }
        if (unitId != null) {
            return FinanceScope.unitHeadquarters(unitId);
        }
        return FinanceScope.corporateOffice();
    }

    private boolean unitMatches(Long scopeUnitId, Long targetUnitId) {
        return scopeUnitId != null && scopeUnitId.equals(targetUnitId);
    }

    private boolean businessBelongsToUnit(long companyId, Long businessId, Long unitId) {
        if (businessId == null || unitId == null) {
            return false;
        }
        var count = jdbcTemplate.queryForObject(
            """
                SELECT COUNT(*)
                FROM businesses
                WHERE id = ?
                  AND unit_id = ?
                  AND (company_id = ? OR company_id IS NULL)
                """,
            Long.class,
            businessId,
            unitId,
            companyId
        );
        return count != null && count > 0;
    }

    private Long getNullableLong(ResultSet rs, String column) throws SQLException {
        var value = rs.getLong(column);
        return rs.wasNull() ? null : value;
    }

    private String normalizeRole(String value) {
        var normalized = value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
        return "super admin".equals(normalized) ? "superadmin" : normalized;
    }
}
