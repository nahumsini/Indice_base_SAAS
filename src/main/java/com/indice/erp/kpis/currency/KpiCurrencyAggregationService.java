package com.indice.erp.kpis.currency;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class KpiCurrencyAggregationService {

    private static final int MONEY_SCALE = 2;

    public KpiMonetaryAggregate aggregate(
        List<KpiMoneyAmount> amounts,
        String preferredCurrency,
        Map<String, BigDecimal> ratesPerUsd,
        String rateMode,
        LocalDate effectiveDate,
        String source
    ) {
        var targetCurrency = normalizeCurrency(preferredCurrency);
        var normalizedRates = normalizeRates(ratesPerUsd);
        var nativeTotals = new LinkedHashMap<String, BigDecimal>();
        var convertedTotal = BigDecimal.ZERO;
        var excludedRecords = 0;
        var excludedCurrencies = new LinkedHashSet<String>();

        for (var item : amounts == null ? List.<KpiMoneyAmount>of() : amounts) {
            if (item == null || item.amount() == null) continue;
            var nativeCurrency = validCurrency(item.currency());
            if (nativeCurrency == null) {
                excludedRecords++;
                excludedCurrencies.add(invalidCurrencyLabel(item.currency()));
                continue;
            }
            nativeTotals.merge(nativeCurrency, item.amount(), BigDecimal::add);

            var converted = convert(item.amount(), nativeCurrency, targetCurrency, normalizedRates);
            if (converted == null) {
                excludedRecords++;
                excludedCurrencies.add(nativeCurrency);
            } else {
                convertedTotal = convertedTotal.add(converted);
            }
        }

        var nativeBreakdown = nativeTotals.entrySet().stream()
            .map(entry -> new KpiNativeCurrencyTotal(entry.getKey(), money(entry.getValue())))
            .toList();

        return new KpiMonetaryAggregate(
            targetCurrency,
            money(convertedTotal),
            nativeBreakdown,
            new KpiExchangeRateContext(normalizeMode(rateMode), effectiveDate, source == null ? "" : source.trim()),
            excludedRecords > 0,
            excludedRecords,
            new ArrayList<>(excludedCurrencies)
        );
    }

    private BigDecimal convert(
        BigDecimal amount,
        String sourceCurrency,
        String targetCurrency,
        Map<String, BigDecimal> ratesPerUsd
    ) {
        if (sourceCurrency.equals(targetCurrency)) return amount;
        var sourceRate = ratesPerUsd.get(sourceCurrency);
        var targetRate = ratesPerUsd.get(targetCurrency);
        if (!validRate(sourceRate) || !validRate(targetRate)) return null;
        return amount.multiply(targetRate).divide(sourceRate, 8, RoundingMode.HALF_UP);
    }

    private Map<String, BigDecimal> normalizeRates(Map<String, BigDecimal> rates) {
        var normalized = new LinkedHashMap<String, BigDecimal>();
        if (rates == null) return normalized;
        rates.forEach((currency, rate) -> {
            if (currency != null && validRate(rate)) normalized.put(normalizeCurrency(currency), rate);
        });
        return normalized;
    }

    private boolean validRate(BigDecimal rate) {
        return rate != null && rate.compareTo(BigDecimal.ZERO) > 0;
    }

    private BigDecimal money(BigDecimal value) {
        return value.setScale(MONEY_SCALE, RoundingMode.HALF_UP);
    }

    private String normalizeCurrency(String currency) {
        var normalized = currency == null ? "" : currency.trim().toUpperCase(Locale.ROOT);
        if (!normalized.matches("[A-Z]{3}")) {
            throw new IllegalArgumentException("currency must use a three-letter ISO code");
        }
        return normalized;
    }

    private String validCurrency(String currency) {
        var normalized = currency == null ? "" : currency.trim().toUpperCase(Locale.ROOT);
        return normalized.matches("[A-Z]{3}") ? normalized : null;
    }

    private String invalidCurrencyLabel(String currency) {
        var value = currency == null ? "" : currency.trim();
        return value.isBlank() ? "MONEDA_SIN_CODIGO" : "MONEDA_INVALIDA:" + value;
    }

    private String normalizeMode(String mode) {
        var normalized = mode == null ? "daily" : mode.trim().toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "daily", "configured", "snapshot" -> normalized;
            default -> throw new IllegalArgumentException("rateMode must be daily, configured, or snapshot");
        };
    }
}
