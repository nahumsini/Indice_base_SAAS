package com.indice.erp.billing.stripe;

import java.time.Instant;
import java.util.List;
import java.util.Map;

/** Read-only provider evidence for a specifically bound collection obligation. */
public interface StripeCollectionGateway {
    Invoice retrieveInvoice(String invoiceId);
    Checkout retrieveCheckout(String sessionId);

    record Invoice(
        String id, String subscriptionId, String customerId, String status, String currency,
        boolean liveMode, Long amountDue, Long amountPaid, Long amountRemaining,
        Long amountPaidOffStripe, Long subtotal, Long totalExcludingTax, String billingReason, String hostedInvoiceUrl,
        Instant createdAt, List<Line> lines, Map<String, String> subscriptionMetadata
    ) {
        public Invoice {
            lines = lines == null ? List.of() : List.copyOf(lines);
            subscriptionMetadata = subscriptionMetadata == null ? Map.of() : Map.copyOf(subscriptionMetadata);
        }
    }

    record Line(String priceId, long quantity, long amount, String currency) {}
    record Checkout(String id, String status, String paymentStatus, String customerId,
        String subscriptionId, String invoiceId, Map<String, String> metadata) {}
}
