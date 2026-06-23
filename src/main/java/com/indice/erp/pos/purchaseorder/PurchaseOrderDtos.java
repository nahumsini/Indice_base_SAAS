package com.indice.erp.pos.purchaseorder;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public final class PurchaseOrderDtos {

    private PurchaseOrderDtos() {
    }

    public record ProductSupplierRequest(
        @NotNull Long productId,
        @NotNull Long providerId,
        @Size(max = 120) String providerSku,
        @NotNull @DecimalMin("0.00") BigDecimal costAmount,
        @NotBlank @Size(min = 3, max = 3) String currencyCode,
        Integer leadTimeDays,
        @NotNull @DecimalMin("0.0001") BigDecimal minimumOrderQuantity,
        Boolean preferred,
        Boolean active,
        @Size(max = 4000) String notes
    ) {
    }

    public record ProductSupplierResponse(
        Long id,
        Long productId,
        String productName,
        String productSku,
        Long providerId,
        String providerName,
        String providerSku,
        BigDecimal costAmount,
        String currencyCode,
        Integer leadTimeDays,
        BigDecimal minimumOrderQuantity,
        boolean preferred,
        boolean active,
        String notes,
        Instant updatedAt
    ) {
    }

    public record PurchaseOrderItemRequest(
        @NotNull Long productId,
        @Size(max = 120) String sku,
        @Size(max = 240) String productName,
        @NotNull @DecimalMin("0.0001") BigDecimal quantity,
        @NotNull @DecimalMin("0.00") BigDecimal unitCost,
        @DecimalMin("0.00") BigDecimal taxRate
    ) {
    }

    public record PurchaseOrderCreateRequest(
        @NotNull Long providerId,
        @NotNull Long warehouseId,
        @NotBlank @Size(min = 3, max = 3) String currencyCode,
        LocalDate expectedDate,
        @Size(max = 4000) String notes,
        @Valid @NotEmpty List<PurchaseOrderItemRequest> items
    ) {
    }

    public record PurchaseOrderActionRequest(@Size(max = 4000) String note) {
    }

    public record PurchaseOrderReceiveItemRequest(
        @NotNull Long orderItemId,
        @NotNull @DecimalMin("0.0001") BigDecimal receivedQuantity
    ) {
    }

    public record PurchaseOrderReceiveRequest(
        @Size(max = 4000) String notes,
        @Valid @NotEmpty List<PurchaseOrderReceiveItemRequest> items
    ) {
    }

    public record PurchaseOrderItemResponse(
        Long id,
        Long productId,
        String sku,
        String productName,
        BigDecimal quantity,
        BigDecimal receivedQuantity,
        BigDecimal pendingQuantity,
        BigDecimal unitCost,
        BigDecimal taxRate,
        BigDecimal lineSubtotal,
        BigDecimal lineTax,
        BigDecimal lineTotal
    ) {
    }

    public record PurchaseOrderResponse(
        Long id,
        Long companyId,
        Long unitId,
        Long businessId,
        Long warehouseId,
        String warehouseName,
        Long providerId,
        String providerName,
        String providerEmail,
        String folio,
        PurchaseOrderStatus status,
        String currencyCode,
        BigDecimal subtotalAmount,
        BigDecimal taxAmount,
        BigDecimal totalAmount,
        LocalDate expectedDate,
        Instant orderedAt,
        Instant approvedAt,
        Instant sentAt,
        Instant receivedAt,
        Instant cancelledAt,
        String notes,
        Instant createdAt,
        List<PurchaseOrderItemResponse> items
    ) {
    }

    public record PurchaseOrderListResponse(List<PurchaseOrderResponse> items, int count) {
    }

    public record SupplierInvoiceRequest(
        @NotNull Long providerId,
        Long purchaseOrderId,
        @NotBlank @Size(max = 120) String invoiceNumber,
        LocalDate invoiceDate,
        LocalDate dueDate,
        @NotNull @DecimalMin("0.00") BigDecimal subtotalAmount,
        @NotNull @DecimalMin("0.00") BigDecimal taxAmount,
        @NotNull @DecimalMin("0.00") BigDecimal totalAmount,
        @NotBlank @Size(min = 3, max = 3) String currencyCode,
        @Size(max = 4000) String notes,
        String documentUrl,
        @Size(max = 180) String submittedByName
    ) {
    }

    public record SupplierInvoiceReviewRequest(
        @NotNull SupplierInvoiceStatus status,
        @Size(max = 4000) String reviewNote
    ) {
    }

    public record SupplierInvoiceResponse(
        Long id,
        Long providerId,
        String providerName,
        Long purchaseOrderId,
        String purchaseOrderFolio,
        String invoiceNumber,
        LocalDate invoiceDate,
        LocalDate dueDate,
        BigDecimal subtotalAmount,
        BigDecimal taxAmount,
        BigDecimal totalAmount,
        String currencyCode,
        SupplierInvoiceStatus status,
        String documentUrl,
        String notes,
        String submittedByName,
        Long reviewedByUserId,
        Instant reviewedAt,
        String reviewNote,
        Instant createdAt
    ) {
    }

    public record SupplierInvoiceListResponse(List<SupplierInvoiceResponse> items, int count) {
    }
}
