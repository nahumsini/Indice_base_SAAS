package com.indice.erp.kpis.executive;

import java.math.BigDecimal;
import java.util.List;

public final class ExecutiveKpiDomainContracts {

    private ExecutiveKpiDomainContracts() {
    }

    public record Dashboard(
            String contractVersion,
            ComparisonRange comparisonRange,
            String preferredCurrency,
            List<Domain> items,
            DataQuality dataQuality) {
    }

    public record ComparisonRange(String from, String to) {
    }

    public record Domain(
            String id,
            String label,
            String ownerModule,
            String sourceContract,
            String actionRoute,
            String status,
            List<Metric> metrics,
            List<Signal> signals,
            DomainQuality dataQuality) {
    }

    public record Metric(
            String id,
            String label,
            BigDecimal value,
            BigDecimal previousValue,
            BigDecimal absoluteChange,
            BigDecimal percentChange,
            String unit,
            String direction,
            String status,
            boolean available,
            boolean comparisonAvailable,
            boolean partial,
            List<String> excludedCurrencies,
            String basis,
            String description) {
    }

    public record Signal(String id, String severity, String message, double value) {
    }

    public record DomainQuality(
            boolean decisionReady,
            int invalidRecords,
            List<String> issues) {
    }

    public record DataQuality(
            boolean decisionReady,
            boolean partial,
            List<String> excludedCurrencies,
            List<String> issues,
            String generatedFrom,
            String generatedAt,
            String snapshotDate,
            String exchangeRateDate,
            String note) {
    }
}
