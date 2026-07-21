package com.indice.erp.entitlement;

import static org.assertj.core.api.Assertions.assertThat;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootTest(properties = {
    "app.billing.stripe.enabled=false",
    "app.billing.provisioning.enabled=false",
    "app.entitlements.enforcement-enabled=false",
    "app.entitlements.projection-enabled=false"
})
class CompanyEntitlementServiceIntegrationTest {

    private static final String COMPANY_PREFIX = "phase4-entitlement-";

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private CompanyEntitlementService entitlements;

    @Autowired
    private CompanyEntitlementProjectionService projection;

    @AfterEach
    void clean() {
        jdbc.update("DELETE FROM company_billing_subscriptions WHERE stripe_subscription_id LIKE 'sub_phase4_%'");
        jdbc.update("DELETE FROM companies WHERE name LIKE ?", COMPANY_PREFIX + "%");
    }

    @Test
    void resolvesCoreAndSelectedSubscriptionProductsInsideOneCompanyOnly() {
        var catalogId = jdbc.queryForObject(
            "SELECT id FROM billing_catalog_versions WHERE version_code = '2026.07-premium-v1'",
            Long.class
        );
        var companyA = company("a");
        var companyB = company("b");
        enroll(companyA, catalogId);
        enroll(companyB, catalogId);
        subscribe(companyA, catalogId, "basic_hr");
        subscribe(companyB, catalogId, "basic_expenses");

        assertThat(entitlements.resolve(companyA, "dashboard").allowed()).isTrue();
        assertThat(entitlements.resolve(companyA, "human_resources").allowed()).isTrue();
        assertThat(entitlements.resolve(companyA, "expenses").allowed()).isFalse();
        assertThat(entitlements.resolve(companyB, "expenses").allowed()).isTrue();
        assertThat(entitlements.resolve(companyB, "human_resources").allowed()).isFalse();

        projection.refresh(companyA);
        assertThat(jdbc.queryForObject(
            "SELECT COUNT(*) FROM company_entitlements WHERE company_id = ? AND capability_code = 'human_resources'",
            Integer.class,
            companyA
        )).isEqualTo(1);
        assertThat(jdbc.queryForObject(
            "SELECT COUNT(*) FROM company_entitlements WHERE company_id = ? AND capability_code = 'expenses'",
            Integer.class,
            companyA
        )).isZero();
    }

    @Test
    void expiredOrCanceledCommercialSourcesDoNotGrantCapabilities() {
        var catalogId = jdbc.queryForObject(
            "SELECT id FROM billing_catalog_versions WHERE version_code = '2026.07-premium-v1'",
            Long.class
        );
        var companyId = company("expired");
        enroll(companyId, catalogId);
        var subscriptionId = subscribe(companyId, catalogId, "basic_hr");

        jdbc.update(
            "UPDATE company_billing_subscriptions SET status = 'canceled' WHERE id = ?",
            subscriptionId
        );

        assertThat(entitlements.resolve(companyId, "human_resources").allowed()).isFalse();
        assertThat(entitlements.resolve(companyId, "kpis").allowed()).isTrue();
    }

    private long company(String label) {
        jdbc.update("INSERT INTO companies (name) VALUES (?)", COMPANY_PREFIX + label + "-" + UUID.randomUUID());
        return jdbc.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
    }

    private void enroll(long companyId, long catalogId) {
        jdbc.update(
            "INSERT INTO company_entitlement_policies (company_id, catalog_version_id, mode, reason, activated_at) VALUES (?, ?, 'SHADOW', 'integration-test', CURRENT_TIMESTAMP(6))",
            companyId,
            catalogId
        );
    }

    private long subscribe(long companyId, long catalogId, String productCode) {
        var discriminator = UUID.randomUUID().toString();
        var now = Instant.now();
        jdbc.update(
            """
                INSERT INTO company_billing_subscriptions (
                    stripe_subscription_id, company_id, catalog_version_id, status,
                    current_period_starts_at, current_period_ends_at,
                    last_event_id, last_event_created_at
                ) VALUES (?, ?, ?, 'active', ?, ?, ?, ?)
                """,
            "sub_phase4_" + discriminator,
            companyId,
            catalogId,
            Timestamp.from(now.minus(1, ChronoUnit.DAYS)),
            Timestamp.from(now.plus(30, ChronoUnit.DAYS)),
            "evt_phase4_" + discriminator,
            Timestamp.from(now)
        );
        var subscriptionId = jdbc.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
        jdbc.update(
            """
                INSERT INTO company_billing_subscription_products (subscription_id, catalog_product_id, source)
                SELECT ?, id, 'INTEGRATION_TEST'
                FROM billing_catalog_products
                WHERE catalog_version_id = ? AND product_code = ?
                """,
            subscriptionId,
            catalogId,
            productCode
        );
        return subscriptionId;
    }
}
