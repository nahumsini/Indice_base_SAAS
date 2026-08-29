package com.indice.erp.sales;

import java.util.List;

public final class OpportunityFlowDtos {

    private OpportunityFlowDtos() {
    }

    public record SaveFlowRequest(String name, List<StageRequest> stages) {
    }

    public record StageRequest(
            String key,
            String label,
            String colorToken,
            Integer defaultProbabilityPercent) {
    }

    public record CatalogResponse(
            List<FlowResponse> flows,
            long defaultFlowId,
            boolean canManage) {
    }

    public record FlowResponse(
            long id,
            String key,
            String name,
            boolean factory,
            boolean defaultFlow,
            List<StageResponse> stages) {
    }

    public record StageResponse(
            String key,
            String label,
            String type,
            String colorToken,
            int defaultProbabilityPercent,
            int position,
            boolean required,
            int opportunityCount) {
    }

    public record PositionsResponse(long flowId, List<PositionResponse> positions) {
    }

    public record PositionResponse(
            long opportunityId,
            String stageKey,
            int probabilityPercent) {
    }
}
