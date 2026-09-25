package com.indice.erp.sales;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/** Bounded commercial contract; no fiscal data, arbitrary metadata or tenant authority. */
public final class SalesAssistantContracts {
    private SalesAssistantContracts() { }

    public record Change(Long id, String name, Long customerId, Long opportunityId, String contactPerson,
        String phone, String email, String source, String status, Long ownerUserCompanyId, String notes,
        String currency, BigDecimal estimatedValue, Long flowId, String stage, LocalDate expectedCloseDate,
        String nextAction, LocalDate expirationDate, String terms, List<LineInput> items, List<String> clearFields) { }
    public record LineInput(Long productId, String productName, BigDecimal quantity, BigDecimal unitPrice,
        BigDecimal discountPercent, BigDecimal taxPercent) { }
    public record Line(Long productId, String productName, BigDecimal quantity, BigDecimal unitPrice,
        BigDecimal discountPercent, BigDecimal taxPercent, BigDecimal total) { }
    public record RecordView(String kind, Long id, String code, String name, Long customerId, Long opportunityId,
        String contactPerson, String phone, String email, String source, String status, String lifecycleStatus,
        Long ownerUserCompanyId, String ownerName, String notes, String currency, BigDecimal amount,
        String stage, Long flowId, String flowName, Integer probabilityPercent, LocalDate expectedCloseDate, String nextAction, LocalDate expirationDate, String terms,
        List<Line> items) { }
    public record Query(Long id, String query, String status, String stage, Long customerId,
        Long ownerUserCompanyId, Integer limit, String cursor, Long flowId) {
        public Query(Long id, String query, String status, String stage, Long customerId, Long ownerUserCompanyId, Integer limit, String cursor) {
            this(id, query, status, stage, customerId, ownerUserCompanyId, limit, cursor, null);
        }
    }
    public record Page<T>(List<T> items, int totalCount, boolean hasMore, String nextCursor, String scope) { }
    public record Assignee(long userCompanyId, String name, Long unitId, Long businessId) { }
    public record Flow(Long id, String name, boolean defaultFlow, List<Stage> stages) { }
    public record Stage(String key, String label, String type, int probabilityPercent) { }
    public record PipelineBucket(String stage, String lifecycleStatus, String currency, int count, BigDecimal amount) { }
    public record Pipeline(Long selectedFlowId, List<Flow> flows, List<PipelineBucket> totals, String scope) { }

    // Internal owner snapshot persisted in the existing immutable AI confirmation protocol.
    public record Prepared(String kind, Long id, String version, Map<String, Object> payload,
        RecordView before, RecordView after, Map<String, String> referenceVersions) { }
    public static final class Changed extends RuntimeException {
        public Changed() { super("Commercial data changed. Prepare a new preview before confirming."); }
    }
}
