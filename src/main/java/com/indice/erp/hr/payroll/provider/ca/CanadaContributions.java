package com.indice.erp.hr.payroll.provider.ca;

import com.indice.erp.hr.payroll.engine.PayrollCalculationContext;
import java.math.BigDecimal;
import java.math.RoundingMode;

/** CRA T4127 chapters 4/6/7 and TP-1015.F-V, ordinary periodic pay, 2026. */
record CanadaContributions(BigDecimal pension, BigDecimal pension2, BigDecimal ei, BigDecimal qpip,
    BigDecimal employerEi, BigDecimal employerQpip, BigDecimal enhancedDeduction,
    BigDecimal annualCreditBase, BigDecimal pensionBase, BigDecimal pensionableEarnings) {
    static BigDecimal d(String n) { return new BigDecimal(n); }
    static BigDecimal money(BigDecimal n) { return n.setScale(2,RoundingMode.HALF_UP); }
    static BigDecimal positive(BigDecimal n) { return n.max(BigDecimal.ZERO); }
    static BigDecimal divide(BigDecimal a,BigDecimal b) { return a.divide(b,16,RoundingMode.HALF_UP); }

    static CanadaContributions calculate(PayrollCalculationContext c,CanadaPayrollProfile p,BigDecimal earnings) {
        boolean qc=p.provinceOfEmployment().equals("QC");
        var opening=p.openingBalances();
        var periods=BigDecimal.valueOf(p.payPeriodsPerYear());
        var months=divide(BigDecimal.valueOf(p.pensionableMonths()),d("12"));
        var rate=qc?d(".0630"):d(".0595"); var baseRate=qc?d(".0530"):d(".0495");
        var pensionMax=money((qc?d("4479.30"):d("4230.45")).multiply(months));
        var pension2Max=money(d("416").multiply(months));
        var pensionPrior=CanadaPayrollInputs.ytd(c,qc?"QPP":"CPP",qc?opening.qpp():opening.cpp());
        var secondPrior=CanadaPayrollInputs.ytd(c,qc?"QPP2":"CPP2",qc?opening.qpp2():opening.cpp2());
        var priorEarnings=new BigDecimal(c.fiscalAccumulator().metadata().getOrDefault("canadaPensionableEarnings",c.fiscalAccumulator().taxableBaseYearToDate()).toString())
            .add(opening.pensionableEarnings());
        var pensionable=p.pensionStatus()==CanadaPayrollProfile.PensionStatus.CONTRIBUTING?earnings:BigDecimal.ZERO;
        // CRA basic exemption is truncated to cents, not rounded up.
        var exempt=d("3500").divide(periods,2,RoundingMode.DOWN);
        var pensionBase=positive(pensionable.subtract(exempt));
        var pension=money(pensionBase.multiply(rate)).min(positive(pensionMax.subtract(pensionPrior)));
        var band=positive(priorEarnings.add(pensionable).subtract(priorEarnings.max(d("74600").multiply(months))));
        var second=money(band.multiply(d(".04"))).min(positive(pension2Max.subtract(secondPrior)));
        var eiPrior=CanadaPayrollInputs.ytd(c,"EI",opening.ei());
        var qpPrior=CanadaPayrollInputs.ytd(c,"QPIP",opening.qpip());
        var eiMax=qc?d("895.70"):d("1123.07");
        var ei=p.eiExempt()?BigDecimal.ZERO:money(earnings.multiply(qc?d(".0130"):d(".0163"))).min(positive(eiMax.subtract(eiPrior)));
        var qp=!qc||p.qpipExempt()?BigDecimal.ZERO:money(earnings.multiply(d(".00430"))).min(positive(d("442.90").subtract(qpPrior)));
        var employerQpPrior=c.fiscalAccumulator().employerContributionsByCode().getOrDefault("EMPLOYER_QPIP",BigDecimal.ZERO).add(opening.employerQpip());
        var employerQp=!qc||p.qpipExempt()?BigDecimal.ZERO:money(earnings.multiply(d(".00602"))).min(positive(d("620.06").subtract(employerQpPrior)));
        var enhanced=money(divide(pension.multiply(d(".01")),rate).add(second));
        // Preserve credits after annual maximums are reached; CRA recommendation uses at least prior contributions.
        var creditPension=credit(pension,pensionPrior,pensionMax,periods).multiply(divide(baseRate,rate));
        var creditEi=credit(ei,eiPrior,eiMax,periods);
        var creditQp=qc?credit(qp,qpPrior,d("442.90"),periods):BigDecimal.ZERO;
        return new CanadaContributions(pension,second,ei,qp,money(ei.multiply(p.employerEiMultiplier())),
            employerQp,enhanced,creditPension.add(creditEi).add(creditQp),pensionBase,pensionable);
    }
    private static BigDecimal credit(BigDecimal current,BigDecimal prior,BigDecimal cap,BigDecimal periods) {
        return prior.add(current).compareTo(cap)>=0?cap:current.multiply(periods).max(prior).min(cap);
    }
}
