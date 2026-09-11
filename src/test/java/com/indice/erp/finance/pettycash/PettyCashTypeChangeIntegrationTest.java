package com.indice.erp.finance.pettycash;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.indice.erp.finance.pettycash.dto.ChangePettyCashFundTypeRequest;
import com.indice.erp.finance.expenses.ExpenseService;
import com.indice.erp.finance.pettycash.dto.CreatePettyCashFundRequest;
import com.indice.erp.finance.pettycash.dto.CreatePettyCashMovementRequest;
import com.indice.erp.finance.pettycash.dto.CreatePettyCashSettlementLineRequest;
import com.indice.erp.finance.pettycash.dto.UpdatePettyCashFundRequest;
import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.shared.FinanceScope;
import com.indice.erp.finance.treasury.TreasuryService;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class PettyCashTypeChangeIntegrationTest {
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper json;
    @Autowired PettyCashService funds;
    @Autowired PettyCashTypeChanges changes;
    @Autowired PettyCashRepository repository;
    @Autowired TreasuryService treasury;
    @Autowired ExpenseService expenses;

    @Test
    void internalToExternalKeepsPriorExpenseAndUsesTheNewStageForLaterActivity() throws Exception {
        var f = fixture();
        var fund = funds.createFund(f.context, createRequest(f, PettyCashFundType.INTERNAL_COMPANY));
        funds.createMovement(f.context, fund.id(), deposit(f, 100, null));
        var internalReceipt = funds.createSettlementLine(f.context, fund.id(), receipt(f, 20));
        funds.createExpenseFromSettlementLine(f.context, fund.id(), internalReceipt.settlementLine().id());
        assertThat(companyExpenseCount(f)).isEqualTo(1);
        assertThat(treasury.ownedCashBalances(f.context.companyId()).get("MXN")).isEqualByComparingTo("980");

        var current = funds.getFund(f.context, fund.id());
        schedule(f, current, PettyCashFundType.EXTERNAL_MANAGED);
        makeDueAndActivate(f, fund.id());
        var changed = funds.getFund(f.context, fund.id());
        assertThat(changed.fundType()).isEqualTo(PettyCashFundType.EXTERNAL_MANAGED);
        assertThat(changed.currentBalanceAmount()).isEqualByComparingTo("80");
        assertThat(treasury.ownedCashBalances(f.context.companyId()).get("MXN")).isEqualByComparingTo("900");

        funds.createMovement(f.context, fund.id(), deposit(f, 50, "Recursos del cliente"));
        var externalReceipt = funds.createSettlementLine(f.context, fund.id(), receipt(f, 10));
        funds.createExpenseFromSettlementLine(f.context, fund.id(), externalReceipt.settlementLine().id());
        assertThat(funds.getFund(f.context, fund.id()).currentBalanceAmount()).isEqualByComparingTo("120");
        assertThat(companyExpenseCount(f)).isEqualTo(1);
        assertThat(treasury.ownedCashBalances(f.context.companyId()).get("MXN")).isEqualByComparingTo("900");
        assertThat(statementTypes(f, fund.id())).containsExactlyInAnyOrder("INTERNAL_COMPANY", "EXTERNAL_MANAGED");
    }

    @Test
    void externalToInternalPreservesExternalHistoryAndIntegratesOnlyNewReceipts() throws Exception {
        var f = fixture();
        var fund = funds.createFund(f.context, createRequest(f, PettyCashFundType.EXTERNAL_MANAGED));
        funds.createMovement(f.context, fund.id(), deposit(f, 100, "Aportación externa"));
        var externalReceipt = funds.createSettlementLine(f.context, fund.id(), receipt(f, 20));
        funds.createExpenseFromSettlementLine(f.context, fund.id(), externalReceipt.settlementLine().id());
        assertThat(companyExpenseCount(f)).isZero();
        assertThat(treasury.ownedCashBalances(f.context.companyId()).get("MXN")).isEqualByComparingTo("1000");

        var current = funds.getFund(f.context, fund.id());
        schedule(f, current, PettyCashFundType.INTERNAL_COMPANY);
        makeDueAndActivate(f, fund.id());
        var internalReceipt = funds.createSettlementLine(f.context, fund.id(), receipt(f, 10));
        funds.createExpenseFromSettlementLine(f.context, fund.id(), internalReceipt.settlementLine().id());

        assertThat(funds.getFund(f.context, fund.id()).currentBalanceAmount()).isEqualByComparingTo("70");
        assertThat(companyExpenseCount(f)).isEqualTo(1);
        assertThat(treasury.ownedCashBalances(f.context.companyId()).get("MXN")).isEqualByComparingTo("1070");
        assertThat(statementTypes(f, fund.id())).containsExactlyInAnyOrder("EXTERNAL_MANAGED", "INTERNAL_COMPANY");
    }

    @Test
    void pendingReceiptAndStaleVersionBlockATypeChangeWithoutMutatingTheFund() throws Exception {
        var f = fixture();
        var fund = funds.createFund(f.context, createRequest(f, PettyCashFundType.INTERNAL_COMPANY));
        funds.createSettlementLine(f.context, fund.id(), receipt(f, 10));
        var current = funds.getFund(f.context, fund.id());
        var request = changeRequest(f, current, PettyCashFundType.EXTERNAL_MANAGED, current.version());
        assertThatThrownBy(() -> changes.schedule(f.context, fund.id(), request)).hasMessageContaining("pending receipts");
        var stale = changeRequest(f, current, PettyCashFundType.EXTERNAL_MANAGED, current.version() - 1);
        assertThatThrownBy(() -> changes.schedule(f.context, fund.id(), stale)).hasMessageContaining("Refresh");
        assertThat(funds.getFund(f.context, fund.id()).fundType()).isEqualTo(PettyCashFundType.INTERNAL_COMPANY);
        assertThat(changes.history(f.context, fund.id())).isEmpty();
    }

    @Test
    void transitionPreservesCustodyAndCancellationKeepsAnAuditedHistory() throws Exception {
        var f = fixture();
        var fund = funds.createFund(f.context, createRequest(f, PettyCashFundType.INTERNAL_COMPANY));
        var current = funds.getFund(f.context, fund.id());
        var invalidBody = fundRequest(f, PettyCashFundType.EXTERNAL_MANAGED)
            .put("name", current.name()).put("paymentAccountId", f.source);
        var invalid = new ChangePettyCashFundTypeRequest(
            json.treeToValue(invalidBody, UpdatePettyCashFundRequest.class), today().plusDays(1),
            "Cambio con custodia inválida", current.version());
        assertThatThrownBy(() -> changes.schedule(f.context, fund.id(), invalid)).hasMessageContaining("custody account");

        changes.schedule(f.context, fund.id(), changeRequest(f, current, PettyCashFundType.EXTERNAL_MANAGED, current.version()));
        var scheduled = changes.history(f.context, fund.id()).getFirst();
        assertThat(scheduled.status()).isEqualTo("SCHEDULED");
        changes.cancel(f.context, fund.id(), scheduled.id());
        var cancelled = changes.history(f.context, fund.id()).getFirst();
        assertThat(cancelled.status()).isEqualTo("CANCELLED");
        assertThat(cancelled.cancelledByUserId()).isEqualTo(f.context.userId());
        assertThat(cancelled.cancelledAt()).isNotNull();
        assertThat(funds.getFund(f.context, fund.id()).fundType()).isEqualTo(PettyCashFundType.INTERNAL_COMPANY);
        assertThat(funds.getFund(f.context, fund.id()).paymentAccountId()).isEqualTo(f.custody);
    }

    @Test
    void transitionReusesAnEmptyStatementThatStartsOnTheEffectiveDate() throws Exception {
        var f = fixture();
        var fund = funds.createFund(f.context, createRequest(f, PettyCashFundType.INTERNAL_COMPANY));
        funds.createMovement(f.context, fund.id(), deposit(f, 100, null));
        var currentStatementId = jdbc.queryForObject(
            "SELECT id FROM finance_petty_cash_statements WHERE company_id = ? AND petty_cash_fund_id = ?",
            Long.class, f.context.companyId(), fund.id());
        var prior = java.time.YearMonth.from(today()).minusMonths(1);
        jdbc.update("UPDATE finance_petty_cash_statements SET period_key = ?, period_start = ?, period_end = ?, cut_off_date = ? WHERE id = ?",
            prior.toString(), prior.atDay(1), prior.atEndOfMonth(), prior.atEndOfMonth(), currentStatementId);
        var record = repository.findFundById(f.context, fund.id()).orElseThrow();
        var period = java.time.YearMonth.from(today());
        repository.insertStatement(f.context, record, "PC-ST-EMPTY-" + fund.id(), period.toString(), today(), period.atEndOfMonth());

        var current = funds.getFund(f.context, fund.id());
        schedule(f, current, PettyCashFundType.EXTERNAL_MANAGED);
        makeDueAndActivate(f, fund.id());

        assertThat(jdbc.queryForObject("""
            SELECT COUNT(*) FROM finance_petty_cash_statements
            WHERE company_id = ? AND petty_cash_fund_id = ? AND period_start <= ? AND period_end >= ?
            """, Long.class, f.context.companyId(), fund.id(), today(), today())).isEqualTo(1L);
        assertThat(jdbc.queryForObject("""
            SELECT fund_type_snapshot FROM finance_petty_cash_statements
            WHERE company_id = ? AND petty_cash_fund_id = ? AND period_start <= ? AND period_end >= ?
            """, String.class, f.context.companyId(), fund.id(), today(), today())).isEqualTo("EXTERNAL_MANAGED");
    }

    private void schedule(Fixture f, com.indice.erp.finance.pettycash.dto.PettyCashFundResponse fund,
            PettyCashFundType target) throws Exception {
        changes.schedule(f.context, fund.id(), changeRequest(f, fund, target, fund.version()));
    }

    private ChangePettyCashFundTypeRequest changeRequest(Fixture f,
            com.indice.erp.finance.pettycash.dto.PettyCashFundResponse fund, PettyCashFundType target, long version) throws Exception {
        var body = fundRequest(f, target);
        body.put("name", fund.name()).put("limitAmount", fund.limitAmount()).put("currentBalanceAmount", fund.currentBalanceAmount());
        var update = json.treeToValue(body, UpdatePettyCashFundRequest.class);
        return new ChangePettyCashFundTypeRequest(update, today().plusDays(1), "Cambio operativo aprobado", version);
    }

    private void makeDueAndActivate(Fixture f, long fundId) {
        jdbc.update("UPDATE finance_petty_cash_type_changes SET effective_date = ? WHERE company_id = ? AND petty_cash_fund_id = ? AND status = 'SCHEDULED'",
            today(), f.context.companyId(), fundId);
        changes.activateCompany(f.context.companyId());
    }

    private CreatePettyCashFundRequest createRequest(Fixture f, PettyCashFundType type) throws Exception {
        return json.treeToValue(fundRequest(f, type), CreatePettyCashFundRequest.class);
    }

    private ObjectNode fundRequest(Fixture f, PettyCashFundType type) {
        var body = json.createObjectNode().put("name", "Fondo " + UUID.randomUUID()).put("currencyCode", "MXN")
            .put("fundType", type.name()).put("limitAmount", 500).put("currentBalanceAmount", 0)
            .put("paymentAccountId", f.custody).put("responsibleUserId", f.context.userId()).put("cutOffDay", 30)
            .put("kioskEnabled", false);
        if (type == PettyCashFundType.INTERNAL_COMPANY) {
            body.put("budgetId", f.budget).put("budgetLineId", f.budgetLine);
        } else {
            body.put("externalOwnerType", "PERSON").put("externalOwnerName", "Cliente")
                .put("externalOwnerRelationship", "CLIENT").put("statementRecipientEmail", "client@example.test");
        }
        return body;
    }

    private CreatePettyCashMovementRequest deposit(Fixture f, int amount, String externalSource) {
        return new CreatePettyCashMovementRequest(null, externalSource == null ? f.source : null, f.custody,
            PettyCashMovementType.ADDITIONAL_DEPOSIT, new BigDecimal(amount), "MXN", today(), externalSource,
            "CONTRIBUTION", "Origen", "Entrada al fondo", externalSource == null ? "INTERNAL_TRANSFER" : "EXTERNAL_MEDIA",
            null, "Prueba", null, null);
    }

    private CreatePettyCashSettlementLineRequest receipt(Fixture f, int amount) {
        return new CreatePettyCashSettlementLineRequest(null, null, null, f.accountingAccount, "Compra", "R-1",
            new BigDecimal(amount), BigDecimal.ZERO, new BigDecimal(amount), "MXN", today(), 1,
            PettyCashSettlementLineStatus.RECEIPT_ATTACHED, null, null);
    }

    private long companyExpenseCount(Fixture f) {
        return expenses.list(f.context).count();
    }

    private java.util.List<String> statementTypes(Fixture f, long fundId) {
        return jdbc.queryForList("SELECT DISTINCT fund_type_snapshot FROM finance_petty_cash_statements WHERE company_id = ? AND petty_cash_fund_id = ?",
            String.class, f.context.companyId(), fundId);
    }

    private Fixture fixture() {
        var key = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO companies(name) VALUES (?)", key);
        long company = id("companies", "name", key);
        jdbc.update("INSERT INTO users(email,password_hash) VALUES (?,'isolated')", key + "@example.test");
        long user = id("users", "email", key + "@example.test");
        jdbc.update("INSERT INTO user_companies(company_id,user_id,role,status,visibility) VALUES (?,?,'admin','active','all')", company, user);
        jdbc.update("INSERT INTO finance_budgets(company_id,name,period_start,period_end,status,currency_code) VALUES (?,?,?,?,'ACTIVE','MXN')",
            company, key, today().minusYears(1), today().plusYears(1));
        long budget = id("finance_budgets", "name", key);
        jdbc.update("INSERT INTO finance_budget_lines(company_id,budget_id,name,planned_amount,available_amount,health_status,currency_code,status) VALUES (?,?,?,1000,1000,'ON_TRACK','MXN','ACTIVE')",
            company, budget, key);
        long budgetLine = id("finance_budget_lines", "name", key);
        jdbc.update("INSERT INTO finance_accounting_accounts(company_id,code,name,group_key,status) VALUES (?,?,'Test','EXPENSE','ACTIVE')", company, key);
        long accounting = id("finance_accounting_accounts", "code", key);
        long source = paymentAccount(company, key + "-source", "1000");
        long custody = paymentAccount(company, key + "-custody", "0");
        return new Fixture(new FinanceContext(user, company, "Test", "admin", true, FinanceScope.corporateOffice()),
            source, custody, budget, budgetLine, accounting);
    }

    private long paymentAccount(long company, String name, String balance) {
        jdbc.update("INSERT INTO finance_payment_accounts(company_id,name,type,currency_code,opening_balance,current_balance,status) VALUES (?,?,'CASH','MXN',?,?,'ACTIVE')",
            company, name, new BigDecimal(balance), new BigDecimal(balance));
        return id("finance_payment_accounts", "name", name);
    }

    private long id(String table, String field, String value) {
        return jdbc.queryForObject("SELECT id FROM " + table + " WHERE " + field + " = ?", Long.class, value);
    }
    private LocalDate today() { return LocalDate.now(ZoneId.of("America/Toronto")); }
    private record Fixture(FinanceContext context, long source, long custody, long budget, long budgetLine, long accountingAccount) {}
}
