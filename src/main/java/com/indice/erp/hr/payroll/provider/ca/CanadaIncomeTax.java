package com.indice.erp.hr.payroll.provider.ca;

import static com.indice.erp.hr.payroll.provider.ca.CanadaContributions.*;
import com.indice.erp.hr.payroll.engine.PayrollRuleResolver;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/** T4127 Option 1 (regular remuneration); Quebec TP-1015.F-V section 2.1.1. */
final class CanadaIncomeTax {
    record Result(BigDecimal federal,BigDecimal provincial,BigDecimal annualTaxable) {}
    static Result calculate(PayrollRuleResolver rules,CanadaPayrollProfile p,BigDecimal gross,CanadaContributions c,LocalDate date) {
        var periods=BigDecimal.valueOf(p.payPeriodsPerYear());
        var annual=positive(gross.subtract(p.registeredPlanDeduction()).subtract(p.unionDues()).subtract(c.enhancedDeduction())).multiply(periods);
        var federalClaim=claim(p.federalClaimMode(),p.federalClaimAmount(),basicFederal(annual));
        var fed=positive(tax(rules.bracketsByCode("CA","","INCOME_TAX_FEDERAL",date),annual)
            .subtract(federalClaim.multiply(d(".14"))).subtract(c.annualCreditBase().multiply(d(".14")))
            .subtract(gross.multiply(periods).min(d("1501")).multiply(d(".14"))));
        boolean qc="QC".equals(p.provinceOfEmployment());
        if(qc) fed=fed.multiply(d(".835"));
        if(p.federalClaimMode()==CanadaPayrollProfile.ClaimMode.EXEMPT) fed=BigDecimal.ZERO;
        var brackets=rules.bracketsByCode("CA",p.provinceOfEmployment(),"INCOME_TAX_PROVINCIAL",date);
        var parameters=rules.parametersByCode("CA",p.provinceOfEmployment(),"INCOME_TAX_PROVINCIAL",date);
        var lowest=brackets.getFirst().rate();
        var provincialBasic=switch(p.provinceOfEmployment()) {
            case "YT" -> basicFederal(annual);
            case "MB" -> money(positive(d("15780").subtract(positive(annual.subtract(d("200000"))).multiply(divide(d("15780"),d("200000"))))));
            default -> parameters.get("basic_amount");
        };
        var provClaim=claim(p.provincialClaimMode(),p.provincialClaimAmount(),provincialBasic);
        BigDecimal prov;
        if(qc) {
            var worker=money(gross.multiply(d(".06")).min(divide(d("1450"),periods)));
            var qcAnnual=positive(gross.subtract(p.registeredPlanDeduction()).subtract(worker).subtract(c.enhancedDeduction())).multiply(periods);
            // Quebec personal credits already include basic social contribution relief; do not subtract CPP/EI credits again.
            prov=positive(tax(brackets,qcAnnual).subtract(provClaim.setScale(0,java.math.RoundingMode.HALF_UP).multiply(d(".14"))));
        } else {
            var credits=provClaim.add(c.annualCreditBase()).multiply(lowest);
            prov=positive(tax(brackets,annual).subtract(credits));
            switch(p.provinceOfEmployment()) {
                case "AB" -> prov=positive(prov.subtract(positive(credits.subtract(d("4896"))).multiply(d(".25"))));
                case "BC" -> {
                    var reduction=annual.compareTo(parameters.get("reduction_limit"))>0?BigDecimal.ZERO:
                        positive(parameters.get("reduction_base").subtract(positive(annual.subtract(parameters.get("reduction_threshold"))).multiply(d(".0356"))));
                    prov=positive(prov.subtract(reduction));
                }
                case "ON" -> {
                    var surtax=positive(prov.subtract(d("5818"))).multiply(d(".2")).add(positive(prov.subtract(d("7446"))).multiply(d(".36")));
                    prov=prov.add(surtax);
                    var reduction=positive(d("300").add(d("554").multiply(BigDecimal.valueOf(p.ontarioDependants()))).multiply(d("2")).subtract(prov)).min(prov);
                    prov=prov.subtract(reduction).add(ontarioHealth(annual));
                }
                case "YT" -> prov=positive(prov.subtract(gross.multiply(periods).min(d("1501")).multiply(d(".064"))));
                default -> { }
            }
        }
        if(p.provincialClaimMode()==CanadaPayrollProfile.ClaimMode.EXEMPT)
            prov="ON".equals(p.provinceOfEmployment())?ontarioHealth(annual):BigDecimal.ZERO;
        var federal = money(divide(fed,periods).add(p.additionalTax()));
        // CRA remits federal + provincial income tax as one rounded amount outside Quebec.
        // Allocate the residual cent to the provincial line so the displayed sum is exact.
        var provincial = qc ? money(divide(prov,periods).add(p.additionalQuebecTax()))
            : money(divide(fed.add(prov),periods).add(p.additionalTax())).subtract(federal);
        return new Result(federal,provincial,annual);
    }
    private static BigDecimal claim(CanadaPayrollProfile.ClaimMode mode,BigDecimal amount,BigDecimal basic) {
        return switch(mode) { case BASIC -> basic; case DECLARED -> amount; default -> BigDecimal.ZERO; };
    }
    static BigDecimal basicFederal(BigDecimal income) {
        return money(d("16452").subtract(positive(income.subtract(d("181440"))).min(d("77042")).multiply(divide(d("1623"),d("77042")))));
    }
    private static BigDecimal tax(List<PayrollRuleResolver.RuleBracket> brackets,BigDecimal income) {
        var bracket=brackets.stream().filter(b->income.compareTo(b.lowerLimit())>=0).reduce((a,b)->b).orElse(brackets.getFirst());
        return positive(income.multiply(bracket.rate()).subtract(bracket.constantAmount()));
    }
    static BigDecimal ontarioHealth(BigDecimal income) {
        if(income.compareTo(d("20000"))<=0)return BigDecimal.ZERO;
        if(income.compareTo(d("36000"))<=0)return income.subtract(d("20000")).multiply(d(".06")).min(d("300"));
        if(income.compareTo(d("48000"))<=0)return d("300").add(income.subtract(d("36000")).multiply(d(".06"))).min(d("450"));
        if(income.compareTo(d("72000"))<=0)return d("450").add(income.subtract(d("48000")).multiply(d(".25"))).min(d("600"));
        if(income.compareTo(d("200000"))<=0)return d("600").add(income.subtract(d("72000")).multiply(d(".25"))).min(d("750"));
        return d("750").add(income.subtract(d("200000")).multiply(d(".25"))).min(d("900"));
    }
}
