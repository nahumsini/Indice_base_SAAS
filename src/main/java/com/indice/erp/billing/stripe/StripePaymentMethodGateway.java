package com.indice.erp.billing.stripe;

/** Read-only view of the effective default card, never a promise that a future payment will succeed. */
public interface StripePaymentMethodGateway {
    CardStatus inspect(String customerId, String subscriptionId);

    enum Status { SAVED, NO_CARD, EXPIRED, UNAVAILABLE }

    record CardStatus(Status status, String brand, String last4) {
        public static CardStatus unavailable() { return new CardStatus(Status.UNAVAILABLE, null, null); }
        public static CardStatus noCard() { return new CardStatus(Status.NO_CARD, null, null); }
    }
}
