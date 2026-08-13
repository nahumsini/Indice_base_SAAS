package com.indice.erp.billing.subscription;

import java.util.List;

public record BillingSelectionRequest(
    List<String> product_codes,
    Integer extra_seats,
    String billing_interval
) {
}
