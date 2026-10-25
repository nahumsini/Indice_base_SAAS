package com.indice.erp.hr.payroll.provider.mx;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

/** INFONAVIT's notice is independent of the employer's 5% contribution. No debt is fabricated. */
public final class MexicoHousingCreditCalculator {
    private static final BigDecimal TWO = new BigDecimal("2");
    private MexicoHousingCreditCalculator() {}
    public record Result(BigDecimal scheduled, BigDecimal withheld, BigDecimal notWithheld) {}

    public static Result calculate(MexicoPayrollProfile profile, LocalDate from, LocalDate to, BigDecimal umi,
        BigDecimal minimumWage, BigDecimal paidSalary, BigDecimal availableNet) {
        var credit = profile.infonavit();
        if (!credit.enabled()) return zero();
        credit.validate();
        if (credit.legacyPercentageCredit()) throw new IllegalArgumentException("El crédito INFONAVIT anterior a 1998 requiere validar el porcentaje reducido y el SBC de inicio del bimestre.");
        if (credit.mode() == MexicoPayrollProfile.CreditMode.UMI_FACTOR && (umi == null || umi.signum() <= 0))
            throw new IllegalArgumentException("Falta la UMI vigente para el crédito INFONAVIT.");
        var start = from.isBefore(credit.startDate()) ? credit.startDate() : from;
        var end = credit.endDate() != null && to.isAfter(credit.endDate()) ? credit.endDate() : to;
        if (end.isBefore(start)) return zero();
        var scheduled = BigDecimal.ZERO;
        // Fixed/UMI installments retain calendar days even with unpaid absences (art. 29).
        for (var cursor = start; !cursor.isAfter(end);) {
            var bimonthStart = LocalDate.of(cursor.getYear(), ((cursor.getMonthValue() - 1) / 2) * 2 + 1, 1);
            var bimonthEnd = bimonthStart.plusMonths(2).minusDays(1);
            var segmentEnd = end.isBefore(bimonthEnd) ? end : bimonthEnd;
            var days = BigDecimal.valueOf(ChronoUnit.DAYS.between(cursor, segmentEnd) + 1);
            if (credit.mode() == MexicoPayrollProfile.CreditMode.SBC_PERCENT) {
                scheduled = scheduled.add(profile.contributionDailySalary().multiply(credit.value())
                    .movePointLeft(2).multiply(days));
            } else {
                var monthly = credit.mode() == MexicoPayrollProfile.CreditMode.UMI_FACTOR
                    ? money(credit.value().multiply(umi)) : credit.value();
                var bimonthDays = BigDecimal.valueOf(ChronoUnit.DAYS.between(bimonthStart, bimonthEnd) + 1);
                // Difference of cumulative cents reconciles any partition of the same bimonth.
                var before = BigDecimal.valueOf(ChronoUnit.DAYS.between(bimonthStart, cursor));
                var after = before.add(days);
                scheduled = scheduled.add(monthly.multiply(TWO).multiply(after).divide(bimonthDays, 2, RoundingMode.HALF_UP))
                    .subtract(monthly.multiply(TWO).multiply(before).divide(bimonthDays, 2, RoundingMode.HALF_UP));
            }
            // One insurance charge at bimonth close, or on the notice's final date.
            var insuranceDate = credit.endDate() != null && credit.endDate().isBefore(bimonthEnd) ? credit.endDate() : bimonthEnd;
            if (!insuranceDate.isBefore(cursor) && !insuranceDate.isAfter(segmentEnd))
                scheduled = scheduled.add(credit.insuranceBimonthly());
            cursor = segmentEnd.plusDays(1);
        }
        scheduled = money(scheduled);
        var limit = paidSalary.max(BigDecimal.ZERO).min(availableNet.max(BigDecimal.ZERO));
        if (profile.dailySalary().compareTo(minimumWage) <= 0)
            limit = limit.min(paidSalary.max(BigDecimal.ZERO).multiply(new BigDecimal("0.20")));
        // A legal maximum must never round upward past the available salary/cap.
        var withheld = money(scheduled.min(limit.setScale(2, RoundingMode.DOWN)));
        return new Result(scheduled, withheld, money(scheduled.subtract(withheld)));
    }
    private static BigDecimal money(BigDecimal value) { return value.setScale(2, RoundingMode.HALF_UP); }
    private static Result zero() { return new Result(money(BigDecimal.ZERO), money(BigDecimal.ZERO), money(BigDecimal.ZERO)); }
}
