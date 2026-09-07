package com.indice.erp.sales;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class SalesInventoryCloseoutIntegrationTest {
    @Autowired JdbcTemplate jdbc;
    @Autowired SalesService sales;
    @Autowired SalesRepository repository;
    long company, user, warehouse, product;
    @BeforeEach void setup() {
        String key = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO companies (name) VALUES (?)", key);
        company = jdbc.queryForObject("SELECT id FROM companies WHERE name = ?", Long.class, key);
        user = jdbc.queryForObject("SELECT id FROM users ORDER BY id LIMIT 1", Long.class);
        jdbc.update("INSERT INTO user_companies (company_id, user_id, role, status, visibility) VALUES (?, ?, 'admin', 'active', 'all')", company, user);
        jdbc.update("INSERT INTO units (company_id, name, status) VALUES (?, 'Test unit', 'active')", company);
        long unit = jdbc.queryForObject("SELECT id FROM units WHERE company_id = ?", Long.class, company);
        jdbc.update("INSERT INTO businesses (company_id, unit_id, name, status) VALUES (?, ?, 'Test business', 'active')", company, unit);
        long business = jdbc.queryForObject("SELECT id FROM businesses WHERE company_id = ?", Long.class, company);
        jdbc.update("INSERT INTO sales_inventory_warehouses (company_id, warehouse_code, name, type, status) VALUES (?, ?, 'Test warehouse', 'main', 'active')", company, key);
        warehouse = jdbc.queryForObject("SELECT id FROM sales_inventory_warehouses WHERE company_id = ?", Long.class, company);
        jdbc.update("UPDATE sales_inventory_warehouses SET business_unit_id = ?, business_id = ? WHERE company_id = ? AND id = ?", unit, business, company, warehouse);
        jdbc.update("INSERT INTO sales_products (company_id, product_code, sku, name, type, currency, cost, inventory_ready, status) VALUES (?, ?, ?, 'Test stock', 'PRODUCT', 'MXN', 50, 1, 'active')", company, key, key);
        product = jdbc.queryForObject("SELECT id FROM sales_products WHERE company_id = ?", Long.class, company);
        jdbc.update("INSERT INTO sales_inventory_balances (company_id, balance_code, product_id, warehouse_id, warehouse_name, available_quantity, unit_cost, uses_inventory) VALUES (?, ?, ?, ?, 'Test warehouse', 10, 50, 1)", company, key, product, warehouse);
    }
    Map<String, Object> line(int qty) { return new LinkedHashMap<>(Map.of("productId", product, "quantity", qty, "unitPrice", 100, "unitCost", 99999, "discountPercent", 10, "taxPercent", 16, "warehouseId", warehouse)); }
    Map<String, Object> payload(List<Map<String, Object>> lines) {
        return new LinkedHashMap<>(Map.of("customerName", "Synthetic customer", "saleDate", "2026-09-01", "currency", "MXN", "paymentMethod", "cash", "commercialStatus", "approved", "financeStatus", "pending", "totalAmount", 1, "saleLines", lines));
    }
    @Test void stockCostAndTotalsAreAuthoritativeAndConfirmationAndReturnDoNotRepeat() {
        var sale = sales.create(company, user, "sales", payload(List.of(line(1), line(1))));
        long id = ((Number) sale.get("id")).longValue();
        assertThat(new BigDecimal(sale.get("totalAmount").toString())).isEqualByComparingTo("208.80");
        assertThat(balance()).isEqualByComparingTo("8");
        assertThat(sale.get("marginReady")).isEqualTo(true);
        assertThat(new BigDecimal(sale.get("marginTotal").toString())).isEqualByComparingTo("80");
        var lines = (List<?>) sale.get("saleLines");
        assertThat(lines).allSatisfy(value -> assertThat(new BigDecimal(((Map<?, ?>) value).get("unitCost").toString())).isEqualByComparingTo("50"));
        sales.update(company, user, "sales", id, Map.of("inventoryStatus", "approved"));
        sales.update(company, user, "sales", id, Map.of("inventoryStatus", "approved"));
        assertThat(balance()).isEqualByComparingTo("8");
        assertThatThrownBy(() -> sales.update(company, user, "sales", id, Map.of("saleLines", List.of(line(3)))))
            .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("partidas");
        assertThatThrownBy(() -> sales.delete(company, "sales", id)).hasMessageContaining("historial de inventario");
        sales.update(company, user, "sales", id, Map.of("commercialStatus", "cancelled"));
        sales.update(company, user, "sales", id, Map.of("commercialStatus", "cancelled"));
        assertThat(balance()).isEqualByComparingTo("10");
    }
    @Test void insufficientCombinedQuantityKeepsTheSalePendingWithoutTrustingClientCost() {
        var sale = sales.create(company, user, "sales", payload(List.of(line(6), line(6))));
        assertThat(balance()).isEqualByComparingTo("10");
        assertThat((List<?>) sale.get("saleLines")).allSatisfy(value -> assertThat(((Map<?, ?>) value).get("unitCost")).isNull());
        assertThat(sale.get("marginReady")).isEqualTo(false);
    }
    @Test void serviceSaleDoesNotRequireAWarehouseAndItsInventoryCostIsZero() {
        jdbc.update("UPDATE sales_products SET type = 'SERVICE', inventory_ready = 0 WHERE company_id = ? AND id = ?", company, product);
        var line = line(1); line.remove("warehouseId");
        var sale = sales.create(company, user, "sales", payload(List.of(line)));
        assertThat(sale.get("inventoryStatus")).isEqualTo("not_required");
        assertThat((List<?>) sale.get("saleLines")).allSatisfy(value -> assertThat(new BigDecimal(((Map<?, ?>) value).get("unitCost").toString())).isZero());
        assertThat(balance()).isEqualByComparingTo("10");
    }
    @Test void legacyKpisRespectAssignedOrganizationAndExcludeCancelledSales() {
        var sale = sales.create(company, user, "sales", payload(List.of(line(1))));
        long id = ((Number) sale.get("id")).longValue();
        long unit = jdbc.queryForObject("SELECT business_unit_id FROM sales_inventory_warehouses WHERE company_id = ? AND id = ?", Long.class, company, warehouse);
        long business = jdbc.queryForObject("SELECT business_id FROM sales_inventory_warehouses WHERE company_id = ? AND id = ?", Long.class, company, warehouse);
        jdbc.update("UPDATE sales_records SET unit_id = ?, business_id = ? WHERE company_id = ? AND id = ?", unit, business, company, id);
        var today = java.time.LocalDate.of(2026, 9, 6);
        var allowed = com.indice.erp.hr.HrOperationalScope.unitHeadquarters(unit);
        var other = com.indice.erp.hr.HrOperationalScope.unitHeadquarters(unit + 100000);
        assertThat(repository.kpis(company, today, allowed).get("sales")).isEqualTo(1L);
        assertThat(repository.kpis(company, today, other).get("sales")).isEqualTo(0L);
        assertThat(repository.salesKpiAmounts(company, "month", today, allowed)).hasSize(1);
        assertThat(repository.salesKpiAmounts(company, "month", today, other)).isEmpty();
        sales.update(company, user, "sales", id, Map.of("commercialStatus", "cancelled"));
        assertThat(repository.kpis(company, today, allowed).get("sales")).isEqualTo(0L);
        assertThat(repository.salesKpiAmounts(company, "month", today, allowed)).isEmpty();
    }
    @Test void productCurrencyTypeAndHistoryRemainIntactAfterInventoryIsRecorded() {
        assertThatThrownBy(() -> sales.update(company, user, "products", product, Map.of("currency", "USD")))
            .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("conserva moneda");
        assertThatThrownBy(() -> sales.update(company, user, "products", product, Map.of("type", "SERVICE")))
            .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("conserva moneda");
        assertThatThrownBy(() -> sales.delete(company, "products", product)).hasMessageContaining("historial de inventario");
        assertThat(jdbc.queryForObject("SELECT currency FROM sales_products WHERE company_id = ? AND id = ?", String.class, company, product)).isEqualTo("MXN");
        assertThat(balance()).isEqualByComparingTo("10");
    }
    @Test void differentNativeCostCurrencyDoesNotBecomeASaleCurrencyMargin() {
        jdbc.update("UPDATE sales_products SET currency = 'USD' WHERE company_id = ? AND id = ?", company, product);
        var sale = sales.create(company, user, "sales", payload(List.of(line(1))));
        assertThat(sale.get("marginReady")).isEqualTo(false);
        assertThat(new BigDecimal(sale.get("marginTotal").toString())).isZero();
        assertThat((List<?>) sale.get("saleLines")).allSatisfy(value -> assertThat(((Map<?, ?>) value).get("costCurrency")).isEqualTo("USD"));
    }
    BigDecimal balance() { return jdbc.queryForObject("SELECT available_quantity FROM sales_inventory_balances WHERE company_id = ? AND product_id = ?", BigDecimal.class, company, product); }
}
