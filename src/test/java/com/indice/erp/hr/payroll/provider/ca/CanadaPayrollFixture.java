package com.indice.erp.hr.payroll.provider.ca;

import com.fasterxml.jackson.databind.json.JsonMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.indice.erp.hr.payroll.engine.PayrollCalculationContext;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

public final class CanadaPayrollFixture {
    static final com.fasterxml.jackson.databind.ObjectMapper MAPPER=JsonMapper.builder().addModule(new JavaTimeModule()).build();
    public static BigDecimal d(String value) { return new BigDecimal(value); }
    public static CanadaPayrollProfile profile(String province) {
        return new CanadaPayrollProfile(LocalDate.of(2026,1,1),2026,province,26,0,
            CanadaPayrollProfile.ClaimMode.BASIC,d("0"),CanadaPayrollProfile.ClaimMode.BASIC,d("0"),d("0"),d("0"),0,
            CanadaPayrollProfile.PensionStatus.CONTRIBUTING,12,false,false,"Synthetic reviewed TD1",d("0"),d("0"),d("4"),d("1.4"),
            "QC".equals(province)?d("1.65"):null,
            new CanadaPayrollProfile.OpeningBalances(LocalDate.of(2026,1,1),d("0"),d("0"),d("0"),d("0"),d("0"),d("0"),d("0"),d("0")));
    }
    @SuppressWarnings("unchecked")
    public static CanadaPayrollProfile patch(CanadaPayrollProfile profile, Map<String,Object> changes) {
        var values=MAPPER.convertValue(profile,LinkedHashMap.class); values.putAll(changes);
        return MAPPER.convertValue(values,CanadaPayrollProfile.class);
    }
    public static PayrollCalculationContext context(CanadaPayrollProfile p,String amount,LocalDate end,Map<String,BigDecimal> deductions,BigDecimal ytd) {
        var z=BigDecimal.ZERO;
        var country=PayrollCalculationContext.CountryPayrollProfile.empty("CA").withMetadata(Map.of(
            "canadaProfile",p,"canadaProfileRevision",1,"canadaPaymentDate",p.paymentDate(end).toString()));
        return new PayrollCalculationContext(1,10,10,20L,"CA",p.provinceOfEmployment(),"CAD",BigDecimal.ONE,
            switch(p.payPeriodsPerYear()){case 52,53->"weekly";case 24->"semimonthly";case 12->"monthly";default->"biweekly";},
            end.minusDays(13),end,true,
            new PayrollCalculationContext.EmployeeSalarySnapshot("SYNTHETIC","Synthetic","Role","Department","Unit","Business","daily",d(amount),z,d("8"),d("5")),
            new PayrollCalculationContext.PayrollAttendanceInput(d("10"),z,z,z,z,z,z,d("10"),0,d("80"),z,List.of(),List.of()),
            new PayrollCalculationContext.Preferences(d("8"),true,z,z,z,z,z,z),List.of(),null,country,
            new PayrollCalculationContext.FiscalAccumulatorSnapshot("CA",2026,LocalDate.of(2026,1,1),end.minusDays(13),end,ytd,ytd,z,z,z,deductions,deductions,Map.of(),Map.of("canadaPensionableEarnings",ytd)));
    }
    public static PayrollCalculationContext context(CanadaPayrollProfile p,String amount) {
        return context(p,amount,LocalDate.of(2026,10,24),Map.of(),BigDecimal.ZERO);
    }
}
