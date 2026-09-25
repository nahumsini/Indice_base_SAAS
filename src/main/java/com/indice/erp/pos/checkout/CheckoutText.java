package com.indice.erp.pos.checkout;

import com.indice.erp.pos.PosJsonSupport;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Map;

final class CheckoutText {
    private CheckoutText() {}
    static String trim(String value) {
        var trimmed = value == null ? null : value.trim();
        return trimmed == null || trimmed.isBlank() ? null : trimmed;
    }
    static String truncate(String value, int length) {
        var trimmed = trim(value);
        return trimmed == null || trimmed.length() <= length ? trimmed : trimmed.substring(0, length);
    }
    static String customerName(CustomerSnapshot customer) {
        var name = customer == null ? null : truncate(customer.name(), 220);
        return name == null ? "POS Customer" : name;
    }
    static String taxId(CustomerSnapshot customer) {
        return customer == null ? null : truncate(customer.taxId(), 80);
    }
    static String metadata(boolean inventory) {
        return PosJsonSupport.toJson(Map.of("source", "POS", "inventoryDeducted", inventory));
    }
    static boolean sameMoney(BigDecimal first, BigDecimal second) {
        return (first == null ? BigDecimal.ZERO : first).setScale(2, RoundingMode.HALF_UP)
            .compareTo((second == null ? BigDecimal.ZERO : second).setScale(2, RoundingMode.HALF_UP)) == 0;
    }
}
