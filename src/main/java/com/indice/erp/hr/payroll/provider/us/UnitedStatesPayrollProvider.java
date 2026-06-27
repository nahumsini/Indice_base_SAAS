package com.indice.erp.hr.payroll.provider.us;

import com.indice.erp.hr.payroll.engine.PayrollCalculatedLineItem;
import com.indice.erp.hr.payroll.engine.PayrollCalculationContext;
import com.indice.erp.hr.payroll.engine.PayrollRuleResolver;
import com.indice.erp.hr.payroll.provider.AbstractPayrollCountryProvider;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class UnitedStatesPayrollProvider extends AbstractPayrollCountryProvider {

    private static final BigDecimal SOCIAL_SECURITY_WAGE_BASE = new BigDecimal("184500.00");
    private static final BigDecimal SOCIAL_SECURITY_RATE = new BigDecimal("0.062");
    private static final BigDecimal MEDICARE_RATE = new BigDecimal("0.0145");
    private static final BigDecimal ADDITIONAL_MEDICARE_RATE = new BigDecimal("0.009");
    private static final BigDecimal ADDITIONAL_MEDICARE_THRESHOLD = new BigDecimal("200000.00");
    private static final BigDecimal FUTA_WAGE_BASE = new BigDecimal("7000.00");
    private static final BigDecimal FUTA_EFFECTIVE_RATE = new BigDecimal("0.006");

    public UnitedStatesPayrollProvider(PayrollRuleResolver ruleResolver) {
        super(ruleResolver);
    }

    @Override
    public String providerCode() {
        return "us";
    }

    @Override
    public boolean supports(String countryCode) {
        return "US".equals(ruleResolver.normalizeCountry(countryCode));
    }

    @Override
    public List<PayrollCalculatedLineItem> calculateLine(PayrollCalculationContext context, BigDecimal taxableBase) {
        var items = new ArrayList<PayrollCalculatedLineItem>();
        var periodEndDate = context.periodEndDate();
        var periodsPerYear = annualPeriods(context.payrollFrequency(), new BigDecimal("24"));
        var annualTaxableBase = taxableBase.multiply(periodsPerYear);
        var priorTaxableBaseYearToDate = context.fiscalAccumulator().taxableBaseYearToDate();
        var ficaRule = ruleResolver.resolveRuleSet("US", "", "FICA", periodEndDate);
        var futaRule = ruleResolver.resolveRuleSet("US", "", "FUTA", periodEndDate);
        var federalRule = ruleResolver.resolveRuleSet("US", "", "INCOME_TAX_FEDERAL_SINGLE", periodEndDate);
        var ficaParams = ruleResolver.parametersByCode("US", "", "FICA", periodEndDate);
        var futaParams = ruleResolver.parametersByCode("US", "", "FUTA", periodEndDate);
        var socialSecurityWageBase = decimalParam(ficaParams, "social_security_wage_base", SOCIAL_SECURITY_WAGE_BASE);
        var socialSecurityEmployeeRate = decimalParam(ficaParams, "social_security_employee_rate", SOCIAL_SECURITY_RATE);
        var socialSecurityEmployerRate = decimalParam(ficaParams, "social_security_employer_rate", SOCIAL_SECURITY_RATE);
        var medicareEmployeeRate = decimalParam(ficaParams, "medicare_employee_rate", MEDICARE_RATE);
        var medicareEmployerRate = decimalParam(ficaParams, "medicare_employer_rate", MEDICARE_RATE);
        var additionalMedicareThreshold = decimalParam(ficaParams, "additional_medicare_threshold", ADDITIONAL_MEDICARE_THRESHOLD);
        var additionalMedicareRate = decimalParam(ficaParams, "additional_medicare_employee_rate", ADDITIONAL_MEDICARE_RATE);
        var futaWageBase = decimalParam(futaParams, "wage_base", FUTA_WAGE_BASE);
        var futaRate = decimalParam(futaParams, "effective_rate", FUTA_EFFECTIVE_RATE);

        var federalWithholding = calculateFederalWithholding(annualTaxableBase, periodEndDate)
            .divide(periodsPerYear, 8, RoundingMode.HALF_UP);
        var socialSecurityBase = cappedPeriodBase(priorTaxableBaseYearToDate, taxableBase, socialSecurityWageBase);
        var futaBase = cappedPeriodBase(priorTaxableBaseYearToDate, taxableBase, futaWageBase);
        var additionalMedicareBase = thresholdPeriodBase(priorTaxableBaseYearToDate, taxableBase, additionalMedicareThreshold);
        var socialSecurityEmployee = socialSecurityBase.multiply(socialSecurityEmployeeRate);
        var socialSecurityEmployer = socialSecurityBase.multiply(socialSecurityEmployerRate);
        var employeeMedicare = taxableBase.multiply(medicareEmployeeRate);
        var additionalMedicare = additionalMedicareBase.multiply(additionalMedicareRate);
        var employerMedicare = taxableBase.multiply(medicareEmployerRate);
        var futa = futaBase.multiply(futaRate);

        addItem(items, context, "US_FED_TAX", "deduction", "Federal income tax withholding", federalWithholding, 80, "income_tax", "Federal income tax withholding", "INCOME_TAX_FEDERAL_SINGLE", federalRule, "annualized wage table / periods", annualTaxableBase, null);
        addItem(items, context, "US_SS_EMP", "deduction", "Social Security employee", socialSecurityEmployee, 90, "social_security", "FICA Social Security employee", "FICA", ficaRule, "current period wage under annual cap after prior YTD * rate", socialSecurityBase, socialSecurityEmployeeRate);
        addItem(items, context, "US_MEDICARE_EMP", "deduction", "Medicare employee", employeeMedicare.add(additionalMedicare), 92, "medicare", "FICA Medicare employee", "FICA", ficaRule, "period wage * Medicare rate plus current period wage above Additional Medicare YTD threshold", taxableBase.add(additionalMedicareBase), medicareEmployeeRate);
        addItem(items, context, "EMPLOYER_US_SS", "employer_contribution", "Social Security employer", socialSecurityEmployer, 110, "employer_social_security", "FICA Social Security employer", "FICA", ficaRule, "current period wage under annual cap after prior YTD * rate", socialSecurityBase, socialSecurityEmployerRate);
        addItem(items, context, "EMPLOYER_US_MEDICARE", "employer_contribution", "Medicare employer", employerMedicare, 112, "employer_medicare", "FICA Medicare employer", "FICA", ficaRule, "period wage * Medicare rate", taxableBase, medicareEmployerRate);
        addItem(items, context, "EMPLOYER_FUTA", "employer_contribution", "FUTA", futa, 114, "employer_unemployment", "Federal unemployment tax", "FUTA", futaRule, "current period wage under FUTA annual cap after prior YTD * rate", futaBase, futaRate);
        addStateItems(items, context, taxableBase, priorTaxableBaseYearToDate, periodEndDate);
        return items;
    }

    private void addStateItems(
        List<PayrollCalculatedLineItem> items,
        PayrollCalculationContext context,
        BigDecimal taxableBase,
        BigDecimal priorTaxableBaseYearToDate,
        LocalDate periodEndDate
    ) {
        var stateCode = normalizeState(context.jurisdiction());
        if (stateCode.isBlank()) {
            return;
        }
        var stateRule = ruleResolver.resolveRuleSet("US", stateCode, "STATE_PAYROLL", periodEndDate);
        var params = ruleResolver.parametersByCode("US", stateCode, "STATE_PAYROLL", periodEndDate);
        var stateIncomeRate = decimalParam(params, "state_income_withholding_rate", BigDecimal.ZERO);
        var employeeSdiRate = decimalParam(params, "employee_sdi_rate", BigDecimal.ZERO);
        var employeePaidLeaveRate = decimalParam(params, "employee_paid_leave_rate", BigDecimal.ZERO);
        var employeePfmlRate = decimalParam(params, "employee_pfml_rate", BigDecimal.ZERO);
        var sutaRate = decimalParam(params, "suta_default_rate", BigDecimal.ZERO);
        var trainingRate = decimalParam(params, "employer_training_tax_rate", BigDecimal.ZERO);
        var employerPfmlRate = decimalParam(params, "employer_pfml_rate", BigDecimal.ZERO);
        var stateIncomeWithholding = taxableBase.multiply(stateIncomeRate);
        var employeeSdiBase = cappedPeriodBase(priorTaxableBaseYearToDate, taxableBase, decimalParam(params, "employee_sdi_wage_base", BigDecimal.ZERO));
        var employeePaidLeaveBase = cappedPeriodBase(priorTaxableBaseYearToDate, taxableBase, decimalParam(params, "employee_paid_leave_wage_base", BigDecimal.ZERO));
        var employeePfmlBase = cappedPeriodBase(priorTaxableBaseYearToDate, taxableBase, decimalParam(params, "employee_pfml_wage_base", BigDecimal.ZERO));
        var sutaBase = cappedPeriodBase(priorTaxableBaseYearToDate, taxableBase, decimalParam(params, "suta_wage_base", BigDecimal.ZERO));
        var trainingBase = cappedPeriodBase(priorTaxableBaseYearToDate, taxableBase, decimalParam(params, "employer_training_tax_wage_base", BigDecimal.ZERO));
        var employerPfmlBase = cappedPeriodBase(priorTaxableBaseYearToDate, taxableBase, decimalParam(params, "employer_pfml_wage_base", BigDecimal.ZERO));

        addItem(items, context, "US_STATE_TAX", "deduction", stateCode + " income tax withholding", stateIncomeWithholding, 84, "state_income_tax", "State income tax withholding", "STATE_PAYROLL", stateRule, "period wage * state withholding rate", taxableBase, stateIncomeRate);
        addItem(items, context, "US_CA_SDI", "deduction", "California SDI", employeeSdiBase.multiply(employeeSdiRate), 96, "state_disability", "State disability insurance", "STATE_PAYROLL", stateRule, "current period wage under annual cap after prior YTD * rate", employeeSdiBase, employeeSdiRate);
        addItem(items, context, "US_NY_PFL", "deduction", "New York Paid Family Leave", employeePaidLeaveBase.multiply(employeePaidLeaveRate), 98, "paid_family_leave", "Paid family leave employee", "STATE_PAYROLL", stateRule, "current period wage under annual cap after prior YTD * rate", employeePaidLeaveBase, employeePaidLeaveRate);
        addItem(items, context, "US_WA_PFML", "deduction", "Washington PFML employee", employeePfmlBase.multiply(employeePfmlRate), 100, "paid_family_medical_leave", "PFML employee", "STATE_PAYROLL", stateRule, "current period wage under annual cap after prior YTD * rate", employeePfmlBase, employeePfmlRate);
        addItem(items, context, "EMPLOYER_SUTA", "employer_contribution", stateCode + " SUTA", sutaBase.multiply(sutaRate), 116, "employer_unemployment", "State unemployment tax", "STATE_PAYROLL", stateRule, "current period wage under annual cap after prior YTD * rate", sutaBase, sutaRate);
        addItem(items, context, "EMPLOYER_CA_ETT", "employer_contribution", "California ETT", trainingBase.multiply(trainingRate), 118, "employer_training_tax", "Employment training tax", "STATE_PAYROLL", stateRule, "current period wage under annual cap after prior YTD * rate", trainingBase, trainingRate);
        addItem(items, context, "EMPLOYER_WA_PFML", "employer_contribution", "Washington PFML employer", employerPfmlBase.multiply(employerPfmlRate), 120, "employer_paid_family_medical_leave", "PFML employer", "STATE_PAYROLL", stateRule, "current period wage under annual cap after prior YTD * rate", employerPfmlBase, employerPfmlRate);
    }

    private BigDecimal calculateFederalWithholding(BigDecimal annualTaxableBase, LocalDate periodEndDate) {
        var brackets = ruleResolver.bracketsByCode("US", "", "INCOME_TAX_FEDERAL_SINGLE", periodEndDate);
        if (brackets.isEmpty()) {
            return BigDecimal.ZERO;
        }
        var bracket = brackets.stream()
            .filter((candidate) -> annualTaxableBase.compareTo(candidate.lowerLimit()) >= 0)
            .filter((candidate) -> candidate.upperLimit() == null || annualTaxableBase.compareTo(candidate.upperLimit()) < 0)
            .findFirst()
            .orElse(brackets.getLast());
        return bracket.fixedAmount()
            .add(annualTaxableBase.subtract(bracket.lowerLimit()).multiply(bracket.rate()))
            .max(BigDecimal.ZERO);
    }

    private BigDecimal cappedPeriodBase(BigDecimal priorYearToDate, BigDecimal currentPeriodBase, BigDecimal annualCap) {
        if (currentPeriodBase == null || currentPeriodBase.compareTo(BigDecimal.ZERO) <= 0 || annualCap == null || annualCap.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }
        var prior = priorYearToDate == null ? BigDecimal.ZERO : priorYearToDate.max(BigDecimal.ZERO);
        var remainingCap = annualCap.subtract(prior).max(BigDecimal.ZERO);
        return currentPeriodBase.min(remainingCap).max(BigDecimal.ZERO);
    }

    private BigDecimal thresholdPeriodBase(BigDecimal priorYearToDate, BigDecimal currentPeriodBase, BigDecimal threshold) {
        if (currentPeriodBase == null || currentPeriodBase.compareTo(BigDecimal.ZERO) <= 0 || threshold == null) {
            return BigDecimal.ZERO;
        }
        var prior = priorYearToDate == null ? BigDecimal.ZERO : priorYearToDate.max(BigDecimal.ZERO);
        var current = currentPeriodBase.max(BigDecimal.ZERO);
        var beforeCurrentAboveThreshold = prior.subtract(threshold).max(BigDecimal.ZERO);
        var afterCurrentAboveThreshold = prior.add(current).subtract(threshold).max(BigDecimal.ZERO);
        return afterCurrentAboveThreshold.subtract(beforeCurrentAboveThreshold).min(current).max(BigDecimal.ZERO);
    }

    private String normalizeState(String value) {
        var normalized = normalize(value);
        return switch (normalized) {
            case "CA", "CALIFORNIA" -> "CA";
            case "NY", "NEW YORK", "NUEVA YORK" -> "NY";
            case "WA", "WASHINGTON", "WASHINGTON STATE" -> "WA";
            default -> normalized.length() == 2 ? normalized : "";
        };
    }
}
