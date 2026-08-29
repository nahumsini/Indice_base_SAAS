package com.indice.erp.billing.subscription;

import java.util.List;

public record BillingSelectionRequest(
    List<String> product_codes,
    Integer extra_seats,
    String billing_interval,
    String promotion_code
) {
    public BillingSelectionRequest(List<String> product_codes, Integer extra_seats, String billing_interval) {
        this(product_codes, extra_seats, billing_interval, null);
    }
}
