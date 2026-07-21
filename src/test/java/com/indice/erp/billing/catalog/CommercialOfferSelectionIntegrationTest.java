package com.indice.erp.billing.catalog;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
class CommercialOfferSelectionIntegrationTest {

    @Autowired
    private CommercialOfferSelectionService service;

    @Test
    void buildsLaunchOffersFromTheVersionedCatalogWithoutInventingTheAllBasicPrice() {
        var products = service.activeBasicProducts();
        assertThat(products).hasSize(6);

        var oneMonthly = service.select(List.of(products.getFirst().code()), "MONTH", 2);
        assertThat(oneMonthly.catalogVersion()).isEqualTo("2026.07-premium-v1");
        assertThat(oneMonthly.offerCode()).isEqualTo("basic_1");
        assertThat(oneMonthly.includedSeats()).isEqualTo(5);
        assertThat(oneMonthly.extraSeatUnitAmountCents()).isEqualTo(1_200);
        assertThat(oneMonthly.estimatedAmountCents()).isEqualTo(8_300);

        var threeAnnual = service.select(products.subList(0, 3).stream().map(p -> p.code()).toList(), "YEAR", 1);
        assertThat(threeAnnual.offerCode()).isEqualTo("basic_3");
        assertThat(threeAnnual.estimatedAmountCents()).isEqualTo(154_560);

        var all = service.select(products.stream().map(p -> p.code()).toList(), "MONTH", 0);
        assertThat(all.offerCode()).isEqualTo("basic_all");
        assertThat(all.baseAmountCents()).isNull();
        assertThat(all.estimatedAmountCents()).isNull();

        assertThatThrownBy(() -> service.select(
            products.subList(0, 4).stream().map(p -> p.code()).toList(), "MONTH", 0
        )).isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("1, 2, 3, or all");
    }
}
