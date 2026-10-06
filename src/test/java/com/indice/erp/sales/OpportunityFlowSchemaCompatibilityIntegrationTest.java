package com.indice.erp.sales;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

/** Same behavioral probe is run against the candidate and schema-compatible recovery sources. */
@SpringBootTest
@Transactional
class OpportunityFlowSchemaCompatibilityIntegrationTest {
    @Autowired JdbcTemplate jdbc;
    @Autowired SalesService sales;
    @Autowired OpportunityFlowService flows;

    @Test
    void createsReassignsAndClosesOpportunitiesWithoutLosingHistoryOrTenantOwnership() {
        assertThat(jdbc.queryForObject("SELECT DATABASE()", String.class)).isEqualTo("indice_test_db");
        assertThat(jdbc.queryForObject("""
            SELECT is_nullable FROM information_schema.columns
            WHERE table_schema = DATABASE() AND table_name = 'sales_opportunities'
              AND column_name = 'assigned_flow_id'
            """, String.class)).isEqualTo("NO");
        var key = UUID.randomUUID().toString();
        var company = company("Recovery probe " + key);
        var otherCompany = company("Other recovery probe " + key);
        jdbc.update("INSERT INTO users (email, password_hash) VALUES (?, 'isolated-no-login')", key + "@example.test");
        var user = jdbc.queryForObject("SELECT id FROM users WHERE email = ?", Long.class, key + "@example.test");
        jdbc.update("""
            INSERT INTO user_companies (company_id, user_id, role, status, visibility)
            VALUES (?, ?, 'superadmin', 'active', 'all')
            """, company, user);
        var defaultFlow = flows.catalog(company, true).defaultFlowId();
        var opportunity = sales.create(company, user, "opportunities", Map.of("opportunityName", "Synthetic opportunity"));
        var id = ((Number) opportunity.get("id")).longValue();
        assertThat(assignment(company, id)).isEqualTo(defaultFlow);

        var destination = flows.create(company, user, new OpportunityFlowDtos.SaveFlowRequest("Recovery flow", List.of(
            new OpportunityFlowDtos.StageRequest("discovery", "Discovery", "BLUE", 20),
            new OpportunityFlowDtos.StageRequest("won", "Won", "GREEN", 100),
            new OpportunityFlowDtos.StageRequest("lost", "Lost", "CORAL", 0)))).id();
        assertThat(flows.positions(company, destination).positions()).isEmpty();
        sales.update(company, user, "opportunities", id, Map.of("flowId", destination));
        assertThat(assignment(company, id)).isEqualTo(destination);
        assertThat(sales.get(company, "opportunities", id)).containsEntry("stage", "discovery");
        assertThat(flows.positions(company, defaultFlow).positions()).isEmpty();
        assertThat(flows.positions(company, destination).positions()).hasSize(1);

        sales.update(company, user, "opportunities", id, Map.of("stage", "won"));
        assertThat(sales.get(company, "opportunities", id)).containsEntry("lifecycleStatus", "WON");
        sales.update(company, user, "opportunities", id, Map.of("flowId", defaultFlow));
        assertThat(assignment(company, id)).isEqualTo(defaultFlow);
        assertThat(sales.get(company, "opportunities", id))
            .containsEntry("stage", "won").containsEntry("lifecycleStatus", "WON");
        assertThat(jdbc.queryForObject("""
            SELECT COUNT(*) FROM sales_opportunity_flow_position_history
            WHERE company_id = ? AND opportunity_id = ? AND from_flow_id IS NOT NULL
            """, Integer.class, company, id)).isEqualTo(3);
        assertThat(jdbc.queryForObject("""
            SELECT COUNT(*) FROM sales_opportunity_flow_positions WHERE company_id = ? AND opportunity_id = ?
            """, Integer.class, company, id)).isEqualTo(2);

        var otherFlow = flows.catalog(otherCompany, true).defaultFlowId();
        assertThatThrownBy(() -> sales.get(otherCompany, "opportunities", id)).isInstanceOf(java.util.NoSuchElementException.class);
        assertThatThrownBy(() -> sales.update(company, user, "opportunities", id, Map.of("flowId", otherFlow)))
            .isInstanceOf(java.util.NoSuchElementException.class);
        assertThat(assignment(company, id)).isEqualTo(defaultFlow);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM sales_opportunities WHERE company_id = ?", Integer.class, otherCompany)).isZero();
    }

    private long company(String name) {
        jdbc.update("INSERT INTO companies (name) VALUES (?)", name);
        return jdbc.queryForObject("SELECT id FROM companies WHERE name = ?", Long.class, name);
    }

    private long assignment(long company, long opportunity) {
        return jdbc.queryForObject("SELECT assigned_flow_id FROM sales_opportunities WHERE company_id = ? AND id = ?",
            Long.class, company, opportunity);
    }
}
