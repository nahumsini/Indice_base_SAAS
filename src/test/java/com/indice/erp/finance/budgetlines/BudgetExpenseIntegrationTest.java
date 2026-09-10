package com.indice.erp.finance.budgetlines;

import static org.assertj.core.api.Assertions.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.finance.expenses.ExpenseService;
import com.indice.erp.finance.expenses.ExpenseType;
import com.indice.erp.finance.expenses.dto.CreateExpenseRequest;
import com.indice.erp.finance.expenses.dto.RecordExpensePaymentRequest;
import com.indice.erp.finance.expenses.dto.SettleExpensePaymentRequest;
import com.indice.erp.finance.shared.FinanceBusinessTimeZoneResolver;
import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.shared.FinanceScope;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import java.util.concurrent.*;
import java.util.stream.IntStream;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/** Committed, company-isolated fixtures exercise real locks, rollback, Flyway and replay. */
@SpringBootTest
class BudgetExpenseIntegrationTest {
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper json;
    @Autowired BudgetExpenseSynchronizationService synchronization;
    @Autowired BudgetExpenseMaterializer materializer;
    @Autowired BudgetExpenseOccurrenceRepository occurrences;
    @Autowired ExpenseService expenses;
    @Autowired FinanceBusinessTimeZoneResolver zones;
    @Autowired PlatformTransactionManager transactions;
    private FinanceContext context;
    private LocalDate today;
    private final List<Long> companies = new ArrayList<>();
    private long user;

    @BeforeEach void setup() {
        long company = company();
        var key = UUID.randomUUID() + "@example.test";
        jdbc.update("INSERT INTO users(email,password_hash) VALUES (?,'isolated-no-login')", key);
        user = jdbc.queryForObject("SELECT id FROM users WHERE email=?", Long.class, key);
        context = new FinanceContext(user, company, "Test", "admin", true, FinanceScope.corporateOffice());
        today = LocalDate.now(zones.resolve(company));
    }

    @AfterEach void cleanup() {
        for (long company : companies) {
            for (var table : List.of("finance_budget_expense_occurrences", "finance_payment_account_movements",
                    "finance_expense_payments", "finance_expenses", "finance_budget_lines", "finance_budgets",
                    "finance_payment_accounts", "finance_accounting_accounts", "finance_providers", "businesses", "units", "company_settings"))
                jdbc.update("DELETE FROM " + table + " WHERE company_id=?", company);
            jdbc.update("DELETE FROM companies WHERE id=?", company);
        }
        jdbc.update("DELETE FROM users WHERE id=?", user);
    }

    @ParameterizedTest @ValueSource(strings={"MXN","USD","CAD","COP","BRL"})
    void currentMonthGeneratesUnpaidNativeAmountWithoutPaymentOrBudgetConsumption(String currency) {
        long line = line(context.companyId(), today.withDayOfMonth(today.lengthOfMonth()), currency, "Rent");
        assertThat(synchronization.synchronize(context).generated()).isEqualTo(1);
        var expense = expenses.list(context).expenses().getFirst();
        assertThat(expense.budgetLineId()).isEqualTo(line);
        assertThat(expense.currencyCode()).isEqualTo(currency);
        assertThat(expense.folio()).startsWith("CXP-");
        assertThat(expense.totalAmount()).isEqualByComparingTo("116.00");
        assertThat(expense.subtotalAmount()).isEqualByComparingTo("100.00");
        assertThat(expense.taxAmount()).isEqualByComparingTo("16.00");
        assertThat(expense.balanceAmount()).isEqualByComparingTo("116.00");
        assertThat(expense.paidAmount()).isZero();
        assertThat(expense.paymentDate()).isNull();
        assertThat(expense.paymentAccountId()).isNull();
        assertThat(expense.paymentStatus().name()).isEqualTo("UNPAID");
        assertThat(expense.customFields().path("entryType").asText()).isEqualTo("payable");
        assertThat(synchronization.synchronize(context).generated()).isZero();
        assertThat(count("finance_expenses")).isEqualTo(1);
        assertThat(count("finance_expense_payments")).isZero();
        assertThat(count("finance_payment_account_movements")).isZero();
        assertThat(jdbc.queryForObject("SELECT actual_expense_amount FROM finance_budget_lines WHERE company_id=? AND id=?",
            BigDecimal.class, context.companyId(), line)).isZero();
    }

    @Test void dueDayIsPendingThenOverdueAndFinalPaymentPreservesPriorInstallment() {
        long dueToday = line(context.companyId(), today, "MXN", "Today");
        long overdue = line(context.companyId(), today.minusDays(1), "MXN", "Yesterday");
        synchronization.synchronize(context);
        assertThat(expenses.get(context, expenseId(dueToday)).paymentStatus().name()).isEqualTo("UNPAID");
        var id = expenseId(overdue);
        assertThat(expenses.get(context, id).paymentStatus().name()).isEqualTo("OVERDUE");
        var bank = bank();
        expenses.recordPayment(context, id, new RecordExpensePaymentRequest(new BigDecimal("40.00"), bank, today, "partial-test"));
        var prior = jdbc.queryForMap("SELECT * FROM finance_expense_payments WHERE company_id=? AND expense_id=?", context.companyId(), id);
        var paid = expenses.settlePayment(context, id, new SettleExpensePaymentRequest(null, null, "final-test"));
        assertThat(paid.paidAmount()).isEqualByComparingTo("116.00");
        assertThat(paid.balanceAmount()).isZero();
        assertThat(paid.paymentDate()).isEqualTo(today);
        assertThat(paid.expenseDate()).isEqualTo(today.minusDays(1));
        assertThat(paid.paymentStatus().name()).isEqualTo("PAID");
        assertThat(jdbc.queryForMap("SELECT * FROM finance_expense_payments WHERE company_id=? AND id=?", context.companyId(), prior.get("id"))).isEqualTo(prior);
        synchronization.synchronize(context);
        expenses.settlePayment(context, id, new SettleExpensePaymentRequest(null, null, "final-test"));
        assertThat(count("finance_expense_payments")).isEqualTo(2);
        assertThat(jdbc.queryForObject("SELECT actual_expense_amount FROM finance_budget_lines WHERE id=? AND company_id=?",
            BigDecimal.class, overdue, context.companyId())).isEqualByComparingTo("116.00");
    }

    @Test void monthAndYearRolloverGeneratesOnlyDueOccurrencesAndNeverRecreatesDeletedExpense() {
        var december = LocalDate.of(today.getYear() + 1, 12, 31);
        long first = line(context.companyId(), december, "MXN", "December");
        long second = line(context.companyId(), december.plusMonths(1), "MXN", "January");
        assertThat(at(first, december.withDayOfMonth(1))).isTrue();
        assertThat(at(second, december)).isFalse();
        var original = jdbc.queryForMap("SELECT * FROM finance_expenses WHERE company_id=? AND id=?", context.companyId(), expenseId(first));
        assertThat(at(second, december.plusDays(1))).isTrue();
        assertThat(at(first, december.plusDays(1))).isFalse();
        assertThat(jdbc.queryForMap("SELECT * FROM finance_expenses WHERE company_id=? AND id=?", context.companyId(), expenseId(first))).isEqualTo(original);
        expenses.deleteDraft(context, expenseId(second));
        assertThat(at(second, december.plusMonths(2))).isFalse();
        assertThat(count("finance_expenses")).isEqualTo(2);
    }

    @Test void concurrentWorkersCreateOneExpenseAndOneOccurrence() throws Exception {
        long line = line(context.companyId(), today, "MXN", "Concurrent");
        try (var executor = Executors.newFixedThreadPool(6)) {
            var jobs = IntStream.range(0, 12).mapToObj(i -> executor.submit(() -> materializer.materialize(context, line))).toList();
            int generated = 0;
            for (var job : jobs) if (job.get(45, TimeUnit.SECONDS)) generated++;
            assertThat(generated).isEqualTo(1);
        }
        assertThat(count("finance_expenses")).isEqualTo(1);
        assertThat(count("finance_budget_expense_occurrences")).isEqualTo(1);
    }

    @Test void existingLinkedPaymentAndLegacyActivityAreNotRegeneratedOrRewritten() {
        long linked = line(context.companyId(), today, "MXN", "Linked");
        var saved = expenses.createDraft(context, request(linked, "Linked", today));
        var paid = expenses.settlePayment(context, saved.id(), new SettleExpensePaymentRequest(null, null, "legacy-paid"));
        var before = jdbc.queryForMap("SELECT * FROM finance_expenses WHERE company_id=? AND id=?", context.companyId(), paid.id());
        long activity = line(context.companyId(), today, "MXN", "Legacy");
        jdbc.update("UPDATE finance_budget_lines SET custom_fields_json=JSON_SET(custom_fields_json,'$.amountPaid',50) WHERE company_id=? AND id=?", context.companyId(), activity);
        var result = synchronization.synchronize(context);
        assertThat(result.generated()).isZero();
        assertThat(result.reviews()).extracting(BudgetExpenseSyncResult.Review::reason).contains("EXISTING_FINANCIAL_ACTIVITY");
        assertThat(jdbc.queryForMap("SELECT * FROM finance_expenses WHERE company_id=? AND id=?", context.companyId(), paid.id())).isEqualTo(before);
        assertThat(count("finance_expense_payments")).isEqualTo(1);
    }

    @Test void rolloutFlagsHistoricalAndPossiblyManualRowsWithoutManufacturingDebt() {
        var previous = today.withDayOfMonth(1).minusMonths(1);
        long historical = line(context.companyId(), previous, "MXN", "Historical");
        jdbc.update("UPDATE finance_budget_lines SET created_at='2000-01-01 00:00:00' WHERE company_id=? AND id=?", context.companyId(), historical);
        long manual = line(context.companyId(), today, "MXN", "Manual");
        expenses.createDraft(context, request(null, "Manual", today));
        var result = synchronization.synchronize(context);
        assertThat(result.generated()).isZero();
        assertThat(result.reviews()).extracting(BudgetExpenseSyncResult.Review::reason)
            .contains("HISTORICAL_RECONCILIATION", "POSSIBLE_MANUAL_EXPENSE");
        assertThat(count("finance_expenses")).isEqualTo(1);
        assertThat(expenseIdOrNull(manual)).isNull();
    }

    @Test void failureRollsBackWholeOccurrenceAndOtherLinesStillGenerate() {
        long invalid = line(context.companyId(), today, "MXN", "Invalid");
        jdbc.update("UPDATE finance_budget_lines SET custom_fields_json=JSON_SET(custom_fields_json,'$.providerId',999999999) WHERE company_id=? AND id=?", context.companyId(), invalid);
        long good = line(context.companyId(), today, "MXN", "Good");
        var result = synchronization.synchronize(context);
        assertThat(result.generated()).isEqualTo(1);
        assertThat(result.reviews()).extracting(BudgetExpenseSyncResult.Review::reason).contains("INVALID_REFERENCE");
        assertThat(expenseIdOrNull(invalid)).isNull();
        assertThat(expenseId(good)).isPositive();
        jdbc.update("UPDATE finance_budget_lines SET custom_fields_json=JSON_REMOVE(custom_fields_json,'$.providerId'),version=version+1 WHERE company_id=? AND id=?", context.companyId(), invalid);
        assertThat(synchronization.synchronize(context).generated()).isEqualTo(1);
        assertThat(count("finance_expenses")).isEqualTo(2);
    }

    @Test void foreignTenantAndUnitReferencesFailClosed() {
        long foreign = line(company(), today, "MXN", "Foreign");
        assertThatThrownBy(() -> materializer.materialize(context, foreign)).hasMessageContaining("not found");
        long mine = line(context.companyId(), today, "MXN", "Mine");
        var narrow = new FinanceContext(user, context.companyId(), "Test", "user", true, FinanceScope.unitHeadquarters(Long.MAX_VALUE));
        assertThat(synchronization.synchronize(narrow).generated()).isZero();
        assertThatThrownBy(() -> materializer.materialize(narrow, mine)).hasMessageContaining("not found");
        assertThat(count("finance_expenses")).isZero();
    }

    @Test void accountingLabelResolvesWithinCompanyAndClosedOrUnscheduledLinesAreExcluded() {
        jdbc.update("INSERT INTO finance_accounting_accounts(company_id,code,name,group_key,status) VALUES (?,'6000','Rent','EXPENSE','ACTIVE')", context.companyId());
        long line = line(context.companyId(), today, "MXN", "Account");
        jdbc.update("UPDATE finance_budget_lines SET custom_fields_json=JSON_SET(custom_fields_json,'$.accountingAccount','6000 - Rent') WHERE company_id=? AND id=?", context.companyId(), line);
        long closed = line(context.companyId(), today, "MXN", "Closed");
        jdbc.update("UPDATE finance_budget_lines SET status='CLOSED' WHERE company_id=? AND id=?", context.companyId(), closed);
        long invalid = line(context.companyId(), today, "MXN", "Missing date");
        jdbc.update("UPDATE finance_budget_lines SET custom_fields_json=JSON_REMOVE(custom_fields_json,'$.dueDate') WHERE company_id=? AND id=?", context.companyId(), invalid);
        assertThat(synchronization.synchronize(context).generated()).isEqualTo(1);
        assertThat(expenses.get(context, expenseId(line)).accountingAccountId()).isNotNull();
        assertThat(expenseIdOrNull(closed)).isNull();
        assertThat(expenseIdOrNull(invalid)).isNull();
    }

    @Test void aFailureAfterExpenseInsertRollsBackExpenseAndAllowsRetry() {
        long line = line(context.companyId(), today, "MXN", "Rollback");
        assertThatThrownBy(() -> new TransactionTemplate(transactions).execute(status -> {
            assertThat(materializer.materializeAt(context, line, today)).isTrue();
            throw new IllegalStateException("simulate connection failure before commit");
        })).hasMessageContaining("simulate");
        assertThat(count("finance_expenses")).isZero();
        assertThat(count("finance_budget_expense_occurrences")).isZero();
        assertThat(materializer.materialize(context, line)).isTrue();
    }

    @Test void futureMonthsAreDeferredAndEditingSourceNeverRewritesGeneratedPaymentHistory() {
        long current = line(context.companyId(), today, "MXN", "Current source");
        long future = line(context.companyId(), today.withDayOfMonth(1).plusMonths(1), "MXN", "Future source");
        assertThat(occurrences.candidates(context, 0, 100, today.withDayOfMonth(today.lengthOfMonth())))
            .contains(current).doesNotContain(future);
        assertThat(synchronization.synchronize(context).generated()).isEqualTo(1);
        var expense = expenses.settlePayment(context, expenseId(current), new SettleExpensePaymentRequest(null,null,"source-edit-paid"));
        var original = jdbc.queryForMap("SELECT * FROM finance_expenses WHERE company_id=? AND id=?",context.companyId(),expense.id());
        jdbc.update("UPDATE finance_budget_lines SET planned_amount=999,version=version+1 WHERE company_id=? AND id=?",context.companyId(),current);
        assertThat(synchronization.synchronize(context).generated()).isZero();
        assertThat(jdbc.queryForMap("SELECT * FROM finance_expenses WHERE company_id=? AND id=?",context.companyId(),expense.id())).isEqualTo(original);
        assertThat(expenseIdOrNull(future)).isNull();
        assertThat(count("finance_expense_payments")).isEqualTo(1);
    }

    private boolean at(long line, LocalDate date) {
        return Boolean.TRUE.equals(new TransactionTemplate(transactions).execute(status -> materializer.materializeAt(context, line, date)));
    }
    private long company() {
        String key="budget-obligation-test-"+UUID.randomUUID();
        jdbc.update("INSERT INTO companies(name) VALUES (?)", key);
        long id=jdbc.queryForObject("SELECT id FROM companies WHERE name=?",Long.class,key); companies.add(id); return id;
    }
    private long line(long company, LocalDate due, String currency, String concept) {
        String key=UUID.randomUUID().toString();
        jdbc.update("INSERT INTO finance_budgets(company_id,name,period_start,period_end,status,currency_code) VALUES (?,?,'2000-01-01','2100-12-31','ACTIVE',?)",company,key,currency);
        long budget=jdbc.queryForObject("SELECT id FROM finance_budgets WHERE company_id=? AND name=?",Long.class,company,key);
        jdbc.update("""
            INSERT INTO finance_budget_lines(company_id,budget_id,name,planned_amount,available_amount,health_status,currency_code,status,custom_fields_json,metadata_json)
            VALUES (?,?,?,116,116,'ON_TRACK',?,'ACTIVE',JSON_OBJECT('dueDate',?,'concept',?,'taxes',16,'amountPaid',0),JSON_OBJECT('source','expenses-frontend'))
            """,company,budget,key,currency,due.toString(),concept);
        return jdbc.queryForObject("SELECT id FROM finance_budget_lines WHERE company_id=? AND name=?",Long.class,company,key);
    }
    private long bank() {
        jdbc.update("INSERT INTO finance_payment_accounts(company_id,name,type,currency_code,current_balance,status) VALUES (?,'Test bank','BANK','MXN',5000,'ACTIVE')",context.companyId());
        return jdbc.queryForObject("SELECT id FROM finance_payment_accounts WHERE company_id=?",Long.class,context.companyId());
    }
    private CreateExpenseRequest request(Long lineId, String concept, LocalDate due) {
        return new CreateExpenseRequest(null,null,null,lineId,null,null,null,"AUTO-CXP",concept,null,ExpenseType.FIXED,
            new BigDecimal("100"),new BigDecimal("16"),new BigDecimal("116"),"MXN",due,due,null,null,null,false,null,null);
    }
    private Long expenseIdOrNull(long line) {
        return jdbc.query("SELECT expense_id FROM finance_budget_expense_occurrences WHERE company_id=? AND budget_line_id=?",
            (rs,n)->rs.getObject(1,Long.class),context.companyId(),line).stream().filter(Objects::nonNull).findFirst().orElse(null);
    }
    private long expenseId(long line) { return Objects.requireNonNull(expenseIdOrNull(line)); }
    private long count(String table) { return jdbc.queryForObject("SELECT COUNT(*) FROM "+table+" WHERE company_id=?",Long.class,context.companyId()); }
}
