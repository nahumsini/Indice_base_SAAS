package com.indice.erp.hr.payroll.engine;

import java.math.BigDecimal;
import java.math.RoundingMode;

public record PayrollCalculatedLineItem(
    String code,
    String category,
    String label,
    BigDecimal amount,
    String sourceType,
    int displayOrder,
    String countryCode,
    String jurisdictionCode,
    String taxTreatment,
    boolean taxable,
    boolean exempt,
    boolean affectsSocialSecurity,
    boolean affectsEmployerCost,
    String legalClassification,
    String ruleCode,
    Long ruleSetId,
    String calculationFormula,
    BigDecimal calculationBase,
    BigDecimal rateApplied,
    String currencyCode
) {
    public PayrollCalculatedLineItem {
        code = text(code);
        category = text(category);
        label = text(label);
        amount = money(amount);
        sourceType = text(sourceType);
        countryCode = text(countryCode);
        jurisdictionCode = text(jurisdictionCode);
        taxTreatment = text(taxTreatment);
        legalClassification = text(legalClassification);
        ruleCode = text(ruleCode);
        calculationFormula = text(calculationFormula);
        calculationBase = calculationBase == null ? null : calculationBase.setScale(8, RoundingMode.HALF_UP);
        rateApplied = rateApplied == null ? null : rateApplied.setScale(8, RoundingMode.HALF_UP);
        currencyCode = text(currencyCode);
    }

    public static PayrollCalculatedLineItem basic(
        String code,
        String category,
        String label,
        BigDecimal amount,
        String sourceType,
        int displayOrder,
        PayrollCalculationContext context
    ) {
        return new PayrollCalculatedLineItem(
            code,
            category,
            label,
            amount,
            sourceType,
            displayOrder,
            context.country(),
            context.jurisdiction(),
            "standard",
            "earning".equals(category),
            false,
            "earning".equals(category),
            "employer_contribution".equals(category),
            "",
            "",
            null,
            "",
            amount,
            null,
            context.currency()
        );
    }

    public PayrollCalculatedLineItem withAmount(BigDecimal value) {
        return new PayrollCalculatedLineItem(
            code,
            category,
            label,
            value,
            sourceType,
            displayOrder,
            countryCode,
            jurisdictionCode,
            taxTreatment,
            taxable,
            exempt,
            affectsSocialSecurity,
            affectsEmployerCost,
            legalClassification,
            ruleCode,
            ruleSetId,
            calculationFormula,
            calculationBase,
            rateApplied,
            currencyCode
        );
    }

    private static String text(String value) {
        return value == null ? "" : value.trim();
    }

    private static BigDecimal money(BigDecimal value) {
        return (value == null ? BigDecimal.ZERO : value).setScale(2, RoundingMode.HALF_UP);
    }
}
