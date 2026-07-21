package com.indice.erp.billing.storage;

public interface StripeStorageGateway {

    Result setBlockQuantity(Command command, String idempotencyKey);

    record Command(String subscriptionId, String subscriptionItemId, String priceId, int quantity) {}

    record Result(String subscriptionItemId, int quantity) {}
}
