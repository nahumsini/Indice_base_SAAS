package com.indice.erp.hr.payroll.provider.ca;

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
public class CanadaPayrollProvider extends AbstractPayrollCountryProvider {

    private static final BigDecimal CPP_YMPE = new BigDecimal("74600.00");
    private static final BigDecimal CPP_YAMPE = new BigDecimal("85000.00");
    private static final BigDecimal CPP_BASIC_EXEMPTION = new BigDecimal("3500.00");
    private static final BigDecimal CPP_RATE = new BigDecimal("0.0595");
    private static final BigDecimal QPP_RATE = new BigDecimal("0.0630");
    private static final BigDecimal CPP2_RATE = new BigDecimal("0.0400");
    private static final BigDecimal EI_MAX_INSURABLE = new BigDecimal("68900.00");
    private static final BigDecimal EI_RATE = new BigDecimal("0.0163");
    private static final BigDecimal EI_EMPLOYER_RATE = new BigDecimal("0.02282");
    private static final BigDecimal QUEBEC_EI_RATE = new BigDecimal("0.0130");
    private static final BigDecimal QUEBEC_EI_EMPLOYER_RATE = new BigDecimal("0.01820");
    private static final BigDecimal QPIP_MAX_INSURABLE = new BigDecimal("103000.00");
    private static final BigDecimal QPIP_RATE = new BigDecimal("0.00430");
    private static final BigDecimal QPIP_EMPLOYER_RATE = new BigDecimal("0.00602");
    private static final BigDecimal QUEBEC_FEDERAL_ABATEMENT = new BigDecimal("0.165");
    private static final BigDecimal FEDERAL_BASIC_CREDIT = new BigDecimal("2303.28");
    private static final BigDecimal DEFAULT_PROVINCIAL_BASIC_CREDIT = new BigDecimal("655.94");
    private static final BigDecimal VACATION_ACCRUAL_RATE = new BigDecimal("0.04");

    public CanadaPayrollProvider(PayrollRuleResolver ruleResolver) {
        super(ruleResolver);
    }

    @Override
    public String providerCode() {
        return "ca";
    }

    @Override
    public boolean supports(String countryCode) {
        return "CA".equals(ruleResolver.normalizeCountry(countryCode));
    }

    @Override
    public List<PayrollCalculatedLineItem> calculateLine(PayrollCalculationContext context, BigDecimal taxableBase) {
        var items = new ArrayList<PayrollCalculatedLineItem>();
        var periodEndDate = context.periodEndDate();
        var periodsPerYear = annualPeriods(context.payrollFrequency(), new BigDecimal("24"));
        var annualTaxableBase = taxableBase.multiply(periodsPerYear);
        var priorTaxableBaseYearToDate = context.fiscalAccumulator().taxableBaseYearToDate();
        var provinceCode = normalizeProvince(context.jurisdiction());
        var isQuebec = "QC".equals(provinceCode);
        var federalRule = ruleResolver.resolveRuleSet("CA", "", "INCOME_TAX_FEDERAL", periodEndDate);
        var federalParams = ruleResolver.parametersByCode("CA", "", "INCOME_TAX_FEDERAL", periodEndDate);
        var federalTaxAnnual = calculateTax(
            annualTaxableBase,
            ruleResolver.bracketsByCode("CA", "", "INCOME_TAX_FEDERAL", periodEndDate),
            decimalParam(federalParams, "basic_credit", FEDERAL_BASIC_CREDIT)
        );
        if (isQuebec) {
            federalTaxAnnual = federalTaxAnnual.multiply(BigDecimal.ONE.subtract(decimalParam(
                federalParams,
                "quebec_abatement_rate",
                QUEBEC_FEDERAL_ABATEMENT
            )));
        }
        addItem(items, context, "CAN_FED_TAX", "deduction", "Federal income tax", federalTaxAnnual.divide(periodsPerYear, 8, RoundingMode.HALF_UP), 80, "income_tax", "Federal income tax", "INCOME_TAX_FEDERAL", federalRule, "annualized tax / periods", annualTaxableBase, null);

        var provinceRule = ruleResolver.resolveRuleSet("CA", provinceCode, "INCOME_TAX_PROVINCIAL", periodEndDate);
        var provinceParams = provinceRule == null ? java.util.Map.<String, BigDecimal>of() : ruleResolver.parameters(provinceRule.id());
        var provinceTaxAnnual = calculateTax(
            annualTaxableBase,
            ruleResolver.bracketsByCode("CA", provinceCode, "INCOME_TAX_PROVINCIAL", periodEndDate),
            decimalParam(provinceParams, "basic_credit", DEFAULT_PROVINCIAL_BASIC_CREDIT)
        );
        addItem(
            items,
            context,
            isQuebec ? "QC_PROV_TAX" : "CAN_PROV_TAX",
            "deduction",
            isQuebec ? "Québec income tax" : provinceCode + " income tax",
            provinceTaxAnnual.divide(periodsPerYear, 8, RoundingMode.HALF_UP),
            82,
            "provincial_income_tax",
            "Provincial income tax",
            "INCOME_TAX_PROVINCIAL",
            provinceRule,
            "annualized provincial tax / periods",
            annualTaxableBase,
            null
        );

        if (isQuebec) {
            addQuebecItems(items, context, taxableBase, annualTaxableBase, priorTaxableBaseYearToDate, periodsPerYear, periodEndDate);
        } else {
            addStandardItems(items, context, taxableBase, annualTaxableBase, priorTaxableBaseYearToDate, periodsPerYear, periodEndDate);
        }

        var vacationRule = ruleResolver.resolveRuleSet("CA", "", "VACATION", periodEndDate);
        var vacationParams = ruleResolver.parametersByCode("CA", "", "VACATION", periodEndDate);
        addItem(items, context, "EMPLOYER_VACATION_ACCRUAL", "employer_contribution", "Vacation accrual", taxableBase.multiply(decimalParam(vacationParams, "accrual_rate", VACATION_ACCRUAL_RATE)), 132, "provision", "Vacation accrual", "VACATION", vacationRule, "pensionable earnings * accrual rate", taxableBase, decimalParam(vacationParams, "accrual_rate", VACATION_ACCRUAL_RATE));
        return items;
    }

    private void addStandardItems(
        List<PayrollCalculatedLineItem> items,
        PayrollCalculationContext context,
        BigDecimal taxableBase,
        BigDecimal annualTaxableBase,
        BigDecimal priorTaxableBaseYearToDate,
        BigDecimal periodsPerYear,
        LocalDate periodEndDate
    ) {
        var cppRule = ruleResolver.resolveRuleSet("CA", "", "CPP", periodEndDate);
        var eiRule = ruleResolver.resolveRuleSet("CA", "", "EI", periodEndDate);
        var cppParams = ruleResolver.parametersByCode("CA", "", "CPP", periodEndDate);
        var eiParams = ruleResolver.parametersByCode("CA", "", "EI", periodEndDate);
        var ympe = decimalParam(cppParams, "ympe", CPP_YMPE);
        var yampe = decimalParam(cppParams, "yampe", CPP_YAMPE);
        var basicExemption = decimalParam(cppParams, "basic_exemption", CPP_BASIC_EXEMPTION);
        var cppRate = decimalParam(cppParams, "base_rate", CPP_RATE);
        var cpp2Rate = decimalParam(cppParams, "second_rate", CPP2_RATE);
        var eiEmployeeRate = decimalParam(eiParams, "employee_rate", EI_RATE);
        var eiEmployerRate = decimalParam(eiParams, "employer_rate", EI_EMPLOYER_RATE);
        var eiMaxInsurable = decimalParam(eiParams, "max_insurable_earnings", EI_MAX_INSURABLE);
        var cppBase = pensionPeriodBase(priorTaxableBaseYearToDate, taxableBase, ympe, basicExemption, periodsPerYear);
        var cpp2Base = cappedBandPeriodBase(priorTaxableBaseYearToDate, taxableBase, ympe, yampe);
        var employeeEiBase = cappedPeriodBase(priorTaxableBaseYearToDate, taxableBase, eiMaxInsurable);
        var cpp = cppBase.multiply(cppRate);
        var cpp2 = cpp2Base.multiply(cpp2Rate);
        var employeeEi = employeeEiBase.multiply(eiEmployeeRate);
        var employerEi = employeeEiBase.multiply(eiEmployerRate);

        addItem(items, context, "CPP", "deduction", "CPP", cpp, 90, "pension", "Canada Pension Plan", "CPP", cppRule, "current period pensionable earnings under YMPE after prior YTD minus period exemption * rate", cppBase, cppRate);
        addItem(items, context, "CPP2", "deduction", "CPP2", cpp2, 92, "pension", "CPP second additional contribution", "CPP", cppRule, "current period earnings between YMPE and YAMPE after prior YTD * rate", cpp2Base, cpp2Rate);
        addItem(items, context, "EI", "deduction", "Employment Insurance", employeeEi, 94, "employment_insurance", "Employment Insurance employee", "EI", eiRule, "current period insurable earnings under annual cap after prior YTD * rate", employeeEiBase, eiEmployeeRate);
        addItem(items, context, "EMPLOYER_CPP", "employer_contribution", "Employer CPP", cpp, 110, "employer_pension", "Employer CPP", "CPP", cppRule, "employee CPP matched", cppBase, cppRate);
        addItem(items, context, "EMPLOYER_CPP2", "employer_contribution", "Employer CPP2", cpp2, 112, "employer_pension", "Employer CPP2", "CPP", cppRule, "employee CPP2 matched", cpp2Base, cpp2Rate);
        addItem(items, context, "EMPLOYER_EI", "employer_contribution", "Employer EI", employerEi, 114, "employer_employment_insurance", "Employer EI", "EI", eiRule, "current period insurable earnings under annual cap after prior YTD * employer rate", employeeEiBase, eiEmployerRate);
    }

    private void addQuebecItems(
        List<PayrollCalculatedLineItem> items,
        PayrollCalculationContext context,
        BigDecimal taxableBase,
        BigDecimal annualTaxableBase,
        BigDecimal priorTaxableBaseYearToDate,
        BigDecimal periodsPerYear,
        LocalDate periodEndDate
    ) {
        var qppRule = ruleResolver.resolveRuleSet("CA", "QC", "QPP", periodEndDate);
        var qpipRule = ruleResolver.resolveRuleSet("CA", "QC", "QPIP", periodEndDate);
        var eiRule = ruleResolver.resolveRuleSet("CA", "QC", "EI", periodEndDate);
        var qppParams = ruleResolver.parametersByCode("CA", "QC", "QPP", periodEndDate);
        var qpipParams = ruleResolver.parametersByCode("CA", "QC", "QPIP", periodEndDate);
        var eiParams = ruleResolver.parametersByCode("CA", "QC", "EI", periodEndDate);
        var ympe = decimalParam(qppParams, "ympe", CPP_YMPE);
        var yampe = decimalParam(qppParams, "yampe", CPP_YAMPE);
        var basicExemption = decimalParam(qppParams, "basic_exemption", CPP_BASIC_EXEMPTION);
        var qppRate = decimalParam(qppParams, "base_rate", QPP_RATE);
        var qpp2Rate = decimalParam(qppParams, "second_rate", CPP2_RATE);
        var qpipEmployeeRate = decimalParam(qpipParams, "employee_rate", QPIP_RATE);
        var qpipEmployerRate = decimalParam(qpipParams, "employer_rate", QPIP_EMPLOYER_RATE);
        var eiEmployeeRate = decimalParam(eiParams, "employee_rate", QUEBEC_EI_RATE);
        var eiEmployerRate = decimalParam(eiParams, "employer_rate", QUEBEC_EI_EMPLOYER_RATE);
        var qpipMaxInsurable = decimalParam(qpipParams, "max_insurable_earnings", QPIP_MAX_INSURABLE);
        var eiMaxInsurable = decimalParam(eiParams, "max_insurable_earnings", EI_MAX_INSURABLE);
        var qppBase = pensionPeriodBase(priorTaxableBaseYearToDate, taxableBase, ympe, basicExemption, periodsPerYear);
        var qpp2Base = cappedBandPeriodBase(priorTaxableBaseYearToDate, taxableBase, ympe, yampe);
        var qpipBase = cappedPeriodBase(priorTaxableBaseYearToDate, taxableBase, qpipMaxInsurable);
        var eiBase = cappedPeriodBase(priorTaxableBaseYearToDate, taxableBase, eiMaxInsurable);
        var qpp = qppBase.multiply(qppRate);
        var qpp2 = qpp2Base.multiply(qpp2Rate);
        var employeeQpip = qpipBase.multiply(qpipEmployeeRate);
        var employerQpip = qpipBase.multiply(qpipEmployerRate);
        var employeeEi = eiBase.multiply(eiEmployeeRate);
        var employerEi = eiBase.multiply(eiEmployerRate);

        addItem(items, context, "QPP", "deduction", "QPP", qpp, 90, "pension", "Québec Pension Plan", "QPP", qppRule, "current period pensionable earnings under YMPE after prior YTD minus period exemption * rate", qppBase, qppRate);
        addItem(items, context, "QPP2", "deduction", "QPP2", qpp2, 92, "pension", "QPP second additional contribution", "QPP", qppRule, "current period earnings between YMPE and YAMPE after prior YTD * rate", qpp2Base, qpp2Rate);
        addItem(items, context, "QPIP", "deduction", "QPIP", employeeQpip, 94, "parental_insurance", "Québec Parental Insurance Plan employee", "QPIP", qpipRule, "current period insurable earnings under annual cap after prior YTD * rate", qpipBase, qpipEmployeeRate);
        addItem(items, context, "EI", "deduction", "Employment Insurance", employeeEi, 96, "employment_insurance", "Employment Insurance employee", "EI", eiRule, "current period insurable earnings under annual cap after prior YTD * reduced Québec rate", eiBase, eiEmployeeRate);
        addItem(items, context, "EMPLOYER_QPP", "employer_contribution", "Employer QPP", qpp, 110, "employer_pension", "Employer QPP", "QPP", qppRule, "employee QPP matched", qppBase, qppRate);
        addItem(items, context, "EMPLOYER_QPP2", "employer_contribution", "Employer QPP2", qpp2, 112, "employer_pension", "Employer QPP2", "QPP", qppRule, "employee QPP2 matched", qpp2Base, qpp2Rate);
        addItem(items, context, "EMPLOYER_QPIP", "employer_contribution", "Employer QPIP", employerQpip, 114, "employer_parental_insurance", "Employer QPIP", "QPIP", qpipRule, "current period insurable earnings under annual cap after prior YTD * employer rate", qpipBase, qpipEmployerRate);
        addItem(items, context, "EMPLOYER_EI", "employer_contribution", "Employer EI", employerEi, 116, "employer_employment_insurance", "Employer EI", "EI", eiRule, "current period insurable earnings under annual cap after prior YTD * employer reduced Québec rate", eiBase, eiEmployerRate);
    }

    private BigDecimal calculateTax(
        BigDecimal annualTaxableBase,
        List<PayrollRuleResolver.RuleBracket> brackets,
        BigDecimal basicCredit
    ) {
        if (brackets.isEmpty() || annualTaxableBase.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }
        var bracket = brackets.stream()
            .filter((candidate) -> annualTaxableBase.compareTo(candidate.lowerLimit()) >= 0)
            .reduce((left, right) -> right)
            .orElse(brackets.getFirst());
        return annualTaxableBase
            .multiply(bracket.rate())
            .subtract(bracket.constantAmount())
            .subtract(basicCredit)
            .max(BigDecimal.ZERO);
    }

    private BigDecimal pensionPeriodBase(
        BigDecimal priorYearToDate,
        BigDecimal currentPeriodBase,
        BigDecimal annualCap,
        BigDecimal annualExemption,
        BigDecimal periods
    ) {
        var cappedBase = cappedPeriodBase(priorYearToDate, currentPeriodBase, annualCap);
        var periodExemption = annualExemption.divide(periods, 8, RoundingMode.HALF_UP);
        return cappedBase.subtract(periodExemption).max(BigDecimal.ZERO);
    }

    private BigDecimal cappedPeriodBase(BigDecimal priorYearToDate, BigDecimal currentPeriodBase, BigDecimal annualCap) {
        if (currentPeriodBase == null || currentPeriodBase.compareTo(BigDecimal.ZERO) <= 0 || annualCap == null || annualCap.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }
        var prior = priorYearToDate == null ? BigDecimal.ZERO : priorYearToDate.max(BigDecimal.ZERO);
        var remainingCap = annualCap.subtract(prior).max(BigDecimal.ZERO);
        return currentPeriodBase.min(remainingCap).max(BigDecimal.ZERO);
    }

    private BigDecimal cappedBandPeriodBase(
        BigDecimal priorYearToDate,
        BigDecimal currentPeriodBase,
        BigDecimal lowerAnnualLimit,
        BigDecimal upperAnnualLimit
    ) {
        if (currentPeriodBase == null
            || currentPeriodBase.compareTo(BigDecimal.ZERO) <= 0
            || lowerAnnualLimit == null
            || upperAnnualLimit == null
            || upperAnnualLimit.compareTo(lowerAnnualLimit) <= 0) {
            return BigDecimal.ZERO;
        }
        var prior = priorYearToDate == null ? BigDecimal.ZERO : priorYearToDate.max(BigDecimal.ZERO);
        var currentEnd = prior.add(currentPeriodBase.max(BigDecimal.ZERO));
        var bandStart = prior.max(lowerAnnualLimit);
        var bandEnd = currentEnd.min(upperAnnualLimit);
        return bandEnd.subtract(bandStart).max(BigDecimal.ZERO).min(currentPeriodBase).max(BigDecimal.ZERO);
    }

    private String normalizeProvince(String value) {
        var normalized = normalize(value).replace(" ", "");
        return switch (normalized) {
            case "QUEBEC", "QUÉBEC", "PQ" -> "QC";
            case "" -> "ON";
            default -> normalized.length() == 2 ? normalized : "ON";
        };
    }
}
