package com.indice.erp.platformadmin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

import com.indice.erp.billing.stripe.StripeBillingGateway;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootTest(properties = {
    "app.entitlements.enforcement-enabled=false",
    "app.entitlements.projection-enabled=false"
})
class PlatformTrialExtensionServiceIntegrationTest {

    private static final String EMAIL_PREFIX = "platform-trial-extension-";
    private static final String COMPANY_PREFIX = "platform-trial-extension-";

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private PlatformTrialExtensionService service;

    @Autowired
    private PlatformAdminService platformAdmin;

    @MockBean
    private StripeBillingGateway stripeGateway;

    private long actorUserId;
    private long companyId;
    private long benefitId;
    private Instant originalEnd;

    @BeforeEach
    void setUp() {
        cleanTestState();
        var discriminator = UUID.randomUUID().toString();
        jdbc.update(
            "INSERT INTO users (email, password_hash, full_name) VALUES (?, '$2a$10$platformtest', 'Platform Root Test')",
            EMAIL_PREFIX + discriminator + "@example.com"
        );
        actorUserId = jdbc.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
        jdbc.update("INSERT INTO companies (name) VALUES (?)", COMPANY_PREFIX + discriminator);
        companyId = jdbc.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
        jdbc.update(
            "INSERT INTO platform_administrators (user_id, platform_role, status, mfa_required, created_by_user_id) VALUES (?, 'PLATFORM_ROOT', 'ACTIVE', 0, ?)",
            actorUserId,
            actorUserId
        );

        var productId = jdbc.queryForObject(
            """
                SELECT product.id
                FROM billing_catalog_products product
                JOIN billing_catalog_versions catalog ON catalog.id = product.catalog_version_id
                WHERE catalog.status = 'ACTIVE' AND product.active = 1 AND product.product_type = 'BASIC'
                ORDER BY product.sort_order, product.id
                LIMIT 1
                """,
            Long.class
        );
        originalEnd = Instant.now().plus(7, ChronoUnit.DAYS).truncatedTo(ChronoUnit.MICROS);
        jdbc.update(
            """
                INSERT INTO company_benefit_grants (
                    public_reference, company_id, benefit_type, catalog_product_id,
                    quantity, source_type, status, starts_at, ends_at, reason,
                    idempotency_key_hash, created_by_user_id
                ) VALUES (?, ?, 'PRODUCT', ?, 1, 'COURTESY', 'ACTIVE', ?, ?, ?, ?, ?)
                """,
            UUID.randomUUID().toString().replace("-", "").substring(0, 32),
            companyId,
            productId,
            Timestamp.from(Instant.now().minus(1, ChronoUnit.DAYS)),
            Timestamp.from(originalEnd),
            "Integration test demo",
            "a".repeat(60) + String.format("%04d", companyId % 10_000),
            actorUserId
        );
        benefitId = jdbc.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
    }

    @AfterEach
    void clean() {
        cleanTestState();
    }

    @Test
    void localDemoAddsOneAllowedPeriodOnlyOnceAndKeepsTheGrantedProduct() {
        var key = "local-demo-" + UUID.randomUUID();
        var first = service.extend(
            actorUserId,
            companyId,
            key,
            new PlatformTrialExtensionService.ExtensionRequest(15, true)
        );
        var replay = service.extend(
            actorUserId,
            companyId,
            key,
            new PlatformTrialExtensionService.ExtensionRequest(15, true)
        );
        assertThatThrownBy(() -> service.extend(
            actorUserId,
            companyId,
            "second-extension-" + UUID.randomUUID(),
            new PlatformTrialExtensionService.ExtensionRequest(15, true)
        ))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("única extensión");

        var persistedEnd = jdbc.queryForObject(
            "SELECT ends_at FROM company_benefit_grants WHERE id = ?",
            Timestamp.class,
            benefitId
        ).toInstant();
        assertThat(persistedEnd).isEqualTo(originalEnd.plus(15, ChronoUnit.DAYS));
        assertThat(first)
            .containsEntry("source", "LOCAL_DEMO")
            .containsEntry("added_days", 15)
            .containsEntry("charged_now", false)
            .containsEntry("replayed", false);
        assertThat(replay).containsEntry("replayed", true);
        assertThat(jdbc.queryForObject(
            "SELECT COUNT(*) FROM platform_trial_extensions WHERE company_id = ? AND status = 'COMPLETED'",
            Integer.class,
            companyId
        )).isEqualTo(1);
        assertThat(jdbc.queryForObject(
            "SELECT COUNT(*) FROM platform_audit_events WHERE company_id = ? AND action_code = 'COMPANY_TRIAL_EXTENDED' AND outcome = 'SUCCESS'",
            Integer.class,
            companyId
        )).isEqualTo(1);
        var companySummary = ((java.util.List<Map<String, Object>>) platformAdmin
            .overview(actorUserId, String.valueOf(companyId), 10)
            .get("companies"))
            .stream()
            .filter(company -> ((Number) company.get("id")).longValue() == companyId)
            .findFirst()
            .orElseThrow();
        assertThat(companySummary)
            .containsEntry("trial_source", "LOCAL_DEMO")
            .containsEntry("trial_days_remaining", 22)
            .containsEntry("trial_extendable", false);
        verifyNoInteractions(stripeGateway);
    }

    @Test
    @SuppressWarnings("unchecked")
    void stripeTrialPushesTheNewEndWithoutProrationOrImmediateCharge() throws Exception {
        var activeCatalogId = jdbc.queryForObject(
            "SELECT id FROM billing_catalog_versions WHERE status = 'ACTIVE' ORDER BY id DESC LIMIT 1",
            Long.class
        );
        var stripeEnd = Instant.now().plus(7, ChronoUnit.DAYS).truncatedTo(ChronoUnit.MICROS);
        var subscriptionId = "sub_platform_trial_extension_" + UUID.randomUUID();
        jdbc.update(
            """
                INSERT INTO company_billing_subscriptions (
                    stripe_subscription_id, company_id, catalog_version_id, offer_code,
                    billing_interval, currency, status, included_seats, extra_seats,
                    trial_starts_at, trial_ends_at, last_event_id, last_event_created_at
                ) VALUES (?, ?, ?, 'basic_1', 'MONTH', 'USD', 'trialing', 5, 0, ?, ?, ?, ?)
                """,
            subscriptionId,
            companyId,
            activeCatalogId,
            Timestamp.from(Instant.now().minus(1, ChronoUnit.DAYS)),
            Timestamp.from(stripeEnd),
            "evt_trial_extension_" + UUID.randomUUID(),
            Timestamp.from(Instant.now())
        );

        var result = service.extend(
            actorUserId,
            companyId,
            "stripe-trial-" + UUID.randomUUID(),
            new PlatformTrialExtensionService.ExtensionRequest(15, true)
        );

        var parameters = ArgumentCaptor.forClass(Map.class);
        verify(stripeGateway).updateSubscription(
            eq(subscriptionId),
            parameters.capture(),
            contains(".trial-extension.")
        );
        assertThat(parameters.getValue())
            .containsEntry("trial_end", stripeEnd.plus(15, ChronoUnit.DAYS).getEpochSecond())
            .containsEntry("proration_behavior", "none");
        assertThat(jdbc.queryForObject(
            "SELECT trial_ends_at FROM company_billing_subscriptions WHERE stripe_subscription_id = ?",
            Timestamp.class,
            subscriptionId
        ).toInstant()).isEqualTo(stripeEnd.plus(15, ChronoUnit.DAYS));
        assertThat(result)
            .containsEntry("source", "STRIPE")
            .containsEntry("added_days", 15)
            .containsEntry("charged_now", false);
    }

    private void cleanTestState() {
        jdbc.update(
            "DELETE FROM platform_trial_extensions WHERE company_id IN (SELECT id FROM companies WHERE name LIKE ?)",
            COMPANY_PREFIX + "%"
        );
        jdbc.update(
            "DELETE FROM platform_audit_events WHERE company_id IN (SELECT id FROM companies WHERE name LIKE ?)",
            COMPANY_PREFIX + "%"
        );
        jdbc.update("DELETE FROM companies WHERE name LIKE ?", COMPANY_PREFIX + "%");
        jdbc.update("DELETE FROM users WHERE email LIKE ?", EMAIL_PREFIX + "%");
    }
}
