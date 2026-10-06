package com.indice.erp.ai.procurement;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.ai.access.*;
import com.indice.erp.ai.access.AiAccessTokenRepository.StoredToken;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.pos.purchaseorder.assistant.ProcurementAssistantService;
import com.indice.erp.pos.purchaseorder.assistant.ProcurementAssistantContracts.*;
import com.indice.erp.ai.procurement.AiProcurementContracts.CommitRequest;
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
class AiProcurementIntegrationTest {
 @Autowired JdbcTemplate jdbc;@Autowired AiProcurementActionService actions;@Autowired ProcurementAssistantService owner;
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
        ProcurementAssistantService.READS.forEach(t->consent.add(AiProcurementAccess.scope(t)));ProcurementAssistantService.ACTIONS.forEach(t->consent.add(AiProcurementAccess.scope(t)));consent.add("quotes.read");consent.add("quotes.update");
        long tid=tokens.insert(actor,"generic_mcp","Isolated sales regression","test",key.replace("-","").repeat(2),Instant.now().plusSeconds(3600),consent);token=new StoredToken(tid,actor,Set.copyOf(consent));
        when(permissions.canUseProcurementTool(any(),anyString())).thenReturn(true);
        jdbc.update("INSERT INTO finance_providers(company_id,name,status) VALUES (?,'Synthetic supplier','ACTIVE')",company);provider=jdbc.queryForObject("SELECT id FROM finance_providers WHERE company_id=?",Long.class,company);
    }

 @Test void draftRevisionPartialReceiptInvoiceHandoffAndReplayRetainHistory() {
  var preview=actions.preview(token,"create_purchase_order",change(Map.of("draft",draft(5))));assertThat(count("pos_purchase_orders")).isZero();assertThat(count("pos_product_suppliers")).isZero();assertThat(stock()).isEqualByComparingTo("10");
  long order=actions.commit(token,"create_purchase_order",new CommitRequest(preview.confirmationToken(),"purchase-create-001")).result().records().orders().getFirst().id();
  var edited=save("update_purchase_order_draft",Map.of("id",order,"draft",draft(8))).records().orders().getFirst();assertThat(edited.items().getFirst().quantity()).isEqualByComparingTo("8");assertThat(count("pos_purchase_order_revisions")).isEqualTo(1);assertThat(count("pos_purchase_order_items")).isEqualTo(2);
  save("request_purchase_order",Map.of("id",order));save("approve_purchase_order",Map.of("id",order));save("send_purchase_order",Map.of("id",order));
  long item=edited.items().getFirst().id();
  var invoice=save("submit_supplier_invoice",Map.of("invoice",Map.of("providerId",provider,"purchaseOrderId",order,"number","SYNTH-001","subtotal",16,"tax",new BigDecimal("2.08"),"currency","CAD")));assertThat(count("finance_expenses")).isZero();assertThat(invoice.records().invoices().getFirst().totalAmount()).isEqualByComparingTo("18.08");
  var partial=save("receive_purchase_order",Map.of("id",order,"receipt",Map.of("items",List.of(Map.of("orderItemId",item,"receivedQuantity",3)))));assertThat(partial.records().orders().getFirst().status().name()).isEqualTo("PARTIALLY_RECEIVED");assertThat(stock()).isEqualByComparingTo("13");assertThat(count("finance_expenses")).isZero();
  var finalPreview=actions.preview(token,"receive_purchase_order",change(Map.of("id",order,"receipt",Map.of("items",List.of(Map.of("orderItemId",item,"receivedQuantity",5))))));assertThat(finalPreview.finance()).hasSize(1);assertThat(finalPreview.finance().getFirst().createsPendingExpense()).isTrue();assertThat(finalPreview.finance().getFirst().recordsPayment()).isFalse();assertThat(stock()).isEqualByComparingTo("13");
  var request=new CommitRequest(finalPreview.confirmationToken(),"purchase-final-001");assertThat(actions.commit(token,"receive_purchase_order",request).result().records().orders().getFirst().status().name()).isEqualTo("RECEIVED");assertThat(actions.commit(token,"receive_purchase_order",request).replayed()).isTrue();assertThat(stock()).isEqualByComparingTo("18");assertThat(count("pos_purchase_receipts")).isEqualTo(2);assertThat(count("finance_expenses")).isEqualTo(1);assertThat(count("finance_payment_account_movements")).isZero();
  long inv=invoice.records().invoices().getFirst().id();save("review_supplier_invoice",Map.of("id",inv,"status","APPROVED_FOR_PAYMENT","note","Invoice and received goods verified"));
 }
 @Test void duplicateAndExcessiveReceiptCannotChangeStockOrCreateExpense() {
  var o=save("create_purchase_order",Map.of("draft",draft(5))).records().orders().getFirst();save("approve_purchase_order",Map.of("id",o.id()));long item=o.items().getFirst().id();
  assertThatThrownBy(()->actions.preview(token,"receive_purchase_order",change(Map.of("id",o.id(),"receipt",Map.of("items",List.of(Map.of("orderItemId",item,"receivedQuantity",3),Map.of("orderItemId",item,"receivedQuantity",3))))))).isInstanceOf(IllegalArgumentException.class);
  assertThatThrownBy(()->actions.preview(token,"receive_purchase_order",change(Map.of("id",o.id(),"receipt",Map.of("items",List.of(Map.of("orderItemId",item,"receivedQuantity",6))))))).isInstanceOf(IllegalArgumentException.class);
  assertThat(stock()).isEqualByComparingTo("10");assertThat(count("pos_purchase_receipts")).isZero();
  save("cancel_purchase_order",Map.of("id",o.id(),"note","Supplier cannot deliver requested goods"));assertThat(count("pos_purchase_orders")).isEqualTo(1);
 }
 @Test void supplierQuotationReviewAndCatalogLinkConvertExactlyOnce() {
  save("save_product_supplier",Map.of("supplierLink",Map.of("productId",product,"providerId",provider,"cost",2,"currency","CAD")));
  var s=save("create_supplier_submission",Map.of("submission",Map.of("providerId",provider,"currency","CAD","items",List.of(Map.of("productId",product,"name","Quoted catalog product","quantity",4,"unitCost",2))))).records().submissions().getFirst();
  save("review_supplier_submission",Map.of("id",s.id(),"status","APPROVED","note","Supplier quotation accepted"));
  var c=Map.<String,Object>of("id",s.id(),"conversion",Map.of("warehouseId",warehouse,"items",List.of(Map.of("itemId",s.items().getFirst().id(),"decision","LINK_EXISTING","productId",product,"salePrice",100))));
  var preview=actions.preview(token,"convert_supplier_submission",change(c));assertThat(count("pos_purchase_orders")).isZero();assertThat(jdbc.queryForObject("SELECT cost FROM sales_products WHERE company_id=?",BigDecimal.class,company)).isEqualByComparingTo("20");
  var req=new CommitRequest(preview.confirmationToken(),"supplier-conversion-001");var result=actions.commit(token,"convert_supplier_submission",req);assertThat(actions.commit(token,"convert_supplier_submission",req).replayed()).isTrue();assertThat(count("pos_purchase_orders")).isEqualTo(1);assertThat(result.result().records().orders().getFirst().totalAmount()).isEqualByComparingTo("8");assertThat(stock()).isEqualByComparingTo("10");
 }
 @Test void staleSupplierAndForeignScopeFailWithoutConsumingConfirmation() throws Exception {
  var p=actions.preview(token,"create_purchase_order",change(Map.of("draft",draft(5))));jdbc.update("UPDATE finance_providers SET name='Changed supplier' WHERE company_id=?",company);
  assertThatThrownBy(()->nested(()->actions.commit(token,"create_purchase_order",new CommitRequest(p.confirmationToken(),"stale-order-001")))).isInstanceOf(Changed.class);assertThat(count("pos_purchase_orders")).isZero();assertThat(count("ai_action_executions")).isZero();
  var limited=new StoredToken(token.id(),token.user(),Set.of("inventory.read"));assertThatThrownBy(()->actions.preview(limited,"create_purchase_order",change(Map.of("draft",draft(1))))).isInstanceOf(SecurityException.class);
  assertThatThrownBy(()->mapper.readValue("{\"draft\":{\"providerId\":1,\"companyId\":999}}",Change.class)).hasMessageContaining("companyId");
 }
 private Map<String,Object> draft(int quantity){return Map.of("providerId",provider,"warehouseId",warehouse,"currency","CAD","items",List.of(Map.of("productId",product,"quantity",quantity,"unitCost",2,"taxRate",new BigDecimal("0.13"))));}
 private Result save(String action,Map<String,Object> args){var p=actions.preview(token,action,change(args));return actions.commit(token,action,new CommitRequest(p.confirmationToken(),UUID.randomUUID().toString())).result();}
 private Change change(Map<String,Object> args){return mapper.convertValue(args,Change.class);}
 private BigDecimal stock(){return jdbc.queryForObject("SELECT available_quantity FROM sales_inventory_balances WHERE company_id=?",BigDecimal.class,company);}
 private int count(String table){return jdbc.queryForObject("SELECT COUNT(*) FROM "+table+" WHERE company_id=?",Integer.class,company);}
 private void nested(Runnable work){var tx=new TransactionTemplate(transactions);tx.setPropagationBehavior(TransactionDefinition.PROPAGATION_NESTED);tx.execute(s->{work.run();return null;});}
}
