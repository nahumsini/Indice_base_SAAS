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
import java.util.Map;

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
        PurchaseOrderOrigin origin,
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
        PurchaseOrderOrigin origin,
        Long sourceSubmissionId,
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

    public record SupplierSubmissionItemRequest(
        Long productId,
        @Size(max = 120) String providerSku,
        @NotBlank @Size(max = 240) String productName,
        @Size(max = 4000) String productDescription,
        @Size(max = 700) String imageUrl,
        @NotNull @DecimalMin("0.0001") BigDecimal quantity,
        @NotNull @DecimalMin("0.00") BigDecimal unitCost,
        @DecimalMin("0.00") BigDecimal taxRate,
        Integer leadTimeDays,
        @DecimalMin("0.0001") BigDecimal minimumOrderQuantity
    ) {
    }

    public record SupplierSubmissionCreateRequest(
        @NotNull Long providerId,
        Long portalAccessId,
        @NotBlank @Size(min = 3, max = 3) String currencyCode,
        @Size(max = 180) String submittedByName,
        @Size(max = 180) String submittedByEmail,
        @Size(max = 4000) String notes,
        @Valid @NotEmpty @Size(max = 100) List<SupplierSubmissionItemRequest> items
    ) {
    }

    public record SupplierSubmissionReviewRequest(
        @NotNull SupplierSubmissionStatus status,
        @Size(max = 4000) String reviewNote
    ) {
    }

    public record SupplierSubmissionConvertRequest(
        @NotNull Long warehouseId,
        LocalDate expectedDate,
        @Size(max = 4000) String notes
    ) {
    }

    public record SupplierSubmissionItemResponse(
        Long id,
        Long productId,
        String providerSku,
        String productName,
        String productDescription,
        String imageUrl,
        BigDecimal quantity,
        BigDecimal unitCost,
        BigDecimal taxRate,
        BigDecimal lineSubtotal,
        BigDecimal lineTax,
        BigDecimal lineTotal,
        Integer leadTimeDays,
        BigDecimal minimumOrderQuantity,
        SupplierSubmissionStatus status,
        String reviewNote
    ) {
    }

    public record SupplierSubmissionResponse(
        Long id,
        Long companyId,
        Long providerId,
        String providerName,
        String providerEmail,
        Long portalAccessId,
        String submissionNumber,
        SupplierSubmissionStatus status,
        String currencyCode,
        BigDecimal subtotalAmount,
        BigDecimal taxAmount,
        BigDecimal totalAmount,
        String submittedByName,
        String submittedByEmail,
        Instant submittedAt,
        Long reviewedByUserId,
        Instant reviewedAt,
        String reviewNote,
        Long convertedPurchaseOrderId,
        String notes,
        Instant createdAt,
        List<SupplierSubmissionItemResponse> items
    ) {
    }

    public record SupplierSubmissionListResponse(List<SupplierSubmissionResponse> items, int count) {
    }

    public record SupplierPortalAccessRequest(
        @NotNull Long providerId,
        @Size(max = 120) String portalCode,
        @NotBlank @Size(min = 4, max = 20) String pin,
        @Size(max = 40) String status,
        Instant expiresAt
    ) {
    }

    public record SupplierPortalAccessStatusRequest(
        @NotBlank @Size(max = 40) String status
    ) {
    }

    public record SupplierPortalAccessPinRequest(
        @NotBlank @Size(min = 4, max = 20) String pin
    ) {
    }

    public record SupplierPortalAccessConfigurationRequest(
        @NotBlank @Size(max = 180) String name,
        Instant expiresAt
    ) {
    }

    public record SupplierPortalAccessResponse(
        Long id,
        Long providerId,
        String providerName,
        String providerEmail,
        String portalCode,
        String portalUrl,
        String status,
        Instant expiresAt,
        Instant createdAt,
        Instant updatedAt,
        boolean personalPinCreated
    ) {
    }

    public record SupplierPortalAccessListResponse(List<SupplierPortalAccessResponse> items, int count) {
    }

    public record SupplierPortalLoginRequest(
        @NotBlank @Size(min = 4, max = 20) String pin
    ) {
    }

    public record SupplierPortalCatalogProduct(
        Long productId,
        String productName,
        String productSku,
        String providerSku,
        BigDecimal costAmount,
        String currencyCode,
        Integer leadTimeDays,
        BigDecimal minimumOrderQuantity
    ) {
    }

    public record SupplierPortalContextResponse(
        Long portalAccessId,
        String portalCode,
        Long providerId,
        String providerName,
        String providerEmail,
        String status,
        List<SupplierPortalCatalogProduct> catalogProducts
    ) {
    }

    public record SupplierPortalSubmissionRequest(
        @Size(min = 4, max = 20) String pin,
        @NotBlank @Size(min = 3, max = 3) String currencyCode,
        @Size(max = 180) String submittedByName,
        @Size(max = 180) String submittedByEmail,
        @Size(max = 4000) String notes,
        @Valid @NotEmpty @Size(max = 100) List<SupplierSubmissionItemRequest> items
    ) {
    }

    public record SupplierPortalInvoiceRequest(
        @Size(min = 4, max = 20) String pin,
        @NotBlank @Size(max = 120) String invoiceNumber,
        LocalDate invoiceDate,
        LocalDate dueDate,
        @NotNull @DecimalMin("0.00") BigDecimal subtotalAmount,
        @NotNull @DecimalMin("0.00") BigDecimal taxAmount,
        @NotNull @DecimalMin("0.00") BigDecimal totalAmount,
        @NotBlank @Size(min = 3, max = 3) String currencyCode,
        @Size(max = 4000) String notes,
        @Size(max = 700) String documentUrl,
        @Size(max = 180) String submittedByName
    ) {
    }

    public record SupplierPortalDocumentUploadRequest(
        @Size(min = 4, max = 20) String pin,
        @NotBlank @Size(max = 240) String fileName,
        @Size(max = 120) String contentType,
        @NotNull @DecimalMin("1") Long sizeBytes
    ) {
    }

    public record SupplierPortalDocumentRegisterRequest(
        @NotBlank @Size(max = 700) String objectKey,
        @NotBlank @Size(max = 240) String fileName,
        @Size(max = 120) String contentType,
        @NotNull @DecimalMin("1") Long sizeBytes
    ) {
    }

    public record SupplierInvoiceDocumentUploadRequest(
        @NotBlank @Size(max = 240) String fileName,
        @Size(max = 120) String contentType,
        @NotNull @DecimalMin("1") Long sizeBytes
    ) {
    }

    public record SupplierPortalDocumentUploadResponse(
        String objectKey,
        String object_key,
        String uploadUrl,
        String upload_url,
        Instant expiresAt,
        String expires_at,
        Map<String, String> uploadHeaders,
        Map<String, String> upload_headers,
        String fileName,
        String contentType,
        Long sizeBytes
    ) {
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
