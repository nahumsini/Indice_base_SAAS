package com.indice.erp.sales;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class SalesCommissionCalculatorTest {

    @Test
    void specificProductRuleWinsAndPreservesCents() {
        var sale = Map.<String, Object>of(
                "saleDate", "2026-08-05",
                "sellerUserCompanyId", "22",
                "sellerName", "Seller",
                "totalAmount", "999.99",
                "saleLines", List.of(Map.of(
                        "productId", "P-1",
                        "productName", "Product",
                        "quantity", 1,
                        "subtotal", "333.33")));
        var general = rule(1L, "GENERAL", "General", "percentage_of_sale", "90", 999);
        var product = new java.util.LinkedHashMap<>(rule(2L, "PRODUCT", "Product rule", "percentage_of_product", "7.5", 1));
        product.put("productId", "P-1");

        var result = SalesCommissionCalculator.calculate(sale, List.of(general, product));

        assertThat(result.get("commissionAmount")).isEqualTo(new BigDecimal("25.00"));
        assertThat(result.get("commissionRuleCode")).isEqualTo("PRODUCT");
    }

    @Test
    void inactiveAndOutOfDateRulesAreIgnored() {
        var sale = Map.<String, Object>of("saleDate", "2026-08-05", "totalAmount", 1000, "saleLines", List.of());
        var inactive = new java.util.LinkedHashMap<>(rule(1L, "OFF", "Inactive", "percentage_of_sale", 10, 50));
        inactive.put("status", "inactive");
        var expired = new java.util.LinkedHashMap<>(rule(2L, "OLD", "Expired", "percentage_of_sale", 10, 50));
        expired.put("validUntil", "2025-12-31");

        var result = SalesCommissionCalculator.calculate(sale, List.of(inactive, expired));

        assertThat((BigDecimal) result.get("commissionAmount")).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(result.get("commissionRuleId")).isNull();
    }

    @Test
    void multiEmployeeAndProductScopeIsResolvedByBackend() {
        var matchingSale = Map.<String, Object>of(
                "saleDate", "2026-08-05", "sellerId", "22", "sellerName", "Seller",
                "totalAmount", 200, "saleLines", List.of(Map.of(
                        "productId", "P-2", "productName", "Product 2", "quantity", 2, "subtotal", 200)));
        var rule = new java.util.LinkedHashMap<>(rule(3L, "TEAM", "Team rule", "fixed_per_product", 15, 50));
        rule.put("userIds", List.of("21", "22", "23"));
        rule.put("productIds", List.of("P-1", "P-2"));

        var result = SalesCommissionCalculator.calculate(matchingSale, List.of(rule));

        assertThat(result.get("commissionAmount")).isEqualTo(new BigDecimal("30.00"));
        assertThat(result.get("commissionRuleCode")).isEqualTo("TEAM");
    }

    private static Map<String, Object> rule(long id, String code, String name, String type, Object value, int priority) {
        var rule = new java.util.LinkedHashMap<String, Object>();
        rule.put("id", id);
        rule.put("ruleCode", code);
        rule.put("name", name);
        rule.put("type", type);
        rule.put("value", value);
        rule.put("priority", priority);
        rule.put("status", "active");
        return rule;
    }
}
