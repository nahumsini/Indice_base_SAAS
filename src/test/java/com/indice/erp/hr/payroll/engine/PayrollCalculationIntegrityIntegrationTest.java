package com.indice.erp.hr.payroll.engine;

import static org.junit.jupiter.api.Assertions.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

/** Uses migrated rule data, not the synthetic 10% table in the provider unit tests. */
@SpringBootTest
@Transactional
class PayrollCalculationIntegrityIntegrationTest {
    private static final LocalDate DATE = LocalDate.of(2026, 10, 19);
    @Autowired PayrollCalculationEngine engine;
    @Autowired PayrollAttendanceInputService attendanceService;
    @Autowired PayrollRuleResolver rules;
    @Autowired JdbcTemplate jdbc;

    @ParameterizedTest
    @CsvSource({"paid,false,6,1400.00,600.00", "unpaid,true,6,800.00,0.00", ",true,4,1200.00,400.00"})
    void hourlyLeaveIsPaidOnceUsingItsScheduledHours(String treatment, boolean defaultPaid, int leaveHours,
                                                     String expectedGross, String expectedLeave) {
        var input = attendanceService.build(DATE, DATE.plusDays(1), Map.of(
            DATE, new PayrollAttendanceInputService.AttendanceRecord(DATE, "on_time", null, null, null),
            DATE.plusDays(1), new PayrollAttendanceInputService.AttendanceRecord(DATE.plusDays(1), "leave", null, null, treatment)
        ), Map.of(
            DATE, new PayrollAttendanceInputService.ScheduleDay(DATE, true, false, decimal("8")),
            DATE.plusDays(1), new PayrollAttendanceInputService.ScheduleDay(DATE.plusDays(1), true, false, decimal("" + leaveHours))
        ), decimal("8"), "hourly", defaultPaid);
        var result = engine.calculateLine(context("hourly", "0", false, "weekly", DATE, input, List.of(), defaultPaid));
        assertMoney(expectedGross, result.grossAmount());
        assertMoney("800", amount(result, "BASE_HOURLY"));
        assertMoney(expectedLeave, amount(result, "LEAVE_PAY"));
        assertMoney(expectedGross, result.netAmount());
        assertMoney("0", result.taxableBase());
    }

    @Test
    void legacyHourlySnapshotWithoutDailyRecordsDoesNotPayLeaveTwice() {
        var input = new PayrollCalculationContext.PayrollAttendanceInput(decimal("2"), decimal("1"), decimal("1"),
            BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, decimal("2"), 0,
            decimal("16"), BigDecimal.ZERO, List.of(), List.of());
        var result = engine.calculateLine(context("hourly", "0", false, "weekly", DATE, input, List.of(), true));
        assertMoney("1600", result.grossAmount());
        assertMoney("800", amount(result, "LEAVE_PAY"));
        assertMoney("800", amount(result, "BASE_HOURLY"));
    }

    @Test
    void fixedSalaryPaidLeaveKeepsThePeriodSalary() {
        var attendance = attendanceService.build(DATE, DATE,
            Map.of(DATE, new PayrollAttendanceInputService.AttendanceRecord(DATE, "leave", null, null, "paid")),
            Map.of(DATE, new PayrollAttendanceInputService.ScheduleDay(DATE, true, false, decimal("6"))),
            decimal("8"), "daily", false);
        var result = engine.calculateLine(context("daily", "6000", false, "weekly", DATE, attendance, List.of(), false));
        assertMoney("6000", result.grossAmount());
        assertMoney("6000", result.netAmount());
        assertMoney("0", amount(result, "LEAVE_PAY"));
        assertMoney("0", amount(result, "ABSENCE_DEDUCTION"));
    }

    @Test
    void fiscalOvertimeKeepsAnExplicitPremiumReviewWarning() {
        var input = new PayrollCalculationContext.PayrollAttendanceInput(decimal("2"), BigDecimal.ZERO, BigDecimal.ZERO,
            BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, decimal("2"), 0,
            decimal("16"), decimal("2"), List.of(), List.of());
        var result = engine.calculateLine(context("hourly", "0", true, "weekly", DATE, input, List.of(), true));
        assertTrue(result.calculationWarnings().stream().anyMatch(warning -> warning.contains("horas extra")));
    }

    @ParameterizedTest
    @CsvSource({"monthly,30000,4519.65", "semimonthly,6216.13,499.18"})
    void mexicanIsrUsesRealTableIncludingFractionalMonthlyBoundary(String frequency, String salary, String expected) {
        var result = engine.calculateLine(context("daily", salary, true, frequency, DATE, emptyAttendance(), List.of(), true));
        assertMoney(expected, amount(result, "ISR"));
        assertMoney(salary, result.taxableBase());
        assertMoney(salary, result.grossAmount());
        assertEquals(result.grossAmount().subtract(result.deductionsAmount()), result.netAmount());
    }

    @Test
    void mexicanImssIncludesMedicalCashDisabilityAndRetirementComponents() {
        var result = engine.calculateLine(context("daily", "10000", true, "semimonthly", DATE, emptyAttendance(), List.of(), true));
        assertMoney("270.07", amount(result, "IMSS_EMP"));
        assertMoney("783.59", amount(result, "EMPLOYER_IMSS"));
        assertMoney("524.66", amount(result, "EMPLOYER_INFONAVIT"));
        assertEquals(result.grossAmount().add(result.employerContributionsAmount()), result.totalPayrollCost());
        var current = rules.resolveRuleSet("MX", "", "SOCIAL_SECURITY", DATE);
        assertEquals("LSS 2026 complete ordinary contributions v2", current.versionLabel());
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM payroll_rule_sets WHERE country_code='MX' AND rule_code='SOCIAL_SECURITY' AND version_label='LSS/INFONAVIT 2026 v1'", Integer.class));
        assertMoney("0.00625", jdbc.queryForObject("SELECT p.parameter_value FROM payroll_rule_parameters p JOIN payroll_rule_sets r ON r.id=p.rule_set_id "
            + "WHERE r.country_code='MX' AND r.rule_code='SOCIAL_SECURITY' AND r.version_label='LSS/INFONAVIT 2026 v1' AND p.parameter_key='employee_fixed_period_rate'", BigDecimal.class));
    }

    @ParameterizedTest
    @ValueSource(strings = {"ISR_MONTHLY", "SOCIAL_SECURITY", "RCV_EMPLOYER", "UMA"})
    void missingMexicanRuleCannotSilentlyCalculateWithZeroOrFallback(String code) {
        jdbc.update("UPDATE payroll_rule_sets SET is_active=0 WHERE country_code='MX' AND rule_code=?", code);
        var error = assertThrows(IllegalArgumentException.class, () -> engine.calculateLine(
            context("daily", "10000", true, "semimonthly", DATE, emptyAttendance(), List.of(), true)));
        assertTrue(error.getMessage().contains(code));
    }

    @ParameterizedTest
    @ValueSource(strings = {"ISR_MONTHLY", "RCV_EMPLOYER"})
    void emptyMexicanBracketTableCannotProduceAValidCalculation(String code) {
        jdbc.update("DELETE b FROM payroll_rule_brackets b JOIN payroll_rule_sets r ON r.id=b.rule_set_id WHERE r.country_code='MX' AND r.rule_code=?", code);
        assertThrows(IllegalArgumentException.class, () -> engine.calculateLine(
            context("daily", "10000", true, "semimonthly", DATE, emptyAttendance(), List.of(), true)));
    }

    @Test
    void expiredTaxYearCannotReuse2026Rates() {
        assertThrows(IllegalArgumentException.class, () -> engine.calculateLine(
            context("daily", "10000", true, "semimonthly", DATE.plusYears(1), emptyAttendance(), List.of(), true)));
    }

    @Test
    void missingRuleDoesNotBlockOperationalPayroll() {
        jdbc.update("UPDATE payroll_rule_sets SET is_active=0 WHERE country_code='MX'");
        var result = engine.calculateLine(context("daily", "10000", false, "semimonthly", DATE, emptyAttendance(), List.of(), true));
        assertMoney("10000", result.netAmount());
        assertMoney("0", result.deductionsAmount());
        assertMoney("0", result.employerContributionsAmount());
        assertFalse(result.statutoryCompliance());
    }

    @Test
    void manualDeductionAndEmployerCostDoNotIncreaseIncomeTax() {
        var adjustments = new PayrollManualAdjustmentService();
        var baseline = engine.calculateLine(context("daily", "10000", true, "semimonthly", DATE, emptyAttendance(), List.of(), true));
        var result = engine.calculateLine(context("daily", "10000", true, "semimonthly", DATE, emptyAttendance(), List.of(
            adjustments.normalize("deduction", "Loan", decimal("250"), "MXN"),
            adjustments.normalize("employer_contribution", "Employer cost", decimal("750"), "MXN")
        ), true));
        assertEquals(amount(baseline, "ISR"), amount(result, "ISR"));
        assertEquals(baseline.netAmount().subtract(decimal("250.00")), result.netAmount());
        assertEquals(baseline.employerContributionsAmount().add(decimal("750.00")), result.employerContributionsAmount());
    }

    @ParameterizedTest
    @CsvSource({"false,false", "false,true", "true,false"})
    void unsupportedExemptOrSeparateContributionBaseCannotBeSilentlyTaxed(boolean taxable, boolean social) {
        var adjustment = new PayrollCalculationContext.ManualAdjustment("BENEFIT", "earning", "Benefit", decimal("500"),
            "special_treatment", taxable, social, false, "Benefit", "MXN");
        assertThrows(IllegalArgumentException.class, () -> engine.calculateLine(
            context("daily", "10000", true, "semimonthly", DATE, emptyAttendance(), List.of(adjustment), true)));
        var operational = engine.calculateLine(context("daily", "10000", false, "semimonthly", DATE, emptyAttendance(), List.of(adjustment), true));
        assertMoney("10500", operational.netAmount());
    }

    @Test
    void missingContributionParameterCannotFallBackToAnUnversionedRate() {
        jdbc.update("DELETE p FROM payroll_rule_parameters p JOIN payroll_rule_sets r ON r.id=p.rule_set_id "
            + "WHERE r.country_code='MX' AND r.rule_code='SOCIAL_SECURITY' AND p.parameter_key='employee_fixed_period_rate'");
        assertThrows(IllegalArgumentException.class, () -> engine.calculateLine(
            context("daily", "10000", true, "semimonthly", DATE, emptyAttendance(), List.of(), true)));
    }

    @Test
    void invalidContributionParameterCannotProduceANegativeOrExcessiveTax() {
        jdbc.update("UPDATE payroll_rule_parameters p JOIN payroll_rule_sets r ON r.id=p.rule_set_id "
            + "SET p.parameter_value=1.25 WHERE r.country_code='MX' AND r.rule_code='SOCIAL_SECURITY' AND p.parameter_key='employee_fixed_period_rate'");
        assertThrows(IllegalArgumentException.class, () -> engine.calculateLine(
            context("daily", "10000", true, "semimonthly", DATE, emptyAttendance(), List.of(), true)));
    }

    @ParameterizedTest
    @CsvSource({"2026-01-15,113.14", "2026-02-01,117.31"})
    void umaSwitchesOnItsEffectiveDate(String date, String expectedUma) {
        var result = engine.calculateLine(context("daily", "10000", true, "semimonthly", LocalDate.parse(date), emptyAttendance(), List.of(), true));
        var employer = amount(result, "EMPLOYER_IMSS");
        var sbc = decimal("10493.1507");
        var expected = decimal(expectedUma).multiply(decimal(".204")).multiply(decimal("15"))
            .add(sbc.subtract(decimal(expectedUma).multiply(decimal("45"))).multiply(decimal(".011")))
            .add(sbc.multiply(decimal(".035"))).setScale(2, java.math.RoundingMode.HALF_UP);
        assertEquals(expected, employer);
    }

    private PayrollCalculationContext context(String type, String salary, boolean fiscal, String frequency, LocalDate date,
        PayrollCalculationContext.PayrollAttendanceInput attendance, List<PayrollCalculationContext.ManualAdjustment> adjustments, boolean paidLeave) {
        return new PayrollCalculationContext(1, 1, 1, null, "MX", "MX", "MXN", BigDecimal.ONE, frequency, date, date.plusDays(1), fiscal,
            new PayrollCalculationContext.EmployeeSalarySnapshot("test", "Test", "", "", "", "", type, decimal(salary), decimal("100"), decimal("8"), decimal("6")),
            attendance, new PayrollCalculationContext.Preferences(decimal("8"), paidLeave, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO),
            adjustments, PayrollCalculationContext.CurrencySnapshot.defaultSameCurrency("MXN", BigDecimal.ONE, date));
    }

    private PayrollCalculationContext.PayrollAttendanceInput emptyAttendance() {
        return new PayrollCalculationContext.PayrollAttendanceInput(BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO,
            BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, 0,
            BigDecimal.ZERO, BigDecimal.ZERO, List.of(), List.of());
    }

    private BigDecimal amount(PayrollLineCalculationResult result, String code) {
        return result.items().stream().filter(item -> code.equals(item.code())).map(PayrollCalculatedLineItem::amount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
    private static BigDecimal decimal(String value) { return new BigDecimal(value); }
    private static void assertMoney(String expected, BigDecimal actual) {
        assertEquals(0, decimal(expected).compareTo(actual), () -> "Expected " + expected + " but got " + actual);
    }
}
