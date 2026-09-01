package com.indice.erp.kpis.executive;

import java.time.LocalDate;
import java.time.Instant;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class ExecutiveKpiService {

    private static final ZoneId BUSINESS_ZONE = ZoneId.of("America/Toronto");
    private static final java.util.Set<String> ALLOWED_PERIODS = java.util.Set.of(
            "monthly", "bimonthly", "quarterly", "semester", "annual", "custom");
    private static final java.util.Set<String> ALLOWED_RISKS = java.util.Set.of(
            "all", "healthy", "watch", "critical");

    private final ExecutiveKpiRepository repository;
    private final ExecutiveKpiDomainService domainService;
    private final ExecutiveDecisionMatrixService decisionMatrixService;

    public ExecutiveKpiService(
            ExecutiveKpiRepository repository,
            ExecutiveKpiDomainService domainService,
            ExecutiveDecisionMatrixService decisionMatrixService) {
        this.repository = repository;
        this.domainService = domainService;
        this.decisionMatrixService = decisionMatrixService;
    }

    public Map<String, Object> getExecutivePanel(long companyId, long userId, Map<String, String> params) {
        var scope = parseScope(companyId, params);
        if (!repository.scopeExists(scope)) {
            throw new IllegalArgumentException("The selected unit or business does not belong to this company.");
        }
        var orgRows = repository.loadOrganizationRows(scope);
        var sales = repository.loadSalesByOrg(scope);
        var collections = repository.loadCollectionsByOrg(scope);
        var expenses = repository.loadExpensesByOrg(scope);
        var receivables = repository.loadReceivablesByOrg(scope);
        var pettyCash = repository.loadPettyCashByOrg(scope);
        var operations = repository.loadOperationsByOrg(scope);
        var attendance = repository.loadAttendanceByOrg(scope);

        var rows = ExecutiveKpiRepository.mergeOrgRows(
                orgRows,
                sales,
                collections,
                expenses,
                receivables,
                pettyCash,
                operations,
                attendance);
        var summary = buildSummary(rows);
        var score = buildExecutiveScore(summary);
        summary.put("executiveScore", score);
        summary.put("operatingMargin", percent(number(summary.get("operatingProfit")), number(summary.get("salesTotal"))));
        var nativeCurrencies = repository.loadNativeCurrencies(scope);

        var body = new LinkedHashMap<String, Object>();
        body.put("range", Map.of(
                "from", scope.from().toString(),
                "to", scope.to().toString(),
                "period", scope.period()));
        body.put("filters", Map.of(
                "unitId", nullable(scope.unitId()),
                "businessId", nullable(scope.businessId()),
                "search", scope.search(),
                "risk", scope.risk()));
        body.put("context", Map.of(
                "currency", scope.preferredCurrency(),
                "nativeCurrencies", nativeCurrencies,
                "generatedAt", Instant.now().toString(),
                "scopeLabel", scopeLabel(scope),
                "authoritativeContract", "domains/2.1",
                "diagnosisContract", "diagnosis/1.0",
                "productPortfolioContract", "portfolio-bcg/1.0",
                "decisionMatrixContract", "decision-matrices/1.0"));
        body.put("summary", summary);
        body.put("kpiCards", buildCards(summary));
        body.put("unitRows", rows);
        body.put("salesBySource", repository.loadSalesBySource(scope));
        body.put("expensesByAccount", repository.loadExpensesByAccount(scope));
        body.put("pettyCash", repository.loadPettyCashSummary(scope));
        body.put("lowProductivity", repository.loadLowProductivity(scope));
        body.put("absenteeism", repository.loadAbsenteeism(scope));
        body.put("alerts", buildAlerts(summary, rows));
        body.put("rankings", buildRankings(rows));
        var executiveSnapshot = domainService.buildSnapshot(scope);
        body.put("domains", executiveSnapshot.domains());
        body.put("diagnosis", executiveSnapshot.diagnosis());
        body.put("productPortfolio", executiveSnapshot.productPortfolio());
        body.put("decisionMatrices", decisionMatrixService.build(
                scope, rows, executiveSnapshot.productPortfolio(), nativeCurrencies));
        return body;
    }

    private ExecutiveKpiScope parseScope(long companyId, Map<String, String> params) {
        var today = LocalDate.now(BUSINESS_ZONE);
        var period = normalize(params.get("period"), "monthly");
        if (!ALLOWED_PERIODS.contains(period)) {
            throw new IllegalArgumentException("period must be monthly, bimonthly, quarterly, semester, annual, or custom.");
        }
        LocalDate from;
        LocalDate to;

        if ("custom".equals(period)) {
            from = parseDate(params.get("from"), today.withDayOfMonth(1), "from");
            to = parseDate(params.get("to"), today, "to");
        } else {
            var month = YearMonth.from(today);
            to = today;
            from = switch (period) {
                case "bimonthly" -> month.minusMonths(1).atDay(1);
                case "quarterly" -> month.minusMonths(2).atDay(1);
                case "semester" -> month.minusMonths(5).atDay(1);
                case "annual" -> today.withDayOfYear(1);
                default -> month.atDay(1);
            };
        }

        if (to.isBefore(from)) {
            throw new IllegalArgumentException("to must be greater than or equal to from.");
        }
        if (to.isAfter(today)) {
            throw new IllegalArgumentException("to cannot be later than the current business date.");
        }

        var risk = normalize(params.get("risk"), "all");
        if (!ALLOWED_RISKS.contains(risk)) {
            throw new IllegalArgumentException("risk must be all, healthy, watch, or critical.");
        }

        return new ExecutiveKpiScope(
                companyId,
                from,
                to,
                period,
                positiveLong(params.get("unitId")),
                positiveLong(params.get("businessId")),
                normalizeSearch(params.get("search")),
                risk,
                normalizeCurrency(params.get("preferredCurrency")),
                today);
    }

    private Map<String, Object> buildSummary(List<Map<String, Object>> rows) {
        double salesTotal = rows.stream().mapToDouble(row -> number(row.get("salesTotal"))).sum();
        double collectedTotal = rows.stream().mapToDouble(row -> number(row.get("collectedTotal"))).sum();
        double expensesTotal = rows.stream().mapToDouble(row -> number(row.get("expensesTotal"))).sum();
        double payablesTotal = rows.stream().mapToDouble(row -> number(row.get("payablesTotal"))).sum();
        double receivablesTotal = rows.stream().mapToDouble(row -> number(row.get("receivablesTotal"))).sum();
        double overdueReceivables = rows.stream().mapToDouble(row -> number(row.get("overdueReceivables"))).sum();
        double pettyCashBalance = rows.stream().mapToDouble(row -> number(row.get("pettyCashBalance"))).sum();
        double operatingProfit = salesTotal - expensesTotal;
        int overdueTasks = rows.stream().mapToInt(row -> integer(row.get("overdueTasks"))).sum();
        int totalTasks = rows.stream().mapToInt(row -> integer(row.get("totalTasks"))).sum();
        int absences = rows.stream().mapToInt(row -> integer(row.get("absences"))).sum();
        int attendanceRecords = rows.stream().mapToInt(row -> integer(row.get("attendanceRecords"))).sum();

        var summary = new LinkedHashMap<String, Object>();
        summary.put("salesTotal", round(salesTotal));
        summary.put("collectedTotal", round(collectedTotal));
        summary.put("expensesTotal", round(expensesTotal));
        summary.put("payablesTotal", round(payablesTotal));
        summary.put("receivablesTotal", round(receivablesTotal));
        summary.put("overdueReceivables", round(overdueReceivables));
        summary.put("pettyCashBalance", round(pettyCashBalance));
        summary.put("operatingProfit", round(operatingProfit));
        summary.put("totalTasks", totalTasks);
        summary.put("overdueTasks", overdueTasks);
        summary.put("absences", absences);
        summary.put("attendanceRate", percent(attendanceRecords - absences, attendanceRecords));
        summary.put("organizationRows", rows.size());
        return summary;
    }

    private List<Map<String, Object>> buildCards(Map<String, Object> summary) {
        return List.of(
                card("sales", "Ventas totales", summary.get("salesTotal"), "Escala comercial del periodo.", "healthy"),
                card("collected", "Ventas cobradas", summary.get("collectedTotal"), "Efectivo recuperado por cobranza.", statusFromRatio(number(summary.get("collectedTotal")), number(summary.get("salesTotal")))),
                card("receivables", "Cartera pendiente", summary.get("receivablesTotal"), "Saldo por cobrar vivo.", riskStatus(number(summary.get("overdueReceivables")), number(summary.get("receivablesTotal")))),
                card("expenses", "Gastos totales", summary.get("expensesTotal"), "Egresos registrados en expenses.", number(summary.get("expensesTotal")) <= number(summary.get("salesTotal")) ? "healthy" : "critical"),
                card("payables", "CxP pendiente", summary.get("payablesTotal"), "Pagos abiertos o vencidos.", number(summary.get("payablesTotal")) > 0 ? "watch" : "healthy"),
                card("profit", "Utilidad operativa", summary.get("operatingProfit"), "Ventas menos gastos operativos.", number(summary.get("operatingProfit")) >= 0 ? "healthy" : "critical"),
                card("margin", "Margen operativo", summary.get("operatingMargin"), "Rentabilidad operativa sobre ventas.", statusFromScore((int) Math.round(number(summary.get("operatingMargin"))))),
                card("score", "Score ejecutivo", summary.get("executiveScore"), "Salud combinada financiera y operativa.", statusFromScore(integer(summary.get("executiveScore")))));
    }

    private List<Map<String, Object>> buildAlerts(Map<String, Object> summary, List<Map<String, Object>> rows) {
        var alerts = new java.util.ArrayList<Map<String, Object>>();
        if (number(summary.get("operatingProfit")) < 0) {
            alerts.add(alert("critical", "Utilidad negativa", "Los gastos superan las ventas del periodo."));
        }
        if (number(summary.get("overdueReceivables")) > 0) {
            alerts.add(alert("watch", "Cartera vencida", "Hay saldo vencido que requiere cobranza activa."));
        }
        if (integer(summary.get("overdueTasks")) > 0) {
            alerts.add(alert("watch", "Tareas vencidas", "La ejecucion operativa tiene compromisos fuera de tiempo."));
        }
        if (integer(summary.get("absences")) > 0) {
            alerts.add(alert("watch", "Ausentismo detectado", "Hay faltas registradas en el periodo seleccionado."));
        }
        rows.stream()
                .filter(row -> number(row.get("operatingProfit")) < 0)
                .findFirst()
                .ifPresent(row -> alerts.add(alert("critical", "Negocio con perdida", row.get("businessName") + " requiere revision de gasto y venta.")));
        if (alerts.isEmpty()) {
            alerts.add(alert("healthy", "Lectura sana", "No hay alertas criticas con el filtro actual."));
        }
        return alerts;
    }

    private Map<String, Object> buildRankings(List<Map<String, Object>> rows) {
        var rankings = new LinkedHashMap<String, Object>();
        rankings.put("topSales", top(rows, "salesTotal"));
        rankings.put("topExpenses", top(rows, "expensesTotal"));
        rankings.put("topProfit", top(rows, "operatingProfit"));
        rankings.put("topReceivables", top(rows, "receivablesTotal"));
        rankings.put("attention", rows.stream()
                .filter(row -> !"healthy".equals(row.get("status")))
                .limit(5)
                .toList());
        return rankings;
    }

    private List<Map<String, Object>> top(List<Map<String, Object>> rows, String key) {
        return rows.stream()
                .sorted(Comparator.comparingDouble((Map<String, Object> row) -> number(row.get(key))).reversed())
                .limit(5)
                .toList();
    }

    private int buildExecutiveScore(Map<String, Object> summary) {
        var marginScore = clamp(number(summary.get("operatingMargin")));
        var collectionScore = clamp(percent(number(summary.get("collectedTotal")), Math.max(1, number(summary.get("salesTotal")))));
        var receivableScore = 100 - clamp(percent(number(summary.get("overdueReceivables")), Math.max(1, number(summary.get("receivablesTotal")))));
        var taskScore = 100 - clamp(percent(integer(summary.get("overdueTasks")), Math.max(1, integer(summary.get("totalTasks")))));
        var attendanceScore = clamp(number(summary.get("attendanceRate")));
        return (int) Math.round((marginScore * 0.25) + (collectionScore * 0.2) + (receivableScore * 0.2)
                + (taskScore * 0.2) + (attendanceScore * 0.15));
    }

    private Map<String, Object> card(String id, String title, Object value, String description, String status) {
        var card = new LinkedHashMap<String, Object>();
        card.put("id", id);
        card.put("title", title);
        card.put("value", value);
        card.put("description", description);
        card.put("status", status);
        return card;
    }

    private Map<String, Object> alert(String status, String title, String description) {
        return Map.of("status", status, "title", title, "description", description);
    }

    private String scopeLabel(ExecutiveKpiScope scope) {
        if (scope.businessId() != null) return "Negocio seleccionado";
        if (scope.unitId() != null) return "Unidad seleccionada";
        return "Empresa completa";
    }

    private String statusFromRatio(double value, double total) {
        if (total <= 0) return "watch";
        return value / total >= 0.75 ? "healthy" : value / total >= 0.45 ? "watch" : "critical";
    }

    private String riskStatus(double risk, double total) {
        if (risk <= 0) return "healthy";
        if (total <= 0) return "watch";
        return risk / total <= 0.12 ? "watch" : "critical";
    }

    private String statusFromScore(int score) {
        if (score >= 85) return "healthy";
        if (score >= 65) return "watch";
        return "critical";
    }

    private int clamp(double value) {
        return (int) Math.round(Math.max(0, Math.min(100, value)));
    }

    private double percent(double value, double total) {
        if (total <= 0) return 0;
        return round((value * 100.0) / total);
    }

    private LocalDate parseDate(String value, LocalDate fallback, String field) {
        if (value == null || value.isBlank()) return fallback;
        try {
            return LocalDate.parse(value.trim());
        } catch (DateTimeParseException ex) {
            throw new IllegalArgumentException(field + " must use YYYY-MM-DD format.");
        }
    }

    private Long positiveLong(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            var parsed = Long.parseLong(value.trim());
            if (parsed <= 0) throw new IllegalArgumentException("scope identifiers must be positive integers.");
            return parsed;
        } catch (NumberFormatException ex) {
            throw new IllegalArgumentException("scope identifiers must be positive integers.");
        }
    }

    private String normalize(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim().toLowerCase();
    }

    private String normalizeCurrency(String value) {
        var currency = value == null || value.isBlank() ? "MXN" : value.trim().toUpperCase();
        if (!currency.matches("[A-Z]{3}")) {
            throw new IllegalArgumentException("preferredCurrency must use a three-letter ISO code.");
        }
        return currency;
    }

    private String normalizeSearch(String value) {
        if (value == null || value.isBlank()) return "";
        var normalized = value.trim().replaceAll("\\s+", " ").toLowerCase();
        return normalized.length() <= 120 ? normalized : normalized.substring(0, 120);
    }

    private Object nullable(Object value) {
        return value == null ? "" : value;
    }

    private double number(Object value) {
        return value instanceof Number number ? number.doubleValue() : 0;
    }

    private int integer(Object value) {
        return value instanceof Number number ? number.intValue() : 0;
    }

    private double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
