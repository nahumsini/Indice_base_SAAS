package com.indice.erp.sales.publiccatalog;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public final class SalesPublicCatalogDtos {

    private SalesPublicCatalogDtos() {
    }

    public record SaveRequest(
        @NotBlank @Size(max = 180) String name,
        @NotNull Long unitId,
        @NotNull Long businessId,
        @NotBlank @Size(max = 220) String title,
        @Size(max = 2000) String description,
        @Size(max = 1200) String coverImageUrl,
        @NotBlank @Size(max = 120) String contactCtaLabel,
        @NotBlank @Size(max = 24) String contactMethod,
        @Size(max = 500) String contactValue,
        Instant expiresAt,
        Boolean showPrices,
        Boolean showWholesalePrices,
        Boolean showStockStatus,
        Boolean showItemTypeBadges,
        Boolean showCategories,
        Boolean allowCart,
        Boolean allowPurchaseRequest,
        @NotNull @Size(max = 500) List<@NotNull Long> productIds,
        Long version
    ) {
    }

    public record StatusRequest(@NotBlank String status, @Size(max = 500) String reason) {
    }

    public record AdminResponse(
        Long id,
        Long companyId,
        String companyName,
        Long unitId,
        String unitName,
        Long businessId,
        String businessName,
        String code,
        String name,
        String title,
        String description,
        String coverImageUrl,
        String contactCtaLabel,
        String contactMethod,
        String contactValue,
        String status,
        Instant expiresAt,
        String publicTokenHint,
        String publicToken,
        String publicUrl,
        boolean showPrices,
        boolean showWholesalePrices,
        boolean showStockStatus,
        boolean showItemTypeBadges,
        boolean showCategories,
        boolean allowCart,
        boolean allowPurchaseRequest,
        List<Long> productIds,
        long version,
        Instant createdAt,
        Instant updatedAt
    ) {
    }

    public record LinkResponse(String publicUrl, String publicTokenHint, long version) {
    }

    public record PublicItem(
        Long id,
        String name,
        String sku,
        String type,
        String category,
        String description,
        String thumbnailUrl,
        String thumbnailAlt,
        BigDecimal publicPrice,
        BigDecimal wholesalePrice,
        BigDecimal wholesaleMinQuantity,
        String currency,
        boolean usesInventory,
        String publicInventoryStatus,
        boolean readyForSales
    ) {
    }

    public record BootstrapResponse(
        String code,
        String companyName,
        String unitName,
        String businessName,
        String title,
        String description,
        String coverImageUrl,
        String contactCtaLabel,
        String contactMethod,
        String contactValue,
        boolean showPrices,
        boolean showWholesalePrices,
        boolean showStockStatus,
        boolean showItemTypeBadges,
        boolean showCategories,
        boolean allowCart,
        boolean allowPurchaseRequest,
        String submissionPolicy,
        List<PublicItem> items
    ) {
    }

    public record RequestItem(
        @NotNull Long productId,
        @NotNull @DecimalMin("0.0001") @DecimalMax("999999") BigDecimal quantity
    ) {
    }

    public record PurchaseRequest(
        @NotBlank @Size(max = 180) String customerName,
        @NotBlank @Size(max = 240) String contact,
        @NotBlank @Size(max = 24) String preferredContactMethod,
        @Size(max = 4000) String message,
        @Valid @NotNull @Size(max = 500) List<@NotNull @Valid RequestItem> items
    ) {
    }

    public record RequestItemResponse(
        Long productId,
        String sku,
        String productName,
        BigDecimal quantity,
        BigDecimal unitPrice,
        BigDecimal lineTotal
    ) {
    }

    public record RequestResponse(
        Long id,
        Long catalogId,
        String requestNumber,
        String status,
        String customerName,
        String contact,
        String preferredContactMethod,
        String message,
        String currencyCode,
        int itemCount,
        BigDecimal estimatedTotal,
        Instant createdAt,
        List<RequestItemResponse> items
    ) {
    }

    public record RequestListResponse(List<RequestResponse> items, int count) {
    }

    public record SubmissionResponse(
        String reference,
        String requestNumber,
        String status,
        String submissionPolicy,
        String currencyCode,
        int itemCount,
        BigDecimal estimatedTotal
    ) {
    }

    public record ReviewRequest(@NotBlank String status, @Size(max = 4000) String note) {
    }
}
