package com.indice.erp.hr.payroll.provider.mx;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Set;

/** Dated employer/employee inputs, never inferred from the employee's take-home pay. */
public record MexicoPayrollProfile(
    LocalDate effectiveFrom,
    BigDecimal dailySalary,
    BigDecimal contributionDailySalary,
    SalaryBasis salaryBasis,
    MinimumWageZone minimumWageZone,
    String employerRegistration,
    BigDecimal riskPremiumPercent,
    String stateCode,
    BigDecimal statePayrollTaxPercent,
    String statePayrollTaxReference,
    InfonavitCredit infonavit
) {
    public enum SalaryBasis { FIXED, VARIABLE, MIXED }
    public enum MinimumWageZone { GENERAL, NORTHERN_BORDER }
    public enum CreditMode { FIXED_MONTHLY, SBC_PERCENT, UMI_FACTOR }
    public static final Set<String> STATES = Set.of("AGU", "BCN", "BCS", "CAM", "CHP", "CHH", "CMX", "COA",
        "COL", "DUR", "GUA", "GRO", "HID", "JAL", "MEX", "MIC", "MOR", "NAY", "NLE", "OAX", "PUE", "QUE",
        "ROO", "SLP", "SIN", "SON", "TAB", "TAM", "TLA", "VER", "YUC", "ZAC");

    public record InfonavitCredit(boolean enabled, String creditNumber, String noticeReference,
        LocalDate startDate, LocalDate endDate, CreditMode mode, BigDecimal value,
        BigDecimal insuranceBimonthly, boolean legacyPercentageCredit) {
        public void validate() {
            if (!enabled) return;
            require(creditNumber != null && creditNumber.matches("[0-9]{10}"), "INFONAVIT: indica el número de crédito de 10 dígitos.");
            require(noticeReference != null && !noticeReference.isBlank() && noticeReference.length() <= 200,
                "INFONAVIT: indica la referencia del aviso de retención.");
            require(startDate != null && (endDate == null || !endDate.isBefore(startDate)), "INFONAVIT: revisa la vigencia del aviso.");
            require(mode != null, "INFONAVIT: selecciona la modalidad del aviso.");
            require(!legacyPercentageCredit || mode == CreditMode.SBC_PERCENT,
                "INFONAVIT: el beneficio anterior a 1998 sólo corresponde a créditos porcentuales.");
            positive(value, "INFONAVIT: indica el importe, porcentaje o factor del aviso.");
            require(value.scale() <= 6 && value.compareTo(new BigDecimal("1000000")) <= 0, "INFONAVIT: valor fuera de rango.");
            require(mode != CreditMode.SBC_PERCENT || value.compareTo(new BigDecimal("100")) <= 0, "INFONAVIT: porcentaje fuera de rango.");
            require(insuranceBimonthly != null && insuranceBimonthly.signum() >= 0 && insuranceBimonthly.scale() <= 2
                && insuranceBimonthly.compareTo(new BigDecimal("1000")) <= 0, "INFONAVIT: revisa el seguro bimestral.");
        }
    }

    public void validate() {
        require(effectiveFrom != null, "Indica desde cuándo están vigentes estos datos.");
        positive(dailySalary, "Indica el salario diario contractual.");
        positive(contributionDailySalary, "Indica el SBC diario registrado ante el IMSS.");
        require(dailySalary.scale() <= 2 && contributionDailySalary.scale() <= 2
            && dailySalary.compareTo(new BigDecimal("1000000")) <= 0, "Revisa los importes diarios (máximo dos decimales).");
        require(salaryBasis != null && minimumWageZone != null, "Selecciona el tipo de salario y la zona salarial.");
        require(employerRegistration != null && employerRegistration.matches("[A-Z0-9]{11}"), "Indica el registro patronal de 11 caracteres.");
        require(riskPremiumPercent != null && riskPremiumPercent.compareTo(new BigDecimal("0.5")) >= 0
            && riskPremiumPercent.compareTo(new BigDecimal("15")) <= 0 && riskPremiumPercent.scale() <= 5,
            "La prima de riesgo debe estar entre 0.5 % y 15 %, con hasta cinco decimales.");
        require(STATES.contains(stateCode), "Selecciona la entidad federativa del centro de trabajo.");
        require(statePayrollTaxPercent != null && statePayrollTaxPercent.signum() >= 0
            && statePayrollTaxPercent.compareTo(new BigDecimal("10")) <= 0 && statePayrollTaxPercent.scale() <= 4,
            "Revisa la tasa de ISN aplicable.");
        require(statePayrollTaxReference != null && !statePayrollTaxReference.isBlank() && statePayrollTaxReference.length() <= 300,
            "Documenta el fundamento y vigencia de la tasa de ISN.");
        require(infonavit != null, "Confirma si el colaborador tiene crédito INFONAVIT.");
        infonavit.validate();
    }

    private static void positive(BigDecimal value, String message) { require(value != null && value.signum() > 0, message); }
    private static void require(boolean condition, String message) { if (!condition) throw new IllegalArgumentException(message); }
}
