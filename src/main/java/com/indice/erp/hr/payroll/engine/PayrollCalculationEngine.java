package com.indice.erp.hr.payroll.engine;

import com.indice.erp.hr.payroll.provider.generic.GenericPayrollProvider;
import com.indice.erp.hr.payroll.provider.mx.MexicoPayrollProvider;
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

        // The current providers accept one common compensation base. Do not silently tax an
        // exempt earning or treat an excluded benefit as social-security salary.
        if (context.includeInFiscal() && items.stream().anyMatch(item -> "earning".equals(item.category())
            && item.amount().signum() > 0 && (!item.taxable() || !item.affectsSocialSecurity()))) {
            throw new IllegalArgumentException("La nómina fiscal contiene una percepción exenta o con una base de seguridad social distinta. "
                + "Este tratamiento requiere cálculo fiscal especializado; no se calculará como una percepción totalmente gravada.");
        }

        var earningTotal = sum(items, "earning");
        var attendanceReductionTotal = items.stream()
            .filter((item) -> "deduction".equals(item.category()) && "ABSENCE_DEDUCTION".equals(item.code()))
            .map(PayrollCalculatedLineItem::amount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        var taxableBase = context.includeInFiscal()
            ? earningTotal.subtract(attendanceReductionTotal).max(BigDecimal.ZERO)
            : BigDecimal.ZERO;

        var provider = providerFor(context.country());
        if (context.includeInFiscal() && (taxableBase.compareTo(BigDecimal.ZERO) > 0
            || (provider instanceof MexicoPayrollProvider && com.indice.erp.hr.payroll.provider.mx.MexicoPayrollInputs.profile(context) != null))) {
            items.addAll(provider.calculateLine(context, taxableBase));
            if (provider instanceof MexicoPayrollProvider mexico) mexico.completeDeductions(context, items);
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
        var mexicoReviewRequired = context.includeInFiscal() && provider instanceof MexicoPayrollProvider mexico
            && !mexico.approvalIssues(context, taxableBase).isEmpty();
        var statutoryCompliance = context.includeInFiscal() && !genericUnsupportedCountry && !mexicoReviewRequired;
        var calculationWarnings = calculationWarnings(context, provider, genericUnsupportedCountry, taxableBase, sortedItems);
        var calculationSource = !context.includeInFiscal()
            ? "OPERATIONAL_NON_FISCAL"
            : genericUnsupportedCountry
                ? "GENERIC_UNSUPPORTED_COUNTRY"
                : mexicoReviewRequired ? "MX_REVIEW_REQUIRED" : "payroll_calculation_engine:" + provider.providerCode();

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

    /** Retains the reviewed salary/attendance inputs without creating a payment or fiscal liability. */
    public PayrollLineCalculationResult calculateExcludedLine(PayrollCalculationContext context) {
        if (context.includeInFiscal()) {
            throw new IllegalArgumentException("Una línea sin nómina no puede incluirse en el cálculo fiscal.");
        }
        if (context.manualAdjustments().stream().anyMatch(item -> item.amount().signum() != 0)) {
            throw new IllegalArgumentException("Una línea sin nómina no admite ajustes ni incentivos. "
                + "Retíralos antes de excluirla o cambia su tratamiento de nómina.");
        }
        var zero = BigDecimal.ZERO;
        var warning = List.of("Línea sin nómina: no genera percepciones, descuentos, impuestos ni pagos.");
        var inputs = calculationInputs(context, zero);
        inputs.put("payrollTreatment", "no_payroll");
        return new PayrollLineCalculationResult(
            context.salary().baseSalary(), context.salary().hourlyRate(),
            context.attendance().paidDays(), context.attendance().paidLeaveDays(), context.attendance().leaveDays(),
            context.attendance().unpaidAbsenceDays(), context.attendance().absenceDays(), context.attendance().restDays(),
            context.attendance().missingAttendanceDays(), context.attendance().lateCount(),
            context.attendance().regularHours(), context.attendance().overtimeHours(),
            zero, zero, zero, zero, zero, zero, "EXCLUDED_NO_PAYROLL", LocalDateTime.now(), List.of(),
            context.attendance().warnings(), false, warning, inputs,
            calculationResults(zero, zero, zero, zero, zero, false, warning), Map.of(),
            Map.of("payrollTreatment", "no_payroll", "excluded", true)
        );
    }

    private List<PayrollCalculatedLineItem> baseCompensationItems(PayrollCalculationContext context) {
        var items = new ArrayList<PayrollCalculatedLineItem>();
        if ("hourly".equals(context.salary().salaryType())) {
            // Attendance includes paid leave in regularHours. Split its presentation, not its pay.
            var leaveHours = paidLeaveHours(context);
            var baseHourly = context.salary().hourlyRate().multiply(context.attendance().regularHours().subtract(leaveHours));
            var overtime = context.salary().hourlyRate()
                .multiply(context.attendance().overtimeHours())
                .multiply(overtimeMultiplier(context.country()));
            var leaveHourly = context.salary().hourlyRate().multiply(leaveHours);
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

    private BigDecimal paidLeaveHours(PayrollCalculationContext context) {
        var hours = BigDecimal.ZERO;
        var days = BigDecimal.ZERO;
        for (var record : context.attendance().records()) {
            if (!"leave".equals(record.get("status"))) {
                continue;
            }
            var treatment = record.get("leavePayrollTreatment");
            if ("unpaid".equals(treatment)
                || (!"paid".equals(treatment) && !context.preferences().payLeaveDays())) {
                continue;
            }
            var expected = record.get("expectedHours");
            var dailyHours = expected instanceof Number number
                ? new BigDecimal(number.toString()) : context.salary().workdayHours();
            hours = hours.add(dailyHours.signum() > 0 ? dailyHours : context.salary().workdayHours());
            days = days.add(BigDecimal.ONE);
        }
        if (days.compareTo(context.attendance().paidLeaveDays()) != 0) {
            // Older snapshots may not retain daily records. Never add leave over the paid total.
            hours = context.attendance().paidLeaveDays().multiply(context.salary().workdayHours());
        }
        return hours.max(BigDecimal.ZERO).min(context.attendance().regularHours().max(BigDecimal.ZERO));
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
        var uncappedDeduction = uncappedFixedSalaryDeduction(periodSalary, unpaidDays, prorationDays);
        if (periodSalary == null || periodSalary.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }
        return uncappedDeduction.min(periodSalary);
    }

    private BigDecimal uncappedFixedSalaryDeduction(BigDecimal periodSalary, BigDecimal unpaidDays, BigDecimal prorationDays) {
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

    private boolean attendanceDeductionWasCapped(PayrollCalculationContext context) {
        if ("hourly".equals(context.salary().salaryType())) {
            return false;
        }
        var baseSalary = context.salary().baseSalary();
        if (baseSalary == null || baseSalary.compareTo(BigDecimal.ZERO) <= 0) {
            return false;
        }
        var unpaidDays = context.attendance().unpaidAbsenceDays();
        var prorationDays = context.attendance().controlWorkDays().compareTo(BigDecimal.ZERO) > 0
            ? context.attendance().controlWorkDays()
            : context.attendance().paidDays().add(unpaidDays);
        return uncappedFixedSalaryDeduction(baseSalary, unpaidDays, prorationDays)
            .compareTo(baseSalary) > 0;
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
        if (attendanceDeductionWasCapped(context)) {
            warnings.add("El descuento automático por faltas excedía el salario fijo del periodo y se limitó para evitar un neto negativo.");
        }
        warnings.addAll(context.currencySnapshot().warnings());
        if (context.includeInFiscal()) {
            warnings.addAll(provider.calculationWarnings(context, taxableBase, items));
            if (context.attendance().overtimeHours().signum() > 0) {
                warnings.add("Revisa las horas extra: los recargos y las exenciones requieren validación según el país y la jornada del colaborador.");
            }
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
