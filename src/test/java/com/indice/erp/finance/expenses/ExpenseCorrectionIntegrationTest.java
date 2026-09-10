package com.indice.erp.finance.expenses;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.indice.erp.finance.FinanceApiException;
import com.indice.erp.finance.expenses.dto.*;
import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.shared.FinanceBusinessTimeZoneResolver;
import com.indice.erp.finance.shared.FinanceScope;
import com.indice.erp.finance.status.ExpenseStatus;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.stream.IntStream;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

/** Committed fixtures let these tests observe real transaction rollback and retry behavior. */
@SpringBootTest
class ExpenseCorrectionIntegrationTest {
    @Autowired JdbcTemplate jdbc;
    @Autowired ExpenseImportService imports;
    @Autowired ExpenseCorrectionService corrections;
    @Autowired FinanceBusinessTimeZoneResolver timeZones;
    @Autowired ExpenseService expenses;
    @Autowired ExpenseBulkStatusService bulkStatus;
    @Autowired ExpensePaymentRepository payments;
    @Autowired ExpenseAccountingClassificationService classification;
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
            for (var table : List.of("finance_payment_account_movements", "finance_journal_entries", "finance_accounting_periods", "finance_expense_import_batches",
                    "finance_petty_cash_settlement_lines", "finance_petty_cash_statements", "finance_expense_payments",
                    "finance_expenses", "finance_petty_cash_funds", "finance_payment_accounts", "finance_accounting_accounts")) {
                jdbc.update("DELETE FROM " + table + " WHERE company_id = ?", company);
            }
            jdbc.update("DELETE FROM companies WHERE id = ?", company);
        }
        jdbc.update("DELETE FROM users WHERE id = ?", user);
    }

    @ParameterizedTest
    @ValueSource(strings = {"MXN", "USD", "CAD", "COP", "BRL"})
    void correctionPreservesPaymentHistoryCurrencyAndTreasury(String currency) {
        var saved = imports.importExpenses(context, new ImportExpensesRequest(UUID.randomUUID().toString(),
            List.of(importRow("Paid in August", null, currency, true, false, "0")))).expenses().getFirst();
        var evidence = jdbc.queryForList("SELECT * FROM finance_expense_payments WHERE expense_id = ?", saved.id());
        var changed = corrections.correct(context, saved.id(), correction(saved, "Corrected text", "116", currency, null));
        assertThat(changed.status()).isEqualTo(ExpenseStatus.PAID);
        assertThat(changed.paymentDate()).isEqualTo(LocalDate.of(2026, 8, 15));
        assertThat(changed.expenseDate()).isEqualTo(LocalDate.of(2026, 8, 15));
        assertThat(changed.balanceAmount()).isEqualByComparingTo("0");
        var increase = corrections.correct(context, saved.id(), correction(changed, "Corrected amount", "150", currency, null));
        assertThat(increase.status()).isEqualTo(ExpenseStatus.PARTIALLY_PAID);
        assertThat(increase.paidAmount()).isEqualByComparingTo("116");
        assertThat(increase.balanceAmount()).isEqualByComparingTo("34");
        assertThat(increase.metadata().path("corrections")).hasSize(2);
        assertThat(increase.metadata().path("corrections").get(1).path("before").has("metadata")).isFalse();
        assertThat(jdbc.queryForList("SELECT * FROM finance_expense_payments WHERE expense_id = ?", saved.id())).isEqualTo(evidence);
        assertThat(count("finance_payment_account_movements")).isZero();
        assertThatThrownBy(() -> corrections.correct(context, saved.id(), correction(increase, "Too low", "100", currency, null)))
            .isInstanceOf(FinanceApiException.class).hasMessageContaining("below payments");
        assertThatThrownBy(() -> corrections.correct(context, saved.id(), correction(increase, "Wrong currency", "150", currency.equals("USD") ? "MXN" : "USD", null)))
            .isInstanceOf(FinanceApiException.class).hasMessageContaining("original currency");
    }

    @Test
    void approvedUnpaidExpenseCanCorrectItsAmountAndRejectStaleAndForeignWrites() {
        var saved = expenses.createDraft(context, row("Misspelled", bank, account, "MXN"));
        expenses.submitForApproval(context, saved.id());
        saved = expenses.approve(context, saved.id());
        var request = correction(saved, "Corrected", "80.25", "MXN", bank);
        var changed = corrections.correct(context, saved.id(), request);
        assertThat(changed.status()).isEqualTo(ExpenseStatus.APPROVED);
        assertThat(changed.balanceAmount()).isEqualByComparingTo("80.25");
        assertThat(changed.paidAmount()).isEqualByComparingTo("0");
        assertThatThrownBy(() -> corrections.correct(context, changed.id(), request)).hasMessageContaining("changed");
        var foreignContext = new FinanceContext(user, company("other-" + UUID.randomUUID()), "Other", "admin", true, FinanceScope.corporateOffice());
        assertThatThrownBy(() -> corrections.correct(foreignContext, changed.id(), correction(changed, "Foreign", "80.25", "MXN", bank)))
            .hasMessageContaining("not found");
        assertThat(count("finance_expense_payments")).isZero();
    }

    @Test
    void correctingPaidBankExpenseDoesNotRedebitAndBatchFailureRollsBack() {
        var saved = imports.importExpenses(context, new ImportExpensesRequest(UUID.randomUUID().toString(),
            List.of(importRow("Paid", bank, "MXN", true, false, "0")))).expenses().getFirst();
        var changed = corrections.correct(context, saved.id(), correction(saved, "Corrected", "116", "MXN", bank));
        assertThat(jdbc.queryForObject("SELECT current_balance FROM finance_payment_accounts WHERE id = ?", BigDecimal.class, bank)).isEqualByComparingTo("4884");
        assertThat(count("finance_payment_account_movements")).isEqualTo(1);
        var other = expenses.createDraft(context, row("Other", bank, account, "MXN"));
        var batch = new UpdateExpensesBatchRequest(List.of(
            new UpdateExpensesBatchRequest.Row(changed.id(), changed.version(), correction(changed, "Uncommitted", "120", "MXN", bank).expense()),
            new UpdateExpensesBatchRequest.Row(other.id(), other.version() + 1, correction(other, "Stale", "100", "MXN", bank).expense())));
        assertThatThrownBy(() -> imports.updateExpenses(context, batch)).hasMessageContaining("Row 2:");
        assertThat(expenses.get(context, changed.id()).concept()).isEqualTo("Corrected");
        assertThat(expenses.get(context, changed.id()).version()).isEqualTo(changed.version());
    }

    @Test
    void payingDraftIsAtomicAndSafeToRetryEvenWithNegativeBankBalance() {
        var saved = expenses.createDraft(context, row("Needs payment", bank, account, "MXN"));
        var wrongCurrency = paymentAccount(context.companyId(), "USD", "USD", "BANK");
        assertThatThrownBy(() -> expenses.recordPayment(context, saved.id(), new RecordExpensePaymentRequest(new BigDecimal("100.25"), wrongCurrency, businessToday(), "failed")))
            .isInstanceOf(FinanceApiException.class);
        assertThat(expenses.get(context, saved.id()).status()).isEqualTo(ExpenseStatus.DRAFT);
        jdbc.update("UPDATE finance_payment_accounts SET current_balance = -100 WHERE id = ?", bank);
        var request = new RecordExpensePaymentRequest(new BigDecimal("100.25"), bank, businessToday(), "same-attempt");
        var paid = expenses.recordPayment(context, saved.id(), request);
        var retried = expenses.recordPayment(context, saved.id(), request);
        assertThat(paid.status()).isEqualTo(ExpenseStatus.PAID);
        assertThat(retried.version()).isEqualTo(paid.version());
        assertThat(count("finance_expense_payments")).isEqualTo(1);
        assertThat(count("finance_payment_account_movements")).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT current_balance FROM finance_payment_accounts WHERE id = ?", BigDecimal.class, bank)).isEqualByComparingTo("-200.25");
    }

    @ParameterizedTest
    @ValueSource(strings = {"CLOSED", "CANCELLED", "REJECTED"})
    void terminalExpenseCannotBeReopenedThroughCorrection(String status) {
        var saved = expenses.createDraft(context, row("Protected", bank, account, "MXN"));
        jdbc.update("UPDATE finance_expenses SET status = ? WHERE id = ?", status, saved.id());
        assertThatThrownBy(() -> corrections.correct(context, saved.id(), correction(saved, "Changed", "100", "MXN", bank)))
            .hasMessageContaining("source correction");
    }

    @Test
    void postedJournalBlocksAmountCorrections() {
        var expense = expenses.createDraft(context, row("Posted", bank, account, "MXN"));
        jdbc.update("""
            INSERT INTO finance_accounting_periods (company_id, period_key, period_start, period_end, framework_snapshot, functional_currency_snapshot)
            VALUES (?, '2026-09', '2026-09-01', '2026-09-30', 'IFRS_SMES_2015', 'MXN')
            """, context.companyId());
        long period = jdbc.queryForObject("SELECT id FROM finance_accounting_periods WHERE company_id = ?", Long.class, context.companyId());
        jdbc.update("""
            INSERT INTO finance_journal_entries (company_id, period_id, entry_number, entry_date, journal_type, status, description,
                source_module, source_type, source_id, source_event_key, source_fingerprint, currency_code)
            VALUES (?, ?, 'TEST-1', '2026-09-08', 'EXPENSE', 'POSTED', 'Test', 'expenses', 'EXPENSE', ?, ?, ?, 'MXN')
            """, context.companyId(), period, String.valueOf(expense.id()), "EXPENSE:" + expense.id(), "0".repeat(64));
        assertThat(expenses.get(context, expense.id()).accountingPosted()).isTrue();
        assertThatThrownBy(() -> corrections.correct(context, expense.id(), correction(expense, "Blocked", "200", "MXN", bank)))
            .isInstanceOf(FinanceApiException.class).hasMessageContaining("posted journal");
    }

    @Test
    void internalFundExpenseCannotBypassItsOwnerWithCorrections() {
        var expense = expenses.createDraft(context, row("Fund source", null, account, "MXN"));
        long custody = paymentAccount(context.companyId(), "Custody", "MXN", "PETTY_CASH");
        fund("Internal", "INTERNAL_COMPANY", custody);
        jdbc.update("UPDATE finance_expenses SET payment_account_id = ?, audit_status = 'PETTY_CASH' WHERE id = ?", custody, expense.id());
        assertThatThrownBy(() -> corrections.correct(context, expense.id(), correction(expense, "Blocked", "200", "MXN", custody)))
            .hasMessageContaining("source fund");
    }

    private CorrectExpenseRequest correction(ExpenseResponse row, String concept, String amount, String currency, Long paymentAccount) {
        var total = new BigDecimal(amount);
        var fields = com.fasterxml.jackson.databind.node.JsonNodeFactory.instance.objectNode().put("amountPaid", 999999).put("legacyStatus", "paid");
        return new CorrectExpenseRequest(row.version(), new UpdateExpenseRequest(row.unitId(), row.businessId(), row.providerId(), row.budgetLineId(),
            row.accountingAccountId(), paymentAccount, row.purchaseOrderId(), row.folio(), concept, concept, row.expenseType(),
            total, BigDecimal.ZERO, total, currency, row.expenseDate(), row.dueDate(), null, null, null, fields, null));
    }

    private LocalDate businessToday() {
        return LocalDate.now(timeZones.resolve(context.companyId()));
    }

    private ExpenseBulkStatusRequest statusRequest(ExpenseBulkStatusRequest.Target target, Long payment, LocalDate date, ExpenseResponse... rows) {
        return new ExpenseBulkStatusRequest(target, java.util.Arrays.stream(rows)
            .map(row -> new ExpenseBulkActionRequest.Selection(row.id(), row.version())).toList(), payment, date, UUID.randomUUID().toString());
    }

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
    private UpdateExpenseRequest update(String concept) {
        return new UpdateExpenseRequest(null, null, null, null, account, bank, null, "UPDATED", concept, concept,
            ExpenseType.VARIABLE, new BigDecimal("200"), BigDecimal.ZERO, new BigDecimal("200"), "MXN",
            LocalDate.of(2026, 9, 8), LocalDate.of(2026, 9, 30), null, null, null, null, null);
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
