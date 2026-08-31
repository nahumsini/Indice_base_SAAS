package com.indice.erp.billing.stripe;

import java.util.List;

public interface StripeCatalogGateway {

    AccountResult account();

    ProductResult upsertProduct(ProductCommand command, String idempotencyKey);

    PriceResult createRecurringPrice(PriceCommand command, String idempotencyKey);

    ProductVerification verifyProduct(String productId);

    PriceVerification verifyRecurringPrice(String priceId);

    PromotionVerification verifyPromotionCode(String promotionCodeId);

    record AccountResult(String accountId, boolean chargesEnabled, boolean payoutsEnabled) {
    }

    record ProductCommand(String externalProductId, String name, String taxCode, String catalogReference) {
    }

    record ProductResult(String productId, boolean livemode) {
    }

    record PriceCommand(
        String productId,
        String currency,
        long amountCents,
        String interval,
        String catalogReference
    ) {
    }

    record PriceResult(String priceId, String taxBehavior, boolean livemode) {
    }

    record ProductVerification(
        String productId,
        String name,
        String taxCode,
        boolean active,
        boolean livemode
    ) {
    }

    record PriceVerification(
        String priceId,
        String productId,
        String currency,
        long amountCents,
        String interval,
        String taxBehavior,
        boolean active,
        boolean livemode
    ) {
    }

    record PromotionVerification(
        String promotionCodeId,
        String code,
        String discountType,
        Integer percentBasisPoints,
        Long amountOffCents,
        String currency,
        String durationType,
        Integer durationCycles,
        List<String> productIds,
        boolean active,
        boolean livemode
    ) {
    }
}
