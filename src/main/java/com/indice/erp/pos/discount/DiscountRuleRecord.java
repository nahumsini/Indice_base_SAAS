package com.indice.erp.pos.discount;

import java.math.BigDecimal;
import java.time.Instant;

record DiscountRuleRecord(
        long id,
        long companyId,
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
        String enabledChannelsJson,
        long version,
        Instant createdAt,
        Instant updatedAt) {
}
