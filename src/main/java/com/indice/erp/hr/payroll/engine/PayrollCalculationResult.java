package com.indice.erp.hr.payroll.engine;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

public record PayrollCalculationResult(
    List<PayrollLineCalculationResult> lines,
    BigDecimal grossAmount,
    BigDecimal deductionsAmount,
    BigDecimal employerContributionsAmount,
    BigDecimal netAmount,
    BigDecimal totalPayrollCost
) {
    public PayrollCalculationResult {
        lines = lines == null ? List.of() : List.copyOf(lines);
        grossAmount = money(grossAmount);
        deductionsAmount = money(deductionsAmount);
        employerContributionsAmount = money(employerContributionsAmount);
        netAmount = money(netAmount);
        totalPayrollCost = money(totalPayrollCost);
    }

    public static PayrollCalculationResult fromLines(List<PayrollLineCalculationResult> lines) {
        var safeLines = lines == null ? List.<PayrollLineCalculationResult>of() : lines;
        return new PayrollCalculationResult(
            safeLines,
            safeLines.stream().map(PayrollLineCalculationResult::grossAmount).reduce(BigDecimal.ZERO, BigDecimal::add),
            safeLines.stream().map(PayrollLineCalculationResult::deductionsAmount).reduce(BigDecimal.ZERO, BigDecimal::add),
            safeLines.stream().map(PayrollLineCalculationResult::employerContributionsAmount).reduce(BigDecimal.ZERO, BigDecimal::add),
            safeLines.stream().map(PayrollLineCalculationResult::netAmount).reduce(BigDecimal.ZERO, BigDecimal::add),
            safeLines.stream().map(PayrollLineCalculationResult::totalPayrollCost).reduce(BigDecimal.ZERO, BigDecimal::add)
        );
    }

    private static BigDecimal money(BigDecimal value) {
        return (value == null ? BigDecimal.ZERO : value).setScale(2, RoundingMode.HALF_UP);
    }
}
