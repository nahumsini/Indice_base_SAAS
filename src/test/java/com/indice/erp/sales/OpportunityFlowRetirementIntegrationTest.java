package com.indice.erp.sales;

import static org.assertj.core.api.Assertions.*;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class OpportunityFlowRetirementIntegrationTest {
    @Autowired JdbcTemplate jdbc;
    @Autowired OpportunityFlowService flows;
    @Autowired OpportunityFlowRetirementService retire;
    @Autowired SalesService sales;
    long company,user,factory,source,target;
    @BeforeEach void prepare() {
        assertThat(jdbc.queryForObject("SELECT DATABASE()",String.class)).isEqualTo("indice_test_db");
        String name="Flow retirement "+UUID.randomUUID();
        jdbc.update("INSERT INTO companies(name) VALUES (?)",name);
        company=jdbc.queryForObject("SELECT id FROM companies WHERE name=?",Long.class,name);
        jdbc.update("INSERT INTO users(email,password_hash) VALUES (?,'isolated-no-login')",name+"@example.test");
        user=jdbc.queryForObject("SELECT id FROM users WHERE email=?",Long.class,name+"@example.test");
        jdbc.update("INSERT INTO user_companies(company_id,user_id,role,status,visibility) VALUES (?,?,'superadmin','active','all')",company,user);
        factory=flows.catalog(company,true).defaultFlowId();
        source=create("Source"); target=create("Destination");
    }
    long create(String name) {
        return flows.create(company,user,new OpportunityFlowDtos.SaveFlowRequest(name,List.of(
            new OpportunityFlowDtos.StageRequest("discovery","Discovery","BLUE",25),
            new OpportunityFlowDtos.StageRequest("won","Won","GREEN",100),
            new OpportunityFlowDtos.StageRequest("lost","Lost","CORAL",0)))).id();
    }
    long opportunity(String stage) {
        return ((Number)sales.create(company,user,"opportunities",Map.of("opportunityName","Synthetic "+stage,"flowId",source,"stage",stage,"notes","Notes remain intact")).get("id")).longValue();
    }
    OpportunityFlowRetirementService.Command command(OpportunityFlowRetirementService.Preview preview,Map<String,String> mapping) {
        return new OpportunityFlowRetirementService.Command(UUID.randomUUID().toString(),preview.signature(),target,mapping);
    }
    @Test void retiresWithExplicitMappingPreservesTerminalStateAndEveryRelatedRecordAndReplaysOnce() {
        long open=opportunity("discovery"),won=opportunity("won"),lost=opportunity("lost");
        var preview=retire.preview(company,source,target); assertThat(preview.opportunityCount()).isEqualTo(3);
        var cmd=command(preview,Map.of("discovery","discovery"));
        var result=retire.retire(company,user,source,cmd);
        assertThat(result.movedCount()).isEqualTo(3);
        assertThat(retire.retire(company,user,source,cmd)).isEqualTo(result);
        for(var id:List.of(open,won,lost)) {
            var record=sales.get(company,"opportunities",id);
            assertThat(record).containsEntry("flowId",target).containsEntry("notes","Notes remain intact");
        }
        assertThat(sales.get(company,"opportunities",won)).containsEntry("lifecycleStatus","WON").containsEntry("stage","won");
        assertThat(sales.get(company,"opportunities",lost)).containsEntry("lifecycleStatus","LOST").containsEntry("stage","lost");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM sales_opportunity_flow_position_history WHERE company_id=? AND reason_code='FLOW_RETIRED'",Integer.class,company)).isEqualTo(3);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM sales_opportunity_flow_positions WHERE company_id=? AND flow_id=?",Integer.class,company,source)).isEqualTo(3);
        assertThat(flows.catalog(company,true).flows()).noneMatch(flow->flow.id()==source);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM sales_opportunity_flow_revisions WHERE company_id=? AND flow_id=?",Integer.class,company,source)).isEqualTo(2);
    }
    @Test void factoryAndForeignFlowsCannotBeRetiredOrUsedAsDestination() {
        assertThatThrownBy(()->retire.preview(company,factory,target)).isInstanceOf(IllegalArgumentException.class);
        jdbc.update("INSERT INTO companies(name) VALUES ('Other isolated retirement company')");
        long other=jdbc.queryForObject("SELECT MAX(id) FROM companies",Long.class);
        long foreign=flows.catalog(other,true).defaultFlowId();
        assertThatThrownBy(()->retire.preview(company,source,foreign)).isInstanceOf(NoSuchElementException.class);
        assertThatThrownBy(()->retire.preview(other,source,foreign)).isInstanceOf(NoSuchElementException.class);
        assertThat(jdbc.queryForObject("SELECT is_active FROM sales_opportunity_flows WHERE id=?",Integer.class,factory)).isEqualTo(1);
    }
    @Test void staleReviewCannotMoveNewlyAddedOpportunities() {
        var preview=retire.preview(company,source,target);opportunity("discovery");
        assertThatThrownBy(()->retire.retire(company,user,source,command(preview,Map.of())))
            .isInstanceOf(OpportunityFlowRetirementService.Changed.class);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM sales_opportunities WHERE company_id=? AND assigned_flow_id=?",Integer.class,company,source)).isEqualTo(1);
    }
    @Test void invalidMappingsCannotCloseOrReopenOpportunities() {
        long id=opportunity("discovery");var preview=retire.preview(company,source,target);
        assertThatThrownBy(()->retire.retire(company,user,source,command(preview,Map.of("discovery","won"))))
            .isInstanceOf(IllegalArgumentException.class);
        assertThat(sales.get(company,"opportunities",id)).containsEntry("flowId",source).containsEntry("lifecycleStatus","OPEN");
    }
    @Test void emptyRetirementKeepsHistoryAndAllowsReusingTheDisplayNameWithoutAKeyCollision() {
        jdbc.update("UPDATE sales_opportunity_flows SET is_default=(id=?) WHERE company_id=?",source,company);
        var preview=retire.preview(company,source,target);
        retire.retire(company,user,source,command(preview,Map.of()));
        assertThat(flows.catalog(company,true).defaultFlowId()).isEqualTo(target);
        assertThat(create("Source")).isNotEqualTo(source);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM sales_opportunity_flows WHERE company_id=? AND name='Source'",Integer.class,company)).isEqualTo(2);
    }
    @Test void changedCommandCannotReuseTheReceiptIdentity() {
        var preview=retire.preview(company,source,target);var original=command(preview,Map.of());
        retire.retire(company,user,source,original);
        var changed=new OpportunityFlowRetirementService.Command(original.commandId(),original.signature(),factory,Map.of());
        assertThatThrownBy(()->retire.retire(company,user,source,changed)).isInstanceOf(OpportunityFlowRetirementService.Changed.class);
    }
}
