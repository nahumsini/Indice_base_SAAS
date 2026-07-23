package com.indice.erp.billing.subscription;

import com.indice.erp.auth.BasicModuleCatalog;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.util.Collection;
import java.util.List;
import org.springframework.jdbc.core.BatchPreparedStatementSetter;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
class CompanyModuleEntitlementRepository {

    private final JdbcTemplate jdbcTemplate;

    CompanyModuleEntitlementRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    void grantLaunchOffer(long companyId) {
        upsertEntitlements(companyId, BasicModuleCatalog.launchOfferModules(), "launch_basic_trial");
    }

    void grantUserLaunchRoles(long userCompanyId) {
        upsertUserRoles(userCompanyId, BasicModuleCatalog.launchOfferModules());
    }

    void storePaidPlan(long companyId, Collection<String> selectedModules) {
        jdbcTemplate.update(
            "UPDATE company_subscription_plan_modules SET status = 'inactive' WHERE company_id = ?",
            companyId
        );
        upsertPlanModules(companyId, BasicModuleCatalog.normalizeSelectedModules(selectedModules));
    }

    void activatePaidPlan(long companyId) {
        var modules = BasicModuleCatalog.paidEntitlementModules(paidPlanModules(companyId));
        jdbcTemplate.update(
            """
                UPDATE company_module_entitlements
                SET status = 'inactive'
                WHERE company_id = ?
                  AND source IN ('launch_basic_trial', 'paid_subscription')
                """,
            companyId
        );
        upsertEntitlements(companyId, modules, "paid_subscription");
    }

    void activatePaidPlanBySubscription(String stripeSubscriptionId) {
        companyIdForSubscription(stripeSubscriptionId).ifPresent(this::activatePaidPlan);
    }

    boolean hasActiveEntitlement(long companyId, String moduleSlug) {
        var count = jdbcTemplate.queryForObject(
            """
                SELECT COUNT(*)
                FROM company_module_entitlements
                WHERE company_id = ?
                  AND module_slug = ?
                  AND LOWER(COALESCE(status, 'active')) = 'active'
                """,
            Long.class,
            companyId,
            moduleSlug
        );
        return count != null && count > 0;
    }

    List<String> paidPlanModules(long companyId) {
        return jdbcTemplate.query(
            """
                SELECT module_slug
                FROM company_subscription_plan_modules
                WHERE company_id = ?
                  AND status = 'active'
                ORDER BY id ASC
                """,
            (rs, rowNum) -> rs.getString("module_slug"),
            companyId
        );
    }

    private java.util.Optional<Long> companyIdForSubscription(String subscriptionId) {
        return jdbcTemplate.query(
            "SELECT company_id FROM company_billing_subscriptions WHERE stripe_subscription_id = ? LIMIT 1",
            (rs, rowNum) -> rs.getLong("company_id"),
            subscriptionId
        ).stream().findFirst();
    }

    private void upsertEntitlements(long companyId, List<String> modules, String source) {
        jdbcTemplate.batchUpdate(
            """
                INSERT INTO company_module_entitlements (company_id, module_slug, status, source)
                SELECT ?, slug, 'active', ? FROM modules WHERE slug = ? AND COALESCE(is_active, 1) = 1
                ON DUPLICATE KEY UPDATE status = VALUES(status), source = VALUES(source)
                """,
            batch(companyId, source, modules)
        );
    }

    private void upsertPlanModules(long companyId, List<String> modules) {
        jdbcTemplate.batchUpdate(
            """
                INSERT INTO company_subscription_plan_modules (company_id, module_slug, source, status)
                SELECT ?, slug, 'signup', 'active' FROM modules WHERE slug = ? AND COALESCE(is_active, 1) = 1
                ON DUPLICATE KEY UPDATE source = VALUES(source), status = VALUES(status)
                """,
            batch(companyId, modules)
        );
    }

    private void upsertUserRoles(long userCompanyId, List<String> modules) {
        jdbcTemplate.batchUpdate(
            """
                INSERT INTO user_company_module_roles (user_company_id, module_slug, role, skill_level)
                SELECT ?, slug, 'admin', 100 FROM modules WHERE slug = ? AND COALESCE(is_active, 1) = 1
                ON DUPLICATE KEY UPDATE role = VALUES(role), skill_level = VALUES(skill_level)
                """,
            batch(userCompanyId, modules)
        );
    }

    private BatchPreparedStatementSetter batch(long id, List<String> modules) {
        return batch(id, null, modules);
    }

    private BatchPreparedStatementSetter batch(long id, String source, List<String> modules) {
        return new BatchPreparedStatementSetter() {
            @Override public void setValues(PreparedStatement ps, int i) throws SQLException {
                ps.setLong(1, id);
                if (source == null) {
                    ps.setString(2, modules.get(i));
                } else {
                    ps.setString(2, source);
                    ps.setString(3, modules.get(i));
                }
            }
            @Override public int getBatchSize() {
                return modules.size();
            }
        };
    }
}
