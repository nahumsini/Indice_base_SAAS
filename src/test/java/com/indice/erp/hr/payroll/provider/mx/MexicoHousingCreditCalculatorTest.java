package com.indice.erp.hr.payroll.provider.mx;

import static org.junit.jupiter.api.Assertions.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;

class MexicoHousingCreditCalculatorTest {
    private static final LocalDate JAN = LocalDate.of(2026, 1, 1), FEB = LocalDate.of(2026, 2, 28);
    private static BigDecimal d(String value) { return new BigDecimal(value); }
    private MexicoPayrollProfile profile(MexicoPayrollProfile.CreditMode mode, String value, LocalDate start, LocalDate end, String salary) {
        return new MexicoPayrollProfile(JAN, d(salary), d("500"), MexicoPayrollProfile.SalaryBasis.FIXED,
            MexicoPayrollProfile.MinimumWageZone.GENERAL, "A1234567890", d("0.5"), "NLE", d("3"), "Test notice",
            new MexicoPayrollProfile.InfonavitCredit(true, "1234567890", "Synthetic notice", start, end, mode, d(value), d("15"), false));
    }
    private MexicoHousingCreditCalculator.Result calculate(MexicoPayrollProfile profile, LocalDate from, LocalDate to, String salary, String net) {
        return MexicoHousingCreditCalculator.calculate(profile, from, to, d("100.81"), d("315.04"), d(salary), d(net));
    }
    @Test void officialFixedMonthlyExampleReconcilesTo2615() {
        var result = calculate(profile(MexicoPayrollProfile.CreditMode.FIXED_MONTHLY, "1300", JAN, null, "500"), JAN, FEB, "29500", "25000");
        assertEquals(d("2615.00"), result.withheld());
        assertEquals(d("0.00"), result.notWithheld());
    }
    @Test void officialUmiExampleUsesMonthlyRoundingAndNotUma() {
        var result = calculate(profile(MexicoPayrollProfile.CreditMode.UMI_FACTOR, "26.679", JAN, null, "500"), JAN, FEB, "29500", "25000");
        assertEquals(d("5394.02"), result.withheld());
    }
    @Test void officialPercentExampleUses55CreditedDaysAndSingleInsurance() {
        var result = calculate(profile(MexicoPayrollProfile.CreditMode.SBC_PERCENT, "25", JAN.plusDays(4), null, "500"), JAN, FEB, "27500", "25000");
        assertEquals(d("6890.00"), result.withheld());
    }
    @Test void WeeklyPartitionsSumToExactBimonthWithoutRepeatedInsurance() {
        var profile = profile(MexicoPayrollProfile.CreditMode.FIXED_MONTHLY, "1300", JAN, null, "500");
        var total = d("0");
        for (var from = JAN; !from.isAfter(FEB); from = from.plusDays(7)) {
            var to = from.plusDays(6).isAfter(FEB) ? FEB : from.plusDays(6);
            total = total.add(calculate(profile, from, to, "3500", "3500").withheld());
        }
        assertEquals(d("2615.00"), total);
    }
    @Test void minimumWageRetentionIsCappedAt20PercentEvenWhenNoticeIsLarger() {
        var result = calculate(profile(MexicoPayrollProfile.CreditMode.FIXED_MONTHLY, "10000", JAN, null, "315.04"), JAN, JAN.plusDays(6), "2205.28", "2205.28");
        assertEquals(d("441.05"), result.withheld());
        assertTrue(result.withheld().compareTo(d("2205.28").multiply(d("0.20"))) <= 0);
        assertTrue(result.notWithheld().signum() > 0);
    }
    @Test void salaryShortfallCannotProduceNegativeNetOrAutomaticDebt() {
        var profile = profile(MexicoPayrollProfile.CreditMode.FIXED_MONTHLY, "1300", JAN, null, "500");
        var partial = calculate(profile, JAN, JAN.plusDays(6), "500", "100");
        assertEquals(d("100.00"), partial.withheld());
        assertEquals(partial.scheduled().subtract(d("100")), partial.notWithheld());
        assertEquals(d("0.00"), calculate(profile, JAN, FEB, "0", "-100").withheld());
    }
    @Test void paidAbsenceReductionDoesNotReduceFixedScheduledInstallment() {
        var profile = profile(MexicoPayrollProfile.CreditMode.FIXED_MONTHLY, "1300", JAN, null, "500");
        assertEquals(calculate(profile, JAN, JAN.plusDays(6), "3500", "3500").scheduled(),
            calculate(profile, JAN, JAN.plusDays(6), "500", "500").scheduled());
    }
    @Test void noticeDatesExcludeDaysBeforeStartAndAfterEnd() {
        var profile = profile(MexicoPayrollProfile.CreditMode.SBC_PERCENT, "20", JAN.plusDays(3), JAN.plusDays(4), "500");
        assertEquals(d("215.00"), calculate(profile, JAN, JAN.plusDays(6), "3500", "3500").withheld());
        assertEquals(d("0.00"), calculate(profile, JAN.plusDays(5), FEB, "20000", "20000").withheld());
    }
    @Test void invalidNoticeCannotBeStored() {
        var profile = profile(MexicoPayrollProfile.CreditMode.FIXED_MONTHLY, "1300", FEB, JAN, "500");
        assertThrows(IllegalArgumentException.class, profile::validate);
    }
}
