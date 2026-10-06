package com.indice.erp.ai.inventorycatalog;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.ai.access.*;
import com.indice.erp.ai.access.AiAccessTokenRepository.StoredToken;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.pos.purchaseorder.assistant.InventoryCatalogAssistantService;
import com.indice.erp.pos.purchaseorder.assistant.InventoryCatalogAssistantContracts.*;
import com.indice.erp.ai.inventorycatalog.AiInventoryCatalogContracts.CommitRequest;
import java.math.BigDecimal;
import java.time.Instant;
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
class AiInventoryCatalogIntegrationTest {
 @Autowired JdbcTemplate jdbc;@Autowired AiInventoryCatalogActionService actions;@Autowired InventoryCatalogAssistantService owner;
 @Autowired AiAccessTokenRepository tokens;@Autowired ObjectMapper mapper;@Autowired PlatformTransactionManager transactions;
 @MockBean AiToolAuthorizationService permissions;
 long company,user,member,unit,business,customer,product,warehouse,provider;StoredToken token;
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
        InventoryCatalogAssistantService.READS.forEach(t->consent.add(AiInventoryCatalogAccess.scope(t)));InventoryCatalogAssistantService.ACTIONS.forEach(t->consent.add(AiInventoryCatalogAccess.scope(t)));consent.add("quotes.read");consent.add("quotes.update");
        long tid=tokens.insert(actor,"generic_mcp","Isolated sales regression","test",key.replace("-","").repeat(2),Instant.now().plusSeconds(3600),consent);token=new StoredToken(tid,actor,Set.copyOf(consent));
        when(permissions.canUseInventoryCatalogTool(any(),anyString())).thenReturn(true);
        jdbc.update("INSERT INTO finance_providers(company_id,name,status) VALUES (?,'Synthetic supplier','ACTIVE')",company);provider=jdbc.queryForObject("SELECT id FROM finance_providers WHERE company_id=?",Long.class,company);
    }


 @Test void providerMaintenanceUsesOwnerScopeAndKeepsPrivateMetadata() {
  var p=actions.preview(token,"create_inventory_provider",change(Map.of("provider",Map.of("warehouseId",warehouse,"name","Synthetic second supplier","email","supplier@example.test","paymentTermsDays",30))));assertThat(count("finance_providers")).isEqualTo(1);assertThat(p.after().providers().getFirst().businessId()).isEqualTo(business);
  var request=new CommitRequest(p.confirmationToken(),"inventory-provider-001");long id=actions.commit(token,"create_inventory_provider",request).result().records().providers().getFirst().id();assertThat(actions.commit(token,"create_inventory_provider",request).replayed()).isTrue();assertThat(count("finance_providers")).isEqualTo(2);
  jdbc.update("UPDATE finance_providers SET metadata_json=JSON_OBJECT('integrationTag','owner-private') WHERE company_id=? AND id=?",company,id);
  var changed=save("update_inventory_provider",Map.of("id",id,"provider",Map.of("name","Synthetic revised supplier","paymentTermsDays",15)));assertThat(changed.records().providers().getFirst().businessId()).isEqualTo(business);assertThat(jdbc.queryForObject("SELECT JSON_UNQUOTE(JSON_EXTRACT(metadata_json,'$.integrationTag')) FROM finance_providers WHERE company_id=? AND id=?",String.class,company,id)).isEqualTo("owner-private");
  assertThat(save("set_inventory_provider_status",Map.of("id",id,"status","BLOCKED","reason","Supplier requires internal review")).records().providers().getFirst().status()).isEqualTo("BLOCKED");assertThat(count("finance_providers")).isEqualTo(2);
 }
 @Test void discountPreviewIsPureAndPausedRuleCannotApplyToCheckout() {
  var args=Map.<String,Object>of("discount",discountInput());var p=actions.preview(token,"create_inventory_discount",change(args));assertThat(count("pos_discount_rules")).isZero();assertThat(p.after().discounts().getFirst().unitId()).isEqualTo(unit);assertThat(p.after().discounts().getFirst().value()).isEqualByComparingTo("10");
  var request=new CommitRequest(p.confirmationToken(),"inventory-discount-001");long id=actions.commit(token,"create_inventory_discount",request).result().records().discounts().getFirst().id();assertThat(actions.commit(token,"create_inventory_discount",request).replayed()).isTrue();
  var q=mapper.convertValue(Map.of("warehouseId",warehouse,"channel","POS","currency","CAD","amount",100,"evaluationScope","ORDER"),Query.class);var evaluation=owner.read(token.user(),"evaluate_inventory_discounts",q);assertThat(evaluation.records().evaluation()).hasSize(1);assertThat(evaluation.records().evaluation().getFirst().discountAmount()).isEqualByComparingTo("10");
  save("set_inventory_discount_status",Map.of("id",id,"status","PAUSED","reason","Campaign temporarily suspended"));assertThat(owner.read(token.user(),"evaluate_inventory_discounts",q).records().evaluation()).isEmpty();save("set_inventory_discount_status",Map.of("id",id,"status","ARCHIVED","reason","Campaign finished with retained history"));assertThat(count("pos_discount_rules")).isEqualTo(1);
 }
 @Test void staleDiscountAndMissingConsentCannotConsumeReview() throws Exception {
  long id=save("create_inventory_discount",Map.of("discount",discountInput())).records().discounts().getFirst().id();var p=actions.preview(token,"set_inventory_discount_status",change(Map.of("id",id,"status","PAUSED","reason","Synthetic pause reason")));jdbc.update("UPDATE pos_discount_rules SET version=version+1,name='Changed campaign' WHERE company_id=?",company);
  assertThatThrownBy(()->nested(()->actions.commit(token,"set_inventory_discount_status",new CommitRequest(p.confirmationToken(),"stale-discount-001")))).isInstanceOf(Changed.class);
  var limited=new StoredToken(token.id(),token.user(),Set.of("inventory.read"));assertThatThrownBy(()->actions.preview(limited,"create_inventory_discount",change(Map.of("discount",discountInput())))).isInstanceOf(SecurityException.class);
  assertThatThrownBy(()->mapper.readValue("{\"provider\":{\"name\":\"test\",\"unitId\":999}}",Change.class)).hasMessageContaining("unitId");
 }
 @Test void foreignWarehouseCannotAssignProvidersOrDiscounts() {
  assertThatThrownBy(()->actions.preview(token,"create_inventory_provider",change(Map.of("provider",Map.of("warehouseId",warehouse+100000,"name","Foreign synthetic supplier"))))).isInstanceOf(NoSuchElementException.class);assertThat(count("finance_providers")).isEqualTo(1);
 }
 private Map<String,Object> discountInput(){return Map.of("warehouseId",warehouse,"name","Synthetic campaign","description","Synthetic native currency discount","scope","ORDER","discountType","PERCENTAGE","value",10,"currency","CAD","startsAt",Instant.now().minusSeconds(3600).toString(),"endsAt",Instant.now().plusSeconds(3600).toString(),"channels",List.of("POS"));}
 private Result save(String action,Map<String,Object> args){var p=actions.preview(token,action,change(args));return actions.commit(token,action,new CommitRequest(p.confirmationToken(),UUID.randomUUID().toString())).result();}
 private Change change(Map<String,Object> args){return mapper.convertValue(args,Change.class);}
 private int count(String table){return jdbc.queryForObject("SELECT COUNT(*) FROM "+table+" WHERE company_id=?",Integer.class,company);}
 private void nested(Runnable work){var tx=new TransactionTemplate(transactions);tx.setPropagationBehavior(TransactionDefinition.PROPAGATION_NESTED);tx.execute(s->{work.run();return null;});}
}
