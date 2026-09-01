package com.indice.erp.ai.business;

import com.indice.erp.kpis.executive.ExecutiveKpiService;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class AiBusinessSnapshotService {

    private final ExecutiveKpiService executiveKpiService;

    public AiBusinessSnapshotService(ExecutiveKpiService executiveKpiService) {
        this.executiveKpiService = executiveKpiService;
    }

    public AiBusinessSnapshotResponse get(
        long companyId,
        long userId,
        Map<String, String> params
    ) {
        var panel = executiveKpiService.getExecutivePanel(companyId, userId, params);
        var range = object(panel, "range");
        var context = object(panel, "context");
        var summary = object(panel, "summary");

        return new AiBusinessSnapshotResponse(
            new AiBusinessSnapshotResponse.Range(
                LocalDate.parse(text(range, "from")),
                LocalDate.parse(text(range, "to")),
                text(range, "period")
            ),
            new AiBusinessSnapshotResponse.Context(
                text(context, "currency"),
                instant(context, "generatedAt"),
                text(context, "scopeLabel")
            ),
            new AiBusinessSnapshotResponse.Summary(
                decimal(summary, "salesTotal"),
                decimal(summary, "collectedTotal"),
                decimal(summary, "expensesTotal"),
                decimal(summary, "payablesTotal"),
                decimal(summary, "receivablesTotal"),
                decimal(summary, "overdueReceivables"),
                decimal(summary, "pettyCashBalance"),
                decimal(summary, "operatingProfit"),
                decimal(summary, "operatingMargin"),
                integer(summary, "totalTasks"),
                integer(summary, "overdueTasks"),
                integer(summary, "absences"),
                decimal(summary, "attendanceRate"),
                integer(summary, "organizationRows"),
                integer(summary, "executiveScore")
            ),
            alerts(panel)
        );
    }

    private List<AiBusinessSnapshotResponse.Alert> alerts(Map<String, Object> panel) {
        var value = panel.get("alerts");
        if (!(value instanceof List<?> rows)) {
            throw invalidContract("alerts");
        }
        return rows.stream().map(row -> {
            if (!(row instanceof Map<?, ?> values)) {
                throw invalidContract("alerts");
            }
            return new AiBusinessSnapshotResponse.Alert(
                text(values, "status"),
                text(values, "title"),
                text(values, "description")
            );
        }).toList();
    }

    private Map<?, ?> object(Map<String, Object> source, String key) {
        var value = source.get(key);
        if (!(value instanceof Map<?, ?> map)) {
            throw invalidContract(key);
        }
        return map;
    }

    private String text(Map<?, ?> source, String key) {
        var value = source.get(key);
        if (!(value instanceof String text) || text.isBlank()) {
            throw invalidContract(key);
        }
        return text;
    }

    private double decimal(Map<?, ?> source, String key) {
        var value = source.get(key);
        if (!(value instanceof Number number)) {
            throw invalidContract(key);
        }
        return number.doubleValue();
    }

    private Instant instant(Map<?, ?> source, String key) {
        var value = source.get(key);
        if (value instanceof Instant instant) {
            return instant;
        }
        if (value instanceof String text) {
            return Instant.parse(text);
        }
        throw invalidContract(key);
    }

    private int integer(Map<?, ?> source, String key) {
        var value = source.get(key);
        if (!(value instanceof Number number)) {
            throw invalidContract(key);
        }
        return number.intValue();
    }

    private IllegalStateException invalidContract(String field) {
        return new IllegalStateException("Executive KPI contract is missing " + field + ".");
    }
}
