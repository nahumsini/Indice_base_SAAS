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
        String risk) {
}
