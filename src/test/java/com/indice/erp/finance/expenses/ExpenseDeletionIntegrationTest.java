package com.indice.erp.finance.expenses;
import static org.assertj.core.api.Assertions.*;
import com.indice.erp.finance.expenses.dto.*;
import com.indice.erp.finance.shared.*;
import com.indice.erp.finance.status.ExpenseStatus;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
class ExpenseDeletionIntegrationTest {
    @Autowired org.springframework.jdbc.core.JdbcTemplate jdbc;
    @Autowired ExpenseService expenses;
    @Autowired ExpenseImportService imports;
    @Autowired ExpenseBulkActionService bulk;
    @Autowired FinanceBusinessTimeZoneResolver timeZones;
    private FinanceContext context;
    private final List<Long> companies = new ArrayList<>();
    private long user;
    private long account;
    private long bank;

    @BeforeEach
    void setup() {
        var name = "expense-operations-test-" + UUID.randomUUID();
        long company = company(name);
        jdbc.update("INSERT INTO users (email, password_hash) VALUES (?, 'isolated-test-no-login')", name + "@example.test");
        user = jdbc.queryForObject("SELECT id FROM users WHERE email = ?", Long.class, name + "@example.test");
        context = new FinanceContext(user, company, "Test", "admin", true, FinanceScope.corporateOffice());
        account = accountingAccount(company, "6000");
        bank = paymentAccount(company, "Bank", "MXN", "BANK");
    }

    @AfterEach
    void cleanup() {
        // Only rows owned by the companies created by this test are removed, in FK order.
        for (long company : companies) {
            for (var table : List.of("finance_payment_account_movements", "finance_journal_lines", "finance_journal_entries", "finance_accounting_settings", "finance_accounting_periods", "finance_expense_import_batches",
                    "finance_petty_cash_settlement_lines", "finance_petty_cash_statements", "finance_expense_payments",
                    "finance_expenses", "pos_purchase_receipts", "pos_purchase_order_items", "pos_purchase_orders", "sales_inventory_warehouses", "finance_providers", "finance_petty_cash_funds", "finance_payment_accounts", "finance_accounting_accounts")) {
                jdbc.update("DELETE FROM " + table + " WHERE company_id = ?", company);
            }
            jdbc.update("DELETE FROM companies WHERE id = ?", company);
        }
        jdbc.update("DELETE FROM users WHERE id = ?", user);
    }


    @ParameterizedTest
    @ValueSource(strings = {"DRAFT", "PENDING_APPROVAL", "APPROVED", "PARTIALLY_PAID", "PAID", "CANCELLED", "REJECTED"})
    void ordinaryStatusesCanBeSoftDeleted(String status) {
        var saved = expenses.createDraft(context, row("Removal", bank, account, "MXN"));
        jdbc.update("UPDATE finance_expenses SET status = ? WHERE id = ?", status, saved.id());
        remove(saved);
        assertThat(jdbc.queryForObject("SELECT deleted_at IS NOT NULL FROM finance_expenses WHERE id = ?", Boolean.class, saved.id())).isTrue();
        assertThat(jdbc.queryForObject("SELECT JSON_UNQUOTE(JSON_EXTRACT(metadata_json, '$.deletion.reason')) FROM finance_expenses WHERE id = ?", String.class, saved.id())).isEqualTo("Incorrect duplicate entry");
        assertThatThrownBy(() -> expenses.get(context, saved.id())).hasMessageContaining("not found");
    }

    @ParameterizedTest
    @ValueSource(strings = {"MXN", "USD", "CAD", "COP", "BRL"})
    void paidRemovalCompensatesOnlyActualMovementsAndCannotDoubleCredit(String currency) {
        long payment = currency.equals("MXN") ? bank : paymentAccount(context.companyId(), currency, currency, "BANK");
        var saved = imports.importExpenses(context, new ImportExpensesRequest(UUID.randomUUID().toString(), List.of(importRow("Paid", payment, currency, true, false, "0")))).expenses().getFirst();
        var original = jdbc.queryForList("SELECT * FROM finance_expense_payments WHERE expense_id = ?", saved.id());
        assertBalance(payment, "4884");
        remove(saved);
        assertBalance(payment, "5000");
        assertThat(count("finance_payment_account_movements")).isEqualTo(2);
        assertThat(jdbc.queryForObject("SELECT SUM(available_delta) FROM finance_payment_account_movements WHERE company_id = ?", BigDecimal.class, context.companyId())).isEqualByComparingTo("0");
        assertThat(jdbc.queryForList("SELECT * FROM finance_expense_payments WHERE expense_id = ?", saved.id())).isEqualTo(original);
        assertThatThrownBy(() -> remove(saved)).hasMessageContaining("not found");
        assertBalance(payment, "5000");
    }

    @Test void legacyPaidWithoutAccountDoesNotInventCashAndPartialPaymentsRestoreTheirAccounts() {
        var legacy = imports.importExpenses(context, new ImportExpensesRequest(UUID.randomUUID().toString(), List.of(importRow("Legacy", null, "MXN", true, false, "0")))).expenses().getFirst();
        remove(legacy);
        assertThat(count("finance_payment_account_movements")).isZero();
        var saved = expenses.createDraft(context, row("Partial", bank, account, "MXN"));
        expenses.recordPayment(context, saved.id(), new RecordExpensePaymentRequest(new BigDecimal("20"), bank, businessToday(), "first"));
        long secondBank = paymentAccount(context.companyId(), "Second", "MXN", "BANK");
        saved = expenses.recordPayment(context, saved.id(), new RecordExpensePaymentRequest(new BigDecimal("30"), secondBank, businessToday(), "second"));
        jdbc.update("UPDATE finance_payment_accounts SET status = 'INACTIVE' WHERE id = ?", bank);
        remove(saved);
        assertBalance(bank, "5000"); assertBalance(secondBank, "5000");
    }

    @Test void auditedRowRejectsWholeBatchAndStaleAndForeignRequestsCannotMutate() {
        var paid = imports.importExpenses(context, new ImportExpensesRequest(UUID.randomUUID().toString(), List.of(importRow("Paid", bank, "MXN", true, false, "0")))).expenses().getFirst();
        var protectedRow = expenses.createDraft(context, row("Audited", bank, account, "MXN"));
        jdbc.update("UPDATE finance_expenses SET audit_status = 'AUDITED' WHERE id = ?", protectedRow.id());
        assertThatThrownBy(() -> bulk.apply(context, request(paid, protectedRow))).hasMessageContaining("Audited");
        assertBalance(bank, "4884");
        assertThat(expenses.get(context, paid.id()).version()).isEqualTo(paid.version());
        jdbc.update("UPDATE finance_expenses SET version = version + 1 WHERE id = ?", paid.id());
        assertThatThrownBy(() -> remove(paid)).hasMessageContaining("changed");
        var foreign = new FinanceContext(user, company("foreign-"+UUID.randomUUID()), "Other", "admin", true, FinanceScope.corporateOffice());
        assertThatThrownBy(() -> bulk.apply(foreign, request(protectedRow))).hasMessageContaining("not found");
        jdbc.update("UPDATE finance_expenses SET audit_status = NULL, status = 'CLOSED' WHERE id = ?", protectedRow.id());
        assertThatThrownBy(() -> remove(protectedRow)).hasMessageContaining("Audited");
    }

    @Test void purchaseOrderPolicyAllowsPendingButBlocksReceivedAndMissingOrders() {
        jdbc.update("INSERT INTO sales_inventory_warehouses (company_id, warehouse_code, name, type, status) VALUES (?, 'TEST', 'Warehouse', 'main', 'active')", context.companyId());
        long warehouse = jdbc.queryForObject("SELECT id FROM sales_inventory_warehouses WHERE company_id = ?", Long.class, context.companyId());
        jdbc.update("INSERT INTO finance_providers (company_id, name, status) VALUES (?, 'Supplier', 'ACTIVE')", context.companyId());
        long provider = jdbc.queryForObject("SELECT id FROM finance_providers WHERE company_id = ?", Long.class, context.companyId());
        jdbc.update("INSERT INTO pos_purchase_orders (company_id, warehouse_id, provider_id, folio, status, currency_code, created_by_user_id) VALUES (?, ?, ?, 'PO-TEST', 'SENT', 'MXN', ?)", context.companyId(), warehouse, provider, user);
        long order = jdbc.queryForObject("SELECT id FROM pos_purchase_orders WHERE company_id = ?", Long.class, context.companyId());
        var pending = expenses.createDraft(context, row("Pending order", bank, account, "MXN"));
        jdbc.update("UPDATE finance_expenses SET purchase_order_id = ? WHERE id = ?", order, pending.id());
        assertThat(expenses.get(context, pending.id()).purchaseOrderReceived()).isFalse();
        remove(pending);
        var received = expenses.createDraft(context, row("Received order", bank, account, "MXN"));
        jdbc.update("UPDATE finance_expenses SET purchase_order_id = ? WHERE id = ?", order, received.id());
        for (var status : List.of("PARTIALLY_RECEIVED", "RECEIVED", "CLOSED")) {
            jdbc.update("UPDATE pos_purchase_orders SET status = ? WHERE id = ?", status, order);
            assertThat(expenses.get(context, received.id()).purchaseOrderReceived()).isTrue();
            assertThatThrownBy(() -> remove(received)).hasMessageContaining("received purchase order");
        }
        jdbc.update("UPDATE finance_expenses SET purchase_order_id = 999999999 WHERE id = ?", received.id());
        assertThat(expenses.get(context, received.id()).purchaseOrderReceived()).isTrue();
        assertThatThrownBy(() -> remove(received)).hasMessageContaining("purchase order");
    }

    @Test void journalReversalIsBalancedAndClosedCurrentPeriodRollsBackBankAndExpense() {
        var paid = imports.importExpenses(context, new ImportExpensesRequest(UUID.randomUUID().toString(), List.of(importRow("Posted", bank, "MXN", true, false, "0")))).expenses().getFirst();
        long original = journal(paid);
        jdbc.update("UPDATE finance_accounting_periods SET status = 'CLOSED' WHERE company_id = ?", context.companyId());
        assertThatThrownBy(() -> remove(paid)).hasMessageContaining("closed");
        assertBalance(bank, "4884"); assertThat(count("finance_payment_account_movements")).isEqualTo(1);
        assertThat(expenses.get(context, paid.id()).version()).isEqualTo(paid.version());
        jdbc.update("UPDATE finance_accounting_periods SET status = 'OPEN' WHERE company_id = ?", context.companyId());
        remove(paid);
        assertBalance(bank, "5000");
        assertThat(count("finance_journal_entries")).isEqualTo(4);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM finance_journal_entries WHERE reversal_of_entry_id = ?", Integer.class, original)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT SUM(debit_amount-credit_amount) FROM finance_journal_lines WHERE company_id = ?", BigDecimal.class, context.companyId())).isEqualByComparingTo("0");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM finance_journal_lines r JOIN finance_journal_lines o ON r.account_id = o.account_id AND r.line_number = o.line_number JOIN finance_journal_entries e ON e.id = r.entry_id AND e.reversal_of_entry_id = o.entry_id WHERE r.company_id = ? AND r.debit_amount = o.credit_amount AND r.credit_amount = o.debit_amount AND r.transaction_currency = o.transaction_currency AND r.exchange_rate = o.exchange_rate", Integer.class, context.companyId())).isEqualTo(4);
    }

    private long journal(ExpenseResponse expense) {
        var today = businessToday(); var month = java.time.YearMonth.from(today);
        jdbc.update("INSERT INTO finance_accounting_settings(company_id,functional_currency,presentation_currency) VALUES (?, 'MXN', 'MXN')", context.companyId());
        jdbc.update("INSERT INTO finance_accounting_periods(company_id,period_key,period_start,period_end,framework_snapshot,functional_currency_snapshot) VALUES (?, ?, ?, ?, 'IFRS_SMES_2015', 'MXN')", context.companyId(), month.toString(), month.atDay(1), month.atEndOfMonth());
        long period = jdbc.queryForObject("SELECT id FROM finance_accounting_periods WHERE company_id = ?", Long.class, context.companyId());
        long liability = accountingAccount(context.companyId(), "2000");
        long payment = jdbc.queryForObject("SELECT id FROM finance_expense_payments WHERE company_id = ? AND expense_id = ?", Long.class, context.companyId(), expense.id());
        long original = 0;
        for (var source : List.of("EXPENSE", "EXPENSE_PAYMENT")) {
            long sourceId = source.equals("EXPENSE") ? expense.id() : payment;
            jdbc.update("INSERT INTO finance_journal_entries(company_id,period_id,entry_number,entry_date,journal_type,status,description,source_module,source_type,source_id,source_event_key,source_fingerprint,currency_code) VALUES (?, ?, ?, ?, 'EXPENSE', 'POSTED', 'Test', 'expenses', ?, ?, ?, ?, 'MXN')", context.companyId(), period, "TEST-"+source, today, source, String.valueOf(sourceId), source+":"+sourceId, "0".repeat(64));
            long entry = jdbc.queryForObject("SELECT id FROM finance_journal_entries WHERE company_id = ? AND source_type = ?", Long.class, context.companyId(), source);
            if (source.equals("EXPENSE")) original = entry;
            for (int i=1; i<=2; i++) jdbc.update("INSERT INTO finance_journal_lines(company_id,entry_id,account_id,line_number,description,debit_amount,credit_amount,transaction_amount,transaction_currency,functional_amount,functional_currency,exchange_rate) VALUES (?, ?, ?, ?, 'Test', ?, ?, 116, 'MXN', 116, 'MXN', 1)", context.companyId(), entry, i==1?account:liability, i, i==1?116:0, i==2?116:0);
        }
        return original;
    }
    private void remove(ExpenseResponse expense) { bulk.apply(context, request(expense)); }
    private ExpenseBulkActionRequest request(ExpenseResponse... rows) {
        return new ExpenseBulkActionRequest(ExpenseBulkActionRequest.Action.DELETE, Arrays.stream(rows).map(row -> new ExpenseBulkActionRequest.Selection(row.id(), row.version())).toList(), null, "Incorrect duplicate entry");
    }
    private LocalDate businessToday() { return LocalDate.now(timeZones.resolve(context.companyId())); }
    private void assertBalance(long payment, String value) { assertThat(jdbc.queryForObject("SELECT current_balance FROM finance_payment_accounts WHERE id = ?", BigDecimal.class, payment)).isEqualByComparingTo(value); }
    private CreateExpenseRequest importRow(String concept, Long payment, String currency, boolean paid, boolean taxIncluded, String rate) {
        var fields = com.fasterxml.jackson.databind.node.JsonNodeFactory.instance.objectNode()
            .put("bulkTaxIncluded", taxIncluded).put("taxIncluded", taxIncluded).put("taxRate", new BigDecimal(rate));
        return new CreateExpenseRequest(null, null, null, null, account, payment, null, "AUTO-EXP", concept, concept,
            ExpenseType.VARIABLE, new BigDecimal("116"), BigDecimal.ZERO, new BigDecimal("116"), currency,
            LocalDate.of(2026, 8, 15), businessToday().plusDays(10), null, null, null, paid, fields, null);
    }

    private CreateExpenseRequest row(String concept, Long payment, Long accounting, String currency) {
        return new CreateExpenseRequest(null, null, null, null, accounting, payment, null, "AUTO-EXP", concept, concept,
            ExpenseType.VARIABLE, new BigDecimal("100.25"), BigDecimal.ZERO, new BigDecimal("100.25"), currency,
            LocalDate.of(2026, 9, 8), LocalDate.of(2026, 9, 30), null, null, null, false, null, null);
    }
    private long company(String name) {
        jdbc.update("INSERT INTO companies (name) VALUES (?)", name);
        long id = jdbc.queryForObject("SELECT id FROM companies WHERE name = ?", Long.class, name);
        companies.add(id);
        return id;
    }
    private long accountingAccount(long company, String code) {
        jdbc.update("INSERT INTO finance_accounting_accounts (company_id, code, name, group_key, status) VALUES (?, ?, 'Operating expense', 'EXPENSE', 'ACTIVE')", company, code);
        return jdbc.queryForObject("SELECT id FROM finance_accounting_accounts WHERE company_id = ? AND code = ?", Long.class, company, code);
    }
    private long paymentAccount(long company, String name, String currency, String type) {
        jdbc.update("INSERT INTO finance_payment_accounts (company_id, name, type, currency_code, opening_balance, current_balance, status) VALUES (?, ?, ?, ?, 5000, 5000, 'ACTIVE')", company, name, type, currency);
        return jdbc.queryForObject("SELECT id FROM finance_payment_accounts WHERE company_id = ? AND name = ?", Long.class, company, name);
    }
    private long fund(String name, String type, long paymentAccount) {
        jdbc.update("""
            INSERT INTO finance_petty_cash_funds (company_id, name, currency_code, limit_amount, current_balance_amount,
                cut_off_day, status, fund_type, payment_account_id)
            VALUES (?, ?, 'MXN', 5000, 5000, 15, 'OPEN', ?, ?)
            """, context.companyId(), name, type, paymentAccount);
        return jdbc.queryForObject("SELECT id FROM finance_petty_cash_funds WHERE company_id = ? AND name = ?", Long.class, context.companyId(), name);
    }
    private int count(String table) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM " + table + " WHERE company_id = ?", Integer.class, context.companyId());
    }
}
