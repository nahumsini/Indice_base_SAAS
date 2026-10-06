package com.indice.erp.ai.pos;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.ai.access.*;
import com.indice.erp.ai.access.AiAccessTokenRepository.StoredToken;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.pos.assistant.PosAssistantService;
import com.indice.erp.pos.assistant.PosAssistantContracts.*;
import com.indice.erp.ai.pos.AiPosContracts.CommitRequest;
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
class AiPosIntegrationTest {
 @Autowired JdbcTemplate jdbc;@Autowired AiPosActionService actions;@Autowired PosAssistantService owner;
 @Autowired AiAccessTokenRepository tokens;@Autowired ObjectMapper mapper;@Autowired PlatformTransactionManager transactions;
 @Autowired com.indice.erp.ai.posoperations.AiPosOperationsActionService operationActions;
 @Autowired com.indice.erp.pos.assistant.PosOperationsService operations;
 @Autowired com.indice.erp.pos.selfservice.SelfServiceKioskService kiosks;
 @Autowired com.indice.erp.pos.selfservice.SelfServiceKioskRepository kioskRows;
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
        PosAssistantService.READS.forEach(t->consent.add(AiPosAccess.scope(t)));PosAssistantService.ACTIONS.forEach(t->consent.add(AiPosAccess.scope(t)));consent.add("pos.settlements.manage");consent.add("pos.orders.manage");consent.add("quotes.read");consent.add("quotes.update");
        long tid=tokens.insert(actor,"generic_mcp","Isolated sales regression","test",key.replace("-","").repeat(2),Instant.now().plusSeconds(3600),consent);token=new StoredToken(tid,actor,Set.copyOf(consent));
        when(permissions.canUsePosWorkflowTool(any(),anyString())).thenReturn(true);when(permissions.canUsePosOperationsTool(any(),anyString())).thenReturn(true);
        jdbc.update("INSERT INTO finance_providers(company_id,name,status) VALUES (?,'Synthetic supplier','ACTIVE')",company);provider=jdbc.queryForObject("SELECT id FROM finance_providers WHERE company_id=?",Long.class,company);
    }

 @Test void ticketHistoryRemainsCompletePastTheLegacyThreeHundredRowLimit(){
    long register=save("create_pos_register",Map.of("register",Map.of("name","History register","warehouseId",warehouse))).records().registers().getFirst().id();long shift=save("open_pos_shift",Map.of("opening",Map.of("cashRegisterId",register,"openingAmount",0,"currency","CAD"))).records().shifts().getFirst().id();
    for(int i=0;i<315;i++)jdbc.update("INSERT INTO pos_tickets(company_id,warehouse_id,cash_register_id,shift_id,ticket_number,status,currency_code,created_by_user_id,unit_id,business_id) VALUES (?,?,?,?,?,'COMPLETED','CAD',?,?,?)",company,warehouse,register,shift,"HISTORY-"+i,user,unit,business);
    String cursor=null;var ids=new HashSet<Long>();int pages=0;
    do {var page=owner.read(token.user(),"list_pos_tickets",new Query(null,shift,register,null,null,50,cursor,null));assertThat(page.totalCount()).isEqualTo(315);assertThat(page.records().tickets()).hasSizeLessThanOrEqualTo(50);page.records().tickets().forEach(t->assertThat(ids.add(t.id())).isTrue());cursor=page.nextCursor();pages++;}while(cursor!=null);
    assertThat(ids).hasSize(315);assertThat(pages).isEqualTo(7);
 }
 @Test void registerOpenCashCheckoutReturnPaidReceiptReversalAndCloseCompleteOnce() throws Exception {
  var registerPreview=actions.preview(token,"create_pos_register",change(Map.of("register",Map.of("warehouseId",warehouse,"name","Synthetic register","settlementCurrency","CAD"))));
  assertThat(count("pos_cash_registers")).isZero();assertThat(count("finance_payment_accounts")).isZero();
  long register=actions.commit(token,"create_pos_register",new CommitRequest(registerPreview.confirmationToken(),"pos-register-001")).result().records().registers().getFirst().id();
  long shift=save("open_pos_shift",Map.of("opening",Map.of("cashRegisterId",register,"openingAmount",500,"currency","CAD"))).records().shifts().getFirst().id();
  save("record_pos_cash_movement",Map.of("cash",Map.of("shiftId",shift,"cashRegisterId",register,"type","CASH_IN","amount",50,"currency","CAD","reason","Synthetic cash deposit")));
  var checkout=actions.preview(token,"complete_pos_checkout",change(Map.of("checkout",checkout(register,2))));assertThat(checkout.checkout().totals().totalAmount()).isEqualByComparingTo("200");
  assertThat(count("pos_tickets")).isZero();assertThat(stock()).isEqualByComparingTo("10");
  var request=new CommitRequest(checkout.confirmationToken(),"pos-checkout-001");var result=actions.commit(token,"complete_pos_checkout",request);long ticket=result.result().records().tickets().getFirst().id();
  assertThat(actions.commit(token,"complete_pos_checkout",request).replayed()).isTrue();assertThat(count("pos_tickets")).isEqualTo(1);assertThat(stock()).isEqualByComparingTo("8");assertThat(cash(shift)).isEqualByComparingTo("750");
  var recovered=owner.read(token.user(),"recover_pos_checkout",new Query(null,null,null,null,null,null,null,result.result().requestKey()));assertThat(recovered.records().tickets().getFirst().id()).isEqualTo(ticket);
  long ret=save("prepare_pos_return",Map.of("returns",Map.of("ticketId",ticket,"reason","Synthetic full goods return","goodsReceived",true))).records().returns().getFirst().id();
  assertThat(stock()).isEqualByComparingTo("8");save("confirm_pos_cash_return",Map.of("id",ret,"returnConfirmation",Map.of("cashReturned",true)));assertThat(stock()).isEqualByComparingTo("10");assertThat(cash(shift)).isEqualByComparingTo("550");
  var receipt=actions.preview(token,"receive_pos_inventory",change(Map.of("receipt",Map.of("cashRegisterId",register,"shiftId",shift,"providerId",provider,"currency","CAD","paymentMethod","CASH","items",List.of(Map.of("productId",product,"quantity",3,"unitCost",new BigDecimal("1.2345")))))));
  assertThat(receipt.receipt().total()).isEqualByComparingTo("3.70");assertThat(count("pos_inventory_receipts")).isZero();
  long receiptId=actions.commit(token,"receive_pos_inventory",new CommitRequest(receipt.confirmationToken(),"pos-receipt-001")).result().records().receipts().getFirst().id();assertThat(stock()).isEqualByComparingTo("13");assertThat(cash(shift)).isEqualByComparingTo("546.30");
  save("reverse_pos_inventory_receipt",Map.of("id",receiptId,"reason","Synthetic paid receipt reversal"));assertThat(stock()).isEqualByComparingTo("10");assertThat(cash(shift)).isEqualByComparingTo("550");
  var cp=actions.preview(token,"close_pos_shift",change(Map.of("id",shift,"closing",Map.of("countedCashAmount",550))));assertThat(cp.settlements()).hasSize(1);assertThat(cp.settlements().getFirst().paymentMethod()).isEqualTo("CASH");assertThat(cp.settlements().getFirst().transferable()).isEqualByComparingTo("550");
  var closing=save("close_pos_shift",Map.of("id",shift,"closing",Map.of("countedCashAmount",550)));assertThat(closing.records().shifts().getFirst().status()).isEqualTo("CLOSED");assertThat(closing.records().shifts().getFirst().overShortAmount()).isZero();
  assertThat(count("pos_tickets")).isEqualTo(1);assertThat(count("pos_inventory_receipts")).isEqualTo(1);assertThat(count("pos_returns")).isEqualTo(1);
  var json=mapper.valueToTree(result);assertThat(json.toString()).doesNotContain("customerTaxIdSnapshot","downloadUrl","customFields","metadata");
 }

 @Test void deferredTransferSettlementReviewsReceiptDifferenceAndReplaysOnce() {
  long register=save("create_pos_register",Map.of("register",Map.of("warehouseId",warehouse,"name","Synthetic deferred register","settlementCurrency","CAD"))).records().registers().getFirst().id();var existing=owner.read(token.user(),"get_pos_register",new Query(register,null,null,null,null,null,null,null)).records().registers().getFirst();var bank=existing.settlementRules().stream().filter(v->v.paymentMethod().equals("TRANSFER")&&v.currencyCode().equals("CAD")).findFirst().orElseThrow().destinationPaymentAccountId();int accounts=count("finance_payment_accounts");
  var policy=actions.preview(token,"update_pos_register",change(Map.of("id",register,"register",Map.of("name","Synthetic deferred register","warehouseId",warehouse,"settlementCurrency","CAD","settlementRules",List.of(Map.of("paymentMethod","TRANSFER","destinationPaymentAccountId",bank,"settlementTiming","IMMEDIATE"))))));var forecast=policy.after().registers().getFirst().settlementRules().stream().filter(v->v.paymentMethod().equals("TRANSFER")&&v.currencyCode().equals("CAD")).findFirst().orElseThrow();assertThat(forecast.settlementTiming()).isEqualTo("DEFERRED");assertThat(forecast.destinationPaymentAccountId()).isEqualTo(bank);assertThat(count("finance_payment_accounts")).isEqualTo(accounts);actions.commit(token,"update_pos_register",new CommitRequest(policy.confirmationToken(),"pos-policy-update-001"));
  long shift=save("open_pos_shift",Map.of("opening",Map.of("cashRegisterId",register,"openingAmount",0,"currency","CAD"))).records().shifts().getFirst().id();var input=new LinkedHashMap<>(checkout(register,1));input.put("payments",List.of(Map.of("method","TRANSFER","amount",100,"reference","Synthetic bank evidence")));save("complete_pos_checkout",Map.of("checkout",input));
  var close=actions.preview(token,"close_pos_shift",change(Map.of("id",shift,"closing",Map.of("countedCashAmount",0))));assertThat(close.settlements()).hasSize(1);assertThat(close.settlements().getFirst().timing()).isEqualTo("DEFERRED");assertThat(close.settlements().getFirst().transferable()).isEqualByComparingTo("100");assertThat(count("pos_cash_closings")).isZero();actions.commit(token,"close_pos_shift",new CommitRequest(close.confirmationToken(),"pos-deferred-close-001"));
  long closing=jdbc.queryForObject("SELECT id FROM pos_cash_closings WHERE company_id=?",Long.class,company);var page=operations.read(token.user(),"list_pos_closing_settlements",new com.indice.erp.pos.assistant.PosOperationsContracts.Query(closing,null,null,null,null,null));var original=page.records().settlements().getFirst();assertThat(original.status()).isEqualTo("PENDING");assertThat(original.pending()).isEqualByComparingTo("100");
  var c=mapper.convertValue(Map.of("id",original.id(),"settlement",Map.of("closingId",closing,"receivedAmount",new BigDecimal("98.50"),"note","Bank receipt differs from reviewed amount")),com.indice.erp.pos.assistant.PosOperationsContracts.Change.class);var review=operationActions.preview(token,"confirm_pos_closing_settlement",c);assertThat(review.after().settlements().getFirst().variance()).isEqualByComparingTo("-1.50");int prior=count("finance_payment_account_movements");var request=new com.indice.erp.ai.posoperations.AiPosOperationsContracts.CommitRequest(review.confirmationToken(),"pos-deferred-settle-001");var output=operationActions.commit(token,"confirm_pos_closing_settlement",request);assertThat(output.result().records().settlements().getFirst().status()).isEqualTo("RECONCILIATION_REQUIRED");assertThat(operationActions.commit(token,"confirm_pos_closing_settlement",request).replayed()).isTrue();assertThat(count("finance_payment_account_movements")).isEqualTo(prior+1);assertThat(operations.read(token.user(),"list_pos_closings",null).totalCount()).isEqualTo(1);
 }
 @Test void preticketClaimReleaseAndCheckoutKeepOriginalSourceWithoutExposingClaimCode() {
  long register=save("create_pos_register",Map.of("register",Map.of("warehouseId",warehouse,"name","Synthetic kiosk register","settlementCurrency","CAD"))).records().registers().getFirst().id();save("open_pos_shift",Map.of("opening",Map.of("cashRegisterId",register,"openingAmount",0,"currency","CAD")));var ctx=owner.context(token.user());var kiosk=kiosks.create(ctx,new com.indice.erp.pos.selfservice.SelfServiceKioskDtos.CreateRequest(register,"Synthetic self-service",null,Instant.now().plusSeconds(3600),true,false,10,60));var nativeKiosk=kioskRows.find(ctx,kiosk.id()).orElseThrow();long source=kioskRows.insertPreticket(nativeKiosk,"PRE-SYNTHETIC","654321","CAD","Synthetic guest",null,null,1,new BigDecimal("100"),Instant.now().plusSeconds(3600));kioskRows.insertPreticketItem(company,source,new com.indice.erp.pos.selfservice.SelfServiceKioskDtos.PreticketItemResponse(product,"SKU-TEST","Synthetic product",BigDecimal.ONE,new BigDecimal("100"),new BigDecimal("100")),0);
  var query=new com.indice.erp.pos.assistant.PosOperationsContracts.Query(null,register,null,null,null,null);var pending=operations.read(token.user(),"list_pos_pretickets",query);assertThat(pending.records().sources()).hasSize(1);assertThat(mapper.valueToTree(pending).toString()).doesNotContain("654321","publicToken","claimCode");var c=mapper.convertValue(Map.of("id",source,"source",Map.of("cashRegisterId",register)),com.indice.erp.pos.assistant.PosOperationsContracts.Change.class);var preview=operationActions.preview(token,"claim_pos_preticket",c);assertThat(kioskRows.findPreticket(company,source).orElseThrow().status()).isEqualTo("PENDING");var request=new com.indice.erp.ai.posoperations.AiPosOperationsContracts.CommitRequest(preview.confirmationToken(),"pos-preticket-claim-001");operationActions.commit(token,"claim_pos_preticket",request);assertThat(operationActions.commit(token,"claim_pos_preticket",request).replayed()).isTrue();assertThat(kioskRows.findPreticket(company,source).orElseThrow().status()).isEqualTo("CLAIMED");
  var release=operationActions.preview(token,"release_pos_preticket",c);operationActions.commit(token,"release_pos_preticket",new com.indice.erp.ai.posoperations.AiPosOperationsContracts.CommitRequest(release.confirmationToken(),"pos-preticket-release-001"));assertThat(kioskRows.findPreticket(company,source).orElseThrow().status()).isEqualTo("PENDING");var claimed=operationActions.preview(token,"claim_pos_preticket",c);operationActions.commit(token,"claim_pos_preticket",new com.indice.erp.ai.posoperations.AiPosOperationsContracts.CommitRequest(claimed.confirmationToken(),"pos-preticket-claim-002"));var input=new LinkedHashMap<>(checkout(register,1));input.put("preticketId",source);save("complete_pos_checkout",Map.of("checkout",input));assertThat(kioskRows.findPreticket(company,source).orElseThrow().status()).isEqualTo("COMPLETED");assertThat(count("pos_tickets")).isEqualTo(1);assertThat(stock()).isEqualByComparingTo("9");
 }
 @Test void staleCashOrProductAndRevokedConsentDoNotConsumeConfirmation() {
  long register=save("create_pos_register",Map.of("register",Map.of("warehouseId",warehouse,"name","Synthetic register","settlementCurrency","CAD"))).records().registers().getFirst().id();
  long shift=save("open_pos_shift",Map.of("opening",Map.of("cashRegisterId",register,"openingAmount",100,"currency","CAD"))).records().shifts().getFirst().id();
  var p=actions.preview(token,"complete_pos_checkout",change(Map.of("checkout",checkout(register,1))));
  jdbc.update("UPDATE sales_inventory_balances SET reserved_quantity=1 WHERE company_id=?",company);int executions=count("ai_action_executions");
  assertThatThrownBy(()->nested(()->actions.commit(token,"complete_pos_checkout",new CommitRequest(p.confirmationToken(),"stale-pos-001")))).isInstanceOf(Changed.class);
  assertThat(count("ai_action_executions")).isEqualTo(executions);assertThat(count("pos_tickets")).isZero();assertThat(stock()).isEqualByComparingTo("10");assertThat(cash(shift)).isEqualByComparingTo("100");
  var limited=new StoredToken(token.id(),token.user(),Set.of("pos.read"));assertThatThrownBy(()->actions.commit(limited,"complete_pos_checkout",new CommitRequest(p.confirmationToken(),"stale-pos-001"))).isInstanceOf(SecurityException.class);
  assertThatThrownBy(()->mapper.readValue("{\"opening\":{\"cashRegisterId\":1,\"userId\":999}}",Change.class)).hasMessageContaining("userId");
 }
 @Test void shiftCancellationAndRegisterInactivationKeepTheOwnerHistory() {
  long register=save("create_pos_register",Map.of("register",Map.of("warehouseId",warehouse,"name","Synthetic register","settlementCurrency","CAD"))).records().registers().getFirst().id();
  long shift=save("open_pos_shift",Map.of("opening",Map.of("cashRegisterId",register,"openingAmount",0,"currency","CAD"))).records().shifts().getFirst().id();
  save("cancel_pos_shift",Map.of("id",shift,"reason","Synthetic unused shift"));
  assertThat(save("inactivate_pos_register",Map.of("id",register,"reason","Synthetic retired register")).records().registers().getFirst().active()).isFalse();
  assertThat(count("pos_shifts")).isEqualTo(1);assertThat(count("pos_cash_registers")).isEqualTo(1);
  var other=new AuthSessionUser(user,company+100000,member,"Foreign","root");assertThatThrownBy(()->owner.read(other,"get_pos_register",new Query(register,null,null,null,null,null,null,null))).isInstanceOf(NoSuchElementException.class);
 }
 private Map<String,Object> checkout(long register,int quantity) {return Map.of("cashRegisterId",register,"currency","CAD","items",List.of(Map.of("productId",product,"quantity",quantity,"unitPrice",100)),"payments",List.of(Map.of("method","CASH","amount",100*quantity)));}
 private Result save(String action,Map<String,Object> args) {var p=actions.preview(token,action,change(args));return actions.commit(token,action,new CommitRequest(p.confirmationToken(),UUID.randomUUID().toString())).result();}
 private Change change(Map<String,Object> args) {return mapper.convertValue(args,Change.class);}
 private BigDecimal stock() {return jdbc.queryForObject("SELECT available_quantity FROM sales_inventory_balances WHERE company_id=?",BigDecimal.class,company);}
 private BigDecimal cash(long shift) {return jdbc.queryForObject("SELECT expected_cash_amount FROM pos_shifts WHERE company_id=? AND id=?",BigDecimal.class,company,shift);}
 private int count(String table) {return jdbc.queryForObject("SELECT COUNT(*) FROM "+table+" WHERE company_id=?",Integer.class,company);}
 private void nested(Runnable work) {var tx=new TransactionTemplate(transactions);tx.setPropagationBehavior(TransactionDefinition.PROPAGATION_NESTED);tx.execute(s->{work.run();return null;});}
}
