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
class PosPointReturnIntegrationTest {
 @Autowired JdbcTemplate jdbc;@Autowired AiPosActionService actions;@Autowired PosAssistantService owner;
 @Autowired AiAccessTokenRepository tokens;@Autowired ObjectMapper mapper;@Autowired PlatformTransactionManager transactions;
 @Autowired com.indice.erp.ai.posoperations.AiPosOperationsActionService operationActions;
 @Autowired com.indice.erp.pos.assistant.PosOperationsService operations;
 @Autowired com.indice.erp.pos.selfservice.SelfServiceKioskService kiosks;
 @Autowired com.indice.erp.pos.selfservice.SelfServiceKioskRepository kioskRows;
 @MockBean AiToolAuthorizationService permissions;
 @MockBean com.indice.erp.pos.mercadopago.MpOriginalReturnPort pointRefund;
 @Autowired com.indice.erp.pos.returns.PosReturnService returnOwner;
 @Autowired com.indice.erp.pos.returns.PosReturnCoordinator returnCoordinator;
 @Autowired com.indice.erp.pos.mercadopago.MpRefundReservation pointReservation;
 @Autowired com.indice.erp.pos.mercadopago.MpIntentReader pointIntents;
 @Autowired com.indice.erp.pos.mercadopago.MpRefundRequestStore pointRequests;
 @Autowired com.indice.erp.pos.mercadopago.MpRefundOutstanding pointOutstanding;
 @Autowired com.indice.erp.pos.mercadopago.MpFinancialEvidenceLock pointLocks;
 @Autowired com.indice.erp.pos.settlement.TerminalRefundStore refundLedger;
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

 @org.junit.jupiter.params.ParameterizedTest
 @org.junit.jupiter.params.provider.ValueSource(strings={"confirmed","rejected","not_submitted"})
 void pointReturnPreservesMoneyAndStockAcrossUncertainRejectedAndConfirmedOutcomes(String outcome){
    boolean rejected=!outcome.equals("confirmed");
    jdbc.update("UPDATE sales_products SET currency='MXN' WHERE company_id=? AND id=?",company,product);
    long register=save("create_pos_register",Map.of("register",Map.of("name","Point return register","warehouseId",warehouse,"settlementCurrency","MXN"))).records().registers().getFirst().id();
    long shift=save("open_pos_shift",Map.of("opening",Map.of("cashRegisterId",register,"openingAmount",0,"currency","MXN"))).records().shifts().getFirst().id();
    long ticket=save("complete_pos_checkout",Map.of("checkout",Map.of("cashRegisterId",register,"currency","MXN","items",List.of(Map.of("productId",product,"quantity",1,"unitPrice",100)),"payments",List.of(Map.of("method","CASH","amount",100))))).records().tickets().getFirst().id();
    jdbc.update("UPDATE pos_payments SET payment_method='CARD' WHERE company_id=? AND ticket_id=?",company,ticket);jdbc.update("UPDATE pos_shifts SET expected_cash_amount=0 WHERE company_id=? AND id=?",company,shift);
    String unique=UUID.randomUUID().toString();
    jdbc.update("INSERT INTO pos_mercado_pago_connections(company_id,seller_id,environment,country_code,site_id,live_mode,access_token_ciphertext,refresh_token_ciphertext,expires_at,scopes) VALUES (?,?,'sandbox','MX','MLM',0,'synthetic-unusable','synthetic-unusable',DATE_ADD(UTC_TIMESTAMP(),INTERVAL 1 DAY),'test')",company,unique.substring(0,30));
    long connection=jdbc.queryForObject("SELECT id FROM pos_mercado_pago_connections WHERE company_id=?",Long.class,company);
    jdbc.update("INSERT INTO pos_mercado_pago_terminals(company_id,connection_id,provider_terminal_id,name) VALUES (?,?,'synthetic-terminal','Synthetic Point terminal')",company,connection);long terminal=jdbc.queryForObject("SELECT id FROM pos_mercado_pago_terminals WHERE company_id=?",Long.class,company);
    jdbc.update("INSERT INTO pos_mercado_pago_payment_intents(company_id,cash_register_id,shift_id,terminal_id,connection_id,provider_terminal_id,seller_id,environment,idempotency_key,external_reference,amount,currency_code,payload_hash,checkout_json,provider_request_json,created_by_user_id,created_by_role,scope_type,expires_at,status,pos_ticket_id,payment_id,order_id) VALUES (?,?,?,?,?,'synthetic-terminal',?,'sandbox',?,?,100,'MXN',?,'{}','{}',?,'root','CORPORATE_OFFICE',DATE_ADD(UTC_TIMESTAMP(),INTERVAL 1 DAY),'APPROVED',?,?,?)",company,register,shift,terminal,connection,unique.substring(0,30),unique,unique,"a".repeat(64),user,ticket,"synthetic-payment-"+unique,"synthetic-order-"+unique);
    long intent=jdbc.queryForObject("SELECT id FROM pos_mercado_pago_payment_intents WHERE company_id=?",Long.class,company);var ctx=owner.context(token.user());
    var readonly=new TransactionTemplate(transactions);readonly.setReadOnly(true);readonly.execute(status->{pointOutstanding.inspectNone(pointIntents.find(ctx,intent).orElseThrow());return null;});
    var prepared=returnOwner.prepare(ctx,new com.indice.erp.pos.returns.PosReturnDtos.PrepareRequest(ticket,"Customer returned the complete order",true,UUID.randomUUID().toString()));
    assertThat(stock()).isEqualByComparingTo("9");assertThat(count("pos_mercado_pago_refund_requests")).isZero();
    assertThatThrownBy(()->pointReservation.reserve(ctx,pointIntents.find(ctx,intent).orElseThrow(),new com.indice.erp.pos.mercadopago.MpRefundRequest("unrelated_key",new BigDecimal("100"),"Separate refund"))).isInstanceOf(com.indice.erp.pos.PosApiException.class);
    java.util.concurrent.atomic.AtomicInteger attempts=new java.util.concurrent.atomic.AtomicInteger();
    when(pointRefund.refund(eq(ctx),eq(intent),any(),eq(prepared.id()))).thenAnswer(call->{
        assertThat(org.springframework.transaction.support.TransactionSynchronizationManager.isActualTransactionActive()).isFalse();
        var request=(com.indice.erp.pos.mercadopago.MpRefundRequest)call.getArgument(2);var payment=pointIntents.find(ctx,intent).orElseThrow();
        var existing=pointRequests.byKey(company,request.idempotencyKey());var saved=existing.orElseGet(()->pointReservation.reserveOriginalReturn(ctx,payment,request,prepared.id()));
        if(attempts.incrementAndGet()==1)return saved;
        if(rejected){jdbc.update("UPDATE pos_mercado_pago_refund_requests SET status=?,version=version+1 WHERE company_id=? AND id=?",outcome.equals("rejected")?"REJECTED":"NOT_SUBMITTED",company,saved.id());return pointRequests.find(company,saved.id()).orElseThrow();}
        pointLocks.apply(payment,()->{refundLedger.record(payment,"synthetic-native-refund-"+unique,new BigDecimal("100"),new BigDecimal("100"));pointRequests.confirm(payment,new BigDecimal("100"));jdbc.update("UPDATE pos_mercado_pago_payment_intents SET status='REFUNDED',version=version+1 WHERE company_id=? AND id=?",company,intent);return null;});
        jdbc.update("UPDATE sales_inventory_balances SET deleted_at=CURRENT_TIMESTAMP WHERE company_id=?",company);
        return pointRequests.byKey(company,request.idempotencyKey()).orElseThrow();
    });
    var waiting=returnCoordinator.confirm(ctx,prepared.id(),new com.indice.erp.pos.returns.PosReturnDtos.ConfirmRequest(false,Map.of()));
    assertThat(waiting.status()).isEqualTo("PROCESSING");assertThat(stock()).isEqualByComparingTo("9");assertThat(count("pos_mercado_pago_refund_requests")).isEqualTo(1);assertThat(count("pos_terminal_payment_reversals")).isZero();
    if(rejected){var failed=returnCoordinator.confirm(ctx,prepared.id(),new com.indice.erp.pos.returns.PosReturnDtos.ConfirmRequest(false,Map.of()));assertThat(failed.payments().getFirst().status()).isEqualTo(outcome.equals("rejected")?"REJECTED":"FAILED");
        var cancelled=save("cancel_pos_return",Map.of("id",prepared.id()));assertThat(cancelled.records().returns().getFirst().status()).isEqualTo("CANCELLED");assertThat(stock()).isEqualByComparingTo("9");assertThat(count("pos_terminal_payment_reversals")).isZero();assertThat(pointIntents.find(ctx,intent).orElseThrow().status()).isEqualTo("APPROVED");return;}
    assertThatThrownBy(()->returnCoordinator.confirm(ctx,prepared.id(),new com.indice.erp.pos.returns.PosReturnDtos.ConfirmRequest(false,Map.of()))).isInstanceOf(com.indice.erp.pos.PosApiException.class);
    assertThat(stock()).isEqualByComparingTo("9");assertThat(pointRequests.byKey(company,returnOwner.cardRequestKey(ctx,prepared.id())).orElseThrow().status()).isEqualTo("CONFIRMED");
    jdbc.update("UPDATE sales_inventory_balances SET deleted_at=NULL WHERE company_id=?",company);
    var completed=returnCoordinator.confirm(ctx,prepared.id(),new com.indice.erp.pos.returns.PosReturnDtos.ConfirmRequest(false,Map.of()));assertThat(completed.status()).isEqualTo("COMPLETED");assertThat(stock()).isEqualByComparingTo("10");assertThat(cash(shift)).isEqualByComparingTo("0");
    assertThat(returnCoordinator.confirm(ctx,prepared.id(),new com.indice.erp.pos.returns.PosReturnDtos.ConfirmRequest(false,Map.of())).status()).isEqualTo("COMPLETED");verify(pointRefund,times(2)).refund(eq(ctx),eq(intent),any(),eq(prepared.id()));
    assertThat(count("pos_mercado_pago_refund_requests")).isEqualTo(1);assertThat(count("pos_terminal_payment_reversals")).isEqualTo(1);
    var closing=owner.read(token.user(),"get_pos_closing_summary",new Query(shift,null,null,null,null,null,null,null)).records().closings().getFirst();assertThat(closing.totalRefundsAmount()).isEqualByComparingTo("100");
 }
 private Map<String,Object> checkout(long register,int quantity) {return Map.of("cashRegisterId",register,"currency","CAD","items",List.of(Map.of("productId",product,"quantity",quantity,"unitPrice",100)),"payments",List.of(Map.of("method","CASH","amount",100*quantity)));}
 private Result save(String action,Map<String,Object> args) {var p=actions.preview(token,action,change(args));return actions.commit(token,action,new CommitRequest(p.confirmationToken(),UUID.randomUUID().toString())).result();}
 private Change change(Map<String,Object> args) {return mapper.convertValue(args,Change.class);}
 private BigDecimal stock() {return jdbc.queryForObject("SELECT available_quantity FROM sales_inventory_balances WHERE company_id=?",BigDecimal.class,company);}
 private BigDecimal cash(long shift) {return jdbc.queryForObject("SELECT expected_cash_amount FROM pos_shifts WHERE company_id=? AND id=?",BigDecimal.class,company,shift);}
 private int count(String table) {return jdbc.queryForObject("SELECT COUNT(*) FROM "+table+" WHERE company_id=?",Integer.class,company);}
 private void nested(Runnable work) {var tx=new TransactionTemplate(transactions);tx.setPropagationBehavior(TransactionDefinition.PROPAGATION_NESTED);tx.execute(s->{work.run();return null;});}
}
