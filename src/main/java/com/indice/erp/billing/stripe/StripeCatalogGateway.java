package com.indice.erp.billing.stripe;

public interface StripeCatalogGateway {

    ProductResult upsertProduct(ProductCommand command, String idempotencyKey);

    PriceResult createRecurringPrice(PriceCommand command, String idempotencyKey);

    record ProductCommand(String externalProductId, String name, String taxCode) {
    }

    record ProductResult(String productId) {
    }

    record PriceCommand(String productId, String currency, long amountCents, String interval) {
    }

    record PriceResult(String priceId, String taxBehavior) {
    }
}
