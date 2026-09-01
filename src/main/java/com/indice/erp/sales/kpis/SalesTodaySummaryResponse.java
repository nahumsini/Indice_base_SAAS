package com.indice.erp.sales.kpis;

import com.indice.erp.kpis.currency.KpiMonetaryAggregate;
import java.time.LocalDate;

public record SalesTodaySummaryResponse(
    LocalDate date,
    String timezone,
    long saleCount,
    KpiMonetaryAggregate monetaryTotal
) {
}
