package com.indice.erp.sales.kpis;

import com.indice.erp.exchange.BusinessExchangeRateService;
import com.indice.erp.kpis.currency.KpiCurrencyAggregationService;
import java.time.Clock;
import java.time.LocalDate;
import org.springframework.stereotype.Service;

@Service
public class SalesKpiTodayService {

    private static final String DEFAULT_CURRENCY = "MXN";

    private final SalesKpiTodayRepository repository;
    private final SalesBusinessTimeZoneResolver timeZoneResolver;
    private final BusinessExchangeRateService exchangeRateService;
    private final KpiCurrencyAggregationService currencyAggregationService;
    private final Clock clock;

    public SalesKpiTodayService(
        SalesKpiTodayRepository repository,
        SalesBusinessTimeZoneResolver timeZoneResolver,
        BusinessExchangeRateService exchangeRateService,
        KpiCurrencyAggregationService currencyAggregationService,
        Clock clock
    ) {
        this.repository = repository;
        this.timeZoneResolver = timeZoneResolver;
        this.exchangeRateService = exchangeRateService;
        this.currencyAggregationService = currencyAggregationService;
        this.clock = clock;
    }

    public SalesTodaySummaryResponse today(long companyId, String preferredCurrency, com.indice.erp.hr.HrOperationalScope scope) {
        var timezone = timeZoneResolver.resolve(companyId);
        var businessDate = LocalDate.now(clock.withZone(timezone));
        var amounts = repository.salesAmounts(companyId, businessDate, scope);
        var rates = exchangeRateService.loadDailyRates();
        var metadata = rates.metadata();
        var effectiveDate = parseRateDate(metadata == null ? null : metadata.sourceDate(), businessDate);
        var source = metadata == null ? "" : metadata.sourceName();
        var currency = preferredCurrency == null || preferredCurrency.isBlank()
            ? DEFAULT_CURRENCY
            : preferredCurrency;
        var monetaryTotal = currencyAggregationService.aggregate(
            amounts,
            currency,
            com.indice.erp.exchange.BusinessExchangeRateEvidence.verifiedRates(rates, businessDate, true),
            "daily",
            effectiveDate,
            source
        );

        return new SalesTodaySummaryResponse(
            businessDate,
            timezone.getId(),
            amounts.size(),
            monetaryTotal
        );
    }

    private LocalDate parseRateDate(String value, LocalDate fallback) {
        try {
            return value == null || value.isBlank() ? fallback : LocalDate.parse(value);
        } catch (RuntimeException ignored) {
            return fallback;
        }
    }
}
