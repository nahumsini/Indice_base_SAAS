package com.indice.erp.kpis.currency;

import java.math.BigDecimal;

public record KpiMoneyAmount(
    BigDecimal amount,
    String currency
) {
}
