package com.indice.erp.sales;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.indice.erp.sales.OpportunityFlowDtos.SaveFlowRequest;
import com.indice.erp.sales.OpportunityFlowDtos.StageRequest;
import com.indice.erp.sales.OpportunityFlowRepository.FlowRow;
import com.indice.erp.sales.OpportunityFlowRepository.PositionRow;
import com.indice.erp.sales.OpportunityFlowRepository.StageRow;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class OpportunityFlowServiceTest {

    @Mock OpportunityFlowRepository repository;

    private OpportunityFlowService service;

    @BeforeEach
    void setUp() {
        service = new OpportunityFlowService(repository);
        when(repository.ensureFactoryFlow(7L)).thenReturn(1L);
    }

    @Test
    void returnsTheSelectableTenantCatalogWithFactoryStages() {
        var factory = new FlowRow(1L, "factory", "Factory flow", true, true);
        when(repository.listFlows(7L)).thenReturn(List.of(factory));
        when(repository.listActiveStages(7L, 1L)).thenReturn(factoryStages());
        when(repository.positionCounts(7L, 1L)).thenReturn(Map.of("proposal", 3));

        var response = service.catalog(7L, true);

        assertThat(response.defaultFlowId()).isEqualTo(1L);
        assertThat(response.canManage()).isTrue();
        assertThat(response.flows()).singleElement().satisfies(flow -> {
            assertThat(flow.factory()).isTrue();
            assertThat(flow.stages()).extracting(OpportunityFlowDtos.StageResponse::key)
                    .containsExactly("new", "proposal", "won", "lost");
            assertThat(flow.stages().get(1).opportunityCount()).isEqualTo(3);
        });
    }

    @Test
    void createsANewFlowAndInitializesEveryOpportunityPosition() {
        var factory = new FlowRow(1L, "factory", "Factory flow", true, true);
        var custom = new FlowRow(2L, "direct_sales", "Direct sales", false, false);
        when(repository.listFlows(7L)).thenReturn(List.of(factory));
        when(repository.createFlow(7L, 5L, "direct_sales", "Direct sales")).thenReturn(2L);
        when(repository.requireFlow(7L, 2L)).thenReturn(custom);
        when(repository.listActiveStages(7L, 2L)).thenReturn(List.of(
                stage(21L, 2L, "incoming", "Incoming", "OPEN", 20, 0),
                stage(22L, 2L, "won", "Won", "WON", 100, 1),
                stage(23L, 2L, "lost", "Lost", "LOST", 0, 2)));
        when(repository.positionCounts(7L, 2L)).thenReturn(Map.of("incoming", 4));

        var response = service.create(7L, 5L, new SaveFlowRequest("Direct sales", List.of(
                stageRequest(null, "Incoming", "BLUE", 20),
                stageRequest("won", "Won", "GREEN", 80),
                stageRequest("lost", "Lost", "CORAL", 70))));

        assertThat(response.id()).isEqualTo(2L);
        verify(repository).ensurePositionsForFlow(7L, 2L, 5L);
        @SuppressWarnings("unchecked")
        var stages = ArgumentCaptor.forClass((Class<List<StageRow>>) (Class<?>) List.class);
        verify(repository).replaceStages(eq(7L), eq(2L), eq(5L), stages.capture());
        assertThat(stages.getValue()).extracting(StageRow::key)
                .containsExactly("incoming", "won", "lost");
        assertThat(stages.getValue()).extracting(StageRow::defaultProbabilityPercent)
                .containsExactly(20, 100, 0);
    }

    @Test
    void refusesToRemoveAStageThatStillOwnsPositionsInThatFlow() {
        var custom = new FlowRow(2L, "custom", "Custom", false, false);
        when(repository.requireFlow(7L, 2L)).thenReturn(custom);
        when(repository.positionCounts(7L, 2L)).thenReturn(Map.of("contacted", 2));

        assertThatThrownBy(() -> service.update(7L, 2L, 5L, new SaveFlowRequest("Custom", List.of(
                stageRequest("new", "New", "BLUE", 10),
                stageRequest("won", "Won", "GREEN", 100),
                stageRequest("lost", "Lost", "CORAL", 0)))))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("still has opportunities");

        verify(repository, never()).replaceStages(eq(7L), eq(2L), eq(5L), any());
    }

    @Test
    void movingAnOpenOpportunityChangesOnlyTheSelectedFlowPosition() {
        var factory = new FlowRow(1L, "factory", "Factory", true, true);
        var custom = new FlowRow(2L, "custom", "Custom", false, false);
        var customStages = List.of(
                stage(21L, 2L, "incoming", "Incoming", "OPEN", 10, 0),
                stage(22L, 2L, "demo", "Demo", "OPEN", 60, 1),
                stage(23L, 2L, "won", "Won", "WON", 100, 2),
                stage(24L, 2L, "lost", "Lost", "LOST", 0, 3));
        when(repository.listFlows(7L)).thenReturn(List.of(factory, custom));
        when(repository.requireFlow(7L, 2L)).thenReturn(custom);
        when(repository.listActiveStages(7L, 2L)).thenReturn(customStages);
        when(repository.opportunityLifecycle(7L, 91L)).thenReturn("OPEN");
        when(repository.findPosition(7L, 91L, 2L))
                .thenReturn(Optional.of(new PositionRow(91L, 21L, "incoming", 10)));

        var result = service.moveOpportunity(7L, 5L, 91L, 2L, "demo");

        assertThat(result.stageKey()).isEqualTo("demo");
        assertThat(result.probabilityPercent()).isEqualTo(60);
        verify(repository).upsertPosition(7L, 91L, 2L, customStages.get(1), 5L);
        verify(repository, never()).updateLifecycle(7L, 91L, "OPEN", 5L);
        verify(repository, never()).upsertPosition(eq(7L), eq(91L), eq(1L), any(), eq(5L));
    }

    @Test
    void winningInOneFlowSynchronizesTheTerminalPositionInEveryFlow() {
        var factory = new FlowRow(1L, "factory", "Factory", true, true);
        var custom = new FlowRow(2L, "custom", "Custom", false, false);
        var factoryWon = stage(13L, 1L, "won", "Won", "WON", 100, 2);
        var customWon = stage(23L, 2L, "won", "Won", "WON", 100, 2);
        when(repository.listFlows(7L)).thenReturn(List.of(factory, custom));
        when(repository.requireFlow(7L, 2L)).thenReturn(custom);
        when(repository.listActiveStages(7L, 1L)).thenReturn(List.of(
                stage(11L, 1L, "new", "New", "OPEN", 10, 0),
                factoryWon,
                stage(14L, 1L, "lost", "Lost", "LOST", 0, 3)));
        when(repository.listActiveStages(7L, 2L)).thenReturn(List.of(
                stage(21L, 2L, "incoming", "Incoming", "OPEN", 10, 0),
                customWon,
                stage(24L, 2L, "lost", "Lost", "LOST", 0, 3)));
        when(repository.opportunityLifecycle(7L, 91L)).thenReturn("OPEN");

        var result = service.moveOpportunity(7L, 5L, 91L, 2L, "won");

        assertThat(result.lifecycleStatus()).isEqualTo("WON");
        verify(repository).updateLifecycle(7L, 91L, "WON", 5L);
        verify(repository).upsertPosition(7L, 91L, 1L, factoryWon, 5L);
        verify(repository).upsertPosition(7L, 91L, 2L, customWon, 5L);
    }

    @Test
    void aTerminalOpportunityCannotBeReopenedByAnotherFlow() {
        var custom = new FlowRow(2L, "custom", "Custom", false, false);
        when(repository.listFlows(7L)).thenReturn(List.of(custom));
        when(repository.requireFlow(7L, 2L)).thenReturn(custom);
        when(repository.listActiveStages(7L, 2L)).thenReturn(List.of(
                stage(21L, 2L, "incoming", "Incoming", "OPEN", 10, 0),
                stage(22L, 2L, "won", "Won", "WON", 100, 1),
                stage(23L, 2L, "lost", "Lost", "LOST", 0, 2)));
        when(repository.opportunityLifecycle(7L, 91L)).thenReturn("WON");

        assertThatThrownBy(() -> service.moveOpportunity(7L, 5L, 91L, 2L, "incoming"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("cannot be reopened");
    }

    private static List<StageRow> factoryStages() {
        return List.of(
                stage(11L, 1L, "new", "New", "OPEN", 10, 0),
                stage(12L, 1L, "proposal", "Proposal", "OPEN", 75, 1),
                stage(13L, 1L, "won", "Won", "WON", 100, 2),
                stage(14L, 1L, "lost", "Lost", "LOST", 0, 3));
    }

    private static StageRow stage(
            long id, long flowId, String key, String label, String type, int probability, int order) {
        return new StageRow(id, flowId, key, label, type,
                "WON".equals(type) ? "GREEN" : "LOST".equals(type) ? "CORAL" : "BLUE",
                probability, order);
    }

    private static StageRequest stageRequest(String key, String label, String color, int probability) {
        return new StageRequest(key, label, color, probability);
    }
}
