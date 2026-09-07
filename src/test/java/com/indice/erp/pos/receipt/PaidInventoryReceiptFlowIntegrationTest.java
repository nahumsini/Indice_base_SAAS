package com.indice.erp.pos.receipt;

import static org.assertj.core.api.Assertions.*;
import com.indice.erp.pos.*;
import java.math.BigDecimal;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class PaidInventoryReceiptFlowIntegrationTest {
    @Autowired JdbcTemplate jdbc;
    @Autowired PaidInventoryReceiptService service;
    @Autowired PaidInventoryReceiptRepository repository;
    @Autowired com.indice.erp.pos.shift.ShiftService shifts;
    long company, user, unit, business, warehouse, register, shift, provider, product;
    PosContext context;
    @BeforeEach void setup() {
        var database = jdbc.queryForObject("SELECT DATABASE()", String.class);
        assertThat(database).as("Tests must run on the isolated test database").contains("test").isNotEqualTo("corazon_testers");
        String key = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO companies (name) VALUES (?)", key);
        company = jdbc.queryForObject("SELECT id FROM companies WHERE name = ?", Long.class, key);
        user = jdbc.queryForObject("SELECT id FROM users ORDER BY id LIMIT 1", Long.class);
        context = new PosContext(user, company, "Synthetic cashier", "admin", true, PosScope.corporateOffice());
        jdbc.update("INSERT INTO units (company_id, name) VALUES (?, 'Receipt test unit')", company); unit = last("units");
        jdbc.update("INSERT INTO businesses (company_id, unit_id, name) VALUES (?, ?, 'Receipt test business')", company, unit); business = last("businesses");
        jdbc.update("INSERT INTO sales_inventory_warehouses (company_id, warehouse_code, name, type, status, business_unit_id, business_id) VALUES (?, ?, 'Correct warehouse', 'main', 'active', ?, ?)", company, key, unit, business); warehouse = last("sales_inventory_warehouses");
        jdbc.update("INSERT INTO pos_cash_registers (company_id, warehouse_id, unit_id, business_id, code, name, status, is_active, created_by_user_id) VALUES (?, ?, ?, ?, 'REC-TEST', 'Correct register', 'ACTIVE', 1, ?)", company, warehouse, unit, business, user); register = last("pos_cash_registers");
        jdbc.update("INSERT INTO pos_shifts (company_id, unit_id, business_id, warehouse_id, cash_register_id, opened_by_user_id, created_by_user_id, status, currency_code, opening_amount, expected_cash_amount) VALUES (?, ?, ?, ?, ?, ?, ?, 'OPEN', 'MXN', 500, 500)", company, unit, business, warehouse, register, user, user); shift = last("pos_shifts");
        jdbc.update("INSERT INTO finance_providers (company_id, name, status) VALUES (?, 'Receipt supplier', 'ACTIVE')", company); provider = last("finance_providers");
        product = product("Product", "MXN", false, "Existing product");
        jdbc.update("INSERT INTO sales_inventory_balances (company_id, balance_code, product_id, warehouse_id, warehouse_name, available_quantity, reserved_quantity, unit_cost, uses_inventory) VALUES (?, ?, ?, ?, 'Correct warehouse', 5, 1, 8, 1)", company, key, product, warehouse);
    }
    long last(String table) { return jdbc.queryForObject("SELECT MAX(id) FROM " + table + " WHERE company_id = ?", Long.class, company); }
    long product(String type, String currency, boolean inventory, String name) {
        jdbc.update("INSERT INTO sales_products (company_id, product_code, name, type, currency, cost, status, inventory_ready, metadata_json, custom_fields_json) VALUES (?, ?, ?, ?, ?, 8, 'active', ?, JSON_OBJECT('packaging', JSON_OBJECT('baseUnit', 'Piece')), JSON_OBJECT('unrelated', 'keep'))", company, UUID.randomUUID().toString(), name, type, currency, inventory);
        return last("sales_products");
    }
    PaidInventoryReceiptDtos.CreateRequest request(boolean enable) {
        return new PaidInventoryReceiptDtos.CreateRequest("test-receipt-1", register, shift, provider, "MXN", "CASH", null, "REF", "Saved note",
            List.of(new PaidInventoryReceiptDtos.ItemRequest(new PaidInventoryReceiptDtos.ProductInput(product, null, null, null, "Piece", null, enable ? true : null),
                new BigDecimal("2"), new BigDecimal("10"), new BigDecimal("0.16"), false, "mx16", "IVA")));
    }
    @Test void receivesExistingProductOncePreservingStockAndPrintsPersistedReceipt() {
        var receipt = service.create(context, request(true));
        var replay = service.create(context, request(true));
        assertThat(replay.id()).isEqualTo(receipt.id());
        assertThat(receipt.totalAmount()).isEqualByComparingTo("23.20");
        assertThat(receipt.warehouseId()).isEqualTo(warehouse);
        assertThat(receipt.items()).hasSize(1);
        assertThat(receipt.metadata()).containsEntry("cashRegisterCode", "REC-TEST").containsEntry("notes", "Saved note").containsKey("createdAt");
        assertThat(jdbc.queryForObject("SELECT available_quantity FROM sales_inventory_balances WHERE company_id = ? AND product_id = ?", BigDecimal.class, company, product)).isEqualByComparingTo("7");
        assertThat(jdbc.queryForObject("SELECT reserved_quantity FROM sales_inventory_balances WHERE company_id = ? AND product_id = ?", BigDecimal.class, company, product)).isEqualByComparingTo("1");
        assertThat(jdbc.queryForObject("SELECT unit_cost FROM sales_inventory_balances WHERE company_id = ? AND product_id = ?", BigDecimal.class, company, product)).isEqualByComparingTo("8.57");
        assertThat(jdbc.queryForObject("SELECT JSON_UNQUOTE(JSON_EXTRACT(custom_fields_json, '$.unrelated')) FROM sales_products WHERE company_id = ? AND id = ?", String.class, company, product)).isEqualTo("keep");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM pos_cash_movements WHERE company_id = ? AND shift_id = ?", Integer.class, company, shift)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM sales_products WHERE company_id = ?", Integer.class, company)).isEqualTo(1);
        jdbc.update("UPDATE pos_cash_registers SET name = 'Renamed register' WHERE company_id = ? AND id = ?", company, register);
        var history = service.recent(context, shift);
        assertThat(history).hasSize(1);
        assertThat(history.getFirst().metadata()).containsEntry("cashRegisterName", "Correct register");
        assertThat(history.getFirst().items().getFirst().lineTotal()).isEqualByComparingTo("23.20");
    }
    @Test void closesShiftAfterReceiptAndReprintsWithoutRepeatingTheClosing() {
        service.create(context, request(true));
        var closed = shifts.close(context, shift, new com.indice.erp.pos.shift.dto.ShiftCloseRequest(new BigDecimal("476.80"), "Closing note"));
        assertThat(closed.expectedCashAmount()).isEqualByComparingTo("476.80");
        assertThat(closed.overShortAmount()).isZero();
        shifts.close(context, shift, new com.indice.erp.pos.shift.dto.ShiftCloseRequest(new BigDecimal("476.80"), "Closing note"));
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM pos_cash_closings WHERE company_id = ? AND shift_id = ?", Integer.class, company, shift)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT cash_out_amount FROM pos_cash_closings WHERE company_id = ? AND shift_id = ?", BigDecimal.class, company, shift)).isEqualByComparingTo("23.20");
        assertThat(service.recent(context, shift)).hasSize(1);
    }
    @Test void registerMovedAwayFromItsOpenShiftCannotReceiveMerchandise() {
        jdbc.update("INSERT INTO sales_inventory_warehouses (company_id, warehouse_code, name, type, status, business_unit_id, business_id) VALUES (?, ?, 'Another warehouse', 'main', 'active', ?, ?)", company, UUID.randomUUID().toString(), unit, business);
        long otherWarehouse = last("sales_inventory_warehouses");
        jdbc.update("UPDATE pos_cash_registers SET warehouse_id = ? WHERE company_id = ? AND id = ?", otherWarehouse, company, register);
        assertThatThrownBy(() -> service.create(context, request(true))).hasMessageContaining("same warehouse");
        assertThat(repository.requireProduct(context, product).inventoryReady()).isFalse();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM pos_inventory_receipts WHERE company_id = ?", Integer.class, company)).isZero();
    }
    @Test void nativeCurrencyMismatchDoesNotEnableOrReceiveProduct() {
        jdbc.update("UPDATE sales_products SET currency = 'USD' WHERE company_id = ? AND id = ?", company, product);
        assertThatThrownBy(() -> service.create(context, request(true))).hasMessageContaining("currency must match");
        assertThat(repository.requireProduct(context, product).inventoryReady()).isFalse();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM pos_cash_movements WHERE company_id = ?", Integer.class, company)).isZero();
    }
    @Test void listsEligibleExistingProductsAndFiltersCurrencyBeforeLimit() {
        product("SERVICE", "MXN", false, "Excluded service");
        product("OPERATIONAL_ITEM", "MXN", false, "Excluded internal item");
        for (int i=0; i<85; i++) product("PRODUCT", "USD", true, "A foreign " + i);
        var options = service.products(context, register, "", "MXN");
        assertThat(options).extracting(PaidInventoryReceiptDtos.ProductOptionResponse::id).containsExactly(product);
        assertThat(options.getFirst().inventoryReady()).isFalse();
    }
    @Test void activationIsExplicitAndScopedToCompany() {
        assertThatThrownBy(() -> service.create(context, request(false))).hasMessageContaining("Confirm inventory activation");
        assertThat(repository.requireProduct(context, product).inventoryReady()).isFalse();
        var other = new PosContext(user, company + 99999, "Other", "admin", true, PosScope.corporateOffice());
        assertThat(repository.products(other, warehouse, "", "MXN")).isEmpty();
        assertThatThrownBy(() -> repository.requireProduct(other, product)).isInstanceOf(PosApiException.class);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM pos_inventory_receipts WHERE company_id = ?", Integer.class, company)).isZero();
    }
}
