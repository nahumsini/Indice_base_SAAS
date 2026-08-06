package com.indice.erp.kpis.currency;

import java.math.BigDecimal;

public record KpiNativeCurrencyTotal(
    String currency,
    BigDecimal amount
) {
}
