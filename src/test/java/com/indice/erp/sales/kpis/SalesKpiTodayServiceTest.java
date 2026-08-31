package com.indice.erp.sales.kpis;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

import com.indice.erp.exchange.BusinessExchangeRateMetadataResponse;
import com.indice.erp.exchange.BusinessExchangeRateService;
import com.indice.erp.exchange.BusinessExchangeRatesResponse;
import com.indice.erp.kpis.currency.KpiCurrencyAggregationService;
import com.indice.erp.kpis.currency.KpiMoneyAmount;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class SalesKpiTodayServiceTest {

    @Test
    void calculatesBusinessDateAndMultiCurrencyTotalOnBackend() {
        var repository = mock(SalesKpiTodayRepository.class);
        var timeZoneResolver = mock(SalesBusinessTimeZoneResolver.class);
        var exchangeRateService = mock(BusinessExchangeRateService.class);
        var aggregation = new KpiCurrencyAggregationService();
        var clock = Clock.fixed(Instant.parse("2026-09-01T02:30:00Z"), ZoneOffset.UTC);
        var businessDate = LocalDate.of(2026, 8, 31);

        given(timeZoneResolver.resolve(9L)).willReturn(ZoneId.of("America/Mexico_City"));
        given(repository.salesAmounts(9L, businessDate)).willReturn(List.of(
            new KpiMoneyAmount(new BigDecimal("100.00"), "MXN"),
            new KpiMoneyAmount(new BigDecimal("10.00"), "USD")
        ));
        given(exchangeRateService.loadDailyRates()).willReturn(rates());

        var service = new SalesKpiTodayService(
            repository,
            timeZoneResolver,
            exchangeRateService,
            aggregation,
            clock
        );

        var result = service.today(9L, "MXN");

        assertThat(result.date()).isEqualTo(businessDate);
        assertThat(result.timezone()).isEqualTo("America/Mexico_City");
        assertThat(result.saleCount()).isEqualTo(2);
        assertThat(result.monetaryTotal().preferredCurrency()).isEqualTo("MXN");
        assertThat(result.monetaryTotal().preferredTotal()).isEqualByComparingTo("300.00");
        assertThat(result.monetaryTotal().nativeTotals()).hasSize(2);
        assertThat(result.monetaryTotal().partial()).isFalse();
    }

    @Test
    void defaultsToMxnAndReportsExcludedCurrencies() {
        var repository = mock(SalesKpiTodayRepository.class);
        var timeZoneResolver = mock(SalesBusinessTimeZoneResolver.class);
        var exchangeRateService = mock(BusinessExchangeRateService.class);
        var date = LocalDate.of(2026, 8, 31);

        given(timeZoneResolver.resolve(3L)).willReturn(ZoneId.of("America/Toronto"));
        given(repository.salesAmounts(3L, date)).willReturn(List.of(
            new KpiMoneyAmount(new BigDecimal("50.00"), "MXN"),
            new KpiMoneyAmount(new BigDecimal("20.00"), "XYZ")
        ));
        given(exchangeRateService.loadDailyRates()).willReturn(rates());

        var service = new SalesKpiTodayService(
            repository,
            timeZoneResolver,
            exchangeRateService,
            new KpiCurrencyAggregationService(),
            Clock.fixed(Instant.parse("2026-08-31T16:00:00Z"), ZoneOffset.UTC)
        );

        var result = service.today(3L, null);

        assertThat(result.saleCount()).isEqualTo(2);
        assertThat(result.monetaryTotal().preferredCurrency()).isEqualTo("MXN");
        assertThat(result.monetaryTotal().preferredTotal()).isEqualByComparingTo("50.00");
        assertThat(result.monetaryTotal().partial()).isTrue();
        assertThat(result.monetaryTotal().excludedCurrencies()).containsExactly("XYZ");
    }

    private BusinessExchangeRatesResponse rates() {
        return new BusinessExchangeRatesResponse(
            "USD",
            Map.of("USD", BigDecimal.ONE, "MXN", new BigDecimal("20.00")),
            new BusinessExchangeRateMetadataResponse(
                "daily_reference",
                "official_daily_reference",
                "2026-08-31",
                "2026-08-31T12:00:00Z",
                "Official sources",
                "",
                "",
                ""
            ),
            List.of(),
            List.of()
        );
    }
}
