package com.indice.erp.billing.catalog;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

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
        assertThat(threeAnnual.estimatedAmountCents()).isEqualTo(157_440);

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
}
