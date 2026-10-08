package com.indice.erp.ai.financeworkflow;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static com.indice.erp.finance.assistant.FinanceAssistantContracts.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.ai.access.*;
import com.indice.erp.ai.access.AiAccessTokenRepository.StoredToken;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.finance.assistant.*;
import com.indice.erp.finance.status.ExpenseStatus;
import com.indice.erp.finance.pettycash.PettyCashSettlementLineStatus;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

/** Real Finance owners and immutable confirmation SQL; only the entitlement gateway is simulated. */
@SpringBootTest(properties={"app.email.enabled=false","app.entitlements.projection-enabled=false"})
@Transactional
class AiFinanceWorkflowIntegrationTest {
    @Autowired JdbcTemplate jdbc;
    @Autowired AiFinanceWorkflowActionService actions;
    @Autowired FinanceAssistantService owner;
    @Autowired AiAccessTokenRepository tokens;
    @Autowired ObjectMapper mapper;
    @Autowired AiFinanceReportService reports;
    @Autowired com.indice.erp.ai.finance.AiFinanceActionService legacy;
    @Autowired org.springframework.transaction.PlatformTransactionManager transactions;
    @MockitoBean AiToolAuthorizationService authorization;
    long company,unit,business,bank,account,budget,line;StoredToken token;LocalDate today=LocalDate.now(ZoneId.of("America/Toronto"));
    @BeforeEach void setup(){
        assertThat(jdbc.queryForObject("SELECT DATABASE()",String.class)).contains("test").isNotEqualTo("corazon_testers");
        String key=UUID.randomUUID().toString();jdbc.update("INSERT INTO companies(name) VALUES(?)","Synthetic finance "+key);company=jdbc.queryForObject("SELECT id FROM companies WHERE name=?",Long.class,"Synthetic finance "+key);
        jdbc.update("INSERT INTO users(email,password_hash,full_name) VALUES(?,'test','Synthetic finance operator')",key+"@example.test");long user=jdbc.queryForObject("SELECT id FROM users WHERE email=?",Long.class,key+"@example.test");
        jdbc.update("INSERT INTO user_companies(user_id,company_id,role,status,visibility) VALUES(?,?,'root','active','all')",user,company);long member=jdbc.queryForObject("SELECT id FROM user_companies WHERE company_id=?",Long.class,company);
        jdbc.update("INSERT INTO units(company_id,name,status) VALUES(?,'Synthetic finance unit','active')",company);unit=jdbc.queryForObject("SELECT id FROM units WHERE company_id=?",Long.class,company);
        jdbc.update("INSERT INTO businesses(company_id,unit_id,name,status) VALUES(?,?,'Synthetic finance business','active')",company,unit);business=jdbc.queryForObject("SELECT id FROM businesses WHERE company_id=?",Long.class,company);
        var actor=new AuthSessionUser(user,company,member,"Synthetic finance operator","root");var scopes=new HashSet<String>();FinanceAssistantTools.ALL.values().forEach(s->scopes.add(s.scope()));scopes.addAll(Set.of("files.read","files.attach"));
        long tid=tokens.insert(actor,"generic_mcp","Synthetic financial regression","test",key.replace("-","").repeat(2),Instant.now().plusSeconds(3600),scopes);token=new StoredToken(tid,actor,Set.copyOf(scopes));when(authorization.canUseFinanceWorkflowTool(any(),anyString())).thenReturn(true);
        account=save("create_finance_accounting_account",Map.of("accounting",Map.of("code","6000","name","Synthetic supplies","groupKey","SUPPLIES"))).records().accountingAccounts().getFirst().id();
        bank=paymentAccount("Synthetic bank","BANK","10000.00");
        budget=save("create_finance_budget",Map.of("budget",Map.of("name","Synthetic budget","periodStart",today.withDayOfMonth(1).toString(),"periodEnd",today.plusYears(1).toString(),"currencyCode","CAD"))).records().budgets().getFirst().id();
        line=save("create_finance_budget_line",Map.of("budgetLine",Map.of("budgetId",budget,"name","Synthetic operations","plannedAmount","5000.00","currencyCode","CAD"))).records().budgetLines().getFirst().id();
    }
    @Test void payablePartialPaymentCorrectionReversalSettlementAndCloseKeepExactHistory(){
        var preview=actions.preview(token,"create_expense_payable",change(Map.of("expense",expense("=Synthetic payable","100.25"))));assertThat(count("finance_expenses")).isZero();
        var commit=new CommitRequest(preview.confirmationToken(),"finance-payable-first");long id=actions.commit(token,"create_expense_payable",commit).result().records().expenses().getFirst().id();assertThat(actions.commit(token,"create_expense_payable",commit).replayed()).isTrue();assertThat(count("finance_expenses")).isEqualTo(1);
        assertThat(save("submit_finance_expense",Map.of("id",id)).records().expenses().getFirst().status()).isEqualTo(ExpenseStatus.PENDING_APPROVAL);
        save("approve_finance_expense",Map.of("id",id));var paid=save("register_expense_payment",Map.of("id",id,"payment",Map.of("amount","20.05","paymentAccountId",bank,"paymentDate",today.toString())));assertThat(paid.records().expenses().getFirst().balanceAmount()).isEqualByComparingTo("80.20");assertBalance(bank,"9979.95");
        var corrected=save("correct_finance_expense",Map.of("id",id,"expense",expense("Synthetic corrected payable","120.25")));assertThat(corrected.records().expenses().getFirst().paidAmount()).isEqualByComparingTo("20.05");assertBalance(bank,"9979.95");
        var history=owner.read(token.user(),"list_expense_payments",query(Map.of("id",id))).records().payments();assertThat(history).hasSize(1);
        save("reverse_expense_payment",Map.of("id",id,"paymentId",history.getFirst().id(),"reason","Synthetic duplicate payment correction"));assertBalance(bank,"10000.00");
        var payment=new LinkedHashMap<String,Object>();payment.put("paymentAccountId",null);payment.put("paymentDate",today.toString());var settled=save("settle_expense_payment",Map.of("id",id,"payment",payment));assertThat(settled.records().expenses().getFirst().balanceAmount()).isZero();assertBalance(bank,"10000.00");
        var secondHistory=owner.read(token.user(),"list_expense_payments",query(Map.of("id",id))).records().payments();assertThat(secondHistory).hasSize(2);assertThat(secondHistory).filteredOn(p->p.reversedAt()!=null).hasSize(1);
        assertThat(save("close_finance_expense",Map.of("id",id)).records().expenses().getFirst().status()).isEqualTo(ExpenseStatus.CLOSED);
        var report=reports.export(token,new AiFinanceReportService.Request(AiFinanceReportService.Report.expense_payments,"pdf",query(Map.of("id",id))));assertThat(Base64.getDecoder().decode(report.contentBase64())).startsWith("%PDF".getBytes());
    }
    @ParameterizedTest @ValueSource(strings={"INTERNAL_COMPANY","EXTERNAL_MANAGED"})
    void fundDepositCaptureAuthorizeReturnAndClosurePreserveOwnership(String type){
        long fund=createFund(type);assertThat(count("finance_expenses")).isZero();
        save("deposit_petty_cash_fund",Map.of("fundId",fund,"deposit",Map.of("amount","200.00","currencyCode","CAD","movementDate",today.toString(),"sourcePaymentAccountId",bank,"reference","Synthetic bank funding")));assertBalance(bank,"9800.00");
        var receipt=save("capture_petty_cash_receipt",Map.of("fundId",fund,"receipt",Map.of("description","Synthetic receipt","receiptReference","TEST-01","accountingAccountId",account,"totalAmount","50.25","currencyCode","CAD","expenseDate",today.toString()))).records().receipts().getFirst();
        var authorized=save("authorize_petty_cash_receipt",Map.of("fundId",fund,"id",receipt.id()));boolean internal=type.equals("INTERNAL_COMPANY");assertThat(authorized.records().receipts().getFirst().status()).isEqualTo(internal?PettyCashSettlementLineStatus.EXPENSE_CREATED:PettyCashSettlementLineStatus.VALIDATED);assertThat(count("finance_expenses")).isEqualTo(internal?1:0);assertBalance(bank,"9800.00");
        var cut=owner.read(token.user(),"list_petty_cash_statements",query(Map.of("fundId",fund))).records().statements().getFirst();assertThat(cut.declaredClosingBalanceAmount()).isEqualByComparingTo("149.75");
        save("close_petty_cash_statement",Map.of("fundId",fund,"statementId",cut.id(),"closing",Map.of("action","RETURN_TO_SOURCE","closeDate",today.toString(),"destinationPaymentAccountId",bank,"reference","Synthetic return")));assertBalance(bank,"9949.75");
        assertThat(save("close_petty_cash_fund",Map.of("id",fund,"reason","Synthetic reconciled fund closure")).records().funds().getFirst().status().name()).isEqualTo("CLOSED");
        var report=reports.export(token,new AiFinanceReportService.Request(AiFinanceReportService.Report.petty_cash_statements,"csv",query(Map.of("fundId",fund))));assertThat(new String(Base64.getDecoder().decode(report.contentBase64()),java.nio.charset.StandardCharsets.UTF_8)).contains(type,"149.75");
    }
    @Test void receiptRejectionPreservesOutflowAndExplicitReversalRestoresOnce(){
        long fund=createFund("EXTERNAL_MANAGED");save("deposit_petty_cash_fund",Map.of("fundId",fund,"deposit",Map.of("amount","50.00","currencyCode","CAD","movementDate",today.toString(),"externalSourceName","Synthetic client","reference","External receipt")));
        var r=save("capture_petty_cash_receipt",Map.of("fundId",fund,"receipt",Map.of("description","Synthetic rejected receipt","totalAmount","70.00","currencyCode","CAD","expenseDate",today.toString()))).records().receipts().getFirst();save("reject_petty_cash_receipt",Map.of("fundId",fund,"id",r.id(),"reason","Synthetic correction required"));
        assertThat(owner.read(token.user(),"get_petty_cash_fund",query(Map.of("id",fund))).records().funds().getFirst().currentBalanceAmount()).isEqualByComparingTo("-20.00");
        var p=actions.preview(token,"reverse_petty_cash_receipt",change(Map.of("fundId",fund,"id",r.id(),"reason","Synthetic wrong outflow")));var c=new CommitRequest(p.confirmationToken(),"synthetic-reverse-receipt");actions.commit(token,"reverse_petty_cash_receipt",c);assertThat(actions.commit(token,"reverse_petty_cash_receipt",c).replayed()).isTrue();assertThat(owner.read(token.user(),"get_petty_cash_fund",query(Map.of("id",fund))).records().funds().getFirst().currentBalanceAmount()).isEqualByComparingTo("50.00");assertThat(count("finance_expenses")).isZero();
    }
    @Test void importsBulkDueDatesPaymentsAndAuditedRemovalRemainAtomic(){
        var rows=List.of(expense("Synthetic batch A","30.00"),expense("Synthetic batch B","70.00"));var imported=save("import_finance_expenses",Map.of("expenses",rows)).records().expenses();
        var selected=imported.stream().map(e->Map.of("id",e.id(),"expectedVersion",e.version())).toList();var reviewed=save("update_finance_expense_due_status",Map.of("rows",selected,"dueStatus","OVERDUE","effectiveDate",today.minusDays(1).toString())).records().expenses();assertThat(reviewed).allSatisfy(e->assertThat(e.status()).isEqualTo(ExpenseStatus.APPROVED));
        var paid=save("pay_finance_expenses",Map.of("rows",reviewed.stream().map(e->Map.of("id",e.id(),"expectedVersion",e.version())).toList(),"targetId",bank,"effectiveDate",today.toString())).records().expenses();assertBalance(bank,"9900.00");
        for(var e:paid)save("remove_finance_expense",Map.of("id",e.id(),"reason","Synthetic audited removal"));assertBalance(bank,"10000.00");assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM finance_expenses WHERE company_id=? AND deleted_at IS NOT NULL",Integer.class,company)).isEqualTo(2);assertThat(count("finance_expense_payments")).isEqualTo(2);
    }
    @Test void paginationTotalsSeparateClassesAndCurrencyAndExportsAllRows(){
        createFund("INTERNAL_COMPANY");createFund("EXTERNAL_MANAGED");var funds=owner.read(token.user(),"list_petty_cash_funds",query(Map.of("limit",1)));assertThat(funds.hasMore()).isTrue();assertThat(funds.totalCount()).isEqualTo(2);assertThat(funds.totals()).extracting(Metric::fundType).containsExactlyInAnyOrder("INTERNAL_COMPANY","EXTERNAL_MANAGED");
        var next=owner.read(token.user(),"list_petty_cash_funds",query(Map.of("limit",1,"cursor",funds.nextCursor())));assertThat(next.hasMore()).isFalse();assertThat(next.records().funds().getFirst().id()).isNotEqualTo(funds.records().funds().getFirst().id());
        assertThatThrownBy(()->nested(()->owner.read(token.user(),"list_petty_cash_funds",query(Map.of("limit",2,"cursor",funds.nextCursor()))))).isInstanceOf(IllegalArgumentException.class);
        for(int i=0;i<27;i++)save("create_expense_payable",Map.of("expense",expense("Synthetic report "+i,"1.25")));var report=reports.export(token,new AiFinanceReportService.Request(AiFinanceReportService.Report.expenses,"csv",null));String csv=new String(Base64.getDecoder().decode(report.contentBase64()),java.nio.charset.StandardCharsets.UTF_8);assertThat(csv).contains("Synthetic report 26","1.25","CAD");assertThat(csv.lines().count()).isEqualTo(28);
    }
    @Test void changedStateConsentRevocationAndForeignScopeRejectWithoutDuplicateMovement()throws Exception{
        long id=save("create_expense_payable",Map.of("expense",expense("Synthetic stale payable","12.00"))).records().expenses().getFirst().id();var p=actions.preview(token,"settle_expense_payment",change(Map.of("id",id,"payment",Map.of("paymentAccountId",bank))));jdbc.update("UPDATE finance_expenses SET version=version+1,concept='Changed by operator' WHERE company_id=? AND id=?",company,id);
        assertThatThrownBy(()->nested(()->actions.commit(token,"settle_expense_payment",new CommitRequest(p.confirmationToken(),"synthetic-stale-payment")))).isInstanceOf(Conflict.class);assertBalance(bank,"10000.00");assertThat(count("finance_expense_payments")).isZero();
        var limited=new StoredToken(token.id(),token.user(),Set.of("expenses.read"));assertThatThrownBy(()->actions.preview(limited,"settle_expense_payment",change(Map.of("id",id,"payment",Map.of("paymentAccountId",bank))))).isInstanceOf(SecurityException.class);
        assertThatThrownBy(()->mapper.readValue("{\"expense\":{\"companyId\":999}}",Change.class)).hasMessageContaining("Unknown finance data field");
        assertThatThrownBy(()->nested(()->actions.preview(token,"register_expense_payment",change(Map.of("id",id,"payment",Map.of("amount","1.00","paymentAccountId",bank+100000)))))).isInstanceOf(RuntimeException.class);assertBalance(bank,"10000.00");
        when(authorization.canUseFinanceWorkflowTool(any(),eq("settle_expense_payment"))).thenReturn(false);assertThatThrownBy(()->actions.preview(token,"settle_expense_payment",change(Map.of("id",id,"payment",Map.of("paymentAccountId",bank))))).isInstanceOf(SecurityException.class);
    }
    @Test void finiteBudgetScheduleUsesExplicitIncludedTaxAndDoesNotDebitBank(){
        var data=new LinkedHashMap<String,Object>();data.put("budgetId",budget);data.put("name","Synthetic rent schedule");data.put("plannedAmount","113.00");data.put("currencyCode","CAD");data.put("accountingAccountId",account);data.put("includesTax",true);data.put("taxRate","0.13");
        var result=save("create_budget_obligation_schedule",Map.of("budgetLine",data,"schedule",Map.of("startDate",today.withDayOfMonth(1).toString(),"endDate",today.withDayOfMonth(1).plusMonths(2).toString(),"everyMonths",1)));assertThat(result.records().budgetLines()).hasSize(3);assertBalance(bank,"10000.00");assertThat(count("finance_expenses")).isZero();
        assertThat(new BigDecimal(jdbc.queryForObject("SELECT JSON_UNQUOTE(JSON_EXTRACT(custom_fields_json,'$.taxes')) FROM finance_budget_lines WHERE company_id=? AND id=?",String.class,company,result.records().budgetLines().getFirst().id()))).isEqualByComparingTo("13.00");
        assertThat(result.records().budgetLines().getFirst().taxAmount()).isEqualByComparingTo("13.00");assertThat(result.records().budgetLines().getFirst().accountingAccountId()).isEqualTo(account);
    }
    @Test void paidGrossImportAndBatchCorrectionUseNativeTaxAndSourceRules() throws Exception {
        var data=new LinkedHashMap<>(expense("Synthetic Canadian gross invoice","113.00"));data.put("paid",true);data.put("paymentAccountId",bank);data.put("includesTax",true);data.put("taxRate","0.13");
        var preview=actions.preview(token,"import_finance_expenses",change(Map.of("expenses",List.of(data))));assertThat(preview.effects().getFirst().taxAmount()).isEqualByComparingTo("13.00");assertBalance(bank,"10000.00");
        var imported=actions.commit(token,"import_finance_expenses",new CommitRequest(preview.confirmationToken(),"synthetic-paid-import")).result().records().expenses().getFirst();assertThat(imported.status()).isEqualTo(ExpenseStatus.PAID);assertThat(imported.taxAmount()).isEqualByComparingTo("13.00");assertBalance(bank,"9887.00");
        var corrected=new LinkedHashMap<>(expense("Synthetic corrected Canadian invoice","120.25"));
        var review=actions.preview(token,"correct_finance_expenses",change(Map.of("rows",List.of(Map.of("id",imported.id(),"expectedVersion",imported.version())),"expenses",List.of(corrected))));assertThat(review.effects().getFirst().amount()).isEqualByComparingTo("120.25");
        var saved=actions.commit(token,"correct_finance_expenses",new CommitRequest(review.confirmationToken(),"synthetic-batch-correct")).result().records().expenses().getFirst();assertThat(saved.paidAmount()).isEqualByComparingTo("113.00");assertThat(saved.balanceAmount()).isEqualByComparingTo("7.25");assertBalance(bank,"9887.00");
        var invalid=new LinkedHashMap<>(expense("Synthetic forbidden source import","5.00"));invalid.put("budgetLineId",line);assertThatThrownBy(()->nested(()->actions.preview(token,"import_finance_expenses",change(Map.of("expenses",List.of(invalid)))))).hasMessageContaining("source workflow");
        assertThat(mapper.readTree(mapper.writeValueAsString(saved)).path("totalAmount").isTextual()).isTrue();
    }
    @ParameterizedTest @ValueSource(strings={"CLOSE_CLEAN","CARRY_FORWARD","FORGIVE_SHORTAGE","FORGIVE_SURPLUS","CHARGE_EMPLOYEE"})
    void statementDecisionsKeepSignedAmountsAndPayrollRequiresSeparateApplication(String decision){
        long fund=createFund("EXTERNAL_MANAGED");if(!decision.equals("CLOSE_CLEAN"))save("deposit_petty_cash_fund",Map.of("fundId",fund,"deposit",Map.of("amount","50.00","currencyCode","CAD","movementDate",today.toString(),"externalSourceName","Synthetic client","reference","Synthetic signed cut")));
        boolean shortage=decision.equals("FORGIVE_SHORTAGE")||decision.equals("CHARGE_EMPLOYEE");
        if(shortage){var receipt=save("capture_petty_cash_receipt",Map.of("fundId",fund,"receipt",Map.of("description","Synthetic shortage receipt","totalAmount","70.00","currencyCode","CAD","expenseDate",today.toString()))).records().receipts().getFirst();save("authorize_petty_cash_receipt",Map.of("fundId",fund,"id",receipt.id()));}
        var cut=owner.read(token.user(),"list_petty_cash_statements",query(Map.of("fundId",fund))).records().statements().getFirst();
        var p=actions.preview(token,"close_petty_cash_statement",change(Map.of("fundId",fund,"statementId",cut.id(),"closing",Map.of("action",decision,"closeDate",today.toString(),"reference","Synthetic resolution"))));assertThat(p.effects().getFirst().queuesPayrollDeduction()).isEqualTo(decision.equals("CHARGE_EMPLOYEE"));
        var c=new CommitRequest(p.confirmationToken(),"synthetic-cut-"+decision);actions.commit(token,"close_petty_cash_statement",c);assertThat(actions.commit(token,"close_petty_cash_statement",c).replayed()).isTrue();
        var current=owner.read(token.user(),"get_petty_cash_fund",query(Map.of("id",fund))).records().funds().getFirst();assertThat(current.currentBalanceAmount()).isEqualByComparingTo(decision.equals("CARRY_FORWARD")?"50.00":"0.00");assertBalance(bank,"10000.00");
        if(decision.equals("CARRY_FORWARD"))assertThat(owner.read(token.user(),"list_petty_cash_statements",query(Map.of("fundId",fund))).records().statements()).anySatisfy(s->assertThat(s.openingBalanceAmount()).isEqualByComparingTo("50.00"));
        if(decision.equals("CHARGE_EMPLOYEE")){assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM hr_incentives WHERE company_id=? AND source_type='petty_cash_shortage' AND application_mode='manual_payroll_decision'",Integer.class,company)).isEqualTo(1);}
        var invalidDeposit=change(Map.of("fundId",fund,"statementId",cut.id(),"deposit",Map.of("amount","1.00","currencyCode","CAD","movementDate",today.toString(),"externalSourceName","Synthetic client","reference","Invalid closed cut deposit")));
        assertThatThrownBy(()->nested(()->actions.preview(token,"deposit_petty_cash_fund",invalidDeposit))).hasMessageContaining("closed");
    }
    @Test void stageSchedulingCancellationAndKioskAccessPreserveHistoryAndPrivateCredentials() throws Exception {
        long fund=createFund("INTERNAL_COMPANY");var f=owner.read(token.user(),"get_petty_cash_fund",query(Map.of("id",fund))).records().funds().getFirst();var data=new LinkedHashMap<String,Object>();data.put("name",f.name());data.put("fundType","EXTERNAL_MANAGED");data.put("currencyCode","CAD");data.put("limitAmount","1000.00");data.put("paymentAccountId",f.paymentAccountId());data.put("responsibleUserId",token.user().userId());data.put("externalOwnerType","COMPANY");data.put("externalOwnerName","Synthetic future client");data.put("statementRecipientEmail","synthetic-future@example.test");data.put("externalOwnerRelationship","CLIENT");
        var staged=save("schedule_type_change_petty_cash_fund",Map.of("id",fund,"fund",data,"effectiveDate",today.plusDays(1).toString(),"reason","Synthetic future classification")).records().typeChanges().getFirst();assertThat(staged.status()).isEqualTo("SCHEDULED");assertThat(owner.read(token.user(),"get_petty_cash_fund",query(Map.of("id",fund))).records().funds().getFirst().fundType().name()).isEqualTo("INTERNAL_COMPANY");
        save("cancel_type_change_petty_cash_fund",Map.of("id",fund,"targetId",staged.id(),"reason","Synthetic cancelled stage"));
        var enabled=save("enable_kiosk_petty_cash_fund",Map.of("id",fund,"reason","Synthetic kiosk activation"));assertThat(enabled.records().funds().getFirst().kioskEnabled()).isTrue();assertThat(mapper.writeValueAsString(enabled)).doesNotContain("kioskPublicToken","kioskAccessUrl");assertThat(save("disable_kiosk_petty_cash_fund",Map.of("id",fund,"reason","Synthetic kiosk deactivation")).records().funds().getFirst().kioskEnabled()).isFalse();
    }
    @Test void legacyDraftKeepsPublicResultAndRejectsChangesAfterReview(){
        var draft=expense("Synthetic legacy payable","10.25");var p=legacy.preview(token,"create_expense_draft",draft);var request=new com.indice.erp.ai.finance.AiFinanceActionContracts.CommitRequest(p.confirmationToken(),"synthetic-legacy-draft");var saved=legacy.commit(token,"create_expense_draft",request);assertThat(saved.result()).containsKeys("id","status");assertThat(legacy.commit(token,"create_expense_draft",request).replayed()).isTrue();
        var stale=legacy.preview(token,"create_expense_draft",expense("Synthetic stale legacy","20.00"));
        jdbc.update("UPDATE finance_accounting_accounts SET version=version+1,name='Synthetic changed classification' WHERE company_id=? AND id=?",company,account);
        var staleCommit=new com.indice.erp.ai.finance.AiFinanceActionContracts.CommitRequest(stale.confirmationToken(),"synthetic-legacy-stale");
        assertThatThrownBy(()->nested(()->legacy.commit(token,"create_expense_draft",staleCommit))).hasMessageContaining("Prepare and confirm");
    }
    @Test void confirmationIdentityExpiryAndKeysFailClosedAndRemovedReplayRemainsScoped(){
        var p=actions.preview(token,"create_expense_payable",change(Map.of("expense",expense("Synthetic bound payable","10.00"))));
        var otherConnection=new StoredToken(token.id()+1,token.user(),token.scopes());
        assertThatThrownBy(()->actions.commit(otherConnection,"create_expense_payable",new CommitRequest(p.confirmationToken(),"synthetic-wrong-connection"))).isInstanceOf(Conflict.class);
        var identity=new CommitRequest(p.confirmationToken(),"synthetic-bound-confirmation");long id=actions.commit(token,"create_expense_payable",identity).result().records().expenses().getFirst().id();
        var another=actions.preview(token,"create_expense_payable",change(Map.of("expense",expense("Synthetic different payable","20.00"))));assertThatThrownBy(()->actions.commit(token,"create_expense_payable",new CommitRequest(another.confirmationToken(),identity.idempotencyKey()))).isInstanceOf(Conflict.class);assertThat(count("finance_expenses")).isEqualTo(1);
        jdbc.update("UPDATE ai_action_confirmations SET expires_at=DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 1 MINUTE) WHERE company_id=? AND consumed_at IS NULL",company);
        assertThatThrownBy(()->actions.commit(token,"create_expense_payable",new CommitRequest(another.confirmationToken(),"synthetic-expired-confirmation"))).isInstanceOf(Conflict.class);assertThat(count("finance_expenses")).isEqualTo(1);
        var removal=actions.preview(token,"remove_finance_expense",change(Map.of("id",id,"reason","Synthetic reviewed removal")));var removeIdentity=new CommitRequest(removal.confirmationToken(),"synthetic-removed-replay");actions.commit(token,"remove_finance_expense",removeIdentity);assertThat(actions.commit(token,"remove_finance_expense",removeIdentity).replayed()).isTrue();
        jdbc.update("UPDATE finance_expenses SET unit_id=?,business_id=? WHERE company_id=? AND id=?",unit,business,company,id);
        var denied=new AuthSessionUser(token.user().userId(),company,token.user().userCompanyId(),"Synthetic narrowed operator","admin");
        jdbc.update("INSERT INTO user_work_profiles(company_id,user_id,user_company_id,unit_id,business_id) VALUES(?,?,?,?,?)",company,denied.userId(),denied.userCompanyId(),unit,business);
        // A replay can no longer expose the previous corporate catalog references to a narrower operator.
        assertThatThrownBy(()->actions.commit(new StoredToken(token.id(),denied,token.scopes()),"remove_finance_expense",removeIdentity)).isInstanceOf(SecurityException.class);
    }
    @Test void actualForeignAccountAndExpenseAreNotVisibleOrPayable(){
        String name="Synthetic other company "+UUID.randomUUID();jdbc.update("INSERT INTO companies(name) VALUES(?)",name);long otherCompany=jdbc.queryForObject("SELECT id FROM companies WHERE name=?",Long.class,name);
        jdbc.update("INSERT INTO user_companies(user_id,company_id,role,status,visibility) VALUES(?,?,'root','active','all')",token.user().userId(),otherCompany);long membership=jdbc.queryForObject("SELECT id FROM user_companies WHERE company_id=?",Long.class,otherCompany);
        var actor=new AuthSessionUser(token.user().userId(),otherCompany,membership,"Synthetic other operator","root");long tid=tokens.insert(actor,"generic_mcp","Synthetic other token","test",UUID.randomUUID().toString().replace("-","").repeat(2),Instant.now().plusSeconds(3600),token.scopes());var foreign=new StoredToken(tid,actor,token.scopes());
        var p=actions.preview(foreign,"create_finance_payment_account",change(Map.of("account",Map.of("name","Synthetic foreign bank","type","BANK","currencyCode","CAD","openingBalance","100.00"))));long foreignBank=actions.commit(foreign,"create_finance_payment_account",new CommitRequest(p.confirmationToken(),"synthetic-other-bank")).result().records().paymentAccounts().getFirst().id();
        var data=new LinkedHashMap<>(expense("Synthetic foreign payable","5.00"));data.remove("accountingAccountId");var ep=actions.preview(foreign,"create_expense_payable",change(Map.of("expense",data)));long foreignExpense=actions.commit(foreign,"create_expense_payable",new CommitRequest(ep.confirmationToken(),"synthetic-other-expense")).result().records().expenses().getFirst().id();
        assertThatThrownBy(()->nested(()->owner.read(token.user(),"get_finance_expense",query(Map.of("id",foreignExpense))))).isInstanceOf(RuntimeException.class);
        long local=save("create_expense_payable",Map.of("expense",expense("Synthetic local payable","5.00"))).records().expenses().getFirst().id();
        var foreignPayment=change(Map.of("id",local,"payment",Map.of("amount","5.00","paymentAccountId",foreignBank)));
        assertThatThrownBy(()->nested(()->actions.preview(token,"register_expense_payment",foreignPayment))).isInstanceOf(RuntimeException.class);assertBalance(bank,"10000.00");assertThat(count("finance_expense_payments")).isZero();
    }
    @Test void readsAndPreviewsDoNotPersistFinancialMaintenance(){
        long id=save("create_expense_payable",Map.of("expense",expense("Synthetic untouched overdue","5.00"))).records().expenses().getFirst().id();jdbc.update("UPDATE finance_expenses SET due_date=?,payment_status='UNPAID' WHERE company_id=? AND id=?",today.minusDays(1),company,id);
        long version=jdbc.queryForObject("SELECT version FROM finance_expenses WHERE company_id=? AND id=?",Long.class,company,id);long fund=createFund("EXTERNAL_MANAGED");int statements=count("finance_petty_cash_statements");
        assertThat(owner.read(token.user(),"list_finance_expenses",query(Map.of("overdueOnly",true))).records().expenses().getFirst().paymentStatus().name()).isEqualTo("OVERDUE");owner.read(token.user(),"list_petty_cash_statements",query(Map.of("fundId",fund)));
        actions.preview(token,"correct_finance_expense",change(Map.of("id",id,"expense",expense("Synthetic reviewed correction","6.00"))));
        assertThat(jdbc.queryForObject("SELECT version FROM finance_expenses WHERE company_id=? AND id=?",Long.class,company,id)).isEqualTo(version);assertThat(jdbc.queryForObject("SELECT payment_status FROM finance_expenses WHERE company_id=? AND id=?",String.class,company,id)).isEqualTo("UNPAID");assertThat(count("finance_petty_cash_statements")).isEqualTo(statements);
    }
    @Test void unrelatedCreatesAndDifferentFundsDoNotInvalidateReviewedOperations(){
        var a=actions.preview(token,"create_expense_payable",change(Map.of("expense",expense("Synthetic concurrent payable A","1.25"))));var b=actions.preview(token,"create_expense_payable",change(Map.of("expense",expense("Synthetic concurrent payable B","2.25"))));
        actions.commit(token,"create_expense_payable",new CommitRequest(a.confirmationToken(),"synthetic-concurrent-A"));actions.commit(token,"create_expense_payable",new CommitRequest(b.confirmationToken(),"synthetic-concurrent-B"));assertThat(count("finance_expenses")).isEqualTo(2);
        long one=createFund("EXTERNAL_MANAGED"),two=createFund("EXTERNAL_MANAGED");var receipt=Map.of("description","Synthetic independent fund receipt","totalAmount","1.25","currencyCode","CAD","expenseDate",today.toString());
        var first=actions.preview(token,"capture_petty_cash_receipt",change(Map.of("fundId",one,"receipt",receipt)));var second=actions.preview(token,"capture_petty_cash_receipt",change(Map.of("fundId",two,"receipt",receipt)));
        actions.commit(token,"capture_petty_cash_receipt",new CommitRequest(first.confirmationToken(),"synthetic-fund-independent-A"));actions.commit(token,"capture_petty_cash_receipt",new CommitRequest(second.confirmationToken(),"synthetic-fund-independent-B"));
        assertThat(owner.read(token.user(),"get_petty_cash_fund",query(Map.of("id",two))).records().funds().getFirst().currentBalanceAmount()).isEqualByComparingTo("-1.25");
    }
    private long createFund(String type){long custody=paymentAccount("Synthetic custody "+UUID.randomUUID(),"PETTY_CASH","0.00");var data=new LinkedHashMap<String,Object>();data.put("name","Synthetic fund "+UUID.randomUUID());data.put("fundType",type);data.put("currencyCode","CAD");data.put("limitAmount","1000.00");data.put("paymentAccountId",custody);data.put("responsibleUserId",token.user().userId());if(type.equals("INTERNAL_COMPANY")){data.put("budgetId",budget);data.put("budgetLineId",line);}else{data.put("externalOwnerType","COMPANY");data.put("externalOwnerName","Synthetic client");data.put("externalOwnerRelationship","CLIENT");data.put("statementRecipientEmail","synthetic-client@example.test");}return save("create_petty_cash_fund",Map.of("fund",data)).records().funds().getFirst().id();}
    private long paymentAccount(String name,String type,String amount){return save("create_finance_payment_account",Map.of("account",Map.of("name",name,"type",type,"currencyCode","CAD","openingBalance",amount))).records().paymentAccounts().getFirst().id();}
    private Map<String,Object> expense(String concept,String amount){return Map.of("concept",concept,"accountingAccountId",account,"totalAmount",amount,"currencyCode","CAD","expenseDate",today.toString(),"dueDate",today.plusDays(10).toString());}
    private Result save(String action,Map<String,Object> args){var p=actions.preview(token,action,change(args));return actions.commit(token,action,new CommitRequest(p.confirmationToken(),UUID.randomUUID().toString())).result();}
    private Change change(Map<String,Object> args){return mapper.convertValue(args,Change.class);}
    private Query query(Map<String,Object> args){return mapper.convertValue(args,Query.class);}
    private int count(String table){return jdbc.queryForObject("SELECT COUNT(*) FROM "+table+" WHERE company_id=?",Integer.class,company);}
    private void assertBalance(long id,String amount){assertThat(jdbc.queryForObject("SELECT current_balance FROM finance_payment_accounts WHERE company_id=? AND id=?",BigDecimal.class,company,id)).isEqualByComparingTo(amount);}
    private void nested(Runnable work){var tx=new TransactionTemplate(transactions);tx.setPropagationBehavior(org.springframework.transaction.TransactionDefinition.PROPAGATION_NESTED);tx.execute(s->{work.run();return null;});}
}
