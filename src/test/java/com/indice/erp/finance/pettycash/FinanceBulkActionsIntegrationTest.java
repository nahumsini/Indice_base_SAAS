package com.indice.erp.finance.pettycash;

import static org.assertj.core.api.Assertions.*;
import com.indice.erp.finance.expenses.ExpenseBulkActionService;
import com.indice.erp.finance.expenses.dto.ExpenseBulkActionRequest;
import com.indice.erp.finance.pettycash.dto.PettyCashBulkActionRequest;
import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.shared.FinanceScope;
import java.math.BigDecimal;
import java.util.List;
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
class FinanceBulkActionsIntegrationTest {
    @Autowired JdbcTemplate jdbc;
    @Autowired ExpenseBulkActionService expenses;
    @Autowired PettyCashBulkActionService petty;
    @Autowired PettyCashService service;
    @Autowired PettyCashRepository repository;

    @ParameterizedTest @ValueSource(strings={"MXN","USD","CAD","COP","BRL"})
    void paidClassificationPreservesNativeAmountsAndPaymentEvidence(String currency) {
        var f=fixture(currency); long id=expense(f,"PAID",currency); long account=account(f);
        jdbc.update("INSERT INTO finance_expense_payments(company_id,expense_id,payment_account_id,amount,currency_code,payment_date,source,registered_by_user_id) VALUES (?,?,?,100,?,'2026-08-15','RECORDED',?)", f.context.companyId(),id,f.bank,currency,f.context.userId());
        var evidence=jdbc.queryForMap("SELECT * FROM finance_expense_payments WHERE expense_id=?", id);
        var response=expenses.apply(f.context, expenseRequest(ExpenseBulkActionRequest.Action.ACCOUNTING_ACCOUNT,account,id));
        var saved=response.expenses().getFirst();
        assertThat(saved.accountingAccountId()).isEqualTo(account);
        assertThat(saved.paidAmount()).isEqualByComparingTo("100");
        assertThat(saved.totalAmount()).isEqualByComparingTo("100");
        assertThat(saved.currencyCode()).isEqualTo(currency);
        assertThat(saved.metadata().path("bulkAdjustments").size()).isEqualTo(1);
        assertThat(jdbc.queryForMap("SELECT * FROM finance_expense_payments WHERE expense_id=?",id)).isEqualTo(evidence);
        assertThat(money("finance_payment_accounts","current_balance",f.bank)).isEqualByComparingTo("1000");
    }

    @Test void providerChangesWorkOnPaidRowsAndClearStaleDisplayNames() {
        var f=fixture("MXN"); long first=expense(f,"PAID","MXN"),second=expense(f,"DRAFT","MXN"),provider=provider(f);
        jdbc.update("UPDATE finance_expenses SET custom_fields_json=JSON_OBJECT('providerName','Old name','unrelated','keep') WHERE id=?",first);
        var result=expenses.apply(f.context,expenseRequest(ExpenseBulkActionRequest.Action.PROVIDER,provider,first,second));
        assertThat(result.expenses()).allSatisfy(row -> assertThat(row.providerId()).isEqualTo(provider));
        assertThat(result.expenses().getFirst().customFields().path("unrelated").asText()).isEqualTo("keep");
        assertThat(result.expenses().getFirst().customFields().has("providerName")).isFalse();
    }

    @Test void oneStaleExpensePreventsAllChangesAndAuditWrites() {
        var f=fixture("MXN");long first=expense(f,"DRAFT","MXN"),second=expense(f,"DRAFT","MXN");
        jdbc.update("UPDATE finance_expenses SET version=version+1 WHERE id=?",second);
        assertThatThrownBy(() -> expenses.apply(f.context,expenseRequest(ExpenseBulkActionRequest.Action.PROVIDER,provider(f),first,second))).hasMessageContaining("changed");
        assertThat(value("finance_expenses","provider_id",first)).isNull();
        assertThat(value("finance_expenses","metadata_json",first)).isNull();
    }

    @Test void deletingPaidAndDraftTogetherDoesNotDeleteEither() {
        var f=fixture("MXN");long draft=expense(f,"DRAFT","MXN"),paid=expense(f,"PAID","MXN");
        assertThatThrownBy(() -> expenses.apply(f.context,expenseRequest(ExpenseBulkActionRequest.Action.DELETE,null,draft,paid))).hasMessageContaining("unpaid draft");
        assertThat(value("finance_expenses","deleted_at",draft)).isNull();
        assertThat(value("finance_expenses","deleted_at",paid)).isNull();
    }

    @Test void deleteDraftsRetainsHistoryAndRejectsReplay() {
        var f=fixture("MXN");long first=expense(f,"DRAFT","MXN"),second=expense(f,"DRAFT","MXN");
        var request=expenseRequest(ExpenseBulkActionRequest.Action.DELETE,null,first,second);
        assertThat(expenses.apply(f.context,request).expenses()).isEmpty();
        assertThat(value("finance_expenses","deleted_at",first)).isNotNull();
        assertThat(value("finance_expenses","deleted_at",second)).isNotNull();
        assertThat(String.valueOf(value("finance_expenses","metadata_json",first))).contains("Isolated bulk test");
        assertThatThrownBy(() -> expenses.apply(f.context,request)).hasMessageContaining("not found");
    }

    @Test void futurePaymentAccountCannotMixCurrenciesOrUseFundCustody() {
        var f=fixture("MXN");long first=expense(f,"DRAFT","MXN"),second=expense(f,"DRAFT","USD");
        assertThatThrownBy(() -> expenses.apply(f.context,expenseRequest(ExpenseBulkActionRequest.Action.PAYMENT_ACCOUNT,f.bank,first,second)));
        assertThat(value("finance_expenses","payment_account_id",first)).isNull();
        assertThatThrownBy(() -> expenses.apply(f.context,expenseRequest(ExpenseBulkActionRequest.Action.PAYMENT_ACCOUNT,f.custody,first))).hasMessageContaining("fund custody");
        var saved=expenses.apply(f.context,expenseRequest(ExpenseBulkActionRequest.Action.PAYMENT_ACCOUNT,f.bank,first)).expenses().getFirst();
        assertThat(saved.paymentAccountId()).isEqualTo(f.bank);
        assertThat(saved.paidAmount()).isZero();
        assertThat(money("finance_payment_accounts","current_balance",f.bank)).isEqualByComparingTo("1000");
    }

    @Test void changingUnitClearsBusinessAndCannotEscapeNarrowScope() {
        var f=fixture("MXN");long first=expense(f,"PAID","MXN"),unit=unit(f),next=unit(f),business=business(f,unit);
        jdbc.update("UPDATE finance_expenses SET unit_id=?,business_id=? WHERE id=?",unit,business,first);
        var scope=new FinanceContext(f.context.userId(),f.context.companyId(),"Test","admin",true,FinanceScope.unitHeadquarters(unit));
        assertThatThrownBy(() -> expenses.apply(scope,expenseRequest(ExpenseBulkActionRequest.Action.UNIT,next,first))).hasMessageContaining("company-wide");
        var saved=expenses.apply(f.context,expenseRequest(ExpenseBulkActionRequest.Action.UNIT,next,first)).expenses().getFirst();
        assertThat(saved.unitId()).isEqualTo(next);assertThat(saved.businessId()).isNull();
    }

    @Test void businessMustMatchEverySelectedUnit() {
        var f=fixture("MXN");long first=expense(f,"DRAFT","MXN"),second=expense(f,"DRAFT","MXN"),unit=unit(f),other=unit(f),business=business(f,unit);
        jdbc.update("UPDATE finance_expenses SET unit_id=? WHERE id=?",unit,first);
        jdbc.update("UPDATE finance_expenses SET unit_id=? WHERE id=?",other,second);
        assertThatThrownBy(() -> expenses.apply(f.context,expenseRequest(ExpenseBulkActionRequest.Action.BUSINESS,business,first,second))).hasMessageContaining("unit of every");
        assertThat(value("finance_expenses","business_id",first)).isNull();
        assertThat(expenses.apply(f.context,expenseRequest(ExpenseBulkActionRequest.Action.BUSINESS,business,first)).expenses().getFirst().businessId()).isEqualTo(business);
    }

    @Test void tenantCannotSelectForeignRowsOrReferences() {
        var f=fixture("MXN");var other=fixture("MXN");long first=expense(f,"DRAFT","MXN");
        assertThatThrownBy(() -> expenses.apply(other.context,expenseRequest(ExpenseBulkActionRequest.Action.DELETE,null,first))).hasMessageContaining("not found");
        assertThatThrownBy(() -> expenses.apply(f.context,expenseRequest(ExpenseBulkActionRequest.Action.PROVIDER,provider(other),first))).hasMessageContaining("this company");
        assertThat(value("finance_expenses","version",first)).isEqualTo(0L);
    }

    @Test void authorizedReceiptUpdatesItsExpenseWithoutAnotherMoneyMovement() {
        var f=fixture("MXN");long line=receipt(f);long provider=provider(f),account=account(f);
        var authorized=service.createExpenseFromSettlementLine(f.context,f.fund,line);
        var before=jdbc.queryForMap("SELECT * FROM finance_payment_accounts WHERE id=?",f.custody);
        var updated=petty.apply(f.context,f.fund,pettyRequest(f,PettyCashBulkActionRequest.Action.PROVIDER,provider,line));
        assertThat(updated.settlementLines().getFirst().providerId()).isEqualTo(provider);
        assertThat(value("finance_expenses","provider_id",authorized.settlementLine().expenseId())).isEqualTo(provider);
        petty.apply(f.context,f.fund,pettyRequest(f,PettyCashBulkActionRequest.Action.ACCOUNTING_ACCOUNT,account,line));
        assertThat(value("finance_expenses","accounting_account_id",authorized.settlementLine().expenseId())).isEqualTo(account);
        assertThat(money("finance_expenses","paid_amount",authorized.settlementLine().expenseId())).isEqualByComparingTo("100");
        assertThat(jdbc.queryForMap("SELECT * FROM finance_payment_accounts WHERE id=?",f.custody)).isEqualTo(before);
        assertThatThrownBy(() -> expenses.apply(f.context,new ExpenseBulkActionRequest(ExpenseBulkActionRequest.Action.PROVIDER,List.of(new ExpenseBulkActionRequest.Selection(authorized.settlementLine().expenseId(),jdbc.queryForObject("SELECT version FROM finance_expenses WHERE id=?",Long.class,authorized.settlementLine().expenseId()))),provider,"test"))).hasMessageContaining("Petty Cash");
    }

    @Test void closedCutAndStaleReceiptProtectTheWholeSelection() {
        var f=fixture("MXN");long first=receipt(f),second=receipt(f);var request=pettyRequest(f,PettyCashBulkActionRequest.Action.PROVIDER,provider(f),first,second);
        jdbc.update("UPDATE finance_petty_cash_settlement_lines SET version=version+1 WHERE id=?",second);
        assertThatThrownBy(() -> petty.apply(f.context,f.fund,request)).hasMessageContaining("changed");
        assertThat(value("finance_petty_cash_settlement_lines","provider_id",first)).isNull();
        jdbc.update("UPDATE finance_petty_cash_statements SET status='CLOSED' WHERE id=?",f.cut);
        assertThatThrownBy(() -> petty.apply(f.context,f.fund,pettyRequest(f,PettyCashBulkActionRequest.Action.DELETE,null,first))).hasMessageContaining("closed");
        assertThat(value("finance_petty_cash_settlement_lines","status",first)).isEqualTo("DRAFT");
    }

    @Test void receiptsMustBelongToOneFundAndCut() {
        var f=fixture("MXN");var other=fixture("MXN");long first=receipt(f),second=receipt(other);
        assertThatThrownBy(() -> petty.apply(f.context,f.fund,new PettyCashBulkActionRequest(f.cut,PettyCashBulkActionRequest.Action.DELETE,List.of(new PettyCashBulkActionRequest.Selection(first,0L),new PettyCashBulkActionRequest.Selection(second,0L)),null,"Isolated test")));
        assertThat(value("finance_petty_cash_settlement_lines","status",first)).isEqualTo("DRAFT");
    }

    @Test void reversingReceiptsPreservesRecordsAndRestoresCashOnlyOnce() {
        var f=fixture("MXN");long first=receipt(f),second=receipt(f);
        var request=pettyRequest(f,PettyCashBulkActionRequest.Action.DELETE,null,first,second);
        var result=petty.apply(f.context,f.fund,request);
        assertThat(result.settlementLines()).allSatisfy(line -> assertThat(line.status()).isEqualTo(PettyCashSettlementLineStatus.REVERSED));
        assertThat(result.fund().currentBalanceAmount()).isEqualByComparingTo("1000");
        assertThat(money("finance_payment_accounts","current_balance",f.custody)).isEqualByComparingTo("1000");
        assertThatThrownBy(() -> petty.apply(f.context,f.fund,request)).hasMessageContaining("changed");
        assertThat(money("finance_payment_accounts","current_balance",f.custody)).isEqualByComparingTo("1000");
    }

    @Test void reversingAugustUpdatesSeptemberOpeningAndNeverAddsAnotherDeposit() {
        var f=fixture("MXN");long receipt=receipt(f);long september=nextCut(f,"OPEN");
        var result=petty.apply(f.context,f.fund,pettyRequest(f,PettyCashBulkActionRequest.Action.DELETE,null,receipt));
        assertThat(result.updatedStatements()).hasSize(1);
        assertThat(money("finance_petty_cash_statements","opening_balance_amount",september)).isEqualByComparingTo("1000");
        assertThat(money("finance_petty_cash_statements","declared_closing_balance_amount",september)).isEqualByComparingTo("1000");
        assertThat(money("finance_petty_cash_statements","additional_deposit_amount",september)).isZero();
    }

    @Test void aClosedSuccessorBlocksReversalBeforeAnyMoneyChanges() {
        var f=fixture("MXN");long receipt=receipt(f);long september=nextCut(f,"CLOSED");
        var balance=money("finance_payment_accounts","current_balance",f.custody);
        assertThatThrownBy(() -> petty.apply(f.context,f.fund,pettyRequest(f,PettyCashBulkActionRequest.Action.DELETE,null,receipt))).hasMessageContaining("later statement");
        assertThat(value("finance_petty_cash_settlement_lines","status",receipt)).isEqualTo("DRAFT");
        assertThat(money("finance_payment_accounts","current_balance",f.custody)).isEqualByComparingTo(balance);
        assertThat(money("finance_petty_cash_statements","opening_balance_amount",september)).isEqualByComparingTo("900");
    }

    @Test void postedExpenseAndItsReceiptAreProtectedFromReclassificationAndReversal() {
        var f=fixture("MXN");long receipt=receipt(f);var authorized=service.createExpenseFromSettlementLine(f.context,f.fund,receipt);
        long expense=authorized.settlementLine().expenseId();
        jdbc.update("INSERT INTO finance_accounting_periods(company_id,period_key,period_start,period_end,framework_snapshot,functional_currency_snapshot) VALUES (?,'2026-08','2026-08-01','2026-08-31','IFRS_SMES_2015','MXN')",f.context.companyId());
        long period=jdbc.queryForObject("SELECT id FROM finance_accounting_periods WHERE company_id=?",Long.class,f.context.companyId());
        jdbc.update("INSERT INTO finance_journal_entries(company_id,period_id,entry_number,entry_date,journal_type,status,description,source_module,source_type,source_id,source_event_key,source_fingerprint,currency_code) VALUES (?,?,'BULK-TEST','2026-08-15','EXPENSE','POSTED','Test','expenses','EXPENSE',?, ?,?,'MXN')",f.context.companyId(),period,String.valueOf(expense),"EXPENSE:"+expense,"0".repeat(64));
        assertThatThrownBy(() -> petty.apply(f.context,f.fund,pettyRequest(f,PettyCashBulkActionRequest.Action.ACCOUNTING_ACCOUNT,account(f),receipt))).hasMessageContaining("posted journal");
        assertThatThrownBy(() -> petty.apply(f.context,f.fund,pettyRequest(f,PettyCashBulkActionRequest.Action.DELETE,null,receipt))).hasMessageContaining("posted journal");
        assertThat(value("finance_petty_cash_settlement_lines","status",receipt)).isEqualTo("EXPENSE_CREATED");
    }

    private long nextCut(Fixture f,String status) {
        String key=UUID.randomUUID().toString();jdbc.update("INSERT INTO finance_petty_cash_statements(company_id,petty_cash_fund_id,folio,period_key,period_start,period_end,cut_off_date,currency_code,status,fund_type_snapshot,opening_balance_amount,declared_closing_balance_amount) VALUES (?,?,?,'2026-09','2026-09-01','2026-09-30','2026-09-30',?,?,'INTERNAL_COMPANY',900,900)",f.context.companyId(),f.fund,key,f.currency,status);
        return id("finance_petty_cash_statements","folio",key);
    }

    private ExpenseBulkActionRequest expenseRequest(ExpenseBulkActionRequest.Action action,Long target,long... ids) {
        return new ExpenseBulkActionRequest(action,java.util.Arrays.stream(ids).mapToObj(id -> new ExpenseBulkActionRequest.Selection(id,0L)).toList(),target,"Isolated bulk test");
    }
    private PettyCashBulkActionRequest pettyRequest(Fixture f,PettyCashBulkActionRequest.Action action,Long target,long... ids) {
        return new PettyCashBulkActionRequest(f.cut,action,java.util.Arrays.stream(ids).mapToObj(id -> new PettyCashBulkActionRequest.Selection(id,repository.findSettlementLineById(f.context,id).orElseThrow().version())).toList(),target,"Isolated bulk test");
    }
    private Fixture fixture(String currency) {
        String key=UUID.randomUUID().toString();jdbc.update("INSERT INTO companies(name) VALUES (?)",key);long company=id("companies","name",key);
        jdbc.update("INSERT INTO users(email,password_hash) VALUES (?,'isolated-no-login')",key+"@example.test");long user=id("users","email",key+"@example.test");
        jdbc.update("INSERT INTO user_companies(company_id,user_id,role,status,visibility) VALUES (?,?,'admin','active','all')",company,user);
        long custody=payment(company,currency),bank=payment(company,currency);
        jdbc.update("INSERT INTO finance_petty_cash_funds(company_id,name,currency_code,limit_amount,current_balance_amount,cut_off_day,status,fund_type,payment_account_id,responsible_user_id) VALUES (?,?,?,1000,1000,31,'OPEN','INTERNAL_COMPANY',?,?)",company,key,currency,custody,user);
        long fund=id("finance_petty_cash_funds","name",key);
        jdbc.update("INSERT INTO finance_petty_cash_statements(company_id,petty_cash_fund_id,folio,period_key,period_start,period_end,cut_off_date,currency_code,status,fund_type_snapshot,opening_balance_amount,declared_closing_balance_amount) VALUES (?,?,?,'2026-08','2026-08-01','2026-08-31','2026-08-31',?,'OPEN','INTERNAL_COMPANY',1000,1000)",company,fund,key,currency);
        return new Fixture(new FinanceContext(user,company,"Test","admin",true,FinanceScope.corporateOffice()),fund,id("finance_petty_cash_statements","folio",key),custody,bank,currency);
    }
    private long expense(Fixture f,String status,String currency) {
        String key=UUID.randomUUID().toString();boolean paid=status.equals("PAID");
        jdbc.update("INSERT INTO finance_expenses(company_id,folio,concept,expense_type,subtotal_amount,tax_amount,total_amount,paid_amount,balance_amount,currency_code,expense_date,status,payment_status) VALUES (?,?,?,'VARIABLE',100,0,100,?,?,?,'2026-08-15',?,?)",f.context.companyId(),key,key,paid?100:0,paid?0:100,currency,status,paid?"PAID":"UNPAID");return id("finance_expenses","folio",key);
    }
    private long receipt(Fixture f) {
        return service.createSettlementLine(f.context,f.fund,new com.indice.erp.finance.pettycash.dto.CreatePettyCashSettlementLineRequest(
            f.cut,null,null,account(f),UUID.randomUUID().toString(),null,new BigDecimal("100"),BigDecimal.ZERO,new BigDecimal("100"),f.currency,
            java.time.LocalDate.of(2026,8,15),0,PettyCashSettlementLineStatus.DRAFT,null,null)).settlementLine().id();
    }
    private long payment(long company,String currency) {String key=UUID.randomUUID().toString();jdbc.update("INSERT INTO finance_payment_accounts(company_id,name,type,currency_code,opening_balance,current_balance,status) VALUES (?,?,'CASH',?,1000,1000,'ACTIVE')",company,key,currency);return id("finance_payment_accounts","name",key);}
    private long account(Fixture f) {String key=UUID.randomUUID().toString();jdbc.update("INSERT INTO finance_accounting_accounts(company_id,code,name,group_key,status) VALUES (?,?,'Test','EXPENSE','ACTIVE')",f.context.companyId(),key);return id("finance_accounting_accounts","code",key);}
    private long provider(Fixture f) {String key=UUID.randomUUID().toString();jdbc.update("INSERT INTO finance_providers(company_id,name,status) VALUES (?,?,'ACTIVE')",f.context.companyId(),key);return id("finance_providers","name",key);}
    private long unit(Fixture f) {String key=UUID.randomUUID().toString();jdbc.update("INSERT INTO units(company_id,name) VALUES (?,?)",f.context.companyId(),key);return id("units","name",key);}
    private long business(Fixture f,long unit) {String key=UUID.randomUUID().toString();jdbc.update("INSERT INTO businesses(company_id,unit_id,name) VALUES (?,?,?)",f.context.companyId(),unit,key);return id("businesses","name",key);}
    private long id(String table,String field,String value) {return jdbc.queryForObject("SELECT id FROM "+table+" WHERE "+field+"=?",Long.class,value);}
    private Object value(String table,String field,long id) {return jdbc.queryForObject("SELECT "+field+" FROM "+table+" WHERE id=?",Object.class,id);}
    private BigDecimal money(String table,String field,long id) {return jdbc.queryForObject("SELECT "+field+" FROM "+table+" WHERE id=?",BigDecimal.class,id);}
    private record Fixture(FinanceContext context,long fund,long cut,long custody,long bank,String currency) {}
}
