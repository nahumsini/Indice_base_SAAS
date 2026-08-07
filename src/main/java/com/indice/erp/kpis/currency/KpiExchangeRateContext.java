package com.indice.erp.kpis.currency;

import java.time.LocalDate;

public record KpiExchangeRateContext(
    String mode,
    LocalDate effectiveDate,
    String source
) {
}
