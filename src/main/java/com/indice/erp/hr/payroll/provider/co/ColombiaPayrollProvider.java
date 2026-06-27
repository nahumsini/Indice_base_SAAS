package com.indice.erp.hr.payroll.provider.co;

import com.indice.erp.hr.payroll.engine.PayrollCalculatedLineItem;
import com.indice.erp.hr.payroll.engine.PayrollCalculationContext;
import com.indice.erp.hr.payroll.engine.PayrollLineCalculationResult;
import com.indice.erp.hr.payroll.engine.PayrollRuleResolver;
import com.indice.erp.hr.payroll.provider.AbstractPayrollCountryProvider;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Service;

@Service
public class ColombiaPayrollProvider extends AbstractPayrollCountryProvider {

    private static final BigDecimal SMMLV_2026 = new BigDecimal("1750905.00");
    private static final BigDecimal UVT_2026 = new BigDecimal("52374.00");
    private static final BigDecimal IBC_MIN_SMMLV = BigDecimal.ONE;
    private static final BigDecimal IBC_MAX_SMMLV = new BigDecimal("25");
    private static final BigDecimal EMPLOYEE_HEALTH_RATE = new BigDecimal("0.04");
    private static final BigDecimal EMPLOYEE_PENSION_RATE = new BigDecimal("0.04");
    private static final BigDecimal EMPLOYER_HEALTH_RATE = new BigDecimal("0.085");
    private static final BigDecimal EMPLOYER_PENSION_RATE = new BigDecimal("0.12");
    private static final BigDecimal EMPLOYER_EXEMPTION_THRESHOLD_SMMLV = new BigDecimal("10");
    private static final BigDecimal SOLIDARITY_SUBACCOUNT_RATE = new BigDecimal("0.005");
    private static final BigDecimal ARL_CLASS_I_RATE = new BigDecimal("0.00522");
    private static final BigDecimal CCF_RATE = new BigDecimal("0.04");
    private static final BigDecimal ICBF_RATE = new BigDecimal("0.03");
    private static final BigDecimal SENA_RATE = new BigDecimal("0.02");
    private static final BigDecimal CESANTIAS_RATE = new BigDecimal("0.08333333");
    private static final BigDecimal CESANTIAS_INTEREST_MONTHLY_RATE = new BigDecimal("0.01000000");
    private static final BigDecimal PRIMA_RATE = new BigDecimal("0.08333333");
    private static final BigDecimal VACATION_RATE = new BigDecimal("0.04166667");
    private static final BigDecimal INTEGRAL_SALARY_MINIMUM_SMMLV = new BigDecimal("13");
    private static final BigDecimal INTEGRAL_SALARY_IBC_FACTOR = new BigDecimal("0.70");
    private static final BigDecimal WITHHOLDING_DEPENDENT_RATE = new BigDecimal("0.10");
    private static final BigDecimal WITHHOLDING_DEPENDENT_MAX_UVT = new BigDecimal("32");
    private static final BigDecimal WITHHOLDING_PREPAID_MEDICINE_MAX_UVT = new BigDecimal("16");
    private static final BigDecimal WITHHOLDING_GENERAL_CAP_RATE = new BigDecimal("0.40");
    private static final BigDecimal WITHHOLDING_GENERAL_CAP_UVT_MONTHLY = new BigDecimal("420");
    private static final BigDecimal WITHHOLDING_LABOR_EXEMPT_RATE = new BigDecimal("0.25");
    private static final BigDecimal WITHHOLDING_LABOR_EXEMPT_CAP_UVT_MONTHLY = new BigDecimal("65.83333333");
    private static final BigDecimal DAYS_IN_PAYROLL_YEAR = new BigDecimal("360");
    private static final BigDecimal DAYS_IN_PAYROLL_MONTH = new BigDecimal("30");
    private static final BigDecimal VACATION_LIQUIDATION_DIVISOR = new BigDecimal("720");
    private static final BigDecimal CESANTIAS_INTEREST_ANNUAL_RATE = new BigDecimal("0.12");
    private static final Set<String> TERMINATION_CODES = Set.of("RET", "TER", "TERMINATION", "LIQ", "LIQUIDACION");
    private static final Set<String> RETROACTIVE_CODES = Set.of("RETRO", "RETROACTIVO", "AJR", "VSP");
    private static final Set<String> CORRECTION_CODES = Set.of("CORR", "CORRECCION", "AJUSTE", "ADJ");

    public ColombiaPayrollProvider(PayrollRuleResolver ruleResolver) {
        super(ruleResolver);
    }

    @Override
    public String providerCode() {
        return "co";
    }

    @Override
    public boolean supports(String countryCode) {
        return "CO".equals(ruleResolver.normalizeCountry(countryCode));
    }

    @Override
    public List<PayrollCalculatedLineItem> calculateLine(PayrollCalculationContext context, BigDecimal taxableBase) {
        var items = new ArrayList<PayrollCalculatedLineItem>();
        if (taxableBase == null || taxableBase.compareTo(BigDecimal.ZERO) <= 0) {
            return items;
        }

        var periodEndDate = context.periodEndDate();
        var profile = context.countryProfile();
        var periodsPerYear = annualPeriods(context.payrollFrequency(), new BigDecimal("24"));
        var monthlyFactor = periodsPerYear.divide(new BigDecimal("12"), 8, RoundingMode.HALF_UP);

        var socialSecurityRule = ruleResolver.resolveRuleSet("CO", "", "SOCIAL_SECURITY", periodEndDate);
        var arlRule = ruleResolver.resolveRuleSet("CO", "", "ARL", periodEndDate);
        var parafiscalRule = ruleResolver.resolveRuleSet("CO", "", "PARAFISCAL", periodEndDate);
        var solidarityRule = ruleResolver.resolveRuleSet("CO", "", "SOLIDARITY_FUND", periodEndDate);
        var provisionRule = ruleResolver.resolveRuleSet("CO", "", "LABOR_PROVISIONS", periodEndDate);
        var withholdingRule = ruleResolver.resolveRuleSet("CO", "", "WITHHOLDING_TAX", periodEndDate);

        var socialParams = ruleResolver.parametersByCode("CO", "", "SOCIAL_SECURITY", periodEndDate);
        var arlParams = ruleResolver.parametersByCode("CO", "", "ARL", periodEndDate);
        var parafiscalParams = ruleResolver.parametersByCode("CO", "", "PARAFISCAL", periodEndDate);
        var provisionParams = ruleResolver.parametersByCode("CO", "", "LABOR_PROVISIONS", periodEndDate);
        var withholdingParams = ruleResolver.parametersByCode("CO", "", "WITHHOLDING_TAX", periodEndDate);
        var solidarityBrackets = ruleResolver.bracketsByCode("CO", "", "SOLIDARITY_FUND", periodEndDate);
        var withholdingBrackets = ruleResolver.bracketsByCode("CO", "", "WITHHOLDING_TAX", periodEndDate);

        var smmlv = decimalParam(socialParams, "smmlv_monthly", SMMLV_2026);
        var integralSalary = Boolean.TRUE.equals(profile.integralSalary());
        var disablesCesantias = integralSalary && decimalParam(provisionParams, "integral_salary_disables_cesantias", BigDecimal.ONE).compareTo(BigDecimal.ZERO) > 0;
        var disablesPrima = integralSalary && decimalParam(provisionParams, "integral_salary_disables_prima", BigDecimal.ONE).compareTo(BigDecimal.ZERO) > 0;
        var countryNoveltyItems = countryNoveltyItems(
            context,
            taxableBase,
            profile,
            smmlv,
            provisionRule,
            provisionParams,
            disablesCesantias,
            disablesPrima
        );
        items.addAll(countryNoveltyItems);

        var noveltyIbcImpactPeriod = standaloneNoveltyIbcImpact(profile);
        var noveltySocialSecurityImpact = noveltyAmountImpact(countryNoveltyItems, true);
        var noveltyWithholdingImpact = noveltyTaxableImpact(countryNoveltyItems);
        var integralIbcFactor = decimalParam(socialParams, "integral_salary_ibc_factor", INTEGRAL_SALARY_IBC_FACTOR);
        var socialBasePeriod = taxableBase
            .add(noveltySocialSecurityImpact)
            .add(noveltyIbcImpactPeriod)
            .max(BigDecimal.ZERO);
        var withholdingBasePeriod = taxableBase
            .add(noveltyWithholdingImpact)
            .max(BigDecimal.ZERO);
        var monthlySocialBase = socialBasePeriod.multiply(monthlyFactor);
        var monthlyWithholdingBase = withholdingBasePeriod.multiply(monthlyFactor);
        var rawIbcMonthly = integralSalary
            ? monthlySocialBase.multiply(integralIbcFactor)
            : monthlySocialBase;
        var ibcMonthly = clamp(
            rawIbcMonthly,
            smmlv.multiply(decimalParam(socialParams, "ibc_min_smmlv", IBC_MIN_SMMLV)),
            smmlv.multiply(decimalParam(socialParams, "ibc_max_smmlv", IBC_MAX_SMMLV))
        );
        var ibcPeriod = prorateMonthly(ibcMonthly, monthlyFactor);

        var employeeHealthRate = decimalParam(socialParams, "employee_health_rate", EMPLOYEE_HEALTH_RATE);
        var employeePensionRate = decimalParam(socialParams, "employee_pension_rate", EMPLOYEE_PENSION_RATE);
        var employerHealthRate = decimalParam(socialParams, "employer_health_rate", EMPLOYER_HEALTH_RATE);
        var employerPensionRate = decimalParam(socialParams, "employer_pension_rate", EMPLOYER_PENSION_RATE);
        var monthlyExemptionThreshold = smmlv.multiply(
            decimalParam(socialParams, "employer_exemption_threshold_smmlv", EMPLOYER_EXEMPTION_THRESHOLD_SMMLV)
        );
        var automaticExemption = decimalParam(socialParams, "apply_employer_exemption_under_threshold", BigDecimal.ONE)
            .compareTo(BigDecimal.ZERO) > 0
            && monthlySocialBase.compareTo(monthlyExemptionThreshold) < 0;
        var employerHealthApplies = profile.employerHealthExemptionApplies() == null
            ? !automaticExemption
            : !profile.employerHealthExemptionApplies();
        var senaApplies = profile.senaApplies() == null ? !automaticExemption : profile.senaApplies();
        var icbfApplies = profile.icbfApplies() == null ? !automaticExemption : profile.icbfApplies();
        var ccfApplies = profile.ccfApplies() == null || profile.ccfApplies();

        var solidarityTotalRate = solidarityRate(monthlySocialBase, smmlv, solidarityBrackets);
        var solidarityRate = solidarityTotalRate.compareTo(BigDecimal.ZERO) > 0
            ? decimalParam(socialParams, "solidarity_subaccount_rate", SOLIDARITY_SUBACCOUNT_RATE).min(solidarityTotalRate)
            : BigDecimal.ZERO;
        var subsistenceRate = solidarityTotalRate.subtract(solidarityRate).max(BigDecimal.ZERO);

        addItem(items, context, "CO_EPS_EMPLOYEE", "deduction", "EPS trabajador", ibcPeriod.multiply(employeeHealthRate), 90, "social_security", "Aporte obligatorio salud trabajador", "SOCIAL_SECURITY", socialSecurityRule, "IBC del periodo * 4%", ibcPeriod, employeeHealthRate);
        addItem(items, context, "CO_AFP_EMPLOYEE", "deduction", "AFP trabajador", ibcPeriod.multiply(employeePensionRate), 92, "pension", "Aporte obligatorio pensión trabajador", "SOCIAL_SECURITY", socialSecurityRule, "IBC del periodo * 4%", ibcPeriod, employeePensionRate);
        addItem(items, context, "CO_SOLIDARITY_FUND", "deduction", "Fondo de Solidaridad Pensional", ibcPeriod.multiply(solidarityRate), 94, "solidarity_fund", "Subcuenta de solidaridad", "SOLIDARITY_FUND", solidarityRule, "IBC del periodo * tarifa subcuenta solidaridad", ibcPeriod, solidarityRate);
        addItem(items, context, "CO_SUBSISTENCE_FUND", "deduction", "Fondo de Subsistencia", ibcPeriod.multiply(subsistenceRate), 96, "subsistence_fund", "Subcuenta de subsistencia", "SOLIDARITY_FUND", solidarityRule, "IBC del periodo * tarifa subcuenta subsistencia", ibcPeriod, subsistenceRate);

        var withholding = withholdingTax(
            context,
            withholdingBasePeriod,
            monthlyFactor,
            monthlyWithholdingBase,
            ibcMonthly,
            employeeHealthRate,
            employeePensionRate,
            solidarityRate,
            subsistenceRate,
            withholdingParams,
            withholdingBrackets
        );
        addItem(items, context, "CO_WITHHOLDING_TAX", "deduction", "Retención en la fuente", withholding.periodAmount(), 98, "income_tax", "Retención en la fuente procedimiento 1", "WITHHOLDING_TAX", withholdingRule, withholding.formula(), withholding.taxableMonthlyBase(), withholding.effectiveRate());

        if (employerHealthApplies) {
            addItem(items, context, "CO_EPS_EMPLOYER", "employer_contribution", "EPS empleador", ibcPeriod.multiply(employerHealthRate), 110, "employer_social_security", "Aporte salud empleador", "SOCIAL_SECURITY", socialSecurityRule, "IBC del periodo * 8.5%", ibcPeriod, employerHealthRate);
        }
        var arlRate = resolveArlRate(arlParams, profile, periodEndDate);
        addItem(items, context, "CO_AFP_EMPLOYER", "employer_contribution", "AFP empleador", ibcPeriod.multiply(employerPensionRate), 112, "employer_pension", "Aporte pensión empleador", "SOCIAL_SECURITY", socialSecurityRule, "IBC del periodo * 12%", ibcPeriod, employerPensionRate);
        addItem(items, context, "CO_ARL", "employer_contribution", "ARL", ibcPeriod.multiply(arlRate), 114, "occupational_risk", "Administradora de Riesgos Laborales", "ARL", arlRule, "IBC del periodo * tarifa clase de riesgo", ibcPeriod, arlRate);
        if (ccfApplies) {
            addItem(items, context, "CO_CCF", "employer_contribution", "Caja de compensación familiar", ibcPeriod.multiply(decimalParam(parafiscalParams, "ccf_rate", CCF_RATE)), 116, "parafiscal", "Subsidio familiar - CCF", "PARAFISCAL", parafiscalRule, "IBC del periodo * 4%", ibcPeriod, decimalParam(parafiscalParams, "ccf_rate", CCF_RATE));
        }
        if (icbfApplies) {
            addItem(items, context, "CO_ICBF", "employer_contribution", "ICBF", ibcPeriod.multiply(decimalParam(parafiscalParams, "icbf_rate", ICBF_RATE)), 118, "parafiscal", "Instituto Colombiano de Bienestar Familiar", "PARAFISCAL", parafiscalRule, "IBC del periodo * 3%", ibcPeriod, decimalParam(parafiscalParams, "icbf_rate", ICBF_RATE));
        }
        if (senaApplies) {
            addItem(items, context, "CO_SENA", "employer_contribution", "SENA", ibcPeriod.multiply(decimalParam(parafiscalParams, "sena_rate", SENA_RATE)), 120, "parafiscal", "Servicio Nacional de Aprendizaje", "PARAFISCAL", parafiscalRule, "IBC del periodo * 2%", ibcPeriod, decimalParam(parafiscalParams, "sena_rate", SENA_RATE));
        }

        var provisionBase = integralSalary
            ? taxableBase.multiply(decimalParam(provisionParams, "integral_salary_vacation_base_factor", integralIbcFactor))
            : taxableBase;
        if (!disablesCesantias) {
            addItem(items, context, "CO_SEVERANCE_CESANTIAS", "employer_contribution", "Provisión cesantías", provisionBase.multiply(decimalParam(provisionParams, "cesantias_rate", CESANTIAS_RATE)), 130, "provision", "Auxilio de cesantías", "LABOR_PROVISIONS", provisionRule, "base prestacional * 1/12", provisionBase, decimalParam(provisionParams, "cesantias_rate", CESANTIAS_RATE));
            addItem(items, context, "CO_SEVERANCE_INTEREST", "employer_contribution", "Intereses sobre cesantías", provisionBase.multiply(decimalParam(provisionParams, "cesantias_interest_monthly_rate", CESANTIAS_INTEREST_MONTHLY_RATE)), 132, "provision", "Intereses a las cesantías", "LABOR_PROVISIONS", provisionRule, "base prestacional * 1%", provisionBase, decimalParam(provisionParams, "cesantias_interest_monthly_rate", CESANTIAS_INTEREST_MONTHLY_RATE));
        }
        if (!disablesPrima) {
            addItem(items, context, "CO_SERVICE_BONUS_PRIMA", "employer_contribution", "Provisión prima de servicios", provisionBase.multiply(decimalParam(provisionParams, "prima_services_rate", PRIMA_RATE)), 134, "provision", "Prima de servicios", "LABOR_PROVISIONS", provisionRule, "base prestacional * 1/12", provisionBase, decimalParam(provisionParams, "prima_services_rate", PRIMA_RATE));
        }
        addItem(items, context, "CO_VACATION_PROVISION", "employer_contribution", "Provisión vacaciones", provisionBase.multiply(decimalParam(provisionParams, "vacation_rate", VACATION_RATE)), 136, "provision", "Vacaciones", "LABOR_PROVISIONS", provisionRule, "base prestacional * 15/360", provisionBase, decimalParam(provisionParams, "vacation_rate", VACATION_RATE));

        return items;
    }

    @Override
    public List<String> calculationWarnings(
        PayrollCalculationContext context,
        BigDecimal taxableBase,
        List<PayrollCalculatedLineItem> items
    ) {
        var warnings = new ArrayList<String>();
        if (taxableBase == null || taxableBase.compareTo(BigDecimal.ZERO) <= 0) {
            return warnings;
        }

        var profile = context.countryProfile();
        var socialParams = ruleResolver.parametersByCode("CO", "", "SOCIAL_SECURITY", context.periodEndDate());
        var periodsPerYear = annualPeriods(context.payrollFrequency(), new BigDecimal("24"));
        var monthlyFactor = periodsPerYear.divide(new BigDecimal("12"), 8, RoundingMode.HALF_UP);
        var monthlyTaxableBase = taxableBase.add(standaloneNoveltyIbcImpact(profile)).max(BigDecimal.ZERO).multiply(monthlyFactor);
        if (Boolean.TRUE.equals(profile.integralSalary())) {
            var smmlv = decimalParam(socialParams, "smmlv_monthly", SMMLV_2026);
            var minimumIntegralSalary = smmlv.multiply(decimalParam(socialParams, "integral_salary_minimum_smmlv", INTEGRAL_SALARY_MINIMUM_SMMLV));
            if (monthlyTaxableBase.compareTo(minimumIntegralSalary) < 0) {
                warnings.add("El salario integral marcado para Colombia está por debajo de 13 SMMLV; se calcula, pero requiere revisión laboral antes de aprobar.");
            }
        }
        if (profile.arlClass().compareTo(BigDecimal.ZERO) <= 0) {
            warnings.add("Clase ARL no configurada para Colombia; se usó clase I como fallback operativo.");
        }
        if (profile.epsCode().isBlank() || profile.afpCode().isBlank() || profile.compensationFundCode().isBlank()) {
            warnings.add("EPS, AFP o caja de compensación no están completas; el cálculo conserva montos y marca entidades como pendientes.");
        }
        if (profile.contributorType().isBlank() || profile.metadata().isEmpty()) {
            warnings.add("Perfil tributario/laboral colombiano incompleto; revisar tipo de cotizante, subtipo y parámetros del empleado.");
        }
        var smmlv = decimalParam(socialParams, "smmlv_monthly", SMMLV_2026);
        var monthlyExemptionThreshold = smmlv.multiply(
            decimalParam(socialParams, "employer_exemption_threshold_smmlv", EMPLOYER_EXEMPTION_THRESHOLD_SMMLV)
        );
        var automaticExemption = decimalParam(socialParams, "apply_employer_exemption_under_threshold", BigDecimal.ONE)
            .compareTo(BigDecimal.ZERO) > 0
            && monthlyTaxableBase.compareTo(monthlyExemptionThreshold) < 0;
        if (automaticExemption
            && (profile.employerHealthExemptionApplies() == null || profile.senaApplies() == null || profile.icbfApplies() == null)) {
            warnings.add("Exoneración de salud patronal/SENA/ICBF aplicada por regla bajo 10 SMMLV sin configuración explícita de empresa.");
        }
        if (isProcedure2(profile) && profile.procedure2FixedRate().compareTo(BigDecimal.ZERO) <= 0) {
            warnings.add("Retención en la fuente procedimiento 2 solicitada sin porcentaje fijo certificado; se aplicó procedimiento 1 como fallback auditable.");
        }
        warnings.addAll(countryNoveltyWarnings(profile));
        return warnings;
    }

    @Override
    public Map<String, Object> buildAuditBreakdown(
        PayrollCalculationContext context,
        PayrollLineCalculationResult result
    ) {
        var profile = context.countryProfile();
        var socialParams = ruleResolver.parametersByCode("CO", "", "SOCIAL_SECURITY", context.periodEndDate());
        var withholdingParams = ruleResolver.parametersByCode("CO", "", "WITHHOLDING_TAX", context.periodEndDate());
        var periodsPerYear = annualPeriods(context.payrollFrequency(), new BigDecimal("24"));
        var monthlyFactor = periodsPerYear.divide(new BigDecimal("12"), 8, RoundingMode.HALF_UP);
        var smmlv = decimalParam(socialParams, "smmlv_monthly", SMMLV_2026);
        var uvt = decimalParam(withholdingParams, "uvt_value", UVT_2026);
        var monthlyTaxableBase = result.taxableBase().add(standaloneNoveltyIbcImpact(profile)).max(BigDecimal.ZERO).multiply(monthlyFactor);
        var monthlyExemptionThreshold = smmlv.multiply(
            decimalParam(socialParams, "employer_exemption_threshold_smmlv", EMPLOYER_EXEMPTION_THRESHOLD_SMMLV)
        );
        var automaticExemption = decimalParam(socialParams, "apply_employer_exemption_under_threshold", BigDecimal.ONE)
            .compareTo(BigDecimal.ZERO) > 0
            && monthlyTaxableBase.compareTo(monthlyExemptionThreshold) < 0;
        var employeeEpsItem = findItem(result.items(), "CO_EPS_EMPLOYEE");
        var withholdingItem = findItem(result.items(), "CO_WITHHOLDING_TAX");
        var arlItem = findItem(result.items(), "CO_ARL");
        var body = new LinkedHashMap<String, Object>();
        body.put("provider", providerCode());
        body.put("country", context.country());
        body.put("jurisdiction", context.jurisdiction());
        body.put("taxableBase", result.taxableBase());
        body.put("grossEarnings", result.grossAmount());
        body.put("employeeDeductions", result.deductionsAmount());
        body.put("employerContributions", result.employerContributionsAmount());
        body.put("netPay", result.netAmount());
        body.put("totalPayrollCost", result.totalPayrollCost());
        body.put("contributorType", profile.contributorType());
        body.put("contributorSubtype", profile.contributorSubtype());
        body.put("integralSalary", profile.integralSalary());
        body.put("arlClass", profile.arlClass());
        body.put("smmlv", smmlv);
        body.put("uvt", uvt);
        body.put("ibc", ibcSnapshot(employeeEpsItem, monthlyFactor, smmlv));
        body.put("withholding", withholdingSnapshot(profile, withholdingItem, uvt));
        body.put("exoneration", exonerationSnapshot(profile, automaticExemption, result.items()));
        body.put("eps", entitySnapshot(profile.epsCode(), profile.epsName()));
        body.put("afp", entitySnapshot(profile.afpCode(), profile.afpName()));
        body.put("compensationFund", entitySnapshot(profile.compensationFundCode(), profile.compensationFundName()));
        body.put("arlRate", arlItem == null || arlItem.rateApplied() == null ? BigDecimal.ZERO : arlItem.rateApplied());
        body.put("novelties", profile.novelties());
        body.put("standaloneNoveltyIbcImpact", standaloneNoveltyIbcImpact(profile));
        body.put("specialNoveltyItems", result.items().stream()
            .filter((item) -> item.code().startsWith("CO_RETROACTIVE_")
                || item.code().startsWith("CO_CORRECTION_")
                || item.code().startsWith("CO_TERMINATION_"))
            .map(this::lineItemBreakdown)
            .toList());
        body.put("lineItems", result.items().stream()
            .filter((item) -> item.code().startsWith("CO_"))
            .map(this::lineItemBreakdown)
            .toList());
        return body;
    }

    private WithholdingResult withholdingTax(
        PayrollCalculationContext context,
        BigDecimal taxableBase,
        BigDecimal monthlyFactor,
        BigDecimal monthlyTaxableBase,
        BigDecimal ibcMonthly,
        BigDecimal employeeHealthRate,
        BigDecimal employeePensionRate,
        BigDecimal solidarityRate,
        BigDecimal subsistenceRate,
        Map<String, BigDecimal> withholdingParams,
        List<PayrollRuleResolver.RuleBracket> withholdingBrackets
    ) {
        var profile = context.countryProfile();
        var mandatorySocial = ibcMonthly
            .multiply(employeeHealthRate.add(employeePensionRate).add(solidarityRate).add(subsistenceRate));
        var taxableIncomeBeforeDeductions = monthlyTaxableBase.subtract(mandatorySocial).max(BigDecimal.ZERO);
        var uvt = decimalParam(withholdingParams, "uvt_value", UVT_2026);

        var dependentDeduction = boundedDeduction(
            profile.dependentsMonthlyDeduction(),
            taxableIncomeBeforeDeductions.multiply(decimalParam(withholdingParams, "dependent_deduction_rate", WITHHOLDING_DEPENDENT_RATE)),
            uvt.multiply(decimalParam(withholdingParams, "dependent_deduction_max_uvt", WITHHOLDING_DEPENDENT_MAX_UVT))
        );
        var prepaidMedicine = profile.prepaidMedicineMonthly().min(
            uvt.multiply(decimalParam(withholdingParams, "prepaid_medicine_max_uvt", WITHHOLDING_PREPAID_MEDICINE_MAX_UVT))
        );
        var ordinaryDeductions = dependentDeduction
            .add(prepaidMedicine)
            .add(profile.housingInterestMonthly())
            .add(profile.voluntaryPensionMonthly())
            .add(profile.afcMonthly())
            .add(profile.otherExemptIncomeMonthly());
        var laborExemptBase = taxableIncomeBeforeDeductions.subtract(ordinaryDeductions).max(BigDecimal.ZERO);
        var laborExempt = laborExemptBase
            .multiply(decimalParam(withholdingParams, "labor_exempt_income_rate", WITHHOLDING_LABOR_EXEMPT_RATE))
            .min(uvt.multiply(decimalParam(withholdingParams, "labor_exempt_income_cap_uvt_monthly", WITHHOLDING_LABOR_EXEMPT_CAP_UVT_MONTHLY)));
        var allowedDeductionsAndExemptIncome = ordinaryDeductions.add(laborExempt).min(
            taxableIncomeBeforeDeductions
                .multiply(decimalParam(withholdingParams, "exempt_income_general_cap_rate", WITHHOLDING_GENERAL_CAP_RATE))
                .min(uvt.multiply(decimalParam(withholdingParams, "exempt_income_general_cap_uvt_monthly", WITHHOLDING_GENERAL_CAP_UVT_MONTHLY)))
        );
        var taxableMonthlyBase = taxableIncomeBeforeDeductions.subtract(allowedDeductionsAndExemptIncome).max(BigDecimal.ZERO);

        if (isProcedure2(profile) && profile.procedure2FixedRate().compareTo(BigDecimal.ZERO) > 0) {
            var monthlyAmount = taxableMonthlyBase.multiply(profile.procedure2FixedRate());
            return new WithholdingResult(
                prorateMonthly(monthlyAmount, monthlyFactor),
                taxableMonthlyBase,
                profile.procedure2FixedRate(),
                "base mensual depurada * porcentaje fijo procedimiento 2"
            );
        }

        var monthlyAmount = withholdingProcedureOneAmount(taxableMonthlyBase, uvt, withholdingBrackets);
        var effectiveRate = taxableMonthlyBase.compareTo(BigDecimal.ZERO) <= 0
            ? BigDecimal.ZERO
            : monthlyAmount.divide(taxableMonthlyBase, 8, RoundingMode.HALF_UP);
        return new WithholdingResult(
            prorateMonthly(monthlyAmount, monthlyFactor),
            taxableMonthlyBase,
            effectiveRate,
            "tabla mensual art. 383 ET en UVT - procedimiento 1"
        );
    }

    private List<PayrollCalculatedLineItem> countryNoveltyItems(
        PayrollCalculationContext context,
        BigDecimal taxableBase,
        PayrollCalculationContext.CountryPayrollProfile profile,
        BigDecimal smmlv,
        PayrollRuleResolver.RuleSet provisionRule,
        Map<String, BigDecimal> provisionParams,
        boolean disablesCesantias,
        boolean disablesPrima
    ) {
        var items = new ArrayList<PayrollCalculatedLineItem>();
        for (var novelty : profile.novelties()) {
            var code = normalize(novelty.code());
            var metadataType = normalize(textMetadata(novelty.metadata(), "type", "kind", "settlementType"));
            if (TERMINATION_CODES.contains(code) || "TERMINATION".equals(metadataType) || "LIQUIDATION".equals(metadataType)) {
                items.addAll(terminationItems(
                    context,
                    novelty,
                    taxableBase,
                    smmlv,
                    provisionRule,
                    provisionParams,
                    disablesCesantias,
                    disablesPrima
                ));
                continue;
            }
            if (RETROACTIVE_CODES.contains(code) || "RETROACTIVE".equals(metadataType)) {
                addRetroactiveOrCorrectionItem(items, context, novelty, "CO_RETROACTIVE", "Retroactivo salarial", 45, true);
                continue;
            }
            if (CORRECTION_CODES.contains(code) || "CORRECTION".equals(metadataType)) {
                addRetroactiveOrCorrectionItem(items, context, novelty, "CO_CORRECTION", "Corrección de nómina", 46, false);
            }
        }
        return items;
    }

    private List<PayrollCalculatedLineItem> terminationItems(
        PayrollCalculationContext context,
        PayrollCalculationContext.PayrollNovelty novelty,
        BigDecimal taxableBase,
        BigDecimal smmlv,
        PayrollRuleResolver.RuleSet provisionRule,
        Map<String, BigDecimal> provisionParams,
        boolean disablesCesantias,
        boolean disablesPrima
    ) {
        var items = new ArrayList<PayrollCalculatedLineItem>();
        var metadata = novelty.metadata();
        var metadataBase = positiveMetadata(metadata, "settlementBase", "liquidationBase", "salaryBase", "baseSalary");
        var base = metadataBase.compareTo(BigDecimal.ZERO) > 0 ? metadataBase : taxableBase;
        var payrollYearDays = decimalParam(provisionParams, "payroll_days_per_year", DAYS_IN_PAYROLL_YEAR);
        var payrollMonthDays = decimalParam(provisionParams, "payroll_days_per_month", DAYS_IN_PAYROLL_MONTH);
        var vacationLiquidationDivisor = decimalParam(provisionParams, "vacation_liquidation_divisor", VACATION_LIQUIDATION_DIVISOR);
        var serviceDays = positiveMetadata(metadata, "serviceDays", "workedDays", "daysWorked", "diasLaborados");
        if (serviceDays.compareTo(BigDecimal.ZERO) <= 0) {
            serviceDays = novelty.days();
        }
        var cesantiasDays = positiveMetadata(metadata, "cesantiasDays", "severanceDays");
        if (cesantiasDays.compareTo(BigDecimal.ZERO) <= 0) {
            cesantiasDays = serviceDays;
        }
        var primaDays = positiveMetadata(metadata, "primaDays", "serviceBonusDays");
        if (primaDays.compareTo(BigDecimal.ZERO) <= 0) {
            primaDays = serviceDays;
        }
        var vacationDays = positiveMetadata(metadata, "pendingVacationDays", "vacationDays", "unusedVacationDays");
        var vacationServiceDays = positiveMetadata(metadata, "vacationServiceDays", "vacationAccruedDays");
        if (vacationServiceDays.compareTo(BigDecimal.ZERO) <= 0) {
            vacationServiceDays = serviceDays;
        }

        if (!disablesCesantias && cesantiasDays.compareTo(BigDecimal.ZERO) > 0) {
            var cesantias = base.multiply(cesantiasDays).divide(payrollYearDays, 8, RoundingMode.HALF_UP);
            addCountryNoveltyItem(
                items,
                context,
                "CO_TERMINATION_CESANTIAS",
                "earning",
                "Liquidación cesantías",
                cesantias,
                50,
                "termination_settlement",
                false,
                false,
                "Auxilio de cesantías en liquidación",
                "LABOR_PROVISIONS",
                provisionRule,
                "salario base * días de cesantías / 360",
                base,
                cesantiasDays.divide(payrollYearDays, 8, RoundingMode.HALF_UP)
            );
            var interestRate = decimalParam(provisionParams, "cesantias_interest_annual_rate", CESANTIAS_INTEREST_ANNUAL_RATE);
            addCountryNoveltyItem(
                items,
                context,
                "CO_TERMINATION_CESANTIAS_INTEREST",
                "earning",
                "Liquidación intereses sobre cesantías",
                cesantias.multiply(interestRate).multiply(cesantiasDays).divide(payrollYearDays, 8, RoundingMode.HALF_UP),
                51,
                "termination_settlement",
                false,
                false,
                "Intereses a las cesantías en liquidación",
                "LABOR_PROVISIONS",
                provisionRule,
                "cesantías causadas * 12% * días / 360",
                cesantias,
                interestRate
            );
        }

        if (!disablesPrima && primaDays.compareTo(BigDecimal.ZERO) > 0) {
            addCountryNoveltyItem(
                items,
                context,
                "CO_TERMINATION_PRIMA",
                "earning",
                "Liquidación prima de servicios",
                base.multiply(primaDays).divide(payrollYearDays, 8, RoundingMode.HALF_UP),
                52,
                "termination_settlement",
                false,
                false,
                "Prima de servicios en liquidación",
                "LABOR_PROVISIONS",
                provisionRule,
                "salario base * días laborados / 360",
                base,
                primaDays.divide(payrollYearDays, 8, RoundingMode.HALF_UP)
            );
        }

        var vacationAmount = vacationDays.compareTo(BigDecimal.ZERO) > 0
            ? base.divide(payrollMonthDays, 8, RoundingMode.HALF_UP).multiply(vacationDays)
            : base.multiply(vacationServiceDays).divide(vacationLiquidationDivisor, 8, RoundingMode.HALF_UP);
        addCountryNoveltyItem(
            items,
            context,
            "CO_TERMINATION_VACATION_COMPENSATION",
            "earning",
            "Compensación vacaciones en liquidación",
            vacationAmount,
            53,
            "termination_settlement",
            false,
            false,
            "Vacaciones compensadas en dinero",
            "LABOR_PROVISIONS",
            provisionRule,
            vacationDays.compareTo(BigDecimal.ZERO) > 0
                ? "salario base / 30 * días pendientes"
                : "salario base * días laborados / 720",
            base,
            vacationDays.compareTo(BigDecimal.ZERO) > 0
                ? vacationDays.divide(payrollMonthDays, 8, RoundingMode.HALF_UP)
                : vacationServiceDays.divide(vacationLiquidationDivisor, 8, RoundingMode.HALF_UP)
        );

        var indemnity = indemnityAmount(novelty, base, smmlv, serviceDays, provisionParams);
        addCountryNoveltyItem(
            items,
            context,
            "CO_TERMINATION_INDEMNITY",
            "earning",
            "Indemnización por terminación",
            indemnity.amount(),
            54,
            "termination_indemnity",
            booleanMetadata(metadata, false, "indemnityTaxable", "taxable"),
            false,
            "Indemnización por terminación sin justa causa",
            "LABOR_PROVISIONS",
            provisionRule,
            indemnity.formula(),
            base,
            indemnity.days()
        );

        return items;
    }

    private void addRetroactiveOrCorrectionItem(
        List<PayrollCalculatedLineItem> items,
        PayrollCalculationContext context,
        PayrollCalculationContext.PayrollNovelty novelty,
        String codePrefix,
        String defaultLabel,
        int displayOrder,
        boolean defaultAffectsSocialSecurity
    ) {
        var metadata = novelty.metadata();
        var amount = firstNonZero(
            decimalMetadata(metadata, "amount", "earningAmount", "adjustmentAmount", "retroactiveAmount"),
            novelty.ibcImpactAmount()
        );
        if (amount.compareTo(BigDecimal.ZERO) == 0) {
            return;
        }
        var deduction = amount.compareTo(BigDecimal.ZERO) < 0
            || booleanMetadata(metadata, false, "deduction", "isDeduction");
        var absoluteAmount = amount.abs();
        addCountryNoveltyItem(
            items,
            context,
            codePrefix + (deduction ? "_DEDUCTION" : "_EARNING"),
            deduction ? "deduction" : "earning",
            textMetadata(metadata, "label", "description").isBlank()
                ? defaultLabel
                : textMetadata(metadata, "label", "description"),
            absoluteAmount,
            displayOrder,
            deduction ? "payroll_correction" : "taxable_compensation",
            booleanMetadata(metadata, !deduction, "taxable"),
            booleanMetadata(metadata, defaultAffectsSocialSecurity && !deduction, "affectsSocialSecurity", "affectsIbc"),
            deduction ? "Corrección o descuento retroactivo" : "Ingreso retroactivo o corrección positiva",
            "CO_NOVELTY",
            null,
            "monto reportado en novedad Colombia",
            amount,
            null
        );
    }

    private IndemnityResult indemnityAmount(
        PayrollCalculationContext.PayrollNovelty novelty,
        BigDecimal base,
        BigDecimal smmlv,
        BigDecimal serviceDays,
        Map<String, BigDecimal> provisionParams
    ) {
        var metadata = novelty.metadata();
        var explicit = positiveMetadata(metadata, "indemnityAmount", "severanceIndemnityAmount", "terminationIndemnityAmount");
        if (explicit.compareTo(BigDecimal.ZERO) > 0) {
            return new IndemnityResult(explicit, BigDecimal.ZERO, "monto de indemnización reportado en novedad");
        }
        var terminationReason = normalize(textMetadata(metadata, "terminationReason", "reason", "cause"));
        if (!terminationReason.contains("WITHOUT JUST") && !terminationReason.contains("SIN JUST")) {
            return new IndemnityResult(BigDecimal.ZERO, BigDecimal.ZERO, "indemnización no calculada: terminación no marcada sin justa causa");
        }
        var contractType = normalize(textMetadata(metadata, "contractType", "contract", "tipoContrato"));
        var payrollYearDays = decimalParam(provisionParams, "payroll_days_per_year", DAYS_IN_PAYROLL_YEAR);
        var payrollMonthDays = decimalParam(provisionParams, "payroll_days_per_month", DAYS_IN_PAYROLL_MONTH);
        if (contractType.contains("FIXED") || contractType.contains("FIJO")) {
            var remainingDays = positiveMetadata(metadata, "remainingContractDays", "remainingDays");
            var indemnityDays = remainingDays.max(decimalParam(
                provisionParams,
                "termination_fixed_term_minimum_days",
                new BigDecimal("15")
            ));
            return new IndemnityResult(
                base.divide(payrollMonthDays, 8, RoundingMode.HALF_UP).multiply(indemnityDays),
                indemnityDays,
                "contrato a término fijo: salario diario * días restantes, mínimo 15 días"
            );
        }
        if (serviceDays.compareTo(BigDecimal.ZERO) <= 0) {
            return new IndemnityResult(BigDecimal.ZERO, BigDecimal.ZERO, "indemnización no calculada: faltan días de servicio");
        }
        var salaryThreshold = smmlv.multiply(decimalParam(
            provisionParams,
            "termination_high_salary_threshold_smmlv",
            new BigDecimal("10")
        ));
        var firstYearDays = base.compareTo(salaryThreshold) < 0
            ? decimalParam(provisionParams, "termination_low_salary_first_year_days", new BigDecimal("30"))
            : decimalParam(provisionParams, "termination_high_salary_first_year_days", new BigDecimal("20"));
        var additionalYearDays = base.compareTo(salaryThreshold) < 0
            ? decimalParam(provisionParams, "termination_low_salary_additional_year_days", new BigDecimal("20"))
            : decimalParam(provisionParams, "termination_high_salary_additional_year_days", new BigDecimal("15"));
        var additionalServiceDays = serviceDays.subtract(payrollYearDays).max(BigDecimal.ZERO);
        var indemnityDays = firstYearDays.add(
            additionalServiceDays.multiply(additionalYearDays).divide(payrollYearDays, 8, RoundingMode.HALF_UP)
        );
        return new IndemnityResult(
            base.divide(payrollMonthDays, 8, RoundingMode.HALF_UP).multiply(indemnityDays),
            indemnityDays,
            "contrato indefinido sin justa causa: días art. 64 CST según salario y antigüedad"
        );
    }

    private void addCountryNoveltyItem(
        List<PayrollCalculatedLineItem> items,
        PayrollCalculationContext context,
        String code,
        String category,
        String label,
        BigDecimal amount,
        int displayOrder,
        String taxTreatment,
        boolean taxable,
        boolean affectsSocialSecurity,
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
        items.add(new PayrollCalculatedLineItem(
            code,
            category,
            label,
            scaledAmount,
            "country_novelty",
            displayOrder,
            context.country(),
            context.jurisdiction(),
            taxTreatment,
            taxable,
            false,
            affectsSocialSecurity,
            false,
            legalClassification,
            ruleCode,
            ruleSet == null ? null : ruleSet.id(),
            formula,
            base,
            rate,
            context.currency()
        ));
    }

    private BigDecimal noveltyAmountImpact(List<PayrollCalculatedLineItem> items, boolean socialSecurityOnly) {
        return items.stream()
            .filter((item) -> !socialSecurityOnly || item.affectsSocialSecurity())
            .map((item) -> "deduction".equals(item.category()) ? item.amount().negate() : item.amount())
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private BigDecimal noveltyTaxableImpact(List<PayrollCalculatedLineItem> items) {
        return items.stream()
            .filter(PayrollCalculatedLineItem::taxable)
            .map((item) -> "deduction".equals(item.category()) ? item.amount().negate() : item.amount())
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private List<String> countryNoveltyWarnings(PayrollCalculationContext.CountryPayrollProfile profile) {
        var warnings = new ArrayList<String>();
        for (var novelty : profile.novelties()) {
            var code = normalize(novelty.code());
            var metadata = novelty.metadata();
            var metadataType = normalize(textMetadata(metadata, "type", "kind", "settlementType"));
            if (TERMINATION_CODES.contains(code) || "TERMINATION".equals(metadataType) || "LIQUIDATION".equals(metadataType)) {
                var serviceDays = positiveMetadata(metadata, "serviceDays", "workedDays", "daysWorked", "diasLaborados");
                var explicitIndemnity = positiveMetadata(metadata, "indemnityAmount", "severanceIndemnityAmount", "terminationIndemnityAmount");
                var terminationReason = normalize(textMetadata(metadata, "terminationReason", "reason", "cause"));
                if (serviceDays.compareTo(BigDecimal.ZERO) <= 0 && novelty.days().compareTo(BigDecimal.ZERO) <= 0) {
                    warnings.add("Novedad de liquidación Colombia sin días de servicio; se omiten prestaciones proporcionales que dependan de días.");
                }
                if ((terminationReason.contains("WITHOUT JUST") || terminationReason.contains("SIN JUST"))
                    && explicitIndemnity.compareTo(BigDecimal.ZERO) <= 0
                    && serviceDays.compareTo(BigDecimal.ZERO) <= 0) {
                    warnings.add("Terminación sin justa causa Colombia sin días de servicio ni indemnización explícita; indemnización queda en cero.");
                }
            }
            if (RETROACTIVE_CODES.contains(code) || "RETROACTIVE".equals(metadataType)
                || CORRECTION_CODES.contains(code) || "CORRECTION".equals(metadataType)) {
                var amount = firstNonZero(
                    decimalMetadata(metadata, "amount", "earningAmount", "adjustmentAmount", "retroactiveAmount"),
                    novelty.ibcImpactAmount()
                );
                if (amount.compareTo(BigDecimal.ZERO) == 0) {
                    warnings.add("Novedad Colombia " + novelty.code() + " sin monto; no genera línea de retroactivo/corrección.");
                }
            }
        }
        return warnings;
    }

    private BigDecimal withholdingProcedureOneAmount(
        BigDecimal taxableMonthlyBase,
        BigDecimal uvt,
        List<PayrollRuleResolver.RuleBracket> withholdingBrackets
    ) {
        if (taxableMonthlyBase.compareTo(BigDecimal.ZERO) <= 0 || uvt.compareTo(BigDecimal.ZERO) <= 0 || withholdingBrackets.isEmpty()) {
            return BigDecimal.ZERO;
        }
        var taxableUvt = taxableMonthlyBase.divide(uvt, 8, RoundingMode.HALF_UP);
        return withholdingBrackets.stream()
            .filter((bracket) -> taxableUvt.compareTo(bracket.lowerLimit()) >= 0)
            .filter((bracket) -> bracket.upperLimit() == null || taxableUvt.compareTo(bracket.upperLimit()) <= 0)
            .findFirst()
            .map((bracket) -> bracket.fixedAmount()
                .add(bracket.constantAmount())
                .add(taxableUvt.subtract(bracket.lowerLimit()).max(BigDecimal.ZERO).multiply(bracket.rate()))
                .max(BigDecimal.ZERO)
                .multiply(uvt))
            .orElse(BigDecimal.ZERO);
    }

    private BigDecimal solidarityRate(
        BigDecimal monthlyTaxableBase,
        BigDecimal smmlv,
        List<PayrollRuleResolver.RuleBracket> brackets
    ) {
        if (smmlv.compareTo(BigDecimal.ZERO) <= 0 || brackets.isEmpty()) {
            return BigDecimal.ZERO;
        }
        var smmlvMultiple = monthlyTaxableBase.divide(smmlv, 8, RoundingMode.HALF_UP);
        return brackets.stream()
            .filter((bracket) -> smmlvMultiple.compareTo(bracket.lowerLimit()) >= 0)
            .filter((bracket) -> bracket.upperLimit() == null || smmlvMultiple.compareTo(bracket.upperLimit()) <= 0)
            .findFirst()
            .map(PayrollRuleResolver.RuleBracket::rate)
            .orElse(BigDecimal.ZERO);
    }

    private BigDecimal resolveArlRate(
        Map<String, BigDecimal> params,
        PayrollCalculationContext.CountryPayrollProfile profile,
        LocalDate periodEndDate
    ) {
        var configuredRate = decimalParam(params, "default_arl_rate", BigDecimal.ZERO);
        if (configuredRate.compareTo(BigDecimal.ZERO) > 0) {
            return configuredRate;
        }
        var configuredClass = profile.arlClass().compareTo(BigDecimal.ZERO) > 0
            ? profile.arlClass()
            : decimalParam(params, "default_arl_class", BigDecimal.ONE);
        return ruleResolver.bracketsByCode("CO", "", "ARL", periodEndDate).stream()
            .filter((bracket) -> configuredClass.compareTo(bracket.lowerLimit()) >= 0)
            .filter((bracket) -> bracket.upperLimit() == null || configuredClass.compareTo(bracket.upperLimit()) <= 0)
            .findFirst()
            .map(PayrollRuleResolver.RuleBracket::rate)
            .orElse(ARL_CLASS_I_RATE);
    }

    private BigDecimal standaloneNoveltyIbcImpact(PayrollCalculationContext.CountryPayrollProfile profile) {
        return profile.novelties().stream()
            .filter(PayrollCalculationContext.PayrollNovelty::affectsIbc)
            .filter((novelty) -> !generatesCountryNoveltyLine(novelty))
            .map(PayrollCalculationContext.PayrollNovelty::ibcImpactAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private boolean generatesCountryNoveltyLine(PayrollCalculationContext.PayrollNovelty novelty) {
        var code = normalize(novelty.code());
        var metadataType = normalize(textMetadata(novelty.metadata(), "type", "kind", "settlementType"));
        return TERMINATION_CODES.contains(code)
            || RETROACTIVE_CODES.contains(code)
            || CORRECTION_CODES.contains(code)
            || "TERMINATION".equals(metadataType)
            || "LIQUIDATION".equals(metadataType)
            || "RETROACTIVE".equals(metadataType)
            || "CORRECTION".equals(metadataType);
    }

    private boolean isProcedure2(PayrollCalculationContext.CountryPayrollProfile profile) {
        return normalize(profile.withholdingProcedure()).contains("2");
    }

    private BigDecimal boundedDeduction(BigDecimal requested, BigDecimal calculatedLimit, BigDecimal statutoryLimit) {
        if (requested.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }
        return requested.min(calculatedLimit).min(statutoryLimit).max(BigDecimal.ZERO);
    }

    private BigDecimal clamp(BigDecimal value, BigDecimal minimum, BigDecimal maximum) {
        return value.max(minimum).min(maximum);
    }

    private BigDecimal prorateMonthly(BigDecimal monthlyAmount, BigDecimal monthlyFactor) {
        if (monthlyFactor.compareTo(BigDecimal.ZERO) <= 0) {
            return monthlyAmount;
        }
        return monthlyAmount.divide(monthlyFactor, 8, RoundingMode.HALF_UP);
    }

    private Map<String, Object> entitySnapshot(String code, String name) {
        var body = new LinkedHashMap<String, Object>();
        body.put("code", code);
        body.put("name", name);
        return body;
    }

    private Map<String, Object> ibcSnapshot(
        PayrollCalculatedLineItem employeeEpsItem,
        BigDecimal monthlyFactor,
        BigDecimal smmlv
    ) {
        var ibcPeriod = employeeEpsItem == null || employeeEpsItem.calculationBase() == null
            ? BigDecimal.ZERO
            : employeeEpsItem.calculationBase();
        var body = new LinkedHashMap<String, Object>();
        body.put("periodBase", ibcPeriod);
        body.put("monthlyBase", ibcPeriod.multiply(monthlyFactor).setScale(8, RoundingMode.HALF_UP));
        body.put("minimumMonthly", smmlv);
        body.put("maximumMonthly", smmlv.multiply(IBC_MAX_SMMLV));
        return body;
    }

    private Map<String, Object> withholdingSnapshot(
        PayrollCalculationContext.CountryPayrollProfile profile,
        PayrollCalculatedLineItem withholdingItem,
        BigDecimal uvt
    ) {
        var body = new LinkedHashMap<String, Object>();
        body.put("method", isProcedure2(profile) && profile.procedure2FixedRate().compareTo(BigDecimal.ZERO) > 0 ? "procedure_2" : "procedure_1");
        body.put("requestedMethod", profile.withholdingProcedure());
        body.put("uvt", uvt);
        body.put("taxableMonthlyBase", withholdingItem == null || withholdingItem.calculationBase() == null
            ? BigDecimal.ZERO
            : withholdingItem.calculationBase());
        body.put("effectiveRate", withholdingItem == null || withholdingItem.rateApplied() == null
            ? BigDecimal.ZERO
            : withholdingItem.rateApplied());
        body.put("periodAmount", withholdingItem == null ? BigDecimal.ZERO : withholdingItem.amount());
        body.put("formula", withholdingItem == null ? "" : withholdingItem.calculationFormula());
        return body;
    }

    private Map<String, Object> exonerationSnapshot(
        PayrollCalculationContext.CountryPayrollProfile profile,
        boolean automaticExemption,
        List<PayrollCalculatedLineItem> items
    ) {
        var body = new LinkedHashMap<String, Object>();
        body.put("automaticUnderTenSmmlv", automaticExemption);
        body.put("explicitEmployerHealthExemption", profile.employerHealthExemptionApplies() == null ? "default" : profile.employerHealthExemptionApplies());
        body.put("employerHealthContributionApplied", hasItem(items, "CO_EPS_EMPLOYER"));
        body.put("senaApplied", hasItem(items, "CO_SENA"));
        body.put("icbfApplied", hasItem(items, "CO_ICBF"));
        body.put("ccfApplied", hasItem(items, "CO_CCF"));
        return body;
    }

    private Map<String, Object> lineItemBreakdown(PayrollCalculatedLineItem item) {
        var body = new LinkedHashMap<String, Object>();
        body.put("code", item.code());
        body.put("label", item.label());
        body.put("amount", item.amount());
        body.put("base", item.calculationBase());
        body.put("rate", item.rateApplied());
        body.put("ruleCode", item.ruleCode());
        body.put("formula", item.calculationFormula());
        return body;
    }

    private PayrollCalculatedLineItem findItem(List<PayrollCalculatedLineItem> items, String code) {
        return items.stream()
            .filter((item) -> code.equals(item.code()))
            .findFirst()
            .orElse(null);
    }

    private boolean hasItem(List<PayrollCalculatedLineItem> items, String code) {
        return findItem(items, code) != null;
    }

    private BigDecimal positiveMetadata(Map<String, Object> metadata, String... keys) {
        var value = decimalMetadata(metadata, keys);
        return value.compareTo(BigDecimal.ZERO) > 0 ? value : BigDecimal.ZERO;
    }

    private BigDecimal decimalMetadata(Map<String, Object> metadata, String... keys) {
        for (var key : keys) {
            var raw = metadata.get(key);
            if (raw instanceof Number number) {
                return BigDecimal.valueOf(number.doubleValue()).setScale(2, RoundingMode.HALF_UP);
            }
            if (raw instanceof String text && !text.isBlank()) {
                try {
                    return new BigDecimal(text.trim()).setScale(2, RoundingMode.HALF_UP);
                } catch (NumberFormatException ignored) {
                    return BigDecimal.ZERO;
                }
            }
        }
        return BigDecimal.ZERO;
    }

    private BigDecimal firstNonZero(BigDecimal primary, BigDecimal fallback) {
        return primary.compareTo(BigDecimal.ZERO) != 0 ? primary : fallback;
    }

    private boolean booleanMetadata(Map<String, Object> metadata, boolean defaultValue, String... keys) {
        for (var key : keys) {
            var raw = metadata.get(key);
            if (raw instanceof Boolean flag) {
                return flag;
            }
            if (raw instanceof Number number) {
                return number.intValue() != 0;
            }
            if (raw instanceof String text && !text.isBlank()) {
                var normalized = text.trim().toLowerCase();
                if ("true".equals(normalized) || "yes".equals(normalized) || "si".equals(normalized) || "1".equals(normalized)) {
                    return true;
                }
                if ("false".equals(normalized) || "no".equals(normalized) || "0".equals(normalized)) {
                    return false;
                }
            }
        }
        return defaultValue;
    }

    private String textMetadata(Map<String, Object> metadata, String... keys) {
        for (var key : keys) {
            var raw = metadata.get(key);
            if (raw != null && !String.valueOf(raw).trim().isBlank()) {
                return String.valueOf(raw).trim();
            }
        }
        return "";
    }

    private record WithholdingResult(
        BigDecimal periodAmount,
        BigDecimal taxableMonthlyBase,
        BigDecimal effectiveRate,
        String formula
    ) {
    }

    private record IndemnityResult(
        BigDecimal amount,
        BigDecimal days,
        String formula
    ) {
    }
}
