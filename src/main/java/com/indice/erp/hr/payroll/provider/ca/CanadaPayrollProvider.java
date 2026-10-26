package com.indice.erp.hr.payroll.provider.ca;

import com.indice.erp.hr.payroll.engine.*;
import com.indice.erp.hr.payroll.provider.AbstractPayrollCountryProvider;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class CanadaPayrollProvider extends AbstractPayrollCountryProvider {
    public CanadaPayrollProvider(PayrollRuleResolver rules) { super(rules); }
    @Override public String providerCode() { return "ca"; }
    @Override public boolean supports(String country) { return "CA".equals(ruleResolver.normalizeCountry(country)); }

    @Override public List<PayrollCalculatedLineItem> calculateLine(PayrollCalculationContext context,BigDecimal base) {
        var p=CanadaPayrollInputs.profile(context);
        if(p==null || p.taxYear()!=p.paymentDate(context.periodEndDate()).getYear() || p.paymentDate(context.periodEndDate()).getYear()!=2026 || !hasRules(p,context.periodEndDate())) return List.of();
        var date=p.paymentDate(context.periodEndDate());
        boolean qc="QC".equals(p.provinceOfEmployment());
        var c=CanadaContributions.calculate(context,p,base);
        var taxes=CanadaIncomeTax.calculate(ruleResolver,p,base,c,date);
        var items=new ArrayList<PayrollCalculatedLineItem>();
        item(items,context,p,"CAN_FED_TAX","deduction","Federal income tax",taxes.federal(),80,"INCOME_TAX_FEDERAL","",date,taxes.annualTaxable(),null);
        item(items,context,p,qc?"QC_PROV_TAX":"CAN_PROV_TAX","deduction",p.provinceOfEmployment()+" income tax",taxes.provincial(),82,"INCOME_TAX_PROVINCIAL",p.provinceOfEmployment(),date,taxes.annualTaxable(),null);
        var pension=qc?"QPP":"CPP";
        var province=qc?"QC":"";
        var pensionRate=new BigDecimal(qc?".063":".0595");
        item(items,context,p,pension,"deduction",pension,c.pension(),90,pension,province,date,c.pensionBase(),pensionRate);
        item(items,context,p,pension+"2","deduction",pension+"2",c.pension2(),92,pension,province,date,c.pensionableEarnings(),new BigDecimal(".04"));
        item(items,context,p,"EI","deduction","Employment Insurance",c.ei(),94,"EI",province,date,base,new BigDecimal(qc?".013":".0163"));
        item(items,context,p,"QPIP","deduction","Québec parental insurance",c.qpip(),96,"QPIP","QC",date,base,new BigDecimal(".0043"));
        item(items,context,p,"CAN_REGISTERED_PLAN","deduction","Registered savings / pension plan",p.registeredPlanDeduction(),98,"INCOME_TAX_FEDERAL","",date,base,null);
        item(items,context,p,"CAN_UNION_DUES","deduction","Union dues",p.unionDues(),99,"INCOME_TAX_FEDERAL","",date,base,null);
        item(items,context,p,"EMPLOYER_"+pension,"employer_contribution","Employer "+pension,c.pension(),110,pension,province,date,c.pensionBase(),pensionRate);
        item(items,context,p,"EMPLOYER_"+pension+"2","employer_contribution","Employer "+pension+"2",c.pension2(),112,pension,province,date,c.pensionableEarnings(),new BigDecimal(".04"));
        item(items,context,p,"EMPLOYER_EI","employer_contribution","Employer EI",c.employerEi(),114,"EI",province,date,c.ei(),p.employerEiMultiplier());
        item(items,context,p,"EMPLOYER_QPIP","employer_contribution","Employer QPIP",c.employerQpip(),116,"QPIP","QC",date,base,new BigDecimal(".00602"));
        if(qc && p.quebecHealthFundPercent()!=null)
            item(items,context,p,"EMPLOYER_QC_HSF","employer_contribution","Québec health services fund",base.multiply(p.quebecHealthFundPercent().movePointLeft(2)),118,"INCOME_TAX_PROVINCIAL","QC",date,base,p.quebecHealthFundPercent().movePointLeft(2));
        // This is a configured provision, not paid vacation and not a statutory universal 4% default.
        item(items,context,p,"EMPLOYER_VACATION_ACCRUAL","employer_contribution","Vacation accrual",base.multiply(p.vacationAccrualPercent().movePointLeft(2)),132,"VACATION","",date,base,p.vacationAccrualPercent().movePointLeft(2));
        return items;
    }

    private void item(List<PayrollCalculatedLineItem> items,PayrollCalculationContext c,CanadaPayrollProfile p,
        String code,String category,String label,BigDecimal amount,int order,String ruleCode,String province,LocalDate date,BigDecimal base,BigDecimal rate) {
        if(amount.signum()<=0)return;
        var rule=ruleResolver.resolveRuleSet("CA",province,ruleCode,date);
        items.add(new PayrollCalculatedLineItem(code,category,label,money(amount),"computed_tax",order,"CA",p.provinceOfEmployment(),
            ruleCode,false,false,List.of("CPP","QPP","EI","QPIP").contains(ruleCode),"employer_contribution".equals(category),
            label,ruleCode,rule==null?null:rule.id(),"CA 2026 regular pay; TD1/profile version + employer YTD; payment date "+date,
            base,rate,c.currency()));
    }

    public List<String> approvalIssues(PayrollCalculationContext c,BigDecimal base) {
        var issues=new ArrayList<String>();var p=CanadaPayrollInputs.profile(c);
        if(p==null)return List.of("Canadá: completa los datos fiscales del colaborador antes de aprobar.");
        var date=p.paymentDate(c.periodEndDate());
        if(date.getYear()!=2026 || p.taxYear()!=date.getYear()) issues.add("Canadá: faltan reglas o declaraciones revisadas para el año de pago "+date.getYear()+".");
        if(!hasRules(p,c.periodEndDate()))issues.add("Canadá: faltan tablas fiscales completas para la provincia y la fecha de pago.");
        if(Boolean.TRUE.equals(c.countryProfile().metadata().get("canadaProfileChangesWithinPeriod")))issues.add("Canadá: hay cambios fiscales dentro del periodo. Separa las vigencias antes de aprobar.");
        if(Boolean.TRUE.equals(c.fiscalAccumulator().metadata().get("canadaOpeningBalanceOverlap")))issues.add("Canadá: los acumulados iniciales se superponen con nóminas registradas. Corrige la apertura.");
        if(new BigDecimal(c.fiscalAccumulator().metadata().getOrDefault("canadaUnreviewedPriorLines",0).toString()).signum()>0)
            issues.add("Canadá: hay nóminas fiscales anteriores sin perfil revisado. Concilia los acumulados antes de aprobar.");
        if(p.openingBalances().asOf().isAfter(date))issues.add("Canadá: la fecha inicial de los acumulados es posterior al pago del periodo.");
        if(!frequencyMatches(c.payrollFrequency(),p.payPeriodsPerYear()))issues.add("Canadá: los pagos anuales no coinciden con la frecuencia del colaborador.");
        if(!"CAD".equals(c.currency()))issues.add("Canadá: el cálculo fiscal requiere importes nativos en CAD.");
        boolean qc=p.provinceOfEmployment().equals("QC");
        var otherPension=CanadaPayrollInputs.ytd(c,qc?"CPP":"QPP",qc?p.openingBalances().cpp():p.openingBalances().qpp());
        var otherSecond=CanadaPayrollInputs.ytd(c,qc?"CPP2":"QPP2",qc?p.openingBalances().cpp2():p.openingBalances().qpp2());
        var priorQpip=CanadaPayrollInputs.ytd(c,"QPIP",p.openingBalances().qpip());
        if(otherPension.signum()>0 || otherSecond.signum()>0 || (!qc && priorQpip.signum()>0)
            || (qc && CanadaPayrollInputs.ytd(c,"EI",p.openingBalances().ei()).compareTo(new BigDecimal("895.70"))>0))
            issues.add("Canadá: traslado entre Québec y otra provincia en el año; requiere conciliación de CPP/QPP y EI.");
        if(p.registeredPlanDeduction().add(p.unionDues()).compareTo(base)>0)issues.add("Canadá: las deducciones configuradas exceden la remuneración del periodo.");
        if(qc && p.quebecHealthFundPercent()==null)issues.add("Québec: registra la tasa patronal del fondo de salud conforme al empleador y su nómina total.");
        if(c.attendance().overtimeHours().signum()>0 || c.manualAdjustments().stream().anyMatch(a->"earning".equals(a.category()) && a.amount().signum()>0))
            issues.add("Canadá: horas extra, bonos, comisiones y pagos extraordinarios requieren su cálculo específico antes de aprobar.");
        return List.copyOf(issues);
    }
    private boolean hasRules(CanadaPayrollProfile p,LocalDate end) {
        var date=p.paymentDate(end);
        for(var province:List.of("",p.provinceOfEmployment())) {
            var code=province.isEmpty()?"INCOME_TAX_FEDERAL":"INCOME_TAX_PROVINCIAL";
            if(ruleResolver.bracketsByCode("CA",province,code,date).isEmpty()
                || !BigDecimal.ONE.equals(ruleResolver.parametersByCode("CA",province,code,date).getOrDefault("reviewed_2026",BigDecimal.ZERO).stripTrailingZeros()))return false;
        }
        var parameters=ruleResolver.parametersByCode("CA",p.provinceOfEmployment(),"INCOME_TAX_PROVINCIAL",date);
        if (!List.of("MB","YT").contains(p.provinceOfEmployment()) && !parameters.containsKey("basic_amount")) return false;
        if ("BC".equals(p.provinceOfEmployment()) && !parameters.keySet().containsAll(List.of("reduction_base","reduction_threshold","reduction_limit"))) return false;
        var qc="QC".equals(p.provinceOfEmployment());
        for (var code:qc?List.of("QPP","EI","QPIP"):List.of("CPP","EI"))
            if (ruleResolver.resolveRuleSet("CA",qc?"QC":"",code,date)==null) return false;
        return true;
    }
    private boolean frequencyMatches(String f,int periods) {
        return switch(f) {case "weekly" -> periods==52||periods==53; case "biweekly" -> periods==26||periods==27;
            case "semimonthly","quincenal" -> periods==24; case "monthly" -> periods==12; default -> false;};
    }
    @Override public List<String> calculationWarnings(PayrollCalculationContext c,BigDecimal base,List<PayrollCalculatedLineItem> items) {
        var messages=new ArrayList<>(approvalIssues(c,base));
        messages.add("Canadá: cálculo de remuneración periódica. Revisa por separado obligaciones patronales provinciales, seguro laboral y declaraciones T4/RL-1; no se presentan automáticamente.");
        return messages;
    }
}
