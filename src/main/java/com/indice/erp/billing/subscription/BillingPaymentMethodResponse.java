package com.indice.erp.billing.subscription;

import com.indice.erp.billing.stripe.StripePaymentMethodGateway.Status;
import java.time.Instant;

public record BillingPaymentMethodResponse(Status status, String brand, String last4, Instant checked_at) {}
