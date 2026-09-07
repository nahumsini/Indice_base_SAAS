package com.indice.erp.sales;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Commercial line totals are derived here; inventory supplies cost snapshots separately. */
final class SalesLineAmounts {
    /** A displayed margin is available only from immutable, compatible native cost evidence. */
    static void presentMargin(Map<String, Object> sale) {
        sale.put("marginReady", false);
        sale.put("marginTotal", BigDecimal.ZERO);
        if (!(sale.get("saleLines") instanceof List<?> lines) || lines.isEmpty()) return;
        String currency = String.valueOf(sale.get("currency"));
        BigDecimal margin = BigDecimal.ZERO;
        for (var value : lines) {
            if (!(value instanceof Map<?, ?> line)) return;
            String source = String.valueOf(line.get("costSource"));
            if (!List.of("INVENTORY_BALANCE", "NO_INVENTORY_CONSUMPTION").contains(source)) return;
            try {
                var quantity = new BigDecimal(String.valueOf(line.get("quantity")));
                var cost = new BigDecimal(String.valueOf(line.get("unitCost")));
                if (quantity.signum() <= 0 || cost.signum() < 0) return;
                if (cost.signum() != 0 && !currency.equalsIgnoreCase(String.valueOf(line.get("costCurrency")))) return;
                var subtotal = line.get("subtotal") == null
                    ? new BigDecimal(String.valueOf(line.get("lineTotalAmount"))).subtract(new BigDecimal(String.valueOf(line.get("taxAmount"))))
                    : new BigDecimal(String.valueOf(line.get("subtotal")));
                margin = margin.add(subtotal.subtract(quantity.multiply(cost)));
            } catch (NumberFormatException invalid) { return; }
        }
        sale.put("marginTotal", margin.setScale(2, RoundingMode.HALF_UP));
        sale.put("marginReady", true);
    }

    static void calculate(Map<String, Object> payload, boolean discardClientCost) {
        payload.put("marginTotal", BigDecimal.ZERO);
        if (!(SalesPayloadSupport.value(payload, "saleLines") instanceof List<?> source) || source.isEmpty()) return;
        var lines = new ArrayList<Map<String, Object>>();
        BigDecimal net = BigDecimal.ZERO, discounts = BigDecimal.ZERO, taxes = BigDecimal.ZERO;
        for (var item : source) {
            if (!(item instanceof Map<?, ?> raw)) throw new IllegalArgumentException("Cada partida de venta debe ser válida.");
            var line = new LinkedHashMap<String, Object>(); raw.forEach((key, value) -> line.put(String.valueOf(key), value));
            var quantity = number(line, "quantity", true); var price = number(line, "unitPrice", false);
            var discount = percent(line, "discountPercent"); var tax = percent(line, "taxPercent");
            var gross = quantity.multiply(price);
            var discountAmount = money(gross.multiply(discount).movePointLeft(2));
            var subtotal = money(gross.subtract(discountAmount));
            var taxAmount = money(subtotal.multiply(tax).movePointLeft(2));
            line.put("subtotal", subtotal); line.put("taxAmount", taxAmount); line.put("discountAmount", discountAmount);
            if (discardClientCost) {
                for (var key : List.of("unitCost", "costCurrency", "costSource", "stockTracked", "marginAmount", "unitCostFunctional", "costRateEvidence")) line.remove(key);
            }
            lines.add(line); net = net.add(subtotal); discounts = discounts.add(discountAmount); taxes = taxes.add(taxAmount);
        }
        payload.put("saleLines", lines);
        payload.put("subtotal", net.setScale(2, RoundingMode.HALF_UP));
        payload.put("discountTotal", discounts.setScale(2, RoundingMode.HALF_UP));
        payload.put("taxTotal", taxes.setScale(2, RoundingMode.HALF_UP));
        payload.put("totalAmount", net.add(taxes).setScale(2, RoundingMode.HALF_UP));
    }
    static boolean sameInputs(Object before, Object after) {
        if (!(before instanceof List<?> original) || !(after instanceof List<?> changed) || original.size() != changed.size()) return false;
        for (int i = 0; i < original.size(); i++) {
            if (!(original.get(i) instanceof Map<?, ?> a) || !(changed.get(i) instanceof Map<?, ?> b)) return false;
            for (var field : List.of("productId", "quantity", "unitPrice", "discountPercent", "taxPercent")) {
                try {
                    var left = a.get(field) == null ? BigDecimal.ZERO : new BigDecimal(a.get(field).toString());
                    var right = b.get(field) == null ? BigDecimal.ZERO : new BigDecimal(b.get(field).toString());
                    if (left.compareTo(right) != 0) return false;
                } catch (NumberFormatException invalid) { return false; }
            }
        }
        return true;
    }

    private static BigDecimal number(Map<String, Object> line, String key, boolean positive) {
        var value = SalesPayloadSupport.decimalValue(line, key);
        if (value == null || value.signum() < 0 || (positive && value.signum() == 0) || value.precision() - value.scale() > 12)
            throw new IllegalArgumentException("Cantidad y precio de la partida no son válidos.");
        return value;
    }
    private static BigDecimal percent(Map<String, Object> line, String key) {
        var value = SalesPayloadSupport.decimalValue(line, key);
        if (value == null) return BigDecimal.ZERO;
        if (value.signum() < 0 || value.compareTo(new BigDecimal("100")) > 0) throw new IllegalArgumentException("Descuento e impuesto deben estar entre 0 y 100.");
        return value;
    }
    private static BigDecimal money(BigDecimal value) { return value.setScale(4, RoundingMode.HALF_UP); }
    private SalesLineAmounts() {}
}
