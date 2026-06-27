package com.indice.erp.hr.payroll.provider.generic;

import com.indice.erp.hr.payroll.engine.PayrollCalculatedLineItem;
import com.indice.erp.hr.payroll.engine.PayrollCalculationContext;
import com.indice.erp.hr.payroll.engine.PayrollCountryProvider;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class GenericPayrollProvider implements PayrollCountryProvider {

    @Override
    public String providerCode() {
        return "generic";
    }

    @Override
    public boolean supports(String countryCode) {
        return true;
    }

    @Override
    public List<PayrollCalculatedLineItem> calculateLine(PayrollCalculationContext context, BigDecimal taxableBase) {
        var items = new ArrayList<PayrollCalculatedLineItem>();
        addRateItem(items, context, "GENERIC_INCOME_TAX_ESTIMATE", "deduction", "Estimated income tax withholding", taxableBase, context.preferences().isrRate(), 80);
        addRateItem(items, context, "GENERIC_SOCIAL_SECURITY_ESTIMATE", "deduction", "Estimated employee social security", taxableBase, context.preferences().imssUserRate(), 90);
        addRateItem(items, context, "GENERIC_HOUSING_ESTIMATE", "deduction", "Estimated employee housing deduction", taxableBase, context.preferences().infonavitUserRate(), 100);
        addRateItem(items, context, "GENERIC_EMPLOYER_SOCIAL_SECURITY_ESTIMATE", "employer_contribution", "Estimated employer social security", taxableBase, context.preferences().imssEmployerRate(), 110);
        addRateItem(items, context, "GENERIC_EMPLOYER_HOUSING_ESTIMATE", "employer_contribution", "Estimated employer housing contribution", taxableBase, context.preferences().infonavitEmployerRate(), 120);
        addRateItem(items, context, "GENERIC_EMPLOYER_RETIREMENT_ESTIMATE", "employer_contribution", "Estimated employer retirement contribution", taxableBase, context.preferences().sarEmployerRate(), 130);
        return items;
    }

    @Override
    public Map<String, Object> buildAuditBreakdown(
        PayrollCalculationContext context,
        com.indice.erp.hr.payroll.engine.PayrollLineCalculationResult result
    ) {
        var breakdown = new LinkedHashMap<String, Object>();
        breakdown.put("provider", providerCode());
        breakdown.put("country", context.country());
        breakdown.put("jurisdiction", context.jurisdiction());
        breakdown.put("statutoryCompliance", false);
        breakdown.put("warning", "Unsupported country. Generic payroll lines are operational estimates only.");
        breakdown.put("taxableBase", result.taxableBase());
        breakdown.put("grossEarnings", result.grossAmount());
        breakdown.put("employeeDeductions", result.deductionsAmount());
        breakdown.put("employerContributions", result.employerContributionsAmount());
        breakdown.put("netPay", result.netAmount());
        breakdown.put("totalPayrollCost", result.totalPayrollCost());
        return breakdown;
    }

    protected void addRateItem(
        List<PayrollCalculatedLineItem> items,
        PayrollCalculationContext context,
        String code,
        String category,
        String label,
        BigDecimal base,
        BigDecimal rate,
        int order
    ) {
        var safeRate = rate == null ? BigDecimal.ZERO : rate;
        var amount = base.multiply(safeRate).setScale(2, RoundingMode.HALF_UP);
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            return;
        }
        items.add(new PayrollCalculatedLineItem(
            code,
            category,
            label,
            amount,
            "computed_tax",
            order,
            context.country(),
            context.jurisdiction(),
            "generic_unsupported_country_estimate",
            "deduction".equals(category),
            false,
            "deduction".equals(category),
            "employer_contribution".equals(category),
            "operational estimate only",
            code,
            null,
            "base * rate",
            base,
            safeRate,
            context.currency()
        ));
    }
}
