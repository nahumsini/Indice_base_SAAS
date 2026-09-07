package com.indice.erp.exchange;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.Map;

/** Financial consumers must not treat the display service's illustrative fallback as evidence. */
public final class BusinessExchangeRateEvidence {
    private BusinessExchangeRateEvidence() {}

    public static Map<String, BigDecimal> verifiedRates(
            BusinessExchangeRatesResponse snapshot, LocalDate asOf, boolean allowRecentStale) {
        var result = new LinkedHashMap<String, BigDecimal>();
        result.put("USD", BigDecimal.ONE);
        if (snapshot == null || snapshot.sources() == null || asOf == null) return Map.copyOf(result);
        for (var source : snapshot.sources()) {
            if (!"official".equals(source.status()) && !(allowRecentStale && "stale".equals(source.status()))) continue;
            try {
                var observed = LocalDate.parse(source.observedDate());
                var age = ChronoUnit.DAYS.between(observed, asOf);
                var rate = snapshot.ratesPerUsd().get(source.currencyCode());
                if (age >= 0 && age <= 7 && rate != null && rate.signum() > 0
                        && source.ratePerUsd() != null && rate.compareTo(source.ratePerUsd()) == 0) {
                    result.put(source.currencyCode(), rate);
                }
            } catch (RuntimeException ignored) {
                // Incomplete source metadata excludes conversion; native amounts remain available.
            }
        }
        return Map.copyOf(result);
    }
}
