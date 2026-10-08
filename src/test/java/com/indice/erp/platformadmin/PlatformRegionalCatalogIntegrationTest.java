package com.indice.erp.platformadmin;

import static org.assertj.core.api.Assertions.*;
import com.indice.erp.billing.catalog.RegionalCommercialOfferService;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest(properties = {"app.billing.stripe.enabled=false", "app.billing.signup.regional-payments-enabled=false"})
@Transactional
class PlatformRegionalCatalogIntegrationTest {
    @Autowired JdbcTemplate jdbc;
    @Autowired PlatformRegionalCatalogService regions;
    @Autowired RegionalCommercialOfferService offers;
    @Autowired PlatformCatalogManagementService catalog;

    private long root() {
        jdbc.update("INSERT INTO users (email, password_hash, full_name) VALUES (?, 'test-only-hash', 'Regional catalog test')",
            "regional-catalog-" + UUID.randomUUID() + "@example.com");
        long id = jdbc.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
        jdbc.update("INSERT INTO platform_administrators (user_id, platform_role, status, mfa_required, created_by_user_id) VALUES (?, 'PLATFORM_ROOT', 'ACTIVE', 0, ?)", id, id);
        return id;
    }
    @Test void preparesNativeDraftWithoutPublishingOrChangingHistoricalPricesAndRetriesPreserveEdits() {
        var actor = root();
        var historic = jdbc.queryForList("SELECT id, unit_amount_cents, external_price_id FROM billing_catalog_prices WHERE catalog_version_id IN (SELECT id FROM billing_catalog_versions WHERE status IN ('ACTIVE', 'SUPERSEDED')) ORDER BY id");
        var result = regions.prepare(actor);
        assertThat(result.published()).isFalse();
        assertThat(result.createdProducts()).hasSize(8);
        assertThat(jdbc.queryForMap("SELECT market_code, included_seats FROM billing_catalog_products WHERE catalog_version_id = ? AND product_code = 'ca_controla'", result.catalogVersionId()))
            .containsEntry("market_code", "CA").containsEntry("included_seats", 10);
        assertThat(jdbc.queryForMap("SELECT currency, unit_amount_cents, status, external_price_id FROM billing_catalog_prices WHERE catalog_version_id = ? AND billable_code = 'ca_controla' AND billing_interval = 'MONTH'", result.catalogVersionId()))
            .containsEntry("currency", "CAD").containsEntry("unit_amount_cents", 19900L).containsEntry("status", "DRAFT").containsEntry("external_price_id", null);
        assertThat(offers.available("CA", "MONTH")).isEmpty();
        var product = jdbc.queryForObject("SELECT id FROM billing_catalog_products WHERE catalog_version_id = ? AND product_code = 'ca_controla'", Long.class, result.catalogVersionId());
        catalog.saveProductPrices(actor, product, new PlatformCatalogManagementService.ProductPricesRequest(20100L, 192960L));
        assertThat(regions.prepare(actor).createdProducts()).isEmpty();
        assertThat(jdbc.queryForObject("SELECT unit_amount_cents FROM billing_catalog_prices WHERE catalog_product_id = ? AND billing_interval = 'MONTH'", Long.class, product)).isEqualTo(20100L);
        assertThat(jdbc.queryForList("SELECT id, unit_amount_cents, external_price_id FROM billing_catalog_prices WHERE catalog_version_id IN (SELECT id FROM billing_catalog_versions WHERE status IN ('ACTIVE', 'SUPERSEDED')) ORDER BY id")).isEqualTo(historic);
    }
    @Test void pricesMatchApprovedMarketingAnnualitiesAndNoImplementationFeeIsIntroduced() {
        for (var market : java.util.List.of("CA", "MX")) {
            assertThat(PlatformRegionalCatalogService.definitions(market)).allSatisfy(plan -> {
                assertThat(plan.annualCents()).isEqualTo(plan.monthlyCents() * 12 * 80 / 100);
                assertThat(plan.children()).doesNotContain("implementation", "consulting");
            });
        }
    }
}
