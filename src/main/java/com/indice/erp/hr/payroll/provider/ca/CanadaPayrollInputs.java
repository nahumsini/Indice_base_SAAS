package com.indice.erp.hr.payroll.provider.ca;

import com.fasterxml.jackson.databind.json.JsonMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.indice.erp.hr.payroll.engine.PayrollCalculationContext;
import java.math.BigDecimal;
import java.time.LocalDate;

public final class CanadaPayrollInputs {
    private static final com.fasterxml.jackson.databind.ObjectMapper MAPPER = JsonMapper.builder().addModule(new JavaTimeModule()).build();
    private CanadaPayrollInputs() {}
    public static CanadaPayrollProfile profile(PayrollCalculationContext context) {
        return profile(context.countryProfile());
    }
    public static CanadaPayrollProfile profile(PayrollCalculationContext.CountryPayrollProfile countryProfile) {
        var value=countryProfile.metadata().get("canadaProfile");
        if (value==null) return null;
        try { var p=MAPPER.convertValue(value,CanadaPayrollProfile.class); p.validate(); return p; }
        catch (IllegalArgumentException ex) { return null; }
    }
    public static LocalDate paymentDate(PayrollCalculationContext.CountryPayrollProfile profile,LocalDate end) {
        var date=profile.metadata().get("canadaPaymentDate");
        return date==null ? end : LocalDate.parse(date.toString());
    }
    static BigDecimal ytd(PayrollCalculationContext c,String code,BigDecimal opening) {
        return c.fiscalAccumulator().employeeDeductionsByCode().getOrDefault(code,BigDecimal.ZERO).add(opening);
    }
}
