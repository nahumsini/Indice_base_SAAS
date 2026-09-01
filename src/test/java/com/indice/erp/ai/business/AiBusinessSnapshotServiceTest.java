package com.indice.erp.ai.business;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.indice.erp.kpis.executive.ExecutiveKpiService;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class AiBusinessSnapshotServiceTest {

    @Test
    void projectsTheExistingExecutivePanelIntoAStableAiContract() {
        var executiveKpiService = mock(ExecutiveKpiService.class);
        var params = Map.of("period", "monthly", "preferredCurrency", "MXN");
        when(executiveKpiService.getExecutivePanel(23L, 3L, params)).thenReturn(Map.of(
            "range", Map.of("from", "2026-08-01", "to", "2026-08-31", "period", "monthly"),
            "context", Map.of(
                "currency", "MXN",
                "generatedAt", Instant.parse("2026-08-31T18:00:00Z"),
                "scopeLabel", "Empresa completa"
            ),
            "summary", Map.ofEntries(
                Map.entry("salesTotal", 1250.0),
                Map.entry("collectedTotal", 900.0),
                Map.entry("expensesTotal", 400.0),
                Map.entry("payablesTotal", 100.0),
                Map.entry("receivablesTotal", 350.0),
                Map.entry("overdueReceivables", 50.0),
                Map.entry("pettyCashBalance", 80.0),
                Map.entry("operatingProfit", 850.0),
                Map.entry("operatingMargin", 68.0),
                Map.entry("totalTasks", 12),
                Map.entry("overdueTasks", 2),
                Map.entry("absences", 1),
                Map.entry("attendanceRate", 95.0),
                Map.entry("organizationRows", 2),
                Map.entry("executiveScore", 81)
            ),
            "alerts", List.of(Map.of(
                "status", "watch",
                "title", "Cartera vencida",
                "description", "Hay saldo vencido que requiere cobranza activa."
            ))
        ));

        var result = new AiBusinessSnapshotService(executiveKpiService).get(23L, 3L, params);

        assertThat(result.range().period()).isEqualTo("monthly");
        assertThat(result.context().currency()).isEqualTo("MXN");
        assertThat(result.summary().salesTotal()).isEqualTo(1250.0);
        assertThat(result.summary().operatingProfit()).isEqualTo(850.0);
        assertThat(result.alerts()).extracting(AiBusinessSnapshotResponse.Alert::title)
            .containsExactly("Cartera vencida");
        verify(executiveKpiService).getExecutivePanel(23L, 3L, params);
    }
}
