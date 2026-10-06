package com.indice.erp.ai.commission;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.ai.access.*;
import com.indice.erp.ai.access.AiAccessTokenRepository.StoredToken;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.sales.SalesCommissionAssistantContracts.*;
import com.indice.erp.sales.SalesCommissionAssistantService;
import com.indice.erp.exchange.*;
import com.indice.erp.sales.SalesWorkflowService;
import com.indice.erp.ai.commission.AiCommissionContracts.CommitRequest;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

@SpringBootTest(properties={"app.email.enabled=false","app.entitlements.projection-enabled=false"})
@Transactional
class AiCommissionIntegrationTest {
    @Autowired JdbcTemplate jdbc;
    @Autowired AiCommissionActionService actions;
    @Autowired SalesCommissionAssistantService owner;
    @Autowired AiAccessTokenRepository tokens;
    @Autowired ObjectMapper mapper;
    @Autowired PlatformTransactionManager transactions;
    @MockBean AiToolAuthorizationService permissions;
    @MockBean BusinessExchangeRateService exchange;
    @Autowired SalesWorkflowService sales;
    long company,user,member,unit,business,customer,product,warehouse;
    StoredToken token;
    @BeforeEach void setup() {
        assertThat(jdbc.queryForObject("SELECT DATABASE()",String.class)).contains("test").isNotEqualTo("corazon_testers");
        String key=UUID.randomUUID().toString();jdbc.update("INSERT INTO companies(name) VALUES (?)","Synthetic sales "+key);
        company=jdbc.queryForObject("SELECT id FROM companies WHERE name=?",Long.class,"Synthetic sales "+key);
        jdbc.update("INSERT INTO users(email,password_hash,full_name) VALUES (?,'test','Synthetic sales operator')",key+"@example.test");user=jdbc.queryForObject("SELECT id FROM users WHERE email=?",Long.class,key+"@example.test");
        jdbc.update("INSERT INTO user_companies(user_id,company_id,role,status,visibility) VALUES (?,?,'root','active','all')",user,company);member=jdbc.queryForObject("SELECT id FROM user_companies WHERE company_id=?",Long.class,company);
        jdbc.update("INSERT INTO units(company_id,name,status) VALUES (?,'Synthetic sales unit','active')",company);unit=jdbc.queryForObject("SELECT id FROM units WHERE company_id=?",Long.class,company);
        jdbc.update("INSERT INTO businesses(company_id,unit_id,name,status) VALUES (?,?,'Synthetic sales business','active')",company,unit);business=jdbc.queryForObject("SELECT id FROM businesses WHERE company_id=?",Long.class,company);
        jdbc.update("INSERT INTO sales_contacts(company_id,contact_code,company_name,status,unit_id,business_id) VALUES (?,'C-TEST','Synthetic customer','active',?,?)",company,unit,business);customer=jdbc.queryForObject("SELECT id FROM sales_contacts WHERE company_id=?",Long.class,company);
        jdbc.update("INSERT INTO sales_products(company_id,product_code,sku,name,type,currency,price,cost,inventory_ready,status) VALUES (?,'P-TEST','SKU-TEST','Synthetic product','PRODUCT','CAD',100,20,1,'active')",company);product=jdbc.queryForObject("SELECT id FROM sales_products WHERE company_id=?",Long.class,company);
        jdbc.update("INSERT INTO sales_inventory_warehouses(company_id,warehouse_code,name,type,status,business_unit_id,business_id) VALUES (?,'W-TEST','Synthetic warehouse','main','active',?,?)",company,unit,business);warehouse=jdbc.queryForObject("SELECT id FROM sales_inventory_warehouses WHERE company_id=?",Long.class,company);
        jdbc.update("INSERT INTO sales_inventory_balances(company_id,balance_code,product_id,warehouse_id,warehouse_name,available_quantity,unit_cost,uses_inventory) VALUES (?,'B-TEST',?,?,'Synthetic warehouse',10,20,1)",company,product,warehouse);
        var actor=new AuthSessionUser(user,company,member,"Synthetic sales operator","root");var consent=new HashSet<String>();
        SalesCommissionAssistantService.READS.forEach(t->consent.add(AiCommissionAccess.scope(t)));SalesCommissionAssistantService.ACTIONS.forEach(t->consent.add(AiCommissionAccess.scope(t)));consent.add("hr.incentives.manage");
        long tid=tokens.insert(actor,"generic_mcp","Isolated sales regression","test",key.replace("-","").repeat(2),Instant.now().plusSeconds(3600),consent);token=new StoredToken(tid,actor,Set.copyOf(consent));
        when(permissions.canUseCommissionTool(any(),anyString())).thenReturn(true);when(permissions.canReadGuideTab(any(),eq("human_resources"),eq("incentives"))).thenReturn(true);
        when(exchange.cachedDailyRates()).thenReturn(Optional.of(new BusinessExchangeRatesResponse("USD",Map.of("USD",BigDecimal.ONE,"CAD",new BigDecimal("1.36"),"MXN",new BigDecimal("18.45")),new BusinessExchangeRateMetadataResponse("snapshot","test",java.time.LocalDate.now().toString(),Instant.now().toString(),"Synthetic isolated evidence",null,null,null),List.of(),List.of())));
    }

    @Test void cutReviewsNativeAmountsThenCreatesOnePayrollApplicationWithoutPayment() {
        long sale=seedSale();var input=cutInput();var p=actions.preview(token,"create_sales_commission_cut",change(Map.of("cut",input)));
        assertThat(count("sales_commission_cuts")).isZero();assertThat(count("hr_incentives")).isZero();assertThat(p.incentives()).hasSize(1);assertThat(p.incentives().getFirst().amount()).isEqualByComparingTo("10.25");assertThat(p.incentives().getFirst().saleIds()).containsExactly(sale);assertThat(p.monetarySummary().preferredTotal()).isEqualByComparingTo("10.25");
        var request=new CommitRequest(p.confirmationToken(),"commission-cut-001");var output=actions.commit(token,"create_sales_commission_cut",request);assertThat(output.result().records().cuts().getFirst().status()).isEqualTo("sent_to_hr");assertThat(output.result().records().cuts().getFirst().currencyTotals()).containsEntry("CAD",new BigDecimal("10.25"));assertThat(actions.commit(token,"create_sales_commission_cut",request).replayed()).isTrue();assertThat(count("sales_commission_cuts")).isEqualTo(1);assertThat(count("sales_commission_cut_items")).isEqualTo(1);assertThat(count("hr_incentives")).isEqualTo(1);assertThat(count("hr_incentive_applications")).isEqualTo(1);assertThat(count("finance_payment_account_movements")).isZero();verify(exchange,never()).loadDailyRates();
        assertThatThrownBy(()->actions.preview(token,"create_sales_commission_cut",change(Map.of("cut",input)))).isInstanceOf(IllegalArgumentException.class);
    }
    @Test void commissionScheduleCanBeUpdatedAndPausedWithoutDeletingHistory() {
        var p=actions.preview(token,"create_sales_commission_schedule",change(Map.of("schedule",Map.of("name","Synthetic monthly cut","cadence","monthly","preferredCurrency","CAD","status","paused"))));assertThat(count("sales_commission_cut_schedules")).isZero();
        long id=actions.commit(token,"create_sales_commission_schedule",new CommitRequest(p.confirmationToken(),"commission-schedule-001")).result().records().schedules().getFirst().id();var changed=actions.preview(token,"set_sales_commission_schedule_status",change(Map.of("id",id,"status","active","reason","Enable reviewed monthly schedule")));actions.commit(token,"set_sales_commission_schedule_status",new CommitRequest(changed.confirmationToken(),"commission-schedule-002"));assertThat(owner.read(token.user(),"get_sales_commission_schedule",new Query(id,null,null,null)).records().schedules().getFirst().status()).isEqualTo("active");assertThat(count("sales_commission_cut_schedules")).isEqualTo(1);
    }
    @Test void staleCandidateAndMissingHrConsentCannotCreateCut() {
        long sale=seedSale();var p=actions.preview(token,"create_sales_commission_cut",change(Map.of("cut",cutInput())));jdbc.update("UPDATE sales_records SET commission_amount=11 WHERE company_id=? AND id=?",company,sale);
        var tx=new TransactionTemplate(transactions);tx.setPropagationBehavior(TransactionDefinition.PROPAGATION_NESTED);assertThatThrownBy(()->tx.execute(s->actions.commit(token,"create_sales_commission_cut",new CommitRequest(p.confirmationToken(),"commission-stale-001")))).isInstanceOf(IllegalStateException.class);assertThat(count("sales_commission_cuts")).isZero();
        var limited=new StoredToken(token.id(),token.user(),Set.of("sales.commissions.cut"));assertThatThrownBy(()->actions.preview(limited,"create_sales_commission_cut",change(Map.of("cut",cutInput())))).isInstanceOf(SecurityException.class);jdbc.update("UPDATE sales_records SET commercial_status='cancelled' WHERE company_id=? AND id=?",company,sale);assertThatThrownBy(()->actions.preview(token,"create_sales_commission_cut",change(Map.of("cut",cutInput())))).isInstanceOf(IllegalArgumentException.class);
    }
    private Map<String,Object> cutInput(){String date=java.time.LocalDate.now().toString();return Map.of("periodStart",date,"periodEnd",date,"preferredCurrency","CAD");}
    private long seedSale(){var input=mapper.convertValue(Map.of("sale",Map.of("customerId",customer,"warehouseId",warehouse,"date",java.time.LocalDate.now().toString(),"currency","CAD","items",List.of(Map.of("productId",product,"quantity",1,"unitPrice",100,"discountPercent",0,"taxPercent",0)))),com.indice.erp.sales.SalesWorkflowContracts.Change.class);long id=sales.execute(token.user(),sales.prepare(token.user(),"create_commercial_sale",input),UUID.randomUUID().toString()).records().sales().getFirst().id();jdbc.update("UPDATE sales_records SET commission_amount=10.25,commission_status='calculated',seller_user_company_id=? WHERE company_id=? AND id=?",member,company,id);return id;}
    private Change change(Map<String,Object> v){return mapper.convertValue(v,Change.class);}
    private int count(String table){return jdbc.queryForObject("SELECT COUNT(*) FROM "+table+" WHERE company_id=?",Integer.class,company);}
}
