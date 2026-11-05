package com.indice.erp.ai.mailing;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.ai.access.AiAccessTokenService;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.sales.SalesAssistantService;
import com.indice.erp.sales.SalesAssistantContracts;
import com.indice.erp.sales.mailing.MailingAudienceContracts.ListInput;
import com.indice.erp.sales.mailing.MailingAudienceService;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItems;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Real request boundaries: an enclosing test transaction hides discovery/commit locking bugs. */
@SpringBootTest(properties = {"app.email.enabled=false", "app.entitlements.projection-enabled=false",
    "app.mail-accounts.worker-enabled=false", "app.mailing.worker-enabled=false"})
@AutoConfigureMockMvc
class AiMailingListHttpIntegrationTest {
    @Autowired JdbcTemplate db;
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @Autowired AiAccessTokenService tokens;
    @Autowired MailingAudienceService audience;
    @Autowired SalesAssistantService commercialOwner;
    long company, userId, membership, otherUserId;
    AuthSessionUser actor;
    String bearer;
    static final String ROOT = "/api/v1/ai/tools/mailing_lists/";

    @BeforeEach void setup() {
        assertThat(db.queryForObject("SELECT DATABASE()", String.class)).isEqualTo("indice_test_db");
        assertThat(TransactionSynchronizationManager.isActualTransactionActive()).isFalse();
        company = insert("INSERT INTO companies(name) VALUES(?)", "HTTP regression " + UUID.randomUUID());
        userId = insert("INSERT INTO users(email,password_hash,full_name) VALUES(?,'synthetic','HTTP regression')", UUID.randomUUID()+"@example.test");
        membership = insert("INSERT INTO user_companies(user_id,company_id,role,status) VALUES(?,?,'admin','active')", userId, company);
        db.update("INSERT INTO company_module_entitlements(company_id,module_slug,status,source) VALUES(?,'crm','active','test')", company);
        db.update("INSERT INTO user_company_module_roles(user_company_id,module_slug,role) VALUES(?,'crm','admin')", membership);
        for (String tab : List.of("mailing", "contacts", "leads", "quotes"))
            db.update("INSERT INTO user_company_tab_permissions(user_company_id,module_slug,tab_key) VALUES(?,'crm',?)", membership, tab);
        actor = new AuthSessionUser(userId, company, membership, "HTTP regression", "admin");
        bearer = tokens.issue(actor, "HTTP regression", 1, Set.of("opportunities.read", "customers.read", "quotes.read", "commercial.references:read",
            AiAccessTokenService.MAILING_LISTS_READ, AiAccessTokenService.MAILING_LISTS_ASSIGN)).accessToken();
    }

    @AfterEach void cleanup() {
        if (company > 0) {
            db.update("DELETE FROM ai_action_audit_events WHERE company_id=?", company);
            db.update("DELETE FROM ai_action_executions WHERE company_id=?", company);
            db.update("DELETE FROM ai_action_confirmations WHERE company_id=?", company);
            db.update("DELETE FROM sales_mailing_audience_events WHERE company_id=?", company);
            db.update("DELETE FROM sales_mailing_audience_members WHERE company_id=?", company);
            db.update("DELETE FROM sales_mailing_audience_lists WHERE company_id=?", company);
            db.update("DELETE FROM sales_quotes WHERE company_id=?", company);
            db.update("DELETE FROM sales_opportunities WHERE company_id=?", company);
            db.update("DELETE FROM sales_contacts WHERE company_id=?", company);
            db.update("DELETE FROM companies WHERE id=?", company);
        }
        if (userId > 0) db.update("DELETE FROM users WHERE id=?", userId);
        if (otherUserId > 0) db.update("DELETE FROM users WHERE id=?", otherUserId);
    }

    @Test void discoveryAndCommitWorkAcrossIndependentRequestsAndRecheckEntitlement() throws Exception {
        mvc.perform(get("/api/v1/ai/access/capabilities").header("Authorization", "Bearer " + bearer))
            .andExpect(status().isOk()).andExpect(jsonPath("$.tools", hasItems(
                "list_opportunities", "list_mailing_lists", "preview_assign_mailing_list_contacts", "assign_mailing_list_contacts")));
        long existing = contact("existing"), first = contact("first"), second = contact("second");
        String list = UUID.randomUUID().toString(), other = UUID.randomUUID().toString();
        audience.save(actor, list, new ListInput("Target", List.of(existing), 0));
        audience.save(actor, other, new ListInput("Keep membership", List.of(first), 0));
        JsonNode preview = json(postTool(ROOT + "assign_mailing_list_contacts/preview", Map.of(
            "listId", list, "contactIds", List.of(existing, first, first)))
            .andExpect(status().isOk()).andExpect(jsonPath("$.alreadyInList").value(1)));
        assertThat(audience.list(actor, list).items()).hasSize(1);
        Map<String, Object> commit = Map.of("confirmationToken", preview.get("confirmationToken").asText(), "idempotencyKey", "http-assignment-001");
        postTool(ROOT + "assign_mailing_list_contacts/commit", commit)
            .andExpect(status().isOk()).andExpect(jsonPath("$.replayed").value(false));
        postTool(ROOT + "assign_mailing_list_contacts/commit", commit)
            .andExpect(status().isOk()).andExpect(jsonPath("$.replayed").value(true));
        assertThat(audience.list(actor, list).items()).hasSize(2);
        assertThat(audience.list(actor, other).items()).hasSize(1);
        JsonNode bulk = json(postTool(ROOT + "assign_mailing_list_contacts/preview", Map.of(
            "listId", list, "filters", Map.of("source", "http-regression"))).andExpect(status().isOk()));
        db.update("UPDATE company_module_entitlements SET status='inactive' WHERE company_id=? AND module_slug='crm'", company);
        postTool(ROOT + "assign_mailing_list_contacts/commit", Map.of("confirmationToken", bulk.get("confirmationToken").asText(),
            "idempotencyKey", "http-revoked-001")).andExpect(status().isForbidden());
        assertThat(db.queryForObject("SELECT COUNT(*) FROM sales_mailing_audience_members WHERE company_id=? AND list_id=? AND contact_id=?",
            Integer.class, company, list, second)).isZero();
        db.update("UPDATE company_module_entitlements SET status='active' WHERE company_id=? AND module_slug='crm'", company);
        postTool(ROOT + "assign_mailing_list_contacts/commit", Map.of("confirmationToken", bulk.get("confirmationToken").asText(),
            "idempotencyKey", "http-revoked-001")).andExpect(status().isOk()).andExpect(jsonPath("$.result.added").value(1));
        assertThat(audience.list(actor, list).items()).hasSize(3);
        assertThat(audience.list(actor, other).items()).hasSize(1);
    }

    @Test void distributorsReadOnlyAssignedPortfolioAndExistingUnitScopeStaysBounded() throws Exception {
        otherUserId = insert("INSERT INTO users(email,password_hash,full_name) VALUES(?,'synthetic','Other distributor')", UUID.randomUUID()+"@example.test");
        long otherMember = insert("INSERT INTO user_companies(user_id,company_id,role,status) VALUES(?,?,'user','active')", otherUserId, company);
        long unit = insert("INSERT INTO units(company_id,name) VALUES(?,'Assigned')", company);
        long outside = insert("INSERT INTO units(company_id,name) VALUES(?,'Outside')", company);
        long ownedContact = seed("customer", Map.of("name", "Owned", "ownerUserCompanyId", membership));
        long otherContact = seed("customer", Map.of("name", "Other", "ownerUserCompanyId", otherMember));
        long outsideContact = seed("customer", Map.of("name", "Outside", "ownerUserCompanyId", membership));
        db.update("UPDATE sales_contacts SET unit_id=? WHERE company_id=? AND id IN (?,?)", unit, company, ownedContact, otherContact);
        db.update("UPDATE sales_contacts SET unit_id=? WHERE company_id=? AND id=?", outside, company, outsideContact);
        long owned = seed("opportunity", Map.of("name", "Owned", "customerId", ownedContact, "currency", "MXN", "estimatedValue", 10));
        long stranger = seed("opportunity", Map.of("name", "Other", "customerId", otherContact, "currency", "MXN", "estimatedValue", 999, "ownerUserCompanyId", otherMember));
        seed("opportunity", Map.of("name", "Outside", "customerId", outsideContact, "currency", "MXN", "estimatedValue", 20));
        seed("quote", Map.of("customerId", ownedContact, "currency", "MXN", "items", List.of(Map.of("productName", "Synthetic", "quantity", 1, "unitPrice", 10, "taxPercent", 0))));
        seed("quote", Map.of("customerId", otherContact, "ownerUserCompanyId", otherMember, "currency", "MXN", "items", List.of(Map.of("productName", "Other", "quantity", 1, "unitPrice", 999, "taxPercent", 0))));
        String commercial = "/api/v1/ai/tools/commercial/";
        for (String role : List.of("admin", "user")) {
            db.update("UPDATE user_companies SET role=? WHERE id=?", role, membership);
            postTool(commercial+"list_opportunities", Map.of()).andExpect(status().isOk())
                .andExpect(jsonPath("$.totalCount").value(2)).andExpect(jsonPath("$.scope").value("SELF"));
            postTool(commercial+"get_opportunity_detail", Map.of("id", owned)).andExpect(status().isOk());
            postTool(commercial+"get_opportunity_detail", Map.of("id", stranger)).andExpect(status().isNotFound());
            postTool(commercial+"get_customer_detail", Map.of("id", otherContact)).andExpect(status().isNotFound());
            postTool(commercial+"list_opportunities", Map.of("ownerUserCompanyId", otherMember))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalCount").value(0));
            postTool(commercial+"list_quotes", Map.of()).andExpect(status().isOk()).andExpect(jsonPath("$.totalCount").value(1));
            postTool(commercial+"search_commercial_assignees", Map.of()).andExpect(status().isOk())
                .andExpect(jsonPath("$.totalCount").value(1)).andExpect(jsonPath("$.items[0].userCompanyId").value(membership));
            postTool("/api/v1/ai/tools/references/customers", Map.of()).andExpect(status().isOk())
                .andExpect(jsonPath("$.totalCount").value(2)).andExpect(jsonPath("$.scopeType").value("SELF"));
            postTool(commercial+"get_opportunity_pipeline", Map.of()).andExpect(status().isOk())
                .andExpect(jsonPath("$.totals[0].count").value(2)).andExpect(jsonPath("$.totals[0].amount").value(30));
        }
        db.update("UPDATE user_companies SET role='admin' WHERE id=?", membership);
        db.update("INSERT INTO user_work_profiles(company_id,user_company_id,user_id,unit_id) VALUES(?,?,?,?)", company, membership, userId, unit);
        postTool(commercial+"list_opportunities", Map.of())
            .andExpect(status().isOk()).andExpect(jsonPath("$.totalCount").value(2))
            .andExpect(jsonPath("$.scope").value("UNIT_HEADQUARTERS"));
        db.update("UPDATE user_companies SET role='user' WHERE id=?", membership);
        postTool(commercial+"list_opportunities", Map.of()).andExpect(status().isOk())
            .andExpect(jsonPath("$.totalCount").value(2)).andExpect(jsonPath("$.scope").value("SELF"));
        db.update("DELETE FROM user_company_tab_permissions WHERE user_company_id=? AND tab_key='leads'", membership);
        postTool(commercial+"list_opportunities", Map.of()).andExpect(status().isForbidden());
    }

    private long seed(String kind, Map<String,Object> values) {
        var root = new AuthSessionUser(userId, company, membership, "Fixture creator", "root");
        return commercialOwner.execute(root, commercialOwner.prepare(root, kind, false,
            mapper.convertValue(values, SalesAssistantContracts.Change.class))).id();
    }

    private long contact(String code) {
        return insert("INSERT INTO sales_contacts(company_id,contact_code,company_name,source) VALUES(?,?,?,'http-regression')", company, code, code);
    }
    private ResultActions postTool(String path, Object input) throws Exception {
        return mvc.perform(post(path).header("Authorization", "Bearer " + bearer)
            .contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(input)));
    }
    private JsonNode json(ResultActions request) throws Exception {
        return mapper.readTree(request.andReturn().getResponse().getContentAsString());
    }
    private long insert(String sql, Object... args) {
        var key = new GeneratedKeyHolder();
        db.update(connection -> { var statement = connection.prepareStatement(sql, java.sql.Statement.RETURN_GENERATED_KEYS);
            for (int i = 0; i < args.length; i++) statement.setObject(i + 1, args[i]); return statement; }, key);
        return key.getKey().longValue();
    }
}
