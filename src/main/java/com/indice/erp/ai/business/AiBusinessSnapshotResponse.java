package com.indice.erp.ai.business;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public record AiBusinessSnapshotResponse(
    Range range,
    Context context,
    Summary summary,
    List<Alert> alerts
) {
    public record Range(LocalDate from, LocalDate to, String period) {
    }

    public record Context(
        String currency,
        Instant generatedAt,
        String scopeLabel
    ) {
    }

    public record Summary(
        double salesTotal,
        double collectedTotal,
        double expensesTotal,
        double payablesTotal,
        double receivablesTotal,
        double overdueReceivables,
        double pettyCashBalance,
        double operatingProfit,
        double operatingMargin,
        int totalTasks,
        int overdueTasks,
        int absences,
        double attendanceRate,
        int organizationRows,
        int executiveScore
    ) {
    }

    public record Alert(String status, String title, String description) {
    }
}
