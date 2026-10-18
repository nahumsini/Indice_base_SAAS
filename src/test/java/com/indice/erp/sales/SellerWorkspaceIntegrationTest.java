package com.indice.erp.sales;

import static org.assertj.core.api.Assertions.*;
import static com.indice.erp.sales.SellerWorkspaceDtos.*;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest(properties="app.sales.call-reminder-initial-delay-ms=86400000")
@Transactional
class SellerWorkspaceIntegrationTest {
    @Autowired JdbcTemplate db;
    @Autowired SellerWorkspaceService seller;
    @Autowired SalesService sales;
    long company,user,flow,opportunity;
    @BeforeEach void setup() {
        // The repository test profile uses indice_test_db, never the functional database.
        assertThat(db.queryForObject("SELECT DATABASE()",String.class)).isEqualTo("indice_test_db");
        String name=UUID.randomUUID().toString();
        db.update("INSERT INTO companies(name) VALUES(?)",name);
        company=db.queryForObject("SELECT id FROM companies WHERE name=?",Long.class,name);
        user=db.queryForObject("SELECT id FROM users ORDER BY id LIMIT 1",Long.class);
        db.update("INSERT INTO user_companies(company_id,user_id,role,status,visibility) VALUES(?,?,'admin','active','all')",company,user);
        var record=sales.create(company,user,"opportunities",new LinkedHashMap<>(Map.of("opportunityName","Seller test","nextAction","call","status","active")));
        opportunity=((Number)record.get("id")).longValue(); flow=((Number)record.get("flowId")).longValue();
    }
    ScriptContent content(String name) { return new ScriptContent(name,"Objective","",List.of(new ScriptBlock("Opening","Hello {{contact}}"))); }
    InteractionRequest command(String revision) { return new InteractionRequest(UUID.randomUUID().toString(),revision,"answered","Agreed next step",null,null,"schedule","call",LocalDate.now().plusDays(2)+" 10:00"); }
    String revision() { return seller.opportunity(company,flow,opportunity).revision(); }
    @Test void factoryScriptsKeepPublishedRevisionWhileDraftChangesAndArchiveRetainsHistory() {
        var first=seller.saveScript(company,flow,user,new SaveScriptRequest(null,null,"PUBLISHED",content("Opening")));
        var draft=seller.saveScript(company,flow,user,new SaveScriptRequest(first.id(),1,"DRAFT",content("Changed")));
        assertThat(draft.version()).isEqualTo(2); assertThat(draft.publishedVersion()).isEqualTo(1);
        assertThat(draft.published().name()).isEqualTo("Opening");
        assertThatThrownBy(()->seller.saveScript(company,flow,user,new SaveScriptRequest(first.id(),1,"PUBLISHED",content("Stale")))).isInstanceOf(SellerWorkspaceService.Conflict.class);
        seller.saveScript(company,flow,user,new SaveScriptRequest(first.id(),2,"ARCHIVED",content("Changed")));
        var base=command(revision());
        var result=seller.record(company,flow,opportunity,user,new InteractionRequest(base.requestKey(),base.revision(),base.outcome(),base.notes(),first.id(),1,base.followupMode(),base.nextAction(),base.nextActionAt()));
        assertThat(result.interaction().scriptName()).isEqualTo("Opening");
        assertThat(db.queryForObject("SELECT COUNT(*) FROM sales_call_script_versions WHERE company_id=?",Integer.class,company)).isEqualTo(3);
    }
    @Test void recordsOneResultAndFollowupOnRetriesWithoutChangingStageOrGeneralNotes() {
        var before=sales.get(company,"opportunities",opportunity);
        var command=command(revision());
        var saved=seller.record(company,flow,opportunity,user,command);
        var retry=seller.record(company,flow,opportunity,user,command);
        assertThat(retry.interaction().id()).isEqualTo(saved.interaction().id());
        assertThat(saved.current().opportunity().get("stage")).isEqualTo(before.get("stage"));
        assertThat(saved.current().opportunity().get("notes")).isEqualTo(before.get("notes"));
        assertThat(saved.current().opportunity().get("nextActionScheduledAt")).isNotNull();
        assertThat(seller.history(company,flow,opportunity,null).items()).hasSize(1);
        assertThat(seller.summary(company,flow,user).attempts()).isEqualTo(1);
        assertThat(seller.summary(company,flow,user).conversations()).isEqualTo(1);
        assertThat(seller.summary(company,flow,user).followups()).isEqualTo(1);
    }
    @Test void staleOpportunityAndChangedRetryPayloadCannotOverwriteFollowup() {
        var request=command(revision()); sales.update(company,user,"opportunities",opportunity,Map.of("notes","Concurrent note"));
        assertThatThrownBy(()->seller.record(company,flow,opportunity,user,request)).isInstanceOf(SellerWorkspaceService.Conflict.class);
        var valid=command(revision()); seller.record(company,flow,opportunity,user,valid);
        var changed=new InteractionRequest(valid.requestKey(),valid.revision(),"busy",valid.notes(),null,null,"clear",null,null);
        assertThatThrownBy(()->seller.record(company,flow,opportunity,user,changed)).isInstanceOf(SellerWorkspaceService.Conflict.class);
    }
    @Test void tenantAndFlowOwnershipAreEnforcedForReadsAndWrites() {
        assertThatThrownBy(()->seller.opportunity(company+99999,flow,opportunity)).isInstanceOf(NoSuchElementException.class);
        assertThatThrownBy(()->seller.history(company,flow+99999,opportunity,null)).isInstanceOf(NoSuchElementException.class);
        assertThatThrownBy(()->seller.record(company,flow+99999,opportunity,user,command(revision()))).isInstanceOf(NoSuchElementException.class);
        var script=seller.saveScript(company,flow,user,new SaveScriptRequest(null,null,"PUBLISHED",content("Scoped")));
        assertThatThrownBy(()->seller.saveScript(company+99999,flow,user,new SaveScriptRequest(script.id(),1,"DRAFT",content("Forged")))).isInstanceOf(NoSuchElementException.class);
    }
    @Test void noAnswerClearsScheduleWithoutPretendingContactWasMade() {
        var request=new InteractionRequest(UUID.randomUUID().toString(),revision(),"no_answer","",null,null,"clear",null,null);
        var saved=seller.record(company,flow,opportunity,user,request);
        assertThat(saved.current().opportunity().get("lastContactAt")).isNull();
        assertThat(saved.current().opportunity().get("nextActionScheduledAt")).isNull();
        assertThat(seller.summary(company,flow,user).conversations()).isZero();
    }
    @Test void invalidSchedulesAndUnpublishedScriptsCannotCreateHistory() {
        var script=seller.saveScript(company,flow,user,new SaveScriptRequest(null,null,"DRAFT",content("Draft")));
        var request=new InteractionRequest(UUID.randomUUID().toString(),revision(),"answered","",script.id(),1,"clear",null,null);
        assertThatThrownBy(()->seller.record(company,flow,opportunity,user,request)).isInstanceOf(NoSuchElementException.class);
        assertThat(seller.history(company,flow,opportunity,null).items()).isEmpty();
    }
    @Test void invalidScheduleRollsBackWithoutCreatingAConversation() {
        var request=new InteractionRequest(UUID.randomUUID().toString(),revision(),"answered","Unsaved",null,null,"schedule","call","2026-02-30 10:00");
        assertThatThrownBy(()->seller.record(company,flow,opportunity,user,request)).isInstanceOf(IllegalArgumentException.class);
        assertThat(seller.history(company,flow,opportunity,null).items()).isEmpty();
        assertThat(sales.get(company,"opportunities",opportunity).get("lastContactAt")).isNull();
    }
    @Test @Transactional(propagation=org.springframework.transaction.annotation.Propagation.NOT_SUPPORTED)
    void concurrentRetriesHaveOneDurableReceipt() throws Exception {
        var request=command(revision());
        try(var pool=java.util.concurrent.Executors.newFixedThreadPool(2)) {
            var start=new java.util.concurrent.CountDownLatch(1);
            var a=pool.submit(()->{start.await();return seller.record(company,flow,opportunity,user,request).interaction().id();});
            var b=pool.submit(()->{start.await();return seller.record(company,flow,opportunity,user,request).interaction().id();});
            start.countDown();assertThat(a.get(10,java.util.concurrent.TimeUnit.SECONDS)).isEqualTo(b.get(10,java.util.concurrent.TimeUnit.SECONDS));
        }
        assertThat(seller.history(company,flow,opportunity,null).items()).hasSize(1);
    }
    @Test void pausedOpportunitiesCannotAcceptResults() {
        sales.update(company,user,"opportunities",opportunity,Map.of("status","on_hold"));
        assertThatThrownBy(()->seller.record(company,flow,opportunity,user,command(revision()))).isInstanceOf(SellerWorkspaceService.Conflict.class);
    }
}
