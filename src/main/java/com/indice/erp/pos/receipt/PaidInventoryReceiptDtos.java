package com.indice.erp.pos.receipt;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

public final class PaidInventoryReceiptDtos {
    private PaidInventoryReceiptDtos() {}

    public record ProductInput(
            Long productId,
            String name,
            String sku,
            String category,
            String inventoryUnit,
            BigDecimal salePrice,
            @com.fasterxml.jackson.annotation.JsonInclude(com.fasterxml.jackson.annotation.JsonInclude.Include.NON_NULL)
            Boolean enableInventory) {
        public ProductInput(Long productId, String name, String sku, String category, String inventoryUnit, BigDecimal salePrice) {
            this(productId, name, sku, category, inventoryUnit, salePrice, null);
        }
    }

    public record ItemRequest(
            @NotNull @Valid ProductInput product,
            @NotNull @Positive BigDecimal quantity,
            @NotNull @Positive BigDecimal unitCost,
            BigDecimal taxRate,
            Boolean taxIncluded,
            @Size(max = 80) String taxProfileId,
            @Size(max = 120) String taxName) {}

    public record CreateRequest(
            @NotBlank @Size(max = 100) String idempotencyKey,
            @NotNull Long cashRegisterId,
            @NotNull Long shiftId,
            @NotNull Long providerId,
            @NotBlank String currencyCode,
            @NotBlank String paymentMethod,
            Long paymentAccountId,
            @Size(max = 160) String paymentReference,
            String notes,
            @NotEmpty List<@Valid ItemRequest> items) {}

    public record QuickProviderRequest(@NotBlank @Size(max = 180) String name) {}

    public record ProviderOptionResponse(
            long id, String name, String email, String taxId, Integer paymentTermsDays) {}

    public record ProductOptionResponse(
            long id, String name, String sku, String category, String currencyCode,
            String inventoryUnit, BigDecimal unitCost, boolean inventoryReady) {}

    public record PaymentAccountResponse(
            long id, String name, String type, String currencyCode,
            BigDecimal availableBalance, BigDecimal pendingBalance) {}

    public record AttachmentUploadRequest(
            @NotBlank @Size(max = 255) String fileName,
            @NotBlank String contentType,
            @NotNull @Positive Long sizeBytes) {}

    public record AttachmentUploadResponse(
            String objectKey, String uploadUrl, Map<String, String> uploadHeaders, String contentType) {}

    public record AttachmentRegisterRequest(
            @NotBlank @Size(max = 700) String objectKey,
            @NotBlank @Size(max = 255) String fileName,
            @NotBlank String contentType,
            @NotNull @Positive Long sizeBytes) {}

    public record AttachmentResponse(
            long id, String fileName, String contentType, long sizeBytes, String downloadUrl) {}

    public record ReverseRequest(@NotBlank @Size(max = 500) String reason) {}

    public record ItemResponse(
            long id, long productId, String productName, String sku, String inventoryUnit,
            BigDecimal quantity, BigDecimal enteredUnitCost, BigDecimal inventoryUnitCost,
            BigDecimal taxRate, boolean taxIncluded, String taxProfileId, String taxName,
            BigDecimal subtotalAmount, BigDecimal taxAmount, BigDecimal lineTotal) {}

    public record ReceiptResponse(
            long id, String receiptNumber, long cashRegisterId, long shiftId, long warehouseId,
            String warehouseName, Long providerId, String providerName, String paymentMethod, Long paymentAccountId,
            BigDecimal subtotalAmount, BigDecimal taxAmount, BigDecimal totalAmount,
            String currencyCode, String paymentReference, String status,
            String reversalReason, List<ItemResponse> items, Map<String, Object> metadata) {}
}
