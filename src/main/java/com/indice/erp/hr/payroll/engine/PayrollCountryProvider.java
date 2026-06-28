package com.indice.erp.hr.payroll.engine;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

public interface PayrollCountryProvider {

    String providerCode();

    boolean supports(String countryCode);

    default List<PayrollCalculatedLineItem> calculateLine(PayrollCalculationContext context, BigDecimal taxableBase) {
        var items = new java.util.ArrayList<PayrollCalculatedLineItem>();
        items.addAll(calculateEmployeeDeductions(context, taxableBase));
        items.addAll(calculateEmployerContributions(context, taxableBase));
        items.addAll(calculateProvisions(context, taxableBase));
        return items;
    }

    default List<PayrollCalculatedLineItem> calculateEmployeeDeductions(
        PayrollCalculationContext context,
        BigDecimal taxableBase
    ) {
        return List.of();
    }

    default List<PayrollCalculatedLineItem> calculateEmployerContributions(
        PayrollCalculationContext context,
        BigDecimal taxableBase
    ) {
        return List.of();
    }

    default List<PayrollCalculatedLineItem> calculateProvisions(
        PayrollCalculationContext context,
        BigDecimal taxableBase
    ) {
        return List.of();
    }

    default Map<String, Object> buildAuditBreakdown(
        PayrollCalculationContext context,
        PayrollLineCalculationResult result
    ) {
        return Map.of(
            "provider", providerCode(),
            "country", context.country(),
            "jurisdiction", context.jurisdiction(),
            "taxableBase", result.taxableBase(),
            "grossEarnings", result.grossAmount(),
            "employeeDeductions", result.deductionsAmount(),
            "employerContributions", result.employerContributionsAmount(),
            "netPay", result.netAmount(),
            "totalPayrollCost", result.totalPayrollCost()
        );
    }

    default List<String> calculationWarnings(
        PayrollCalculationContext context,
        BigDecimal taxableBase,
        List<PayrollCalculatedLineItem> items
    ) {
        return List.of();
    }
}
