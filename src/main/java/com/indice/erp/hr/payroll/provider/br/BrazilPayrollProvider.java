package com.indice.erp.hr.payroll.provider.br;

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
public class BrazilPayrollProvider extends AbstractPayrollCountryProvider {

    private static final BigDecimal INSS_MAX_BASE = new BigDecimal("8475.55");
    private static final BigDecimal IRRF_SIMPLIFIED_DEDUCTION = new BigDecimal("607.20");
    private static final BigDecimal IRRF_DEPENDENT_DEDUCTION = new BigDecimal("189.59");
    private static final BigDecimal IRRF_FULL_REDUCTION_LIMIT = new BigDecimal("5000.00");
    private static final BigDecimal IRRF_PHASEOUT_LIMIT = new BigDecimal("7350.00");
    private static final BigDecimal IRRF_MAX_MONTHLY_REDUCTION = new BigDecimal("312.89");
    private static final BigDecimal IRRF_PHASEOUT_INTERCEPT = new BigDecimal("978.62");
    private static final BigDecimal IRRF_PHASEOUT_RATE = new BigDecimal("0.133145");
    private static final BigDecimal EMPLOYER_INSS_RATE = new BigDecimal("0.20");
    private static final BigDecimal FGTS_STANDARD_RATE = new BigDecimal("0.08");
    private static final BigDecimal RAT_DEFAULT_RATE = new BigDecimal("0.02");
    private static final BigDecimal FAP_DEFAULT = BigDecimal.ONE;
    private static final BigDecimal THIRD_PARTIES_RATE = new BigDecimal("0.058");
    private static final BigDecimal VACATION_PROVISION_RATE = new BigDecimal("0.08333333");
    private static final BigDecimal VACATION_BONUS_RATE = new BigDecimal("0.02777778");
    private static final BigDecimal THIRTEENTH_RATE = new BigDecimal("0.08333333");
    private static final BigDecimal FGTS_FINE_RATE = new BigDecimal("0.032");

    public BrazilPayrollProvider(PayrollRuleResolver ruleResolver) {
        super(ruleResolver);
    }

    @Override
    public String providerCode() {
        return "br";
    }

    @Override
    public boolean supports(String countryCode) {
        return "BR".equals(ruleResolver.normalizeCountry(countryCode));
    }

    @Override
    public List<PayrollCalculatedLineItem> calculateLine(PayrollCalculationContext context, BigDecimal taxableBase) {
        var items = new ArrayList<PayrollCalculatedLineItem>();
        var periodEndDate = context.periodEndDate();
        var periodsPerYear = annualPeriods(context.payrollFrequency(), new BigDecimal("12"));
        var monthlyFactor = periodsPerYear.divide(new BigDecimal("12"), 8, RoundingMode.HALF_UP);
        var monthlyTaxableBase = taxableBase.multiply(monthlyFactor);
        var inssRule = ruleResolver.resolveRuleSet("BR", "", "INSS_EMPLOYEE", periodEndDate);
        var irrfRule = ruleResolver.resolveRuleSet("BR", "", "IRRF_MONTHLY", periodEndDate);
        var employerRule = ruleResolver.resolveRuleSet("BR", "", "EMPLOYER_SOCIAL_CONTRIBUTIONS", periodEndDate);
        var benefitsRule = ruleResolver.resolveRuleSet("BR", "", "BENEFITS", periodEndDate);
        var inssParams = ruleResolver.parametersByCode("BR", "", "INSS_EMPLOYEE", periodEndDate);
        var irrfParams = ruleResolver.parametersByCode("BR", "", "IRRF_MONTHLY", periodEndDate);
        var employerParams = ruleResolver.parametersByCode("BR", "", "EMPLOYER_SOCIAL_CONTRIBUTIONS", periodEndDate);
        var benefitsParams = ruleResolver.parametersByCode("BR", "", "BENEFITS", periodEndDate);

        var employeeInssMonthly = calculateEmployeeInss(monthlyTaxableBase, periodEndDate);
        var simplifiedDeduction = decimalParam(irrfParams, "simplified_monthly_deduction", IRRF_SIMPLIFIED_DEDUCTION);
        var dependentDeduction = decimalParam(irrfParams, "dependent_monthly_deduction", IRRF_DEPENDENT_DEDUCTION);
        var dependentCount = decimalParam(irrfParams, "default_dependents", BigDecimal.ZERO);
        var irrfTaxableBase = monthlyTaxableBase
            .subtract(employeeInssMonthly)
            .subtract(simplifiedDeduction)
            .subtract(dependentDeduction.multiply(dependentCount))
            .max(BigDecimal.ZERO);
        var irrfMonthly = calculateIrrf(irrfTaxableBase, monthlyTaxableBase, periodEndDate);
        var employeeInss = prorateMonthly(employeeInssMonthly, monthlyFactor);
        var irrf = prorateMonthly(irrfMonthly, monthlyFactor);

        var employerInss = taxableBase.multiply(decimalParam(employerParams, "employer_inss_rate", EMPLOYER_INSS_RATE));
        var fgts = taxableBase.multiply(decimalParam(employerParams, "fgts_standard_rate", FGTS_STANDARD_RATE));
        var rat = taxableBase
            .multiply(decimalParam(employerParams, "rat_rate", RAT_DEFAULT_RATE))
            .multiply(decimalParam(employerParams, "fap_multiplier", FAP_DEFAULT));
        var thirdParties = taxableBase.multiply(decimalParam(employerParams, "third_parties_rate", THIRD_PARTIES_RATE));
        var vacationProvision = taxableBase.multiply(decimalParam(employerParams, "vacation_provision_rate", VACATION_PROVISION_RATE));
        var vacationBonusProvision = taxableBase.multiply(decimalParam(employerParams, "vacation_bonus_provision_rate", VACATION_BONUS_RATE));
        var thirteenthProvision = taxableBase.multiply(decimalParam(employerParams, "thirteenth_salary_provision_rate", THIRTEENTH_RATE));
        var fgtsFineProvision = taxableBase.multiply(decimalParam(employerParams, "fgts_fine_provision_rate", FGTS_FINE_RATE));
        var transportationVoucher = taxableBase.multiply(
            decimalParam(benefitsParams, "transportation_voucher_employee_rate", BigDecimal.ZERO)
                .min(decimalParam(benefitsParams, "transportation_voucher_employee_rate_cap", new BigDecimal("0.06")))
        );
        var mealBenefitsDeduction = taxableBase.multiply(decimalParam(benefitsParams, "meal_benefits_employee_rate", BigDecimal.ZERO));

        addItem(items, context, "BR_INSS_EMP", "deduction", "INSS segurado", employeeInss, 90, "social_security", "INSS segurado", "INSS_EMPLOYEE", inssRule, "tabela progressiva mensal prorateada", monthlyTaxableBase, null);
        addItem(items, context, "BR_IRRF", "deduction", "IRRF", irrf, 92, "income_tax", "Imposto de Renda Retido na Fonte", "IRRF_MONTHLY", irrfRule, "base IRRF mensal prorateada", irrfTaxableBase, null);
        addItem(items, context, "BR_VALE_TRANSPORTE", "deduction", "Vale-transporte", transportationVoucher, 96, "benefit_deduction", "Vale-transporte", "BENEFITS", benefitsRule, "remuneração * taxa empregado", taxableBase, decimalParam(benefitsParams, "transportation_voucher_employee_rate", BigDecimal.ZERO));
        addItem(items, context, "BR_BENEFITS_DEDUCTION", "deduction", "Desconto benefícios", mealBenefitsDeduction, 98, "benefit_deduction", "Benefícios", "BENEFITS", benefitsRule, "remuneração * taxa empregado", taxableBase, decimalParam(benefitsParams, "meal_benefits_employee_rate", BigDecimal.ZERO));
        addItem(items, context, "EMPLOYER_BR_INSS", "employer_contribution", "INSS patronal", employerInss, 110, "employer_social_security", "INSS patronal", "EMPLOYER_SOCIAL_CONTRIBUTIONS", employerRule, "remuneração * 20%", taxableBase, decimalParam(employerParams, "employer_inss_rate", EMPLOYER_INSS_RATE));
        addItem(items, context, "EMPLOYER_FGTS", "employer_contribution", "FGTS", fgts, 112, "employer_fund", "FGTS", "EMPLOYER_SOCIAL_CONTRIBUTIONS", employerRule, "remuneração * FGTS", taxableBase, decimalParam(employerParams, "fgts_standard_rate", FGTS_STANDARD_RATE));
        addItem(items, context, "EMPLOYER_RAT", "employer_contribution", "RAT/SAT ajustado por FAP", rat, 114, "work_accident", "RAT/SAT/FAP", "EMPLOYER_SOCIAL_CONTRIBUTIONS", employerRule, "remuneração * RAT * FAP", taxableBase, decimalParam(employerParams, "rat_rate", RAT_DEFAULT_RATE));
        addItem(items, context, "EMPLOYER_THIRD_PARTIES", "employer_contribution", "Terceiros / Sistema S", thirdParties, 116, "third_party_contributions", "Terceiros", "EMPLOYER_SOCIAL_CONTRIBUTIONS", employerRule, "remuneração * terceiros", taxableBase, decimalParam(employerParams, "third_parties_rate", THIRD_PARTIES_RATE));
        addItem(items, context, "EMPLOYER_BR_VACATION_PROVISION", "employer_contribution", "Provisão de férias", vacationProvision, 118, "provision", "Provisão férias", "EMPLOYER_SOCIAL_CONTRIBUTIONS", employerRule, "remuneração * 1/12", taxableBase, decimalParam(employerParams, "vacation_provision_rate", VACATION_PROVISION_RATE));
        addItem(items, context, "EMPLOYER_BR_VACATION_BONUS_PROVISION", "employer_contribution", "Provisão 1/3 constitucional de férias", vacationBonusProvision, 120, "provision", "Provisão 1/3 férias", "EMPLOYER_SOCIAL_CONTRIBUTIONS", employerRule, "remuneração * 1/3 de 1/12", taxableBase, decimalParam(employerParams, "vacation_bonus_provision_rate", VACATION_BONUS_RATE));
        addItem(items, context, "EMPLOYER_BR_13TH_SALARY_PROVISION", "employer_contribution", "Provisão 13º salário", thirteenthProvision, 122, "provision", "13º salário", "EMPLOYER_SOCIAL_CONTRIBUTIONS", employerRule, "remuneração * 1/12", taxableBase, decimalParam(employerParams, "thirteenth_salary_provision_rate", THIRTEENTH_RATE));
        addItem(items, context, "EMPLOYER_BR_FGTS_FINE_PROVISION", "employer_contribution", "Provisão multa FGTS 40%", fgtsFineProvision, 124, "provision", "Multa FGTS", "EMPLOYER_SOCIAL_CONTRIBUTIONS", employerRule, "remuneração * 3.2%", taxableBase, decimalParam(employerParams, "fgts_fine_provision_rate", FGTS_FINE_RATE));
        return items;
    }

    private BigDecimal calculateEmployeeInss(BigDecimal monthlyTaxableBase, LocalDate periodEndDate) {
        var params = ruleResolver.parametersByCode("BR", "", "INSS_EMPLOYEE", periodEndDate);
        var contributionBase = monthlyTaxableBase.min(decimalParam(params, "max_contribution_base", INSS_MAX_BASE));
        var brackets = ruleResolver.bracketsByCode("BR", "", "INSS_EMPLOYEE", periodEndDate);
        var amount = BigDecimal.ZERO;
        for (var bracket : brackets) {
            var upper = bracket.upperLimit() == null ? contributionBase : contributionBase.min(bracket.upperLimit());
            var base = upper.subtract(bracket.lowerLimit()).max(BigDecimal.ZERO);
            if (base.compareTo(BigDecimal.ZERO) > 0) {
                amount = amount.add(base.multiply(bracket.rate()));
            }
        }
        return amount.max(BigDecimal.ZERO);
    }

    private BigDecimal calculateIrrf(BigDecimal monthlyTaxableBase, BigDecimal monthlyGrossTaxableIncome, LocalDate periodEndDate) {
        var brackets = ruleResolver.bracketsByCode("BR", "", "IRRF_MONTHLY", periodEndDate);
        if (brackets.isEmpty()) {
            return BigDecimal.ZERO;
        }
        var bracket = brackets.stream()
            .filter((candidate) -> monthlyTaxableBase.compareTo(candidate.lowerLimit()) >= 0)
            .filter((candidate) -> candidate.upperLimit() == null || monthlyTaxableBase.compareTo(candidate.upperLimit()) <= 0)
            .findFirst()
            .orElse(brackets.getLast());
        var grossTax = monthlyTaxableBase.multiply(bracket.rate()).subtract(bracket.fixedAmount()).max(BigDecimal.ZERO);
        return grossTax.subtract(calculateIrrfReduction(grossTax, monthlyGrossTaxableIncome, periodEndDate)).max(BigDecimal.ZERO);
    }

    private BigDecimal calculateIrrfReduction(BigDecimal grossTax, BigDecimal monthlyGrossTaxableIncome, LocalDate periodEndDate) {
        var params = ruleResolver.parametersByCode("BR", "", "IRRF_MONTHLY", periodEndDate);
        var fullLimit = decimalParam(params, "reduction_full_limit", IRRF_FULL_REDUCTION_LIMIT);
        var phaseoutLimit = decimalParam(params, "reduction_phaseout_limit", IRRF_PHASEOUT_LIMIT);
        if (monthlyGrossTaxableIncome.compareTo(fullLimit) <= 0) {
            return grossTax.min(decimalParam(params, "max_monthly_reduction", IRRF_MAX_MONTHLY_REDUCTION));
        }
        if (monthlyGrossTaxableIncome.compareTo(phaseoutLimit) <= 0) {
            return decimalParam(params, "reduction_phaseout_intercept", IRRF_PHASEOUT_INTERCEPT)
                .subtract(monthlyGrossTaxableIncome.multiply(decimalParam(params, "reduction_phaseout_rate", IRRF_PHASEOUT_RATE)))
                .max(BigDecimal.ZERO)
                .min(grossTax);
        }
        return BigDecimal.ZERO;
    }

    private BigDecimal prorateMonthly(BigDecimal monthlyAmount, BigDecimal monthlyFactor) {
        if (monthlyFactor.compareTo(BigDecimal.ZERO) <= 0) {
            return monthlyAmount;
        }
        return monthlyAmount.divide(monthlyFactor, 8, RoundingMode.HALF_UP);
    }
}
