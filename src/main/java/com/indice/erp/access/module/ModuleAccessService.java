package com.indice.erp.access.module;

import com.indice.erp.access.ModuleSlugNormalizer;
import com.indice.erp.auth.AuthSessionUser;
import java.util.Locale;
import java.util.Set;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class ModuleAccessService {

    private static final Set<String> FULL_ACCESS_ROLES = Set.of("root", "superadmin");

    private final JdbcTemplate jdbcTemplate;

    public ModuleAccessService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public boolean canAccess(AuthSessionUser user, String rawModuleSlug) {
        var moduleSlug = ModuleSlugNormalizer.normalize(rawModuleSlug);
        if (moduleSlug.isBlank() || !companyCanAccess(user.companyId(), moduleSlug)) {
            return false;
        }
        if (FULL_ACCESS_ROLES.contains(normalizeRole(user.role()))) {
            return true;
        }

        var userCompanyId = user.userCompanyId();
        if (userCompanyId == null) {
            var rows = jdbcTemplate.query(
                """
                    SELECT id
                    FROM user_companies
                    WHERE user_id = ?
                      AND company_id = ?
                      AND LOWER(COALESCE(status, 'active')) IN ('active', 'activo')
                    ORDER BY id DESC
                    LIMIT 1
                    """,
                (rs, rowNum) -> rs.getLong("id"),
                user.userId(),
                user.companyId()
            );
            userCompanyId = rows.isEmpty() ? null : rows.getFirst();
        }
        if (userCompanyId == null) {
            return false;
        }

        var grants = jdbcTemplate.queryForObject(
            """
                SELECT COUNT(*)
                FROM user_company_module_roles
                WHERE user_company_id = ?
                  AND module_slug = ?
                """,
            Integer.class,
            userCompanyId,
            moduleSlug
        );
        return grants != null && grants > 0;
    }

    /**
     * Company-level entitlement and release gate. This intentionally does not grant a user any
     * module or tab authority; callers must apply those narrower gates when a person operates the
     * module.
     */
    public boolean companyCanAccess(long companyId, String rawModuleSlug) {
        var moduleSlug = ModuleSlugNormalizer.normalize(rawModuleSlug);
        if (companyId <= 0 || moduleSlug.isBlank()) {
            return false;
        }
        var count = jdbcTemplate.queryForObject(
            """
                SELECT COUNT(*)
                FROM modules module_row
                INNER JOIN company_module_entitlements entitlement
                  ON entitlement.company_id = ?
                 AND entitlement.module_slug = module_row.slug
                 AND LOWER(COALESCE(entitlement.status, 'active')) = 'active'
                WHERE module_row.slug = ?
                  AND NOT EXISTS (SELECT 1 FROM billing_trial_entries trial_entry
                    WHERE trial_entry.company_id = entitlement.company_id AND trial_entry.status = 'ACTIVE'
                      AND trial_entry.trial_ends_at <= CURRENT_TIMESTAMP(6))
                  AND COALESCE(module_row.is_active, 1) = 1
                  AND COALESCE(module_row.assignment_enabled, 1) = 1
                  AND LOWER(COALESCE(module_row.lifecycle_status, 'released')) IN ('pilot', 'released')
                """,
            Integer.class,
            companyId,
            moduleSlug
        );
        return count != null && count > 0;
    }

    /** Current entitlement/release read for a complete use case inside an existing transaction.
     * Does not confer user/tab authority. Keeps Engine idempotency and the owner mutation atomic.
     */
    public boolean companyCanAccessForMutation(long companyId, String rawModuleSlug) {
        if (!org.springframework.transaction.support.TransactionSynchronizationManager.isActualTransactionActive()) {
            throw new IllegalStateException("Entitlement locking requires a transaction.");
        }
        var slug = ModuleSlugNormalizer.normalize(rawModuleSlug);
        if (companyId <= 0 || slug.isBlank()) return false;
        return !jdbcTemplate.query("""
            SELECT module_row.slug FROM modules module_row
            INNER JOIN company_module_entitlements entitlement
              ON entitlement.company_id=? AND entitlement.module_slug=module_row.slug
            WHERE module_row.slug=? AND LOWER(COALESCE(entitlement.status,'active'))='active'
              AND NOT EXISTS (SELECT 1 FROM billing_trial_entries trial_entry
                WHERE trial_entry.company_id = entitlement.company_id AND trial_entry.status = 'ACTIVE'
                  AND trial_entry.trial_ends_at <= CURRENT_TIMESTAMP(6))
              AND COALESCE(module_row.is_active,1)=1 AND COALESCE(module_row.assignment_enabled,1)=1
              AND LOWER(COALESCE(module_row.lifecycle_status,'released')) IN ('pilot','released')
            FOR SHARE
            """,(r,n)->r.getString(1),companyId,slug).isEmpty();
    }

    private String normalizeRole(String rawRole) {
        var role = rawRole == null ? "" : rawRole.trim().toLowerCase(Locale.ROOT);
        return "super admin".equals(role) ? "superadmin" : role;
    }
}
