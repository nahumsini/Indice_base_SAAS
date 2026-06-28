package com.indice.erp.hr.payroll.provider;

import com.indice.erp.hr.payroll.engine.PayrollCalculatedLineItem;
import com.indice.erp.hr.payroll.engine.PayrollCalculationContext;
import com.indice.erp.hr.payroll.engine.PayrollCountryProvider;
import com.indice.erp.hr.payroll.engine.PayrollRuleResolver;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Locale;

public abstract class AbstractPayrollCountryProvider implements PayrollCountryProvider {

    protected static final BigDecimal ZERO = BigDecimal.ZERO;

    protected final PayrollRuleResolver ruleResolver;

    protected AbstractPayrollCountryProvider(PayrollRuleResolver ruleResolver) {
        this.ruleResolver = ruleResolver;
    }

    protected void addItem(
        List<PayrollCalculatedLineItem> items,
        PayrollCalculationContext context,
        String code,
        String category,
        String label,
        BigDecimal amount,
        int order,
        String taxTreatment,
        String legalClassification,
        String ruleCode,
        PayrollRuleResolver.RuleSet ruleSet,
        String formula,
        BigDecimal base,
        BigDecimal rate
    ) {
        var scaledAmount = money(amount);
        if (scaledAmount.compareTo(BigDecimal.ZERO) <= 0) {
            return;
        }
        var normalizedTaxTreatment = safe(taxTreatment);
        items.add(new PayrollCalculatedLineItem(
            code,
            category,
            label,
            scaledAmount,
            "computed_tax",
            order,
            context.country(),
            context.jurisdiction(),
            normalizedTaxTreatment,
            "deduction".equals(category) && !"employer_social_security".equals(normalizedTaxTreatment),
            false,
            "social_security".equals(normalizedTaxTreatment)
                || "pension".equals(normalizedTaxTreatment)
                || "employment_insurance".equals(normalizedTaxTreatment)
                || normalizedTaxTreatment.contains("social_security"),
            "employer_contribution".equals(category),
            legalClassification,
            ruleCode,
            ruleSet == null ? null : ruleSet.id(),
            formula,
            base,
            rate,
            context.currency()
        ));
    }

    protected BigDecimal money(BigDecimal value) {
        return (value == null ? BigDecimal.ZERO : value).setScale(2, RoundingMode.HALF_UP);
    }

    protected BigDecimal decimalParam(java.util.Map<String, BigDecimal> params, String key, BigDecimal fallback) {
        return ruleResolver.decimalParam(params, key, fallback);
    }

    protected BigDecimal annualPeriods(String payPeriod, BigDecimal fallback) {
        return switch (safe(payPeriod)) {
            case "weekly" -> new BigDecimal("52");
            case "biweekly" -> new BigDecimal("26");
            case "semimonthly", "quincenal" -> new BigDecimal("24");
            case "monthly" -> new BigDecimal("12");
            default -> fallback;
        };
    }

    protected String normalize(String value) {
        return value == null ? "" : value.trim().toUpperCase(Locale.ROOT).replace(".", "").replace("-", " ").replace("_", " ");
    }

    protected String safe(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }
}
