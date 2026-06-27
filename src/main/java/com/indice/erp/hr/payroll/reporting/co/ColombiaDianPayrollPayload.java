package com.indice.erp.hr.payroll.reporting.co;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

public record ColombiaDianPayrollPayload(
    String payloadVersion,
    String status,
    Document document,
    Employer employer,
    Worker worker,
    Accrued accrued,
    Deductions deductions,
    Totals totals,
    List<AdjustmentNote> adjustmentNotes,
    Map<String, Object> trace
) {
    public ColombiaDianPayrollPayload {
        payloadVersion = text(payloadVersion).isBlank() ? "DIAN_PAYROLL_2026_INTERNAL" : text(payloadVersion);
        status = text(status).isBlank() ? "DRAFT_INTERNAL" : text(status);
        adjustmentNotes = adjustmentNotes == null ? List.of() : List.copyOf(adjustmentNotes);
        trace = trace == null ? Map.of() : Map.copyOf(trace);
    }

    public record Document(
        String documentType,
        String operationType,
        LocalDate periodStartDate,
        LocalDate periodEndDate,
        LocalDate paymentDate
    ) {
        public Document {
            documentType = text(documentType).isBlank() ? "DOCUMENTO_SOPORTE_PAGO_NOMINA_ELECTRONICA" : text(documentType);
            operationType = text(operationType).isBlank() ? "NOMINA_INDIVIDUAL" : text(operationType);
        }
    }

    public record Employer(
        long companyId,
        String nit,
        String name
    ) {
        public Employer {
            nit = text(nit);
            name = text(name);
        }
    }

    public record Worker(
        long employeeId,
        long userCompanyId,
        String employeeCode,
        String name,
        String documentType,
        String documentNumber,
        String country,
        String municipalityCode,
        String workerType,
        String contractType,
        boolean integralSalary
    ) {
        public Worker {
            employeeCode = text(employeeCode);
            name = text(name);
            documentType = text(documentType);
            documentNumber = text(documentNumber);
            country = text(country).isBlank() ? "CO" : text(country);
            municipalityCode = text(municipalityCode);
            workerType = text(workerType);
            contractType = text(contractType);
        }
    }

    public record Accrued(
        BigDecimal basicSalary,
        BigDecimal overtime,
        BigDecimal paidLeave,
        BigDecimal variableCompensation,
        BigDecimal transportAllowance,
        BigDecimal totalAccrued
    ) {
        public Accrued {
            basicSalary = money(basicSalary);
            overtime = money(overtime);
            paidLeave = money(paidLeave);
            variableCompensation = money(variableCompensation);
            transportAllowance = money(transportAllowance);
            totalAccrued = money(totalAccrued);
        }
    }

    public record Deductions(
        BigDecimal eps,
        BigDecimal afp,
        BigDecimal solidarityFund,
        BigDecimal subsistenceFund,
        BigDecimal withholdingTax,
        BigDecimal otherDeductions,
        BigDecimal totalDeductions
    ) {
        public Deductions {
            eps = money(eps);
            afp = money(afp);
            solidarityFund = money(solidarityFund);
            subsistenceFund = money(subsistenceFund);
            withholdingTax = money(withholdingTax);
            otherDeductions = money(otherDeductions);
            totalDeductions = money(totalDeductions);
        }
    }

    public record Totals(
        BigDecimal grossAmount,
        BigDecimal deductionsAmount,
        BigDecimal netAmount,
        BigDecimal employerCost
    ) {
        public Totals {
            grossAmount = money(grossAmount);
            deductionsAmount = money(deductionsAmount);
            netAmount = money(netAmount);
            employerCost = money(employerCost);
        }
    }

    public record AdjustmentNote(
        String noteType,
        String reason,
        BigDecimal amount
    ) {
        public AdjustmentNote {
            noteType = text(noteType);
            reason = text(reason);
            amount = money(amount);
        }
    }

    private static String text(String value) {
        return value == null ? "" : value.trim();
    }

    private static BigDecimal money(BigDecimal value) {
        return value == null ? BigDecimal.ZERO.setScale(2) : value.setScale(2, java.math.RoundingMode.HALF_UP);
    }
}
