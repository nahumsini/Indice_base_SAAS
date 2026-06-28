package com.indice.erp.hr.payroll.engine;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public record PayrollLineCalculationResult(
    BigDecimal baseSalaryAmount,
    BigDecimal hourlyRateAmount,
    BigDecimal daysPayable,
    BigDecimal paidLeaveDays,
    BigDecimal leaveDays,
    BigDecimal unpaidAbsenceDays,
    BigDecimal absenceDays,
    BigDecimal restDays,
    BigDecimal missingAttendanceDays,
    int lateCount,
    BigDecimal regularHours,
    BigDecimal overtimeHours,
    BigDecimal taxableBase,
    BigDecimal grossAmount,
    BigDecimal deductionsAmount,
    BigDecimal employerContributionsAmount,
    BigDecimal netAmount,
    BigDecimal totalPayrollCost,
    String calculationSource,
    LocalDateTime calculationTimestamp,
    List<PayrollCalculatedLineItem> items,
    List<String> attendanceWarnings,
    boolean statutoryCompliance,
    List<String> calculationWarnings,
    Map<String, Object> calculationInputs,
    Map<String, Object> calculationResults,
    Map<String, Object> ruleSnapshot,
    Map<String, Object> auditBreakdown
) {
    public PayrollLineCalculationResult {
        baseSalaryAmount = money(baseSalaryAmount);
        hourlyRateAmount = money(hourlyRateAmount);
        daysPayable = decimal(daysPayable);
        paidLeaveDays = decimal(paidLeaveDays);
        leaveDays = decimal(leaveDays);
        unpaidAbsenceDays = decimal(unpaidAbsenceDays);
        absenceDays = decimal(absenceDays);
        restDays = decimal(restDays);
        missingAttendanceDays = decimal(missingAttendanceDays);
        regularHours = decimal(regularHours);
        overtimeHours = decimal(overtimeHours);
        taxableBase = money(taxableBase);
        grossAmount = money(grossAmount);
        deductionsAmount = money(deductionsAmount);
        employerContributionsAmount = money(employerContributionsAmount);
        netAmount = money(netAmount);
        totalPayrollCost = money(totalPayrollCost);
        calculationSource = calculationSource == null ? "payroll_calculation_engine" : calculationSource;
        calculationTimestamp = calculationTimestamp == null ? LocalDateTime.now() : calculationTimestamp;
        items = items == null ? List.of() : List.copyOf(items);
        attendanceWarnings = attendanceWarnings == null ? List.of() : List.copyOf(attendanceWarnings);
        calculationWarnings = calculationWarnings == null ? List.of() : List.copyOf(calculationWarnings);
        calculationInputs = calculationInputs == null ? Map.of() : Map.copyOf(calculationInputs);
        calculationResults = calculationResults == null ? Map.of() : Map.copyOf(calculationResults);
        ruleSnapshot = ruleSnapshot == null ? Map.of() : Map.copyOf(ruleSnapshot);
        auditBreakdown = auditBreakdown == null ? Map.of() : Map.copyOf(auditBreakdown);
    }

    private static BigDecimal money(BigDecimal value) {
        return (value == null ? BigDecimal.ZERO : value).setScale(2, RoundingMode.HALF_UP);
    }

    private static BigDecimal decimal(BigDecimal value) {
        return (value == null ? BigDecimal.ZERO : value).setScale(2, RoundingMode.HALF_UP);
    }
}
