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
    int opportunities(){return db.queryForObject("SELECT COUNT(*) FROM sales_opportunities WHERE company_id=?",Integer.class,company);}
    int notices(){return db.queryForObject("SELECT COUNT(*) FROM app_notifications WHERE company_id=? AND source_type='post_sale_work' AND status<>'cancelled'",Integer.class,company);}
}
