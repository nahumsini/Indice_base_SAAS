package com.indice.erp.sales;

import java.util.List;
import java.util.Map;

public final class SellerWorkspaceDtos {
    private SellerWorkspaceDtos() {}
    public record ScriptBlock(String title, String text) {}
    public record ScriptContent(String name, String goal, String stageKey, List<ScriptBlock> blocks) {}
    public record SaveScriptRequest(Long id, Integer expectedVersion, String status, ScriptContent content) {}
    public record ScriptResponse(long id, int version, Integer publishedVersion, boolean archived,
            ScriptContent content, ScriptContent published) {}
    public record InteractionRequest(String requestKey, String revision, String outcome, String notes,
            Long scriptId, Integer scriptVersion, String followupMode, String nextAction, String nextActionAt) {}
    public record InteractionResponse(long id, String outcome, String notes, String actorName,
            String createdAt, String scriptName, Integer scriptVersion, String followupMode,
            String nextAction, String nextActionAt) {}
    // Opportunity uses the existing Sales compatibility projection; new commands are typed.
    public record OpportunityResponse(String revision, Map<String, Object> opportunity) {}
    public record HistoryResponse(List<InteractionResponse> items, Long nextCursor) {}
    public record SaveInteractionResponse(InteractionResponse interaction, OpportunityResponse current) {}
    public record DaySummary(String date, String timezone, int attempts, int conversations, int followups) {}
}
