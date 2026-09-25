package com.indice.erp.ai.task;

import static org.assertj.core.api.Assertions.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.ai.access.AiAccessTokenRepository;
import com.indice.erp.ai.access.AiAccessTokenRepository.StoredToken;
import com.indice.erp.ai.task.AiTaskActionContracts.*;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.processTasks.tasks.ProcessTaskAssistantService;
import com.indice.erp.processTasks.tasks.ProcessTasksService;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

/** Real owner/SQL flow, synthetic tenants only; every test is rolled back in the isolated test DB. */
@SpringBootTest(properties = {"app.email.enabled=false", "app.entitlements.projection-enabled=false"})
@Transactional
class AiTaskDelegationIntegrationTest {
    @Autowired JdbcTemplate jdbc;
    @Autowired AiTaskActionService actions;
    @Autowired AiTaskDraftService drafts;
    @Autowired AiTaskActionRepository confirmations;
    @Autowired AiAccessTokenRepository tokens;
    @Autowired ProcessTasksService tasks;
    @Autowired ProcessTaskAssistantService owner;
    @Autowired ObjectMapper mapper;
    @Autowired PlatformTransactionManager transactions;
    long company;
    long[] actor;
    long[] recipient;
    StoredToken token;

    @BeforeEach
    void fixture() {
        company = company();
        actor = person(company, "Synthetic operator");
        recipient = person(company, "Synthetic assignee");
        var user = new AuthSessionUser(actor[0], company, actor[1], "Synthetic operator", "admin");
        var scopes = Set.of("tasks.create", "tasks.delegate", "tasks.update", "tasks.read");
        long tokenId = tokens.insert(user, "generic_mcp", "Isolated regression", "test", hash(), Instant.now().plusSeconds(3600), scopes);
        token = new StoredToken(tokenId, user, scopes);
    }

    @Test
    void delegatedCreatePersistsConfirmedRecipientAndReplaysWithoutDuplicating() {
        var preview = actions.preview(token, new PreviewRequest("Follow up", "Isolated test", "high", LocalDate.now().plusDays(1), recipient[1]));
        assertThat(preview.task().assignee()).isEqualTo("Synthetic assignee");
        assertThat(preview.task().assigneeUserCompanyId()).isEqualTo(recipient[1]);
        assertThat(count("process_tasks")).isZero();
        var request = new CommitRequest(preview.confirmationToken(), UUID.randomUUID().toString());
        var result = actions.commit(token, request);
        assertThat(result.task().assigneeUserCompanyId()).isEqualTo(recipient[1]);
        assertThat(result.task().assignee()).isEqualTo("Synthetic assignee");
        assertThat(tasks.getTask(company, result.task().id())).containsEntry("assignedUserCompanyId", recipient[1]);
        assertThat(actions.commit(token, request).task()).isEqualTo(result.task());
        assertThat(actions.commit(token, request).replayed()).isTrue();
        assertThat(count("process_tasks")).isEqualTo(1);
        assertThat(count("ai_action_executions")).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM ai_action_audit_events WHERE company_id=? AND event_type='COMMIT' AND outcome='SUCCESS'", Integer.class, company)).isEqualTo(1);
    }

    @Test
    void editsOnlyRequestedFieldsAndPreservesOtherCollaborators() {
        var teammate = person(company, "Synthetic teammate");
        var row = tasks.createTask(company, actor[0], Map.of("status", "pending", "title", "Original title", "description", "Keep description",
            "priority", "low", "assignedUserCompanyId", actor[1], "assigneeUserCompanyIds", List.of(actor[1], teammate[1]),
            "notes", "Keep notes", "dueDate", "2027-01-12"));
        long id = ((Number) row.get("id")).longValue();
        var preview = actions.previewUpdate(token, edit(id, "high", recipient[1]));
        assertThat(preview.before().priority()).isEqualTo("low");
        assertThat(preview.task().changedFields()).containsExactly("priority", "assignedUserCompanyId");
        var request = new CommitRequest(preview.confirmationToken(), UUID.randomUUID().toString());
        var result = actions.commitUpdate(token, request);
        assertThat(result.task().assigneeUserCompanyId()).isEqualTo(recipient[1]);
        var updated = tasks.getTask(company, id);
        assertThat(updated).containsEntry("title", "Original title").containsEntry("description", "Keep description")
            .containsEntry("notes", "Keep notes").containsEntry("priority", "high");
        assertThat(((List<?>) updated.get("assigneeUserCompanyIds")).stream().map(value -> ((Number) value).longValue()).toList()).containsExactlyInAnyOrder(recipient[1], teammate[1]);
        assertThat(actions.commitUpdate(token, request).task()).isEqualTo(result.task());
        assertThat(count("process_tasks")).isEqualTo(1);
    }

    @Test
    void stalePreviewRollsBackExecutionReservationAndLeavesConcurrentChanges() {
        long id = ownTask();
        var preview = actions.previewUpdate(token, edit(id, "high", null));
        // Same-second edits must be detected even when updated_at has coarse precision.
        tasks.patchTask(company, actor[0], id, Map.of("title", "Concurrent edit"));
        var nested = new TransactionTemplate(transactions);
        nested.setPropagationBehavior(TransactionDefinition.PROPAGATION_NESTED);
        assertThatThrownBy(() -> nested.execute(status -> actions.commitUpdate(token,
            new CommitRequest(preview.confirmationToken(), UUID.randomUUID().toString()))))
            .isInstanceOf(ProcessTaskAssistantService.TaskChangedException.class);
        assertThat(tasks.getTask(company, id)).containsEntry("title", "Concurrent edit").containsEntry("priority", "medium");
        assertThat(count("ai_action_executions")).isZero();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM ai_action_confirmations WHERE company_id=? AND consumed_at IS NOT NULL", Integer.class, company)).isZero();
    }

    @Test
    void delegationDoesNotExpandOldConsentAndRejectsForeignOrInactiveMembership() {
        var old = new StoredToken(token.id(), token.user(), Set.of("tasks.create"));
        assertThatThrownBy(() -> actions.preview(old, new PreviewRequest("Test", null, null, null, recipient[1])))
            .isInstanceOf(SecurityException.class);
        assertThatThrownBy(() -> actions.previewUpdate(old, edit(1, "high", null))).isInstanceOf(SecurityException.class);
        long[] foreign = person(company(), "Foreign person");
        assertThatThrownBy(() -> actions.preview(token, new PreviewRequest("Test", null, null, null, foreign[1])))
            .isInstanceOf(java.util.NoSuchElementException.class);
        jdbc.update("UPDATE user_companies SET status='inactive' WHERE company_id=? AND id=?", company, recipient[1]);
        assertThat(owner.assignees(company, actor[0])).noneMatch(item -> item.userCompanyId() == recipient[1]);
        assertThatThrownBy(() -> actions.preview(token, new PreviewRequest("Test", null, null, null, recipient[1])))
            .isInstanceOf(java.util.NoSuchElementException.class);
        assertThat(count("process_tasks")).isZero();
    }

    @Test
    void explicitClearsWorkWhileNoopsAndContradictoryChangesAreRejected() {
        long id = ownTask();
        tasks.patchTask(company, actor[0], id, Map.of("description", "Remove me", "dueDate", "2027-01-01"));
        assertThatThrownBy(() -> drafts.edit(token, edit(id, null, null))).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> drafts.edit(token, new UpdateRequest(id, null, "New", null, null, null, null, true, null)))
            .isInstanceOf(IllegalArgumentException.class);
        var preview = actions.previewUpdate(token, new UpdateRequest(id, null, null, null, null, null, null, true, true));
        assertThat(preview.task().changedFields()).containsExactly("description", "dueDate");
        actions.commitUpdate(token, new CommitRequest(preview.confirmationToken(), UUID.randomUUID().toString()));
        assertThat(tasks.getTask(company, id)).containsEntry("description", null).containsEntry("dueDate", null);
    }

    @Test
    void confirmationIsBoundToActionConnectionAndCurrentConsent() {
        var preview = actions.preview(token, new PreviewRequest("Test", null, null, null, recipient[1]));
        var request = new CommitRequest(preview.confirmationToken(), UUID.randomUUID().toString());
        assertThatThrownBy(() -> actions.commitUpdate(token, request)).isInstanceOf(AiTaskActionConflictException.class);
        assertThatThrownBy(() -> actions.commit(new StoredToken(token.id()+1, token.user(), token.scopes()), request))
            .isInstanceOf(AiTaskActionConflictException.class);
        assertThatThrownBy(() -> actions.commit(new StoredToken(token.id(), token.user(), Set.of("tasks.create")), request))
            .isInstanceOf(SecurityException.class);
        assertThat(count("process_tasks")).isZero();
    }

    @Test
    void replaysRecheckCurrentTaskVisibility() {
        var preview = actions.preview(token, new PreviewRequest("Test", null, null, null));
        var request = new CommitRequest(preview.confirmationToken(), UUID.randomUUID().toString());
        actions.commit(token, request);
        jdbc.update("UPDATE user_companies SET status='inactive' WHERE company_id=? AND id=?", company, actor[1]);
        assertThatThrownBy(() -> actions.commit(token, request)).isInstanceOf(SecurityException.class);
        assertThat(count("process_tasks")).isEqualTo(1);
    }

    @Test
    void oldStoredDraftStillCreatesForConnectedUser() throws Exception {
        var legacy = mapper.readValue("""
            {"title":"Legacy confirmation","description":null,"priority":"medium","dueDate":null,"assignee":"Usuario conectado"}
            """, TaskDraft.class);
        assertThat(legacy.tool()).isEqualTo("create_task");
        assertThat(legacy.changedFields()).isEmpty();
        assertThat(legacy.status()).isEqualTo("pending");
        String raw = "idx_confirm_legacy-synthetic-confirmation";
        String digest = java.util.HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256").digest(raw.getBytes(java.nio.charset.StandardCharsets.UTF_8)));
        confirmations.insertConfirmation(token, digest, hash(), legacy, Instant.now().plusSeconds(300));
        var result = actions.commit(token, new CommitRequest(raw, UUID.randomUUID().toString()));
        assertThat(result.task().assigneeUserCompanyId()).isEqualTo(actor[1]);
    }

    @Test
    void unitAndBusinessAssignmentsStayInsideOwnerScope() {
        jdbc.update("INSERT INTO units (company_id,name,status) VALUES (?, 'Synthetic unit', 'active')", company);
        long unit = jdbc.queryForObject("SELECT id FROM units WHERE company_id=?", Long.class, company);
        jdbc.update("INSERT INTO businesses (company_id,unit_id,name,status) VALUES (?,?,'Synthetic branch','active')", company, unit);
        long business = jdbc.queryForObject("SELECT id FROM businesses WHERE company_id=?", Long.class, company);
        workProfile(actor, unit, business);
        workProfile(recipient, unit, business);
        long[] outside = person(company, "Outside branch");
        assertThat(owner.assignees(company, actor[0])).noneMatch(item -> item.userCompanyId() == outside[1]);
        var preview = actions.preview(token, new PreviewRequest("Branch task", null, null, null, recipient[1]));
        assertThat(preview.task().unitId()).isEqualTo(unit);
        assertThat(preview.task().businessId()).isEqualTo(business);
        var result = actions.commit(token, new CommitRequest(preview.confirmationToken(), UUID.randomUUID().toString()));
        assertThat(tasks.getTask(company, result.task().id())).containsEntry("unitId", unit).containsEntry("businessId", business);
        long foreignTask = ((Number) tasks.createTask(company, outside[0], Map.of("status", "pending", "priority", "medium", "title", "Company task", "assignedUserCompanyId", outside[1])).get("id")).longValue();
        assertThatThrownBy(() -> actions.previewUpdate(token, edit(foreignTask, "high", null)))
            .isInstanceOf(java.util.NoSuchElementException.class);
        assertThatThrownBy(() -> actions.preview(token, new PreviewRequest("Wrong branch", null, null, null, outside[1])))
            .isInstanceOf(java.util.NoSuchElementException.class);
    }

    @Test
    void commitRevalidatesRecipientAndTenantBoundTaskIds() {
        var preview = actions.preview(token, new PreviewRequest("Test", null, null, null, recipient[1]));
        jdbc.update("UPDATE user_companies SET status='inactive' WHERE company_id=? AND id=?", company, recipient[1]);
        var nested = new TransactionTemplate(transactions);
        nested.setPropagationBehavior(TransactionDefinition.PROPAGATION_NESTED);
        assertThatThrownBy(() -> nested.execute(status -> actions.commit(token,
            new CommitRequest(preview.confirmationToken(), UUID.randomUUID().toString()))))
            .isInstanceOf(java.util.NoSuchElementException.class);
        assertThat(count("process_tasks")).isZero();
        assertThat(count("ai_action_executions")).isZero();
        long otherCompany = company();
        long[] outsider = person(otherCompany, "Other tenant");
        long otherTask = ((Number) tasks.createTask(otherCompany, outsider[0], Map.of("status", "pending",
            "priority", "medium", "title", "Private task", "assignedUserCompanyId", outsider[1])).get("id")).longValue();
        assertThatThrownBy(() -> actions.previewUpdate(token, edit(otherTask, "high", null)))
            .isInstanceOf(java.util.NoSuchElementException.class);
    }

    private void workProfile(long[] person, long unit, long business) {
        jdbc.update("INSERT INTO user_work_profiles (company_id,user_company_id,user_id,user_code,position,department,unit_id,business_id,status) VALUES (?,?,?,?,'Operator','Operations',?,?,'active')",
            company, person[1], person[0], "TEST-" + person[1], unit, business);
    }

    private UpdateRequest edit(long id, String priority, Long assignee) {
        return new UpdateRequest(id, null, null, priority, null, null, assignee, null, null);
    }
    private long ownTask() {
        return ((Number) tasks.createTask(company, actor[0], Map.of("status", "pending", "priority", "medium", "title", "Test task", "assignedUserCompanyId", actor[1])).get("id")).longValue();
    }
    private long count(String table) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM " + table + " WHERE company_id=?", Long.class, company);
    }
    private long company() {
        String name = "Synthetic MCP " + UUID.randomUUID();
        jdbc.update("INSERT INTO companies (name) VALUES (?)", name);
        return jdbc.queryForObject("SELECT id FROM companies WHERE name=?", Long.class, name);
    }
    private long[] person(long companyId, String name) {
        String email = UUID.randomUUID() + "@example.test";
        jdbc.update("INSERT INTO users (email,password_hash,full_name) VALUES (?,'test',?)", email, name);
        long id = jdbc.queryForObject("SELECT id FROM users WHERE email=?", Long.class, email);
        jdbc.update("INSERT INTO user_companies (user_id,company_id,role,status,visibility) VALUES (?,?,'admin','active','all')", id, companyId);
        long membership = jdbc.queryForObject("SELECT id FROM user_companies WHERE company_id=? AND user_id=?", Long.class, companyId, id);
        return new long[]{id, membership};
    }
    private String hash() { return UUID.randomUUID().toString().replace("-", "") + UUID.randomUUID().toString().replace("-", ""); }
}
