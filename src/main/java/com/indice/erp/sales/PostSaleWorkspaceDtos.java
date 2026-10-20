package com.indice.erp.sales;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

public final class PostSaleWorkspaceDtos {
    private PostSaleWorkspaceDtos() { }
    public record Stage(String key, String label, String colorToken) { }
    public record Flow(long id, String name, int version, boolean archived, List<Stage> stages) { }
    public record SaveFlow(String requestKey, Integer version, String name, boolean archived, List<Stage> stages) { }
    public record Owner(long id, String name) { }
    public record WorkspaceSort(String column, String direction) {
        public WorkspaceSort {
            if (column == null || !Set.of("client", "sale", "stage", "owner", "lossReason", "nextAction").contains(column)
                    || direction == null || !Set.of("asc", "desc").contains(direction)) {
                throw new IllegalArgumentException("Invalid post-sale sort.");
            }
        }
    }
    public record SaveWork(String requestKey, int version, Long flowId, String stageKey, Long ownerId,
            String nextAction, LocalDate nextActionDate, String notes, String lossReason, boolean paused) { }
    public record Reactivate(String requestKey, int version, String opportunityName, Long flowId) { }
    public record Item(String kind, long sourceId, String reference, String title, String clientName,
            String contactName, String phone, String email, Long contactId, Long opportunityId,
            Long workId, int version, long flowId, String stageKey, Long ownerId, String ownerName,
            String nextAction, LocalDate nextActionDate, String notes, String lossReason,
            String recoveryStatus, Long recoveredOpportunityId) { }
    public record Counts(long total, long overdue, long today, long unscheduled, long completed) { }
    public record Workspace(List<Item> items, Counts counts, int page, int pageSize,
            List<Flow> flows, List<Owner> owners, String today, String timezone, boolean canReactivate) { }
    public record Event(long id, String type, String actor, String detail, LocalDateTime createdAt) { }
    public record Detail(Item item, List<Event> history) { }
}
