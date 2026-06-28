package com.indice.erp.hr.payroll.engine;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.jdbc.core.JdbcTemplate;

class PayrollSnapshotServiceTest {

    @Test
    void persistLineSnapshotWritesReplayableInputsResultsRulesAndWarnings() {
        var jdbcTemplate = mock(JdbcTemplate.class);
        var service = new PayrollSnapshotService(jdbcTemplate, new ObjectMapper());

        service.persistLineSnapshot(99L, context(), result());

        var argsCaptor = ArgumentCaptor.forClass(Object[].class);
        verify(jdbcTemplate).update(contains("UPDATE payroll_run_lines"), argsCaptor.capture());
        var args = argsCaptor.getValue();
        assertEquals("MX", args[0]);
        assertEquals("MX", args[1]);
        assertEquals("MXN", args[2]);
        assertEquals("payroll_calculation_engine:mx", args[4]);
        assertTrue(String.valueOf(args[8]).contains("MANUAL_BONUS"));
        assertTrue(String.valueOf(args[9]).contains("currencySnapshot"));
        assertTrue(String.valueOf(args[9]).contains("fiscalAccumulator"));
        assertTrue(String.valueOf(args[9]).contains("manualAdjustments"));
        assertTrue(String.valueOf(args[9]).contains("MANUAL_BONUS"));
        assertTrue(String.valueOf(args[10]).contains("statutoryCompliance"));
        assertTrue(String.valueOf(args[11]).contains("auditBreakdown"));
        assertTrue(String.valueOf(args[11]).contains("calculationWarnings"));
        assertTrue(String.valueOf(args[12]).contains("attendance gap"));
        assertEquals(99L, args[13]);
    }

    @Test
    void persistRunSnapshotAggregatesComplianceAndDistinctWarnings() {
        var jdbcTemplate = mock(JdbcTemplate.class);
        var service = new PayrollSnapshotService(jdbcTemplate, new ObjectMapper());

        service.persistRunSnapshot(12L, PayrollCalculationResult.fromLines(List.of(
            result(),
            result("GENERIC_UNSUPPORTED_COUNTRY", false, List.of("unsupported"))
        )));

        var argsCaptor = ArgumentCaptor.forClass(Object[].class);
        verify(jdbcTemplate).update(anyString(), argsCaptor.capture());
        var args = argsCaptor.getValue();
        assertTrue(String.valueOf(args[0]).contains("\"statutoryCompliance\":false"));
        assertTrue(String.valueOf(args[0]).contains("unsupported"));
        assertEquals(12L, args[1]);
    }

    private PayrollCalculationContext context() {
        var periodEnd = LocalDate.parse("2026-06-30");
        return new PayrollCalculationContext(
            1L,
            10L,
            20L,
            30L,
            "MX",
            "MX",
            "MXN",
            BigDecimal.ONE,
            "semimonthly",
            LocalDate.parse("2026-06-01"),
            periodEnd,
            true,
            new PayrollCalculationContext.EmployeeSalarySnapshot(
                "USR-001",
                "Ada Lovelace",
                "Engineer",
                "Payroll",
                "Corporate",
                "Operations",
                "daily",
                new BigDecimal("1000.00"),
                BigDecimal.ZERO,
                new BigDecimal("8"),
                new BigDecimal("5")
            ),
            new PayrollCalculationContext.PayrollAttendanceInput(
                new BigDecimal("15"),
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                new BigDecimal("15"),
                0,
                new BigDecimal("120"),
                BigDecimal.ZERO,
                List.of("attendance gap"),
                List.of()
            ),
            new PayrollCalculationContext.Preferences(
                new BigDecimal("8"),
                true,
                new BigDecimal("0.10"),
                new BigDecimal("0.04"),
                new BigDecimal("0.03"),
                new BigDecimal("0.07"),
                new BigDecimal("0.05"),
                new BigDecimal("0.02")
            ),
            List.of(new PayrollCalculationContext.ManualAdjustment(
                "MANUAL_BONUS",
                "earning",
                "Bono manual",
                new BigDecimal("500.00"),
                "manual_taxable",
                true,
                true,
                false,
                "Manual taxable earning",
                "MXN"
            )),
            PayrollCalculationContext.CurrencySnapshot.defaultSameCurrency("MXN", BigDecimal.ONE, periodEnd)
        );
    }

    private PayrollLineCalculationResult result() {
        return result("payroll_calculation_engine:mx", true, List.of("manual fx rate"));
    }

    private PayrollLineCalculationResult result(String source, boolean statutoryCompliance, List<String> warnings) {
        return new PayrollLineCalculationResult(
            new BigDecimal("1000.00"),
            BigDecimal.ZERO,
            new BigDecimal("15"),
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            0,
            new BigDecimal("120"),
            BigDecimal.ZERO,
            new BigDecimal("1000.00"),
            new BigDecimal("1000.00"),
            new BigDecimal("150.00"),
            new BigDecimal("250.00"),
            new BigDecimal("850.00"),
            new BigDecimal("1250.00"),
            source,
            LocalDateTime.parse("2026-06-30T12:00:00"),
            List.of(),
            List.of("attendance gap"),
            statutoryCompliance,
            warnings,
            Map.of(
                "currencySnapshot", Map.of("nativeCurrency", "MXN"),
                "fiscalAccumulator", Map.of("taxableBaseYearToDate", "5000.00"),
                "manualAdjustments", List.of(Map.of("code", "MANUAL_BONUS", "amount", "500.00"))
            ),
            Map.of("statutoryCompliance", statutoryCompliance, "warnings", warnings),
            Map.of("rules", List.of(Map.of("ruleSetId", 1L)), "lineItems", List.of()),
            Map.of("provider", "mx")
        );
    }
}
