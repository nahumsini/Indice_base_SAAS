package com.indice.erp.hr.payroll.engine;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class PayrollManualAdjustmentService {

    public PayrollCalculationContext.ManualAdjustment normalize(
        String category,
        String label,
        BigDecimal amount,
        String currency
    ) {
        var normalizedCategory = normalizeCategory(category);
        var earning = "earning".equals(normalizedCategory);
        var employerCost = "employer_contribution".equals(normalizedCategory) || "provision".equals(normalizedCategory);
        return new PayrollCalculationContext.ManualAdjustment(
            codeForCategory(normalizedCategory),
            normalizedCategory,
            label,
            amount,
            "manual_review",
            earning,
            earning,
            employerCost,
            "Manual adjustment",
            currency
        );
    }

    public List<PayrollCalculatedLineItem> toLineItems(
        PayrollCalculationContext context,
        List<PayrollCalculationContext.ManualAdjustment> adjustments
    ) {
        var items = new ArrayList<PayrollCalculatedLineItem>();
        for (var index = 0; index < adjustments.size(); index++) {
            var adjustment = adjustments.get(index);
            var formula = "incentive".equalsIgnoreCase(adjustment.sourceType())
                ? "approved incentive amount"
                : "manual adjustment amount";
            items.add(new PayrollCalculatedLineItem(
                adjustment.code(),
                adjustment.category(),
                adjustment.label(),
                adjustment.amount(),
                adjustment.sourceType(),
                1000 + index,
                context.country(),
                context.jurisdiction(),
                adjustment.taxTreatment(),
                adjustment.taxable(),
                false,
                adjustment.affectsSocialSecurity(),
                adjustment.affectsEmployerCost(),
                adjustment.legalClassification(),
                "",
                null,
                formula,
                adjustment.amount(),
                null,
                adjustment.currency().isBlank() ? context.currency() : adjustment.currency()
            ));
        }
        return items;
    }

    private String normalizeCategory(String value) {
        var normalized = value == null ? "" : value.trim().toLowerCase();
        return switch (normalized) {
            case "earning", "percepcion", "percepción", "perception" -> "earning";
            case "deduction", "deduccion", "deducción", "deduction_manual" -> "deduction";
            case "employer_contribution", "provision" -> normalized;
            default -> throw new IllegalArgumentException(
                "manual item category must be earning, deduction, employer_contribution, or provision."
            );
        };
    }

    private String codeForCategory(String category) {
        return switch (category) {
            case "earning" -> "MANUAL_EARNING";
            case "deduction" -> "MANUAL_DEDUCTION";
            case "employer_contribution" -> "MANUAL_EMPLOYER_CONTRIBUTION";
            case "provision" -> "MANUAL_PROVISION";
            default -> "MANUAL_ADJUSTMENT";
        };
    }
}
