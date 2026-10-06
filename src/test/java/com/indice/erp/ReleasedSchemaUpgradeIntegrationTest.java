package com.indice.erp;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

/** Explicit release rehearsal; refuses a nonempty or non-test database. Never resets a database. */
class ReleasedSchemaUpgradeIntegrationTest {
    @Test
    void releasedV289UpgradesWithoutRewritingHistoryLeadsOrExistingFlowPositions() {
        assumeTrue(Boolean.getBoolean("indice.migrations.rehearseUpgrade"));
        String url = System.getenv("TEST_DATASOURCE_URL");
        assertThat(url).isNotNull().contains("/indice_test_db?");
        var source = new DriverManagerDataSource(url, System.getenv("TEST_DATASOURCE_USERNAME"),
                System.getenv("TEST_DATASOURCE_PASSWORD"));
        var jdbc = new JdbcTemplate(source);
        assertThat(jdbc.queryForObject("SELECT DATABASE()", String.class)).isEqualTo("indice_test_db");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM information_schema.tables "
                + "WHERE table_schema=DATABASE()", Integer.class)).isZero();

        Flyway.configure().dataSource(source).locations("classpath:db/migration")
                .target("289").cleanDisabled(true).load().migrate();
        var history = jdbc.queryForList("SELECT * FROM flyway_schema_history ORDER BY installed_rank");
        int lastRank = jdbc.queryForObject("SELECT MAX(installed_rank) FROM flyway_schema_history", Integer.class);
        assertThat(jdbc.queryForObject("SELECT checksum FROM flyway_schema_history WHERE version='288'", Integer.class))
                .isEqualTo(1234112480);
        assertThat(jdbc.queryForObject("SELECT checksum FROM flyway_schema_history WHERE version='289'", Integer.class))
                .isEqualTo(1752329598);

        String key = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO companies (name) VALUES (?)", "Upgrade " + key);
        long company = jdbc.queryForObject("SELECT id FROM companies WHERE name=?", Long.class, "Upgrade " + key);
        jdbc.update("INSERT INTO sales_opportunity_flows (company_id, flow_key, name, is_default) "
                + "VALUES (?, 'other', 'Other flow', 0)", company);
        jdbc.update("INSERT INTO sales_opportunity_flows (company_id, flow_key, name, is_default) "
                + "VALUES (?, 'default', 'Default flow', 1)", company);
        long flow = jdbc.queryForObject("SELECT id FROM sales_opportunity_flows "
                + "WHERE company_id=? AND flow_key='default'", Long.class, company);
        for (String stage : new String[]{"new", "won", "lost", "proposal"}) {
            jdbc.update("INSERT INTO sales_opportunity_flow_stages "
                    + "(company_id, flow_id, stage_key, label, stage_type, sort_order) VALUES (?, ?, ?, ?, ?, ?)",
                    company, flow, stage, stage, stage.equals("won") ? "WON" : stage.equals("lost") ? "LOST" : "OPEN",
                    stage.equals("new") ? 0 : 1);
        }
        for (String status : new String[]{"OPEN", "WON", "LOST"}) {
            jdbc.update("INSERT INTO sales_opportunities "
                    + "(company_id, opportunity_code, opportunity_name, lifecycle_status) VALUES (?, ?, 'Upgrade', ?)",
                    company, status, status);
        }
        long open = jdbc.queryForObject("SELECT id FROM sales_opportunities WHERE company_id=? "
                + "AND lifecycle_status='OPEN'", Long.class, company);
        long proposal = jdbc.queryForObject("SELECT id FROM sales_opportunity_flow_stages "
                + "WHERE flow_id=? AND stage_key='proposal'", Long.class, flow);
        jdbc.update("INSERT INTO sales_opportunity_flow_positions "
                + "(company_id, opportunity_id, flow_id, stage_id, probability_percent) VALUES (?, ?, ?, ?, 75)",
                company, open, flow, proposal);
        var position = jdbc.queryForList("SELECT * FROM sales_opportunity_flow_positions WHERE opportunity_id=?", open);
        jdbc.update("INSERT INTO platform_leads (submission_id, payload_hash, full_name, company_name, email, "
                + "challenge, source_channel, contact_consent_at, status, plan_interest) "
                + "VALUES (?, ?, 'Synthetic', 'Upgrade', 'upgrade@example.test', 'Test', 'WEBSITE', NOW(6), 'PROPOSAL', 'ESCALA')",
                key, "a".repeat(64));
        long lead = jdbc.queryForObject("SELECT id FROM platform_leads WHERE submission_id=?", Long.class, key);
        jdbc.update("INSERT INTO platform_lead_events (lead_id, event_type, to_status, note) "
                + "VALUES (?, 'STATUS_CHANGED', 'PROPOSAL', 'Synthetic history')", lead);
        var leadBefore = jdbc.queryForList("SELECT * FROM platform_leads WHERE id=?", lead);
        var eventsBefore = jdbc.queryForList("SELECT * FROM platform_lead_events WHERE lead_id=?", lead);

        var current = Flyway.configure().dataSource(source).locations("classpath:db/migration")
                .cleanDisabled(true).load();
        assertThat(current.migrate().migrationsExecuted).isEqualTo(3);
        assertThat(current.validateWithResult().validationSuccessful).isTrue();
        assertThat(current.migrate().migrationsExecuted).isZero();
        assertThat(jdbc.queryForList("SELECT * FROM flyway_schema_history WHERE installed_rank<=? "
                + "ORDER BY installed_rank", lastRank)).isEqualTo(history);
        assertThat(jdbc.queryForList("SELECT * FROM platform_leads WHERE id=?", lead)).isEqualTo(leadBefore);
        assertThat(jdbc.queryForList("SELECT * FROM platform_lead_events WHERE lead_id=?", lead)).isEqualTo(eventsBefore);
        assertThat(jdbc.queryForList("SELECT * FROM sales_opportunity_flow_positions WHERE opportunity_id=?", open))
                .isEqualTo(position);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM sales_opportunities "
                + "WHERE company_id=? AND assigned_flow_id=?", Integer.class, company, flow)).isEqualTo(3);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM sales_opportunity_flow_positions p "
                + "JOIN sales_opportunities o ON o.id=p.opportunity_id "
                + "JOIN sales_opportunity_flow_stages s ON s.id=p.stage_id "
                + "WHERE o.company_id=? AND o.lifecycle_status IN ('WON','LOST') "
                + "AND BINARY UPPER(s.stage_key)=BINARY o.lifecycle_status", Integer.class, company)).isEqualTo(2);
    }
}
