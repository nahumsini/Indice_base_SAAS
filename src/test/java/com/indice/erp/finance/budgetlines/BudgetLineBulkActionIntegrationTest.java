package com.indice.erp.finance.budgetlines;

import static org.assertj.core.api.Assertions.*;
import com.indice.erp.finance.budgetlines.dto.BudgetLineBulkActionRequest;
import com.indice.erp.finance.budgetlines.dto.BudgetLineBulkActionRequest.Action;
import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.shared.FinanceScope;
import com.indice.erp.kpis.currency.BasicModuleKpiCurrencyRepository;
import com.indice.erp.kpis.currency.BasicModuleKpiMetric;
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
class BudgetLineBulkActionIntegrationTest {
    @Autowired JdbcTemplate jdbc;
    @Autowired BudgetLineBulkActionService service;
    @Autowired BasicModuleKpiCurrencyRepository totals;

    @ParameterizedTest @ValueSource(strings={"MXN","USD","CAD","COP","BRL"})
    void classificationPreservesMoneyDatesExecutionAndCustomFields(String currency) {
        var f=fixture(); long id=line(f,currency,"ACTIVE"), provider=provider(f);
        jdbc.update("UPDATE finance_budget_lines SET actual_expense_amount=30,available_amount=70 WHERE id=?",id);
        var before=jdbc.queryForMap("SELECT planned_amount,committed_amount,actual_expense_amount,available_amount,currency_code,status,budget_id FROM finance_budget_lines WHERE id=?",id);
        var saved=service.apply(f.context,request(Action.PROVIDER,provider,id)).budgetLines().getFirst();
        assertThat(saved.customFields().path("providerId").asLong()).isEqualTo(provider);
        assertThat(saved.customFields().path("providerName").asText()).isEqualTo("Budget supplier");
        assertThat(saved.customFields().path("dueDate").asText()).isEqualTo("2026-09-30");
        assertThat(saved.customFields().path("unrelated").asText()).isEqualTo("keep");
        assertThat(saved.metadata().path("source").asText()).isEqualTo("test");
        assertThat(saved.metadata().path("bulkAdjustments")).hasSize(1);
        assertThat(jdbc.queryForMap("SELECT planned_amount,committed_amount,actual_expense_amount,available_amount,currency_code,status,budget_id FROM finance_budget_lines WHERE id=?",id)).isEqualTo(before);
    }

    @Test void accountingAccountUsesServerLabelAndCanBeCleared() {
        var f=fixture(); long id=line(f,"MXN","ACTIVE"), account=account(f);
        var saved=service.apply(f.context,request(Action.ACCOUNTING_ACCOUNT,account,id)).budgetLines().getFirst();
        assertThat(saved.customFields().path("accountingAccount").asText()).isEqualTo("TEST-BUD - Budget account");
        service.apply(f.context,new BudgetLineBulkActionRequest(Action.ACCOUNTING_ACCOUNT,List.of(new BudgetLineBulkActionRequest.Selection(id,1L)),null,null));
        assertThat(jdbc.queryForObject("SELECT JSON_TYPE(JSON_EXTRACT(custom_fields_json,'$.accountingAccount')) FROM finance_budget_lines WHERE id=?",String.class,id)).isEqualTo("NULL");
    }

    @Test void oneStaleOrClosedRowPreventsTheEntireBatch() {
        var f=fixture(); long a=line(f,"MXN","ACTIVE"), b=line(f,"MXN","CLOSED");
        assertThatThrownBy(() -> service.apply(f.context,request(Action.PROVIDER,provider(f),a,b))).hasMessageContaining("Closed or archived");
        assertThat(value(a,"version")).isEqualTo(0L);
        jdbc.update("UPDATE finance_budget_lines SET status='ACTIVE',version=1 WHERE id=?",b);
        assertThatThrownBy(() -> service.apply(f.context,request(Action.DELETE,null,a,b))).hasMessageContaining("changed");
        assertThat(value(a,"deleted_at")).isNull();
        assertThat(String.valueOf(value(a,"metadata_json"))).doesNotContain("bulkAdjustments");
    }

    @Test void foreignRowsAndReferencesAreRejectedBeforeAnyWrite() {
        var f=fixture(); var other=fixture(); long a=line(f,"MXN","ACTIVE"), b=line(other,"MXN","ACTIVE");
        assertThatThrownBy(() -> service.apply(f.context,request(Action.PROVIDER,provider(f),a,b))).hasMessageContaining("not found");
        assertThatThrownBy(() -> service.apply(f.context,request(Action.PROVIDER,provider(other),a))).hasMessageContaining("this company");
        assertThatThrownBy(() -> service.apply(f.context,request(Action.ACCOUNTING_ACCOUNT,account(other),a))).hasMessageContaining("this company");
        assertThat(value(a,"version")).isEqualTo(0L);
    }

    @Test void deletesAreAtomicSoftDeletesWithReasonAndReplayProtection() {
        var f=fixture(); long a=line(f,"MXN","ACTIVE"), b=line(f,"MXN","DRAFT");
        assertThat(service.apply(f.context,request(Action.DELETE,null,a,b)).budgetLines()).isEmpty();
        assertThat(value(a,"deleted_at")).isNotNull(); assertThat(value(b,"deleted_at")).isNotNull();
        assertThat(String.valueOf(value(a,"metadata_json"))).contains("Isolated budget regression");
        assertThatThrownBy(() -> service.apply(f.context,request(Action.DELETE,null,a))).hasMessageContaining("not found");
    }

    @Test void financialExecutionBlocksDeletionAndOrganizationalMoves() {
        var f=fixture(); long a=line(f,"MXN","ACTIVE"), b=line(f,"MXN","ACTIVE");
        jdbc.update("UPDATE finance_budget_lines SET committed_amount=1 WHERE id=?",b);
        for(var action:List.of(Action.DELETE,Action.UNIT,Action.BUSINESS))
            assertThatThrownBy(() -> service.apply(f.context,request(action,null,a,b))).hasMessageContaining("execution");
        assertThat(value(a,"version")).isEqualTo(0L);
        assertThat(value(a,"deleted_at")).isNull();
    }

    @Test void unitsAndBusinessesRespectScopeAndDependencies() {
        var f=fixture(); long a=line(f,"MXN","ACTIVE"), unit=unit(f), next=unit(f), business=business(f,unit);
        jdbc.update("UPDATE finance_budget_lines SET unit_id=?,business_id=? WHERE id=?",unit,business,a);
        var narrow=new FinanceContext(f.context.userId(),f.context.companyId(),"Test","admin",true,FinanceScope.unitHeadquarters(unit));
        assertThatThrownBy(() -> service.apply(narrow,request(Action.UNIT,next,a))).hasMessageContaining("company-wide");
        var moved=service.apply(f.context,request(Action.UNIT,next,a)).budgetLines().getFirst();
        assertThat(moved.unitId()).isEqualTo(next); assertThat(moved.businessId()).isNull();
    }

    @Test void businessMustMatchEveryLineAndNarrowScopeCannotReadOtherLines() {
        var f=fixture(); long a=line(f,"MXN","ACTIVE"), b=line(f,"MXN","ACTIVE"), unit=unit(f), other=unit(f), business=business(f,unit);
        jdbc.update("UPDATE finance_budget_lines SET unit_id=? WHERE id=?",unit,a);
        jdbc.update("UPDATE finance_budget_lines SET unit_id=? WHERE id=?",other,b);
        assertThatThrownBy(() -> service.apply(f.context,request(Action.BUSINESS,business,a,b))).hasMessageContaining("unit of every");
        var narrow=new FinanceContext(f.context.userId(),f.context.companyId(),"Test","admin",true,FinanceScope.unitHeadquarters(unit));
        assertThatThrownBy(() -> service.apply(narrow,request(Action.PROVIDER,provider(f),b))).hasMessageContaining("not found");
        assertThat(value(a,"business_id")).isNull();
    }

    @Test void explicitMonetarySelectionsIncludeClosedAndDraftWhileGlobalPlanningRemainsActiveOnly() {
        var f=fixture(); long a=line(f,"MXN","ACTIVE"), b=line(f,"USD","CLOSED"), c=line(f,"CAD","DRAFT");
        for(var metric:List.of(BasicModuleKpiMetric.BUDGET_PLANNED,BasicModuleKpiMetric.BUDGET_COMMITTED,BasicModuleKpiMetric.BUDGET_ACTUAL,BasicModuleKpiMetric.BUDGET_AVAILABLE)) {
            assertThat(totals.load(metric,f.context.companyId(),null,null,List.of(a,b,c),true)).hasSize(3);
            assertThat(totals.load(metric,f.context.companyId(),null,null,List.of(),true)).isEmpty();
        }
        assertThat(totals.load(BasicModuleKpiMetric.BUDGET_PLANNED,f.context.companyId(),null,null,List.of(),false)).hasSize(1);
        var other=fixture();
        assertThat(totals.load(BasicModuleKpiMetric.BUDGET_PLANNED,other.context.companyId(),null,null,List.of(a,b,c),true)).isEmpty();
    }

    @Test void duplicatesInvalidVersionsAndMissingDeleteReasonAreRejected() {
        var f=fixture();long a=line(f,"MXN","ACTIVE");
        assertThatThrownBy(() -> service.apply(f.context,request(Action.DELETE,null,a,a))).hasMessageContaining("duplicate");
        assertThatThrownBy(() -> service.apply(f.context,new BudgetLineBulkActionRequest(Action.DELETE,List.of(new BudgetLineBulkActionRequest.Selection(a,0L)),null,""))).hasMessageContaining("reason");
        assertThat(value(a,"deleted_at")).isNull();
    }

    private BudgetLineBulkActionRequest request(Action action,Long target,long... ids) {
        return new BudgetLineBulkActionRequest(action,java.util.Arrays.stream(ids).mapToObj(id -> new BudgetLineBulkActionRequest.Selection(id,0L)).toList(),target,"Isolated budget regression");
    }
    private Fixture fixture() {
        String key=UUID.randomUUID().toString();jdbc.update("INSERT INTO companies(name) VALUES (?)",key);long company=id("companies","name",key);
        jdbc.update("INSERT INTO users(email,password_hash) VALUES (?,'isolated-no-login')",key+"@example.test");long user=id("users","email",key+"@example.test");
        jdbc.update("INSERT INTO finance_budgets(company_id,name,period_start,period_end,status,currency_code) VALUES (?,?,'2026-01-01','2026-12-31','ACTIVE','MXN')",company,key);
        return new Fixture(new FinanceContext(user,company,"Test","admin",true,FinanceScope.corporateOffice()),id("finance_budgets","name",key));
    }
    private long line(Fixture f,String currency,String status) {
        String key=UUID.randomUUID().toString();
        jdbc.update("INSERT INTO finance_budget_lines(company_id,budget_id,name,planned_amount,available_amount,health_status,currency_code,status,custom_fields_json,metadata_json) VALUES (?,?,?,100,100,'ON_TRACK',?,?,JSON_OBJECT('dueDate','2026-09-30','unrelated','keep'),JSON_OBJECT('source','test'))",f.context.companyId(),f.budget,key,currency,status);
        return id("finance_budget_lines","name",key);
    }
    private long provider(Fixture f) {
        jdbc.update("INSERT INTO finance_providers(company_id,name,status) VALUES (?,'Budget supplier','ACTIVE')",f.context.companyId());
        return jdbc.queryForObject("SELECT MAX(id) FROM finance_providers WHERE company_id=?",Long.class,f.context.companyId());
    }
    private long account(Fixture f) {
        jdbc.update("INSERT INTO finance_accounting_accounts(company_id,code,name,group_key,status) VALUES (?,'TEST-BUD','Budget account','EXPENSE','ACTIVE')",f.context.companyId());
        return jdbc.queryForObject("SELECT id FROM finance_accounting_accounts WHERE company_id=? AND code='TEST-BUD'",Long.class,f.context.companyId());
    }
    private long unit(Fixture f) {String key=UUID.randomUUID().toString();jdbc.update("INSERT INTO units(company_id,name) VALUES (?,?)",f.context.companyId(),key);return id("units","name",key);}
    private long business(Fixture f,long unit) {String key=UUID.randomUUID().toString();jdbc.update("INSERT INTO businesses(company_id,unit_id,name) VALUES (?,?,?)",f.context.companyId(),unit,key);return id("businesses","name",key);}
    private long id(String table,String field,String value) {return jdbc.queryForObject("SELECT id FROM "+table+" WHERE "+field+"=?",Long.class,value);}
    private Object value(long id,String column) {return jdbc.queryForObject("SELECT "+column+" FROM finance_budget_lines WHERE id=?",Object.class,id);}
    private record Fixture(FinanceContext context,long budget) {}
}
