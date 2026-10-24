package com.indice.erp.sales;
import static org.assertj.core.api.Assertions.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.workspace.UserWorkspaceStateService;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
@SpringBootTest
@Transactional
class OpportunityFlowColorsIntegrationTest {
 @Autowired JdbcTemplate jdbc;
 @Autowired UserWorkspaceStateService preferences;
 @Autowired ObjectMapper json;
 @Test void colorsAreDurablePerCompanyUserAndFlowWithoutChangingTeamStages(){
  assertThat(jdbc.queryForObject("SELECT DATABASE()",String.class)).isEqualTo("indice_test_db");
  String key=UUID.randomUUID().toString();jdbc.update("INSERT INTO companies(name) VALUES (?)",key);long company=jdbc.queryForObject("SELECT id FROM companies WHERE name=?",Long.class,key);
  jdbc.update("INSERT INTO users(email,password_hash) VALUES (?,'isolated')",key+"@example.test");long user=jdbc.queryForObject("SELECT id FROM users WHERE email=?",Long.class,key+"@example.test");
  preferences.save(company,user,"sales","opportunity-colors-42",json.createObjectNode().set("colors",json.createObjectNode().put("new","#C026D3")),1);
  assertThat(preferences.get(company,user,"sales","opportunity-colors-42").get("expiresAt")).isNull();
  assertThat(preferences.get(company,user+1,"sales","opportunity-colors-42").get("updatedAt")).isNull();
  assertThat(preferences.get(company+1,user,"sales","opportunity-colors-42").get("updatedAt")).isNull();
  assertThat(preferences.get(company,user,"sales","opportunity-colors-43").get("updatedAt")).isNull();
  assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM sales_opportunity_flow_stages WHERE company_id=?",Integer.class,company)).isZero();
 }
}
