package com.indice.erp.ai.inventory;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.ai.access.*;
import com.indice.erp.ai.access.AiAccessTokenRepository.StoredToken;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.sales.InventoryAssistantService;
import com.indice.erp.sales.InventoryAssistantContracts.*;
import com.indice.erp.ai.inventory.AiInventoryContracts.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
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
class AiInventoryIntegrationTest {
    @Autowired JdbcTemplate jdbc;
    @Autowired AiInventoryActionService actions;
    @Autowired InventoryAssistantService owner;
    @Autowired AiAccessTokenRepository tokens;
    @Autowired ObjectMapper mapper;
    @Autowired PlatformTransactionManager transactions;
    @MockBean AiToolAuthorizationService permissions;
    long company,unit,business,provider;
    long[] actor;
    StoredToken token;
    @BeforeEach void setup() {
        assertThat(jdbc.queryForObject("SELECT DATABASE()",String.class)).contains("test").isNotEqualTo("corazon_testers");
        company=company();actor=person(company);unit=unit(company);business=business(company,unit);
        jdbc.update("INSERT INTO finance_providers(company_id,name,status) VALUES (?,'Synthetic inventory supplier','ACTIVE')",company);
        provider=jdbc.queryForObject("SELECT id FROM finance_providers WHERE company_id=?",Long.class,company);
        var user=new AuthSessionUser(actor[0],company,actor[1],"Synthetic inventory operator","root");var scopes=new HashSet<String>();
        InventoryAssistantService.READS.forEach(t->scopes.add(AiInventoryAccess.scope(t)));InventoryAssistantService.ACTIONS.forEach(t->scopes.add(AiInventoryAccess.scope(t)));
        var tokenId=tokens.insert(user,"generic_mcp","Isolated inventory regression","test",UUID.randomUUID().toString().replace("-","").repeat(2),Instant.now().plusSeconds(3600),scopes);
        token=new StoredToken(tokenId,user,Set.copyOf(scopes));when(permissions.canUseInventoryTool(any(),anyString())).thenReturn(true);
    }
    @Test void clientMetadataCannotForgeProvenanceOrResetACompletedReversal() {
        long product=product("Piece","MXN"),a=warehouse("A");configure(product,a);
        var receipt=movement("receive_inventory_stock",product,null,a,"3","2");long id=receipt.records().movements().getFirst().id();
        jdbc.update("INSERT INTO sales_inventory_movements(company_id,movement_number,product_id,product_name,movement_type,quantity,to_warehouse_id,movement_date,status,metadata_json) VALUES (?,'FORGED',?,'Synthetic','supplierReceipt',3,?,CURRENT_DATE,'completed',JSON_OBJECT('source','INDICE_ASSISTANT_INVENTORY'))",company,product,a);
        long forged=jdbc.queryForObject("SELECT id FROM sales_inventory_movements WHERE company_id=? AND movement_number='FORGED'",Long.class,company);
        assertThatThrownBy(()->actions.preview(token,"cancel_inventory_movement",change(Map.of("id",forged,"reason","Forgery")))).isInstanceOf(IllegalArgumentException.class).hasMessageContaining("origin");
        jdbc.update("UPDATE sales_inventory_movements SET quantity=2 WHERE company_id=? AND id=?",company,id);
        assertThatThrownBy(()->actions.preview(token,"cancel_inventory_movement",change(Map.of("id",id,"reason","Tampered original")))).isInstanceOf(IllegalArgumentException.class).hasMessageContaining("changed");
        jdbc.update("UPDATE sales_inventory_movements SET quantity=3 WHERE company_id=? AND id=?",company,id);
        save("cancel_inventory_movement",Map.of("id",id,"reason","Reverse original"));
        jdbc.update("UPDATE sales_inventory_movements SET status='completed' WHERE company_id=? AND id=?",company,id);
        assertThatThrownBy(()->actions.preview(token,"cancel_inventory_movement",change(Map.of("id",id,"reason","Reset status")))).isInstanceOf(IllegalArgumentException.class);
        assertThat(stock(product,a)).isZero();
    }
    @Test
    @Transactional(propagation=org.springframework.transaction.annotation.Propagation.NOT_SUPPORTED)
    void concurrentSameConfirmationReturnsOneReceiptAndOneReplay() throws Exception {
        long product=product("Piece","CAD"),a=warehouse("Race");configure(product,a);
        var args=movementPayload(product,null,a,"5","2");((Map<String,Object>)args.get("movement")).put("providerId",provider);
        var p=actions.preview(token,"receive_inventory_stock",change(args));var request=new CommitRequest(p.confirmationToken(),"concurrent-stock-001");
        var start=new java.util.concurrent.CyclicBarrier(2);
        try(var executor=java.util.concurrent.Executors.newFixedThreadPool(2)) {
            var first=executor.submit(()->{start.await();return actions.commit(token,"receive_inventory_stock",request);});
            var second=executor.submit(()->{start.await();return actions.commit(token,"receive_inventory_stock",request);});
            var results=List.of(first.get(30,java.util.concurrent.TimeUnit.SECONDS),second.get(30,java.util.concurrent.TimeUnit.SECONDS));
            assertThat(results).filteredOn(Committed::replayed).hasSize(1);
            assertThat(results.getFirst().result().records().movements().getFirst().id()).isEqualTo(results.getLast().result().records().movements().getFirst().id());
        }
        assertThat(stock(product,a)).isEqualByComparingTo("5");assertThat(count("sales_inventory_movements")).isEqualTo(1);assertThat(count("inventory_assistant_movement_origins")).isEqualTo(1);
    }
    @Test
    @Transactional(propagation=org.springframework.transaction.annotation.Propagation.NOT_SUPPORTED)
    void concurrentDistinctConfirmationsCannotOverspendTheSameStockSnapshot() throws Exception {
        long product=product("Piece","CAD"),a=warehouse("Source");configure(product,a);movement("receive_inventory_stock",product,null,a,"10","2");
        var input=change(movementPayload(product,a,null,"8",null));var one=actions.preview(token,"issue_inventory_stock",input);var two=actions.preview(token,"issue_inventory_stock",input);
        var start=new java.util.concurrent.CyclicBarrier(2);
        try(var executor=java.util.concurrent.Executors.newFixedThreadPool(2)) {
            var futures=List.of(one,two).stream().map(p->executor.submit(()->{start.await();try{actions.commit(token,"issue_inventory_stock",new CommitRequest(p.confirmationToken(),UUID.randomUUID().toString()));return "completed";}catch(Changed e){return "stale";}})).toList();
            var results=new ArrayList<String>();for(var f:futures)results.add(f.get(30,java.util.concurrent.TimeUnit.SECONDS));assertThat(results).containsExactlyInAnyOrder("completed","stale");
        }
        assertThat(stock(product,a)).isEqualByComparingTo("2");assertThat(count("sales_inventory_movements")).isEqualTo(2);
    }
    @Test void catalogWarehouseAndExplicitStockConfigurationArePureAndReplayOnce() {
        var preview=actions.preview(token,"create_inventory_product",change(Map.of("product",Map.of("name","Synthetic flour","currency","CAD","price",12.50,"cost",new BigDecimal("1.2345"),"inventoryUnit","Kilogram"))));
        assertThat(count("sales_products")).isZero();assertThat(preview.after().products().getFirst().readyForSales()).isTrue();
        var request=new CommitRequest(preview.confirmationToken(),"inventory-product-001");var saved=actions.commit(token,"create_inventory_product",request);
        long product=saved.result().records().products().getFirst().id();assertThat(actions.commit(token,"create_inventory_product",request).replayed()).isTrue();assertThat(count("sales_products")).isEqualTo(1);
        assertThat(saved.result().records().products().getFirst().cost()).isEqualByComparingTo("1.2345");
        long warehouse=warehouse("Primary");
        assertThatThrownBy(()->actions.preview(token,"configure_inventory_stock",change(Map.of("stock",Map.of("productId",product,"warehouseId",warehouse,"minimumQuantity",2)))))
            .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("enableInventory");
        var stock=actions.preview(token,"configure_inventory_stock",change(Map.of("stock",Map.of("productId",product,"warehouseId",warehouse,"minimumQuantity",2,"enableInventory",true))));
        assertThat(stock.after().products().getFirst().inventoryReady()).isTrue();assertThat(count("sales_inventory_balances")).isZero();
        var configured=actions.commit(token,"configure_inventory_stock",new CommitRequest(stock.confirmationToken(),"inventory-stock-001"));
        assertThat(configured.result().records().balances().getFirst().minimumQuantity()).isEqualByComparingTo("2");
        assertThat(jdbc.queryForObject("SELECT inventory_ready FROM sales_products WHERE company_id=? AND id=?",Boolean.class,company,product)).isTrue();
        assertThat(count("sales_inventory_movements")).isZero();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='sales_inventory_balances' AND column_name='available_quantity' AND numeric_scale=3",Integer.class)).isEqualTo(1);
    }
    @Test void receiptTransferIssueCountAndReversalPreserveQuantitiesCostReservationsAndHistory() {
        long product=product("Kilogram","CAD"),a=warehouse("A"),b=warehouse("B");configure(product,a);configure(product,b);
        var receipt=movement("receive_inventory_stock",product,null,a,"10.125","1.2345");
        assertThat(stock(product,a)).isEqualByComparingTo("10.125");assertThat(receipt.records().movements()).hasSize(1);
        var transfer=movement("transfer_inventory_stock",product,a,b,"2.125",null);
        assertThat(stock(product,a)).isEqualByComparingTo("8");assertThat(stock(product,b)).isEqualByComparingTo("2.125");
        assertThat(cost(product,b)).isEqualByComparingTo("1.2345");
        movement("issue_inventory_stock",product,a,null,"1",null);assertThat(stock(product,a)).isEqualByComparingTo("7");
        movement("count_inventory_stock",product,a,null,"9.125",null);assertThat(stock(product,a)).isEqualByComparingTo("9.125");
        save("cancel_inventory_movement",Map.of("id",transfer.records().movements().getFirst().id(),"reason","Reverse synthetic transfer"));
        assertThat(stock(product,a)).isEqualByComparingTo("11.250");assertThat(stock(product,b)).isZero();assertThat(count("sales_inventory_movements")).isEqualTo(5);
        assertThat(jdbc.queryForObject("SELECT status FROM sales_inventory_movements WHERE company_id=? AND id=?",String.class,company,transfer.records().movements().getFirst().id())).isEqualTo("cancelled");
        assertThatThrownBy(()->actions.preview(token,"cancel_inventory_movement",change(Map.of("id",transfer.records().movements().getFirst().id(),"reason","Again")))).isInstanceOf(IllegalArgumentException.class);
        assertThat(count("sales_records")).isZero();assertThat(count("pos_payments")).isZero();
    }
    @Test void insufficientReservedStockFractionsDuplicatesAndForeignReferencesFailClosed() {
        long product=product("Piece","MXN"),a=warehouse("A"),b=warehouse("B");configure(product,a);configure(product,b);
        movement("receive_inventory_stock",product,null,a,"5","2");jdbc.update("UPDATE sales_inventory_balances SET reserved_quantity=4 WHERE company_id=? AND product_id=? AND warehouse_id=?",company,product,a);
        assertThatThrownBy(()->movement("issue_inventory_stock",product,a,null,"2",null)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(()->movement("transfer_inventory_stock",product,a,b,"0.5",null)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(()->movement("count_inventory_stock",product,a,null,"3",null)).isInstanceOf(IllegalArgumentException.class);
        var foreign=company();var foreignActor=person(foreign);var other=new AuthSessionUser(foreignActor[0],foreign,foreignActor[1],"Foreign","root");
        assertThatThrownBy(()->owner.read(other,"get_inventory_product",query(Map.of("id",product)))).isInstanceOf(NoSuchElementException.class);
        assertThatThrownBy(()->actions.preview(token,"transfer_inventory_stock",change(Map.of("movement",Map.of("fromWarehouseId",a,"toWarehouseId",b,"date",LocalDate.now().toString(),"reason","Duplicates","items",List.of(Map.of("productId",product,"quantity",1),Map.of("productId",product,"quantity",1))))))).isInstanceOf(IllegalArgumentException.class);
        assertThat(stock(product,a)).isEqualByComparingTo("5");assertThat(stock(product,b)).isZero();
    }
    @Test void staleStockProductAndWarehouseRollbackConfirmationAndEveryOwnerEffect() {
        long product=product("Piece","MXN"),a=warehouse("A"),b=warehouse("B");configure(product,a);configure(product,b);movement("receive_inventory_stock",product,null,a,"10","2");
        var payload=movementPayload(product,a,b,"2",null);var preview=actions.preview(token,"transfer_inventory_stock",change(payload));
        jdbc.update("UPDATE sales_inventory_balances SET available_quantity=9 WHERE company_id=? AND product_id=? AND warehouse_id=?",company,product,a);
        int executions=count("ai_action_executions");int movements=count("sales_inventory_movements");
        assertThatThrownBy(()->nested(()->actions.commit(token,"transfer_inventory_stock",new CommitRequest(preview.confirmationToken(),"stale-inventory-001")))).isInstanceOf(Changed.class);
        assertThat(count("ai_action_executions")).isEqualTo(executions);assertThat(count("sales_inventory_movements")).isEqualTo(movements);assertThat(stock(product,b)).isZero();
        var edited=actions.preview(token,"update_inventory_product",change(Map.of("id",product,"product",Map.of("price",20))));
        jdbc.update("UPDATE sales_products SET category='Concurrent' WHERE company_id=? AND id=?",company,product);
        assertThatThrownBy(()->nested(()->actions.commit(token,"update_inventory_product",new CommitRequest(edited.confirmationToken(),"stale-product-001")))).isInstanceOf(Changed.class);
    }
    @Test void historyLocksUnitAndCurrencyAndWarehouseInactivationRetainsStock() {
        long product=product("Piece","MXN"),a=warehouse("A");configure(product,a);movement("receive_inventory_stock",product,null,a,"1","2");
        assertThatThrownBy(()->actions.preview(token,"update_inventory_product",change(Map.of("id",product,"product",Map.of("inventoryUnit","Kilogram"))))).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(()->actions.preview(token,"update_inventory_product",change(Map.of("id",product,"product",Map.of("currency","CAD"))))).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(()->actions.preview(token,"inactivate_inventory_warehouse",change(Map.of("id",a,"reason","Close")))).isInstanceOf(IllegalArgumentException.class);
        movement("issue_inventory_stock",product,a,null,"1",null);save("inactivate_inventory_warehouse",Map.of("id",a,"reason","Close empty warehouse"));
        assertThat(jdbc.queryForObject("SELECT status FROM sales_inventory_warehouses WHERE company_id=? AND id=?",String.class,company,a)).isEqualTo("inactive");assertThat(count("sales_inventory_movements")).isEqualTo(2);
    }
    @Test void scopedPagesBindFiltersAndSummariesSeparateFullNativeCurrencyPopulation() {
        long cad=product("Kilogram","CAD"),mxn=product("Piece","MXN"),a=warehouse("A");configure(cad,a);configure(mxn,a);
        movement("receive_inventory_stock",cad,null,a,"2.125","3.1234");movement("receive_inventory_stock",mxn,null,a,"3","7");
        var page=(Page<?>)owner.read(token.user(),"list_inventory_balances",query(Map.of("limit",1)));assertThat(page.totalCount()).isEqualTo(2);assertThat(page.items()).hasSize(1);assertThat(page.hasMore()).isTrue();
        assertThat(((Page<?>)owner.read(token.user(),"list_inventory_balances",query(Map.of("limit",1,"cursor",page.nextCursor())))).hasMore()).isFalse();
        assertThatThrownBy(()->owner.read(token.user(),"list_inventory_balances",query(Map.of("limit",1,"belowMinimum",true,"cursor",page.nextCursor())))).isInstanceOf(IllegalArgumentException.class);
        var summary=(Summary)owner.read(token.user(),"get_inventory_metrics",null);assertThat(summary.balanceCount()).isEqualTo(2);assertThat(summary.values()).extracting(CurrencyValue::currency).containsExactly("CAD","MXN");
        long outsideUnit=unit(company),outsideBusiness=business(company,outsideUnit);
        jdbc.update("INSERT INTO user_work_profiles(company_id,user_company_id,user_id,unit_id,business_id) VALUES (?,?,?,?,?)",company,actor[1],actor[0],outsideUnit,outsideBusiness);
        var limited=new AuthSessionUser(actor[0],company,actor[1],"Limited","admin");assertThat(((Page<?>)owner.read(limited,"list_inventory_balances",null)).totalCount()).isZero();
        assertThatThrownBy(()->owner.read(limited,"get_inventory_warehouse",query(Map.of("id",a)))).isInstanceOf(NoSuchElementException.class);
    }
    @Test void revokedConsentCurrentTabWrongConnectionExpiryAndRetryConflictAreRejected() {
        var input=change(Map.of("product",Map.of("name","Consent","currency","CAD")));var preview=actions.preview(token,"create_inventory_product",input);var request=new CommitRequest(preview.confirmationToken(),"consent-inventory-001");
        assertThatThrownBy(()->actions.commit(new StoredToken(token.id(),token.user(),Set.of("inventory.read")),"create_inventory_product",request)).isInstanceOf(SecurityException.class);
        assertThatThrownBy(()->actions.commit(new StoredToken(token.id()+1,token.user(),token.scopes()),"create_inventory_product",request)).isInstanceOf(Conflict.class);
        when(permissions.canUseInventoryTool(any(),anyString())).thenReturn(false);assertThatThrownBy(()->actions.commit(token,"create_inventory_product",request)).isInstanceOf(SecurityException.class);
        when(permissions.canUseInventoryTool(any(),anyString())).thenReturn(true);actions.commit(token,"create_inventory_product",request);
        var second=actions.preview(token,"create_inventory_product",input);assertThatThrownBy(()->actions.commit(token,"create_inventory_product",new CommitRequest(second.confirmationToken(),request.idempotencyKey()))).isInstanceOf(Conflict.class);
        jdbc.update("UPDATE ai_action_confirmations SET expires_at=TIMESTAMPADD(SECOND,-1,CURRENT_TIMESTAMP) WHERE company_id=? AND consumed_at IS NULL",company);
        assertThatThrownBy(()->actions.commit(token,"create_inventory_product",new CommitRequest(second.confirmationToken(),"expired-inventory-001"))).isInstanceOf(Conflict.class);
    }
    private long product(String inventoryUnit,String currency) {return save("create_inventory_product",Map.of("product",Map.of("name","Synthetic product","currency",currency,"price",10,"inventoryReady",true,"inventoryUnit",inventoryUnit))).records().products().getFirst().id();}
    private long warehouse(String name) {return save("create_inventory_warehouse",Map.of("warehouse",Map.of("name",name,"unitId",unit,"businessId",business))).records().warehouses().getFirst().id();}
    private void configure(long product,long warehouse) {save("configure_inventory_stock",Map.of("stock",Map.of("productId",product,"warehouseId",warehouse,"minimumQuantity",1,"usesInventory",true)));}
    private Result movement(String action,long product,Long from,Long to,String quantity,String cost) {var payload=movementPayload(product,from,to,quantity,cost);if(action.startsWith("receive_"))((Map<String,Object>)payload.get("movement")).put("providerId",provider);return save(action,payload);}
    private Map<String,Object> movementPayload(long product,Long from,Long to,String quantity,String cost) {var m=new LinkedHashMap<String,Object>();if(from!=null)m.put("fromWarehouseId",from);if(to!=null)m.put("toWarehouseId",to);m.put("date",LocalDate.now().toString());m.put("reason","Synthetic movement");var line=new LinkedHashMap<String,Object>();line.put("productId",product);line.put("quantity",quantity);if(cost!=null)line.put("unitCost",cost);m.put("items",List.of(line));return new HashMap<>(Map.of("movement",m));}
    private Result save(String action,Map<String,Object> args) {var p=actions.preview(token,action,change(args));return actions.commit(token,action,new CommitRequest(p.confirmationToken(),UUID.randomUUID().toString())).result();}
    private Change change(Map<String,Object> args){return mapper.convertValue(args,Change.class);}private Query query(Map<String,Object> args){return mapper.convertValue(args,Query.class);}
    private BigDecimal stock(long product,long warehouse){return jdbc.queryForObject("SELECT available_quantity FROM sales_inventory_balances WHERE company_id=? AND product_id=? AND warehouse_id=?",BigDecimal.class,company,product,warehouse);}
    private BigDecimal cost(long product,long warehouse){return jdbc.queryForObject("SELECT unit_cost FROM sales_inventory_balances WHERE company_id=? AND product_id=? AND warehouse_id=?",BigDecimal.class,company,product,warehouse);}
    private int count(String table){return jdbc.queryForObject("SELECT COUNT(*) FROM "+table+" WHERE company_id=?",Integer.class,company);}
    private void nested(Runnable work){var tx=new TransactionTemplate(transactions);tx.setPropagationBehavior(TransactionDefinition.PROPAGATION_NESTED);tx.execute(s->{work.run();return null;});}
    private long company(){String name="Synthetic inventory "+UUID.randomUUID();jdbc.update("INSERT INTO companies(name) VALUES (?)",name);return jdbc.queryForObject("SELECT id FROM companies WHERE name=?",Long.class,name);}
    private long unit(long companyId){String name="Synthetic inventory unit "+UUID.randomUUID();jdbc.update("INSERT INTO units(company_id,name,status) VALUES (?,?,'active')",companyId,name);return jdbc.queryForObject("SELECT id FROM units WHERE company_id=? AND name=?",Long.class,companyId,name);}
    private long business(long companyId,long unitId){String name="Synthetic inventory business "+UUID.randomUUID();jdbc.update("INSERT INTO businesses(company_id,unit_id,name,status) VALUES (?,?,?,'active')",companyId,unitId,name);return jdbc.queryForObject("SELECT id FROM businesses WHERE company_id=? AND name=?",Long.class,companyId,name);}
    private long[] person(long companyId){String email=UUID.randomUUID()+"@example.test";jdbc.update("INSERT INTO users(email,password_hash,full_name) VALUES (?,'test','Synthetic inventory operator')",email);long id=jdbc.queryForObject("SELECT id FROM users WHERE email=?",Long.class,email);jdbc.update("INSERT INTO user_companies(user_id,company_id,role,status,visibility) VALUES (?,?,'root','active','all')",id,companyId);return new long[]{id,jdbc.queryForObject("SELECT id FROM user_companies WHERE user_id=? AND company_id=?",Long.class,id,companyId)};}
}
