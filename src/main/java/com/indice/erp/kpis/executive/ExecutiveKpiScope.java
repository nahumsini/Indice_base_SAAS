package com.indice.erp.kpis.executive;

import java.time.LocalDate;

public record ExecutiveKpiScope(
        long companyId,
        LocalDate from,
        LocalDate to,
        String period,
        Long unitId,
        Long businessId,
        String search,
        String risk,
        String preferredCurrency,
        LocalDate snapshotDate) {

    public ExecutiveKpiScope previousPeriod() {
        var days = java.time.temporal.ChronoUnit.DAYS.between(from, to) + 1;
        var previousTo = from.minusDays(1);
        return new ExecutiveKpiScope(
                companyId,
                previousTo.minusDays(days - 1),
                previousTo,
                period,
                unitId,
                businessId,
                search,
                risk,
                preferredCurrency,
                snapshotDate);
    }
}
