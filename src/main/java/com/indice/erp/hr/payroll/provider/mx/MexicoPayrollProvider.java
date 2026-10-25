package com.indice.erp.hr.payroll.provider.mx;

import com.indice.erp.hr.payroll.engine.PayrollCalculatedLineItem;
import com.indice.erp.hr.payroll.engine.PayrollCalculationContext;
import com.indice.erp.hr.payroll.engine.PayrollRuleResolver;
import com.indice.erp.hr.payroll.provider.AbstractPayrollCountryProvider;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class MexicoPayrollProvider extends AbstractPayrollCountryProvider {

    private static final List<String> SOCIAL_PARAMETERS = List.of(
        "sdi_min_factor", "employee_excess_over_3_uma_rate", "employee_fixed_period_rate",
        "employee_pensioners_rate", "employer_fixed_uma_rate", "employer_excess_over_3_uma_rate",
        "employer_cash_benefits_rate", "employer_risk_premium_rate", "employer_sar_rate",
        "employer_infonavit_rate", "employer_childcare_rate", "employer_state_payroll_tax_rate"
    );

    public MexicoPayrollProvider(PayrollRuleResolver ruleResolver) {
        super(ruleResolver);
    }

    @Override
    public String providerCode() {
        return "mx";
    }

    @Override
    public boolean supports(String countryCode) {
        return "MX".equals(ruleResolver.normalizeCountry(countryCode));
    }

    @Override
    public List<PayrollCalculatedLineItem> calculateLine(PayrollCalculationContext context, BigDecimal taxableBase) {
        var items = new ArrayList<PayrollCalculatedLineItem>();
        var periodEndDate = context.periodEndDate();
        var profile = MexicoPayrollInputs.profile(context);
        var periodBaseDays = resolvePayPeriodBaseDays(context.payrollFrequency(), context.periodStartDate(), periodEndDate);
        var periodToMonthlyFactor = periodBaseDays.divide(new BigDecimal("30.4"), 8, RoundingMode.HALF_UP);
        // Published limits are in cents. A fractional cent must not fall between two brackets.
        var monthlyTaxableBase = taxableBase.divide(periodToMonthlyFactor, 2, RoundingMode.HALF_UP);
        var isrRule = requireRule("ISR_MONTHLY", periodEndDate);
        var socialRule = requireRule("SOCIAL_SECURITY", periodEndDate);
        var rcvRule = requireRule("RCV_EMPLOYER", periodEndDate);
        var socialParams = ruleResolver.parametersByCode("MX", "", "SOCIAL_SECURITY", periodEndDate);
        for (var key : SOCIAL_PARAMETERS) {
            var parameter = requireParameter(socialParams, key, "SOCIAL_SECURITY", periodEndDate);
            if (parameter.signum() < 0
                || ("sdi_min_factor".equals(key) && parameter.compareTo(BigDecimal.ONE) < 0)
                || (!"sdi_min_factor".equals(key) && parameter.compareTo(BigDecimal.ONE) > 0)) {
                throw invalidRule("SOCIAL_SECURITY", periodEndDate);
            }
        }

        var isrAmount = calculateMonthlyIsr(monthlyTaxableBase, periodEndDate).multiply(periodToMonthlyFactor);
        var dailySalary = taxableBase.divide(periodBaseDays, 8, RoundingMode.HALF_UP);
        var umaDaily = resolveUmaDaily(periodEndDate);
        var minimumWage = profile == null ? umaDaily : minimumWage(profile, periodEndDate);
        var integratedDailySalary = profile == null ? dailySalary.multiply(socialParams.get("sdi_min_factor")) : profile.contributionDailySalary();
        var contributionDailyBase = integratedDailySalary.max(minimumWage).min(umaDaily.multiply(new BigDecimal("25")));
        var contributionDays = profile == null ? periodBaseDays : BigDecimal.valueOf(ChronoUnit.DAYS.between(context.periodStartDate(), periodEndDate) + 1);
        var contributionPeriodBase = contributionDailyBase.multiply(contributionDays);
        var excessOverThreeUma = contributionDailyBase.subtract(umaDaily.multiply(new BigDecimal("3"))).max(BigDecimal.ZERO).multiply(contributionDays);

        var employeeImss = excessOverThreeUma.multiply(socialParams.get("employee_excess_over_3_uma_rate"))
            .add(contributionPeriodBase.multiply(socialParams.get("employee_fixed_period_rate")))
            .add(contributionPeriodBase.multiply(socialParams.get("employee_pensioners_rate")));
        var employerImss = umaDaily.multiply(socialParams.get("employer_fixed_uma_rate")).multiply(contributionDays)
            .add(excessOverThreeUma.multiply(socialParams.get("employer_excess_over_3_uma_rate")))
            .add(contributionPeriodBase.multiply(socialParams.get("employer_cash_benefits_rate")));
        var riskRate = profile == null ? socialParams.get("employer_risk_premium_rate") : profile.riskPremiumPercent().movePointLeft(2);
        var employerRisk = contributionPeriodBase.multiply(riskRate);
        var employerRcv = contributionPeriodBase.multiply(profile != null && contributionDailyBase.compareTo(minimumWage) <= 0
            ? new BigDecimal("0.0315") : resolveRcvEmployerRate(contributionDailyBase, umaDaily, periodEndDate));
        var employerSar = contributionPeriodBase.multiply(socialParams.get("employer_sar_rate"));
        var employerInfonavit = contributionPeriodBase.multiply(socialParams.get("employer_infonavit_rate"));
        var employerChildcare = contributionPeriodBase.multiply(socialParams.get("employer_childcare_rate"));
        var stateRate = profile == null ? socialParams.get("employer_state_payroll_tax_rate") : profile.statePayrollTaxPercent().movePointLeft(2);
        var employerStatePayrollTax = taxableBase.multiply(stateRate);
        if (profile != null && profile.dailySalary().compareTo(minimumWage) <= 0) {
            // LSS art. 36: the employer absorbs the worker's quota; it is not forgiven.
            employerImss = employerImss.add(employeeImss);
            employeeImss = BigDecimal.ZERO;
            if (context.manualAdjustments().isEmpty() && context.attendance().overtimeHours().signum() == 0
                && taxableBase.compareTo(minimumWage.multiply(periodBaseDays).add(new BigDecimal("0.10"))) <= 0)
                isrAmount = BigDecimal.ZERO;
        }
        if (profile != null) employeeImss = employeeImss.min(taxableBase.subtract(money(isrAmount)).max(BigDecimal.ZERO));

        addItem(items, context, "ISR", "deduction", "ISR", isrAmount, 80, "income_tax", "Impuesto Sobre la Renta", "ISR_MONTHLY", isrRule, "ISR mensual prorateado", monthlyTaxableBase, null);
        addItem(items, context, "IMSS_EMP", "deduction", "IMSS trabajador", employeeImss, 90, "social_security", "Cuotas obrero IMSS", "SOCIAL_SECURITY", socialRule, "SBC periodo * cuotas obreras", contributionPeriodBase, null);
        addItem(items, context, "EMPLOYER_IMSS", "employer_contribution", "IMSS patrón", employerImss, 110, "employer_social_security", "Cuotas patronales IMSS", "SOCIAL_SECURITY", socialRule, "SBC periodo * cuotas patronales", contributionPeriodBase, null);
        addItem(items, context, "EMPLOYER_RISK", "employer_contribution", "Riesgo de trabajo", employerRisk, 112, "employer_social_security", "Riesgo de trabajo", "SOCIAL_SECURITY", socialRule, "SBC periodo * prima de riesgo", contributionPeriodBase, riskRate);
        addItem(items, context, "EMPLOYER_RCV", "employer_contribution", "Cesantía y vejez", employerRcv, 114, "employer_social_security", "Cesantía y vejez", "RCV_EMPLOYER", rcvRule, "SBC periodo * tarifa RCV", contributionPeriodBase, null);
        addItem(items, context, "EMPLOYER_SAR", "employer_contribution", "SAR retiro", employerSar, 116, "employer_retirement", "SAR", "SOCIAL_SECURITY", socialRule, "SBC periodo * SAR", contributionPeriodBase, socialParams.get("employer_sar_rate"));
        addItem(items, context, "EMPLOYER_INFONAVIT", "employer_contribution", "INFONAVIT patrón", employerInfonavit, 120, "employer_housing", "INFONAVIT", "SOCIAL_SECURITY", socialRule, "SBC periodo * INFONAVIT", contributionPeriodBase, socialParams.get("employer_infonavit_rate"));
        addItem(items, context, "EMPLOYER_CHILDCARE", "employer_contribution", "Guarderías IMSS", employerChildcare, 122, "employer_social_security", "Guarderías y prestaciones sociales", "SOCIAL_SECURITY", socialRule, "SBC periodo * guarderías", contributionPeriodBase, socialParams.get("employer_childcare_rate"));
        addItem(items, context, "EMPLOYER_ISN", "employer_contribution", "ISN estatal", employerStatePayrollTax, 124, "state_payroll_tax", "Impuesto sobre nómina",
            profile == null ? "SOCIAL_SECURITY" : "EMPLOYER_CONFIGURED_ISN", profile == null ? socialRule : null,
            profile == null ? "percepción gravada * tasa ISN" : "Remuneración ordinaria * tasa documentada: " + profile.statePayrollTaxReference(), taxableBase, stateRate);
        return items;
    }

    public void completeDeductions(PayrollCalculationContext context, List<PayrollCalculatedLineItem> items) {
        var profile = MexicoPayrollInputs.profile(context);
        if (profile == null || !profile.infonavit().enabled() || profile.infonavit().legacyPercentageCredit()) return;
        if (items.stream().anyMatch(item -> item.code().startsWith("INFONAVIT") && !"computed_tax".equals(item.sourceType())))
            throw new IllegalArgumentException("El descuento INFONAVIT se calcula desde el aviso vigente; retira el ajuste duplicado.");
        var gross = items.stream().filter(item -> "earning".equals(item.category())).map(PayrollCalculatedLineItem::amount).reduce(BigDecimal.ZERO, BigDecimal::add);
        var deductions = items.stream().filter(item -> "deduction".equals(item.category())).map(PayrollCalculatedLineItem::amount).reduce(BigDecimal.ZERO, BigDecimal::add);
        var absences = items.stream().filter(item -> "ABSENCE_DEDUCTION".equals(item.code())).map(PayrollCalculatedLineItem::amount).reduce(BigDecimal.ZERO, BigDecimal::add);
        var rule = profile.infonavit().mode() == MexicoPayrollProfile.CreditMode.UMI_FACTOR ? requireRule("INFONAVIT_UMI", context.periodEndDate()) : null;
        var umi = rule == null ? BigDecimal.ZERO : requireParameter(ruleResolver.parameters(rule.id()), "daily_value", "INFONAVIT_UMI", context.periodEndDate());
        var credit = MexicoHousingCreditCalculator.calculate(profile, context.periodStartDate(), context.periodEndDate(), umi,
            minimumWage(profile, context.periodEndDate()), gross.subtract(absences), gross.subtract(deductions));
        // Retain zero-withheld rows too: the nominal amount is evidence, not a new debt.
        if (credit.scheduled().signum() > 0) items.add(new PayrollCalculatedLineItem("INFONAVIT_CREDIT", "deduction", "Crédito INFONAVIT",
            credit.withheld(), "computed_tax", 95, "MX", context.jurisdiction(), "housing_credit", false, false, false, false,
            "LFT 97/110; LINFONAVIT 29; aviso de retención", "INFONAVIT_UMI", rule == null ? null : rule.id(),
            "Aviso vigente; límite por salario disponible. Seguro al cierre bimestral o fin del aviso.", credit.scheduled(), null, context.currency()));
    }

    private BigDecimal minimumWage(MexicoPayrollProfile profile, LocalDate date) {
        requireRule("MINIMUM_WAGE", date);
        return requireParameter(ruleResolver.parametersByCode("MX", "", "MINIMUM_WAGE", date),
            profile.minimumWageZone() == MexicoPayrollProfile.MinimumWageZone.NORTHERN_BORDER ? "border_daily" : "general_daily", "MINIMUM_WAGE", date);
    }

    public List<String> approvalIssues(PayrollCalculationContext context, BigDecimal taxableBase) {
        var profile = MexicoPayrollInputs.profile(context);
        var issues = new ArrayList<String>();
        if (profile == null) return List.of("México: completa el perfil fiscal del colaborador (SBC, registro patronal, riesgo, ISN e INFONAVIT) y recalcula.");
        var metadata = context.countryProfile().metadata();
        if (!"MXN".equals(context.currency())) issues.add("México: el cálculo fiscal requiere importes en MXN y un tipo de cambio documentado.");
        if ((metadata.get("mexicoEmploymentStart") instanceof String start && LocalDate.parse(start).isAfter(context.periodStartDate()))
            || (metadata.get("mexicoEmploymentEnd") instanceof String end && LocalDate.parse(end).isBefore(context.periodEndDate())))
            issues.add("México: el periodo incluye un alta o baja; requiere prorrateo y conciliación de días de aseguramiento antes de aprobar.");
        if (Boolean.TRUE.equals(context.countryProfile().metadata().get("mexicoProfileChangesWithinPeriod")))
            issues.add("México: el periodo cruza un cambio de perfil fiscal; requiere separar los cálculos por vigencia.");
        var minimum = minimumWage(profile, context.periodEndDate());
        if (profile.dailySalary().compareTo(minimum) < 0 || profile.contributionDailySalary().compareTo(minimum) < 0
            || profile.contributionDailySalary().compareTo(resolveUmaDaily(context.periodEndDate()).multiply(new BigDecimal("25"))) > 0)
            issues.add("México: revisa el salario diario y los límites del SBC registrado.");
        if (profile.salaryBasis() == MexicoPayrollProfile.SalaryBasis.FIXED
            && profile.contributionDailySalary().compareTo(profile.dailySalary()) < 0)
            issues.add("México: el SBC fijo registrado es menor al salario diario contractual; verifica la integración.");
        var salaryDays = "monthly".equals(context.payrollFrequency()) ? new BigDecimal("30")
            : resolvePayPeriodBaseDays(context.payrollFrequency(), context.periodStartDate(), context.periodEndDate());
        if ("daily".equals(context.salary().salaryType())
            && profile.dailySalary().multiply(salaryDays).subtract(context.salary().baseSalary()).abs().compareTo(new BigDecimal("0.35")) > 0)
            issues.add("México: el salario diario contractual no concuerda con el sueldo del periodo. Revisa la ficha y vuelve a generar la corrida si cambió el sueldo.");
        if (!context.periodStartDate().withDayOfMonth(1).equals(context.periodEndDate().withDayOfMonth(1))
            && (context.periodStartDate().getYear() != context.periodEndDate().getYear() || context.periodEndDate().getMonthValue() == 2))
            issues.add("México: el periodo cruza una actualización anual de parámetros; requiere separar las vigencias.");
        if (context.attendance().unpaidAbsenceDays().signum() > 0 || context.attendance().leaveDays().signum() > 0)
            issues.add("México: resuelve las cuotas por ausencias o incapacidades antes de aprobar; el descuento salarial automático se conserva.");
        if (context.attendance().overtimeHours().signum() > 0 || !context.manualAdjustments().isEmpty())
            issues.add("México: horas extra y conceptos adicionales requieren desglosar bases gravadas, exentas y de seguridad social antes de aprobar.");
        if ("hourly".equals(context.salary().salaryType()))
            issues.add("México: el pago por hora requiere conciliar el descanso remunerado proporcional antes de aprobar.");
        if (context.attendance().records().stream().anyMatch(MexicoLaborCalendar::requiresPremiumReview))
            issues.add("México: hay trabajo en domingo, descanso o festivo. Faltan las primas y sus bases exentas; esta corrida requiere conciliación antes de aprobar.");
        var factor = resolvePayPeriodBaseDays(context.payrollFrequency(), context.periodStartDate(), context.periodEndDate()).divide(new BigDecimal("30.4"), 8, RoundingMode.HALF_UP);
        if (taxableBase.divide(factor, 2, RoundingMode.HALF_UP).compareTo(new BigDecimal("11492.66")) <= 0)
            issues.add("México: falta conciliar el subsidio y los ingresos del mes de pago; esta estimación no puede aprobarse todavía.");
        if (profile.infonavit().enabled() && profile.infonavit().legacyPercentageCredit())
            issues.add("INFONAVIT: valida el beneficio del crédito anterior a 1998 con el SBC al inicio del bimestre.");
        return List.copyOf(issues);
    }

    private BigDecimal calculateMonthlyIsr(BigDecimal monthlyTaxableBase, LocalDate periodEndDate) {
        var brackets = ruleResolver.bracketsByCode("MX", "", "ISR_MONTHLY", periodEndDate);
        if (brackets.isEmpty()) {
            throw invalidRule("ISR_MONTHLY", periodEndDate);
        }
        if (monthlyTaxableBase.signum() == 0) {
            return BigDecimal.ZERO;
        }
        var bracket = brackets.stream()
            .filter((candidate) -> monthlyTaxableBase.compareTo(candidate.lowerLimit()) >= 0)
            .filter((candidate) -> candidate.upperLimit() == null || monthlyTaxableBase.compareTo(candidate.upperLimit()) <= 0)
            .findFirst()
            .orElseThrow(() -> invalidRule("ISR_MONTHLY", periodEndDate));
        return bracket.fixedAmount()
            .add(monthlyTaxableBase.subtract(bracket.lowerLimit()).multiply(bracket.rate()))
            .max(BigDecimal.ZERO);
    }

    private BigDecimal resolvePayPeriodBaseDays(String payPeriod, LocalDate startDate, LocalDate endDate) {
        return switch (safe(payPeriod)) {
            case "weekly" -> new BigDecimal("7");
            case "biweekly" -> new BigDecimal("14");
            case "semimonthly", "quincenal" -> new BigDecimal("15");
            case "monthly" -> new BigDecimal("30.4");
            default -> BigDecimal.valueOf(Math.max(1, ChronoUnit.DAYS.between(startDate, endDate) + 1));
        };
    }

    private BigDecimal resolveUmaDaily(LocalDate periodEndDate) {
        requireRule("UMA", periodEndDate);
        var params = ruleResolver.parametersByCode("MX", "", "UMA", periodEndDate);
        var value = requireParameter(params, "daily_value", "UMA", periodEndDate);
        if (value.signum() <= 0) {
            throw invalidRule("UMA", periodEndDate);
        }
        return value;
    }

    private BigDecimal resolveRcvEmployerRate(BigDecimal contributionDailyBase, BigDecimal umaDaily, LocalDate periodEndDate) {
        var umaMultiple = contributionDailyBase.divide(umaDaily, 6, RoundingMode.HALF_UP);
        var brackets = ruleResolver.bracketsByCode("MX", "", "RCV_EMPLOYER", periodEndDate);
        return brackets.stream()
            .filter((candidate) -> umaMultiple.compareTo(candidate.lowerLimit()) >= 0)
            .filter((candidate) -> candidate.upperLimit() == null || umaMultiple.compareTo(candidate.upperLimit()) <= 0)
            .map(PayrollRuleResolver.RuleBracket::rate)
            .findFirst()
            .orElseThrow(() -> invalidRule("RCV_EMPLOYER", periodEndDate));
    }

    private PayrollRuleResolver.RuleSet requireRule(String code, LocalDate date) {
        var rule = ruleResolver.resolveRuleSet("MX", "", code, date);
        if (rule == null) {
            throw invalidRule(code, date);
        }
        return rule;
    }

    private BigDecimal requireParameter(Map<String, BigDecimal> parameters, String key, String code, LocalDate date) {
        var value = parameters.get(key);
        if (value == null) {
            throw invalidRule(code, date);
        }
        return value;
    }

    private IllegalArgumentException invalidRule(String code, LocalDate date) {
        return new IllegalArgumentException("No se puede calcular la nómina fiscal de México: falta o está incompleta la regla "
            + code + " vigente al " + date + ". Actualiza las tablas fiscales y vuelve a calcular.");
    }

    @Override
    public List<String> calculationWarnings(PayrollCalculationContext context, BigDecimal taxableBase,
                                            List<PayrollCalculatedLineItem> items) {
        var warnings = new ArrayList<>(approvalIssues(context, taxableBase));
        for (var item : items) if ("INFONAVIT_CREDIT".equals(item.code()) && item.calculationBase().compareTo(item.amount()) > 0)
            warnings.add("INFONAVIT: no se retuvieron " + money(item.calculationBase().subtract(item.amount()))
                + " MXN por el límite salarial. No se creó una deuda ni un descuento para otro periodo.");
        return warnings;
    }
}
