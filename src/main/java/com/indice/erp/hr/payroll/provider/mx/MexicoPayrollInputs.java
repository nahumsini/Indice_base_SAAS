package com.indice.erp.hr.payroll.provider.mx;

import com.fasterxml.jackson.databind.json.JsonMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.indice.erp.hr.payroll.engine.PayrollCalculationContext;

public final class MexicoPayrollInputs {
    private static final JsonMapper MAPPER = JsonMapper.builder().addModule(new JavaTimeModule()).build();
    private MexicoPayrollInputs() {}

    public static MexicoPayrollProfile profile(PayrollCalculationContext context) {
        var value = context.countryProfile().metadata().get("mexicoProfile");
        if (value == null) return null;
        var profile = MAPPER.convertValue(value, MexicoPayrollProfile.class);
        profile.validate();
        return profile;
    }
}
