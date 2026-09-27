package com.indice.erp.finance.reporting;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import com.indice.erp.exchange.*;
import java.math.BigDecimal;
import java.time.LocalDate;
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
class InventoryAccountingHistoryIntegrationTest {
    @Autowired JdbcTemplate jdbc;
    @Autowired HistoricalInventoryCost costs;
    @Autowired BusinessExchangeRateSnapshotRepository snapshots;
    @Autowired FinancialLedgerRepository ledger;
    @Autowired AccountingSourceReversalService reversals;
    @Autowired AccountingCurrencyConversion conversion;
    long company, user, warehouse, register, shift, product;
    @BeforeEach void setup() {
        String key = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO companies (name) VALUES (?)", key);
        company = jdbc.queryForObject("SELECT id FROM companies WHERE name = ?", Long.class, key);
        user = jdbc.queryForObject("SELECT id FROM users ORDER BY id LIMIT 1", Long.class);
        jdbc.update("INSERT INTO sales_inventory_warehouses (company_id, warehouse_code, name, type, status) VALUES (?, ?, 'Historical warehouse', 'main', 'active')", company, key);
        warehouse = last("sales_inventory_warehouses");
        jdbc.update("INSERT INTO pos_cash_registers (company_id, warehouse_id, code, name, status, created_by_user_id) VALUES (?, ?, 'HISTORICAL', 'Historical register', 'ACTIVE', ?)", company, warehouse, user);
        register = last("pos_cash_registers");
        jdbc.update("INSERT INTO pos_shifts (company_id, warehouse_id, cash_register_id, opened_by_user_id, created_by_user_id, status, currency_code) VALUES (?, ?, ?, ?, ?, 'CLOSED', 'USD')", company, warehouse, register, user, user);
        shift = last("pos_shifts");
        jdbc.update("INSERT INTO sales_products (company_id, product_code, sku, name, currency, cost, status) VALUES (?, ?, ?, 'Historical product', 'USD', 15, 'active')", company, key, key);
        product = last("sales_products");
        ledger.ensureSettings(company, user); ledger.ensureStandardAccounts(company, user);
    }
    long last(String table) { return jdbc.queryForObject("SELECT MAX(id) FROM " + table + " WHERE company_id = ?", Long.class, company); }
    long receipt(String day, int nativeCost) {
        jdbc.update("""
            INSERT INTO pos_inventory_receipts (company_id, receipt_number, warehouse_id, cash_register_id, shift_id,
              counterparty_name, payment_method, subtotal_amount, total_amount, currency_code, created_by_user_id, created_at)
            VALUES (?, ?, ?, ?, ?, 'Synthetic supplier', 'TRANSFER', ?, ?, 'USD', ?, CONCAT(?, ' 16:00:00'))
            """, company, UUID.randomUUID().toString(), warehouse, register, shift, nativeCost * 10, nativeCost * 10, user, day);
        long id = last("pos_inventory_receipts");
        jdbc.update("""
            INSERT INTO sales_inventory_movements (company_id, movement_number, product_id, product_name, movement_type, quantity,
              unit_cost, to_warehouse_id, movement_date, status, metadata_json)
            VALUES (?, ?, ?, 'Historical product', 'POS_PAID_RECEIPT_IN', 10, ?, ?, ?, 'posted', JSON_OBJECT('receiptId', ?))
            """, company, UUID.randomUUID().toString(), product, nativeCost, warehouse, day, id);
        return id;
    }
    void saleOut(long sale, String date) {
        jdbc.update("""
            INSERT INTO sales_inventory_movements (company_id, movement_number, product_id, product_name, movement_type, quantity,
              unit_cost, from_warehouse_id, movement_date, status, metadata_json)
            VALUES (?, ?, ?, 'Historical product', 'sale', 2, 15, ?, ?, 'completed', JSON_OBJECT('saleId', ?))
            """, company, UUID.randomUUID().toString(), product, warehouse, date, sale);
    }
    void rate(String day, String value) {
        var amount = new BigDecimal(value);
        snapshots.save(LocalDate.parse(day), new BusinessExchangeRatesResponse("USD", Map.of("USD", BigDecimal.ONE, "MXN", amount), null,
            List.of(new BusinessExchangeRateSourceResponse("MXN", amount, day, "Isolated fixture", "Historical test", "https://example.test/fx", "", "official", "Deterministic fixture")), List.of()));
    }
    @Test void foreignInventoryUsesWeightedAcquisitionRatesInsteadOfTheSaleDateRate() {
        rate("2002-01-01", "20"); rate("2002-01-02", "22"); rate("2002-01-03", "25");
        receipt("2002-01-01", 10); receipt("2002-01-02", 20); saleOut(123, "2002-01-03");
        var value = costs.sale(company, 123, "USD", "MXN", new BigDecimal("30"));
        assertThat(value.functionalCost()).isEqualByComparingTo("640");
        assertThat(value.evidence()).hasSize(2);
        assertThatThrownBy(() -> costs.sale(company, 123, "USD", "MXN", new BigDecimal("50")))
            .isInstanceOf(AccountingCurrencyConversion.MissingRecognition.class);
    }
    @Test void receiptDatetimeCancellationCreatesOneLinkedBalancedReversalWithoutEditingTheOriginal() {
        long receipt = receipt("2002-01-01", 10);
        var settings = ledger.findSettings(company).orElseThrow();
        var candidate = new AccountingPostingModels.PostingCandidate("inventory", "INVENTORY_RECEIPT", String.valueOf(receipt),
            "inventory:INVENTORY_RECEIPT:" + receipt, "fixture", "INVENTORY", LocalDate.of(2002, 1, 1), "Receipt original", "MXN", List.of(
                new AccountingPostingModels.PostingLine("INVENTORY", null, null, null, "Original", new BigDecimal("100"), BigDecimal.ZERO, "receipt"),
                new AccountingPostingModels.PostingLine("CASH", null, null, null, "Original", BigDecimal.ZERO, new BigDecimal("100"), "receipt")));
        ledger.post(company, user, settings, candidate);
        jdbc.update("UPDATE pos_inventory_receipts SET status = 'REVERSED', reversed_at = '2002-01-02 16:00:00' WHERE company_id = ? AND id = ?", company, receipt);
        assertThat(reversals.postSalesReversals(company, user, settings, LocalDate.of(2002, 1, 1), LocalDate.of(2002, 1, 3))).isEqualTo(1);
        assertThat(reversals.postSalesReversals(company, user, settings, LocalDate.of(2002, 1, 1), LocalDate.of(2002, 1, 3))).isZero();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM finance_journal_entries WHERE company_id = ? AND status = 'POSTED'", Integer.class, company)).isEqualTo(2);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM finance_journal_entries WHERE company_id = ? AND reversal_of_entry_id IS NOT NULL", Integer.class, company)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT SUM(debit_amount-credit_amount) FROM finance_journal_lines WHERE company_id = ?", BigDecimal.class, company)).isZero();
    }

    @Test void posReturnPreservesAcquisitionCostForTheNextSaleInsteadOfBlockingItsAccounting() {
        rate("2002-01-01", "20"); rate("2002-01-02", "22"); rate("2002-01-03", "25");
        receipt("2002-01-01", 10); receipt("2002-01-02", 20);
        saleOut(123, "2002-01-03");
        long original = last("sales_inventory_movements");
        jdbc.update("UPDATE sales_inventory_movements SET movement_type = 'POS_SALE_OUT', status = 'posted' WHERE company_id = ? AND id = ?", company, original);
        jdbc.update("""
            INSERT INTO sales_inventory_movements (company_id, movement_number, product_id, product_name, movement_type,
              quantity, unit_cost, to_warehouse_id, movement_date, status, metadata_json)
            VALUES (?, ?, ?, 'Historical product', 'POS_SALE_RETURN', 2, 15, ?, '2002-01-03', 'posted',
              JSON_OBJECT('source', 'POS_RETURN', 'reversalOfMovementId', ?))
            """, company, UUID.randomUUID().toString(), product, warehouse, original);
        saleOut(124, "2002-01-03");
        assertThat(costs.sale(company, 124, "USD", "MXN", new BigDecimal("30")).functionalCost()).isEqualByComparingTo("640");
    }
    @Test void refundPreservesHistoricalInventoryAndRecognizesCashAtTheRefundRate() {
        rate("2002-01-01", "20");
        long receipt = receipt("2002-01-01", 10);
        var settings = ledger.findSettings(company).orElseThrow();
        var original = new AccountingPostingModels.PostingCandidate("inventory", "INVENTORY_RECEIPT", String.valueOf(receipt),
            "inventory:INVENTORY_RECEIPT:" + receipt, "foreign-fixture", "INVENTORY", LocalDate.of(2002, 1, 1), "Foreign receipt", "USD", List.of(
                new AccountingPostingModels.PostingLine("INVENTORY", null, null, null, "Original", new BigDecimal("100"), BigDecimal.ZERO, "receipt"),
                new AccountingPostingModels.PostingLine("CASH", null, null, null, "Original", BigDecimal.ZERO, new BigDecimal("100"), "receipt")));
        ledger.post(company, user, settings, conversion.convert(company, original, "MXN"));
        jdbc.update("UPDATE pos_inventory_receipts SET status = 'REVERSED', reversed_at = '2002-01-20 16:00:00' WHERE company_id = ? AND id = ?", company, receipt);
        var from = LocalDate.of(2002, 1, 1); var to = LocalDate.of(2002, 1, 20);
        assertThat(reversals.postSalesReversals(company, user, settings, from, to)).isZero();
        assertThat(reversals.pending(company, from, to, null, null)).hasSize(1);
        rate("2002-01-20", "22");
        assertThat(reversals.postSalesReversals(company, user, settings, from, to)).isEqualTo(1);
        assertThat(reversals.pending(company, from, to, null, null)).isEmpty();
        assertThat(jdbc.queryForObject("""
            SELECT SUM(line.credit_amount - line.debit_amount) FROM finance_journal_lines line
            JOIN finance_accounting_accounts account ON account.company_id = line.company_id AND account.id = line.account_id
            WHERE line.company_id = ? AND account.system_code = 'REALIZED_EXCHANGE_GAIN'
            """, BigDecimal.class, company)).isEqualByComparingTo("200");
    }

}
