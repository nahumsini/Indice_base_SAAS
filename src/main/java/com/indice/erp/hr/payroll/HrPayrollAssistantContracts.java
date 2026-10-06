package com.indice.erp.hr.payroll;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/** Operational payroll projection excludes identity, health, banking and raw engine snapshots. */
public final class HrPayrollAssistantContracts {
    private HrPayrollAssistantContracts(){ }
    public record ManualItem(String category,String label,BigDecimal amount){ }
    public record Change(String payPeriod,LocalDate periodStartDate,LocalDate periodEndDate,String groupingMode,
        Long lineId,String payrollTreatment,String notes,List<ManualItem> manualItems){ }
    public record Item(String code,String category,String label,BigDecimal amount,String sourceType,String currency,
        String taxTreatment,boolean taxable,boolean affectsSocialSecurity,boolean affectsEmployerCost){ }
    public record Line(long id,long userCompanyId,String employeeName,Long unitId,String unitName,Long businessId,String businessName,
        String country,String jurisdiction,String currency,BigDecimal fxRate,String payPeriod,String payrollTreatment,String paymentRoute,
        String notes,BigDecimal grossAmount,BigDecimal deductionsAmount,BigDecimal employerContributionsAmount,BigDecimal netAmount,
        BigDecimal daysPayable,BigDecimal paidLeaveDays,BigDecimal absenceDays,BigDecimal missingAttendanceDays,
        BigDecimal regularHours,BigDecimal overtimeHours,boolean statutoryCompliance,List<String> calculationWarnings,
        List<String> attendanceWarnings,List<Item> items){ }
    public record CurrencyTotal(String currency,BigDecimal grossAmount,BigDecimal deductionsAmount,
        BigDecimal employerContributionsAmount,BigDecimal netAmount){ }
    public record Run(long id,String groupingMode,String groupingKey,String groupingLabel,String payPeriod,
        LocalDate periodStartDate,LocalDate periodEndDate,String status,int employeeCount,List<CurrencyTotal> totals,
        List<Line> lines,boolean reused){ }
    public record Result(List<Run> runs){ }
    public record Preparation(Change change,Result before,Result after){ }
}
