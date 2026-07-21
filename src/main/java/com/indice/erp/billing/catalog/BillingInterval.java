package com.indice.erp.billing.catalog;

import java.util.Locale;

public enum BillingInterval {
    MONTH,
    YEAR;

    public static BillingInterval parse(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("Billing interval is required.");
        }
        return switch (value.trim().toUpperCase(Locale.ROOT)) {
            case "MONTH", "MONTHLY" -> MONTH;
            case "YEAR", "ANNUAL", "ANNUALLY" -> YEAR;
            default -> throw new IllegalArgumentException("Billing interval must be MONTH or YEAR.");
        };
    }
}
