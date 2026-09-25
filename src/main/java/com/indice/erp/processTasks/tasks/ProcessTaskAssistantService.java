package com.indice.erp.processTasks.tasks;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Objects;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Bounded task-owner contract for assistant previews and optimistic, partial edits. */
@Service
public class ProcessTaskAssistantService {
    private final ProcessTaskAssignmentCatalogService catalog;
    private final ProcessTaskAssignmentScopeService scopes;
    private final ProcessTasksService tasks;
    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;

    public ProcessTaskAssistantService(ProcessTaskAssignmentCatalogService catalog,
            ProcessTaskAssignmentScopeService scopes, ProcessTasksService tasks, JdbcTemplate jdbc, ObjectMapper mapper) {
        this.catalog = catalog;
        this.scopes = scopes;
        this.tasks = tasks;
        this.jdbc = jdbc;
        this.mapper = mapper;
    }

    public Assignment creationAssignment(long companyId, long actorId, long assigneeId) {
        var person = person(companyId, actorId, assigneeId);
        var scope = scopes.userCompanyScope(companyId, assigneeId);
        scopes.requireCanAssign(companyId, actorId, scope.unitId(), scope.businessId(), assigneeId);
        return new Assignment(assigneeId, person.name(), scope.unitId(),
            scope.unitId() == null ? null : person.unitName(), scope.businessId(),
            scope.businessId() == null ? null : person.businessName());
    }

    public Assignment assignmentForTask(long companyId, long actorId, long assigneeId, Long unitId, Long businessId) {
        var person = person(companyId, actorId, assigneeId);
        scopes.requireCanAssign(companyId, actorId, unitId, businessId, assigneeId);
        return new Assignment(assigneeId, person.name(), unitId, null, businessId, null);
    }

    private ProcessTaskAssignmentOption person(long companyId, long actorId, long assigneeId) {
        if (assigneeId <= 0) throw new IllegalArgumentException("Invalid task assignee.");
        return assignees(companyId, actorId).stream()
            .filter(item -> item.userCompanyId() == assigneeId).findFirst()
            .orElseThrow(() -> new NoSuchElementException("Task assignee not found in the authorized scope."));
    }

    public List<ProcessTaskAssignmentOption> assignees(long companyId, long actorId) {
        requireActor(companyId, actorId);
        return catalog.list(companyId, actorId).items();
    }

    private void requireActor(long companyId, long actorId) {
        var scope = scopes.actorScope(companyId, actorId);
        if (scope == null || scope.userCompanyId() == null) throw new SecurityException("Active task membership required.");
    }

    public Snapshot snapshot(long companyId, long actorId, long taskId) {
        if (taskId <= 0) throw new IllegalArgumentException("Invalid task identifier.");
        requireActor(companyId, actorId);
        scopes.requireTaskAccess(companyId, actorId, taskId);
        var task = tasks.getTask(companyId, taskId);
        return new Snapshot(task, version(task));
    }

    @Transactional
    public Map<String, Object> patchConfirmed(long companyId, long actorId, long taskId,
            String expectedVersion, Map<String, Object> patch) {
        if (patch == null || patch.isEmpty() || !java.util.Set.of("title", "description", "priority", "status",
                "dueDate", "assignedUserCompanyId").containsAll(patch.keySet())) {
            throw new IllegalArgumentException("Unsupported task changes.");
        }
        var ids = jdbc.queryForList("SELECT id FROM process_tasks WHERE company_id = ? AND id = ? "
            + "AND deleted_at IS NULL FOR UPDATE", Long.class, companyId, taskId);
        if (ids.isEmpty()) throw new NoSuchElementException("Task not found.");
        var current = snapshot(companyId, actorId, taskId);
        if (!Objects.equals(expectedVersion, current.version())) {
            throw new TaskChangedException();
        }
        var changes = new LinkedHashMap<>(patch);
        if (changes.containsKey("assignedUserCompanyId")) {
            var target = ((Number) changes.get("assignedUserCompanyId")).longValue();
            assignmentForTask(companyId, actorId, target, number(current.task().get("unitId")),
                number(current.task().get("businessId")));
            // Replace the lead, preserving other collaborators instead of dropping the team.
            var oldLead = number(current.task().get("assignedUserCompanyId"));
            var rawTeam = current.task().get("assigneeUserCompanyIds");
            var team = rawTeam instanceof List<?> list ? list : List.of();
            var nextTeam = new java.util.LinkedHashSet<Long>();
            nextTeam.add(target);
            team.stream().map(ProcessTaskAssistantService::number).filter(Objects::nonNull)
                .filter(id -> !Objects.equals(id, oldLead)).forEach(nextTeam::add);
            changes.put("assigneeUserCompanyIds", List.copyOf(nextTeam));
        }
        return tasks.patchTask(companyId, actorId, taskId, changes);
    }

    private String version(Map<String, Object> task) {
        // Includes the mutation fields and team, but excludes changing KPI/follow-up aggregates.
        var state = new LinkedHashMap<String, Object>();
        for (var field : List.of("id", "title", "description", "priority", "status", "dueDate", "startDate",
                "assignedUserCompanyId", "assigneeUserCompanyIds", "unitId", "businessId", "projectId", "processId",
                "notes", "completionPercent", "weighting", "audited", "auditNotes", "updatedAt")) {
            state.put(field, task.get(field));
        }
        try {
            var json = mapper.writer().with(SerializationFeature.ORDER_MAP_ENTRIES_BY_KEYS).writeValueAsString(state);
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                .digest(json.getBytes(StandardCharsets.UTF_8)));
        } catch (JsonProcessingException | NoSuchAlgorithmException exception) {
            throw new IllegalStateException("Task version could not be calculated.", exception);
        }
    }

    private static Long number(Object value) { return value instanceof Number n ? n.longValue() : null; }
    public record Assignment(long userCompanyId, String name, Long unitId, String unitName,
        Long businessId, String businessName) { }
    public record Snapshot(Map<String, Object> task, String version) { }
    public static final class TaskChangedException extends RuntimeException {
        public TaskChangedException() { super("The task changed after the preview. Prepare it again."); }
    }
}
