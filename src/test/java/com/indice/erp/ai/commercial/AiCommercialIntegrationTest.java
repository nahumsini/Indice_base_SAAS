package com.indice.erp.ai.commercial;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.ai.access.*;
import com.indice.erp.ai.access.AiAccessTokenRepository.StoredToken;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.sales.SalesAssistantService;
import com.indice.erp.sales.SalesAssistantContracts.*;
import com.indice.erp.ai.commercial.AiCommercialContracts.*;
import java.time.Instant;
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

@SpringBootTest(properties={"app.email.enabled=false", "app.entitlements.projection-enabled=false"})
@Transactional
class AiCommercialIntegrationTest {
    @Autowired JdbcTemplate jdbc;
    @Autowired AiCommercialActionService actions;
    @Autowired SalesAssistantService owner;
    @Autowired AiAccessTokenRepository tokens;
    @Autowired ObjectMapper mapper;
    @Autowired PlatformTransactionManager transactions;
    @MockBean AiToolAuthorizationService permissions;
    long company;
    long[] actor;
    long[] recipient;
    StoredToken token;

    @BeforeEach void setup() {
        company = company(); actor = person(company, "Synthetic operator"); recipient = person(company, "Synthetic seller");
        var user = new AuthSessionUser(actor[0], company, actor[1], "Synthetic operator", "root");
        Set<String> scopes = new HashSet<>();
        AiCommercialAccess.ACTIONS.forEach(t -> scopes.add(AiCommercialAccess.scope(t)));
        AiCommercialAccess.READS.forEach(t -> scopes.add(AiCommercialAccess.scope(t)));
        long tokenId = tokens.insert(user, "generic_mcp", "Isolated commercial regression", "test", UUID.randomUUID().toString().replace("-", "").repeat(2), Instant.now().plusSeconds(3600), scopes);
        token = new StoredToken(tokenId, user, Set.copyOf(scopes));
        when(permissions.canUseCommercialTool(any(), anyString())).thenReturn(true);
    }

    @Test void fullCustomerOpportunityQuoteJourneyPersistsAndReplaysOnlyOnce() {
        var customer = create("customer", Map.of("name", "Synthetic customer", "email", "buyer@example.test", "ownerUserCompanyId", recipient[1]));
        var opportunity = create("opportunity", Map.of("name", "Synthetic opportunity", "customerId", customer.id(), "currency", "MXN", "estimatedValue", 200, "ownerUserCompanyId", recipient[1]));
        var preview = actions.preview(token, "create_quote", change(quote(customer.id(), opportunity.id())));
        assertThat(count("sales_quotes")).isZero();
        assertThat(preview.after().amount()).isEqualByComparingTo("208.80");
        assertThat(preview.after().items()).hasSize(1);
        var request = new CommitRequest(preview.confirmationToken(), UUID.randomUUID().toString());
        var result = actions.commit(token, "create_quote", request);
        assertThat(result.record().amount()).isEqualByComparingTo("208.80");
        assertThat(result.record().customerId()).isEqualTo(customer.id());
        assertThat(result.record().opportunityId()).isEqualTo(opportunity.id());
        assertThat(actions.commit(token, "create_quote", request).replayed()).isTrue();
        assertThat(count("sales_quotes")).isEqualTo(1);
        assertThat(count("sales_quote_items")).isEqualTo(1);
        assertThat(count("sales_records")).isZero();
        assertThat(count("ai_action_executions")).isEqualTo(3);
        assertThat(owner.pipeline(token.user()).totals()).singleElement().satisfies(row -> {
            assertThat(row.count()).isEqualTo(1); assertThat(row.amount()).isEqualByComparingTo("200"); });
        assertThat(owner.list(token.user(), "quote", null).items()).hasSize(1);
    }

    @Test void partialEditsReassignmentAndExplicitClearPreserveEverythingElse() {
        var customer = create("customer", Map.of("name", "Synthetic customer", "notes", "keep", "phone", "123456"));
        var updated = update("customer", Map.of("id", customer.id(), "email", "new@example.test", "ownerUserCompanyId", recipient[1], "clearFields", List.of("phone")));
        assertThat(updated.name()).isEqualTo(customer.name()); assertThat(updated.notes()).isEqualTo("keep");
        assertThat(updated.phone()).isNull(); assertThat(updated.email()).isEqualTo("new@example.test");
        assertThat(updated.ownerUserCompanyId()).isEqualTo(recipient[1]);
        assertThat(updated.ownerName()).isEqualTo("Synthetic seller");
        var quote = create("quote", quote(customer.id(), null));
        var edit = update("quote", Map.of("id", quote.id(), "notes", "Edited note", "status", "approved", "ownerUserCompanyId", recipient[1]));
        assertThat(edit.items()).isEqualTo(quote.items()); assertThat(edit.amount()).isEqualByComparingTo(quote.amount());
        assertThat(edit.status()).isEqualTo("approved"); assertThat(edit.ownerUserCompanyId()).isEqualTo(recipient[1]);
    }

    @Test void movingToWonUsesOwnerLifecycleAndCannotReopen() {
        var customer = create("customer", Map.of("name", "Synthetic customer"));
        var opportunity = create("opportunity", Map.of("name", "Pipeline test", "customerId", customer.id(), "currency", "CAD"));
        var closing = actions.preview(token, "update_opportunity", change(Map.of("id", opportunity.id(), "stage", "won")));
        assertThat(closing.after().flowName()).isEqualTo("Factory flow");
        assertThat(closing.after().probabilityPercent()).isEqualTo(100);
        assertThat(closing.effects()).anyMatch(effect -> effect.contains("todos los flujos"));
        var won = actions.commit(token, "update_opportunity", new CommitRequest(closing.confirmationToken(), "closing-flow-001")).record();
        assertThat(won.lifecycleStatus()).isEqualTo("WON");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM sales_opportunity_flow_position_history WHERE company_id=?", Integer.class, company)).isPositive();
        assertThatThrownBy(() -> actions.preview(token, "update_opportunity", change(Map.of("id", opportunity.id(), "stage", "new"))))
            .isInstanceOf(IllegalArgumentException.class);
        assertThat(count("sales_records")).isZero();
    }

    @Test void staleEditAndStaleReferencedCustomerRollBackWithoutConsumingConfirmation() {
        var customer = create("customer", Map.of("name", "Original"));
        var edit = actions.preview(token, "update_customer", change(Map.of("id", customer.id(), "name", "Preview")));
        jdbc.update("UPDATE sales_contacts SET notes='Concurrent' WHERE company_id=? AND id=?", company, customer.id());
        int executions = count("ai_action_executions");
        assertThatThrownBy(() -> nested(() -> actions.commit(token, "update_customer", new CommitRequest(edit.confirmationToken(), UUID.randomUUID().toString()))))
            .isInstanceOf(Changed.class);
        assertThat(count("ai_action_executions")).isEqualTo(executions);
        assertThat(owner.detail(token.user(), "customer", customer.id()).name()).isEqualTo("Original");
        var quote = actions.preview(token, "create_quote", change(quote(customer.id(), null)));
        jdbc.update("UPDATE sales_contacts SET company_name='Changed reference' WHERE company_id=? AND id=?", company, customer.id());
        assertThatThrownBy(() -> nested(() -> actions.commit(token, "create_quote", new CommitRequest(quote.confirmationToken(), UUID.randomUUID().toString())))).isInstanceOf(Changed.class);
        assertThat(count("sales_quotes")).isZero();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM ai_action_confirmations WHERE company_id=? AND consumed_at IS NULL", Integer.class, company)).isEqualTo(2);
    }

    @Test void tenantAndOrganizationalBoundariesApplyToRowsCountsAndReferences() {
        var customer = create("customer", Map.of("name", "Tenant A"));
        long other = company(); var stranger = person(other, "Other tenant");
        var foreignUser = new AuthSessionUser(stranger[0], other, stranger[1], "Other", "root");
        assertThatThrownBy(() -> owner.detail(foreignUser, "customer", customer.id())).isInstanceOf(NoSuchElementException.class);
        assertThat(owner.list(foreignUser, "customer", null).totalCount()).isZero();
        assertThatThrownBy(() -> owner.prepare(foreignUser, "quote", false, change(quote(customer.id(), null)))).isInstanceOf(NoSuchElementException.class);
        long unit = unit(company), outside = unit(company);
        jdbc.update("INSERT INTO user_work_profiles (company_id,user_company_id,user_id,unit_id) VALUES (?,?,?,?)", company, actor[1], actor[0], unit);
        jdbc.update("UPDATE sales_contacts SET unit_id=? WHERE company_id=? AND id=?", outside, company, customer.id());
        var limited = new AuthSessionUser(actor[0], company, actor[1], "Limited", "admin");
        assertThat(owner.list(limited, "customer", null).totalCount()).isZero();
        assertThatThrownBy(() -> owner.detail(limited, "customer", customer.id())).isInstanceOf(NoSuchElementException.class);
        assertThatThrownBy(() -> owner.prepare(limited, "quote", false, change(quote(customer.id(), null)))).isInstanceOf(NoSuchElementException.class);
    }

    @Test void scopeRevocationWrongConnectionWrongActionAndExpiryFailClosed() {
        var preview = actions.preview(token, "create_customer", change(Map.of("name", "Consent test")));
        var request = new CommitRequest(preview.confirmationToken(), "same-attempt-001");
        assertThatThrownBy(() -> actions.commit(new StoredToken(token.id(), token.user(), Set.of("customers.read")), "create_customer", request)).isInstanceOf(SecurityException.class);
        assertThatThrownBy(() -> actions.commit(new StoredToken(token.id()+1, token.user(), token.scopes()), "create_customer", request)).isInstanceOf(Conflict.class);
        assertThatThrownBy(() -> actions.commit(token, "update_customer", request)).isInstanceOf(Conflict.class);
        when(permissions.canUseCommercialTool(any(), anyString())).thenReturn(false);
        assertThatThrownBy(() -> actions.commit(token, "create_customer", request)).isInstanceOf(SecurityException.class);
        when(permissions.canUseCommercialTool(any(), anyString())).thenReturn(true);
        jdbc.update("UPDATE ai_action_confirmations SET expires_at=DATE_SUB(NOW(),INTERVAL 1 HOUR) WHERE company_id=?", company);
        assertThatThrownBy(() -> actions.commit(token, "create_customer", request)).isInstanceOf(Conflict.class);
        assertThat(count("sales_contacts")).isZero();
    }

    @Test void inactiveAssigneeAndChangedQuoteLinesInvalidatePreview() {
        var preview = actions.preview(token, "create_customer", change(Map.of("name", "Test", "ownerUserCompanyId", recipient[1])));
        jdbc.update("UPDATE user_companies SET status='inactive' WHERE id=?", recipient[1]);
        assertThatThrownBy(() -> nested(() -> actions.commit(token, "create_customer", new CommitRequest(preview.confirmationToken(), "inactive-assignee")))).isInstanceOf(NoSuchElementException.class);
        var customer = create("customer", Map.of("name", "Test"));
        var quote = create("quote", quote(customer.id(), null));
        var edit = actions.preview(token, "update_quote", change(Map.of("id", quote.id(), "notes", "Preview")));
        jdbc.update("UPDATE sales_quote_items SET unit_price=111 WHERE company_id=? AND quote_id=?", company, quote.id());
        assertThatThrownBy(() -> nested(() -> actions.commit(token, "update_quote", new CommitRequest(edit.confirmationToken(), "changed-lines-001")))).isInstanceOf(Changed.class);
    }

    @Test void readsNeverInitializeFlowsAndQuotePreviewsNeverWriteCommercialData() {
        assertThat(owner.pipeline(token.user()).flows()).hasSize(1);
        assertThat(count("sales_opportunity_flows")).isZero();
        var customer = create("customer", Map.of("name", "Test"));
        actions.preview(token, "create_opportunity", change(Map.of("name", "Test", "customerId", customer.id(), "currency", "USD")));
        assertThat(count("sales_opportunity_flows")).isZero();
        assertThat(count("sales_opportunities")).isZero();
    }

    @Test void rejectsInvalidMoneyConflictingFieldsAndForgedClosedWonStatus() {
        var customer = create("customer", Map.of("name", "Test"));
        var payload = new HashMap<>(quote(customer.id(), null));
        payload.put("items", List.of(Map.of("productName", "Test", "quantity", 1, "unitPrice", 10, "taxPercent", -16)));
        assertThatThrownBy(() -> actions.preview(token, "create_quote", change(payload))).isInstanceOf(IllegalArgumentException.class);
        payload.put("items", quote(customer.id(), null).get("items")); payload.put("status", "closed_won");
        assertThatThrownBy(() -> actions.preview(token, "create_quote", change(payload))).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> actions.preview(token, "update_customer", change(Map.of("id", customer.id(), "notes", "Keep", "clearFields", List.of("notes"))))).isInstanceOf(IllegalArgumentException.class);
        assertThat(count("sales_quotes")).isZero();
    }

    @Test void cursorIsBoundToFiltersAndIdempotencyCannotBeReusedForAnotherDraft() {
        create("customer", Map.of("name", "First")); create("customer", Map.of("name", "Second"));
        var page = owner.list(token.user(), "customer", new Query(null,null,null,null,null,null,1,null));
        assertThat(page.totalCount()).isEqualTo(2); assertThat(page.hasMore()).isTrue();
        assertThat(owner.list(token.user(), "customer", new Query(null,null,null,null,null,null,1,page.nextCursor())).items()).hasSize(1);
        assertThatThrownBy(() -> owner.list(token.user(), "customer", new Query(null,"changed",null,null,null,null,1,page.nextCursor()))).isInstanceOf(IllegalArgumentException.class);
        var one = actions.preview(token,"create_customer",change(Map.of("name","A")));
        var two = actions.preview(token,"create_customer",change(Map.of("name","B")));
        actions.commit(token,"create_customer",new CommitRequest(one.confirmationToken(),"shared-idempotency"));
        assertThatThrownBy(() -> actions.commit(token,"create_customer",new CommitRequest(two.confirmationToken(),"shared-idempotency"))).isInstanceOf(Conflict.class);
    }

    @Test void catalogProductPricesAreCalculatedAndChangesInvalidateConfirmation() {
        var customer = create("customer", Map.of("name", "Catalog customer"));
        long product = product(company, "commercial", "MXN");
        var input = new HashMap<>(quote(customer.id(), null));
        input.put("items", List.of(Map.of("productId", product, "quantity", 3, "unitPrice", 10.01, "taxPercent", 16)));
        var preview = actions.preview(token, "create_quote", change(input));
        assertThat(preview.after().amount()).isEqualByComparingTo("34.83");
        assertThat(preview.after().items().getFirst().productName()).isEqualTo("Catalog product");
        var saved = actions.commit(token, "create_quote", new CommitRequest(preview.confirmationToken(), "catalog-price-001"));
        assertThat(saved.record().amount()).isEqualByComparingTo(preview.after().amount());
        var later = actions.preview(token, "create_quote", change(input));
        jdbc.update("UPDATE sales_products SET price=99 WHERE company_id=? AND id=?", company, product);
        assertThatThrownBy(() -> nested(() -> actions.commit(token,"create_quote",new CommitRequest(later.confirmationToken(),"catalog-stale-001")))).isInstanceOf(Changed.class);
        input.put("currency", "USD");
        assertThatThrownBy(() -> actions.preview(token,"create_quote",change(input))).isInstanceOf(IllegalArgumentException.class);
        input.put("currency", "MXN"); jdbc.update("UPDATE sales_products SET visibility='internal' WHERE company_id=? AND id=?",company,product);
        assertThatThrownBy(() -> actions.preview(token,"create_quote",change(input))).isInstanceOf(IllegalArgumentException.class);
    }

    @Test void opportunityAndCustomerMismatchIsRejectedAndClosedWonQuotesRemainReadable() {
        var a=create("customer",Map.of("name","A")); var b=create("customer",Map.of("name","B"));
        var opportunity=create("opportunity",Map.of("name","For A","customerId",a.id(),"currency","MXN"));
        assertThatThrownBy(() -> actions.preview(token,"create_quote",change(quote(b.id(),opportunity.id())))).isInstanceOf(IllegalArgumentException.class);
        var quote=create("quote",quote(a.id(),opportunity.id()));
        jdbc.update("UPDATE sales_quotes SET status='closed_won' WHERE company_id=? AND id=?",company,quote.id());
        assertThat(owner.detail(token.user(),"quote",quote.id()).status()).isEqualTo("closed_won");
    }

    @Test void assigneeSearchPreservesAmbiguousNamesAndReplayRechecksVisibility() {
        person(company,"Álex Synthetic"); person(company,"Alex Synthetic");
        var page=owner.assignees(token.user(),new Query(null,"Alex",null,null,null,null,1,null));
        assertThat(page.totalCount()).isEqualTo(2); assertThat(page.hasMore()).isTrue();
        var preview=actions.preview(token,"create_customer",change(Map.of("name","Replay visibility")));
        var request=new CommitRequest(preview.confirmationToken(),"replay-scope-001");
        var created=actions.commit(token,"create_customer",request);
        jdbc.update("UPDATE sales_contacts SET deleted_at=NOW() WHERE company_id=? AND id=?",company,created.record().id());
        assertThatThrownBy(() -> actions.commit(token,"create_customer",request)).isInstanceOf(NoSuchElementException.class);
    }

    @Test void quoteLineReplacementKeepsOrderAndNeverCreatesSalesOrStockMovements() {
        var customer=create("customer",Map.of("name","Ordered quote"));
        var quote=create("quote",quote(customer.id(),null));
        var edited=update("quote",Map.of("id",quote.id(),"items",List.of(
            Map.of("productName","First","quantity",1,"unitPrice",10,"taxPercent",0),
            Map.of("productName","Second","quantity",2,"unitPrice",20,"taxPercent",0))));
        assertThat(edited.items()).extracting(Line::productName).containsExactly("First","Second");
        assertThat(edited.amount()).isEqualByComparingTo("50");
        assertThat(count("sales_quote_items")).isEqualTo(2); assertThat(count("sales_records")).isZero();
        assertThat(count("sales_inventory_movements")).isZero();
    }

    private long product(long companyId,String visibility,String currency) {
        String code="TEST-"+UUID.randomUUID().toString().substring(0,16);
        jdbc.update("INSERT INTO sales_products(company_id,product_code,name,price,currency,status,visibility) VALUES (?,?,'Catalog product',10,?,'active',?)",companyId,code,currency,visibility);
        return jdbc.queryForObject("SELECT id FROM sales_products WHERE company_id=? AND product_code=?",Long.class,companyId,code);
    }

    private Map<String,Object> quote(long customer, Long opportunity) {
        var payload = new HashMap<String,Object>(); payload.put("customerId", customer); payload.put("currency", "MXN");
        if (opportunity != null) payload.put("opportunityId", opportunity);
        payload.put("items", List.of(Map.of("productName", "Synthetic service", "quantity", 2, "unitPrice", 100, "discountPercent", 10, "taxPercent", 16)));
        return payload;
    }
    private Change change(Map<String,Object> payload) { return mapper.convertValue(payload, Change.class); }
    private RecordView create(String kind, Map<String,Object> payload) { return save("create_"+kind,payload); }
    private RecordView update(String kind, Map<String,Object> payload) { return save("update_"+kind,payload); }
    private RecordView save(String tool,Map<String,Object> payload) { var p=actions.preview(token,tool,change(payload)); return actions.commit(token,tool,new CommitRequest(p.confirmationToken(),UUID.randomUUID().toString())).record(); }
    private void nested(Runnable operation) { var tx=new TransactionTemplate(transactions);tx.setPropagationBehavior(TransactionDefinition.PROPAGATION_NESTED);tx.execute(s->{operation.run();return null;}); }
    private int count(String table) { return jdbc.queryForObject("SELECT COUNT(*) FROM "+table+" WHERE company_id=?",Integer.class,company); }
    private long company() { String name="Synthetic commercial "+UUID.randomUUID();jdbc.update("INSERT INTO companies(name) VALUES (?)",name);return jdbc.queryForObject("SELECT id FROM companies WHERE name=?",Long.class,name); }
    private long unit(long companyId) { String name="Synthetic unit "+UUID.randomUUID();jdbc.update("INSERT INTO units(company_id,name) VALUES (?,?)",companyId,name);return jdbc.queryForObject("SELECT id FROM units WHERE name=?",Long.class,name); }
    private long[] person(long companyId,String name) { String email=UUID.randomUUID()+"@example.test";jdbc.update("INSERT INTO users(email,password_hash,full_name) VALUES (?,'test',?)",email,name);long id=jdbc.queryForObject("SELECT id FROM users WHERE email=?",Long.class,email);jdbc.update("INSERT INTO user_companies(user_id,company_id,role,status,visibility) VALUES (?,?,'root','active','all')",id,companyId);return new long[]{id,jdbc.queryForObject("SELECT id FROM user_companies WHERE user_id=? AND company_id=?",Long.class,id,companyId)}; }
}
