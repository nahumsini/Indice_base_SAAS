package com.indice.erp.platformadmin;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootTest(properties = {
    "app.billing.stripe.enabled=false",
    "app.entitlements.enforcement-enabled=false",
    "app.entitlements.projection-enabled=false"
})
class PlatformAdminProductAccessIntegrationTest {

    private static final String EMAIL_PREFIX = "platform-product-access-";
    private static final String COMPANY_PREFIX = "platform-product-access-";

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private PlatformAdminService service;

    private long actorUserId;
    private long companyId;

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
            "INSERT INTO user_companies (user_id, company_id, role, status, visibility) VALUES (?, ?, 'superadmin', 'active', 'all')",
            actorUserId,
            companyId
        );
        jdbc.update(
            "INSERT INTO platform_administrators (user_id, platform_role, status, mfa_required, created_by_user_id) VALUES (?, 'PLATFORM_ROOT', 'ACTIVE', 0, ?)",
            actorUserId,
            actorUserId
        );
    }

    @AfterEach
    void clean() {
        cleanTestState();
    }

    @Test
    void productAccessIsIdempotentAndRevokesEveryDuplicateGrant() {
        var granted = grant("basic_hr");
        var replayed = grant("basic_hr");

        assertThat(replayed).containsEntry("replayed", true);
        assertThat(activeBenefits("basic_hr")).isEqualTo(1);
        assertThat(moduleStatus("human_resources")).containsExactly("active", "platform_benefit");
        assertThat(ownerModuleRoles("human_resources")).isEqualTo(1);
        assertThat(ownerTabPermissions("human_resources")).isGreaterThan(0);
        assertThat(service.overview(actorUserId, COMPANY_PREFIX, 25)).isNotEmpty();
        assertThat(service.company(actorUserId, companyId)).isNotEmpty();

        insertDuplicateProductBenefit("basic_hr");
        assertThat(activeBenefits("basic_hr")).isEqualTo(2);

        var revoked = service.revokeBenefit(
            actorUserId,
            companyId,
            String.valueOf(granted.get("reference")),
            "End of Root access"
        );

        assertThat(revoked).containsEntry("revoked_grants", 2);
        assertThat(activeBenefits("basic_hr")).isZero();
        assertThat(moduleStatus("human_resources")).containsExactly("inactive", "platform_benefit");
        assertThat(ownerModuleRoles("human_resources")).isZero();
        assertThat(ownerTabPermissions("human_resources")).isZero();
    }

    @Test
    void sharedInventoryRemainsActiveWhileAnotherProductStillProvidesIt() {
        var pos = grant("basic_pos_inventory");
        grant("basic_sales_inventory");

        service.revokeBenefit(
            actorUserId,
            companyId,
            String.valueOf(pos.get("reference")),
            "Remove point of sale package"
        );

        assertThat(moduleStatus("pos").getFirst()).isEqualTo("inactive");
        assertThat(moduleStatus("inventory")).containsExactly("active", "platform_benefit");
        assertThat(moduleStatus("crm")).containsExactly("active", "platform_benefit");
    }

    @Test
    @SuppressWarnings("unchecked")
    void overviewProjectsTheCurrentSelectionBeforeStripeIsActivated() {
        grant("basic_hr");
        grantCourtesySeats(2);

        var overview = service.overview(actorUserId, COMPANY_PREFIX, 25);
        var companies = (List<Map<String, Object>>) overview.get("companies");

        assertThat(companies).singleElement().satisfies(company -> {
            assertThat(company).containsEntry("included_seats", 0);
            assertThat(company).containsEntry("purchased_extra_seats", 0);
            assertThat(company).containsEntry("courtesy_extra_seats", 2);
            assertThat(company).containsEntry("billing_amount_kind", "ESTIMATE");
            assertThat(company).containsEntry("billing_amount_interval", "MONTH");
            assertThat(company).containsEntry("billing_currency", "USD");
            assertThat(company).containsEntry("projected_offer_code", "basic_1");
            assertThat(company.get("billing_amount_cents")).isEqualTo(9_300L);
        });
    }

    private void grantCourtesySeats(int quantity) {
        jdbc.update(
            """
                INSERT INTO company_benefit_grants (
                    public_reference, company_id, benefit_type, quantity,
                    source_type, status, starts_at, ends_at, reason,
                    idempotency_key_hash, created_by_user_id
                ) VALUES (?, ?, 'SEAT', ?, 'COURTESY', 'ACTIVE',
                          CURRENT_TIMESTAMP(6), DATE_ADD(CURRENT_TIMESTAMP(6), INTERVAL 30 DAY),
                          'Account employee capacity', ?, ?)
                """,
            UUID.randomUUID().toString().replace("-", "").substring(0, 32),
            companyId,
            quantity,
            UUID.randomUUID().toString().replace("-", "") + UUID.randomUUID().toString().replace("-", ""),
            actorUserId
        );
    }

    private java.util.Map<String, Object> grant(String productCode) {
        return service.grantBenefit(
            actorUserId,
            companyId,
            UUID.randomUUID().toString(),
            new PlatformAdminService.BenefitRequest(
                "PRODUCT", productCode, 1, "SUPPORT", "Root managed module access",
                "ROOT-ACCESS", null, null, null, null
            )
        );
    }

    private void insertDuplicateProductBenefit(String productCode) {
        jdbc.update(
            """
                INSERT INTO company_benefit_grants (
                    public_reference, company_id, benefit_type, catalog_product_id, quantity,
                    source_type, status, starts_at, reason, campaign_code,
                    idempotency_key_hash, created_by_user_id
                )
                SELECT ?, ?, 'PRODUCT', product.id, 1, 'COURTESY', 'ACTIVE',
                       CURRENT_TIMESTAMP(6), 'Duplicate integration grant', 'ROOT-ACCESS', ?, ?
                FROM billing_catalog_products product
                JOIN billing_catalog_versions version ON version.id = product.catalog_version_id
                WHERE product.product_code = ? AND product.active = 1 AND version.status = 'ACTIVE'
                ORDER BY version.id DESC LIMIT 1
                """,
            UUID.randomUUID().toString().replace("-", "").substring(0, 32),
            companyId,
            UUID.randomUUID().toString().replace("-", "") + UUID.randomUUID().toString().replace("-", ""),
            actorUserId,
            productCode
        );
    }

    private int activeBenefits(String productCode) {
        return jdbc.queryForObject(
            """
                SELECT COUNT(*)
                FROM company_benefit_grants benefit
                JOIN billing_catalog_products product ON product.id = benefit.catalog_product_id
                WHERE benefit.company_id = ? AND product.product_code = ?
                  AND benefit.benefit_type = 'PRODUCT' AND benefit.status = 'ACTIVE'
                """,
            Integer.class,
            companyId,
            productCode
        );
    }

    private List<String> moduleStatus(String moduleSlug) {
        return jdbc.query(
            "SELECT status, source FROM company_module_entitlements WHERE company_id = ? AND module_slug = ?",
            (rs, rowNum) -> List.of(rs.getString("status"), rs.getString("source")),
            companyId,
            moduleSlug
        ).stream().findFirst().orElse(List.of());
    }

    private int ownerModuleRoles(String moduleSlug) {
        return jdbc.queryForObject(
            """
                SELECT COUNT(*) FROM user_company_module_roles module_role
                JOIN user_companies membership ON membership.id = module_role.user_company_id
                WHERE membership.company_id = ? AND module_role.module_slug = ?
                """,
            Integer.class,
            companyId,
            moduleSlug
        );
    }

    private int ownerTabPermissions(String moduleSlug) {
        return jdbc.queryForObject(
            """
                SELECT COUNT(*) FROM user_company_tab_permissions permission
                JOIN user_companies membership ON membership.id = permission.user_company_id
                WHERE membership.company_id = ? AND permission.module_slug = ? AND permission.can_view = 1
                """,
            Integer.class,
            companyId,
            moduleSlug
        );
    }

    private void cleanTestState() {
        jdbc.update("DELETE FROM platform_audit_events WHERE actor_user_id IN (SELECT id FROM users WHERE email LIKE ?)", EMAIL_PREFIX + "%");
        jdbc.update("DELETE FROM companies WHERE name LIKE ?", COMPANY_PREFIX + "%");
        jdbc.update("DELETE FROM users WHERE email LIKE ?", EMAIL_PREFIX + "%");
    }
}
