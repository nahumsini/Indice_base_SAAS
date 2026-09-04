package com.indice.erp.processTasks.processes;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.time.LocalDate;
import org.junit.jupiter.api.Test;

class ProcessRunsServiceTest {

    @Test
    void configuredDaysIncludeWeekendsWhenEnabled() {
        assertEquals(
                LocalDate.of(2026, 9, 7),
                ProcessRunsService.addConfiguredDays(LocalDate.of(2026, 9, 4), 3, true));
    }

    @Test
    void configuredDaysSkipWeekendsWhenDisabled() {
        assertEquals(
                LocalDate.of(2026, 9, 9),
                ProcessRunsService.addConfiguredDays(LocalDate.of(2026, 9, 4), 3, false));
    }

    @Test
    void zeroOffsetMovesWeekendStartToMondayWhenWeekendsAreExcluded() {
        assertEquals(
                LocalDate.of(2026, 9, 7),
                ProcessRunsService.addConfiguredDays(LocalDate.of(2026, 9, 5), 0, false));
    }
}
