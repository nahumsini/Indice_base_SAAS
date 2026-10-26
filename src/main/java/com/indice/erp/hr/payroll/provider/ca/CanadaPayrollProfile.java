package com.indice.erp.hr.payroll.provider.ca;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Set;

/** Employee declarations, never client-calculated taxes. Amounts are CAD. */
public record CanadaPayrollProfile(
    LocalDate effectiveFrom, int taxYear, String provinceOfEmployment, int payPeriodsPerYear, int paymentLagDays,
    ClaimMode federalClaimMode, BigDecimal federalClaimAmount,
    ClaimMode provincialClaimMode, BigDecimal provincialClaimAmount,
    BigDecimal additionalTax, BigDecimal additionalQuebecTax, int ontarioDependants,
    PensionStatus pensionStatus, int pensionableMonths, boolean eiExempt, boolean qpipExempt,
    String declarationReference, BigDecimal registeredPlanDeduction, BigDecimal unionDues,
    BigDecimal vacationAccrualPercent, BigDecimal employerEiMultiplier,
    BigDecimal quebecHealthFundPercent, OpeningBalances openingBalances
) {
    public enum ClaimMode { BASIC, DECLARED, NONE, EXEMPT }
    public enum PensionStatus { CONTRIBUTING, UNDER_18, AGE_LIMIT, ELECTION, DISABILITY, EXCLUDED_EMPLOYMENT }
    public static final Set<String> PROVINCES = Set.of("AB","BC","MB","NB","NL","NS","NT","NU","ON","PE","QC","SK","YT");
    public record OpeningBalances(LocalDate asOf, BigDecimal pensionableEarnings, BigDecimal cpp,
        BigDecimal qpp, BigDecimal cpp2, BigDecimal qpp2, BigDecimal ei, BigDecimal qpip, BigDecimal employerQpip) {
        public void validate(int year) {
            if (asOf == null || asOf.getYear() != year) invalid("Revisa el año de los acumulados iniciales.");
            amount(pensionableEarnings, "10000000", "Ingresos pensionables acumulados");
            amount(cpp,"4230.45","CPP acumulado"); amount(qpp,"4479.30","QPP acumulado");
            amount(cpp2,"416","CPP2 acumulado"); amount(qpp2,"416","QPP2 acumulado");
            amount(ei,"1123.07","EI acumulado"); amount(qpip,"442.90","QPIP acumulado");
            amount(employerQpip,"620.06","QPIP patronal acumulado");
        }
        public boolean nonzero() {
            return java.util.stream.Stream.of(pensionableEarnings,cpp,qpp,cpp2,qpp2,ei,qpip,employerQpip).anyMatch(v -> v != null && v.signum()>0);
        }
    }
    public void validate() {
        // A December work period may be paid in January. The profile starts with the work
        // period, while declarations and contribution caps belong to the payment year.
        if (effectiveFrom == null || taxYear < 2026 || taxYear > 2100
            || effectiveFrom.isBefore(LocalDate.of(taxYear - 1, 12, 1))
            || effectiveFrom.isAfter(LocalDate.of(taxYear, 12, 31)))
            invalid("Revisa la vigencia y el año fiscal del pago.");
        if (!PROVINCES.contains(provinceOfEmployment == null ? "" : provinceOfEmployment)) invalid("Selecciona la provincia de empleo.");
        if (!Set.of(12,24,26,27,52,53).contains(payPeriodsPerYear) || paymentLagDays<0 || paymentLagDays>31)
            invalid("Revisa el calendario de pagos.");
        if (federalClaimMode == null || provincialClaimMode == null || pensionStatus == null) invalid("Completa las opciones fiscales.");
        amount(federalClaimAmount,"1000000","Créditos TD1"); amount(provincialClaimAmount,"1000000","Créditos provinciales");
        if ((federalClaimMode != ClaimMode.DECLARED && federalClaimAmount.signum()!=0)
            || (provincialClaimMode != ClaimMode.DECLARED && provincialClaimAmount.signum()!=0)) invalid("El importe declarado solo corresponde a la opción de importe del formulario.");
        amount(additionalTax,"1000000","Retención adicional"); amount(additionalQuebecTax,"1000000","Retención adicional de Québec");
        amount(registeredPlanDeduction,"1000000","Aportación al plan registrado"); amount(unionDues,"1000000","Cuotas sindicales");
        amount(vacationAccrualPercent,"25","Provisión de vacaciones");
        amount(employerEiMultiplier,"1.4","Multiplicador patronal EI",4);
        if (employerEiMultiplier.compareTo(BigDecimal.ONE)<0) invalid("El multiplicador EI debe estar entre 1 y 1.4.");
        if (quebecHealthFundPercent != null) amount(quebecHealthFundPercent,"4.26","Fondo de salud de Québec",4);
        if (ontarioDependants<0 || ontarioDependants>30 || pensionableMonths<1 || pensionableMonths>12) invalid("Revisa dependientes y meses cotizables.");
        if (!"ON".equals(provinceOfEmployment) && ontarioDependants!=0) invalid("Los dependientes de esta reducción corresponden a Ontario.");
        if (!"QC".equals(provinceOfEmployment) && (additionalQuebecTax.signum()!=0 || qpipExempt || quebecHealthFundPercent!=null))
            invalid("Los datos de Québec requieren provincia de empleo Québec.");
        if (declarationReference == null || declarationReference.isBlank() || declarationReference.length()>240)
            invalid("Agrega una referencia a las declaraciones y avisos revisados; no incluyas el SIN.");
        if (openingBalances == null) invalid("Confirma los acumulados de este empleador.");
        openingBalances.validate(taxYear);
    }
    public LocalDate paymentDate(LocalDate periodEnd) { return periodEnd.plusDays(paymentLagDays); }
    static void amount(BigDecimal value,String max,String label) { amount(value,max,label,2); }
    static void amount(BigDecimal value,String max,String label,int scale) {
        if (value==null || value.signum()<0 || value.compareTo(new BigDecimal(max))>0 || value.stripTrailingZeros().scale()>scale)
            invalid("Revisa el valor de "+label+".");
    }
    private static void invalid(String message) { throw new IllegalArgumentException(message); }
}
