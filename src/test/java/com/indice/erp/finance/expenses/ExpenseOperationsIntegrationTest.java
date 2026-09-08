package com.indice.erp.finance.expenses;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.indice.erp.finance.FinanceApiException;
import com.indice.erp.finance.expenses.dto.*;
import com.indice.erp.finance.shared.FinanceContext;
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
class ExpenseOperationsIntegrationTest {
    @Autowired JdbcTemplate jdbc;
    @Autowired ExpenseImportService imports;
    @Autowired ExpenseService expenses;
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
            for (var table : List.of("finance_journal_entries", "finance_accounting_periods", "finance_expense_import_batches",
                    "finance_petty_cash_settlement_lines", "finance_petty_cash_statements", "finance_expense_payments",
                    "finance_expenses", "finance_petty_cash_funds", "finance_payment_accounts", "finance_accounting_accounts")) {
                jdbc.update("DELETE FROM " + table + " WHERE company_id = ?", company);
            }
            jdbc.update("DELETE FROM companies WHERE id = ?", company);
        }
        jdbc.update("DELETE FROM users WHERE id = ?", user);
    }

    @Test
    void thirtyFiveRowsSaveAtomicallyAndReplayWithoutDuplicatesOrMoneyMovement() {
        var rows = IntStream.range(0, 35).mapToObj(i -> row("Expense " + i, bank, account, "MXN")).toList();
        var request = new ImportExpensesRequest(UUID.randomUUID().toString(), rows);
        var first = imports.importExpenses(context, request);
        var replay = imports.importExpenses(context, request);
        assertThat(first.expenses()).hasSize(35);
        assertThat(replay.expenses()).extracting(ExpenseResponse::id).containsExactlyElementsOf(first.expenses().stream().map(ExpenseResponse::id).toList());
        assertThat(first.expenses()).extracting(ExpenseResponse::folio).doesNotHaveDuplicates();
        assertThat(first.expenses()).allSatisfy(expense -> {
            assertThat(expense.status()).isEqualTo(ExpenseStatus.DRAFT);
            assertThat(expense.paidAmount()).isEqualByComparingTo("0");
            assertThat(expense.balanceAmount()).isEqualByComparingTo("100.25");
            assertThat(expense.accountingAccountId()).isEqualTo(account);
            assertThat(expense.paymentAccountId()).isEqualTo(bank);
            assertThat(expense.currencyCode()).isEqualTo("MXN");
        });
        assertThat(count("finance_expenses")).isEqualTo(35);
        assertThat(count("finance_expense_payments")).isZero();
        assertThat(count("finance_expense_import_batches")).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT current_balance FROM finance_payment_accounts WHERE id = ?", BigDecimal.class, bank)).isEqualByComparingTo("5000");
        assertThatThrownBy(() -> imports.importExpenses(context, new ImportExpensesRequest(request.requestKey(), List.of(rows.getFirst()))))
            .isInstanceOf(FinanceApiException.class).hasMessageContaining("already saved");
        assertThat(count("finance_expenses")).isEqualTo(35);
    }

    @Test
    void invalidSecondRowRollsBackFirstAndKeepsRequestKeyAvailableForCorrection() {
        var foreign = accountingAccount(company("foreign-" + UUID.randomUUID()), "6000");
        var key = UUID.randomUUID().toString();
        assertThatThrownBy(() -> imports.importExpenses(context, new ImportExpensesRequest(key,
            List.of(row("Valid", bank, account, "MXN"), row("Foreign account", bank, foreign, "MXN")))))
            .isInstanceOf(FinanceApiException.class).hasMessageContaining("Row 2:");
        assertThat(count("finance_expenses")).isZero();
        assertThat(count("finance_expense_import_batches")).isZero();
        assertThat(imports.importExpenses(context, new ImportExpensesRequest(key, List.of(row("Corrected", bank, account, "MXN")))).expenses()).hasSize(1);
    }

    @Test
    void mismatchedCurrencyAndFundPaymentAccountsAreRejectedWithoutChangingBalances() {
        var usd = paymentAccount(context.companyId(), "USD Bank", "USD", "BANK");
        var fundAccount = paymentAccount(context.companyId(), "Fund", "MXN", "PETTY_CASH");
        for (long invalid : List.of(usd, fundAccount)) {
            assertThatThrownBy(() -> imports.importExpenses(context, new ImportExpensesRequest(UUID.randomUUID().toString(),
                List.of(row("Wrong payment account", invalid, account, "MXN")))))
                .isInstanceOf(FinanceApiException.class).hasMessageContaining("paymentAccountId");
        }
        assertThat(count("finance_expenses")).isZero();
        var saved = imports.importExpenses(context, new ImportExpensesRequest(UUID.randomUUID().toString(),
            List.of(row("USD expense", usd, account, "USD")))).expenses().getFirst();
        assertThat(saved.currencyCode()).isEqualTo("USD");
        assertThat(saved.totalAmount()).isEqualByComparingTo("100.25");
    }

    @Test
    void concurrentCreationAssignsUniqueFolios() throws Exception {
        try (var executor = Executors.newFixedThreadPool(8)) {
            var jobs = IntStream.range(0, 35).mapToObj(i -> executor.submit(() -> expenses.createDraft(context,
                row("Concurrent " + i, null, account, "MXN")))).toList();
            var folios = new ArrayList<String>();
            for (var job : jobs) folios.add(job.get(45, TimeUnit.SECONDS).folio());
            assertThat(folios).hasSize(35).doesNotHaveDuplicates();
        }
        assertThat(count("finance_expenses")).isEqualTo(35);
    }

    @Test
    void paidExpenseCanBeReclassifiedWithoutChangingPaymentEvidenceAndRejectsStaleOrForeignUpdates() {
        var expense = expenses.createDraft(context, row("Paid", bank, account, "MXN"));
        jdbc.update("UPDATE finance_expenses SET status = 'PAID', payment_status = 'PAID', paid_amount = total_amount, balance_amount = 0, payment_date = '2026-09-08' WHERE id = ?", expense.id());
        payments.insert(context, expense.id(), bank, expense.totalAmount(), "MXN", LocalDate.of(2026, 9, 8),
            ExpensePaymentRepository.SOURCE_RECORDED, "test-existing-payment");
        var paymentEvidence = jdbc.queryForMap("SELECT * FROM finance_expense_payments WHERE company_id = ? AND expense_id = ?", context.companyId(), expense.id());
        var nextAccount = accountingAccount(context.companyId(), "6010");
        var changed = classification.update(context, expense.id(), new UpdateExpenseAccountingAccountRequest(nextAccount, expense.version()));
        assertThat(changed.accountingAccountId()).isEqualTo(nextAccount);
        assertThat(changed.status()).isEqualTo(ExpenseStatus.PAID);
        assertThat(changed.totalAmount()).isEqualByComparingTo(expense.totalAmount());
        assertThat(changed.paidAmount()).isEqualByComparingTo(expense.totalAmount());
        assertThat(changed.balanceAmount()).isEqualByComparingTo("0");
        assertThat(changed.paymentAccountId()).isEqualTo(bank);
        assertThat(changed.paymentDate()).isEqualTo(LocalDate.of(2026, 9, 8));
        assertThat(changed.metadata().path("accountingClassificationChanges").size()).isEqualTo(1);
        assertThat(changed.version()).isEqualTo(expense.version() + 1);
        assertThatThrownBy(() -> classification.update(context, expense.id(), new UpdateExpenseAccountingAccountRequest(account, expense.version())))
            .isInstanceOf(FinanceApiException.class).hasMessageContaining("changed");
        var foreign = accountingAccount(company("foreign-" + UUID.randomUUID()), "6000");
        assertThatThrownBy(() -> classification.update(context, expense.id(), new UpdateExpenseAccountingAccountRequest(foreign, changed.version())))
            .isInstanceOf(FinanceApiException.class).hasMessageContaining("invalid");
        var outside = new FinanceContext(user, context.companyId(), "Test", "admin", true, FinanceScope.businessOffice(null, Long.MAX_VALUE));
        assertThatThrownBy(() -> classification.update(outside, expense.id(), new UpdateExpenseAccountingAccountRequest(account, changed.version())))
            .isInstanceOf(FinanceApiException.class).hasMessageContaining("not found");
        assertThat(count("finance_expense_payments")).isEqualTo(1);
        assertThat(jdbc.queryForMap("SELECT * FROM finance_expense_payments WHERE company_id = ? AND expense_id = ?", context.companyId(), expense.id()))
            .isEqualTo(paymentEvidence);
        assertThat(jdbc.queryForObject("SELECT current_balance FROM finance_payment_accounts WHERE id = ?", BigDecimal.class, bank))
            .isEqualByComparingTo("5000");
    }

    @Test
    void fundOriginUsesServerRelationshipsAndExternalFundExpensesAreExcludedWithoutDeletingThem() {
        var internalExpense = expenses.createDraft(context, row("Internal", null, account, "MXN"));
        var externalExpense = expenses.createDraft(context, row("External", null, account, "MXN"));
        long internalAccount = paymentAccount(context.companyId(), "Internal fund account", "MXN", "PETTY_CASH");
        long externalAccount = paymentAccount(context.companyId(), "External fund account", "MXN", "PETTY_CASH");
        long internal = fund("Operations fund", "INTERNAL_COMPANY", internalAccount);
        fund("Client fund", "EXTERNAL_MANAGED", externalAccount);
        jdbc.update("UPDATE finance_expenses SET payment_account_id = ?, audit_status = 'PETTY_CASH' WHERE id = ?", internalAccount, internalExpense.id());
        jdbc.update("UPDATE finance_expenses SET payment_account_id = ?, audit_status = 'PETTY_CASH' WHERE id = ?", externalAccount, externalExpense.id());
        var visible = expenses.list(context).expenses();
        assertThat(visible).hasSize(1);
        assertThat(visible.getFirst().originFund().id()).isEqualTo(internal);
        assertThat(visible.getFirst().originFund().name()).isEqualTo("Operations fund");
        assertThatThrownBy(() -> expenses.get(context, externalExpense.id())).isInstanceOf(java.util.NoSuchElementException.class);
        assertThatThrownBy(() -> classification.update(context, internalExpense.id(), new UpdateExpenseAccountingAccountRequest(null, internalExpense.version())))
            .isInstanceOf(FinanceApiException.class).hasMessageContaining("source fund");
        assertThat(count("finance_expenses")).isEqualTo(2);
    }

    @ParameterizedTest
    @ValueSource(strings = {"BANK", "CASH", "CREDIT_CARD"})
    void sharedLegacyPaymentAccountsDoNotAttributeOrdinaryExpensesToFunds(String type) {
        long sharedAccount = paymentAccount(context.companyId(), "Legacy " + type, "MXN", type);
        var expense = expenses.createDraft(context, row("Ordinary expense", sharedAccount, account, "MXN"));
        fund("Legacy external fund", "EXTERNAL_MANAGED", sharedAccount);
        fund("Legacy internal fund", "INTERNAL_COMPANY", sharedAccount);

        assertThat(expenses.list(context).expenses()).extracting(ExpenseResponse::id).containsExactly(expense.id());
        assertThat(expenses.get(context, expense.id()).originFund()).isNull();
        long nextAccount = accountingAccount(context.companyId(), "6010");
        var changed = classification.update(context, expense.id(), new UpdateExpenseAccountingAccountRequest(nextAccount, expense.version()));
        assertThat(changed.accountingAccountId()).isEqualTo(nextAccount);
        assertThat(changed.totalAmount()).isEqualByComparingTo(expense.totalAmount());
        assertThat(changed.paymentAccountId()).isEqualTo(sharedAccount);
        var imported = imports.importExpenses(context, new ImportExpensesRequest(UUID.randomUUID().toString(),
            List.of(row("Imported expense", sharedAccount, account, "MXN")))).expenses().getFirst();
        assertThat(imported.originFund()).isNull();
        assertThat(imported.paymentAccountId()).isEqualTo(sharedAccount);
        assertThat(imported.paidAmount()).isEqualByComparingTo("0");
        assertThat(expenses.list(context).expenses()).hasSize(2);
        assertThat(count("finance_expense_payments")).isZero();
        assertThat(jdbc.queryForObject("SELECT current_balance FROM finance_payment_accounts WHERE id = ?", BigDecimal.class, sharedAccount))
            .isEqualByComparingTo("5000");
    }

    @Test
    void ambiguousCustodyAccountDoesNotChooseAnArbitraryFund() {
        var expense = expenses.createDraft(context, row("Legacy receipt", null, account, "MXN"));
        long custody = paymentAccount(context.companyId(), "Shared custody", "MXN", "PETTY_CASH");
        fund("First fund", "EXTERNAL_MANAGED", custody);
        fund("Second fund", "INTERNAL_COMPANY", custody);
        jdbc.update("UPDATE finance_expenses SET payment_account_id = ?, audit_status = 'PETTY_CASH' WHERE id = ?", custody, expense.id());
        assertThat(expenses.get(context, expense.id()).originFund()).isNull();
        assertThatThrownBy(() -> classification.update(context, expense.id(), new UpdateExpenseAccountingAccountRequest(null, expense.version())))
            .isInstanceOf(FinanceApiException.class).hasMessageContaining("source fund");
        assertThat(count("finance_expenses")).isEqualTo(1);
    }

    @Test
    void settlementIdentifiesTheActualFundEvenWithSharedLegacyBankAccounts() {
        var expense = expenses.createDraft(context, row("Authorized receipt", bank, account, "MXN"));
        fund("Unrelated external fund", "EXTERNAL_MANAGED", bank);
        long actualFund = fund("Actual internal fund", "INTERNAL_COMPANY", bank);
        jdbc.update("""
            INSERT INTO finance_petty_cash_statements
                (company_id, petty_cash_fund_id, folio, period_key, period_start, period_end, cut_off_date,
                 currency_code, status, fund_type_snapshot, estimated_usage_amount)
            VALUES (?, ?, 'LEGACY-TEST', '2026-09', '2026-09-01', '2026-09-30', '2026-09-30',
                    'MXN', 'CUT_PENDING', 'INTERNAL_COMPANY', 100.25)
            """, context.companyId(), actualFund);
        long statement = jdbc.queryForObject("SELECT id FROM finance_petty_cash_statements WHERE company_id = ?", Long.class, context.companyId());
        jdbc.update("""
            INSERT INTO finance_petty_cash_settlement_lines
                (company_id, petty_cash_fund_id, petty_cash_statement_id, description, subtotal_amount, tax_amount,
                 total_amount, currency_code, expense_date, attachment_count, status, expense_id)
            VALUES (?, ?, ?, 'Authorized receipt', 100.25, 0, 100.25, 'MXN', '2026-09-08', 1, 'RECEIPT_ATTACHED', ?)
            """, context.companyId(), actualFund, statement, expense.id());
        assertThat(expenses.get(context, expense.id()).originFund().id()).isEqualTo(actualFund);
        assertThat(expenses.list(context).expenses()).hasSize(1);
        assertThatThrownBy(() -> classification.update(context, expense.id(), new UpdateExpenseAccountingAccountRequest(null, expense.version())))
            .isInstanceOf(FinanceApiException.class).hasMessageContaining("source fund");
    }

    @Test
    void postedJournalBlocksReclassification() {
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
        assertThatThrownBy(() -> classification.update(context, expense.id(), new UpdateExpenseAccountingAccountRequest(null, expense.version())))
            .isInstanceOf(FinanceApiException.class).hasMessageContaining("posted journal");
    }

    @Test
    void bulkEditRollsBackAllRowsOnStaleVersionAndPreservesClassificationAudit() {
        var first = expenses.createDraft(context, row("First", bank, account, "MXN"));
        var second = expenses.createDraft(context, row("Second", bank, account, "MXN"));
        assertThatThrownBy(() -> imports.updateExpenses(context, new UpdateExpensesBatchRequest(List.of(
            new UpdateExpensesBatchRequest.Row(first.id(), first.version(), update("Updated first")),
            new UpdateExpensesBatchRequest.Row(second.id(), second.version() + 1, update("Updated second"))))))
            .isInstanceOf(FinanceApiException.class).hasMessageContaining("Row 2:");
        assertThat(expenses.get(context, first.id()).concept()).isEqualTo("First");
        var classified = classification.update(context, first.id(), new UpdateExpenseAccountingAccountRequest(null, first.version()));
        var saved = imports.updateExpenses(context, new UpdateExpensesBatchRequest(List.of(
            new UpdateExpensesBatchRequest.Row(first.id(), classified.version(), update("Updated first"))))).expenses().getFirst();
        assertThat(saved.concept()).isEqualTo("Updated first");
        assertThat(saved.metadata().path("accountingClassificationChanges").size()).isEqualTo(1);
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
