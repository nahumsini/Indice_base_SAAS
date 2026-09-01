package com.indice.erp.kpis.executive;

import com.indice.erp.kpis.executive.ExecutiveKpiDiagnosisContracts.CrossSectorFinding;
import com.indice.erp.kpis.executive.ExecutiveKpiDiagnosisContracts.Diagnosis;
import com.indice.erp.kpis.executive.ExecutiveKpiDiagnosisContracts.DiagnosisQuality;
import com.indice.erp.kpis.executive.ExecutiveKpiDiagnosisContracts.Finding;
import com.indice.erp.kpis.executive.ExecutiveKpiDiagnosisContracts.Methodology;
import com.indice.erp.kpis.executive.ExecutiveKpiDiagnosisContracts.Sector;
import com.indice.erp.kpis.executive.ExecutiveKpiDomainContracts.Dashboard;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class ExecutiveKpiDiagnosisService {

    static final int MINIMUM_SECTOR_COVERAGE = 50;
    private static final BigDecimal HEALTHY_POINTS = new BigDecimal("100.00");
    private static final BigDecimal WATCH_POINTS = new BigDecimal("60.00");
    private static final BigDecimal CRITICAL_POINTS = new BigDecimal("25.00");

    public Diagnosis build(
            ExecutiveKpiScope scope,
            Dashboard dashboard,
            ExecutiveKpiDomainRepository.PeopleSnapshot people) {
        var findings = new ArrayList<Finding>();
        findings.addAll(peopleFindings(people));
        findings.add(metricFinding(dashboard, "process_completion", "processTasks",
                "completionRate", 40, "processes-tasks"));
        findings.add(metricFinding(dashboard, "process_overdue", "processTasks",
                "overdueTasks", 35, "processes-tasks"));
        findings.add(metricFinding(dashboard, "process_ownership", "processTasks",
                "unassignedTasks", 25, "processes-tasks"));
        findings.add(metricFinding(dashboard, "product_stockouts", "inventory",
                "outOfStock", 30, "inventory"));
        findings.add(metricFinding(dashboard, "product_low_stock", "inventory",
                "lowStock", 20, "inventory"));
        findings.add(metricFinding(dashboard, "product_sales_momentum", "sales",
                "netSales", 30, "sales"));
        findings.add(metricFinding(dashboard, "product_conversion", "sales",
                "conversion", 20, "sales"));
        findings.add(metricFinding(dashboard, "finance_budget_control", "expenses",
                "budgetUsage", 30, "expenses"));
        findings.add(metricFinding(dashboard, "finance_overdue_payables", "expenses",
                "overduePayables", 30, "expenses"));
        findings.add(metricFinding(dashboard, "finance_petty_cash_usage", "pettyCash",
                "utilization", 20, "petty-cash"));
        findings.add(metricFinding(dashboard, "finance_fund_attention", "pettyCash",
                "attentionFunds", 20, "petty-cash"));

        var sectorIds = List.of("people", "processes", "products", "finance");
        var sectors = sectorIds.stream()
                .map(id -> buildSector(id, findings.stream().filter(item -> sectorOf(item.code()).equals(id)).toList()))
                .toList();
        var scoredSectors = sectors.stream().filter(sector -> sector.score() != null).toList();
        var overallScore = scoredSectors.size() == sectors.size()
                ? average(scoredSectors.stream().map(Sector::score).toList())
                : null;
        var coverage = weightedCoverage(findings);
        var status = overallScore == null ? worstStatus(sectors) : statusFromScore(overallScore);
        var priority = sectors.stream()
                .min(Comparator.comparingInt((Sector sector) -> severity(sector.status())).reversed()
                        .thenComparing(sector -> sector.score() == null ? BigDecimal.ZERO : sector.score()))
                .map(Sector::id)
                .orElse("people");
        var unavailableCodes = findings.stream().filter(finding -> !finding.available()).map(Finding::code).toList();
        var issues = new ArrayList<>(dashboard.dataQuality().issues());
        if (people.invalidStatusRows() > 0) issues.add("Personas: hay registros de asistencia con estado no reconocido.");
        if (people.invalidMinutesRows() > 0) issues.add("Personas: hay registros de asistencia con minutos de retraso negativos.");
        if (people.activeCollaborators() > 0 && people.attendanceRecords() == 0) {
            issues.add("Personas: no hay registros de asistencia en el periodo seleccionado.");
        } else if (people.attendanceRecords() > 0 && people.scheduledAttendanceRecords() == 0) {
            issues.add("Personas: no hay jornadas con estado comparable de presencia, retraso o ausencia.");
        }
        var peopleReliable = people.invalidStatusRows() == 0 && people.invalidMinutesRows() == 0;
        var decisionReady = dashboard.dataQuality().decisionReady()
                && peopleReliable
                && sectors.stream().allMatch(Sector::decisionReady);
        var crossSector = crossSectorFindings(findings);

        return new Diagnosis(
                "1.0",
                new Methodology(
                        "indice-four-sectors",
                        "1.0",
                        MINIMUM_SECTOR_COVERAGE,
                        HEALTHY_POINTS,
                        WATCH_POINTS,
                        CRITICAL_POINTS,
                        "Promedio ponderado de reglas disponibles; los datos ausentes reducen cobertura y no reciben cero."),
                status,
                overallScore,
                coverage,
                decisionReady,
                priority,
                sectors,
                crossSector,
                new DiagnosisQuality(
                        decisionReady,
                        List.copyOf(issues),
                        unavailableCodes,
                        "domains/2.1+attendance/repeatable-read",
                        scope.snapshotDate().toString(),
                        decisionReady
                                ? "Cobertura suficiente y fuentes consistentes para orientar la revisión ejecutiva."
                                : "Lectura orientativa: revise los vacíos o anomalías antes de convertirla en una decisión definitiva."));
    }

    private List<Finding> peopleFindings(ExecutiveKpiDomainRepository.PeopleSnapshot people) {
        var reliable = people.invalidStatusRows() == 0 && people.invalidMinutesRows() == 0;
        var attendanceAvailable = people.scheduledAttendanceRecords() > 0 && reliable;
        var presentRecords = Math.max(0, people.scheduledAttendanceRecords() - people.absenceRecords());
        var punctualityAvailable = presentRecords > 0 && reliable;
        var attendanceRate = attendanceAvailable
                ? percent(presentRecords, people.scheduledAttendanceRecords())
                : BigDecimal.ZERO;
        var punctualityRate = punctualityAvailable
                ? percent(Math.max(0, presentRecords - people.lateRecords()), presentRecords)
                : BigDecimal.ZERO;
        return List.of(
                observedFinding("people_attendance", "people", "attendanceRate", attendanceRate,
                        attendanceAvailable ? scoreStatus(attendanceRate) : "watch", attendanceAvailable, 55, "human-resources"),
                observedFinding("people_punctuality", "people", "punctualityRate", punctualityRate,
                        punctualityAvailable ? scoreStatus(punctualityRate) : "watch", punctualityAvailable, 45, "human-resources"));
    }

    private Finding observedFinding(
            String code,
            String sourceDomain,
            String metricId,
            BigDecimal value,
            String status,
            boolean available,
            int weight,
            String ownerModule) {
        return new Finding(code, kind(status, available), available ? status : "watch", sourceDomain, metricId,
                available ? value : null, null, "percent", available, false, "period", weight, ownerModule);
    }

    private Finding metricFinding(
            Dashboard dashboard,
            String code,
            String domainId,
            String metricId,
            int weight,
            String ownerModule) {
        var metric = dashboard.items().stream()
                .filter(domain -> domain.id().equals(domainId))
                .flatMap(domain -> domain.metrics().stream())
                .filter(item -> item.id().equals(metricId))
                .findFirst()
                .orElse(null);
        if (metric == null) {
            return new Finding(code, "data_gap", "watch", domainId, metricId, null, null,
                    "count", false, false, "unknown", weight, ownerModule);
        }
        return new Finding(code, kind(metric.status(), metric.available()), metric.status(), domainId, metric.id(),
                metric.available() ? metric.value() : null,
                metric.comparisonAvailable() ? metric.previousValue() : null,
                metric.unit(), metric.available(), metric.partial(), metric.basis(), weight, ownerModule);
    }

    private Sector buildSector(String id, List<Finding> findings) {
        var coverage = weightedCoverage(findings);
        var score = coverage >= MINIMUM_SECTOR_COVERAGE ? weightedScore(findings) : null;
        var status = score == null
                ? findings.stream().filter(Finding::available).map(Finding::severity)
                        .max(Comparator.comparingInt(this::severity)).orElse("watch")
                : statusFromScore(score);
        var ready = coverage >= MINIMUM_SECTOR_COVERAGE
                && findings.stream().noneMatch(Finding::partial);
        return new Sector(id, status, score, coverage, ready, findings);
    }

    private List<CrossSectorFinding> crossSectorFindings(List<Finding> findings) {
        var byCode = new LinkedHashMap<String, Finding>();
        findings.forEach(finding -> byCode.put(finding.code(), finding));
        var result = new ArrayList<CrossSectorFinding>();
        if (atRisk(byCode.get("people_attendance")) && atRisk(byCode.get("process_overdue"))) {
            result.add(new CrossSectorFinding("capacity_coordination_risk", highestSeverity(
                    byCode.get("people_attendance"), byCode.get("process_overdue")),
                    List.of("people", "processes"),
                    List.of("people_attendance", "process_overdue"), "processes-tasks"));
        }
        if (atRisk(byCode.get("product_stockouts"))
                && healthy(byCode.get("product_sales_momentum"))
                && atRisk(byCode.get("finance_budget_control"))) {
            result.add(new CrossSectorFinding("demand_fulfillment_risk", highestSeverity(
                    byCode.get("product_stockouts"), byCode.get("finance_budget_control")),
                    List.of("products", "finance"),
                    List.of("product_stockouts", "product_sales_momentum", "finance_budget_control"), "inventory"));
        }
        if (atRisk(byCode.get("finance_overdue_payables")) && atRisk(byCode.get("process_overdue"))) {
            result.add(new CrossSectorFinding("cash_control_risk", highestSeverity(
                    byCode.get("finance_overdue_payables"), byCode.get("process_overdue")),
                    List.of("finance", "processes"),
                    List.of("finance_overdue_payables", "process_overdue"), "expenses"));
        }
        if (atRisk(byCode.get("product_conversion"))
                && atRisk(byCode.get("product_low_stock"))
                && atRisk(byCode.get("process_completion"))) {
            result.add(new CrossSectorFinding("commercial_supply_drag", highestSeverity(
                    byCode.get("product_conversion"), byCode.get("process_completion")),
                    List.of("products", "processes"),
                    List.of("product_conversion", "product_low_stock", "process_completion"), "sales"));
        }
        return List.copyOf(result);
    }

    private int weightedCoverage(List<Finding> findings) {
        var total = findings.stream().mapToInt(Finding::weight).sum();
        if (total == 0) return 0;
        var available = findings.stream().filter(Finding::available).mapToInt(Finding::weight).sum();
        return (int) Math.round((available * 100.0) / total);
    }

    private BigDecimal weightedScore(List<Finding> findings) {
        var available = findings.stream().filter(Finding::available).toList();
        var totalWeight = available.stream().mapToInt(Finding::weight).sum();
        if (totalWeight == 0) return null;
        var points = available.stream()
                .map(finding -> points(finding.severity()).multiply(BigDecimal.valueOf(finding.weight())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return points.divide(BigDecimal.valueOf(totalWeight), 2, RoundingMode.HALF_UP);
    }

    private BigDecimal average(List<BigDecimal> values) {
        if (values.isEmpty()) return null;
        return values.stream().reduce(BigDecimal.ZERO, BigDecimal::add)
                .divide(BigDecimal.valueOf(values.size()), 2, RoundingMode.HALF_UP);
    }

    private BigDecimal percent(int value, int total) {
        if (total <= 0) return BigDecimal.ZERO;
        return BigDecimal.valueOf(value).multiply(BigDecimal.valueOf(100))
                .divide(BigDecimal.valueOf(total), 2, RoundingMode.HALF_UP);
    }

    private BigDecimal points(String status) {
        return switch (status) {
            case "healthy" -> HEALTHY_POINTS;
            case "critical" -> CRITICAL_POINTS;
            default -> WATCH_POINTS;
        };
    }

    private String kind(String status, boolean available) {
        if (!available) return "data_gap";
        return switch (status) {
            case "healthy" -> "strength";
            case "critical" -> "symptom";
            default -> "opportunity";
        };
    }

    private String scoreStatus(BigDecimal value) {
        if (value.compareTo(new BigDecimal("85")) >= 0) return "healthy";
        if (value.compareTo(new BigDecimal("70")) >= 0) return "watch";
        return "critical";
    }

    private String statusFromScore(BigDecimal value) {
        if (value.compareTo(new BigDecimal("80")) >= 0) return "healthy";
        if (value.compareTo(new BigDecimal("55")) >= 0) return "watch";
        return "critical";
    }

    private String worstStatus(List<Sector> sectors) {
        return sectors.stream().map(Sector::status).max(Comparator.comparingInt(this::severity)).orElse("watch");
    }

    private int severity(String value) {
        return switch (value) {
            case "critical" -> 3;
            case "watch" -> 2;
            default -> 1;
        };
    }

    private boolean atRisk(Finding finding) {
        return finding != null && finding.available() && !"healthy".equals(finding.severity());
    }

    private boolean healthy(Finding finding) {
        return finding != null && finding.available() && "healthy".equals(finding.severity());
    }

    private String highestSeverity(Finding... findings) {
        return List.of(findings).stream().filter(java.util.Objects::nonNull).map(Finding::severity)
                .max(Comparator.comparingInt(this::severity)).orElse("watch");
    }

    private String sectorOf(String code) {
        if (code.startsWith("people_")) return "people";
        if (code.startsWith("process_")) return "processes";
        if (code.startsWith("product_")) return "products";
        return "finance";
    }
}
