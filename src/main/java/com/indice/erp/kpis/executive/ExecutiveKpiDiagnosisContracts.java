package com.indice.erp.kpis.executive;

import java.math.BigDecimal;
import java.util.List;

public final class ExecutiveKpiDiagnosisContracts {

    private ExecutiveKpiDiagnosisContracts() {
    }

    public record Diagnosis(
            String contractVersion,
            Methodology methodology,
            String status,
            BigDecimal score,
            int coveragePercent,
            boolean decisionReady,
            String prioritySectorId,
            List<Sector> sectors,
            List<CrossSectorFinding> crossSectorFindings,
            DiagnosisQuality dataQuality) {
    }

    public record Methodology(
            String id,
            String version,
            int minimumSectorCoveragePercent,
            BigDecimal healthyPoints,
            BigDecimal watchPoints,
            BigDecimal criticalPoints,
            String scoreBasis) {
    }

    public record Sector(
            String id,
            String status,
            BigDecimal score,
            int coveragePercent,
            boolean decisionReady,
            List<Finding> findings) {
    }

    public record Finding(
            String code,
            String kind,
            String severity,
            String sourceDomainId,
            String metricId,
            BigDecimal value,
            BigDecimal previousValue,
            String unit,
            boolean available,
            boolean partial,
            String basis,
            int weight,
            String ownerModule) {
    }

    public record CrossSectorFinding(
            String code,
            String severity,
            List<String> sectorIds,
            List<String> evidenceFindingCodes,
            String ownerModule) {
    }

    public record DiagnosisQuality(
            boolean decisionReady,
            List<String> issues,
            List<String> unavailableFindingCodes,
            String generatedFrom,
            String snapshotDate,
            String note) {
    }
}
