package com.indice.erp.ai.salesworkflow;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.ai.access.*;
import com.indice.erp.ai.access.AiAccessTokenRepository.StoredToken;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.sales.SalesWorkflowContracts.*;
import com.indice.erp.sales.SalesWorkflowService;
import com.indice.erp.ai.salesworkflow.AiSalesWorkflowContracts.CommitRequest;
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
class AiSalesWorkflowIntegrationTest {
    @Autowired com.indice.erp.sales.SalesService nativeSales;
    @Autowired JdbcTemplate jdbc;
    @Autowired AiSalesWorkflowActionService actions;
    @Autowired SalesWorkflowService owner;
    @Autowired AiAccessTokenRepository tokens;
    @Autowired ObjectMapper mapper;
    @Autowired PlatformTransactionManager transactions;
    @MockBean AiToolAuthorizationService permissions;
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
        SalesWorkflowService.READS.forEach(t->consent.add(AiSalesWorkflowAccess.scope(t)));SalesWorkflowService.ACTIONS.forEach(t->consent.add(AiSalesWorkflowAccess.scope(t)));consent.add("quotes.read");consent.add("quotes.update");
        long tid=tokens.insert(actor,"generic_mcp","Isolated sales regression","test",key.replace("-","").repeat(2),Instant.now().plusSeconds(3600),consent);token=new StoredToken(tid,actor,Set.copyOf(consent));
        when(permissions.canUseSalesWorkflowTool(any(),anyString())).thenReturn(true);when(permissions.canUseCommercialTool(any(),anyString())).thenReturn(true);
    }
    @Test void savedQuoteConvertsOnceWithOriginalCurrencyAndBecomesWon(){
        var quote=nativeSales.create(company,user,"quotes",Map.of("contactId",customer,"title","Synthetic saved quote","currency","CAD","status","approved","unitId",unit,"businessId",business,"items",List.of(Map.of("productId",product,"description","Synthetic product","quantity",2,"unitPrice",100,"discountPercent",10,"taxPercent",16))));
        long id=((Number)quote.get("id")).longValue();var input=change(Map.of("sale",Map.of("quoteId",id,"warehouseId",warehouse,"currency","CAD")));
        assertThatThrownBy(()->actions.preview(token,"convert_quote_to_sale",change(Map.of("sale",Map.of("quoteId",id,"warehouseId",warehouse,"currency","MXN"))))).isInstanceOf(IllegalArgumentException.class);
        var preview=actions.preview(token,"convert_quote_to_sale",input);assertThat(count("sales_records")).isZero();assertThat(preview.after().sales().getFirst().total()).isEqualByComparingTo("208.80");
        var request=new CommitRequest(preview.confirmationToken(),"quote-conversion-once");var saved=actions.commit(token,"convert_quote_to_sale",request);assertThat(saved.result().records().sales().getFirst().currency()).isEqualTo("CAD");assertThat(stock()).isEqualByComparingTo("8");
        assertThat(actions.commit(token,"convert_quote_to_sale",request).replayed()).isTrue();assertThat(count("sales_records")).isEqualTo(1);assertThat(nativeSales.get(company,"quotes",id).get("status")).isEqualTo("closed_won");
        assertThatThrownBy(()->actions.preview(token,"convert_quote_to_sale",input)).isInstanceOf(IllegalArgumentException.class);
    }
    @Test void nativeSaleApprovalCollectionDeliveryAndCancellationCompleteOnce() {
        var preview=actions.preview(token,"create_commercial_sale",change(Map.of("sale",saleInput(2))));
        assertThat(count("sales_records")).isZero();assertThat(stock()).isEqualByComparingTo("10");
        assertThat(preview.after().sales().getFirst().total()).isEqualByComparingTo("208.80");assertThat(preview.stock().getFirst().ready()).isTrue();
        var request=new CommitRequest(preview.confirmationToken(),"sales-create-001");var result=actions.commit(token,"create_commercial_sale",request);
        long id=result.result().records().sales().getFirst().id();assertThat(actions.commit(token,"create_commercial_sale",request).replayed()).isTrue();assertThat(stock()).isEqualByComparingTo("8");
        save("approve_sale_commercial",Map.of("id",id));
        var collection=actions.preview(token,"confirm_sale_collection",change(Map.of("id",id,"collection",Map.of("paymentMethod","cash"))));
        assertThat(collection.collection().amount()).isEqualByComparingTo("208.80");assertThat(collection.collection().createsUniversalCash()).isTrue();assertThat(count("finance_payment_accounts")).isZero();
        var pay=new CommitRequest(collection.confirmationToken(),"sales-pay-001");actions.commit(token,"confirm_sale_collection",pay);actions.commit(token,"confirm_sale_collection",pay);
        assertThat(count("finance_payment_account_movements")).isEqualTo(1);assertThat(jdbc.queryForObject("SELECT current_balance FROM finance_payment_accounts WHERE company_id=?",BigDecimal.class,company)).isEqualByComparingTo("208.80");
        save("update_sale_delivery",Map.of("id",id,"status","delivered"));
        var cancelled=actions.preview(token,"cancel_commercial_sale",change(Map.of("id",id,"reason","Synthetic full cancellation")));
        assertThat(cancelled.collection().reversesCollection()).isTrue();assertThat(cancelled.collection().amount()).isEqualByComparingTo("-208.80");
        var cancel=new CommitRequest(cancelled.confirmationToken(),"sales-cancel-001");actions.commit(token,"cancel_commercial_sale",cancel);actions.commit(token,"cancel_commercial_sale",cancel);
        assertThat(stock()).isEqualByComparingTo("10");assertThat(count("finance_payment_account_movements")).isEqualTo(2);assertThat(count("sales_records")).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT current_balance FROM finance_payment_accounts WHERE company_id=?",BigDecimal.class,company)).isZero();
    }
    @Test void fullReservedPopulationKeepsSalePendingAndExplicitStockCannotOverspend() {
        jdbc.update("UPDATE sales_inventory_balances SET reserved_quantity=9 WHERE company_id=?",company);
        var preview=actions.preview(token,"create_commercial_sale",change(Map.of("sale",saleInput(2))));assertThat(preview.stock().getFirst().ready()).isFalse();
        long id=actions.commit(token,"create_commercial_sale",new CommitRequest(preview.confirmationToken(),"pending-sale-001")).result().records().sales().getFirst().id();
        assertThat(stock()).isEqualByComparingTo("10");assertThat(count("sales_inventory_movements")).isZero();
        assertThatThrownBy(()->actions.preview(token,"confirm_sale_inventory",change(Map.of("id",id)))).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(()->actions.preview(token,"confirm_sale_collection",change(Map.of("id",id,"collection",Map.of("paymentMethod","cash"))))).isInstanceOf(IllegalArgumentException.class);
    }
    @Test void staleProductStockOrConsentRollsBackEveryOwnerEffectAndConfirmation() {
        var p=actions.preview(token,"create_commercial_sale",change(Map.of("sale",saleInput(2))));
        jdbc.update("UPDATE sales_inventory_balances SET reserved_quantity=2 WHERE company_id=?",company);
        assertThatThrownBy(()->nested(()->actions.commit(token,"create_commercial_sale",new CommitRequest(p.confirmationToken(),"stale-sale-001")))).isInstanceOf(Changed.class);
        assertThat(count("sales_records")).isZero();assertThat(count("ai_action_executions")).isZero();assertThat(stock()).isEqualByComparingTo("10");
        var reduced=new StoredToken(token.id(),token.user(),Set.of("sales.read"));
        assertThatThrownBy(()->actions.commit(reduced,"create_commercial_sale",new CommitRequest(p.confirmationToken(),"stale-sale-001"))).isInstanceOf(SecurityException.class);
        assertThatThrownBy(()->mapper.readValue("{\"sale\":{\"customerId\":1,\"companyId\":999}}",Change.class)).hasMessageContaining("companyId");
    }
    @Test void contractFollowUpAndCommissionPolicyAreExplicitWithoutInventedSignatures() {
        long contract=save("create_sales_contract",Map.of("contract",Map.of("customerId",customer,"title","Synthetic service","contractType","service_agreement","country","CA"))).records().contracts().getFirst().id();
        var reviewed=save("review_sales_contract",Map.of("id",contract)).records().contracts().getFirst();assertThat(reviewed.status()).isEqualTo("internal_review");assertThat(reviewed.signatureStatus()).isEqualTo("not_requested");
        save("cancel_sales_contract",Map.of("id",contract,"reason","Synthetic reviewed cancellation"));
        long follow=save("create_sales_follow_up",Map.of("followUp",Map.of("customerId",customer,"relationType","recurrent_customer","postSaleType","support","nextFollowUpDate",LocalDate.now().plusDays(2).toString()))).records().followUps().getFirst().id();
        assertThat(save("set_sales_follow_up_status",Map.of("id",follow,"status","completed")).records().followUps().getFirst().status()).isEqualTo("completed");
        long rule=save("create_commission_rule",Map.of("rule",Map.of("name","Synthetic commission","type","percentage_of_sale","value",5,"userCompanyIds",List.of(member),"productIds",List.of(product)))).records().rules().getFirst().id();
        assertThat(save("set_commission_rule_status",Map.of("id",rule,"status","inactive")).records().rules().getFirst().status()).isEqualTo("inactive");
        assertThat(count("sales_records")).isZero();assertThat(count("finance_payment_account_movements")).isZero();
    }
    @Test void foreignAndReassignedRecordsCannotBeReadOrReplayed() {
        long id=save("create_commercial_sale",Map.of("sale",saleInput(1))).records().sales().getFirst().id();
        var foreign=new AuthSessionUser(user,company+100000,member,"Foreign","root");
        assertThatThrownBy(()->owner.read(foreign,"get_commercial_sale",new Query(id,null,null,null,null,null,null))).isInstanceOf(NoSuchElementException.class);
        var scoped=new AuthSessionUser(user,company,member,"Restricted","manager");
        assertThatThrownBy(()->owner.read(scoped,"get_commercial_sale",new Query(id,null,null,null,null,null,null))).isInstanceOf(SecurityException.class);
    }
    private Map<String,Object> saleInput(int qty) {return Map.of("customerId",customer,"warehouseId",warehouse,"date",LocalDate.now().toString(),"currency","CAD","items",List.of(Map.of("productId",product,"quantity",qty,"unitPrice",100,"discountPercent",10,"taxPercent",16)));}
    private Result save(String action,Map<String,Object> args) {var p=actions.preview(token,action,change(args));return actions.commit(token,action,new CommitRequest(p.confirmationToken(),UUID.randomUUID().toString())).result();}
    private Change change(Map<String,Object> args) {return mapper.convertValue(args,Change.class);}
    private BigDecimal stock() {return jdbc.queryForObject("SELECT available_quantity FROM sales_inventory_balances WHERE company_id=?",BigDecimal.class,company);}
    private int count(String table) {return jdbc.queryForObject("SELECT COUNT(*) FROM "+table+" WHERE company_id=?",Integer.class,company);}
    private void nested(Runnable work) {var tx=new TransactionTemplate(transactions);tx.setPropagationBehavior(TransactionDefinition.PROPAGATION_NESTED);tx.execute(s->{work.run();return null;});}
}
