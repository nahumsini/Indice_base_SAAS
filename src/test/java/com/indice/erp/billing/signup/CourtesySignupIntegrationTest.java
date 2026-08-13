package com.indice.erp.billing.signup;

import static org.assertj.core.api.Assertions.assertThat;

import com.indice.erp.platformadmin.CourtesyCodeService;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootTest(properties = {
    "app.billing.provisioning.enabled=true",
    "app.billing.stripe.enabled=false"
})
class CourtesySignupIntegrationTest {

    @Autowired
    private CourtesyCodeService courtesyCodes;

    @Autowired
    private BillingSignupService signup;

    @Autowired
    private BillingSignupIntentRepository intents;

    @Autowired
    private JdbcTemplate jdbc;

    @Test
    void rootCourtesyCodeBypassesStripeAndUsesTheNormalTenantProvisioner() {
        var actorUserId = platformRootUserId();
        var discriminator = UUID.randomUUID().toString();
        var email = "courtesy-" + discriminator + "@example.com";
        var created = courtesyCodes.create(
            actorUserId,
            "courtesy-create-" + discriminator,
            new CourtesyCodeService.CreateRequest(
                "Pilot courtesy", email, List.of(), 2, 45, false, 1,
                null, null, "Approved staging pilot account", "STAGING-PILOT"
            )
        );
        var clearCode = String.valueOf(created.get("code"));
        var product = jdbc.queryForObject(
            """
                SELECT p.product_code
                FROM billing_catalog_products p
                JOIN billing_catalog_versions v ON v.id = p.catalog_version_id
                WHERE v.status = 'ACTIVE' AND p.product_type = 'BASIC' AND p.active = 1
                ORDER BY p.sort_order, p.id LIMIT 1
                """,
            String.class
        );
        var response = signup.createCheckout(
            new BillingSignupRequest(
                "Courtesy Owner", email, "very-secure-password", "Courtesy Company",
                "US", null, null, null, "MONTH", 0, List.of(product), clearCode
            ),
            "courtesy-signup-" + discriminator
        );

        assertThat(response.status()).isEqualTo("COURTESY_COMPLETED");
        assertThat(response.checkoutSessionId()).isNull();
        assertThat(response.checkoutUrl()).isNull();
        assertThat(response.provisioned()).isTrue();

        var intent = intents.findByPublicReference(response.signupReference());
        assertThat(intent.companyId()).isNotNull();
        assertThat(intent.stripeCustomerId()).isNull();
        assertThat(jdbc.queryForMap(
            "SELECT state, access_mode, subscription_status FROM company_commercial_states WHERE company_id = ?",
            intent.companyId()
        )).containsEntry("state", "ACTIVE")
            .containsEntry("access_mode", "FULL")
            .containsEntry("subscription_status", "courtesy");
        assertThat(jdbc.queryForObject(
            "SELECT COUNT(*) FROM company_trial_product_grants WHERE company_id = ?",
            Integer.class,
            intent.companyId()
        )).isZero();
        assertThat(jdbc.queryForObject(
            "SELECT COUNT(*) FROM company_benefit_grants WHERE company_id = ? AND benefit_type = 'PRODUCT' AND status = 'ACTIVE'",
            Integer.class,
            intent.companyId()
        )).isEqualTo(6);
        assertThat(jdbc.queryForObject(
            "SELECT COALESCE(SUM(quantity), 0) FROM company_benefit_grants WHERE company_id = ? AND benefit_type = 'SEAT' AND status = 'ACTIVE'",
            Integer.class,
            intent.companyId()
        )).isEqualTo(2);
        assertThat(jdbc.queryForObject(
            "SELECT COUNT(*) FROM billing_courtesy_codes WHERE code_hash = ?",
            Integer.class,
            clearCode
        )).isZero();
    }

    @Test
    void selectedCourtesyProductDoesNotProvisionUnselectedOwnerModules() {
        var actorUserId = platformRootUserId();
        var discriminator = UUID.randomUUID().toString();
        var email = "courtesy-selected-" + discriminator + "@example.com";
        var product = jdbc.queryForObject(
            """
                SELECT p.product_code
                FROM billing_catalog_products p
                JOIN billing_catalog_versions v ON v.id = p.catalog_version_id
                WHERE v.status = 'ACTIVE' AND p.product_type = 'BASIC' AND p.active = 1
                ORDER BY p.sort_order, p.id LIMIT 1
                """,
            String.class
        );
        var created = courtesyCodes.create(
            actorUserId,
            "courtesy-selected-create-" + discriminator,
            new CourtesyCodeService.CreateRequest(
                "Selected product courtesy", email, List.of(product), 0, 30, false, 1,
                null, null, "Selected product account", "SELECTED-PRODUCT"
            )
        );

        var response = signup.createCheckout(
            new BillingSignupRequest(
                "Selected Owner", email, "very-secure-password", "Selected Courtesy Company",
                "MX", null, null, null, "MONTH", 0, List.of(product), String.valueOf(created.get("code"))
            ),
            "courtesy-selected-signup-" + discriminator
        );

        assertThat(response.provisioned()).isTrue();
        var intent = intents.findByPublicReference(response.signupReference());
        assertThat(jdbc.queryForObject(
            "SELECT COUNT(*) FROM company_benefit_grants WHERE company_id = ? AND benefit_type = 'PRODUCT' AND status = 'ACTIVE'",
            Integer.class,
            intent.companyId()
        )).isEqualTo(1);
        var ownerMembershipId = jdbc.queryForObject(
            "SELECT owner_user_company_id FROM billing_signup_intents WHERE id = ?",
            Long.class,
            intent.id()
        );
        assertThat(jdbc.queryForList(
            "SELECT module_slug FROM user_company_module_roles WHERE user_company_id = ? ORDER BY module_slug",
            String.class,
            ownerMembershipId
        )).contains("human_resources")
            .doesNotContain("crm", "expenses", "inventory", "petty_cash", "pos", "processes", "receivables");
    }

    private long platformRootUserId() {
        var roots = jdbc.query(
            "SELECT user_id FROM platform_administrators WHERE status = 'ACTIVE' ORDER BY id LIMIT 1",
            (rs, rowNum) -> rs.getLong(1)
        );
        if (!roots.isEmpty()) return roots.getFirst();
        var userId = jdbc.queryForObject("SELECT id FROM users ORDER BY id LIMIT 1", Long.class);
        jdbc.update(
            """
                INSERT INTO platform_administrators (
                    user_id, platform_role, status, mfa_required, created_by_user_id
                ) VALUES (?, 'PLATFORM_ROOT', 'ACTIVE', 1, ?)
                """,
            userId,
            userId
        );
        return userId;
    }
}
