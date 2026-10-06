package com.indice.erp.sales;

import java.math.BigDecimal;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.fasterxml.jackson.databind.JsonNode;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/** Stable delegated inventory API; owner maps are confined to Sales compatibility persistence. */
public final class InventoryAssistantContracts {
    private InventoryAssistantContracts() { }
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record ProductInput(String name, String sku, String description, String category, String type,
        BigDecimal price, BigDecimal cost, String currency, String taxCategory, String status,
        String visibility, Boolean inventoryReady, Boolean posReady, String inventoryUnit) implements ClosedInput { }
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record WarehouseInput(String name, String type, Long unitId, Long businessId,
        Long responsibleUserCompanyId, String addressNote, String status) implements ClosedInput { }
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record StockPolicy(Long productId, Long warehouseId, BigDecimal minimumQuantity,
        Boolean usesInventory, Boolean enableInventory) implements ClosedInput { }
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record MovementLine(Long productId, BigDecimal quantity, BigDecimal unitCost) implements ClosedInput { }
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record MovementInput(Long fromWarehouseId, Long toWarehouseId, LocalDate date,
        Long providerId, String reason, String reference, List<MovementLine> items) implements ClosedInput { }
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record Change(Long id, ProductInput product, WarehouseInput warehouse, StockPolicy stock,
        MovementInput movement, String reason) implements ClosedInput { }
    public record Query(Long id, Long productId, Long warehouseId, String query, String status,
        Boolean belowMinimum, LocalDate from, LocalDate to, Integer limit, String cursor) implements ClosedInput { }
    public interface ClosedInput {
        @JsonAnySetter
        default void rejectUnexpected(String name, JsonNode value) {
            throw new IllegalArgumentException("Unexpected inventory field: " + name);
        }
    }
    public record ProductView(Long id, String code, String name, String sku, String description,
        String category, String type, BigDecimal price, BigDecimal cost, String currency,
        String taxCategory, String status, String visibility, boolean inventoryReady, boolean posReady,
        String inventoryUnit, boolean readyForSales) { }
    public record WarehouseView(Long id, String code, String name, String type, Long unitId,
        String unitName, Long businessId, String businessName, Long responsibleUserCompanyId,
        String responsibleName, String addressNote, String status) { }
    public record BalanceView(Long id, long productId, String productName, long warehouseId,
        String warehouseName, String inventoryUnit, String currency, BigDecimal availableQuantity,
        BigDecimal reservedQuantity, BigDecimal freeQuantity, BigDecimal minimumQuantity,
        BigDecimal unitCost, boolean usesInventory, boolean belowMinimum) { }
    public record MovementView(Long id, String number, String groupId, Long productId, String productName,
        String type, BigDecimal quantity, BigDecimal unitCost, Long fromWarehouseId, Long toWarehouseId,
        String reason, String reference, LocalDate date, String status, Long reversalOf) { }
    public record Snapshot(List<ProductView> products, List<WarehouseView> warehouses,
        List<BalanceView> balances, List<MovementView> movements) {
        public static Snapshot empty() { return new Snapshot(List.of(), List.of(), List.of(), List.of()); }
    }
    public record Page<T>(List<T> items, long totalCount, boolean hasMore, String nextCursor, String scope) { }
    public record CurrencyValue(String currency, BigDecimal inventoryValue) { }
    public record Summary(long balanceCount, long belowMinimumCount, List<CurrencyValue> values, String scope) { }
    public record Prepared(String action, Change change, Snapshot before, Snapshot after,
        Map<String, String> versions) { }
    public record Result(String action, Snapshot records) { }
    public static final class Changed extends IllegalStateException {
        public Changed() { super("Inventory changed. Prepare and confirm its current state again."); }
    }
}
