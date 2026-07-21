package com.indice.erp.entitlement;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class CompanyEntitlementRepository {

    private static final List<String> ENTITLED_SUBSCRIPTION_STATUSES = List.of("trialing", "active", "past_due");

    private final JdbcTemplate jdbcTemplate;

    public CompanyEntitlementRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public Policy policy(long companyId) {
        return jdbcTemplate.query(
            """
                SELECT mode, catalog_version_id
                FROM company_entitlement_policies
                WHERE company_id = ?
                """,
            (rs, rowNum) -> new Policy(
                EntitlementPolicyMode.fromDatabase(rs.getString("mode")),
                (Long) rs.getObject("catalog_version_id")
            ),
            companyId
        ).stream().findFirst().orElse(new Policy(EntitlementPolicyMode.LEGACY, null));
    }

    public List<EntitlementSource> activeSources(long companyId, String capability) {
        return jdbcTemplate.query(
            """
                SELECT source_type, source_reference
                FROM (
                    SELECT 'CORE' AS source_type,
                           CONCAT('catalog:', p.product_code) AS source_reference,
                           pc.capability_code
                    FROM company_entitlement_policies policy
                    JOIN billing_catalog_versions v
                      ON v.id = COALESCE(policy.catalog_version_id, (
                          SELECT active_v.id
                          FROM billing_catalog_versions active_v
                          WHERE active_v.status = 'ACTIVE'
                            AND (active_v.effective_from IS NULL OR active_v.effective_from <= CURRENT_TIMESTAMP(6))
                            AND (active_v.effective_to IS NULL OR active_v.effective_to > CURRENT_TIMESTAMP(6))
                          ORDER BY active_v.effective_from DESC, active_v.id DESC
                          LIMIT 1
                      ))
                    JOIN billing_catalog_products p
                      ON p.catalog_version_id = v.id
                     AND p.product_type = 'CORE'
                     AND p.active = 1
                    JOIN billing_product_capabilities pc ON pc.product_id = p.id
                    WHERE policy.company_id = ?

                    UNION ALL

                    SELECT 'TRIAL' AS source_type,
                           CONCAT('trial:', g.source_signup_intent_id) AS source_reference,
                           pc.capability_code
                    FROM company_trial_product_grants g
                    JOIN billing_catalog_products p ON p.id = g.catalog_product_id AND p.active = 1
                    JOIN billing_product_capabilities pc ON pc.product_id = p.id
                    WHERE g.company_id = ?
                      AND g.status = 'ACTIVE'
                      AND g.starts_at <= CURRENT_TIMESTAMP(6)
                      AND g.ends_at > CURRENT_TIMESTAMP(6)

                    UNION ALL

                    SELECT 'SUBSCRIPTION' AS source_type,
                           CONCAT('subscription:', s.id) AS source_reference,
                           pc.capability_code
                    FROM company_billing_subscriptions s
                    JOIN company_billing_subscription_products sp ON sp.subscription_id = s.id
                    JOIN billing_catalog_products p ON p.id = sp.catalog_product_id AND p.active = 1
                    JOIN billing_product_capabilities pc ON pc.product_id = p.id
                    WHERE s.company_id = ?
                      AND LOWER(s.status) IN (?, ?, ?)
                      AND (s.current_period_ends_at IS NULL OR s.current_period_ends_at > CURRENT_TIMESTAMP(6))
                ) effective
                WHERE capability_code = ?
                ORDER BY source_type, source_reference
                """,
            (rs, rowNum) -> new EntitlementSource(
                rs.getString("source_type"), rs.getString("source_reference")
            ),
            companyId,
            companyId,
            companyId,
            ENTITLED_SUBSCRIPTION_STATUSES.get(0),
            ENTITLED_SUBSCRIPTION_STATUSES.get(1),
            ENTITLED_SUBSCRIPTION_STATUSES.get(2),
            capability
        );
    }

    public void enrollShadow(long companyId, long catalogVersionId, Long actorUserId, String reason) {
        jdbcTemplate.update(
            """
                INSERT INTO company_entitlement_policies (
                    company_id, catalog_version_id, mode, reason, activated_by_user_id, activated_at
                ) VALUES (?, ?, 'SHADOW', ?, ?, CURRENT_TIMESTAMP(6))
                ON DUPLICATE KEY UPDATE
                    catalog_version_id = COALESCE(company_entitlement_policies.catalog_version_id, ?),
                    updated_at = CURRENT_TIMESTAMP(6)
                """,
            companyId, catalogVersionId, reason, actorUserId, catalogVersionId
        );
    }

    public List<Long> cohortCompanyIdsAfter(long afterCompanyId, int limit) {
        return jdbcTemplate.query(
            """
                SELECT company_id
                FROM company_entitlement_policies
                WHERE mode IN ('SHADOW', 'ENFORCE')
                  AND company_id > ?
                ORDER BY company_id
                LIMIT ?
                """,
            (rs, rowNum) -> rs.getLong(1),
            Math.max(0, afterCompanyId),
            Math.max(1, limit)
        );
    }

    public void replaceProjection(long companyId, Instant now) {
        var at = Timestamp.from(now);
        jdbcTemplate.update("DELETE FROM company_entitlements WHERE company_id = ?", companyId);
        jdbcTemplate.update(
            """
                INSERT IGNORE INTO company_entitlements (
                    company_id, capability_code, source_type, source_reference,
                    catalog_version_id, valid_from, valid_until, projected_at
                )
                SELECT policy.company_id, pc.capability_code, 'CORE',
                       CONCAT('catalog:', p.product_code), v.id, v.effective_from, v.effective_to, ?
                FROM company_entitlement_policies policy
                JOIN billing_catalog_versions v
                  ON v.id = COALESCE(policy.catalog_version_id, (
                      SELECT active_v.id
                      FROM billing_catalog_versions active_v
                      WHERE active_v.status = 'ACTIVE'
                        AND (active_v.effective_from IS NULL OR active_v.effective_from <= ?)
                        AND (active_v.effective_to IS NULL OR active_v.effective_to > ?)
                      ORDER BY active_v.effective_from DESC, active_v.id DESC
                      LIMIT 1
                  ))
                JOIN billing_catalog_products p
                  ON p.catalog_version_id = v.id AND p.product_type = 'CORE' AND p.active = 1
                JOIN billing_product_capabilities pc ON pc.product_id = p.id
                WHERE policy.company_id = ?
                """,
            at, at, at, companyId
        );
        jdbcTemplate.update(
            """
                INSERT IGNORE INTO company_entitlements (
                    company_id, capability_code, source_type, source_reference,
                    catalog_version_id, valid_from, valid_until, projected_at
                )
                SELECT g.company_id, pc.capability_code, 'TRIAL',
                       CONCAT('trial:', g.source_signup_intent_id), p.catalog_version_id,
                       g.starts_at, g.ends_at, ?
                FROM company_trial_product_grants g
                JOIN billing_catalog_products p ON p.id = g.catalog_product_id AND p.active = 1
                JOIN billing_product_capabilities pc ON pc.product_id = p.id
                WHERE g.company_id = ? AND g.status = 'ACTIVE'
                  AND g.starts_at <= CURRENT_TIMESTAMP(6)
                  AND g.ends_at > CURRENT_TIMESTAMP(6)
                """,
            at, companyId
        );
        jdbcTemplate.update(
            """
                INSERT IGNORE INTO company_entitlements (
                    company_id, capability_code, source_type, source_reference,
                    catalog_version_id, valid_from, valid_until, projected_at
                )
                SELECT s.company_id, pc.capability_code, 'SUBSCRIPTION',
                       CONCAT('subscription:', s.id), p.catalog_version_id,
                       s.current_period_starts_at, s.current_period_ends_at, ?
                FROM company_billing_subscriptions s
                JOIN company_billing_subscription_products sp ON sp.subscription_id = s.id
                JOIN billing_catalog_products p ON p.id = sp.catalog_product_id AND p.active = 1
                JOIN billing_product_capabilities pc ON pc.product_id = p.id
                WHERE s.company_id = ?
                  AND LOWER(s.status) IN (?, ?, ?)
                  AND (s.current_period_ends_at IS NULL OR s.current_period_ends_at > CURRENT_TIMESTAMP(6))
                """,
            at, companyId,
            ENTITLED_SUBSCRIPTION_STATUSES.get(0),
            ENTITLED_SUBSCRIPTION_STATUSES.get(1),
            ENTITLED_SUBSCRIPTION_STATUSES.get(2)
        );
    }

    public int purgeDecisionEvents(Instant now) {
        return jdbcTemplate.update(
            "DELETE FROM entitlement_decision_events WHERE retain_until <= ?",
            Timestamp.from(now)
        );
    }

    public record Policy(EntitlementPolicyMode mode, Long catalogVersionId) {
    }

    public record EntitlementSource(String type, String reference) {
        public String summary() {
            return type.toLowerCase() + "(" + reference + ")";
        }
    }
}
