package com.indice.erp.pos.selfservice;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import com.indice.erp.pos.discount.DiscountDtos.RuleResponse;

public final class SelfServiceKioskDtos {

    private SelfServiceKioskDtos() {
    }

    public record CreateRequest(
        @NotNull Long cashRegisterId,
        @NotBlank @Size(max = 180) String name,
        @Size(max = 80) String code,
        Instant expiresAt,
        Boolean showStock,
        Boolean customerNameRequired,
        @Min(1) @Max(100) Integer maxItemsPerTicket,
        @Min(15) @Max(43200) Integer preticketTtlMinutes
    ) {
    }

    /**
     * Administrative creation contract for a self-checkout station. The POS resolves the
     * station's operational cash register from the selected warehouse so the UI keeps the
     * assignment flow centered on warehouse, business and unit.
     */
    public record SelfCheckoutCreateRequest(
        @NotNull Long warehouseId,
        @NotBlank @Size(max = 180) String name,
        Instant expiresAt,
        String catalogMode,
        List<String> productIds,
        Boolean discountsEnabled,
        @Min(1) @Max(60) Integer sessionTimeoutMinutes,
        Boolean supervisorExitRequired
    ) {
    }

    public record UpdateRequest(
        @NotBlank @Size(max = 180) String name,
        Instant expiresAt,
        Boolean showStock,
        Boolean customerNameRequired,
        @Min(1) @Max(100) Integer maxItemsPerTicket,
        @Min(15) @Max(43200) Integer preticketTtlMinutes,
        @NotNull Long version
    ) {
    }

    public record StatusRequest(
        @NotBlank String status,
        @Size(max = 500) String reason
    ) {
    }

    public record AdminResponse(
        Long id,
        Long companyId,
        String companyName,
        Long unitId,
        String unitName,
        Long businessId,
        String businessName,
        Long warehouseId,
        String warehouseName,
        Long cashRegisterId,
        String cashRegisterCode,
        String cashRegisterName,
        String code,
        String name,
        String status,
        Instant expiresAt,
        String publicTokenHint,
        String publicToken,
        String publicUrl,
        boolean showStock,
        boolean customerNameRequired,
        int maxItemsPerTicket,
        int preticketTtlMinutes,
        long version,
        Instant createdAt,
        Instant updatedAt
    ) {
    }

    public record CatalogItem(
        Long productId,
        String sku,
        String name,
        String description,
        String category,
        BigDecimal unitPrice,
        String currencyCode,
        BigDecimal availableQuantity,
        boolean stockTracked,
        boolean available
    ) {
    }

    public record BootstrapResponse(
        String code,
        String name,
        String companyName,
        String unitName,
        String businessName,
        String warehouseName,
        String cashRegisterName,
        String currencyCode,
        boolean showStock,
        boolean customerNameRequired,
        int maxItemsPerTicket,
        int preticketTtlMinutes,
        String fulfillmentPolicy,
        List<CatalogItem> items,
        String kioskType,
        String availabilityState,
        boolean sourceRegisterOpen,
        List<RuleResponse> discountRules
    ) {
        public BootstrapResponse(
                String code, String name, String companyName, String unitName, String businessName,
                String warehouseName, String cashRegisterName, String currencyCode, boolean showStock,
                boolean customerNameRequired, int maxItemsPerTicket, int preticketTtlMinutes,
                String fulfillmentPolicy, List<CatalogItem> items, String kioskType,
                String availabilityState, boolean sourceRegisterOpen) {
            this(code, name, companyName, unitName, businessName, warehouseName, cashRegisterName,
                currencyCode, showStock, customerNameRequired, maxItemsPerTicket, preticketTtlMinutes,
                fulfillmentPolicy, items, kioskType, availabilityState, sourceRegisterOpen, List.of());
        }
    }

    public record PreticketItemRequest(
        @NotNull Long productId,
        @NotNull @DecimalMin("0.0001") @DecimalMax("9999") BigDecimal quantity
    ) {
    }

    public record PreticketCreateRequest(
        @Size(max = 180) String customerName,
        @Email @Size(max = 180) String customerEmail,
        @Size(max = 40) String customerPhone,
        @Valid @NotEmpty @Size(max = 100) List<PreticketItemRequest> items
    ) {
    }

    public record PreticketItemResponse(
        Long productId,
        String sku,
        String productName,
        BigDecimal quantity,
        BigDecimal unitPrice,
        BigDecimal discountAmount,
        Long discountRuleId,
        BigDecimal lineTotal
    ) {
        public PreticketItemResponse(
                Long productId, String sku, String productName, BigDecimal quantity,
                BigDecimal unitPrice, BigDecimal lineTotal) {
            this(productId, sku, productName, quantity, unitPrice, BigDecimal.ZERO, null, lineTotal);
        }
    }

    public record PreticketResponse(
        Long id,
        Long kioskId,
        Long cashRegisterId,
        String cashRegisterName,
        String preticketNumber,
        String claimCode,
        String status,
        String currencyCode,
        String customerName,
        int itemCount,
        BigDecimal subtotalAmount,
        BigDecimal discountAmount,
        Long discountRuleId,
        BigDecimal totalAmount,
        Instant expiresAt,
        Instant createdAt,
        List<PreticketItemResponse> items
    ) {
        public PreticketResponse(
                Long id, Long kioskId, Long cashRegisterId, String cashRegisterName,
                String preticketNumber, String claimCode, String status, String currencyCode,
                String customerName, int itemCount, BigDecimal subtotalAmount, BigDecimal totalAmount,
                Instant expiresAt, Instant createdAt, List<PreticketItemResponse> items) {
            this(id, kioskId, cashRegisterId, cashRegisterName, preticketNumber, claimCode, status,
                currencyCode, customerName, itemCount, subtotalAmount, BigDecimal.ZERO, null,
                totalAmount, expiresAt, createdAt, items);
        }
    }

    /**
     * Public acknowledgement for a submitted pre-ticket. Functional identifiers,
     * customer data and line snapshots stay behind the authenticated POS queue.
     */
    public record PreticketReceiptResponse(
        String preticketNumber,
        String claimCode,
        String status,
        String currencyCode,
        int itemCount,
        BigDecimal discountAmount,
        BigDecimal totalAmount,
        Instant expiresAt
    ) {
        public PreticketReceiptResponse(
                String preticketNumber, String claimCode, String status, String currencyCode,
                int itemCount, BigDecimal totalAmount, Instant expiresAt) {
            this(preticketNumber, claimCode, status, currencyCode, itemCount, BigDecimal.ZERO,
                totalAmount, expiresAt);
        }
    }

    public record PreticketListResponse(List<PreticketResponse> items, int count) {
    }
}
