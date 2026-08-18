package com.indice.erp.kpis.executive;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import org.junit.jupiter.api.Test;

class ExecutiveKpiScopeTest {

    @Test
    void previousPeriodKeepsTheSameInclusiveDurationAndScope() {
        var scope = new ExecutiveKpiScope(
                9L,
                LocalDate.of(2026, 8, 1),
                LocalDate.of(2026, 8, 16),
                "custom",
                3L,
                7L,
                "north",
                "watch",
                "CAD",
                LocalDate.of(2026, 8, 16));

        var previous = scope.previousPeriod();

        assertThat(previous.from()).isEqualTo(LocalDate.of(2026, 7, 16));
        assertThat(previous.to()).isEqualTo(LocalDate.of(2026, 7, 31));
        assertThat(previous.companyId()).isEqualTo(9L);
        assertThat(previous.unitId()).isEqualTo(3L);
        assertThat(previous.businessId()).isEqualTo(7L);
        assertThat(previous.preferredCurrency()).isEqualTo("CAD");
        assertThat(previous.snapshotDate()).isEqualTo(LocalDate.of(2026, 8, 16));
    }
}
