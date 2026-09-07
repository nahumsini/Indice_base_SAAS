package com.indice.erp.kpis.executive;

import static org.assertj.core.api.Assertions.assertThat;
import com.indice.erp.exchange.BusinessExchangeRatesResponse;
import com.indice.erp.exchange.BusinessExchangeRateSourceResponse;
import com.indice.erp.kpis.currency.KpiCurrencyAggregationService;
import com.indice.erp.kpis.currency.KpiMonetaryAggregate;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class ExecutiveCurrencyProjectionTest {
    @Test
    void groupsNativeMoneyBeforeConversionAndKeepsTheEvidenceAndCounts() {
        var rows = List.of(row("USD", "100", 2), row("MXN", "100", 1));
        var converted = projection("MXN").organizations(rows).getFirst();
        assertThat((BigDecimal) converted.get("salesTotal")).isEqualByComparingTo("2100");
        assertThat((BigDecimal) converted.get("salesCount")).isEqualByComparingTo("3");
        assertThat(converted.get("monetaryPartial")).isEqualTo(false);
        var evidence = (Map<?, ?>) converted.get("monetaryAggregates");
        var sales = (KpiMonetaryAggregate) evidence.get("salesTotal");
        assertThat(sales.nativeTotals()).hasSize(2);
        assertThat(rows.getFirst().get("salesTotal")).isEqualTo(new BigDecimal("100"));
        assertThat(rows.getFirst().get("currency")).isEqualTo("USD");
    }

    @Test
    void missingRatesRemainPartialEvenWhenLaterModuleRowsAreComplete() {
        var scope = scope("CAD");
        var projected = projection("CAD");
        var sales = projected.organizations(List.of(row("CAD", "100", 1), row("BRL", "50", 1)));
        var expenses = projected.organizations(List.of(Map.of("unitId", 1L, "businessId", 2L,
            "currency", "CAD", "expensesTotal", new BigDecimal("10"))));
        var result = ExecutiveKpiRepository.mergeOrgRows(List.of(Map.of("unitId", 1L, "businessId", 2L,
            "unitName", "Toronto", "businessName", "Branch")), sales, List.of(), expenses,
            List.of(), List.of(), List.of(), List.of()).getFirst();
        assertThat(result.get("monetaryPartial")).isEqualTo(true);
        assertThat(result.get("businessName")).isEqualTo("Branch");
        assertThat((Map<?, ?>) result.get("monetaryAggregates")).hasSize(2);
        var matrices = new ExecutiveDecisionMatrixService().build(scope, List.of(result), null, List.of("CAD", "BRL"));
        assertThat(matrices.businessHealth().items().getFirst().decisionReady()).isFalse();
    }

    private ExecutiveCurrencyProjection projection(String target) {
        return new ExecutiveCurrencyProjection(scope(target), new KpiCurrencyAggregationService(),
            new BusinessExchangeRatesResponse("USD", Map.of("USD", BigDecimal.ONE, "MXN", new BigDecimal("20"),
                "CAD", new BigDecimal("1.25")), null, List.of(
                    rate("MXN", "20"), rate("CAD", "1.25")), List.of()));
    }

    private BusinessExchangeRateSourceResponse rate(String currency, String amount) {
        return new BusinessExchangeRateSourceResponse(currency, new BigDecimal(amount), "2026-09-06", "Test", "Test", "", "", "official", "");
    }

    private ExecutiveKpiScope scope(String target) {
        return new ExecutiveKpiScope(1L, LocalDate.of(2026, 9, 1), LocalDate.of(2026, 9, 6), "custom",
            null, null, "", "all", target, LocalDate.of(2026, 9, 6));
    }

    private Map<String, Object> row(String currency, String amount, int count) {
        return Map.of("unitId", 1L, "businessId", 2L, "currency", currency,
            "salesTotal", new BigDecimal(amount), "salesCount", count);
    }
}
