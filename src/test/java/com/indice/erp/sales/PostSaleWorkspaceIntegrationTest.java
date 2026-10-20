package com.indice.erp.sales;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static com.indice.erp.sales.PostSaleWorkspaceDtos.*;
import com.indice.erp.access.module.ModuleAccessService;
import com.indice.erp.access.tab.TabPermissionAccessService;
import com.indice.erp.finance.shared.FinanceBusinessTimeZoneResolver;
import com.indice.erp.notifications.AppNotificationService;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest(properties={"app.sales.post-sale-reminder-initial-delay-ms=86400000","app.sales.call-reminder-initial-delay-ms=86400000"})
@Transactional
class PostSaleWorkspaceIntegrationTest {
    @Autowired JdbcTemplate db;
    @Autowired PostSaleWorkspaceService service;
    @Autowired PostSaleWorkspaceRepository repo;
    @Autowired SalesService sales;
    @Autowired AppNotificationService notifications;
    long company,user,owner,sale,lost,originalFlow;
    @BeforeEach void setup() {
        assertThat(db.queryForObject("SELECT DATABASE()",String.class)).isEqualTo("indice_test_db");
        String key=UUID.randomUUID().toString();
        db.update("INSERT INTO companies(name) VALUES(?)",key);
        company=db.queryForObject("SELECT id FROM companies WHERE name=?",Long.class,key);
        user=db.queryForObject("SELECT id FROM users ORDER BY id LIMIT 1",Long.class);
        db.update("INSERT INTO user_companies(company_id,user_id,role,status,visibility) VALUES(?,?,'admin','active','all')",company,user);
        owner=db.queryForObject("SELECT id FROM user_companies WHERE company_id=?",Long.class,company);
        db.update("INSERT INTO sales_records(company_id,sale_number,customer_name,sale_date,currency,total_amount,commercial_status,seller_user_company_id) VALUES(?,'SAL-TEST','Synthetic service client',CURRENT_DATE,'MXN',7192,'confirmed',?)",company,owner);
        sale=db.queryForObject("SELECT id FROM sales_records WHERE company_id=?",Long.class,company);
        var opportunity=sales.create(company,user,"opportunities",new LinkedHashMap<>(Map.of("opportunityName","Synthetic lost prospect","status","active","ownerUserCompanyId",owner)));
        lost=((Number)opportunity.get("id")).longValue();originalFlow=((Number)opportunity.get("flowId")).longValue();
        sales.update(company,user,"opportunities",lost,Map.of("stage","lost"));
    }
    SaveWork command(int version,long flow,String stage,LocalDate date,boolean paused) {
        return new SaveWork(UUID.randomUUID().toString(),version,flow,stage,owner,"Review service",date,"Agreed next steps","Budget timing",paused);
    }
    Flow flow() {return service.saveFlow(company,user,null,new SaveFlow(UUID.randomUUID().toString(),null,"Installation",false,List.of(new Stage("install","Installation","BLUE"),new Stage("completed","Completed","GREEN"))));}
    @Test void allSourcesAppearWithoutMutatingThemAndPaginationCountsTheWholeSelection() {
        var won=service.workspace(company,"won",null,null,0L,null,1,1,true);
        assertThat(won.items()).hasSize(1);assertThat(won.counts().unscheduled()).isEqualTo(1);
        assertThat(won.items().getFirst().workId()).isNull();
        assertThat(service.workspace(company,"lost",null,null,null,null,1,50,true).items()).hasSize(1);
        assertThat(db.queryForObject("SELECT COUNT(*) FROM sales_post_sale_work WHERE company_id=?",Integer.class,company)).isZero();
        db.update("INSERT INTO sales_records(company_id,sale_number,customer_name,sale_date,currency,total_amount,commercial_status) VALUES(?,'SAL-OTHER','Other',CURRENT_DATE,'MXN',50,'confirmed')",company);
        assertThat(service.workspace(company,"won",null,null,0L,null,1,1,true).counts().total()).isEqualTo(2);
        assertThat(service.workspace(company,"won",null,null,0L,null,2,1,true).items()).hasSize(1);
    }
    @Test void operationalStagesHaveHistoryAndNeverChangeFinancialSaleState() {
        var before=db.queryForMap("SELECT * FROM sales_records WHERE company_id=? AND id=?",company,sale);
        var flow=flow();var request=command(0,flow.id(),"install",LocalDate.now(),false);
        var saved=service.save(company,user,"won",sale,request);
        assertThat(saved.history()).hasSize(1);
        assertThat(service.save(company,user,"won",sale,request).item().version()).isEqualTo(1);
        service.save(company,user,"won",sale,command(1,flow.id(),"completed",null,false));
        assertThat(service.detail(company,"won",sale).history()).hasSize(2);
        assertThat(db.queryForMap("SELECT * FROM sales_records WHERE company_id=? AND id=?",company,sale)).isEqualTo(before);
    }
    @Test void schedulingLostDoesNotCreateOpportunityAndManualRecoveryIsLinkedAndIdempotent() {
        var saved=service.save(company,user,"lost",lost,command(0,0,"pending",LocalDate.now().plusDays(30),false));
        assertThat(opportunities()).isEqualTo(1);
        var request=new Reactivate(UUID.randomUUID().toString(),saved.item().version(),"New conversation",null);
        var result=service.reactivate(company,user,lost,request);
        assertThat(result.item().recoveryStatus()).isEqualTo("recovered");
        assertThat(service.reactivate(company,user,lost,request).item().recoveredOpportunityId()).isEqualTo(result.item().recoveredOpportunityId());
        assertThat(opportunities()).isEqualTo(2);
        assertThat(db.queryForObject("SELECT lifecycle_status FROM sales_opportunities WHERE company_id=? AND id=?",String.class,company,lost)).isEqualTo("LOST");
        var created=sales.get(company,"opportunities",result.item().recoveredOpportunityId());
        assertThat(((Number)created.get("flowId")).longValue()).isEqualTo(originalFlow);
        assertThat(new java.math.BigDecimal(created.get("estimatedValue").toString())).isZero();
        assertThat(created.get("customFields").toString()).contains("recoveredFromOpportunityId");
        assertThatThrownBy(()->service.reactivate(company,user,lost,new Reactivate(UUID.randomUUID().toString(),result.item().version(),"Duplicate",null))).isInstanceOf(PostSaleWorkspaceService.Conflict.class);
    }
    @Test void staleWritesAndReusedKeyWithDifferentPayloadCannotOverwrite() {
        var first=command(0,0,"pending",null,false); service.save(company,user,"won",sale,first);
        assertThatThrownBy(()->service.save(company,user,"won",sale,command(0,0,"delivery",null,false))).isInstanceOf(PostSaleWorkspaceService.Conflict.class);
        var changed=new SaveWork(first.requestKey(),0,0L,"delivery",owner,"Changed",null,"","",false);
        assertThatThrownBy(()->service.save(company,user,"won",sale,changed)).isInstanceOf(PostSaleWorkspaceService.Conflict.class);
        assertThat(service.detail(company,"won",sale).item().stageKey()).isEqualTo("pending");
    }
    @Test void tenantOwnerAndFlowBoundariesRejectForeignReferences() {
        assertThatThrownBy(()->service.detail(company+999999,"won",sale)).isInstanceOf(NoSuchElementException.class);
        assertThatThrownBy(()->service.save(company,user,"won",sale,command(0,999999,"pending",null,false))).isInstanceOf(NoSuchElementException.class);
        var bad=new SaveWork(UUID.randomUUID().toString(),0,0L,"pending",owner+999999,"",null,"","",false);
        assertThatThrownBy(()->service.save(company,user,"won",sale,bad)).isInstanceOf(IllegalArgumentException.class);
        assertThat(service.detail(company,"won",sale).item().workId()).isNull();
    }
    @Test void usedFlowsRetainStagesAndCannotBeArchivedAndInvalidColorsFailValidation() {
        var flow=flow();service.save(company,user,"won",sale,command(0,flow.id(),"install",null,false));
        assertThatThrownBy(()->service.saveFlow(company,user,flow.id(),new SaveFlow(UUID.randomUUID().toString(),1,"Archive",true,flow.stages()))).isInstanceOf(PostSaleWorkspaceService.Conflict.class);
        assertThatThrownBy(()->service.saveFlow(company,user,flow.id(),new SaveFlow(UUID.randomUUID().toString(),1,"Remove",false,PostSaleWorkspaceService.DEFAULT_STAGES))).isInstanceOf(PostSaleWorkspaceService.Conflict.class);
        assertThatThrownBy(()->service.saveFlow(company,user,null,new SaveFlow(UUID.randomUUID().toString(),null,"Invalid",false,List.of(new Stage("x","X",null),new Stage("completed","Done","GREEN"))))).isInstanceOf(IllegalArgumentException.class);
    }
    @Test void remindersUseCompanyDateAreDurableAndNeverReactivateAutomatically() {
        var modules=mock(ModuleAccessService.class);var tabs=mock(TabPermissionAccessService.class);var zones=mock(FinanceBusinessTimeZoneResolver.class);
        when(zones.resolve(company)).thenReturn(ZoneId.of("America/Toronto"));
        when(modules.companyCanAccessForMutation(company,"sales")).thenReturn(true);when(modules.canAccess(any(),eq("sales"))).thenReturn(true);when(tabs.canAccess(any(),any())).thenReturn(true);
        var work=service.save(company,user,"lost",lost,command(0,0,"pending",LocalDate.of(2026,10,18),false)).item();
        var early=new PostSaleReminderService(db,repo,modules,tabs,notifications,zones,Clock.fixed(Instant.parse("2026-10-18T02:00:00Z"),ZoneOffset.UTC));
        early.dispatch(company,work.workId());assertThat(notices()).isZero();
        var due=new PostSaleReminderService(db,repo,modules,tabs,notifications,zones,Clock.fixed(Instant.parse("2026-10-18T12:00:00Z"),ZoneOffset.UTC));
        when(tabs.canAccess(any(),any())).thenReturn(false);due.dispatch(company,work.workId());assertThat(notices()).isZero();
        when(tabs.canAccess(any(),any())).thenReturn(true);due.dispatch(company,work.workId());due.dispatch(company,work.workId());assertThat(notices()).isEqualTo(1);assertThat(opportunities()).isEqualTo(1);
        assertThat(db.queryForObject("SELECT action_url FROM app_notifications WHERE company_id=? AND source_type='post_sale_work'",String.class,company)).isEqualTo("/sales/after-sales?kind=lost&source="+lost);
        db.update("UPDATE app_notifications SET dismissed_at=UTC_TIMESTAMP() WHERE company_id=?",company);due.dispatch(company,work.workId());assertThat(notices()).isEqualTo(1);
        service.save(company,user,"lost",lost,command(1,0,"pending",LocalDate.of(2026,10,18),true));due.dispatch(company,work.workId());assertThat(notices()).isZero();
    }
    @Test @Transactional(propagation=org.springframework.transaction.annotation.Propagation.NOT_SUPPORTED)
    void concurrentRecoveryRetriesCreateOnlyOneOpportunity() throws Exception {
        var saved=service.save(company,user,"lost",lost,command(0,0,"pending",LocalDate.now(),false));
        var request=new Reactivate(UUID.randomUUID().toString(),saved.item().version(),"One recovery",null);
        try(var pool=java.util.concurrent.Executors.newFixedThreadPool(2)) {
            var start=new java.util.concurrent.CountDownLatch(1);
            var a=pool.submit(()->{start.await();return service.reactivate(company,user,lost,request).item().recoveredOpportunityId();});
            var b=pool.submit(()->{start.await();return service.reactivate(company,user,lost,request).item().recoveredOpportunityId();});
            start.countDown();assertThat(a.get(15,java.util.concurrent.TimeUnit.SECONDS)).isEqualTo(b.get(15,java.util.concurrent.TimeUnit.SECONDS));
        }
        assertThat(opportunities()).isEqualTo(2);
    }
    @Test void sortingHappensBeforePaginationAndPreservesTenantAndCommercialFilters() {
        for(int i=12;i>=1;i--)newSale(String.format("Sort fixture %02d",i));
        db.update("INSERT INTO companies(name) VALUES('Other sorting tenant')");
        long other=db.queryForObject("SELECT LAST_INSERT_ID()",Long.class);
        db.update("INSERT INTO sales_records(company_id,sale_number,customer_name,sale_date,currency,total_amount,commercial_status) VALUES(?,'OTHER','Sort fixture 00',CURRENT_DATE,'MXN',1,'confirmed')",other);
        long cancelled=newSale("Sort fixture 00 cancelled");db.update("UPDATE sales_records SET commercial_status='cancelled' WHERE company_id=? AND id=?",company,cancelled);
        var first=service.workspace(company,"won","Sort fixture",owner,0L,"pending",1,5,true,new WorkspaceSort("client","asc"));
        assertThat(first.counts().total()).isEqualTo(12);
        assertThat(first.items()).extracting(Item::clientName).containsExactly("Sort fixture 01","Sort fixture 02","Sort fixture 03","Sort fixture 04","Sort fixture 05");
        assertThat(service.workspace(company,"won","Sort fixture",owner,0L,"pending",2,5,true,new WorkspaceSort("client","asc")).items())
            .extracting(Item::clientName).containsExactly("Sort fixture 06","Sort fixture 07","Sort fixture 08","Sort fixture 09","Sort fixture 10");
        assertThat(service.workspace(company,"won","Sort fixture",owner,0L,"pending",1,5,true,new WorkspaceSort("client","desc")).items())
            .extracting(Item::clientName).containsExactly("Sort fixture 12","Sort fixture 11","Sort fixture 10","Sort fixture 09","Sort fixture 08");
        assertThat(service.workspace(company,"won","Sort fixture",owner+999999,0L,null,1,50,true,new WorkspaceSort("client","asc")).items()).isEmpty();
    }
    @Test void dateOrderKeepsUndatedLastInBothDirectionsAndStableTiesAcrossPages() {
        long early=newSale("Early"),late=newSale("Late"),tie=newSale("Tie");
        service.save(company,user,"won",early,command(0,0,"pending",LocalDate.of(2026,10,18),false));
        service.save(company,user,"won",late,command(0,0,"pending",LocalDate.of(2026,10,20),false));
        service.save(company,user,"won",tie,command(0,0,"pending",LocalDate.of(2026,10,20),false));
        assertThat(sorted("won",0L,"nextAction","asc")).extracting(Item::sourceId).containsExactly(early,tie,late,sale);
        assertThat(sorted("won",0L,"nextAction","desc")).extracting(Item::sourceId).containsExactly(tie,late,early,sale);
        var pages=new ArrayList<Long>();for(int page=1;page<=4;page++)pages.add(service.workspace(company,"won",null,null,0L,null,page,1,true,new WorkspaceSort("nextAction","desc")).items().getFirst().sourceId());
        assertThat(pages).containsExactly(tie,late,early,sale);
    }
    @Test void stagesFollowConfiguredFlowOrderInsteadOfAlphabeticLabels() {
        var flow=service.saveFlow(company,user,null,new SaveFlow(UUID.randomUUID().toString(),null,"Ordered service",false,
            List.of(new Stage("z_start","Z first","BLUE"),new Stage("a_delivery","A second","AQUA"),new Stage("completed","Completed","GREEN"))));
        long middle=newSale("Middle"),last=newSale("Last");
        service.save(company,user,"won",sale,command(0,flow.id(),"z_start",null,false));
        service.save(company,user,"won",middle,command(0,flow.id(),"a_delivery",null,false));
        service.save(company,user,"won",last,command(0,flow.id(),"completed",null,false));
        assertThat(sorted("won",flow.id(),"stage","asc")).extracting(Item::sourceId).containsExactly(sale,middle,last);
        assertThat(sorted("won",flow.id(),"stage","desc")).extracting(Item::sourceId).containsExactly(last,middle,sale);
        long pending=newSale("Virtual pending"),delivery=newSale("Delivery");
        service.save(company,user,"won",delivery,command(0,0,"delivery",null,false));
        assertThat(sorted("won",0L,"stage","asc")).extracting(Item::sourceId).containsExactly(pending,delivery);
    }
    @Test void lostRecoveryOrderAndReasonSortDoNotChangeAnyRecoveryState() {
        long scheduled=newLoss("Scheduled"),paused=newLoss("Paused"),recovered=newLoss("Recovered");
        service.save(company,user,"lost",scheduled,command(0,0,"pending",LocalDate.now().plusDays(10),false));
        service.save(company,user,"lost",paused,new SaveWork(UUID.randomUUID().toString(),0,0L,"pending",owner,"Review",null,"","A reason",true));
        var work=service.save(company,user,"lost",recovered,new SaveWork(UUID.randomUUID().toString(),0,0L,"pending",owner,"Review",null,"","Z reason",false));
        service.reactivate(company,user,recovered,new Reactivate(UUID.randomUUID().toString(),work.item().version(),"Explicit test recovery",null));
        int opportunityCount=opportunities();
        assertThat(sorted("lost",null,"stage","asc")).extracting(Item::sourceId).containsExactly(lost,scheduled,paused,recovered);
        assertThat(sorted("lost",null,"stage","desc")).extracting(Item::sourceId).containsExactly(recovered,paused,scheduled,lost);
        assertThat(sorted("lost",null,"lossReason","asc")).extracting(Item::sourceId).containsExactly(paused,scheduled,recovered,lost);
        assertThat(sorted("lost",null,"lossReason","desc")).extracting(Item::sourceId).containsExactly(recovered,scheduled,paused,lost);
        assertThat(opportunities()).isEqualTo(opportunityCount);
        assertThat(service.detail(company,"lost",lost).item().recoveryStatus()).isEqualTo("unscheduled");
    }
    @Test void ownerReferenceAndEmptyCustomerSortsAreBoundedAndUseVisibleFallbacks() {
        long alpha=newSale("Alpha"),empty=newSale("");
        db.update("UPDATE sales_records SET sale_number='AAA',seller_name='Zed',seller_user_company_id=NULL WHERE company_id=? AND id=?",company,alpha);
        db.update("UPDATE sales_records SET sale_number='BBB',seller_name='Ada',seller_user_company_id=NULL WHERE company_id=? AND id=?",company,empty);
        db.update("UPDATE sales_records SET sale_number='ZZZ',seller_name='',seller_user_company_id=NULL WHERE company_id=? AND id=?",company,sale);
        assertThat(sorted("won",0L,"sale","asc")).extracting(Item::sourceId).containsExactly(alpha,empty,sale);
        assertThat(sorted("won",0L,"sale","desc")).extracting(Item::sourceId).containsExactly(sale,empty,alpha);
        assertThat(sorted("won",0L,"owner","asc")).extracting(Item::sourceId).containsExactly(empty,alpha,sale);
        assertThat(sorted("won",0L,"owner","desc")).extracting(Item::sourceId).containsExactly(alpha,empty,sale);
        assertThat(sorted("won",0L,"client","asc")).extracting(Item::sourceId).containsExactly(alpha,empty,sale);
        assertThatThrownBy(()->sorted("won",0L,"lossReason","asc")).isInstanceOf(IllegalArgumentException.class);
    }
    List<Item> sorted(String kind,Long flow,String column,String direction) {
        return service.workspace(company,kind,null,null,flow,null,1,100,true,new WorkspaceSort(column,direction)).items();
    }
    long newSale(String name) {
        String reference="SORT-"+UUID.randomUUID().toString().substring(0,8);
        db.update("INSERT INTO sales_records(company_id,sale_number,customer_name,sale_date,currency,total_amount,commercial_status,seller_user_company_id) VALUES(?,?,?,CURRENT_DATE,'MXN',10,'confirmed',?)",company,reference,name,owner);
        return db.queryForObject("SELECT id FROM sales_records WHERE company_id=? AND sale_number=?",Long.class,company,reference);
    }
    long newLoss(String name) {
        long id=((Number)sales.create(company,user,"opportunities",new LinkedHashMap<>(Map.of("opportunityName",name,"status","active","ownerUserCompanyId",owner))).get("id")).longValue();
        sales.update(company,user,"opportunities",id,Map.of("stage","lost"));return id;
    }
    int opportunities(){return db.queryForObject("SELECT COUNT(*) FROM sales_opportunities WHERE company_id=?",Integer.class,company);}
    int notices(){return db.queryForObject("SELECT COUNT(*) FROM app_notifications WHERE company_id=? AND source_type='post_sale_work' AND status<>'cancelled'",Integer.class,company);}
}
