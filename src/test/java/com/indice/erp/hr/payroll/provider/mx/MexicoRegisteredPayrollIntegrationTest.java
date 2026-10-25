package com.indice.erp.hr.payroll.provider.mx;

import static org.junit.jupiter.api.Assertions.*;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.hr.payroll.engine.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class MexicoRegisteredPayrollIntegrationTest {
    @Autowired PayrollCalculationEngine engine;
    @Autowired ObjectMapper mapper;
    private static BigDecimal d(String value) { return new BigDecimal(value); }
    private PayrollCalculationContext context(LocalDate from, LocalDate to, String frequency, String salary, String daily, String sbc,
        boolean fiscal, boolean credit, String absence) {
        var profile = new MexicoPayrollProfile(from, d(daily), d(sbc), MexicoPayrollProfile.SalaryBasis.FIXED,
            MexicoPayrollProfile.MinimumWageZone.GENERAL, "A1234567890", d("0.5"), "NLE", d("3"), "Synthetic NL ordinary remuneration",
            new MexicoPayrollProfile.InfonavitCredit(credit, "1234567890", "Synthetic notice", from, null,
                MexicoPayrollProfile.CreditMode.FIXED_MONTHLY, d("1300"), d("15"), false));
        return new PayrollCalculationContext(1, 1, 1, null, "MX", "NLE", "MXN", BigDecimal.ONE, frequency, from, to, fiscal,
            new PayrollCalculationContext.EmployeeSalarySnapshot("", "Synthetic", "", "", "", "", "daily", d(salary), d("0"), d("8"), d("6")),
            new PayrollCalculationContext.PayrollAttendanceInput(d("6"), d("0"), d("0"), d(absence), d(absence), d("1"), d("0"), d("6"), 0, d("48"), d("0"), List.of(), List.of()),
            new PayrollCalculationContext.Preferences(d("8"), true, d("0"), d("0"), d("0"), d("0"), d("0"), d("0")), List.of(), null,
            PayrollCalculationContext.CountryPayrollProfile.empty("MX").withMetadata(Map.of("mexicoProfileRevision", 1,
                "mexicoProfile", mapper.convertValue(profile, new TypeReference<Map<String, Object>>() {}))));
    }
    private BigDecimal amount(PayrollLineCalculationResult result, String code) {
        return result.items().stream().filter(item -> item.code().equals(code)).map(PayrollCalculatedLineItem::amount).reduce(d("0.00"), BigDecimal::add);
    }
    @Test void actualCalendarDaysAndRegisteredSbcControlContributions() {
        var feb = engine.calculateLine(context(LocalDate.of(2026,2,1), LocalDate.of(2026,2,28), "monthly", "30000", "1000", "1000", true, false, "0"));
        var march = engine.calculateLine(context(LocalDate.of(2026,3,1), LocalDate.of(2026,3,31), "monthly", "30000", "1000", "1000", true, false, "0"));
        assertEquals(d("737.58"), amount(feb, "IMSS_EMP"));
        assertEquals(d("816.61"), amount(march, "IMSS_EMP"));
        assertEquals(d("1400.00"), amount(feb, "EMPLOYER_INFONAVIT"));
        assertEquals(d("140.00"), amount(feb, "EMPLOYER_RISK"));
        assertTrue(feb.statutoryCompliance());
    }
    @Test void housingCreditDoesNotReplaceEmployerContribution() {
        var result = engine.calculateLine(context(LocalDate.of(2026,10,18), LocalDate.of(2026,10,24), "weekly", "7000", "1000", "1000", true, true, "0"));
        assertTrue(amount(result,"INFONAVIT_CREDIT").signum() > 0);
        assertEquals(d("350.00"), amount(result,"EMPLOYER_INFONAVIT"));
        assertTrue(result.statutoryCompliance());
        assertEquals(result.grossAmount().subtract(result.deductionsAmount()), result.netAmount());
    }
    @Test void operationalPayrollNeverUsesFiscalProfileOrHousingCredit() {
        var result = engine.calculateLine(context(LocalDate.of(2026,10,18), LocalDate.of(2026,10,24), "weekly", "7000", "1000", "1000", false, true, "0"));
        assertEquals(d("7000.00"), result.netAmount());
        assertEquals(d("0.00"), result.employerContributionsAmount());
        assertEquals(d("0.00"), amount(result,"INFONAVIT_CREDIT"));
    }
    @Test void minimumWageDoesNotLoseWorkerQuotaButStillRequiresMonthlyReconciliation() {
        var result = engine.calculateLine(context(LocalDate.of(2026,10,18), LocalDate.of(2026,10,24), "weekly", "2205.28", "315.04", "330.58", true, true, "0"));
        assertEquals(d("0.00"), amount(result,"IMSS_EMP"));
        assertEquals(d("0.00"), amount(result,"ISR"));
        assertTrue(amount(result,"EMPLOYER_IMSS").signum() > 0);
        assertFalse(result.statutoryCompliance());
        assertEquals("MX_REVIEW_REQUIRED", result.calculationSource());
    }
    @Test void zeroTaxableSalaryDoesNotEraseEmployerObligationsOrCreateNegativeHousingRetention() {
        var result = engine.calculateLine(context(LocalDate.of(2026,10,18), LocalDate.of(2026,10,24), "weekly", "7000", "1000", "1000", true, true, "6"));
        assertEquals(d("0.00"), result.taxableBase());
        assertTrue(result.employerContributionsAmount().signum() > 0);
        assertEquals(d("0.00"), amount(result,"INFONAVIT_CREDIT"));
        assertFalse(result.statutoryCompliance());
    }
}
