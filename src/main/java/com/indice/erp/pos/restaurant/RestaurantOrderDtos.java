package com.indice.erp.pos.restaurant;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public final class RestaurantOrderDtos {

    private RestaurantOrderDtos() {
    }

    public record CreateKioskRequest(
            Long ecosystemId,
            Long cashRegisterId,
            @NotBlank String name,
            String ecosystemName,
            String areaName,
            @Min(1) @Max(100) Integer tableCount,
            Long areaId,
            String kitchenStationCode,
            Instant expiresAt) {
    }

    public record UpdateKioskRequest(@NotBlank String name, Instant expiresAt, Long version) {
    }

    public record OpenOrderRequest(
            @NotNull Long tableId,
            @Min(1) @Max(1000) Integer guestCount,
            String notes) {
    }

    public record AddItemRequest(
            @NotNull Long orderId,
            @NotNull Long productId,
            @NotNull BigDecimal quantity,
            @Min(1) @Max(1000) Integer guestNumber,
            String notes,
            String modifierSummary,
            String kitchenStationCode) {
    }

    public record OrderCommandRequest(@NotNull Long orderId, String reason) {
    }

    public record ItemStatusRequest(Long itemId, List<Long> itemIds, @NotBlank String status, String reason) {
    }

    public record TableLayoutRequest(
            @NotNull Long tableId,
            @NotBlank String name,
            @Min(1) @Max(100) Integer capacity,
            @NotBlank String shape,
            @Min(0) @Max(11) Integer x,
            @Min(0) @Max(999) Integer y,
            @Min(1) @Max(12) Integer width,
            @Min(1) @Max(12) Integer height,
            Integer rotation,
            @NotNull Long version) {
    }

    public record UpdateFloorPlanRequest(@NotNull List<TableLayoutRequest> tables) {
    }

    public record RestaurantCheckoutLine(
            long productId,
            String sku,
            String name,
            BigDecimal quantity,
            BigDecimal unitPrice,
            BigDecimal lineTotal) {
    }

    public record RestaurantCheckoutOrder(
            long id,
            long companyId,
            long cashRegisterId,
            String orderNumber,
            String currencyCode,
            long claimedByUserId,
            List<RestaurantCheckoutLine> items) {
    }
}
