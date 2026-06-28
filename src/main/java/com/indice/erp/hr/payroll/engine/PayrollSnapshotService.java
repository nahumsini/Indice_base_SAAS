package com.indice.erp.hr.payroll.engine;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.Timestamp;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class PayrollSnapshotService {

    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {};
    private static final TypeReference<List<Object>> LIST_TYPE = new TypeReference<>() {};

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    public PayrollSnapshotService(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }

    public void persistLineSnapshot(
        long lineId,
        PayrollCalculationContext context,
        PayrollLineCalculationResult result
    ) {
        jdbcTemplate.update(
            """
                UPDATE payroll_run_lines
                SET country_code_snapshot = ?,
                    jurisdiction_code_snapshot = ?,
                    currency_code_snapshot = ?,
                    fx_rate = ?,
                    calculation_source = ?,
                    calculation_timestamp = ?,
                    employee_salary_snapshot_json = ?,
                    attendance_snapshot_json = ?,
                    manual_adjustments_snapshot_json = ?,
                    calculation_inputs_json = ?,
                    calculation_results_json = ?,
                    rule_snapshot_json = ?,
                    attendance_warnings_json = ?
                WHERE id = ?
                """,
            context.country(),
            context.jurisdiction(),
            context.currency(),
            context.fxRate(),
            result.calculationSource(),
            Timestamp.valueOf(result.calculationTimestamp()),
            jsonValue(context.salary()),
            jsonValue(context.attendance()),
            jsonValue(context.manualAdjustments()),
            jsonValue(result.calculationInputs()),
            jsonValue(result.calculationResults()),
            jsonValue(mergedRuleSnapshot(result)),
            jsonValue(result.attendanceWarnings()),
            lineId
        );
    }

    public void persistRunSnapshot(long runId, PayrollCalculationResult result) {
        var summary = new LinkedHashMap<String, Object>();
        summary.put("grossAmount", result.grossAmount());
        summary.put("deductionsAmount", result.deductionsAmount());
        summary.put("employerContributionsAmount", result.employerContributionsAmount());
        summary.put("netAmount", result.netAmount());
        summary.put("totalPayrollCost", result.totalPayrollCost());
        summary.put("linesCount", result.lines().size());
        summary.put("statutoryCompliance", result.lines().stream().allMatch(PayrollLineCalculationResult::statutoryCompliance));
        summary.put("calculationWarnings", result.lines().stream()
            .flatMap((line) -> line.calculationWarnings().stream())
            .distinct()
            .toList());
        jdbcTemplate.update(
            """
                UPDATE payroll_runs
                SET calculation_source = 'payroll_calculation_engine',
                    calculation_timestamp = CURRENT_TIMESTAMP,
                    calculation_snapshot_json = ?
                WHERE id = ?
                """,
            jsonValue(summary),
            runId
        );
    }

    public Map<String, Object> parseObject(String rawJson) {
        if (rawJson == null || rawJson.isBlank()) {
            return Map.of();
        }
        try {
            return objectMapper.readValue(rawJson, MAP_TYPE);
        } catch (JsonProcessingException ex) {
            return Map.of();
        }
    }

    public List<Object> parseList(String rawJson) {
        if (rawJson == null || rawJson.isBlank()) {
            return List.of();
        }
        try {
            return objectMapper.readValue(rawJson, LIST_TYPE);
        } catch (JsonProcessingException ex) {
            return List.of();
        }
    }

    public String jsonValue(Object value) {
        try {
            return objectMapper.writeValueAsString(value == null ? Map.of() : value);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Payroll calculation snapshot could not be serialized.", ex);
        }
    }

    private Map<String, Object> mergedRuleSnapshot(PayrollLineCalculationResult result) {
        var snapshot = new LinkedHashMap<String, Object>();
        snapshot.putAll(result.ruleSnapshot());
        snapshot.put("statutoryCompliance", result.statutoryCompliance());
        snapshot.put("calculationWarnings", result.calculationWarnings());
        snapshot.put("auditBreakdown", result.auditBreakdown());
        return snapshot;
    }
}
