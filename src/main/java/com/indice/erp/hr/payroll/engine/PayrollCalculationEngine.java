package com.indice.erp.hr.payroll.engine;

import com.indice.erp.hr.payroll.provider.generic.GenericPayrollProvider;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class PayrollCalculationEngine {

    private static final BigDecimal BRAZIL_OVERTIME_MULTIPLIER = new BigDecimal("1.50");
    private static final BigDecimal DEFAULT_OVERTIME_MULTIPLIER = BigDecimal.ONE;

    private final List<PayrollCountryProvider> providers;
    private final PayrollManualAdjustmentService manualAdjustmentService;
    private final PayrollRuleResolver ruleResolver;

    public PayrollCalculationEngine(
        List<PayrollCountryProvider> providers,
        PayrollManualAdjustmentService manualAdjustmentService,
        PayrollRuleResolver ruleResolver
    ) {
        this.providers = List.copyOf(providers);
        this.manualAdjustmentService = manualAdjustmentService;
        this.ruleResolver = ruleResolver;
    }

    public PayrollLineCalculationResult calculateLine(PayrollCalculationContext context) {
        var items = new ArrayList<PayrollCalculatedLineItem>();
        items.addAll(baseCompensationItems(context));
        items.addAll(manualAdjustmentService.toLineItems(context, context.manualAdjustments()));

        var earningTotal = sum(items, "earning");
        var attendanceReductionTotal = items.stream()
            .filter((item) -> "deduction".equals(item.category()) && "ABSENCE_DEDUCTION".equals(item.code()))
            .map(PayrollCalculatedLineItem::amount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        var taxableBase = context.includeInFiscal()
            ? earningTotal.subtract(attendanceReductionTotal).max(BigDecimal.ZERO)
            : BigDecimal.ZERO;

        var provider = providerFor(context.country());
        if (context.includeInFiscal() && taxableBase.compareTo(BigDecimal.ZERO) > 0) {
            items.addAll(provider.calculateLine(context, taxableBase));
        }

        var sortedItems = items.stream()
            .filter((item) -> item.amount().compareTo(BigDecimal.ZERO) >= 0)
            .sorted(Comparator.comparingInt(PayrollCalculatedLineItem::displayOrder).thenComparing(PayrollCalculatedLineItem::code))
            .toList();
        var grossAmount = money(sum(sortedItems, "earning"));
        var deductionsAmount = money(sum(sortedItems, "deduction"));
        var employerContributionsAmount = money(sum(sortedItems, "employer_contribution").add(sum(sortedItems, "provision")));
        var netAmount = money(grossAmount.subtract(deductionsAmount));
        var totalPayrollCost = money(grossAmount.add(employerContributionsAmount));
        var timestamp = LocalDateTime.now();
        var genericUnsupportedCountry = provider instanceof GenericPayrollProvider;
        var statutoryCompliance = context.includeInFiscal() && !genericUnsupportedCountry;
        var calculationWarnings = calculationWarnings(context, provider, genericUnsupportedCountry, taxableBase, sortedItems);
        var calculationSource = !context.includeInFiscal()
            ? "OPERATIONAL_NON_FISCAL"
            : genericUnsupportedCountry
                ? "GENERIC_UNSUPPORTED_COUNTRY"
                : "payroll_calculation_engine:" + provider.providerCode();

        var partialResult = new PayrollLineCalculationResult(
            context.salary().baseSalary(),
            context.salary().hourlyRate(),
            context.attendance().paidDays(),
            context.attendance().paidLeaveDays(),
            context.attendance().leaveDays(),
            context.attendance().unpaidAbsenceDays(),
            context.attendance().absenceDays(),
            context.attendance().restDays(),
            context.attendance().missingAttendanceDays(),
            context.attendance().lateCount(),
            context.attendance().regularHours(),
            context.attendance().overtimeHours(),
            taxableBase,
            grossAmount,
            deductionsAmount,
            employerContributionsAmount,
            netAmount,
            totalPayrollCost,
            calculationSource,
            timestamp,
            sortedItems,
            context.attendance().warnings(),
            statutoryCompliance,
            calculationWarnings,
            calculationInputs(context, taxableBase),
            calculationResults(grossAmount, deductionsAmount, employerContributionsAmount, netAmount, totalPayrollCost, statutoryCompliance, calculationWarnings),
            ruleResolver.ruleReferenceSnapshot(sortedItems, context.periodEndDate()),
            Map.of()
        );

        return new PayrollLineCalculationResult(
            partialResult.baseSalaryAmount(),
            partialResult.hourlyRateAmount(),
            partialResult.daysPayable(),
            partialResult.paidLeaveDays(),
            partialResult.leaveDays(),
            partialResult.unpaidAbsenceDays(),
            partialResult.absenceDays(),
            partialResult.restDays(),
            partialResult.missingAttendanceDays(),
            partialResult.lateCount(),
            partialResult.regularHours(),
            partialResult.overtimeHours(),
            partialResult.taxableBase(),
            partialResult.grossAmount(),
            partialResult.deductionsAmount(),
            partialResult.employerContributionsAmount(),
            partialResult.netAmount(),
            partialResult.totalPayrollCost(),
            partialResult.calculationSource(),
            partialResult.calculationTimestamp(),
            partialResult.items(),
            partialResult.attendanceWarnings(),
            partialResult.statutoryCompliance(),
            partialResult.calculationWarnings(),
            partialResult.calculationInputs(),
            partialResult.calculationResults(),
            partialResult.ruleSnapshot(),
            provider.buildAuditBreakdown(context, partialResult)
        );
    }

    private List<PayrollCalculatedLineItem> baseCompensationItems(PayrollCalculationContext context) {
        var items = new ArrayList<PayrollCalculatedLineItem>();
        if ("hourly".equals(context.salary().salaryType())) {
            var baseHourly = context.salary().hourlyRate().multiply(context.attendance().regularHours());
            var overtime = context.salary().hourlyRate()
                .multiply(context.attendance().overtimeHours())
                .multiply(overtimeMultiplier(context.country()));
            var leaveHourly = context.salary().hourlyRate().multiply(context.attendance().paidLeaveDays()).multiply(context.salary().workdayHours());
            addPositive(items, item(context, "BASE_HOURLY", "earning", "Regular hours", baseHourly, "computed", 10, "regular_hours", true));
            addPositive(items, item(context, "OVERTIME", "earning", "Overtime", overtime, "computed", 20, "overtime", true));
            addPositive(items, item(context, "LEAVE_PAY", "earning", "Paid leave", leaveHourly, "computed", 30, "paid_leave", true));
            return items;
        }

        addPositive(items, item(context, "BASE_DAILY", "earning", "Fixed period salary", context.salary().baseSalary(), "computed", 10, "base_salary", true));
        var unpaidDays = context.attendance().unpaidAbsenceDays();
        var prorationDays = context.attendance().controlWorkDays().compareTo(BigDecimal.ZERO) > 0
            ? context.attendance().controlWorkDays()
            : context.attendance().paidDays().add(unpaidDays);
        var deduction = fixedSalaryDeduction(context.salary().baseSalary(), unpaidDays, prorationDays);
        addPositive(items, item(context, "ABSENCE_DEDUCTION", "deduction", "Unpaid attendance deduction", deduction, "computed", 70, "attendance_absence", false));
        return items;
    }

    private PayrollCalculatedLineItem item(
        PayrollCalculationContext context,
        String code,
        String category,
        String label,
        BigDecimal amount,
        String sourceType,
        int displayOrder,
        String legalClassification,
        boolean taxable
    ) {
        var fiscalTaxable = context.includeInFiscal() && taxable;
        return new PayrollCalculatedLineItem(
            code,
            category,
            label,
            money(amount),
            sourceType,
            displayOrder,
            context.country(),
            context.jurisdiction(),
            fiscalTaxable ? "taxable_compensation" : context.includeInFiscal() ? "attendance_adjustment" : "operational_adjustment",
            fiscalTaxable,
            false,
            fiscalTaxable,
            "employer_contribution".equals(category),
            legalClassification,
            "",
            null,
            code + " amount",
            amount,
            null,
            context.currency()
        );
    }

    private PayrollCountryProvider providerFor(String country) {
        return providers.stream()
            .filter((provider) -> !(provider instanceof GenericPayrollProvider))
            .filter((provider) -> provider.supports(country))
            .findFirst()
            .orElseGet(() -> providers.stream()
                .filter(GenericPayrollProvider.class::isInstance)
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("Generic payroll provider is not registered.")));
    }

    private BigDecimal overtimeMultiplier(String country) {
        return "BR".equals(ruleResolver.normalizeCountry(country)) ? BRAZIL_OVERTIME_MULTIPLIER : DEFAULT_OVERTIME_MULTIPLIER;
    }

    private BigDecimal fixedSalaryDeduction(BigDecimal periodSalary, BigDecimal unpaidDays, BigDecimal prorationDays) {
        if (periodSalary == null
            || unpaidDays == null
            || prorationDays == null
            || periodSalary.compareTo(BigDecimal.ZERO) <= 0
            || unpaidDays.compareTo(BigDecimal.ZERO) <= 0
            || prorationDays.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }

        return periodSalary
            .divide(prorationDays, 6, RoundingMode.HALF_UP)
            .multiply(unpaidDays);
    }

    private Map<String, Object> calculationInputs(PayrollCalculationContext context, BigDecimal taxableBase) {
        var body = new LinkedHashMap<String, Object>();
        body.put("companyId", context.companyId());
        body.put("employeeId", context.employeeId());
        body.put("userCompanyId", context.userCompanyId());
        body.put("country", context.country());
        body.put("jurisdiction", context.jurisdiction());
        body.put("currency", context.currency());
        body.put("fxRate", context.fxRate());
        body.put("currencySnapshot", context.currencySnapshot());
        body.put("payrollFrequency", context.payrollFrequency());
        body.put("periodStartDate", context.periodStartDate().toString());
        body.put("periodEndDate", context.periodEndDate().toString());
        body.put("includeInFiscal", context.includeInFiscal());
        body.put("salary", context.salary());
        body.put("attendance", context.attendance());
        body.put("manualAdjustments", context.manualAdjustments());
        body.put("countryProfile", context.countryProfile());
        body.put("fiscalAccumulator", context.fiscalAccumulator());
        body.put("taxableBase", taxableBase);
        return body;
    }

    private Map<String, Object> calculationResults(
        BigDecimal grossAmount,
        BigDecimal deductionsAmount,
        BigDecimal employerContributionsAmount,
        BigDecimal netAmount,
        BigDecimal totalPayrollCost,
        boolean statutoryCompliance,
        List<String> calculationWarnings
    ) {
        var body = new LinkedHashMap<String, Object>();
        body.put("grossAmount", money(grossAmount));
        body.put("deductionsAmount", money(deductionsAmount));
        body.put("employerContributionsAmount", money(employerContributionsAmount));
        body.put("netAmount", money(netAmount));
        body.put("totalPayrollCost", money(totalPayrollCost));
        body.put("statutoryCompliance", statutoryCompliance);
        body.put("warnings", calculationWarnings);
        return body;
    }

    private List<String> calculationWarnings(
        PayrollCalculationContext context,
        PayrollCountryProvider provider,
        boolean genericUnsupportedCountry,
        BigDecimal taxableBase,
        List<PayrollCalculatedLineItem> items
    ) {
        var warnings = new ArrayList<String>();
        if (context.includeInFiscal() && genericUnsupportedCountry) {
            warnings.add("País no soportado por proveedor fiscal. El cálculo es una estimación operativa y no debe tratarse como cumplimiento fiscal.");
        }
        warnings.addAll(context.currencySnapshot().warnings());
        if (context.includeInFiscal()) {
            warnings.addAll(provider.calculationWarnings(context, taxableBase, items));
        }
        return warnings;
    }

    private void addPositive(List<PayrollCalculatedLineItem> items, PayrollCalculatedLineItem item) {
        if (item.amount().compareTo(BigDecimal.ZERO) > 0) {
            items.add(item);
        }
    }

    private BigDecimal sum(List<PayrollCalculatedLineItem> items, String category) {
        return items.stream()
            .filter((item) -> category.equals(item.category()))
            .map(PayrollCalculatedLineItem::amount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private BigDecimal money(BigDecimal value) {
        return (value == null ? BigDecimal.ZERO : value).setScale(2, RoundingMode.HALF_UP);
    }
}
