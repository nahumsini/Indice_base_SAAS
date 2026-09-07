package com.indice.erp.kpis.currency;

import com.indice.erp.exchange.BusinessExchangeRateEvidence;
import com.indice.erp.exchange.BusinessExchangeRateService;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class BasicModuleKpiCurrencyService {

    private final BasicModuleKpiCurrencyRepository repository;
    private final KpiCurrencyAggregationService aggregationService;
    private final BusinessExchangeRateService exchangeRateService;
    private final com.indice.erp.finance.shared.FinanceBusinessTimeZoneResolver timezones;

    public BasicModuleKpiCurrencyService(
        BasicModuleKpiCurrencyRepository repository,
        KpiCurrencyAggregationService aggregationService,
        BusinessExchangeRateService exchangeRateService,
        com.indice.erp.finance.shared.FinanceBusinessTimeZoneResolver timezones
    ) {
        this.repository = repository;
        this.aggregationService = aggregationService;
        this.exchangeRateService = exchangeRateService;
        this.timezones = timezones;
    }

    public KpiMonetaryAggregate aggregate(
        long companyId,
        String metricValue,
        String preferredCurrency,
        String fromValue,
        String toValue,
        String idsValue
    ) {
        return aggregate(companyId, metricValue, preferredCurrency, fromValue, toValue, idsValue, idsValue != null);
    }

    public KpiMonetaryAggregate aggregate(
        long companyId,
        String metricValue,
        String preferredCurrency,
        String fromValue,
        String toValue,
        String idsValue,
        boolean restrictToIds
    ) {
        return aggregate(companyId, metricValue, preferredCurrency, fromValue, toValue, idsValue, restrictToIds,
            com.indice.erp.hr.HrOperationalScope.corporateOffice());
    }

    public KpiMonetaryAggregate aggregate(long companyId, String metricValue, String preferredCurrency, String fromValue,
            String toValue, String idsValue, boolean restrictToIds, com.indice.erp.hr.HrOperationalScope scope) {
        var metric = BasicModuleKpiMetric.parse(metricValue);
        var from = parseDate(fromValue, "from");
        var to = parseDate(toValue, "to");
        if (from != null && to != null && to.isBefore(from)) {
            throw new IllegalArgumentException("to must be greater than or equal to from");
        }
        var rates = exchangeRateService.loadDailyRates();
        var metadata = rates.metadata();
        var effectiveDate = parseSourceDate(metadata == null ? null : metadata.sourceDate());
        var zone = timezones.resolve(companyId);
        var today = LocalDate.now(zone);
        return aggregationService.aggregate(
            repository.load(metric, companyId, from, to, parseIds(idsValue), restrictToIds, today, zone, scope),
            preferredCurrency == null || preferredCurrency.isBlank() ? "MXN" : preferredCurrency,
            BusinessExchangeRateEvidence.verifiedRates(rates, today, true),
            "daily",
            effectiveDate,
            metadata == null ? "" : metadata.sourceName()
        );
    }

    private List<Long> parseIds(String value) {
        if (value == null || value.isBlank()) return List.of();
        var ids = new ArrayList<Long>();
        for (var token : value.split(",")) {
            if (ids.size() >= 10000) {
                throw new IllegalArgumentException("ids accepts at most 10000 values");
            }
            try {
                var id = Long.parseLong(token.trim());
                if (id <= 0) throw new NumberFormatException();
                ids.add(id);
            } catch (NumberFormatException ex) {
                throw new IllegalArgumentException("ids must contain positive numeric identifiers");
            }
        }
        return List.copyOf(ids);
    }

    private LocalDate parseDate(String value, String field) {
        if (value == null || value.isBlank()) return null;
        try {
            return LocalDate.parse(value);
        } catch (DateTimeParseException ex) {
            throw new IllegalArgumentException(field + " must use YYYY-MM-DD format");
        }
    }

    private LocalDate parseSourceDate(String value) {
        try {
            return value == null || value.isBlank() ? LocalDate.now() : LocalDate.parse(value);
        } catch (DateTimeParseException ex) {
            return LocalDate.now();
        }
    }
}
