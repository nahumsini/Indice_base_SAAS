package com.indice.erp.sales.publiccatalog;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import com.indice.erp.pos.discount.DiscountDtos.RuleResponse;

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
        @Size(max = 32) String experienceProfile,
        @Pattern(regexp = "^#[0-9A-Fa-f]{6}$") String accentColor,
        @Size(max = 24) String heroStyle,
        @Size(max = 24) String layoutStyle,
        @Size(max = 24) String cardStyle,
        @Size(max = 24) String imageRatio,
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
        Boolean allowImageDownloads,
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
        String companyLogoUrl,
        Long unitId,
        String unitName,
        Long businessId,
        String businessName,
        String code,
        String name,
        String title,
        String description,
        String coverImageUrl,
        String experienceProfile,
        String accentColor,
        String heroStyle,
        String layoutStyle,
        String cardStyle,
        String imageRatio,
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
        boolean allowImageDownloads,
        List<Long> productIds,
        long version,
        Instant createdAt,
        Instant updatedAt
    ) {
    }

    public record LinkResponse(String publicUrl, String publicTokenHint, long version) {
    }

    public record PublicImage(String url, String alt) {
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
        List<PublicImage> images,
        BigDecimal publicPrice,
        BigDecimal wholesalePrice,
        BigDecimal wholesaleMinQuantity,
        String currency,
        boolean usesInventory,
        String publicInventoryStatus,
        boolean readyForSales,
        boolean reservable
    ) {
    }

    public record AvailabilityRequest(
        @NotNull Long productId,
        @NotBlank @Pattern(regexp = "\\d{4}-(0[1-9]|1[0-2])") String month
    ) {
    }

    public record AvailabilityDay(String date, String status) {
    }

    public record AvailabilityResponse(
        Long productId,
        String month,
        String sourceStatus,
        boolean stale,
        List<AvailabilityDay> days
    ) {
    }

    public record BootstrapResponse(
        String code,
        String companyName,
        String companyLogoUrl,
        String unitName,
        String businessName,
        String title,
        String description,
        String coverImageUrl,
        String experienceProfile,
        String accentColor,
        String heroStyle,
        String layoutStyle,
        String cardStyle,
        String imageRatio,
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
        boolean allowImageDownloads,
        String submissionPolicy,
        List<PublicItem> items,
        List<RuleResponse> discountRules
    ) {
        public BootstrapResponse(
                String code, String companyName, String companyLogoUrl, String unitName,
                String businessName, String title,
                String description, String coverImageUrl, String experienceProfile, String accentColor,
                String heroStyle, String layoutStyle, String cardStyle, String imageRatio,
                String contactCtaLabel, String contactMethod,
                String contactValue, boolean showPrices, boolean showWholesalePrices,
                boolean showStockStatus, boolean showItemTypeBadges, boolean showCategories,
                boolean allowCart, boolean allowPurchaseRequest, boolean allowImageDownloads,
                String submissionPolicy,
                List<PublicItem> items) {
            this(code, companyName, companyLogoUrl, unitName, businessName, title, description, coverImageUrl,
                experienceProfile, accentColor, heroStyle, layoutStyle, cardStyle, imageRatio,
                contactCtaLabel, contactMethod, contactValue, showPrices, showWholesalePrices,
                showStockStatus, showItemTypeBadges, showCategories, allowCart,
                allowPurchaseRequest, allowImageDownloads, submissionPolicy, items, List.of());
        }
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
        BigDecimal discountAmount,
        Long discountRuleId,
        BigDecimal lineTotal
    ) {
        public RequestItemResponse(
                Long productId, String sku, String productName, BigDecimal quantity,
                BigDecimal unitPrice, BigDecimal lineTotal) {
            this(productId, sku, productName, quantity, unitPrice, BigDecimal.ZERO, null, lineTotal);
        }
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
        BigDecimal subtotalAmount,
        BigDecimal discountAmount,
        Long discountRuleId,
        BigDecimal estimatedTotal,
        Instant createdAt,
        List<RequestItemResponse> items
    ) {
        public RequestResponse(
                Long id, Long catalogId, String requestNumber, String status, String customerName,
                String contact, String preferredContactMethod, String message, String currencyCode,
                int itemCount, BigDecimal estimatedTotal, Instant createdAt,
                List<RequestItemResponse> items) {
            this(id, catalogId, requestNumber, status, customerName, contact,
                preferredContactMethod, message, currencyCode, itemCount, estimatedTotal,
                BigDecimal.ZERO, null, estimatedTotal, createdAt, items);
        }
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
