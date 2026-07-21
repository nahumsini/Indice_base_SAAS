package com.indice.erp.billing.signup;

import static org.assertj.core.api.Assertions.assertThat;

import com.indice.erp.billing.BillingHashing;
import com.indice.erp.billing.catalog.CommercialOfferSelectionService;
import com.indice.erp.entitlement.CompanyEntitlementService;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootTest(properties = {
    "app.billing.provisioning.enabled=true",
    "app.billing.stripe.enabled=false"
})
class BillingTenantProvisioningIntegrationTest {

    private static final String TEST_EMAIL_PREFIX = "phase3-provisioning-";

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private BillingSignupIntentRepository signupIntents;

    @Autowired
    private CommercialOfferSelectionService offers;

    @Autowired
    private BillingTenantProvisioningService provisioning;

    @Autowired
    private CompanyEntitlementService entitlements;

    @BeforeEach
    void cleanBefore() {
        cleanTestState();
    }

    @AfterEach
    void cleanAfter() {
        cleanTestState();
    }

    @Test
    void provisionsExactlyOnceWhenTwoWorkersRaceTheSameCompletedCheckout() throws Exception {
        var intent = completedIntent(uniqueEmail("race"));
        var ready = new CountDownLatch(2);
        var start = new CountDownLatch(1);

        var first = CompletableFuture.supplyAsync(() -> provisionAfterBarrier(intent.id(), ready, start));
        var second = CompletableFuture.supplyAsync(() -> provisionAfterBarrier(intent.id(), ready, start));
        assertThat(ready.await(5, TimeUnit.SECONDS)).isTrue();
        start.countDown();

        var results = List.of(first.get(10, TimeUnit.SECONDS), second.get(10, TimeUnit.SECONDS));
        assertThat(results).allSatisfy(result -> {
            assertThat(result.provisioned()).isTrue();
            assertThat(result.status()).isEqualTo("PROVISIONED");
        });
        assertThat(results.get(0).companyId()).isEqualTo(results.get(1).companyId());
        assertThat(results.get(0).ownerUserId()).isEqualTo(results.get(1).ownerUserId());

        var provisioned = signupIntents.findById(intent.id());
        assertThat(provisioned.provisioningStatus()).isEqualTo("PROVISIONED");
        assertThat(provisioned.companyId()).isNotNull();
        assertThat(jdbc.queryForObject(
            "SELECT COUNT(*) FROM company_ownerships WHERE source_signup_intent_id = ?",
            Integer.class,
            intent.id()
        )).isEqualTo(1);
        assertThat(jdbc.queryForObject(
            "SELECT COUNT(*) FROM users WHERE email = ?",
            Integer.class,
            intentEmail(intent.id())
        )).isEqualTo(1);
        assertThat(jdbc.queryForMap(
            "SELECT role, status, visibility FROM user_companies WHERE id = ?",
            provisioned.ownerUserCompanyId()
        )).containsEntry("role", "owner").containsEntry("status", "active").containsEntry("visibility", "all");
        assertThat(jdbc.queryForMap(
            "SELECT unit_id, business_id, department FROM user_work_profiles WHERE user_company_id = ?",
            provisioned.ownerUserCompanyId()
        )).containsEntry("unit_id", null).containsEntry("business_id", null).containsEntry("department", "Corporate office");

        var expectedProducts = offers.activeBasicProducts().size();
        assertThat(jdbc.queryForObject(
            "SELECT COUNT(*) FROM company_trial_product_grants WHERE source_signup_intent_id = ? AND status = 'ACTIVE'",
            Integer.class,
            intent.id()
        )).isEqualTo(expectedProducts);
        assertThat(jdbc.queryForObject(
            "SELECT TIMESTAMPDIFF(DAY, MIN(starts_at), MAX(ends_at)) FROM company_trial_product_grants WHERE source_signup_intent_id = ?",
            Integer.class,
            intent.id()
        )).isEqualTo(30);
        assertThat(jdbc.queryForObject(
            "SELECT COUNT(*) FROM user_company_module_roles WHERE user_company_id = ?",
            Integer.class,
            provisioned.ownerUserCompanyId()
        )).isGreaterThanOrEqualTo(expectedProducts);
        assertThat(jdbc.queryForObject(
            "SELECT mode FROM company_entitlement_policies WHERE company_id = ?",
            String.class,
            provisioned.companyId()
        )).isEqualTo("SHADOW");
        assertThat(jdbc.queryForObject(
            "SELECT COUNT(DISTINCT capability_code) FROM company_entitlements WHERE company_id = ?",
            Integer.class,
            provisioned.companyId()
        )).isGreaterThanOrEqualTo(expectedProducts);
        assertThat(entitlements.resolve(provisioned.companyId(), "human_resources").allowed()).isTrue();
        assertThat(entitlements.resolve(provisioned.companyId(), "receivables").allowed()).isTrue();
    }

    @Test
    void movesExistingEmailToManualReviewWithoutCreatingOrMutatingATenant() {
        var email = uniqueEmail("existing");
        jdbc.update(
            "INSERT INTO users (email, password_hash, full_name) VALUES (?, '$2a$10$existing', 'Existing User')",
            email
        );
        var companiesBefore = jdbc.queryForObject("SELECT COUNT(*) FROM companies", Integer.class);
        var intent = completedIntent(email);

        var result = provisioning.provisionIfEligible(intent.id());

        assertThat(result.status()).isEqualTo("REQUIRES_REVIEW");
        assertThat(result.provisioned()).isFalse();
        assertThat(signupIntents.findById(intent.id()).provisioningStatus()).isEqualTo("REQUIRES_REVIEW");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM companies", Integer.class)).isEqualTo(companiesBefore);
        assertThat(jdbc.queryForObject(
            "SELECT COUNT(*) FROM company_ownerships WHERE source_signup_intent_id = ?",
            Integer.class,
            intent.id()
        )).isZero();
    }

    private BillingTenantProvisioningService.ProvisioningResult provisionAfterBarrier(
        long intentId,
        CountDownLatch ready,
        CountDownLatch start
    ) {
        ready.countDown();
        try {
            if (!start.await(5, TimeUnit.SECONDS)) {
                throw new IllegalStateException("Provisioning race did not start.");
            }
            return provisioning.provisionIfEligible(intentId);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(exception);
        }
    }

    private BillingSignupIntent completedIntent(String email) {
        var product = offers.activeBasicProducts().getFirst();
        var selection = offers.select(List.of(product.code()), "MONTH", 0);
        var request = new BillingSignupRequest(
            "Premium Owner", email, "very-secure-password", "Phase 3 Premium Company",
            "MX", "+529981234567", "Services", "6-20", "MONTH", 0, List.of(product.code())
        );
        var discriminator = UUID.randomUUID().toString();
        var intent = signupIntents.createOrLoad(
            BillingHashing.randomReference(),
            BillingHashing.sha256("idem-" + discriminator),
            BillingHashing.sha256("fingerprint-" + discriminator),
            request,
            email,
            "$2a$10$phase3-test-hash",
            selection
        );
        var customerId = "cus_phase3_" + discriminator.replace("-", "");
        signupIntents.markCustomerCreated(intent.id(), customerId);
        signupIntents.markCheckoutCompleted(
            intent.id(),
            "evt_phase3_" + discriminator.replace("-", ""),
            Instant.now(),
            customerId,
            "cs_phase3_" + discriminator.replace("-", ""),
            "sub_phase3_" + discriminator.replace("-", "")
        );
        return signupIntents.findById(intent.id());
    }

    private String intentEmail(long intentId) {
        return jdbc.queryForObject(
            "SELECT email_normalized FROM billing_signup_intents WHERE id = ?",
            String.class,
            intentId
        );
    }

    private String uniqueEmail(String label) {
        return TEST_EMAIL_PREFIX + label + "-" + UUID.randomUUID() + "@example.com";
    }

    private void cleanTestState() {
        jdbc.update(
            "DELETE FROM billing_audit_events WHERE signup_intent_id IN (SELECT id FROM billing_signup_intents WHERE email_normalized LIKE ?)",
            TEST_EMAIL_PREFIX + "%"
        );
        jdbc.update(
            "DELETE FROM company_trial_product_grants WHERE source_signup_intent_id IN (SELECT id FROM billing_signup_intents WHERE email_normalized LIKE ?)",
            TEST_EMAIL_PREFIX + "%"
        );
        jdbc.update(
            "DELETE FROM company_ownerships WHERE source_signup_intent_id IN (SELECT id FROM billing_signup_intents WHERE email_normalized LIKE ?)",
            TEST_EMAIL_PREFIX + "%"
        );
        jdbc.update(
            "DELETE FROM companies WHERE id IN (SELECT company_id FROM billing_signup_intents WHERE email_normalized LIKE ? AND company_id IS NOT NULL)",
            TEST_EMAIL_PREFIX + "%"
        );
        jdbc.update("DELETE FROM users WHERE email LIKE ?", TEST_EMAIL_PREFIX + "%");
        jdbc.update(
            "DELETE FROM billing_signup_intent_products WHERE signup_intent_id IN (SELECT id FROM billing_signup_intents WHERE email_normalized LIKE ?)",
            TEST_EMAIL_PREFIX + "%"
        );
        jdbc.update("DELETE FROM billing_signup_intents WHERE email_normalized LIKE ?", TEST_EMAIL_PREFIX + "%");
    }
}
