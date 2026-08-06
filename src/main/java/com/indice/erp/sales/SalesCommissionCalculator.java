package com.indice.erp.sales;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

final class SalesCommissionCalculator {

    private static final List<String> SALE_TYPES = List.of("fixed_per_sale", "percentage_of_sale");
    private static final List<String> LINE_TYPES = List.of("fixed_per_product", "percentage_of_product");

    private SalesCommissionCalculator() {}

    static Map<String, Object> calculate(Map<String, Object> sale, List<Map<String, Object>> rules) {
        var saleDate = date(value(sale, "saleDate"));
        var sellerId = text(value(sale, "sellerId"));
        if (sellerId.isBlank() && value(sale, "customFields") instanceof Map<?, ?> customFields) {
            sellerId = text(customFields.get("sellerId"));
        }
        if (sellerId.isBlank()) sellerId = text(value(sale, "sellerUserCompanyId"));
        var sellerName = text(value(sale, "sellerName"));
        var saleAmount = decimal(value(sale, "totalAmount"));
        var lines = maps(value(sale, "saleLines"));
        var activeRules = rules.stream().filter(rule -> activeOn(rule, saleDate)).toList();
        var breakdown = new ArrayList<Map<String, Object>>();

        for (var line : lines) {
            var rule = best(activeRules, sellerId, sellerName, line, LINE_TYPES);
            if (rule == null) continue;
            var amount = commission(rule, saleAmount, decimal(value(line, "subtotal")), decimal(value(line, "quantity")));
            breakdown.add(snapshot(rule, amount, text(value(line, "productId")), text(value(line, "productName"))));
        }

        if (breakdown.isEmpty()) {
            var rule = best(activeRules, sellerId, sellerName, null, SALE_TYPES);
            if (rule == null) return emptyResult();
            var amount = commission(rule, saleAmount, BigDecimal.ZERO, BigDecimal.ONE);
            breakdown.add(snapshot(rule, amount, "", "Whole sale"));
        }

        var total = breakdown.stream()
                .map(item -> decimal(item.get("commissionAmount")))
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);
        var first = breakdown.getFirst();
        var singleRule = breakdown.stream().map(item -> item.get("ruleId")).distinct().count() == 1;
        var result = new LinkedHashMap<String, Object>();
        result.put("commissionAmount", total);
        result.put("commissionRate", saleAmount.signum() > 0
                ? total.multiply(BigDecimal.valueOf(100)).divide(saleAmount, 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO);
        result.put("commissionStatus", total.signum() > 0 ? "calculated" : "pending");
        result.put("commissionRuleId", singleRule ? first.get("ruleId") : null);
        result.put("commissionRuleCode", singleRule ? first.get("ruleCode") : "MULTIPLE");
        result.put("commissionRuleName", singleRule ? first.get("ruleName") : "Multiple product rules");
        result.put("commissionType", singleRule ? first.get("commissionType") : "product_breakdown");
        result.put("commissionValue", singleRule ? first.get("commissionValue") : BigDecimal.ZERO);
        result.put("commissionBreakdown", breakdown);
        return result;
    }

    static Map<String, Object> preview(Map<String, Object> rule, Map<String, Object> input) {
        var amount = commission(
                rule,
                decimal(value(input, "saleAmount")),
                decimal(value(input, "productAmount")),
                decimal(value(input, "quantity")));
        return Map.of("commissionAmount", amount, "currency", text(value(input, "currency")));
    }

    private static Map<String, Object> emptyResult() {
        var result = new LinkedHashMap<String, Object>();
        result.put("commissionAmount", BigDecimal.ZERO);
        result.put("commissionRate", BigDecimal.ZERO);
        result.put("commissionStatus", "pending");
        result.put("commissionRuleId", null);
        result.put("commissionRuleCode", null);
        result.put("commissionRuleName", "Not available");
        result.put("commissionType", null);
        result.put("commissionValue", BigDecimal.ZERO);
        result.put("commissionBreakdown", List.of());
        return result;
    }

    private static Map<String, Object> best(
            List<Map<String, Object>> rules,
            String sellerId,
            String sellerName,
            Map<String, Object> line,
            List<String> types) {
        return rules.stream()
                .filter(rule -> types.contains(text(value(rule, "type"))))
                .filter(rule -> matches(rule, sellerId, sellerName, line))
                .max(Comparator.comparingLong(rule -> score(rule)))
                .orElse(null);
    }

    private static boolean matches(Map<String, Object> rule, String sellerId, String sellerName, Map<String, Object> line) {
        var ruleUserIds = texts(value(rule, "userIds"));
        var ruleUserNames = texts(value(rule, "userNames"));
        var productIds = texts(value(rule, "productIds"));
        var ruleUserId = text(value(rule, "userId"));
        var ruleUserName = text(value(rule, "userName"));
        var productId = text(value(rule, "productId"));
        var categoryId = text(value(rule, "categoryId"));
        var categoryName = text(value(rule, "categoryName"));
        if (!ruleUserIds.isEmpty() && !ruleUserIds.contains(sellerId)) return false;
        if (ruleUserIds.isEmpty() && !ruleUserId.isBlank() && !ruleUserId.equals(sellerId)) return false;
        if (ruleUserIds.isEmpty() && !ruleUserNames.isEmpty() && !ruleUserNames.contains(sellerName)) return false;
        if (ruleUserIds.isEmpty() && ruleUserNames.isEmpty() && !ruleUserName.isBlank() && !ruleUserName.equals(sellerName)) return false;
        if (!productIds.isEmpty() && (line == null || !productIds.contains(text(value(line, "productId"))))) return false;
        if (productIds.isEmpty() && !productId.isBlank() && (line == null || !productId.equals(text(value(line, "productId"))))) return false;
        if (!categoryId.isBlank() && (line == null || !categoryId.equals(text(value(line, "categoryId"))))) return false;
        return categoryName.isBlank() || (line != null && categoryName.equals(text(value(line, "categoryName"))));
    }

    private static long score(Map<String, Object> rule) {
        var user = !texts(value(rule, "userIds")).isEmpty() || !texts(value(rule, "userNames")).isEmpty()
                || !text(value(rule, "userId")).isBlank() || !text(value(rule, "userName")).isBlank();
        var product = !texts(value(rule, "productIds")).isEmpty() || !text(value(rule, "productId")).isBlank();
        var category = !text(value(rule, "categoryId")).isBlank() || !text(value(rule, "categoryName")).isBlank();
        var specificity = user && (product || category) ? 4 : product ? 3 : category ? 2 : user ? 1 : 0;
        var priority = Math.max(0, Math.min(999_999, decimal(value(rule, "priority")).longValue()));
        return specificity * 1_000_000L + priority;
    }

    private static BigDecimal commission(Map<String, Object> rule, BigDecimal sale, BigDecimal product, BigDecimal quantity) {
        var amount = decimal(value(rule, "value"));
        if (amount.signum() <= 0) return BigDecimal.ZERO.setScale(2);
        return (switch (text(value(rule, "type"))) {
            case "fixed_per_sale" -> amount;
            case "fixed_per_product" -> amount.multiply(quantity.max(BigDecimal.ZERO));
            case "percentage_of_sale" -> sale.multiply(amount).divide(BigDecimal.valueOf(100));
            case "percentage_of_product" -> product.multiply(amount).divide(BigDecimal.valueOf(100));
            default -> BigDecimal.ZERO;
        }).setScale(2, RoundingMode.HALF_UP);
    }

    private static Map<String, Object> snapshot(Map<String, Object> rule, BigDecimal amount, String productId, String productName) {
        var item = new LinkedHashMap<String, Object>();
        item.put("ruleId", value(rule, "id"));
        item.put("ruleCode", value(rule, "ruleCode"));
        item.put("ruleName", value(rule, "name"));
        item.put("commissionType", value(rule, "type"));
        item.put("commissionValue", value(rule, "value"));
        item.put("commissionAmount", amount);
        item.put("productId", productId);
        item.put("productName", productName);
        return item;
    }

    private static boolean activeOn(Map<String, Object> rule, LocalDate date) {
        if (!"active".equalsIgnoreCase(text(value(rule, "status")))) return false;
        var from = date(value(rule, "validFrom"));
        var until = date(value(rule, "validUntil"));
        return (from == null || date == null || !date.isBefore(from)) && (until == null || date == null || !date.isAfter(until));
    }

    private static Object value(Map<String, Object> map, String key) { return map == null ? null : map.get(key); }
    private static String text(Object value) { return value == null ? "" : String.valueOf(value); }
    private static BigDecimal decimal(Object value) {
        if (value == null || text(value).isBlank()) return BigDecimal.ZERO;
        try { return new BigDecimal(text(value)); } catch (NumberFormatException ignored) { return BigDecimal.ZERO; }
    }
    private static LocalDate date(Object value) {
        if (value == null || text(value).isBlank()) return null;
        try { return LocalDate.parse(text(value)); } catch (RuntimeException ignored) { return null; }
    }
    private static List<Map<String, Object>> maps(Object value) {
        if (!(value instanceof List<?> values)) return List.of();
        var result = new ArrayList<Map<String, Object>>();
        for (var item : values) {
            if (item instanceof Map<?, ?> raw) {
                var mapped = new LinkedHashMap<String, Object>();
                raw.forEach((key, nested) -> mapped.put(String.valueOf(key), nested));
                result.add(mapped);
            }
        }
        return result;
    }
    private static List<String> texts(Object value) {
        if (!(value instanceof List<?> values)) return List.of();
        return values.stream().map(SalesCommissionCalculator::text).filter(item -> !item.isBlank()).toList();
    }
}
