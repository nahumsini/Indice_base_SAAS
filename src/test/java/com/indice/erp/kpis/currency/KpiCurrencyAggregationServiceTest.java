package com.indice.erp.kpis.currency;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class KpiCurrencyAggregationServiceTest {

    private final KpiCurrencyAggregationService service = new KpiCurrencyAggregationService();

    @Test
    void consolidatesNativeTotalsIntoPreferredCurrency() {
        var result = service.aggregate(
            List.of(
                new KpiMoneyAmount(new BigDecimal("100.00"), "USD"),
                new KpiMoneyAmount(new BigDecimal("1700.00"), "MXN")
            ),
            "MXN",
            Map.of("USD", BigDecimal.ONE, "MXN", new BigDecimal("17.00")),
            "daily",
            LocalDate.of(2026, 8, 6),
            "official"
        );

        assertThat(result.preferredTotal()).isEqualByComparingTo("3400.00");
        assertThat(result.nativeTotals()).hasSize(2);
        assertThat(result.partial()).isFalse();
        assertThat(result.excludedRecords()).isZero();
    }

    @Test
    void excludesMissingRatesInsteadOfAssumingOneToOne() {
        var result = service.aggregate(
            List.of(
                new KpiMoneyAmount(new BigDecimal("100.00"), "USD"),
                new KpiMoneyAmount(new BigDecimal("25.00"), "CAD")
            ),
            "MXN",
            Map.of("USD", BigDecimal.ONE, "MXN", new BigDecimal("17.00")),
            "daily",
            LocalDate.of(2026, 8, 6),
            "official"
        );

        assertThat(result.preferredTotal()).isEqualByComparingTo("1700.00");
        assertThat(result.partial()).isTrue();
        assertThat(result.excludedRecords()).isEqualTo(1);
        assertThat(result.excludedCurrencies()).containsExactly("CAD");
        assertThat(result.nativeTotals()).hasSize(2);
    }

    @Test
    void excludesMalformedSourceCurrencyInsteadOfFailingTheWholeDashboard() {
        var result = service.aggregate(
            List.of(
                new KpiMoneyAmount(new BigDecimal("100.00"), "MXN"),
                new KpiMoneyAmount(new BigDecimal("50.00"), "pesos")
            ),
            "MXN",
            Map.of("USD", BigDecimal.ONE, "MXN", new BigDecimal("17.00")),
            "daily",
            LocalDate.of(2026, 8, 6),
            "official"
        );

        assertThat(result.preferredTotal()).isEqualByComparingTo("100.00");
        assertThat(result.partial()).isTrue();
        assertThat(result.excludedRecords()).isEqualTo(1);
        assertThat(result.excludedCurrencies()).containsExactly("MONEDA_INVALIDA:pesos");
    }
}
