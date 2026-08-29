package com.indice.erp.billing.catalog;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.Map;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
class CommercialOfferSelectionIntegrationTest {

    @Autowired
    private CommercialOfferSelectionService service;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void exposesTheConfirmedStripeTestPriceMatrix() {
        var prices = service.activePrices().stream()
            .filter(price -> "BASE".equals(price.priceType()) || "extra_seat".equals(price.billableCode()))
            .collect(java.util.stream.Collectors.toMap(
                price -> price.billableCode() + ":" + price.billingInterval(),
                CommercialOfferSelectionService.PublicPrice::unitAmountCents
            ));

        assertThat(prices).containsAllEntriesOf(Map.ofEntries(
            Map.entry("basic_1:MONTH", 6_900L),
            Map.entry("basic_1:YEAR", 66_240L),
            Map.entry("basic_2:MONTH", 10_900L),
            Map.entry("basic_2:YEAR", 104_640L),
            Map.entry("basic_3:MONTH", 14_900L),
            Map.entry("basic_3:YEAR", 143_040L),
            Map.entry("basic_all:MONTH", 19_900L),
            Map.entry("basic_all:YEAR", 191_040L),
            Map.entry("extra_seat:MONTH", 1_200L),
            Map.entry("extra_seat:YEAR", 11_520L)
        ));
    }

    @Test
    void buildsLaunchOffersFromTheVersionedCatalogUsingPublicPlanPrices() {
        var products = service.activeBasicProducts();
        assertThat(products).hasSize(6);

        var oneMonthly = service.select(List.of(products.getFirst().code()), "MONTH", 2);
        assertThat(oneMonthly.catalogVersion()).isEqualTo("2026.07-premium-v1");
        assertThat(oneMonthly.offerCode()).isEqualTo("basic_1");
        assertThat(oneMonthly.includedSeats()).isEqualTo(5);
        assertThat(oneMonthly.extraSeatUnitAmountCents()).isEqualTo(1_200);
        assertThat(oneMonthly.estimatedAmountCents()).isEqualTo(9_300);

        var threeAnnual = service.select(products.subList(0, 3).stream().map(p -> p.code()).toList(), "YEAR", 1);
        assertThat(threeAnnual.offerCode()).isEqualTo("basic_3");
        assertThat(threeAnnual.extraSeatUnitAmountCents()).isEqualTo(11_520);
        assertThat(threeAnnual.estimatedAmountCents()).isEqualTo(154_560);

        for (int count = 4; count <= products.size(); count++) {
            var fourOrMore = service.select(
                products.subList(0, count).stream().map(p -> p.code()).toList(),
                "MONTH",
                0
            );
            assertThat(fourOrMore.offerCode()).isEqualTo("basic_all");
            assertThat(fourOrMore.estimatedAmountCents()).isEqualTo(19_900);
        }

        var all = service.select(products.stream().map(p -> p.code()).toList(), "MONTH", 0);
        assertThat(all.offerCode()).isEqualTo("basic_all");
        assertThat(all.baseAmountCents()).isEqualTo(19_900);
        assertThat(all.estimatedAmountCents()).isEqualTo(19_900);

        assertThatThrownBy(() -> service.select(List.of(), "MONTH", 0))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("valid products");
    }

    @Test
    @Transactional
    void hidesACommercialProductWhenItsTechnicalModuleIsDisabled() {
        assertThat(service.activeBasicProducts())
            .extracting(CommercialOfferSelection.Product::code)
            .contains("basic_hr");

        jdbcTemplate.update("UPDATE modules SET is_active = 0 WHERE slug = 'human_resources'");

        assertThat(service.activeBasicProducts())
            .extracting(CommercialOfferSelection.Product::code)
            .doesNotContain("basic_hr");
        assertThatThrownBy(() -> service.select(List.of("basic_hr"), "MONTH", 0))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("valid products");
    }

    @Test
    @Transactional
    void pricesAReadyComplementaryModuleOnTopOfTheBasicPackage() {
        jdbcTemplate.update(
            """
                UPDATE billing_catalog_prices
                SET unit_amount_cents = CASE billing_interval WHEN 'MONTH' THEN 2500 ELSE 24000 END,
                    external_price_id = CASE billing_interval
                        WHEN 'MONTH' THEN 'price_addon_maintenance_month_test'
                        ELSE 'price_addon_maintenance_year_test'
                    END,
                    status = 'READY'
                WHERE billable_code = 'addon_maintenance'
                  AND billing_interval IN ('MONTH', 'YEAR')
                """
        );

        var available = service.activeProducts("MONTH");
        var basic = available.stream().filter(product -> !product.complementary()).findFirst().orElseThrow();
        var complementary = available.stream()
            .filter(product -> product.code().equals("addon_maintenance"))
            .findFirst()
            .orElseThrow();

        assertThat(complementary.productType()).isEqualTo("ADDON");
        assertThat(complementary.unitAmountCents()).isEqualTo(2_500);
        assertThat(complementary.externalPriceId()).isEqualTo("price_addon_maintenance_month_test");

        var selection = service.select(List.of(basic.code(), complementary.code()), "MONTH", 0);
        assertThat(selection.offerCode()).isEqualTo("basic_1");
        assertThat(selection.complementaryAmountCents()).isEqualTo(2_500);
        assertThat(selection.estimatedAmountCents())
            .isEqualTo(Math.addExact(selection.baseAmountCents(), 2_500));
        assertThat(selection.products())
            .extracting(CommercialOfferSelection.Product::code)
            .containsExactly(basic.code(), "addon_maintenance");
    }

    @Test
    @Transactional
    void pricesIndividualModulesPackagesSeatsAndPromotionsWithoutDuplicateCapabilities() {
        jdbcTemplate.update("UPDATE billing_catalog_versions SET status = 'SUPERSEDED' WHERE status = 'ACTIVE'");
        jdbcTemplate.update(
            "INSERT INTO billing_catalog_versions (version_code, status, effective_from) VALUES ('catalog-direct-test', 'ACTIVE', CURRENT_TIMESTAMP)"
        );
        var versionId = jdbcTemplate.queryForObject("SELECT LAST_INSERT_ID()", Long.class);

        var peopleId = insertProduct(versionId, "module_people_test", "Personas", "MODULE", 10);
        var processId = insertProduct(versionId, "module_process_test", "Procesos", "MODULE", 20);
        var packageId = insertProduct(versionId, "package_control_test", "Control operativo", "PACKAGE", 30);
        var seatId = insertProduct(versionId, "extra_user", "Usuario adicional", "SEAT", 90);
        jdbcTemplate.update(
            "INSERT INTO billing_product_capabilities (product_id, capability_code) VALUES (?, 'human_resources'), (?, 'processes'), (?, 'human_resources'), (?, 'processes')",
            peopleId, processId, packageId, packageId
        );
        jdbcTemplate.update(
            "INSERT INTO billing_package_items (package_product_id, included_product_id, sort_order) VALUES (?, ?, 10), (?, ?, 20)",
            packageId, peopleId, packageId, processId
        );
        insertPrices(versionId, peopleId, "module_people_test", "PRODUCT", 10_000, 96_000);
        insertPrices(versionId, processId, "module_process_test", "PRODUCT", 8_000, 76_800);
        insertPrices(versionId, packageId, "package_control_test", "PACKAGE", 15_000, 144_000);
        insertPrices(versionId, seatId, "extra_user", "SEAT", 1_000, 9_600);
        jdbcTemplate.update(
            """
                INSERT INTO billing_catalog_promotions
                    (catalog_version_id, promotion_code, display_name, discount_type,
                     percent_basis_points, duration_type, external_promotion_code_id, active)
                VALUES (?, 'CRECE20', 'Crece 20%', 'PERCENT', 2000, 'ONCE', 'promo_direct_test', 1)
                """,
            versionId
        );

        var selection = service.select(List.of("package_control_test"), "MONTH", 2, "crece20");

        assertThat(selection.catalogVersion()).isEqualTo("catalog-direct-test");
        assertThat(selection.offerCode()).isEqualTo("package_control_test");
        assertThat(selection.subtotalAmountCents()).isEqualTo(17_000);
        assertThat(selection.discountAmountCents()).isEqualTo(3_400);
        assertThat(selection.estimatedAmountCents()).isEqualTo(13_600);
        assertThat(selection.moduleSlugs()).containsExactly("human_resources", "processes");
        assertThat(selection.lineItems())
            .extracting(CommercialOfferSelection.LineItem::billableCode)
            .containsExactly("package_control_test", "extra_user");

        assertThatThrownBy(() -> service.select(
            List.of("package_control_test", "module_people_test"), "MONTH", 0, null
        ))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("repite el módulo");
    }

    private long insertProduct(long versionId, String code, String name, String kind, int sortOrder) {
        jdbcTemplate.update(
            """
                INSERT INTO billing_catalog_products
                    (catalog_version_id, product_code, display_name, product_type,
                     commercial_kind, sort_order, active)
                VALUES (?, ?, ?, 'ADDON', ?, ?, 1)
                """,
            versionId, code, name, kind, sortOrder
        );
        return jdbcTemplate.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
    }

    private void insertPrices(
        long versionId,
        long productId,
        String code,
        String priceType,
        long monthly,
        long annual
    ) {
        jdbcTemplate.update(
            """
                INSERT INTO billing_catalog_prices
                    (catalog_version_id, catalog_product_id, billable_code, price_type,
                     billing_interval, currency, unit_amount_cents, included_quantity,
                     external_price_id, status)
                VALUES (?, ?, ?, ?, 'MONTH', 'USD', ?, 1, CONCAT('price_', ?, '_month'), 'READY'),
                       (?, ?, ?, ?, 'YEAR', 'USD', ?, 1, CONCAT('price_', ?, '_year'), 'READY')
                """,
            versionId, productId, code, priceType, monthly, code,
            versionId, productId, code, priceType, annual, code
        );
    }
}
