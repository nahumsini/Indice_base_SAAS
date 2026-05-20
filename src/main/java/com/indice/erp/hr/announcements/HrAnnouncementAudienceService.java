package com.indice.erp.hr.announcements;

import static com.indice.erp.hr.shared.HrPayloadUtils.longList;
import static com.indice.erp.hr.shared.HrPayloadUtils.stringList;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class HrAnnouncementAudienceService {

    private final JdbcTemplate jdbcTemplate;

    public HrAnnouncementAudienceService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public Map<String, List<String>> normalizeTargets(
        long companyId,
        String audienceType,
        Map<String, Object> payload
    ) {
        return switch (audienceType) {
            case "all" -> Map.of();
            case "units" -> targets("unit", requireUnits(companyId, payload));
            case "departments" -> targets("department", requireDepartments(companyId, payload));
            case "employees" -> targets("employee", requireEmployees(companyId, payload));
            default -> throw new IllegalArgumentException("Unsupported audience type.");
        };
    }

    public String summarize(long companyId, String audienceType, List<HrAnnouncementTargetRow> targets) {
        return switch (audienceType) {
            case "all" -> "Todo el personal";
            case "units" -> buildUnitSummary(companyId, targets);
            case "departments" -> targets.stream()
                .map(HrAnnouncementTargetRow::targetValue)
                .map(value -> value.replace('_', ' '))
                .collect(Collectors.joining(", "));
            case "employees" -> targets.isEmpty()
                ? "Sin destinatarios"
                : targets.size() == 1 ? "1 colaborador" : targets.size() + " colaboradores";
            default -> "Segmentado";
        };
    }

    private List<String> requireUnits(long companyId, Map<String, Object> payload) {
        var values = unique(stringList(payload, "unit_ids", "units", "unidades"));
        if (values.isEmpty()) {
            throw new IllegalArgumentException("At least one unit target is required.");
        }
        requireExisting(companyId, values, "units", "id", "unit target");
        return values;
    }

    private List<String> requireDepartments(long companyId, Map<String, Object> payload) {
        var values = unique(stringList(payload, "department_names", "departments", "departamentos"));
        if (values.isEmpty()) {
            throw new IllegalArgumentException("At least one department target is required.");
        }
        var normalized = values.stream().map(value -> value.toLowerCase(Locale.ROOT)).toList();
        requireExisting(companyId, normalized, "user_work_profiles", "LOWER(TRIM(department))", "department target");
        return values;
    }

    private List<String> requireEmployees(long companyId, Map<String, Object> payload) {
        var values = unique(longList(payload, "user_company_ids", "employees", "colaboradoresEspecificos")
            .stream()
            .map(String::valueOf)
            .toList());
        if (values.isEmpty()) {
            throw new IllegalArgumentException("At least one HR user target is required.");
        }
        requireExisting(companyId, values, "user_companies", "id", "HR user target");
        return values;
    }

    private void requireExisting(
        long companyId,
        List<String> values,
        String tableName,
        String columnName,
        String label
    ) {
        var params = new ArrayList<Object>();
        params.add(companyId);
        params.addAll(values);
        var count = jdbcTemplate.queryForObject(
            """
                SELECT COUNT(DISTINCT %s)
                FROM %s
                WHERE company_id = ?
                  AND %s IN (%s)
                  AND LOWER(COALESCE(status, 'active')) IN ('active', 'activo')
                """.formatted(columnName, tableName, columnName, placeholders(values.size())),
            Integer.class,
            params.toArray()
        );
        if (count == null || count != values.size()) {
            throw new IllegalArgumentException("Invalid " + label + ".");
        }
    }

    private String buildUnitSummary(long companyId, List<HrAnnouncementTargetRow> targets) {
        var unitIds = targets.stream().map(HrAnnouncementTargetRow::targetValue).filter(value -> !value.isBlank()).toList();
        if (unitIds.isEmpty()) {
            return "Sin unidades";
        }
        var params = new ArrayList<Object>();
        params.add(companyId);
        params.addAll(unitIds);
        var names = jdbcTemplate.query(
            "SELECT name FROM units WHERE company_id = ? AND id IN (%s) ORDER BY name ASC".formatted(placeholders(unitIds.size())),
            (rs, rowNum) -> rs.getString("name"),
            params.toArray()
        );
        return names.isEmpty() ? "Unidades seleccionadas" : String.join(", ", names);
    }

    private Map<String, List<String>> targets(String targetType, List<String> values) {
        var result = new LinkedHashMap<String, List<String>>();
        result.put(targetType, values);
        return result;
    }

    private List<String> unique(List<String> values) {
        return values.stream().filter(value -> !value.isBlank()).distinct().toList();
    }

    private String placeholders(int count) {
        return "?,".repeat(count).replaceAll(",$", "");
    }
}
