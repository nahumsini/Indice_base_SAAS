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
import org.springframework.stereotype.Service;

@Service
public class MexicoPayrollProvider extends AbstractPayrollCountryProvider {

    private static final BigDecimal UMA_2025_DAILY = new BigDecimal("113.14");
    private static final BigDecimal UMA_2026_DAILY = new BigDecimal("117.31");
    private static final BigDecimal SDI_LEGAL_MIN_FACTOR = BigDecimal.ONE
        .add(new BigDecimal("15").divide(new BigDecimal("365"), 8, RoundingMode.HALF_UP))
        .add(new BigDecimal("12").multiply(new BigDecimal("0.25")).divide(new BigDecimal("365"), 8, RoundingMode.HALF_UP));

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
        var periodBaseDays = resolvePayPeriodBaseDays(context.payrollFrequency(), context.periodStartDate(), periodEndDate);
        var periodToMonthlyFactor = periodBaseDays.divide(new BigDecimal("30.4"), 8, RoundingMode.HALF_UP);
        var monthlyTaxableBase = taxableBase.divide(periodToMonthlyFactor, 8, RoundingMode.HALF_UP);
        var isrRule = ruleResolver.resolveRuleSet("MX", "", "ISR_MONTHLY", periodEndDate);
        var socialRule = ruleResolver.resolveRuleSet("MX", "", "SOCIAL_SECURITY", periodEndDate);
        var rcvRule = ruleResolver.resolveRuleSet("MX", "", "RCV_EMPLOYER", periodEndDate);
        var socialParams = ruleResolver.parametersByCode("MX", "", "SOCIAL_SECURITY", periodEndDate);

        var isrAmount = calculateMonthlyIsr(monthlyTaxableBase, periodEndDate).multiply(periodToMonthlyFactor);
        var dailySalary = taxableBase.divide(periodBaseDays, 8, RoundingMode.HALF_UP);
        var umaDaily = resolveUmaDaily(periodEndDate);
        var integratedDailySalary = dailySalary.multiply(decimalParam(socialParams, "sdi_min_factor", SDI_LEGAL_MIN_FACTOR));
        var contributionDailyBase = integratedDailySalary.max(umaDaily).min(umaDaily.multiply(new BigDecimal("25")));
        var contributionPeriodBase = contributionDailyBase.multiply(periodBaseDays);
        var excessOverThreeUma = contributionDailyBase.subtract(umaDaily.multiply(new BigDecimal("3"))).max(BigDecimal.ZERO).multiply(periodBaseDays);

        var employeeImss = excessOverThreeUma.multiply(decimalParam(socialParams, "employee_excess_over_3_uma_rate", new BigDecimal("0.004")))
            .add(contributionPeriodBase.multiply(decimalParam(socialParams, "employee_fixed_period_rate", new BigDecimal("0.00625"))))
            .add(contributionPeriodBase.multiply(decimalParam(socialParams, "employee_pensioners_rate", new BigDecimal("0.01125"))));
        var employerImss = umaDaily.multiply(decimalParam(socialParams, "employer_fixed_uma_rate", new BigDecimal("0.204"))).multiply(periodBaseDays)
            .add(excessOverThreeUma.multiply(decimalParam(socialParams, "employer_excess_over_3_uma_rate", new BigDecimal("0.011"))))
            .add(contributionPeriodBase.multiply(decimalParam(socialParams, "employer_cash_benefits_rate", new BigDecimal("0.0175"))));
        var employerRisk = contributionPeriodBase.multiply(decimalParam(socialParams, "employer_risk_premium_rate", new BigDecimal("0.01")));
        var employerRcv = contributionPeriodBase.multiply(resolveRcvEmployerRate(contributionDailyBase, umaDaily, periodEndDate));
        var employerSar = contributionPeriodBase.multiply(decimalParam(socialParams, "employer_sar_rate", new BigDecimal("0.02")));
        var employerInfonavit = contributionPeriodBase.multiply(decimalParam(socialParams, "employer_infonavit_rate", new BigDecimal("0.05")));
        var employerChildcare = contributionPeriodBase.multiply(decimalParam(socialParams, "employer_childcare_rate", new BigDecimal("0.01")));
        var employerStatePayrollTax = taxableBase.multiply(decimalParam(socialParams, "employer_state_payroll_tax_rate", new BigDecimal("0.03")));

        addItem(items, context, "ISR", "deduction", "ISR", isrAmount, 80, "income_tax", "Impuesto Sobre la Renta", "ISR_MONTHLY", isrRule, "ISR mensual prorateado", monthlyTaxableBase, null);
        addItem(items, context, "IMSS_EMP", "deduction", "IMSS trabajador", employeeImss, 90, "social_security", "Cuotas obrero IMSS", "SOCIAL_SECURITY", socialRule, "SBC periodo * cuotas obreras", contributionPeriodBase, null);
        addItem(items, context, "EMPLOYER_IMSS", "employer_contribution", "IMSS patrón", employerImss, 110, "employer_social_security", "Cuotas patronales IMSS", "SOCIAL_SECURITY", socialRule, "SBC periodo * cuotas patronales", contributionPeriodBase, null);
        addItem(items, context, "EMPLOYER_RISK", "employer_contribution", "Riesgo de trabajo", employerRisk, 112, "employer_social_security", "Riesgo de trabajo", "SOCIAL_SECURITY", socialRule, "SBC periodo * prima de riesgo", contributionPeriodBase, decimalParam(socialParams, "employer_risk_premium_rate", new BigDecimal("0.01")));
        addItem(items, context, "EMPLOYER_RCV", "employer_contribution", "Cesantía y vejez", employerRcv, 114, "employer_social_security", "Cesantía y vejez", "RCV_EMPLOYER", rcvRule, "SBC periodo * tarifa RCV", contributionPeriodBase, null);
        addItem(items, context, "EMPLOYER_SAR", "employer_contribution", "SAR retiro", employerSar, 116, "employer_retirement", "SAR", "SOCIAL_SECURITY", socialRule, "SBC periodo * SAR", contributionPeriodBase, decimalParam(socialParams, "employer_sar_rate", new BigDecimal("0.02")));
        addItem(items, context, "EMPLOYER_INFONAVIT", "employer_contribution", "INFONAVIT patrón", employerInfonavit, 120, "employer_housing", "INFONAVIT", "SOCIAL_SECURITY", socialRule, "SBC periodo * INFONAVIT", contributionPeriodBase, decimalParam(socialParams, "employer_infonavit_rate", new BigDecimal("0.05")));
        addItem(items, context, "EMPLOYER_CHILDCARE", "employer_contribution", "Guarderías IMSS", employerChildcare, 122, "employer_social_security", "Guarderías y prestaciones sociales", "SOCIAL_SECURITY", socialRule, "SBC periodo * guarderías", contributionPeriodBase, decimalParam(socialParams, "employer_childcare_rate", new BigDecimal("0.01")));
        addItem(items, context, "EMPLOYER_ISN", "employer_contribution", "ISN estatal", employerStatePayrollTax, 124, "state_payroll_tax", "Impuesto sobre nómina", "SOCIAL_SECURITY", socialRule, "percepción gravada * tasa ISN", taxableBase, decimalParam(socialParams, "employer_state_payroll_tax_rate", new BigDecimal("0.03")));
        return items;
    }

    private BigDecimal calculateMonthlyIsr(BigDecimal monthlyTaxableBase, LocalDate periodEndDate) {
        var brackets = ruleResolver.bracketsByCode("MX", "", "ISR_MONTHLY", periodEndDate);
        if (brackets.isEmpty()) {
            return BigDecimal.ZERO;
        }
        var bracket = brackets.stream()
            .filter((candidate) -> monthlyTaxableBase.compareTo(candidate.lowerLimit()) >= 0)
            .filter((candidate) -> candidate.upperLimit() == null || monthlyTaxableBase.compareTo(candidate.upperLimit()) <= 0)
            .findFirst()
            .orElse(brackets.getLast());
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
        var params = ruleResolver.parametersByCode("MX", "", "UMA", periodEndDate);
        var value = params.get("daily_value");
        if (value != null && value.compareTo(BigDecimal.ZERO) > 0) {
            return value;
        }
        if (periodEndDate != null && periodEndDate.isBefore(LocalDate.of(2026, 2, 1))) {
            return UMA_2025_DAILY;
        }
        return UMA_2026_DAILY;
    }

    private BigDecimal resolveRcvEmployerRate(BigDecimal contributionDailyBase, BigDecimal umaDaily, LocalDate periodEndDate) {
        var umaMultiple = contributionDailyBase.divide(umaDaily, 6, RoundingMode.HALF_UP);
        var brackets = ruleResolver.bracketsByCode("MX", "", "RCV_EMPLOYER", periodEndDate);
        return brackets.stream()
            .filter((candidate) -> umaMultiple.compareTo(candidate.lowerLimit()) >= 0)
            .filter((candidate) -> candidate.upperLimit() == null || umaMultiple.compareTo(candidate.upperLimit()) <= 0)
            .map(PayrollRuleResolver.RuleBracket::rate)
            .findFirst()
            .orElse(new BigDecimal("0.07513"));
    }
}
