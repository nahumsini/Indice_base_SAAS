package com.indice.erp.hr.payroll.reporting.co;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.hr.payroll.engine.PayrollCalculatedLineItem;
import com.indice.erp.hr.payroll.engine.PayrollCalculationContext;
import com.indice.erp.hr.payroll.engine.PayrollLineCalculationResult;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.sql.Types;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class ColombiaPayrollReportingService {

    private static final List<String> PILA_SUPPORTED_NOVELTIES = List.of(
        "ING", "RET", "VSP", "VST", "SLN", "IGE", "LMA", "LPA", "VAC", "SUS", "AUS"
    );

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    public ColombiaPayrollReportingService(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper.copy().findAndRegisterModules();
    }

    public ColombiaPayrollReportingBundle build(
        PayrollCalculationContext context,
        PayrollLineCalculationResult result
    ) {
        var pilaPayload = buildPilaPayload(context, result);
        var dianPayload = buildDianPayload(context, result);
        var pilaIssues = validatePila(context, result, pilaPayload);
        var dianIssues = validateDian(context, result, dianPayload);
        var pilaHash = hashJson(pilaPayload);
        var dianHash = hashJson(dianPayload);
        return new ColombiaPayrollReportingBundle(
            pilaPayload,
            dianPayload,
            pilaIssues,
            dianIssues,
            ColombiaGovernmentReportingResponse.draft(pilaHash, pilaIssues),
            ColombiaGovernmentReportingResponse.draft(dianHash, dianIssues)
        );
    }

    public void persistDraftSnapshots(
        long runLineId,
        PayrollCalculationContext context,
        PayrollLineCalculationResult result
    ) {
        if (!"CO".equals(context.country()) || !context.includeInFiscal()) {
            return;
        }

        var bundle = build(context, result);
        persistSnapshot(runLineId, context, result, "PILA", bundle.pilaPayload(), bundle.pilaIssues(), bundle.pilaResponse());
        persistSnapshot(runLineId, context, result, "DIAN_PAYROLL", bundle.dianPayload(), bundle.dianIssues(), bundle.dianResponse());
    }

    private ColombiaPilaPayload buildPilaPayload(
        PayrollCalculationContext context,
        PayrollLineCalculationResult result
    ) {
        var profile = context.countryProfile();
        var metadata = profile.metadata();
        var employeeMetadata = metadataMap(metadata, "employeeProfile");
        var companyMetadata = metadataMap(metadata, "companyConfig");
        var days = context.attendance().paidDays().add(context.attendance().paidLeaveDays()).max(BigDecimal.ZERO);
        var ibc = firstBase(result, "CO_EPS_EMPLOYEE", "CO_AFP_EMPLOYEE", "CO_ARL", "CO_CCF");
        var trace = trace(context, result);
        trace.put("source", "payroll_calculation_engine:co");
        trace.put("officialReference", "PILA Anexo Tecnico 2 v29 2026 internal draft");

        var totals = new ColombiaPilaPayload.Totals(
            amount(result, "CO_EPS_EMPLOYEE"),
            amount(result, "CO_AFP_EMPLOYEE"),
            amount(result, "CO_SOLIDARITY_FUND"),
            amount(result, "CO_SUBSISTENCE_FUND"),
            amount(result, "CO_EPS_EMPLOYER"),
            amount(result, "CO_AFP_EMPLOYER"),
            amount(result, "CO_ARL"),
            amount(result, "CO_CCF"),
            amount(result, "CO_ICBF"),
            amount(result, "CO_SENA"),
            BigDecimal.ZERO
        );
        totals = new ColombiaPilaPayload.Totals(
            totals.employeeHealth(),
            totals.employeePension(),
            totals.solidarityFund(),
            totals.subsistenceFund(),
            totals.employerHealth(),
            totals.employerPension(),
            totals.arl(),
            totals.ccf(),
            totals.icbf(),
            totals.sena(),
            totals.employeeHealth()
                .add(totals.employeePension())
                .add(totals.solidarityFund())
                .add(totals.subsistenceFund())
                .add(totals.employerHealth())
                .add(totals.employerPension())
                .add(totals.arl())
                .add(totals.ccf())
                .add(totals.icbf())
                .add(totals.sena())
        );

        return new ColombiaPilaPayload(
            "PILA_AT2_V29_2026_INTERNAL",
            "DRAFT_INTERNAL",
            new ColombiaPilaPayload.Header(
                context.companyId(),
                firstText(companyMetadata, metadata, "employerNit", "nit"),
                firstText(companyMetadata, metadata, "employerName", "companyName"),
                "ACTIVOS",
                firstText(companyMetadata, metadata, "pilaPlanillaType", "planillaType", "E"),
                context.periodStartDate(),
                context.periodEndDate(),
                context.periodEndDate()
            ),
            new ColombiaPilaPayload.Contributor(
                context.employeeId(),
                context.userCompanyId(),
                context.salary().employeeCode(),
                context.salary().employeeName(),
                firstText(employeeMetadata, metadata, "documentType", "idType"),
                firstText(employeeMetadata, metadata, "documentNumber", "idNumber"),
                profile.contributorType(),
                profile.contributorSubtype(),
                profile.integralSalary(),
                profile.epsCode(),
                profile.afpCode(),
                profile.compensationFundCode(),
                profile.arlClass(),
                days,
                days,
                days,
                days,
                ibc,
                ibc,
                base(result, "CO_ARL").compareTo(BigDecimal.ZERO) > 0 ? base(result, "CO_ARL") : ibc,
                base(result, "CO_CCF").compareTo(BigDecimal.ZERO) > 0 ? base(result, "CO_CCF") : ibc
            ),
            totals,
            profile.novelties().stream().map((novelty) -> new ColombiaPilaPayload.Novelty(
                novelty.code(),
                novelty.label(),
                novelty.startDate(),
                novelty.endDate(),
                novelty.days(),
                novelty.hours(),
                novelty.ibcImpactAmount(),
                novelty.paid(),
                novelty.affectsIbc()
            )).toList(),
            trace
        );
    }

    private ColombiaDianPayrollPayload buildDianPayload(
        PayrollCalculationContext context,
        PayrollLineCalculationResult result
    ) {
        var profile = context.countryProfile();
        var metadata = profile.metadata();
        var employeeMetadata = metadataMap(metadata, "employeeProfile");
        var companyMetadata = metadataMap(metadata, "companyConfig");
        var basicSalary = amount(result, "BASE_DAILY").add(amount(result, "BASE_HOURLY"));
        var paidLeave = amount(result, "LEAVE_PAY");
        var overtime = amount(result, "OVERTIME");
        var statutoryDeductions = amount(result, "CO_EPS_EMPLOYEE")
            .add(amount(result, "CO_AFP_EMPLOYEE"))
            .add(amount(result, "CO_SOLIDARITY_FUND"))
            .add(amount(result, "CO_SUBSISTENCE_FUND"))
            .add(amount(result, "CO_WITHHOLDING_TAX"));
        var otherDeductions = result.deductionsAmount().subtract(statutoryDeductions).max(BigDecimal.ZERO);
        var variableCompensation = result.items().stream()
            .filter((item) -> "earning".equals(item.category()))
            .filter((item) -> !"BASE_DAILY".equals(item.code()))
            .filter((item) -> !"BASE_HOURLY".equals(item.code()))
            .filter((item) -> !"OVERTIME".equals(item.code()))
            .filter((item) -> !"LEAVE_PAY".equals(item.code()))
            .map(PayrollCalculatedLineItem::amount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        var trace = trace(context, result);
        trace.put("source", "payroll_calculation_engine:co");
        trace.put("officialReference", "DIAN documento soporte de pago de nomina electronica internal draft");

        return new ColombiaDianPayrollPayload(
            "DIAN_PAYROLL_2026_INTERNAL",
            "DRAFT_INTERNAL",
            new ColombiaDianPayrollPayload.Document(
                "DOCUMENTO_SOPORTE_PAGO_NOMINA_ELECTRONICA",
                "NOMINA_INDIVIDUAL",
                context.periodStartDate(),
                context.periodEndDate(),
                context.periodEndDate()
            ),
            new ColombiaDianPayrollPayload.Employer(
                context.companyId(),
                firstText(companyMetadata, metadata, "employerNit", "nit"),
                firstText(companyMetadata, metadata, "employerName", "companyName")
            ),
            new ColombiaDianPayrollPayload.Worker(
                context.employeeId(),
                context.userCompanyId(),
                context.salary().employeeCode(),
                context.salary().employeeName(),
                firstText(employeeMetadata, metadata, "documentType", "idType"),
                firstText(employeeMetadata, metadata, "documentNumber", "idNumber"),
                "CO",
                firstText(employeeMetadata, metadata, "municipalityCode", "municipality"),
                firstText(employeeMetadata, metadata, "workerType", "employee"),
                firstText(employeeMetadata, metadata, "contractType", "laboral"),
                profile.integralSalary()
            ),
            new ColombiaDianPayrollPayload.Accrued(
                basicSalary,
                overtime,
                paidLeave,
                variableCompensation,
                amount(result, "CO_TRANSPORT_ALLOWANCE"),
                result.grossAmount()
            ),
            new ColombiaDianPayrollPayload.Deductions(
                amount(result, "CO_EPS_EMPLOYEE"),
                amount(result, "CO_AFP_EMPLOYEE"),
                amount(result, "CO_SOLIDARITY_FUND"),
                amount(result, "CO_SUBSISTENCE_FUND"),
                amount(result, "CO_WITHHOLDING_TAX"),
                otherDeductions,
                result.deductionsAmount()
            ),
            new ColombiaDianPayrollPayload.Totals(
                result.grossAmount(),
                result.deductionsAmount(),
                result.netAmount(),
                result.totalPayrollCost()
            ),
            adjustmentNotes(result),
            trace
        );
    }

    private List<ColombiaDianPayrollPayload.AdjustmentNote> adjustmentNotes(PayrollLineCalculationResult result) {
        return result.items().stream()
            .filter((item) -> item.code().startsWith("CO_RETROACTIVE_")
                || item.code().startsWith("CO_CORRECTION_")
                || item.code().startsWith("CO_TERMINATION_"))
            .map((item) -> new ColombiaDianPayrollPayload.AdjustmentNote(
                item.code(),
                item.label().isBlank() ? item.legalClassification() : item.label(),
                item.amount()
            ))
            .toList();
    }

    private List<ColombiaReportingValidationIssue> validatePila(
        PayrollCalculationContext context,
        PayrollLineCalculationResult result,
        ColombiaPilaPayload payload
    ) {
        var issues = baseValidation(context, result);
        if (payload.header().employerNit().isBlank()) {
            issues.add(issue("CO_PILA_EMPLOYER_NIT_MISSING", "error", "header.employerNit", "PILA requiere NIT del aportante.", true));
        }
        if (payload.contributor().documentType().isBlank() || payload.contributor().documentNumber().isBlank()) {
            issues.add(issue("CO_PILA_WORKER_DOCUMENT_MISSING", "error", "contributor.document", "PILA requiere tipo y numero de documento del cotizante.", true));
        }
        if (payload.contributor().contributorType().isBlank()) {
            issues.add(issue("CO_PILA_CONTRIBUTOR_TYPE_MISSING", "error", "contributor.contributorType", "PILA requiere tipo de cotizante.", true));
        }
        if (payload.contributor().epsCode().isBlank() || payload.contributor().afpCode().isBlank()) {
            issues.add(issue("CO_PILA_SOCIAL_ENTITIES_MISSING", "warning", "contributor.entities", "EPS o AFP no estan completas; revisar antes de transmitir.", false));
        }
        if (payload.contributor().ibcHealth().compareTo(BigDecimal.ZERO) <= 0) {
            issues.add(issue("CO_PILA_IBC_ZERO", "error", "contributor.ibcHealth", "El IBC de salud debe ser mayor a cero.", true));
        }
        for (var novelty : payload.novelties()) {
            if (!PILA_SUPPORTED_NOVELTIES.contains(novelty.code())) {
                issues.add(issue("CO_PILA_NOVELTY_UNSUPPORTED", "warning", "novelties." + novelty.code(), "La novedad no esta en el set interno soportado para PILA.", false));
            }
        }
        return issues;
    }

    private List<ColombiaReportingValidationIssue> validateDian(
        PayrollCalculationContext context,
        PayrollLineCalculationResult result,
        ColombiaDianPayrollPayload payload
    ) {
        var issues = baseValidation(context, result);
        if (payload.employer().nit().isBlank()) {
            issues.add(issue("CO_DIAN_EMPLOYER_NIT_MISSING", "error", "employer.nit", "DIAN nomina electronica requiere NIT del empleador.", true));
        }
        if (payload.worker().documentType().isBlank() || payload.worker().documentNumber().isBlank()) {
            issues.add(issue("CO_DIAN_WORKER_DOCUMENT_MISSING", "error", "worker.document", "DIAN nomina electronica requiere documento del trabajador.", true));
        }
        var expectedNet = payload.totals().grossAmount().subtract(payload.totals().deductionsAmount()).setScale(2, RoundingMode.HALF_UP);
        if (expectedNet.compareTo(payload.totals().netAmount()) != 0) {
            issues.add(issue("CO_DIAN_TOTALS_MISMATCH", "error", "totals.netAmount", "Total devengado menos deducciones no coincide con neto.", true));
        }
        if (payload.accrued().totalAccrued().compareTo(BigDecimal.ZERO) <= 0) {
            issues.add(issue("CO_DIAN_ACCRUED_ZERO", "error", "accrued.totalAccrued", "El total devengado debe ser mayor a cero.", true));
        }
        return issues;
    }

    private List<ColombiaReportingValidationIssue> baseValidation(
        PayrollCalculationContext context,
        PayrollLineCalculationResult result
    ) {
        var issues = new ArrayList<ColombiaReportingValidationIssue>();
        if (!"CO".equals(context.country())) {
            issues.add(issue("CO_REPORTING_COUNTRY_MISMATCH", "error", "country", "El generador Colombia solo acepta country=CO.", true));
        }
        for (var warning : result.calculationWarnings()) {
            issues.add(issue("CO_CALCULATION_WARNING", "warning", "calculationWarnings", warning, false));
        }
        return issues;
    }

    private void persistSnapshot(
        long runLineId,
        PayrollCalculationContext context,
        PayrollLineCalculationResult result,
        String reportType,
        Object payload,
        List<ColombiaReportingValidationIssue> issues,
        ColombiaGovernmentReportingResponse response
    ) {
        var payloadJson = json(payload);
        var validationJson = json(Map.of(
            "issues", issues,
            "blocking", issues.stream().anyMatch(ColombiaReportingValidationIssue::blocking)
        ));
        var responseJson = json(response);
        jdbcTemplate.update(
            """
                INSERT INTO payroll_government_reporting_snapshots
                (run_id, run_line_id, company_id, user_company_id, country_code, report_type,
                 report_period_start, report_period_end, status, payload_hash, payload_json,
                 validation_json, response_json, generated_by_source)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    run_id = VALUES(run_id),
                    company_id = VALUES(company_id),
                    user_company_id = VALUES(user_company_id),
                    country_code = VALUES(country_code),
                    report_period_start = VALUES(report_period_start),
                    report_period_end = VALUES(report_period_end),
                    status = VALUES(status),
                    payload_hash = VALUES(payload_hash),
                    payload_json = VALUES(payload_json),
                    validation_json = VALUES(validation_json),
                    response_json = VALUES(response_json),
                    generated_by_source = VALUES(generated_by_source),
                    generated_at = CURRENT_TIMESTAMP
                """,
            new Object[] {
                context.runId(),
                runLineId,
                context.companyId(),
                context.userCompanyId(),
                context.country(),
                reportType,
                context.periodStartDate(),
                context.periodEndDate(),
                response.readyForTransmission() ? "draft_ready" : "draft_blocked",
                response.requestHash(),
                payloadJson,
                validationJson,
                responseJson,
                result.calculationSource()
            },
            new int[] {
                context.runId() == null ? Types.NULL : Types.BIGINT,
                Types.BIGINT,
                Types.BIGINT,
                Types.BIGINT,
                Types.VARCHAR,
                Types.VARCHAR,
                Types.DATE,
                Types.DATE,
                Types.VARCHAR,
                Types.VARCHAR,
                Types.VARCHAR,
                Types.VARCHAR,
                Types.VARCHAR,
                Types.VARCHAR
            }
        );
    }

    private BigDecimal amount(PayrollLineCalculationResult result, String code) {
        return result.items().stream()
            .filter((item) -> code.equals(item.code()))
            .map(PayrollCalculatedLineItem::amount)
            .reduce(BigDecimal.ZERO, BigDecimal::add)
            .setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal base(PayrollLineCalculationResult result, String code) {
        return result.items().stream()
            .filter((item) -> code.equals(item.code()))
            .map(PayrollCalculatedLineItem::calculationBase)
            .filter((value) -> value != null && value.compareTo(BigDecimal.ZERO) > 0)
            .findFirst()
            .orElse(BigDecimal.ZERO)
            .setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal firstBase(PayrollLineCalculationResult result, String... codes) {
        for (var code : codes) {
            var value = base(result, code);
            if (value.compareTo(BigDecimal.ZERO) > 0) {
                return value;
            }
        }
        return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
    }

    private Map<String, Object> trace(PayrollCalculationContext context, PayrollLineCalculationResult result) {
        var body = new LinkedHashMap<String, Object>();
        body.put("runId", context.runId());
        body.put("employeeId", context.employeeId());
        body.put("userCompanyId", context.userCompanyId());
        body.put("calculationSource", result.calculationSource());
        body.put("calculationTimestamp", result.calculationTimestamp().toString());
        body.put("ruleSnapshotEffectiveDate", context.periodEndDate().toString());
        return body;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> metadataMap(Map<String, Object> metadata, String key) {
        var value = metadata.get(key);
        if (value instanceof Map<?, ?> rawMap) {
            var sanitized = new LinkedHashMap<String, Object>();
            rawMap.forEach((rawKey, rawValue) -> {
                if (rawKey != null && rawValue != null) {
                    sanitized.put(String.valueOf(rawKey), rawValue);
                }
            });
            return sanitized;
        }
        return Map.of();
    }

    private String firstText(Map<String, Object> primary, Map<String, Object> fallback, String primaryKey, String fallbackKey) {
        return firstText(primary, fallback, primaryKey, fallbackKey, "");
    }

    private String firstText(
        Map<String, Object> primary,
        Map<String, Object> fallback,
        String primaryKey,
        String fallbackKey,
        String defaultValue
    ) {
        var primaryValue = text(primary.get(primaryKey));
        if (!primaryValue.isBlank()) {
            return primaryValue;
        }
        var fallbackValue = text(fallback.get(fallbackKey));
        return fallbackValue.isBlank() ? defaultValue : fallbackValue;
    }

    private ColombiaReportingValidationIssue issue(
        String code,
        String severity,
        String field,
        String message,
        boolean blocking
    ) {
        return new ColombiaReportingValidationIssue(code, severity, field, message, blocking);
    }

    private String json(Object value) {
        try {
            return objectMapper.writeValueAsString(value == null ? Map.of() : value);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Colombia payroll reporting payload could not be serialized.", ex);
        }
    }

    private String hashJson(Object value) {
        try {
            var digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(json(value).getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 is not available for payroll reporting hashes.", ex);
        }
    }

    private String text(Object value) {
        return value == null ? "" : String.valueOf(value).trim();
    }
}
