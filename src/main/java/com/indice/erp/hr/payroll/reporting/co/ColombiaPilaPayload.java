package com.indice.erp.hr.payroll.reporting.co;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

public record ColombiaPilaPayload(
    String payloadVersion,
    String status,
    Header header,
    Contributor contributor,
    Totals totals,
    List<Novelty> novelties,
    Map<String, Object> trace
) {
    public ColombiaPilaPayload {
        payloadVersion = text(payloadVersion).isBlank() ? "PILA_AT2_V29_2026_INTERNAL" : text(payloadVersion);
        status = text(status).isBlank() ? "DRAFT_INTERNAL" : text(status);
        novelties = novelties == null ? List.of() : List.copyOf(novelties);
        trace = trace == null ? Map.of() : Map.copyOf(trace);
    }

    public record Header(
        long companyId,
        String employerNit,
        String employerName,
        String contributorFileType,
        String planillaType,
        LocalDate periodStartDate,
        LocalDate periodEndDate,
        LocalDate paymentPeriodDate
    ) {
        public Header {
            employerNit = text(employerNit);
            employerName = text(employerName);
            contributorFileType = text(contributorFileType).isBlank() ? "ACTIVOS" : text(contributorFileType);
            planillaType = text(planillaType).isBlank() ? "E" : text(planillaType).toUpperCase();
        }
    }

    public record Contributor(
        long employeeId,
        long userCompanyId,
        String employeeCode,
        String employeeName,
        String documentType,
        String documentNumber,
        String contributorType,
        String contributorSubtype,
        boolean integralSalary,
        String epsCode,
        String afpCode,
        String compensationFundCode,
        BigDecimal arlClass,
        BigDecimal healthDays,
        BigDecimal pensionDays,
        BigDecimal riskDays,
        BigDecimal compensationFundDays,
        BigDecimal ibcHealth,
        BigDecimal ibcPension,
        BigDecimal ibcRisk,
        BigDecimal ibcParafiscal
    ) {
        public Contributor {
            employeeCode = text(employeeCode);
            employeeName = text(employeeName);
            documentType = text(documentType);
            documentNumber = text(documentNumber);
            contributorType = text(contributorType);
            contributorSubtype = text(contributorSubtype);
            epsCode = text(epsCode);
            afpCode = text(afpCode);
            compensationFundCode = text(compensationFundCode);
            arlClass = money(arlClass);
            healthDays = day(healthDays);
            pensionDays = day(pensionDays);
            riskDays = day(riskDays);
            compensationFundDays = day(compensationFundDays);
            ibcHealth = money(ibcHealth);
            ibcPension = money(ibcPension);
            ibcRisk = money(ibcRisk);
            ibcParafiscal = money(ibcParafiscal);
        }
    }

    public record Totals(
        BigDecimal employeeHealth,
        BigDecimal employeePension,
        BigDecimal solidarityFund,
        BigDecimal subsistenceFund,
        BigDecimal employerHealth,
        BigDecimal employerPension,
        BigDecimal arl,
        BigDecimal ccf,
        BigDecimal icbf,
        BigDecimal sena,
        BigDecimal totalContributions
    ) {
        public Totals {
            employeeHealth = money(employeeHealth);
            employeePension = money(employeePension);
            solidarityFund = money(solidarityFund);
            subsistenceFund = money(subsistenceFund);
            employerHealth = money(employerHealth);
            employerPension = money(employerPension);
            arl = money(arl);
            ccf = money(ccf);
            icbf = money(icbf);
            sena = money(sena);
            totalContributions = money(totalContributions);
        }
    }

    public record Novelty(
        String code,
        String label,
        LocalDate startDate,
        LocalDate endDate,
        BigDecimal days,
        BigDecimal hours,
        BigDecimal ibcImpactAmount,
        boolean paid,
        boolean affectsIbc
    ) {
        public Novelty {
            code = text(code).toUpperCase();
            label = text(label);
            days = day(days);
            hours = day(hours);
            ibcImpactAmount = money(ibcImpactAmount);
        }
    }

    private static String text(String value) {
        return value == null ? "" : value.trim();
    }

    private static BigDecimal money(BigDecimal value) {
        return value == null ? BigDecimal.ZERO.setScale(2) : value.setScale(2, java.math.RoundingMode.HALF_UP);
    }

    private static BigDecimal day(BigDecimal value) {
        return value == null ? BigDecimal.ZERO.setScale(2) : value.setScale(2, java.math.RoundingMode.HALF_UP);
    }
}
