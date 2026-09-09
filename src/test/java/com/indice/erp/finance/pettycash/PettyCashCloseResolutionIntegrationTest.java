package com.indice.erp.finance.pettycash;

import static org.assertj.core.api.Assertions.*;
import com.indice.erp.finance.pettycash.dto.ClosePettyCashStatementRequest;
import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.shared.FinanceScope;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class PettyCashCloseResolutionIntegrationTest {
    @Autowired JdbcTemplate jdbc;
    @Autowired PettyCashService service;
    @Autowired PettyCashRepository repository;
    @Autowired PettyCashAttachmentService attachments;
    @Autowired org.springframework.transaction.PlatformTransactionManager transactions;

    @ParameterizedTest @ValueSource(strings = {"MXN", "USD", "CAD", "COP", "BRL"})
    void negativeCarryIsAnOpeningBalanceAndNeverAnotherDeposit(String currency) {
        var f = fixture("-1764.28", currency, false);
        long september = cut(f, "2026-09", "-1500", "-1674.01"); // August received a late expense.
        setFundBalance(f, "-1938.29");
        var result = close(f, PettyCashStatementCloseAction.CARRY_FORWARD);
        assertThat(result.statement().carryForwardAmount()).isEqualByComparingTo("-1764.28");
        assertThat(result.statement().declaredClosingBalanceAmount()).isZero();
        assertThat(result.nextStatement().id()).isEqualTo(september);
        assertThat(balance("finance_petty_cash_statements", "opening_balance_amount", september)).isEqualByComparingTo("-1764.28");
        assertThat(balance("finance_petty_cash_statements", "declared_closing_balance_amount", september)).isEqualByComparingTo("-1938.29");
        assertThat(balance("finance_petty_cash_funds", "current_balance_amount", f.fund)).isEqualByComparingTo("-1938.29");
        assertThat(count("finance_payment_account_movements", f)).isZero();
        assertThat(count("finance_petty_cash_movements", f)).isZero();
    }

    @Test void forgivingNegativeBalanceAdjustsUpOnceAndPropagatesOpenMonths() {
        var f = fixture("-1764.28", "MXN", false);
        long september = cut(f, "2026-09", "-1764.28", "-1938.29");
        long october = cut(f, "2026-10", "-1938.29", "-1948.29");
        setFundBalance(f, "-1948.29");
        var result = close(f, PettyCashStatementCloseAction.FORGIVE_SHORTAGE);
        assertThat(result.fund().currentBalanceAmount()).isEqualByComparingTo("-184.01");
        assertThat(balance("finance_payment_accounts", "current_balance", f.account)).isEqualByComparingTo("-184.01");
        assertThat(balance("finance_petty_cash_statements", "opening_balance_amount", september)).isZero();
        assertThat(balance("finance_petty_cash_statements", "declared_closing_balance_amount", september)).isEqualByComparingTo("-174.01");
        assertThat(balance("finance_petty_cash_statements", "opening_balance_amount", october)).isEqualByComparingTo("-174.01");
        assertThat(balance("finance_petty_cash_statements", "declared_closing_balance_amount", october)).isEqualByComparingTo("-184.01");
        assertThat(result.updatedStatements()).hasSize(2);
        assertThat(count("finance_payment_account_movements", f)).isEqualTo(1);
        assertThat(count("finance_expenses", f)).isZero();
        assertThat(jdbc.queryForObject("SELECT JSON_UNQUOTE(JSON_EXTRACT(metadata_json, '$.closure.action')) FROM finance_petty_cash_statements WHERE id=?", String.class, f.cut))
            .isEqualTo("FORGIVE_SHORTAGE");
    }

    @Test void surplusForgivenessIsNotReportedAsShortageOrPayroll() {
        var f = fixture("250", "USD", false);
        var result = close(f, PettyCashStatementCloseAction.FORGIVE_SURPLUS);
        assertThat(result.fund().currentBalanceAmount()).isZero();
        assertThat(result.statement().shortageAmount()).isZero();
        assertThat(balance("finance_payment_accounts", "current_balance", f.account)).isZero();
        assertThat(count("hr_incentive_applications", f)).isZero();
        assertThat(count("finance_expenses", f)).isZero();
        assertThat(jdbc.queryForObject("SELECT JSON_UNQUOTE(JSON_EXTRACT(metadata_json, '$.closeAction')) FROM finance_petty_cash_movements WHERE company_id=?", String.class, f.context.companyId()))
            .isEqualTo("FORGIVE_SURPLUS");
    }

    @Test void payrollDeductionUsesResponsibleMembershipAndNativeAmountOnce() {
        var f = fixture("-100", "MXN", false);
        var result = close(f, PettyCashStatementCloseAction.CHARGE_EMPLOYEE);
        assertThat(result.statement().status()).isEqualTo(PettyCashStatementStatus.CHARGED_TO_EMPLOYEE);
        assertThat(result.fund().currentBalanceAmount()).isZero();
        assertThat(count("hr_incentive_applications", f)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT amount FROM hr_incentive_applications WHERE company_id=?", BigDecimal.class, f.context.companyId())).isEqualByComparingTo("100");
        assertThat(jdbc.queryForObject("SELECT currency_code FROM hr_incentive_applications WHERE company_id=?", String.class, f.context.companyId())).isEqualTo("MXN");
        assertThat(jdbc.queryForObject("SELECT status FROM hr_incentive_applications WHERE company_id=?", String.class, f.context.companyId())).isEqualTo("approved");
        assertThatThrownBy(() -> close(f, PettyCashStatementCloseAction.CHARGE_EMPLOYEE)).hasMessageContaining("already closed");
        assertThat(count("hr_incentive_applications", f)).isEqualTo(1);
    }

    @ParameterizedTest @ValueSource(booleans = {false, true})
    void explicitAuthorizationWithoutFileRemovesTheClosingBlock(boolean external) {
        var f = fixture("0", "MXN", external);
        long line = receipt(f, "DRAFT", 0);
        assertThat(repository.countPendingSettlementLinesForStatement(f.context, f.cut)).isEqualTo(1);
        var result = service.createExpenseFromSettlementLine(f.context, f.fund, line);
        assertThat(result.settlementLine().attachmentCount()).isZero();
        assertThat(result.settlementLine().status()).isEqualTo(external ? PettyCashSettlementLineStatus.VALIDATED : PettyCashSettlementLineStatus.EXPENSE_CREATED);
        assertThat(repository.countPendingSettlementLinesForStatement(f.context, f.cut)).isZero();
        assertThat(count("finance_expenses", f)).isEqualTo(external ? 0 : 1);
        assertThat(count("finance_payment_account_movements", f)).isZero();
        close(f, PettyCashStatementCloseAction.CLOSE_CLEAN);
    }

    @Test void removingLastFileDoesNotRevokeAnExternalAuthorization() {
        var f = fixture("0", "MXN", true);
        long line = receipt(f, "VALIDATED", 1);
        jdbc.update("""
            INSERT INTO finance_petty_cash_settlement_line_attachments
              (company_id, petty_cash_fund_id, petty_cash_statement_id, settlement_line_id,
               original_filename, mime_type, size_bytes, object_key, uploaded_by_user_id)
            VALUES (?, ?, ?, ?, 'test.pdf', 'application/pdf', 1, ?, ?)
            """, f.context.companyId(), f.fund, f.cut, line, "isolated-test-"+UUID.randomUUID(), f.context.userId());
        long attachment = jdbc.queryForObject("SELECT id FROM finance_petty_cash_settlement_line_attachments WHERE company_id=?", Long.class, f.context.companyId());
        attachments.deleteAttachment(f.context, f.fund, line, attachment);
        assertThat(repository.findSettlementLineById(f.context, line).orElseThrow().status()).isEqualTo(PettyCashSettlementLineStatus.VALIDATED);
        assertThat(repository.countPendingSettlementLinesForStatement(f.context, f.cut)).isZero();
    }

    @Test void staleBalanceCannotResolveAnUnreviewedDifference() {
        var f = fixture("-100", "MXN", false);
        assertThatThrownBy(() -> service.closeStatement(f.context, f.fund, f.cut,
            new ClosePettyCashStatementRequest(PettyCashStatementCloseAction.FORGIVE_SHORTAGE, null,
                LocalDate.of(2026,9,8), "Test", new BigDecimal("-90")))).hasMessageContaining("balance changed");
        assertThat(count("finance_payment_account_movements", f)).isZero();
    }

    @Test void projectionNeverRewritesAFinalizedLaterCut() {
        var f = fixture("-100", "MXN", false);
        long next = cut(f, "2026-09", "-100", "0");
        jdbc.update("UPDATE finance_petty_cash_statements SET status='CLOSED' WHERE id=?", next);
        assertThatThrownBy(() -> repository.reconcileFollowingStatementOpening(f.context, f.fund, "2026-08", BigDecimal.ZERO))
            .hasMessageContaining("already closed");
        assertThat(balance("finance_petty_cash_statements", "opening_balance_amount", next)).isEqualByComparingTo("-100");
    }

    @Test void missingNextMonthIsCreatedWithTheSignedOpeningOnlyOnce() {
        var f = fixture("-100", "CAD", false);
        var result = close(f, PettyCashStatementCloseAction.CARRY_FORWARD);
        assertThat(result.nextStatement().periodKey()).isEqualTo("2026-09");
        assertThat(result.nextStatement().openingBalanceAmount()).isEqualByComparingTo("-100");
        assertThat(result.nextStatement().additionalDepositAmount()).isZero();
        assertThat(count("finance_petty_cash_statements", f)).isEqualTo(2);
        assertThatThrownBy(() -> close(f, PettyCashStatementCloseAction.CARRY_FORWARD)).hasMessageContaining("already closed");
        assertThat(count("finance_petty_cash_statements", f)).isEqualTo(2);
    }

    @Test void fullyAuthorizedIsStillOpenUntilTheExplicitClose() {
        var f = fixture("0", "MXN", false);
        jdbc.update("UPDATE finance_petty_cash_statements SET status='SETTLED' WHERE id=?", f.cut);
        long receipt = receipt(f, "DRAFT", 0);
        var result = service.createExpenseFromSettlementLine(f.context, f.fund, receipt);
        assertThat(result.settlementLine().status()).isEqualTo(PettyCashSettlementLineStatus.EXPENSE_CREATED);
        assertThat(repository.countPendingSettlementLinesForStatement(f.context, f.cut)).isZero();
    }

    @Test void anotherTenantCannotCloseThisFund() {
        var f = fixture("-100", "MXN", false);
        var other = fixture("0", "MXN", false);
        assertThatThrownBy(() -> service.closeStatement(other.context, f.fund, f.cut,
            new ClosePettyCashStatementRequest(PettyCashStatementCloseAction.FORGIVE_SHORTAGE, null, LocalDate.of(2026,9,8), "Test")));
        assertThat(balance("finance_petty_cash_funds", "current_balance_amount", f.fund)).isEqualByComparingTo("-100");
        assertThat(count("finance_payment_account_movements", f)).isZero();
    }

    @Test void failureOnAClosedSuccessorRollsBackPayrollAndMoneyTogether() {
        var f = fixture("-100", "MXN", false);
        long next = cut(f, "2026-09", "-100", "0");
        jdbc.update("UPDATE finance_petty_cash_statements SET status='CLOSED' WHERE id=?", next);
        var nested = new org.springframework.transaction.support.TransactionTemplate(transactions);
        nested.setPropagationBehavior(org.springframework.transaction.TransactionDefinition.PROPAGATION_NESTED);
        assertThatThrownBy(() -> nested.execute(status -> close(f, PettyCashStatementCloseAction.CHARGE_EMPLOYEE)))
            .hasMessageContaining("already closed");
        assertThat(count("finance_payment_account_movements", f)).isZero();
        assertThat(count("finance_petty_cash_movements", f)).isZero();
        assertThat(count("hr_incentive_applications", f)).isZero();
        assertThat(count("hr_incentives", f)).isZero();
        assertThat(balance("finance_petty_cash_funds", "current_balance_amount", f.fund)).isEqualByComparingTo("-100");
        assertThat(repository.findStatementById(f.context, f.cut).orElseThrow().status()).isEqualTo(PettyCashStatementStatus.CUT_PENDING);
    }

    @Test void closingCurrentMonthCanBeReloadedAndCannotBeChangedOrReversed() {
        var f = fixture("0", "MXN", false);
        var month = java.time.YearMonth.now(java.time.ZoneOffset.UTC);
        jdbc.update("UPDATE finance_petty_cash_statements SET period_key=?, period_start=?, period_end=?, cut_off_date=? WHERE id=?",
            month.toString(), month.atDay(1), month.atEndOfMonth(), month.atEndOfMonth(), f.cut);
        long line = receipt(f, "DRAFT", 0);
        service.createExpenseFromSettlementLine(f.context, f.fund, line);
        close(f, PettyCashStatementCloseAction.CLOSE_CLEAN);
        var workspace = service.workspace(f.context);
        assertThat(workspace.statements()).singleElement().satisfies(cut -> assertThat(cut.status()).isEqualTo(PettyCashStatementStatus.CLOSED));
        assertThatThrownBy(() -> service.deleteSettlementLine(f.context, f.fund, line, "Cannot reverse closed history"))
            .hasMessageContaining("already closed");
        assertThat(repository.findSettlementLineById(f.context, line).orElseThrow().status()).isEqualTo(PettyCashSettlementLineStatus.EXPENSE_CREATED);
    }

    @Test void partialLegacyShortageCarriesTheRemainderInsteadOfLosingIt() {
        var f = fixture("250", "MXN", false);
        var result = service.closeStatement(f.context, f.fund, f.cut, new ClosePettyCashStatementRequest(
            PettyCashStatementCloseAction.FORGIVE_SHORTAGE, new BigDecimal("100"), LocalDate.of(2026,9,8), "Legacy physical shortage"));
        assertThat(result.statement().declaredClosingBalanceAmount()).isZero();
        assertThat(result.statement().shortageAmount()).isEqualByComparingTo("100");
        assertThat(result.statement().carryForwardAmount()).isEqualByComparingTo("150");
        assertThat(result.nextStatement().openingBalanceAmount()).isEqualByComparingTo("150");
        assertThat(result.fund().currentBalanceAmount()).isEqualByComparingTo("150");
    }

    private void setFundBalance(Fixture f, String amount) {
        jdbc.update("UPDATE finance_petty_cash_funds SET current_balance_amount=? WHERE id=?", new BigDecimal(amount), f.fund);
        jdbc.update("UPDATE finance_payment_accounts SET current_balance=? WHERE id=?", new BigDecimal(amount), f.account);
    }

    private com.indice.erp.finance.pettycash.dto.PettyCashStatementCloseResponse close(Fixture f, PettyCashStatementCloseAction action) {
        return service.closeStatement(f.context, f.fund, f.cut, new ClosePettyCashStatementRequest(action, null, LocalDate.of(2026,9,8), "Isolated closing test"));
    }
    private Fixture fixture(String balance, String currency, boolean external) {
        String key=UUID.randomUUID().toString();
        jdbc.update("INSERT INTO companies (name) VALUES (?)", key);
        long company=id("companies", "name", key);
        jdbc.update("INSERT INTO users (email, password_hash) VALUES (?, 'isolated-no-login')", key+"@example.test");
        long user=id("users", "email", key+"@example.test");
        jdbc.update("INSERT INTO user_companies (company_id,user_id,role,status,visibility) VALUES (?,?,'admin','active','all')",company,user);
        jdbc.update("INSERT INTO finance_payment_accounts (company_id,name,type,currency_code,opening_balance,current_balance,status) VALUES (?,?,'CASH',?,?,?,'ACTIVE')",company,key,currency,new BigDecimal(balance),new BigDecimal(balance));
        long account=id("finance_payment_accounts","name",key);
        jdbc.update("""
            INSERT INTO finance_petty_cash_funds (company_id,name,currency_code,limit_amount,current_balance_amount,
              cut_off_day,status,fund_type,payment_account_id,responsible_user_id)
            VALUES (?,?,?,10000,?,31,'OPEN',?,?,?)
            """,company,key,currency,new BigDecimal(balance),external?"EXTERNAL_MANAGED":"INTERNAL_COMPANY",account,user);
        long fund=id("finance_petty_cash_funds","name",key);
        var f=new Fixture(new FinanceContext(user,company,"Test","admin",true,FinanceScope.corporateOffice()),fund,0,account,currency,external);
        long cut=cut(f,"2026-08","0",balance);
        return new Fixture(f.context,fund,cut,account,currency,external);
    }
    private long cut(Fixture f,String month,String opening,String closing) {
        String key=UUID.randomUUID().toString();var period=java.time.YearMonth.parse(month);
        jdbc.update("""
            INSERT INTO finance_petty_cash_statements (company_id,petty_cash_fund_id,folio,period_key,period_start,
              period_end,cut_off_date,currency_code,status,fund_type_snapshot,opening_balance_amount,declared_closing_balance_amount)
            VALUES (?,?,?,?,?,?,?,?,'CUT_PENDING',?,?,?)
            """,f.context.companyId(),f.fund,key,month,period.atDay(1),period.atEndOfMonth(),period.atEndOfMonth(),f.currency,
            f.external?"EXTERNAL_MANAGED":"INTERNAL_COMPANY",new BigDecimal(opening),new BigDecimal(closing));
        return id("finance_petty_cash_statements","folio",key);
    }
    private long receipt(Fixture f,String status,int files) {
        String key=UUID.randomUUID().toString();
        jdbc.update("INSERT INTO finance_accounting_accounts (company_id,code,name,group_key,status) VALUES (?,?,'Test account','EXPENSE','ACTIVE')",f.context.companyId(),key);
        long account=id("finance_accounting_accounts","code",key);
        jdbc.update("""
            INSERT INTO finance_petty_cash_settlement_lines (company_id,petty_cash_fund_id,petty_cash_statement_id,
              description,subtotal_amount,tax_amount,total_amount,currency_code,expense_date,attachment_count,status,accounting_account_id)
            VALUES (?,?,?,?,100,0,100,?,'2026-08-15',?,?,?)
            """,f.context.companyId(),f.fund,f.cut,key,f.currency,files,status,account);
        return id("finance_petty_cash_settlement_lines","description",key);
    }
    private long id(String table,String field,String value) {return jdbc.queryForObject("SELECT id FROM "+table+" WHERE "+field+"=?",Long.class,value);}
    private BigDecimal balance(String table,String field,long id) {return jdbc.queryForObject("SELECT "+field+" FROM "+table+" WHERE id=?",BigDecimal.class,id);}
    private int count(String table,Fixture f) {return jdbc.queryForObject("SELECT COUNT(*) FROM "+table+" WHERE company_id=?",Integer.class,f.context.companyId());}
    private record Fixture(FinanceContext context,long fund,long cut,long account,String currency,boolean external) {}
}
