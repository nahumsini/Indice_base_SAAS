package com.indice.erp.kpis.currency;

import java.math.BigDecimal;
import java.util.List;

public record KpiMonetaryAggregate(
    String preferredCurrency,
    BigDecimal preferredTotal,
    List<KpiNativeCurrencyTotal> nativeTotals,
    KpiExchangeRateContext exchangeRate,
    boolean partial,
    int excludedRecords,
    List<String> excludedCurrencies
) {
}
