package com.indice.erp.kpis.executive;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.indice.erp.exchange.BusinessExchangeRateMetadataResponse;
import com.indice.erp.exchange.BusinessExchangeRatesResponse;
import com.indice.erp.kpis.currency.KpiCurrencyAggregationService;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class ExecutiveProductPortfolioServiceTest {

    private ExecutiveKpiDomainRepository repository;
    private ExecutiveProductPortfolioService service;
    private ExecutiveKpiScope scope;
    private ExecutiveKpiScope previous;
    private BusinessExchangeRatesResponse rates;

    @BeforeEach
    void setUp() {
        repository = mock(ExecutiveKpiDomainRepository.class);
        service = new ExecutiveProductPortfolioService(repository, new KpiCurrencyAggregationService());
        scope = new ExecutiveKpiScope(1L, LocalDate.of(2026, 8, 1), LocalDate.of(2026, 8, 31),
                "custom", 2L, 3L, "", "all", "MXN", LocalDate.of(2026, 8, 31));
        previous = scope.previousPeriod();
        rates = new BusinessExchangeRatesResponse(
                "USD",
                Map.of("USD", BigDecimal.ONE, "MXN", new BigDecimal("17.00")),
                new BusinessExchangeRateMetadataResponse(
                        "daily", "official", "2026-08-31", "2026-08-31T12:00:00Z",
                        "official-test", "", "", "test"),
                List.of(),
                List.of());
        when(repository.loadProductPortfolioInventory(scope)).thenReturn(List.of());
        when(repository.loadProductPortfolioSalesQuality(scope)).thenReturn(quality(4));
        when(repository.loadProductPortfolioSalesQuality(previous)).thenReturn(quality(4));
    }

    @Test
    void classifiesTheFourInternalPortfolioQuadrantsFromComparableSales() {
        when(repository.loadProductPortfolioSales(scope)).thenReturn(List.of(
                row(1, "Star", "200"),
                row(2, "Cash cow", "150"),
                row(3, "Question", "80"),
                row(4, "Dog", "20")));
        when(repository.loadProductPortfolioSales(previous)).thenReturn(List.of(
                row(1, "Star", "100"),
                row(2, "Cash cow", "200"),
                row(3, "Question", "40"),
                row(4, "Dog", "40")));
        when(repository.loadProductPortfolioInventory(scope)).thenReturn(List.of(
                new ExecutiveKpiDomainRepository.ProductPortfolioInventoryRow(
                        1L, BigDecimal.ZERO, new BigDecimal("5"), 1, 1, 0, 0)));

        var result = service.build(scope, rates);

        assertThat(result.contractVersion()).isEqualTo("1.0");
        assertThat(result.methodology().externalMarketDataIncluded()).isFalse();
        assertThat(result.methodology().highRelativeShareThresholdPercent())
                .isEqualByComparingTo("50.00");
        assertThat(result.items()).extracting(
                        ExecutiveProductPortfolioContracts.Product::productName,
                        ExecutiveProductPortfolioContracts.Product::quadrant)
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple("Star", "star"),
                        org.assertj.core.groups.Tuple.tuple("Cash cow", "cash_cow"),
                        org.assertj.core.groups.Tuple.tuple("Question", "question_mark"),
                        org.assertj.core.groups.Tuple.tuple("Dog", "dog"));
        assertThat(result.items().getFirst().growthPercent()).isEqualByComparingTo("100.00");
        assertThat(result.items().getFirst().relativeCategorySharePercent()).isEqualByComparingTo("100.00");
        assertThat(result.items().getFirst().contributionMarginPercent()).isEqualByComparingTo("50.00");
        assertThat(result.items().getFirst().costAvailable()).isTrue();
        assertThat(result.items().getFirst().stockStatus()).isEqualTo("out_of_stock");
        assertThat(result.classifiedProducts()).isEqualTo(4);
        assertThat(result.dataQuality().decisionReady()).isTrue();
    }

    @Test
    void keepsNewProductsUnclassifiedWhenThereIsNoComparisonBase() {
        when(repository.loadProductPortfolioSales(scope)).thenReturn(List.of(row(5, "New product", "120")));
        when(repository.loadProductPortfolioSales(previous)).thenReturn(List.of());
        when(repository.loadProductPortfolioSalesQuality(scope)).thenReturn(quality(1));
        when(repository.loadProductPortfolioSalesQuality(previous)).thenReturn(quality(0));

        var result = service.build(scope, rates);

        assertThat(result.items()).singleElement().satisfies(item -> {
            assertThat(item.quadrant()).isEqualTo("unclassified");
            assertThat(item.growthPercent()).isNull();
            assertThat(item.partial()).isTrue();
        });
        assertThat(result.dataQuality().decisionReady()).isFalse();
        assertThat(result.dataQuality().issues())
                .anyMatch(issue -> issue.contains("periodo anterior"));
    }

    private ExecutiveKpiDomainRepository.ProductPortfolioSalesRow row(
            long productId,
            String productName,
            String revenue) {
        return new ExecutiveKpiDomainRepository.ProductPortfolioSalesRow(
                productId, productName, "SKU-" + productId, "Beverages", "MXN",
                new BigDecimal(revenue), new BigDecimal(revenue).divide(new BigDecimal("2")),
                BigDecimal.TEN, 1, 0);
    }

    private ExecutiveKpiDomainRepository.ProductPortfolioSalesQuality quality(int attributedSales) {
        return new ExecutiveKpiDomainRepository.ProductPortfolioSalesQuality(
                attributedSales, attributedSales, 0, 0, 0, 0);
    }
}
