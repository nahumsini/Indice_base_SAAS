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
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM ai_action_confirmations WHERE company_id=? AND tool_name='create_task_v2'", Integer.class, company)).isEqualTo(1);
        // The previous release's reader cannot reconstruct this confirmation with the wrong assignee.
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM ai_action_confirmations WHERE company_id=? AND tool_name='create_task'", Integer.class, company)).isZero();
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
    void operationalPreviewsDoNotMutateAndLifecycleUsesConfirmedOwnerActions() {
        long id = ownTask();
        var allowed = new StoredToken(token.id(), token.user(), Set.of("tasks.operate", "tasks.audit", "tasks.delegate"));
        var schedule = new com.indice.erp.processTasks.tasks.ProcessTaskOperation("schedule_task", LocalDate.of(2027, 1, 12),
            java.time.LocalTime.of(9, 0), java.time.LocalTime.of(10, 0), "America/Toronto", null, null, null, null, null, null, null, null);
        assertThatThrownBy(() -> actions.previewOperation(token, new OperationRequest(id, schedule), "schedule_task")).isInstanceOf(SecurityException.class);
        var prepared = actions.previewOperation(allowed, new OperationRequest(id, schedule), "schedule_task");
        assertThat(tasks.getTask(company, id)).containsEntry("agendaDate", null);
        var key = new CommitRequest(prepared.confirmationToken(), UUID.randomUUID().toString());
        assertThatThrownBy(() -> actions.commitOperation(allowed, key, "cancel_task")).isInstanceOf(AiTaskActionConflictException.class);
        actions.commitOperation(allowed, key, "schedule_task");
        assertThat(tasks.getTask(company, id)).containsEntry("agendaDate", "2027-01-12").containsEntry("agendaTimeZone", "America/Toronto");
        assertThat(actions.commitOperation(allowed, key, "schedule_task").replayed()).isTrue();
        var followUp = new com.indice.erp.processTasks.tasks.ProcessTaskOperation("add_task_follow_up", null, null, null, null,
            "Synthetic follow-up", LocalDate.of(2027, 1, 13), "decision", null, null, null, null, null);
        var followPreview = actions.previewOperation(allowed, new OperationRequest(id, followUp), "add_task_follow_up");
        assertThat(count("process_task_follow_ups")).isZero();
        var followCommit = new CommitRequest(followPreview.confirmationToken(), UUID.randomUUID().toString());
        actions.commitOperation(allowed, followCommit, "add_task_follow_up");
        actions.commitOperation(allowed, followCommit, "add_task_follow_up");
        assertThat(count("process_task_follow_ups")).isEqualTo(1);
        var complete = new com.indice.erp.processTasks.tasks.ProcessTaskOperation("complete_task", null, null, null, null, null, null, null, null, "Finished", 100, null, null);
        var finish = actions.previewOperation(allowed, new OperationRequest(id, complete), "complete_task");
        assertThat(tasks.getTask(company, id)).containsEntry("status", "pending");
        actions.commitOperation(allowed, new CommitRequest(finish.confirmationToken(), UUID.randomUUID().toString()), "complete_task");
        var audit = new com.indice.erp.processTasks.tasks.ProcessTaskOperation("audit_task", null, null, null, null, null, null, null, null, "Verified", null, 4, null);
        var review = actions.previewOperation(allowed, new OperationRequest(id, audit), "audit_task");
        actions.commitOperation(allowed, new CommitRequest(review.confirmationToken(), UUID.randomUUID().toString()), "audit_task");
        assertThat(tasks.getTask(company, id)).containsEntry("status", "completed").containsEntry("audited", true).containsEntry("weighting", 4);
    }

    @Test
    void teamPreviewValidatesRecipientsAndContributionChangesInvalidatePreparedClosure() {
        long id = ownTask();
        var allowed = new StoredToken(token.id(), token.user(), Set.of("tasks.operate", "tasks.delegate"));
        var share = new com.indice.erp.processTasks.tasks.ProcessTaskOperation("share_task", null, null, null, null, null, null, null, null, null, null, null, List.of(actor[1], recipient[1]));
        var preview = actions.previewOperation(allowed, new OperationRequest(id, share), "share_task");
        assertThat(preview.task().teamReview().before()).hasSize(1);
        assertThat(preview.task().teamReview().after()).hasSize(2);
        assertThat(preview.task().teamReview().added()).extracting(ProcessTaskAssistantService.TeamMember::userCompanyId).containsExactly(recipient[1]);
        assertThat(preview.task().teamReview().removed()).isEmpty();
        assertThat(((List<?>)tasks.getTask(company, id).get("assigneeUserCompanyIds"))).hasSize(1);
        actions.commitOperation(allowed, new CommitRequest(preview.confirmationToken(), UUID.randomUUID().toString()), "share_task");
        var complete = new com.indice.erp.processTasks.tasks.ProcessTaskOperation("complete_task", null, null, null, null, null, null, null, null, null, null, null, null);
        assertThatThrownBy(() -> actions.previewOperation(allowed, new OperationRequest(id, complete), "complete_task")).isInstanceOf(IllegalArgumentException.class);
        tasks.updateCurrentUserContribution(company, recipient[0], id, Map.of("status", "ready"));
        var ready = actions.previewOperation(allowed, new OperationRequest(id, complete), "complete_task");
        // Preview must not implicitly mark the lead ready.
        assertThat(jdbc.queryForObject("SELECT contribution_status FROM process_task_assignees WHERE company_id=? AND task_id=? AND user_company_id=? AND removed_at IS NULL", String.class, company, id, actor[1])).isEqualTo("pending");
        tasks.updateCurrentUserContribution(company, recipient[0], id, Map.of("status", "working"));
        var nested = new TransactionTemplate(transactions);
        nested.setPropagationBehavior(TransactionDefinition.PROPAGATION_NESTED);
        assertThatThrownBy(() -> nested.execute(status -> actions.commitOperation(allowed,
            new CommitRequest(ready.confirmationToken(), UUID.randomUUID().toString()), "complete_task")))
            .isInstanceOf(ProcessTaskAssistantService.TaskChangedException.class);
        assertThat(tasks.getTask(company, id)).containsEntry("status", "pending");
        jdbc.update("UPDATE process_tasks SET evidence_required=TRUE WHERE company_id=? AND id=?", company, id);
        assertThatThrownBy(() -> actions.previewOperation(allowed, new OperationRequest(id, complete), "complete_task")).isInstanceOf(IllegalArgumentException.class);
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
    void explicitOrganizationRequiresConsentAndPersistsOnlyConfirmedDestination() {
        jdbc.update("INSERT INTO units (company_id,name,status) VALUES (?, 'Destination unit', 'active')", company);
        long unit = jdbc.queryForObject("SELECT id FROM units WHERE company_id=?", Long.class, company);
        jdbc.update("INSERT INTO businesses (company_id,unit_id,name,status) VALUES (?,?,'Destination business','active')", company, unit);
        long business = jdbc.queryForObject("SELECT id FROM businesses WHERE company_id=?", Long.class, company);
        var request = new PreviewRequest("Scoped task", null, null, null, recipient[1], unit, business);
        assertThatThrownBy(() -> actions.preview(token, request)).isInstanceOf(SecurityException.class);
        var scopes = new java.util.HashSet<>(token.scopes()); scopes.add("tasks.organize");
        var permitted = new StoredToken(token.id(), token.user(), Set.copyOf(scopes));
        var preview = actions.preview(permitted, request);
        assertThat(preview.task().unitName()).isEqualTo("Destination unit");
        var confirmation = confirmations.findConfirmation(hashToken(preview.confirmationToken())).orElseThrow();
        assertThat(jdbc.queryForObject("SELECT tool_name FROM ai_action_confirmations WHERE id=?", String.class, confirmation.id())).isEqualTo("create_task_v3");
        var result = actions.commit(permitted, new CommitRequest(preview.confirmationToken(), UUID.randomUUID().toString()));
        assertThat(tasks.getTask(company, result.task().id())).containsEntry("unitId", unit).containsEntry("businessId", business);
    }

    @Test
    void organizationEditsKeepUnrequestedFieldsAndRejectForeignAndMismatchedReferences() {
        long id = ownTask();
        jdbc.update("INSERT INTO units (company_id,name,status) VALUES (?, 'Destination unit', 'active')", company);
        long unit = jdbc.queryForObject("SELECT id FROM units WHERE company_id=?", Long.class, company);
        jdbc.update("INSERT INTO businesses (company_id,unit_id,name,status) VALUES (?,?,'Destination business','active')", company, unit);
        long business = jdbc.queryForObject("SELECT id FROM businesses WHERE company_id=?", Long.class, company);
        var scopes = new java.util.HashSet<>(token.scopes()); scopes.add("tasks.organize");
        var permitted = new StoredToken(token.id(), token.user(), Set.copyOf(scopes));
        var change = new UpdateRequest(id, null, null, null, null, null, null, null, null, unit, business, null);
        assertThatThrownBy(() -> actions.previewUpdate(token, change)).isInstanceOf(SecurityException.class);
        var preview = actions.previewUpdate(permitted, change);
        assertThat(preview.task().changedFields()).containsExactly("unitId", "businessId");
        var original = tasks.getTask(company, id);
        var commit = new CommitRequest(preview.confirmationToken(), UUID.randomUUID().toString());
        actions.commitUpdate(permitted, commit);
        assertThat(tasks.getTask(company, id)).containsEntry("title", original.get("title"))
            .containsEntry("assignedUserCompanyId", actor[1]).containsEntry("unitId", unit).containsEntry("businessId", business);
        assertThat(actions.commitUpdate(permitted, commit).replayed()).isTrue();
        long foreign = company();
        jdbc.update("INSERT INTO units (company_id,name,status) VALUES (?, 'Private unit', 'active')", foreign);
        long foreignUnit = jdbc.queryForObject("SELECT id FROM units WHERE company_id=?", Long.class, foreign);
        assertThatThrownBy(() -> actions.previewUpdate(permitted,
            new UpdateRequest(id, null, null, null, null, null, null, null, null, foreignUnit, null, true)))
            .isInstanceOf(java.util.NoSuchElementException.class);
        assertThatThrownBy(() -> actions.previewUpdate(permitted,
            new UpdateRequest(id, null, null, null, null, null, null, null, null, foreignUnit, business, null)))
            .isInstanceOf(IllegalArgumentException.class);
        assertThat(owner.organization(company, actor[0])).noneMatch(item -> item.id() == foreignUnit && item.referenceType().equals("UNIT"));
    }

    private String hashToken(String raw) {
        try { return java.util.HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256").digest(raw.getBytes(java.nio.charset.StandardCharsets.UTF_8))); }
        catch (Exception error) { throw new IllegalStateException(error); }
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

    @Test
    void editingExistingLongTextPreservesOwnerValuesAcrossConfirmationAndReplay() {
        String title = "T".repeat(220);
        String description = "D".repeat(2400);
        long id = ((Number) tasks.createTask(company, actor[0], Map.of("status", "pending", "title", title,
            "description", description, "assignedUserCompanyId", actor[1])).get("id")).longValue();
        var preview = actions.previewUpdate(token, edit(id, "high", null));
        assertThat(preview.task().title()).isEqualTo(title);
        assertThat(preview.task().description()).isEqualTo(description);
        var request = new CommitRequest(preview.confirmationToken(), UUID.randomUUID().toString());
        assertThat(actions.commitUpdate(token, request).task().title()).isEqualTo(title);
        assertThat(actions.commitUpdate(token, request).task().title()).isEqualTo(title);
        assertThat(tasks.getTask(company, id)).containsEntry("title", title).containsEntry("description", description);
    }

    @Test void dependenciesUseTheOwnerRejectCyclesAndInvalidateStaleApprovals() {
        jdbc.update("INSERT INTO projects(company_id,folio,name,created_by) VALUES(?,'SYNTHETIC-PROJECT','Synthetic project',?)",company,actor[0]);
        long project=jdbc.queryForObject("SELECT id FROM projects WHERE company_id=?",Long.class,company);
        long first=ownTask(),second=ownTask(),third=ownTask();
        jdbc.update("UPDATE process_tasks SET project_id=? WHERE company_id=?",project,company);
        var scopes=new java.util.HashSet<>(token.scopes());scopes.add("tasks.operate");
        var permitted=new StoredToken(token.id(),token.user(),Set.copyOf(scopes));
        var operation=new com.indice.erp.processTasks.tasks.ProcessTaskOperation("update_task_dependency",null,null,null,null,null,null,null,null,null,null,null,null,first,2);
        var preview=actions.previewOperation(permitted,new OperationRequest(second,operation),"update_task_dependency");
        assertThat(count("process_task_dependencies")).isZero();
        var commit=new CommitRequest(preview.confirmationToken(),UUID.randomUUID().toString());
        actions.commitOperation(permitted,commit,"update_task_dependency");
        assertThat(actions.commitOperation(permitted,commit,"update_task_dependency").replayed()).isTrue();
        assertThat(tasks.getTask(company,second)).containsEntry("predecessorTaskId",first).containsEntry("dependencyLagDays",2);
        var cycle=new com.indice.erp.processTasks.tasks.ProcessTaskOperation("update_task_dependency",null,null,null,null,null,null,null,null,null,null,null,null,second,0);
        assertThatThrownBy(()->actions.previewOperation(permitted,new OperationRequest(first,cycle),"update_task_dependency")).isInstanceOf(IllegalArgumentException.class).hasMessageContaining("cycle");
        var stale=actions.previewOperation(permitted,new OperationRequest(third,operation),"update_task_dependency");
        tasks.updateTaskDependencies(company,actor[0],third,Map.of("predecessorTaskId",second,"lagDays",0));
        var nested=new TransactionTemplate(transactions);nested.setPropagationBehavior(TransactionDefinition.PROPAGATION_NESTED);
        assertThatThrownBy(()->nested.execute(status->actions.commitOperation(permitted,new CommitRequest(stale.confirmationToken(),UUID.randomUUID().toString()),"update_task_dependency"))).isInstanceOf(ProcessTaskAssistantService.TaskChangedException.class);
        var clear=new com.indice.erp.processTasks.tasks.ProcessTaskOperation("update_task_dependency",null,null,null,null,null,null,null,null,null,null,null,null,null,0);
        var remove=actions.previewOperation(permitted,new OperationRequest(second,clear),"update_task_dependency");
        actions.commitOperation(permitted,new CommitRequest(remove.confirmationToken(),UUID.randomUUID().toString()),"update_task_dependency");
        assertThat(tasks.getTask(company,second).get("predecessorTaskId")).isNull();
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
