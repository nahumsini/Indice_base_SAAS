package com.indice.erp.billing.seats;

public interface StripeSeatGateway {

    Result setExtraSeatQuantity(Command command, String idempotencyKey);

    record Command(
        String subscriptionId,
        String subscriptionItemId,
        String priceId,
        int quantity
    ) {}

    record Result(String subscriptionItemId, int quantity) {}
}
