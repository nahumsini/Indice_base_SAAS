package com.indice.erp.pos.discount;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public final class DiscountDtos {

    private DiscountDtos() {
    }

    public record RuleRequest(
            Long unitId,
            Long businessId,
            Long warehouseId,
            @NotBlank @Size(max = 180) String name,
            @NotNull @Size(max = 600) String description,
            @NotBlank String scope,
            @NotBlank String discountType,
            @NotNull @DecimalMin(value = "0.0", inclusive = false) BigDecimal value,
            @NotBlank @Pattern(regexp = "[A-Za-z]{3}") String currencyCode,
            @NotNull Instant startsAt,
            @NotNull Instant endsAt,
            @DecimalMin("0.0") BigDecimal minimumAmount,
            @DecimalMin("0.0") BigDecimal maximumDiscountAmount,
            String customerType,
            Long productId,
            @Size(max = 160) String category,
            boolean requiresAuthorization,
            boolean stackable,
            int priority,
            @NotEmpty List<@NotBlank String> enabledChannels,
            Long version) {
    }

    public record StatusRequest(@NotBlank String status, Long version) {
    }

    public record EvaluationRequest(
            @NotBlank String channel,
            @NotNull @DecimalMin("0.0") BigDecimal amount,
            Long productId,
            String category,
            String customerType,
            String scope,
            @NotBlank @Pattern(regexp = "[A-Za-z]{3}") String currencyCode,
            Long warehouseId,
            Long unitId,
            Long businessId) {
    }

    public record RuleResponse(
            long id,
            Long unitId,
            Long businessId,
            Long warehouseId,
            String name,
            String description,
            String scope,
            String discountType,
            BigDecimal value,
            String currencyCode,
            Instant startsAt,
            Instant endsAt,
            BigDecimal minimumAmount,
            BigDecimal maximumDiscountAmount,
            String customerType,
            Long productId,
            String category,
            boolean requiresAuthorization,
            boolean stackable,
            int priority,
            String status,
            List<String> enabledChannels,
            long version,
            Instant createdAt,
            Instant updatedAt) {
    }

    public record RuleListResponse(List<RuleResponse> items, int count) {
    }

    public record EvaluatedRuleResponse(
            RuleResponse rule,
            BigDecimal discountAmount,
            boolean authorizationRequired,
            boolean currentUserCanAuthorize) {
    }

    public record EvaluationResponse(List<EvaluatedRuleResponse> items, int count) {
    }
}
